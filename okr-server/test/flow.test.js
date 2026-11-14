/**
 * Kiểm thử module Quy trình (src/flow.js, v22) với PostgreSQL thật.
 *   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=okr PGPASSWORD=… npm test
 * Mỗi lần chạy tạo 1 cơ sở dữ liệu tạm, khởi động server thật (dist/server.js — chạy `npm run build` trước) rồi gọi API qua HTTP.
 */
'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('pg');

const PGENV = { PGHOST: process.env.PGHOST || '127.0.0.1', PGPORT: process.env.PGPORT || '5432', PGUSER: process.env.PGUSER || 'okr', PGPASSWORD: process.env.PGPASSWORD || '' };
const DBNAME = 'okr_flow_' + Date.now().toString(36);
const PORT = 3800 + Math.floor(Math.random() * 300);
const BASE = 'http://127.0.0.1:' + PORT + '/';
const UP = fs.mkdtempSync(path.join(os.tmpdir(), 'okr-wf-'));
const SERVER = path.join(__dirname, '..', 'dist', 'server.js');
let proc, admin, db, seq = 0;
const nid = p => p + (++seq) + Math.random().toString(36).slice(2, 6);

const env = () => ({ ...process.env, ...PGENV, PGDATABASE: DBNAME, PORT: String(PORT), TOKEN_SECRET: 'x'.repeat(40), UPLOAD_DIR: UP, ALLOWED_ORIGINS: '*' });
async function startServer() {
  proc = spawn('node', [SERVER], { env: env(), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; proc.stderr.on('data', d => { log += d; }); proc.stdout.on('data', d => { log += d; });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(BASE + 'health'); if (r.ok) return; } catch (e) { /* chưa lên */ }
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('Server không khởi động được:\n' + log);
}
const stopServer = async () => { if (proc) { proc.kill(); await new Promise(r => proc.once('exit', r)); proc = null; } };
async function call(token, action, payload, expectOk = true) {
  const r = await fetch(BASE, { method: 'POST', body: JSON.stringify({ action, payload, token, lite: true }) });
  const j = await r.json();
  if (expectOk) assert.equal(j.ok, true, action + ' → ' + j.error);
  return j;
}
const fail = async (token, action, payload, re) => {
  const j = await call(token, action, payload, false);
  assert.equal(j.ok, false, action + ' lẽ ra phải bị từ chối');
  if (re) assert.match(j.error, re);
  return j;
};
async function login(username) {
  const r = await fetch(BASE, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username, password: 'secret1' } }) });
  const j = await r.json(); assert.equal(j.ok, true, 'login ' + username + ': ' + j.error); return { token: j.token, id: j.user.id };
}
const flow = async (token, kind, params = {}) => {
  const q = new URLSearchParams({ flow: kind, token, ...params });
  return (await fetch(BASE + '?' + q)).json();
};
const inbox = async token => (await fetch(BASE + '?notif=1&token=' + encodeURIComponent(token))).json();

before(async () => {
  admin = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: 'postgres' });
  await admin.connect(); await admin.query('CREATE DATABASE ' + DBNAME);
});
after(async () => {
  await stopServer();
  if (db) await db.end();
  await admin.query('DROP DATABASE IF EXISTS ' + DBNAME + ' WITH (FORCE)'); await admin.end();
  fs.rmSync(UP, { recursive: true, force: true });
});

describe('Module Quy trình (v22)', () => {
  let dir, head, mgr, hr, b, other;      // dir = Giám đốc, head = Trưởng phòng, mgr = Quản lý, hr/b = nhân viên (thành viên), other = nhân viên ngoài quy trình
  let WF, stages, fields, reasons;       // quy trình Tuyển dụng dùng chung các test
  const stageBy = name => stages.find(s => s.name === name);
  const fieldBy = name => fields.find(f => f.name === name);
  const load = async (token, id) => flow(token, 'wf', { id });
  const reload = async () => { const j = await load(head.token, WF); stages = j.stages; fields = j.fields; reasons = j.failReasons; return j; };
  const newJob = async (token, extra = {}) => {
    const id = nid('wj');
    await call(token, 'wfSaveJob', { job: { id, workflowId: WF, title: 'Ứng viên ' + id, fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Kế toán' }, ...extra } });
    return id;
  };
  const jobOf = async (token, id) => (await flow(token, 'job', { id })).job;

  before(async () => {
    execFileSync('node', [SERVER, 'create-director', 'admin', 'secret1', 'Giám đốc'], { env: env(), encoding: 'utf8' });
    await startServer();
    db = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME }); await db.connect();
    dir = await login('admin');
    const mk = async (id, username, role, managerId) => {
      await call(dir.token, 'saveUser', { user: { id, username, password: 'secret1', name: 'Tên ' + username, role, managerId: managerId || '', dept: 'KD' } });
      return login(username);
    };
    head = await mk('uhead', 'head', 'head', dir.id);
    mgr = await mk('umgr', 'mgr', 'manager', head.id);
    hr = await mk('uhr', 'hr', 'employee', mgr.id);
    b = await mk('ub', 'b', 'employee', mgr.id);
    other = await mk('uo', 'other', 'employee', mgr.id);
  });

  test('Ping báo version 22', async () => {
    const r = await (await fetch(BASE + '?ping=1')).json();
    assert.equal(r.version, 22);
  });

  test('Cần đăng nhập mới đọc được dữ liệu Quy trình', async () => {
    const r = await (await fetch(BASE + '?flow=list')).json();
    assert.equal(r.ok, false); assert.equal(r.auth, true);
  });

  test('Chỉ Giám đốc và Trưởng phòng được tạo quy trình; nhân viên và quản lý bị từ chối', async () => {
    for (const who of [hr, mgr]) await fail(who.token, 'wfSaveWorkflow', { workflow: { id: nid('wf'), name: 'Thử' } }, /Giám đốc hoặc Trưởng phòng/);
    assert.equal((await flow(hr.token, 'list')).canCreate, false);
    assert.equal((await flow(head.token, 'list')).canCreate, true);
  });

  test('Tạo quy trình Tuyển dụng từ mẫu: 6 giai đoạn, todo bắt buộc, trường, lý do thất bại; người tạo là owner', async () => {
    WF = nid('wf');
    await call(head.token, 'wfSaveWorkflow', { workflow: { id: WF, name: 'Tuyển dụng', category: 'Nhân sự' }, templateKey: 'recruit' });
    const j = await reload();
    assert.deepEqual(j.stages.map(s => s.name), ['Tiếp nhận hồ sơ', 'Sàng lọc CV', 'Phỏng vấn vòng 1', 'Phỏng vấn vòng 2', 'Đề nghị (offer)', 'Nhận việc']);
    assert.equal(j.stages[0].slaHours, 24);
    assert.equal(j.stages[2].todos.filter(t => t.required).length, 2);
    assert.equal(j.fields.length, 9); assert.ok(j.fields.some(f => f.type === 'file'));
    assert.equal(j.failReasons.length, 5);
    assert.equal(j.workflow.isOwner, true); assert.equal(j.workflow.canManage, true);
    assert.deepEqual(j.workflow.members, [{ userId: head.id, owner: true }]);
  });

  test('Chỉ thành viên (và Giám đốc) thấy quy trình', async () => {
    assert.equal((await flow(hr.token, 'list')).workflows.length, 0);
    const r = await flow(hr.token, 'wf', { id: WF }); assert.equal(r.ok, false); assert.match(r.error, /thành viên/);
    const d = await flow(dir.token, 'list'); assert.equal(d.workflows.length, 1);
    assert.equal(d.workflows[0].stageCount, 6);
    assert.equal((await load(dir.token, WF)).ok, true);
  });

  test('Thành viên: owner phải là Giám đốc/Trưởng phòng, cần ít nhất 1 owner, người ngoài không tự thêm mình được', async () => {
    await fail(hr.token, 'wfSetMembers', { workflowId: WF, members: [{ userId: hr.id, owner: true }] }, /thành viên|owner/);
    await fail(head.token, 'wfSetMembers', { workflowId: WF, members: [{ userId: head.id, owner: true }, { userId: hr.id, owner: true }] }, /không thể làm owner/);
    await fail(head.token, 'wfSetMembers', { workflowId: WF, members: [{ userId: hr.id }] }, /ít nhất một owner/);
    await call(head.token, 'wfSetMembers', { workflowId: WF, members: [{ userId: head.id, owner: true }, { userId: mgr.id }, { userId: hr.id }, { userId: b.id }] });
    const j = await load(hr.token, WF); assert.equal(j.ok, true);
    assert.equal(j.workflow.members.length, 4); assert.equal(j.workflow.isOwner, false); assert.equal(j.workflow.canManage, false);
    assert.equal((await flow(hr.token, 'list')).workflows.length, 1);
    assert.equal((await flow(other.token, 'list')).workflows.length, 0);
  });

  test('Cấu hình: thành viên thường không sửa được; người thực hiện mặc định phải là thành viên; SLA hợp lệ', async () => {
    await reload();
    const asIs = () => stages.map(s => ({ id: s.id, name: s.name, slaHours: s.slaHours, assigneeIds: s.assigneeIds, todos: s.todos }));
    await fail(hr.token, 'wfSaveConfig', { workflowId: WF, stages: asIs() }, /owner/);
    const bad = asIs(); bad[0].assigneeIds = [other.id];
    await fail(head.token, 'wfSaveConfig', { workflowId: WF, stages: bad }, /chưa là thành viên/);
    const bad2 = asIs(); bad2[0].slaHours = -3;
    await fail(head.token, 'wfSaveConfig', { workflowId: WF, stages: bad2 }, /SLA/);
    const ok = asIs(); ok[0].assigneeIds = [hr.id]; ok[1].assigneeIds = [hr.id];
    await call(head.token, 'wfSaveConfig', { workflowId: WF, stages: ok });
    await reload();
    assert.deepEqual(stageBy('Tiếp nhận hồ sơ').assigneeIds, [hr.id]);
    assert.equal(stageBy('Tiếp nhận hồ sơ').todos.length, 1, 'todo mẫu giữ nguyên sau khi lưu');
  });

  test('Trường tuỳ chỉnh: kiểu chọn cần lựa chọn, không đổi kiểu, kiểm tra giá trị khi tạo job', async () => {
    const cur = () => fields.map(f => ({ id: f.id, name: f.name, type: f.type, options: f.options, required: f.required }));
    const noOpt = [...cur(), { id: nid('f'), name: 'Hỏng', type: 'select', options: [] }];
    await fail(head.token, 'wfSaveConfig', { workflowId: WF, fields: noOpt }, /ít nhất 1 lựa chọn/);
    const changed = cur(); changed.find(f => f.name === 'Email').type = 'number';
    await fail(head.token, 'wfSaveConfig', { workflowId: WF, fields: changed }, /Không đổi được kiểu/);
    const withReq = cur(); withReq.push({ id: nid('f'), name: 'Đồng ý điều khoản', type: 'checkbox', required: false });
    await call(head.token, 'wfSaveConfig', { workflowId: WF, fields: withReq });
    await reload(); assert.equal(fields.length, 10);
    // giá trị sai kiểu bị từ chối
    await fail(hr.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'X', fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Phi hành gia' } } }, /không nằm trong danh sách/);
    await fail(hr.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'X', fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Kế toán', [fieldBy('Link CV').id]: 'javascript:alert(1)' } } }, /đường link/);
    await fail(hr.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'X', fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Kế toán', [fieldBy('Mức lương mong muốn').id]: 'abc' } } }, /nhập số/);
    await fail(hr.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'X', fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Kế toán', [fieldBy('Ngày có thể đi làm').id]: '2026-13-45' } } }, /ngày hợp lệ/);
  });

  test('Tạo job: thành viên tạo được, người ngoài không; trường bắt buộc; giao cho người mặc định; sinh todo mẫu; báo chuông', async () => {
    await fail(other.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'Lén' } }, /thành viên/);
    await fail(b.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: WF, title: 'Thiếu vị trí' } }, /trường bắt buộc.*Vị trí ứng tuyển/);
    const before = (await inbox(hr.token)).unread;
    const id = await newJob(b.token, { priority: 'high', tags: ['gấp', 'gấp', 'kinh doanh'], due: '2030-01-31', description: '<!--rt--><b>Ứng viên tốt</b>', followerIds: [mgr.id] });
    const j = await jobOf(b.token, id);
    assert.equal(j.stageId, stageBy('Tiếp nhận hồ sơ').id); assert.equal(j.status, 'open');
    assert.deepEqual(j.assigneeIds, [hr.id], 'giao cho người thực hiện mặc định của giai đoạn đầu');
    assert.deepEqual(j.followerIds, [mgr.id]); assert.deepEqual(j.tags, ['gấp', 'kinh doanh']); assert.equal(j.priority, 'high');
    assert.equal(j.todos.length, 1); assert.equal(j.todos[0].required, true); assert.equal(j.todos[0].assigneeId, hr.id); assert.equal(j.todos[0].done, false);
    assert.ok(j.slaDueAt > j.stageEnteredAt, 'có hạn SLA');
    assert.equal(j.description, '<!--rt--><b>Ứng viên tốt</b>');
    const ib = await inbox(hr.token);
    assert.equal(ib.unread, before + 1);
    const n = ib.items.find(x => x.kind === 'wfAssigned' && x.refId === id);
    assert.ok(n); assert.equal(n.refType, 'flow'); assert.equal(n.refWs, WF); assert.equal(n.actorId, b.id);
    assert.equal((await inbox(b.token)).items.filter(x => x.refId === id).length, 0, 'người tạo không tự nhận thông báo');
  });

  test('Người theo dõi / người thực hiện phải là thành viên; xem job: thành viên xem được, người ngoài không', async () => {
    const id = await newJob(b.token);
    await fail(b.token, 'wfSetFollowers', { jobId: id, followerIds: [other.id] }, /chưa là thành viên/);
    const r = await flow(other.token, 'job', { id }); assert.equal(r.ok, false);
    assert.equal((await flow(mgr.token, 'job', { id })).ok, true);
  });

  test('Chuyển giai đoạn: bị chặn khi còn todo bắt buộc; người không phải thực hiện/owner không chuyển được; tuần tự tiến/lùi', async () => {
    const id = await newJob(b.token);
    await fail(hr.token, 'wfMoveJob', { id, dir: 'next' }, /todo bắt buộc.*Kiểm tra hồ sơ đủ/);
    let j = await jobOf(hr.token, id);
    await fail(mgr.token, 'wfSetTodo', { id: j.todos[0].id, done: true }, /Chỉ người được giao todo/);
    await fail(b.token, 'wfMoveJob', { id, dir: 'next' }, /Chỉ người thực hiện/);
    await call(hr.token, 'wfSetTodo', { id: j.todos[0].id, done: true });
    await call(hr.token, 'wfMoveJob', { id, dir: 'next' });
    j = await jobOf(hr.token, id);
    assert.equal(j.stageId, stageBy('Sàng lọc CV').id);
    assert.equal(j.todos.filter(t => t.stageId === stageBy('Sàng lọc CV').id).length, 2, 'sinh todo mẫu của giai đoạn mới');
    assert.ok(j.comments.some(c => c.system && /Sàng lọc CV/.test(c.text)), 'ghi chú hệ thống');
    // lùi: giữ todo cũ (đã xong), không sinh trùng
    await call(hr.token, 'wfMoveJob', { id, dir: 'prev' });
    await call(hr.token, 'wfMoveJob', { id, dir: 'next' });
    j = await jobOf(hr.token, id);
    assert.equal(j.todos.length, 3, 'không sinh trùng todo khi đi lại giai đoạn');
    assert.equal(j.todos.find(t => t.title.startsWith('Kiểm tra')).done, true);
    const first = await newJob(b.token);
    await fail(dir.token, 'wfMoveJob', { id: first, dir: 'prev' }, /giai đoạn đầu tiên/);
  });

  test('Owner/Giám đốc chuyển được dù không phải người thực hiện; giao người khác khi chuyển; giai đoạn cuối không chuyển tiếp tiếp được', async () => {
    const id = await newJob(b.token);
    const j0 = await jobOf(hr.token, id);
    await call(hr.token, 'wfSetTodo', { id: j0.todos[0].id, done: true });
    await call(head.token, 'wfMoveJob', { id, dir: 'next', assigneeIds: [mgr.id] });       // owner chuyển, chỉ định Quản lý làm người thực hiện giai đoạn sau
    let j = await jobOf(head.token, id);
    assert.deepEqual(j.assigneeIds, [mgr.id]);
    for (const t of j.todos.filter(t => t.stageId === j.stageId && t.required && !t.done)) await call(head.token, 'wfSetTodo', { id: t.id, done: true });
    await fail(head.token, 'wfMoveJob', { id, dir: 'next', assigneeIds: [other.id] }, /chưa là thành viên/);
    // đi tới giai đoạn cuối bằng quyền Giám đốc, tick todo bắt buộc từng giai đoạn
    for (let i = 0; i < 6; i++) {
      j = await jobOf(dir.token, id);
      if (j.stageId === stages[5].id) break;
      for (const t of j.todos.filter(t => t.stageId === j.stageId && t.required && !t.done)) await call(dir.token, 'wfSetTodo', { id: t.id, done: true });
      await call(dir.token, 'wfMoveJob', { id, dir: 'next' });
    }
    j = await jobOf(dir.token, id); assert.equal(j.stageId, stages[5].id);
    await fail(dir.token, 'wfMoveJob', { id, dir: 'next' }, /giai đoạn cuối/);
  });

  test('Hoàn thành chỉ ở giai đoạn cuối; Thất bại cần lý do trong danh sách; thông báo; owner mới mở lại được; lưu trữ; chỉ Giám đốc xoá', async () => {
    const id = await newJob(b.token, { followerIds: [mgr.id] });
    await fail(hr.token, 'wfCloseJob', { id, status: 'done' }, /giai đoạn cuối/);
    await fail(hr.token, 'wfCloseJob', { id, status: 'failed', reason: 'Lý do tự bịa' }, /chọn một lý do/);
    await fail(b.token, 'wfCloseJob', { id, status: 'failed', reason: reasons[0].text }, /Chỉ người thực hiện/);
    await call(hr.token, 'wfCloseJob', { id, status: 'failed', reason: 'Không đạt CV' });
    let j = await jobOf(hr.token, id);
    assert.equal(j.status, 'failed'); assert.equal(j.failReason, 'Không đạt CV'); assert.ok(j.closedAt);
    const bi = (await inbox(b.token)).items.find(x => x.kind === 'wfFailed' && x.refId === id);
    assert.ok(bi, 'người tạo được báo'); assert.equal(bi.detail, 'Không đạt CV');
    assert.ok((await inbox(mgr.token)).items.some(x => x.kind === 'wfFailed' && x.refId === id), 'người theo dõi được báo');
    assert.ok(!(await inbox(hr.token)).items.some(x => x.kind === 'wfFailed' && x.refId === id), 'người đóng không tự nhận');
    await fail(hr.token, 'wfMoveJob', { id, dir: 'next' }, /đã đóng/);
    await fail(hr.token, 'wfReopenJob', { id }, /owner hoặc Giám đốc/);
    await fail(head.token, 'wfArchiveJob', { id: await newJob(b.token) }, /đã Hoàn thành hoặc Thất bại/);
    await call(head.token, 'wfReopenJob', { id });
    j = await jobOf(hr.token, id); assert.equal(j.status, 'open'); assert.equal(j.failReason, '');
    await call(hr.token, 'wfCloseJob', { id, status: 'failed', reason: 'Hết nhu cầu tuyển' });
    await call(head.token, 'wfArchiveJob', { id });
    assert.ok(!(await load(head.token, WF)).jobs.some(x => x.id === id), 'job lưu trữ rời danh sách chính');
    assert.ok((await flow(head.token, 'wf', { id: WF, archived: '1' })).jobs.some(x => x.id === id), 'xem được ở mục Lưu trữ');
    await fail(head.token, 'wfDeleteJob', { id }, /Chỉ Giám đốc/);
    await call(dir.token, 'wfDeleteJob', { id });
    assert.equal((await flow(dir.token, 'job', { id })).ok, false);
  });

  test('Todo thêm tay, giao người khác, thông báo; chỉ người thực hiện/owner thêm-sửa-xoá; tick bởi người được giao', async () => {
    const id = await newJob(b.token);
    const td = nid('wt');
    await fail(b.token, 'wfAddTodo', { todo: { id: td, jobId: id, title: 'Gọi điện' } }, /Chỉ người thực hiện/);
    await call(hr.token, 'wfAddTodo', { todo: { id: td, jobId: id, title: 'Gọi điện xác nhận', assigneeId: mgr.id } });
    const n = (await inbox(mgr.token)).items.find(x => x.kind === 'wfTodo' && x.refId === id);
    assert.ok(n); assert.equal(n.detail, 'Gọi điện xác nhận');
    await call(mgr.token, 'wfSetTodo', { id: td, done: true });                                     // người được giao tự tick
    await fail(mgr.token, 'wfSetTodo', { id: td, title: 'Đổi tên' }, /Chỉ người thực hiện/);
    await call(hr.token, 'wfSetTodo', { id: td, title: 'Gọi điện lại' });
    await call(hr.token, 'wfDeleteTodo', { id: td });
    assert.ok(!(await jobOf(hr.token, id)).todos.some(t => t.id === td));
  });

  test('Mục "Của tôi": job giao cho tôi và todo của tôi (cho Việc của tôi)', async () => {
    const id = await newJob(b.token);
    const m = await flow(hr.token, 'mine');
    assert.ok(m.jobs.some(j => j.id === id)); assert.equal(m.jobs.find(j => j.id === id).wfName, 'Tuyển dụng');
    const t = m.todos.find(t => t.jobId === id); assert.ok(t); assert.equal(t.wfName, 'Tuyển dụng'); assert.equal(t.done, false);
    assert.ok((await flow(b.token, 'mine')).jobs.some(j => j.id === id), 'người tạo cũng thấy');
    assert.ok(!(await flow(other.token, 'mine')).jobs.some(j => j.id === id), 'người ngoài không thấy');
    assert.ok((await flow(mgr.token, 'mine')).jobs.some(j => j.id === id), 'quản lý thấy job của cấp dưới');
  });

  test('Bình luận: thành viên bình luận được, người ngoài không; báo cho người liên quan + @nhắc; không xoá được ghi chú hệ thống', async () => {
    const id = await newJob(b.token, { followerIds: [mgr.id] });
    await fail(other.token, 'wfAddComment', { comment: { id: nid('wc'), jobId: id, text: 'Chen ngang' } }, /thành viên/);
    const cid = nid('wc');
    await call(mgr.token, 'wfAddComment', { comment: { id: cid, jobId: id, text: 'Hồ sơ này ổn', mentions: [b.id] } });
    const j = await jobOf(hr.token, id);
    assert.ok(j.comments.some(c => c.id === cid && c.text === 'Hồ sơ này ổn'));
    assert.ok((await inbox(hr.token)).items.some(x => x.kind === 'wfComment' && x.refId === id && x.detail === 'Hồ sơ này ổn'), 'người thực hiện nhận');
    assert.ok(!(await inbox(mgr.token)).items.some(x => x.kind === 'wfComment' && x.refId === id), 'người viết không tự nhận');
    await fail(hr.token, 'wfDeleteComment', { id: cid }, /Chỉ người viết/);
    await call(mgr.token, 'wfDeleteComment', { id: cid });
    const sys = (await jobOf(hr.token, id)).comments.find(c => c.system);
    if (sys) await fail(dir.token, 'wfDeleteComment', { id: sys.id }, /hệ thống/);
  });

  test('Xoá giai đoạn đang có job bị chặn; xoá giai đoạn trống được', async () => {
    const id = await newJob(b.token);                                                                // job ở giai đoạn đầu
    const cur = () => stages.map(s => ({ id: s.id, name: s.name, slaHours: s.slaHours, assigneeIds: s.assigneeIds, todos: s.todos }));
    await fail(head.token, 'wfSaveConfig', { workflowId: WF, stages: cur().slice(1) }, /còn \d+ job đang làm/);
    const extra = { id: nid('ws'), name: 'Giai đoạn thử', slaHours: null, assigneeIds: [], todos: [] };
    await call(head.token, 'wfSaveConfig', { workflowId: WF, stages: [...cur(), extra] });
    await reload(); assert.equal(stages.length, 7);
    await call(head.token, 'wfSaveConfig', { workflowId: WF, stages: cur().slice(0, 6) });
    await reload(); assert.equal(stages.length, 6);
    assert.ok(id);
  });

  test('Báo cáo quy trình: tổng số, theo giai đoạn, theo người, lý do thất bại', async () => {
    const r = (await flow(head.token, 'report', { id: WF })).report;
    assert.ok(r.totals.total >= 8); assert.ok(r.totals.open >= 1);
    assert.equal(r.byStage.length, 6); assert.equal(r.byStage[0].name, 'Tiếp nhận hồ sơ');
    assert.ok(r.byStage[0].open >= 1);
    assert.ok(r.byAssignee.some(x => x.userId === hr.id));
    assert.ok(r.failReasons.some(x => x.reason === 'Không đạt CV' || x.reason === 'Hết nhu cầu tuyển') || r.totals.failed === 0);
    const empty = (await flow(head.token, 'report', { id: WF, from: '2001-01-01', to: '2001-01-02' })).report;
    assert.equal(empty.totals.total, 0);
    assert.equal((await flow(other.token, 'report', { id: WF })).ok, false);
  });

  test('Nhật ký hoạt động của quy trình', async () => {
    const a = (await flow(hr.token, 'activity', { id: WF })).activity;
    assert.ok(a.length > 5); assert.ok(a.some(x => x.kind === 'job.move')); assert.ok(a.some(x => x.kind === 'workflow.create'));
    assert.equal((await flow(other.token, 'activity', { id: WF })).ok, false);
  });

  test('Tệp đính kèm: tải lên theo trường tệp, tải xuống; người ngoài bị chặn; quá giới hạn / sai loại bị từ chối', async () => {
    const id = await newJob(b.token);
    const fieldId = fieldBy('File CV').id;
    const up = async (token, name, body, extra = '') => (await fetch(BASE + 'flow-upload?jobId=' + id + '&name=' + encodeURIComponent(name) + extra, { method: 'POST', headers: { 'x-okr-token': token }, body })).json();
    const r = await up(b.token, 'cv.pdf', Buffer.from('%PDF-1.4 thử nghiệm'), '&fieldId=' + fieldId);
    assert.equal(r.ok, true, r.error); assert.equal(r.attachment.fieldId, fieldId); assert.match(r.attachment.id, /^wf/);
    const dl = await fetch(BASE + 'file/' + r.attachment.id + '?token=' + encodeURIComponent(hr.token));
    assert.equal(dl.status, 200); assert.equal(await dl.text(), '%PDF-1.4 thử nghiệm');
    const denied = await (await fetch(BASE + 'file/' + r.attachment.id + '?token=' + encodeURIComponent(other.token))).json();
    assert.equal(denied.ok, false);
    assert.equal((await up(other.token, 'x.pdf', Buffer.from('abc'))).ok, false);
    assert.equal((await up(mgr.token, 'x.pdf', Buffer.from('abc'))).ok, false, 'người theo dõi/thành viên không phải thực hiện không đính kèm');
    assert.match((await up(b.token, 'virus.exe', Buffer.from('MZ'))).error, /chưa được hỗ trợ/);
    assert.match((await up(b.token, 'a.pdf', Buffer.from('abc'), '&fieldId=' + fieldBy('Email').id)).error, /Trường tệp/);
    const j = await jobOf(hr.token, id); assert.equal(j.files.length, 1); assert.equal(j.fileCount, 1);
    await call(b.token, 'wfDeleteFile', { id: r.attachment.id });
    assert.equal((await jobOf(hr.token, id)).files.length, 0);
  });

  test('Trường tệp bắt buộc chặn chuyển giai đoạn đến khi có tệp', async () => {
    const cur = () => fields.map(f => ({ id: f.id, name: f.name, type: f.type, options: f.options, required: f.required }));
    const fs2 = cur(); fs2.find(f => f.name === 'File CV').required = true;
    await call(head.token, 'wfSaveConfig', { workflowId: WF, fields: fs2 });
    await reload();
    const id = await newJob(b.token);                                                                // tạo job không cần tệp (tệp chỉ đính kèm sau khi job tồn tại)
    let j = await jobOf(hr.token, id);
    await call(hr.token, 'wfSetTodo', { id: j.todos[0].id, done: true });
    await fail(hr.token, 'wfMoveJob', { id, dir: 'next' }, /File CV/);
    const r = await (await fetch(BASE + 'flow-upload?jobId=' + id + '&name=cv.pdf&fieldId=' + fieldBy('File CV').id, { method: 'POST', headers: { 'x-okr-token': hr.token }, body: Buffer.from('pdf') })).json();
    assert.equal(r.ok, true, r.error);
    await call(hr.token, 'wfMoveJob', { id, dir: 'next' });
    const back = cur(); back.find(f => f.name === 'File CV').required = false;
    await call(head.token, 'wfSaveConfig', { workflowId: WF, fields: back }); await reload();
  });

  describe('Chuyển tiếp sang quy trình khác', () => {
    let ONB, onbStages, onbFields;
    test('Tạo quy trình đích (nhân bản cấu trúc) và luật chuyển tiếp: thủ công + tự động', async () => {
      ONB = nid('wf');
      await call(head.token, 'wfSaveWorkflow', { workflow: { id: ONB, name: 'Onboarding' }, cloneFromId: WF });
      let j = await load(head.token, ONB);
      assert.equal(j.stages.length, 6, 'nhân bản giai đoạn'); assert.equal(j.fields.length, 10); assert.equal(j.jobs.length, 0, 'không chép job');
      await call(head.token, 'wfSetMembers', { workflowId: ONB, members: [{ userId: head.id, owner: true }, { userId: hr.id }, { userId: b.id }] });
      j = await load(head.token, ONB); onbStages = j.stages; onbFields = j.fields;
      await call(head.token, 'wfSaveConfig', { workflowId: ONB, stages: onbStages.map((s, i) => ({ id: s.id, name: i === 0 ? 'Chuẩn bị' : s.name, slaHours: s.slaHours, assigneeIds: i === 0 ? [b.id] : [], todos: i === 0 ? [{ id: nid('wp'), title: 'Chuẩn bị thiết bị', required: true }] : [] })) });
      onbStages = (await load(head.token, ONB)).stages;
      const emailSrc = fieldBy('Email').id, emailDst = onbFields.find(f => f.name === 'Email').id;
      // quyền: thành viên thường không đặt luật; không chuyển tiếp sang chính nó / quy trình mình không thuộc
      await fail(hr.token, 'wfSaveConfig', { workflowId: WF, forwardRules: [] }, /owner/);
      await fail(head.token, 'wfSaveConfig', { workflowId: WF, forwardRules: [{ stageId: '', targetWorkflowId: WF, mode: 'auto' }] }, /chính quy trình này/);
      await call(head.token, 'wfSaveConfig', { workflowId: WF, forwardRules: [
        { id: 'ruleDone', stageId: '', targetWorkflowId: ONB, mode: 'manual', fieldMap: { [emailDst]: emailSrc } },
        { id: 'ruleOffer', stageId: stageBy('Đề nghị (offer)').id, targetWorkflowId: ONB, mode: 'manual' },
      ] });
      assert.equal((await reload()).forwardRules.length, 2);
    });
    test('Chuyển tiếp thủ công: chỉ đúng trạng thái; copy tên, trường khớp, người theo dõi là thành viên; giao theo mặc định; nhật ký', async () => {
      const id = await newJob(b.token, { title: 'Nguyễn Văn A', followerIds: [mgr.id, head.id], fieldValues: { [fieldBy('Vị trí ứng tuyển').id]: 'Kế toán', [fieldBy('Email').id]: 'a@x.vn', [fieldBy('Số điện thoại').id]: '0901' } });
      await fail(hr.token, 'wfForwardJob', { id, ruleId: 'ruleDone' }, /đã Hoàn thành/);
      await fail(hr.token, 'wfForwardJob', { id, ruleId: 'ruleOffer' }, /giai đoạn tương ứng/);
      // đưa tới giai đoạn cuối rồi hoàn thành
      for (let i = 0; i < 6; i++) {
        const j = await jobOf(dir.token, id); if (j.stageId === stages[5].id) break;
        for (const t of j.todos.filter(t => t.stageId === j.stageId && t.required && !t.done)) await call(dir.token, 'wfSetTodo', { id: t.id, done: true });
        await call(dir.token, 'wfMoveJob', { id, dir: 'next' });
      }
      const last = await jobOf(dir.token, id);
      for (const t of last.todos.filter(t => t.required && !t.done)) await call(dir.token, 'wfSetTodo', { id: t.id, done: true });
      await call(dir.token, 'wfCloseJob', { id, status: 'done' });
      await fail(other.token, 'wfForwardJob', { id, ruleId: 'ruleDone' }, /thành viên/);
      const r = await call(hr.token, 'wfForwardJob', { id, ruleId: 'ruleDone' });
      assert.ok(r.result && r.result.forwarded, 'người thực hiện chuyển tiếp được');
      const nj = await jobOf(head.token, r.result.forwarded.id);
      assert.equal(nj.workflowId, ONB); assert.equal(nj.title, 'Nguyễn Văn A'); assert.equal(nj.stageId, onbStages[0].id);
      assert.deepEqual(nj.assigneeIds, [b.id], 'giao theo người mặc định của giai đoạn đầu quy trình đích');
      assert.equal(nj.fieldValues[onbFields.find(f => f.name === 'Email').id], 'a@x.vn');
      assert.equal(nj.fieldValues[onbFields.find(f => f.name === 'Số điện thoại').id], '0901', 'tự khớp theo tên + kiểu');
      assert.deepEqual(nj.followerIds, [head.id], 'chỉ giữ người theo dõi là thành viên của quy trình đích (Quản lý không thuộc Onboarding nên bị bỏ)');
      assert.equal(nj.forwardedFrom, id); assert.equal(nj.todos.length, 1);
      assert.equal(nj.forwardLog.length, 1); assert.equal(nj.forwardLog[0].mode, 'manual'); assert.equal(nj.forwardLog[0].fromWorkflow, 'Tuyển dụng');
      const src = await jobOf(head.token, id);
      assert.equal(src.status, 'done', 'job gốc giữ nguyên'); assert.equal(src.fwd, 1); assert.equal(src.forwardLog[0].toJobId, nj.id);
      assert.ok(src.comments.some(c => c.system && /Onboarding/.test(c.text)));
      await fail(hr.token, 'wfForwardJob', { id, ruleId: 'ruleDone' }, /đã được chuyển tiếp/);
      assert.ok((await inbox(b.token)).items.some(x => x.kind === 'wfAssigned' && x.refId === nj.id), 'người nhận job mới được báo');
    });
    test('Chuyển tiếp tự động khi job vào giai đoạn; chuỗi vòng A→B→A bị chặn', async () => {
      const cur = (await reload()).forwardRules;
      await call(head.token, 'wfSaveConfig', { workflowId: WF, forwardRules: [...cur, { id: 'ruleAuto', stageId: stageBy('Sàng lọc CV').id, targetWorkflowId: ONB, mode: 'auto' }] });
      // quy trình đích tự chuyển ngược lại ở giai đoạn đầu → tạo vòng lặp
      await call(head.token, 'wfSaveConfig', { workflowId: ONB, forwardRules: [{ id: 'ruleBack', stageId: onbStages[0].id, targetWorkflowId: WF, mode: 'auto' }] });
      const id = await newJob(b.token, { title: 'Vòng lặp' });
      const j = await jobOf(hr.token, id);
      await call(hr.token, 'wfSetTodo', { id: j.todos[0].id, done: true });
      await call(hr.token, 'wfMoveJob', { id, dir: 'next' });                                       // vào "Sàng lọc CV" → tự chuyển sang Onboarding → tự chuyển ngược → …
      const all = (await load(dir.token, WF)).jobs.filter(x => x.title === 'Vòng lặp');
      const all2 = (await load(dir.token, ONB)).jobs.filter(x => x.title === 'Vòng lặp');
      assert.ok(all2.length >= 1, 'có job tự sinh ở Onboarding');
      assert.ok(all.length + all2.length <= 1 + 9, 'chuỗi bị chặn sau tối đa ' + 8 + ' bước, không lặp vô hạn');
      const log = (await jobOf(dir.token, id)).forwardLog;
      assert.ok(log.some(l => l.mode === 'auto'));
      await call(head.token, 'wfSaveConfig', { workflowId: ONB, forwardRules: [] });
    });
    test('Xoá quy trình: còn job thì bị chặn; trống thì xoá được', async () => {
      await fail(head.token, 'wfDeleteWorkflow', { id: ONB }, /còn \d+ job/);
      const EMPTY = nid('wf');
      await call(head.token, 'wfSaveWorkflow', { workflow: { id: EMPTY, name: 'Tạm' }, templateKey: 'blank' });
      await fail(hr.token, 'wfDeleteWorkflow', { id: EMPTY }, /thành viên|Chỉ owner/);
      await call(head.token, 'wfDeleteWorkflow', { id: EMPTY });
      assert.ok(!(await flow(head.token, 'list')).workflows.some(w => w.id === EMPTY));
    });
  });

  test('Ghim quy trình chỉ của riêng mình; lưu trữ quy trình chặn tạo job mới', async () => {
    await call(hr.token, 'wfPin', { workflowId: WF, pinned: true });
    assert.equal((await flow(hr.token, 'list')).workflows.find(w => w.id === WF).pinned, true);
    assert.equal((await flow(b.token, 'list')).workflows.find(w => w.id === WF).pinned, false);
    await fail(other.token, 'wfPin', { workflowId: WF, pinned: true }, /chưa là thành viên/);
    const ARCH = nid('wf');
    await call(head.token, 'wfSaveWorkflow', { workflow: { id: ARCH, name: 'Sắp lưu trữ' } });
    await call(head.token, 'wfSaveWorkflow', { workflow: { id: ARCH, name: 'Sắp lưu trữ', archived: true } });
    await fail(head.token, 'wfSaveJob', { job: { id: nid('wj'), workflowId: ARCH, title: 'x' } }, /đã lưu trữ/);
  });

  test('Quá hạn SLA: báo chuông một lần cho người thực hiện và owner; không email; không báo lại', async () => {
    const id = await newJob(b.token, { title: 'Job quá hạn SLA' });
    await db.query("UPDATE wf_jobs SET sla_due_at = $2 WHERE id = $1", [id, new Date(Date.now() - 3600e3).toISOString()]);
    await stopServer(); await startServer();                                                          // máy chủ quét SLA ngay khi khởi động
    await new Promise(r => setTimeout(r, 1500));
    const hrI = (await inbox(hr.token)).items.filter(x => x.kind === 'wfOverdue' && x.refId === id);
    const headI = (await inbox(head.token)).items.filter(x => x.kind === 'wfOverdue' && x.refId === id);
    assert.equal(hrI.length, 1, 'người thực hiện được báo'); assert.equal(headI.length, 1, 'owner được báo');
    assert.equal(hrI[0].refWs, WF); assert.equal(hrI[0].subject, 'Job quá hạn SLA');
    assert.equal((await inbox(b.token)).items.filter(x => x.kind === 'wfOverdue' && x.refId === id).length, 0, 'người tạo không phải thực hiện/owner thì không báo');
    await stopServer(); await startServer(); await new Promise(r => setTimeout(r, 1500));
    assert.equal((await inbox(hr.token)).items.filter(x => x.kind === 'wfOverdue' && x.refId === id).length, 1, 'không báo lại');
    const list = (await flow(hr.token, 'list')).workflows.find(w => w.id === WF);
    assert.ok(list.counts.overdue >= 1);
    // chuyển sang giai đoạn mới thì SLA mới, được báo lại khi quá hạn lần nữa
    const j = await jobOf(hr.token, id);
    await call(hr.token, 'wfSetTodo', { id: j.todos[0].id, done: true });
    await call(hr.token, 'wfMoveJob', { id, dir: 'next' });
    assert.ok((await jobOf(hr.token, id)).slaDueAt > new Date().toISOString());
  });

  test('Đăng nhập lại sau khi khởi động lại: dữ liệu Quy trình còn nguyên; phiên bản dữ liệu đổi sau khi ghi', async () => {
    const t = await login('hr');
    const before = (await (await fetch(BASE + '?token=' + encodeURIComponent(t.token))).json()).version;
    assert.ok((await flow(t.token, 'list')).workflows.some(w => w.id === WF));
    await newJob(b.token);
    const after2 = (await (await fetch(BASE + '?token=' + encodeURIComponent(t.token))).json()).version;
    assert.notEqual(before, after2);
    const un = await (await fetch(BASE + '?flow=list&token=' + encodeURIComponent(t.token) + '&v=' + encodeURIComponent(after2))).json();
    assert.equal(un.unchanged, true);
  });
});

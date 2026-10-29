/**
 * Kiểm thử module quản lý công việc (src/work.js) với PostgreSQL thật.
 *   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=okr PGPASSWORD=… npm test
 * Mỗi lần chạy tạo 1 cơ sở dữ liệu tạm, khởi động server thật (dist/server.js) rồi gọi API qua HTTP.
 */
'use strict';
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('pg');
const { recurrence } = require('../src/work.js');

const PGENV = { PGHOST: process.env.PGHOST || '127.0.0.1', PGPORT: process.env.PGPORT || '5432', PGUSER: process.env.PGUSER || 'okr', PGPASSWORD: process.env.PGPASSWORD || '' };
const DBNAME = 'okr_test_' + Date.now().toString(36);
const PORT = 3200 + Math.floor(Math.random() * 300);
const BASE = 'http://127.0.0.1:' + PORT + '/';
const UP = fs.mkdtempSync(path.join(os.tmpdir(), 'okr-up-'));
const SERVER = path.join(__dirname, '..', 'dist', 'server.js');
const todayISO = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const plusDays = n => new Date(Date.parse(todayISO() + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
let proc, admin;

const env = extra => ({ ...process.env, ...PGENV, PGDATABASE: DBNAME, PORT: String(PORT), TOKEN_SECRET: 'x'.repeat(40), UPLOAD_DIR: UP, ALLOWED_ORIGINS: '*', ...extra });
const cli = (...args) => execFileSync('node', [args[0] && args[0].endsWith('.js') ? args.shift() : SERVER, ...args], { env: env(), encoding: 'utf8' });
async function startServer(file = SERVER) {
  proc = spawn('node', [file], { env: env(), stdio: ['ignore', 'pipe', 'pipe'] });
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
const denied = async (token, action, payload, re) => { const j = await call(token, action, payload, false); assert.equal(j.ok, false, action + ' lẽ ra phải bị từ chối'); if (re) assert.match(j.error, re); return j; };
async function login(username, password = 'secret1') {
  const r = await fetch(BASE, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username, password } }) });
  const j = await r.json(); assert.equal(j.ok, true, 'login ' + username + ': ' + j.error); return j.token;
}
const work = async (token, ws = '') => { const r = await fetch(BASE + '?work=1&ws=' + ws + '&token=' + encodeURIComponent(token)); const j = await r.json(); assert.equal(j.ok, true, j.error); return j.work; };
const detail = async (token, id) => (await (await fetch(BASE + '?workTask=' + id + '&token=' + encodeURIComponent(token))).json());
let seqId = 0; const nid = p => p + (++seqId) + Math.random().toString(36).slice(2, 6);

before(async () => {
  admin = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: 'postgres' });
  await admin.connect(); await admin.query('CREATE DATABASE ' + DBNAME);
});
after(async () => {
  await stopServer();
  await admin.query('DROP DATABASE IF EXISTS ' + DBNAME + ' WITH (FORCE)'); await admin.end();
  fs.rmSync(UP, { recursive: true, force: true });
});

describe('Công việc lặp lại (hàm thuần)', () => {
  const { cleanRule, nextDue, nextAfter } = recurrence;
  const d = s => new Date(s + 'T00:00:00Z');
  const iso = x => x.toISOString().slice(0, 10);
  test('theo ngày, có khoảng cách', () => {
    assert.equal(nextDue(cleanRule({ type: 'daily' }), '2026-10-29', '2026-10-29'), '2026-10-30');
    assert.equal(nextDue(cleanRule({ type: 'daily', interval: 3 }), '2026-10-29', '2026-10-29'), '2026-11-01');
  });
  test('theo tuần: chọn nhiều thứ, đi đúng thứ tự', () => {
    const r = cleanRule({ type: 'weekly', weekdays: [3, 1] });           // thứ Hai + thứ Tư
    assert.deepEqual(r.weekdays, [1, 3]);
    assert.equal(iso(nextAfter(r, d('2026-10-29'))), '2026-11-02');        // thứ Năm → thứ Hai
    assert.equal(iso(nextAfter(r, d('2026-11-02'))), '2026-11-04');        // thứ Hai → thứ Tư
    assert.equal(iso(nextAfter(r, d('2026-11-04'))), '2026-11-09');        // thứ Tư → thứ Hai tuần sau
    assert.equal(iso(nextAfter(cleanRule({ type: 'weekly', weekdays: [7] }), d('2026-11-01'))), '2026-11-08');   // đúng Chủ nhật: nhảy sang tuần sau
  });
  test('theo tháng: ngày cố định, tháng ngắn lấy ngày cuối tháng', () => {
    assert.equal(nextDue(cleanRule({ type: 'monthly', monthDay: 15 }), '2026-10-29', '2026-10-29'), '2026-11-15');
    assert.equal(nextDue(cleanRule({ type: 'monthly', monthDay: 15 }), '2026-10-10', '2026-10-10'), '2026-10-15');
    const r31 = cleanRule({ type: 'monthly', monthDay: 31 });
    assert.equal(iso(nextAfter(r31, d('2026-01-31'))), '2026-02-28');
    assert.equal(iso(nextAfter(r31, d('2026-02-28'))), '2026-03-31');
    assert.equal(iso(nextAfter(r31, d('2028-01-31'))), '2028-02-29');     // năm nhuận
    assert.equal(iso(nextAfter(r31, d('2026-12-31'))), '2027-01-31');     // qua năm
  });
  test('làm trễ nhiều kỳ thì nhảy tới kỳ gần nhất chưa qua (giữ đúng lịch)', () => {
    const r = cleanRule({ type: 'weekly', weekdays: [1] });
    assert.equal(nextDue(r, '2026-09-07', '2026-10-29'), '2026-11-02');
    assert.equal(nextDue(cleanRule({ type: 'daily' }), '2026-01-01', '2026-10-29'), '2026-10-29');
  });
  test('có ngày kết thúc', () => {
    assert.equal(nextDue(cleanRule({ type: 'weekly', weekdays: [1], end: '2026-10-31' }), '2026-10-26', '2026-10-26'), null);
    assert.equal(nextDue(cleanRule({ type: 'weekly', weekdays: [1], end: '2026-11-02' }), '2026-10-26', '2026-10-26'), '2026-11-02');
  });
  test('cấu hình sai bị loại', () => {
    assert.equal(cleanRule(null), null); assert.equal(cleanRule({ type: 'yearly' }), null);
    assert.equal(cleanRule({ type: 'weekly', weekdays: [] }), null); assert.equal(cleanRule({ type: 'weekly', weekdays: [9] }), null);
    assert.equal(cleanRule({ type: 'monthly', monthDay: 0 }), null); assert.equal(cleanRule({ type: 'monthly', monthDay: 32 }), null);
    assert.equal(cleanRule({ type: 'daily', interval: -4 }).interval, 1);
  });
});

describe('Nâng cấp từ máy chủ v7 (dữ liệu cũ được giữ nguyên)', () => {
  test('việc cũ vào dự án mặc định, có người làm; việc từ báo cáo tuần vẫn hiện', async () => {
    const oldFile = process.env.OLD_SERVER;
    if (!oldFile) return;                                                  // cần bản v7 để so sánh: OLD_SERVER=/đường/dẫn/server-v7.js
    cli(oldFile, 'create-director', 'admin', 'secret1', 'Giám đốc');
    await startServer(oldFile);
    const tk = await login('admin');
    const me = (await (await fetch(BASE, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username: 'admin', password: 'secret1' } }) })).json()).user.id;
    const cyc = (await (await fetch(BASE + '?token=' + encodeURIComponent(tk))).json()).db.cycles[0].id;
    await call(tk, 'saveUser', { user: { id: 'uOldHead', username: 'oldhead', password: 'secret1', name: 'Trưởng phòng cũ', role: 'head', managerId: me } });
    await call(tk, 'addTask', { task: { id: 'told1', title: 'Việc cũ thủ công', due: plusDays(3), status: 'todo' } });
    await call(tk, 'saveOKR', { okr: { id: 'okrOld', title: 'OKR cũ', ownerId: me, cycleId: cyc, krs: [{ id: 'krOld', title: 'KR', baseline: 0, target: 10, unit: 'x' }] } });
    await call(tk, 'addReport', { report: { id: 'rpOld', okrId: 'okrOld', week: 44, year: 2026, createdAt: new Date().toISOString(), work: 'x', krUpdates: [{ krId: 'krOld', value: 3, work: 'x', solutions: [{ id: 'solOld', text: 'Giải pháp cũ', due: plusDays(7) }] }], solutions: [{ id: 'solOld', text: 'Giải pháp cũ', due: plusDays(7) }] },
      tasks: [{ id: 'trep1', title: 'Giải pháp cũ', due: plusDays(7), status: 'doing', solutionId: 'solOld', okrId: 'okrOld', week: 44, year: 2026 }] });
    await stopServer();
    await startServer();                                                   // bản mới tự nâng cấp trên cùng dữ liệu
    const tk2 = await login('admin');
    const w = await work(tk2);
    for (const id of ['told1', 'trep1']) {
      const t = w.tasks.find(x => x.id === id);
      assert.ok(t, 'việc cũ ' + id + ' phải còn');
      assert.equal(t.projectId, 'p_general'); assert.deepEqual(t.assigneeIds, [me]);
    }
    assert.equal(w.tasks.find(x => x.id === 'trep1').status, 'doing');
    assert.equal(w.tasks.find(x => x.id === 'trep1').reportId, 'rpOld');
    const old = await (await fetch(BASE + '?token=' + encodeURIComponent(tk2))).json();       // định dạng cũ cho màn báo cáo tuần
    assert.ok(old.db.tasks.some(x => x.id === 'trep1') && old.db.tasks.some(x => x.id === 'told1'));
    assert.equal(old.db.reports.length, 1); assert.equal(old.db.users.length, 2);
    await call(tk2, 'updateTask', { id: 'trep1', patch: { status: 'done' } });               // checkbox trong chi tiết báo cáo vẫn chạy
    assert.equal((await work(tk2)).tasks.find(x => x.id === 'trep1').status, 'done');
    await stopServer();
  });
});

describe('API công việc', () => {
  let dir, head, mgr, mgr2, a, b, c2, w1, d1, p1, ptok = {};
  before(async () => {
    try { cli('create-director', 'admin', 'secret1', 'Giám đốc'); } catch (e) { /* đã có từ phần nâng cấp */ }
    await startServer();
    dir = await login('admin'); ptok.admin = dir;
    const mk = async (id, username, role, managerId) => { await call(dir, 'saveUser', { user: { id, username, password: 'secret1', name: 'Tên ' + username, role, managerId: managerId || '', dept: 'KD' } }); ptok[username] = await login(username); return id; };
    head = await mk('uhead', 'head', 'head', (await work(dir)).viewerId);
    mgr = await mk('umgr', 'mgr', 'manager', head);
    mgr2 = await mk('umgr2', 'mgr2', 'manager', head);
    a = await mk('ua', 'a', 'employee', mgr);
    b = await mk('ub', 'b', 'employee', mgr);
    c2 = await mk('uc', 'c', 'employee', mgr2);
    w1 = 'wsKD'; d1 = 'depKD'; p1 = 'prjWeb';
    await call(dir, 'saveWorkspace', { workspace: { id: w1, name: 'Kinh doanh', color: '#059669', open: false, memberIds: [mgr, a, b] } });
    await call(dir, 'saveDepartment', { department: { id: d1, workspaceId: w1, name: 'Phòng bán hàng', headId: head } });
    await call(ptok.mgr, 'saveProject', { project: { id: p1, workspaceId: w1, departmentId: d1, name: 'Website', memberIds: [a] } });
  });
  after(stopServer);

  test('Phân cấp & phạm vi nhìn thấy workspace/dự án', async () => {
    const wd = await work(dir, w1);
    assert.equal(wd.currentId, w1);
    assert.ok(wd.workspaces.some(w => w.id === 'w_default') && wd.workspaces.some(w => w.id === w1));
    assert.equal(wd.departments[0].name, 'Phòng bán hàng');
    const pj = wd.projects.find(p => p.id === p1);
    assert.equal(pj.managerId, mgr); assert.equal(pj.access, 'admin');
    assert.deepEqual([...pj.memberIds].sort(), [a, mgr].sort());
    const wa = await work(ptok.a, w1); assert.equal(wa.currentId, w1);                 // a là thành viên
    const wc = await work(ptok.c, w1); assert.notEqual(wc.currentId, w1);                // c không thuộc workspace → bị đưa về mặc định
    assert.ok(!wc.workspaces.some(w => w.id === w1));
    const wh = await work(ptok.head, w1);                                                 // trưởng phòng ban thấy dự án thuộc phòng mình
    assert.equal(wh.currentId, w1); assert.equal(wh.projects.find(p => p.id === p1).access, 'pm');
  });
  test('Chỉ Giám đốc tạo Workspace/phòng ban; nhân viên không tạo được dự án', async () => {
    await denied(ptok.mgr, 'saveWorkspace', { workspace: { id: 'wsX', name: 'X' } }, /Giám đốc/);
    await denied(ptok.mgr, 'saveDepartment', { department: { id: 'dX', workspaceId: w1, name: 'X' } }, /Giám đốc/);
    await denied(ptok.a, 'saveProject', { project: { id: 'pX', workspaceId: w1, name: 'X' } }, /Giám đốc|Quản lý/);
    await denied(ptok.mgr2, 'saveProject', { project: { id: 'pY', workspaceId: w1, name: 'Y' } }, /Workspace/);   // chưa thuộc workspace
    await denied(ptok.mgr2, 'saveProject', { project: { id: p1, workspaceId: w1, name: 'Chiếm dự án' } }, /quản lý dự án|Giám đốc/);
  });

  const T = (extra) => ({ id: nid('t'), projectId: p1, title: 'Việc ' + seqId, ...extra });
  test('Thuộc tính đầy đủ: nhiều người làm, nhãn, việc con, ưu tiên, hạn', async () => {
    const t = T({ title: 'Thiết kế trang chủ', description: 'Mô tả dài', priority: 'urgent', status: 'doing', due: plusDays(5), assigneeIds: [a, b], tags: ['ui', 'ui', ' gấp '],
      subtasks: [{ text: 'Wireframe', done: true }, { text: 'Mockup' }, { text: '  ' }] });
    await call(ptok.mgr, 'saveTask', { task: t });
    const got = (await work(ptok.mgr, w1)).tasks.find(x => x.id === t.id);
    assert.equal(got.priority, 'urgent'); assert.equal(got.status, 'doing'); assert.deepEqual(got.assigneeIds, [a, b]);
    assert.deepEqual(got.tags, ['ui', 'gấp']); assert.equal(got.subtasks.length, 2); assert.equal(got.subtasks[0].done, true);
    assert.equal(got.createdBy, mgr);
    // b (ngoài danh sách thành viên ban đầu) được tự thêm vào dự án và thấy việc của mình
    const wb = await work(ptok.b, w1); assert.ok(wb.tasks.some(x => x.id === t.id));
    // sửa: bỏ b, đổi ưu tiên, tick việc con
    await call(ptok.mgr, 'saveTask', { task: { ...t, priority: 'low', assigneeIds: [a], subtasks: [{ id: got.subtasks[0].id, text: 'Wireframe', done: true }, { id: got.subtasks[1].id, text: 'Mockup', done: true }] } });
    const after = (await work(ptok.mgr, w1)).tasks.find(x => x.id === t.id);
    assert.deepEqual(after.assigneeIds, [a]); assert.equal(after.priority, 'low'); assert.ok(after.subtasks.every(s => s.done));
    assert.ok(!(await work(ptok.b, w1)).tasks.some(x => x.id === t.id), 'b không còn thấy việc đã bị gỡ');
  });
  test('Nhân viên chỉ thấy việc của mình; cấp trên thấy việc cấp dưới; giao việc đúng phạm vi', async () => {
    const mine = T({ assigneeIds: [a] }), others = T({ assigneeIds: [b] });
    await call(ptok.mgr, 'saveTask', { task: mine }); await call(ptok.mgr, 'saveTask', { task: others });
    const wa = await work(ptok.a, w1);
    assert.ok(wa.tasks.some(x => x.id === mine.id)); assert.ok(!wa.tasks.some(x => x.id === others.id), 'a không được thấy việc của b');
    const wm = await work(ptok.mgr, w1); assert.ok(wm.tasks.some(x => x.id === mine.id) && wm.tasks.some(x => x.id === others.id));
    // a tự tạo việc cho mình: được; giao cho b (ngang cấp): không
    await call(ptok.a, 'saveTask', { task: T({ assigneeIds: [a] }) });
    await denied(ptok.a, 'saveTask', { task: T({ assigneeIds: [b] }) }, /cấp dưới|phạm vi/);
    // a không sửa/xoá/di chuyển việc của b
    await denied(ptok.a, 'moveTask', { id: others.id, status: 'done' });
    await denied(ptok.a, 'deleteTask', { id: others.id });
    await denied(ptok.a, 'saveTask', { task: { ...others, title: 'Đổi tên' } });
    // quản lý khác nhánh (mgr2/c) không thể giao cho a
    await denied(ptok.mgr2, 'saveTask', { task: T({ assigneeIds: [a] }) });
    // người ngoài dự án không tạo việc trong dự án
    await denied(ptok.c, 'saveTask', { task: T({ assigneeIds: [c2] }) }, /chưa tham gia/);
  });
  test('Giám đốc thấy tất cả; cờ "mọi thành viên xem hết việc" mở rộng phạm vi', async () => {
    const t = T({ assigneeIds: [b] }); await call(ptok.mgr, 'saveTask', { task: t });
    assert.ok(!(await work(ptok.a, w1)).tasks.some(x => x.id === t.id));
    await call(ptok.mgr, 'saveProject', { project: { id: p1, workspaceId: w1, departmentId: d1, name: 'Website', memberIds: [a, b], shareAll: true } });
    const wa = await work(ptok.a, w1); assert.ok(wa.tasks.some(x => x.id === t.id), 'bật shareAll → a thấy');
    await denied(ptok.a, 'moveTask', { id: t.id, status: 'done' });                    // nhưng chỉ đọc
    await call(ptok.mgr, 'saveProject', { project: { id: p1, workspaceId: w1, departmentId: d1, name: 'Website', memberIds: [a, b], shareAll: false } });
    assert.ok((await work(dir, w1)).tasks.some(x => x.id === t.id));
  });
  test('Kanban: đổi cột + sắp xếp vị trí', async () => {
    const ids = []; for (let i = 0; i < 3; i++) { const t = T({ title: 'K' + i, assigneeIds: [a], status: 'todo' }); ids.push(t.id); await call(ptok.mgr, 'saveTask', { task: t }); }
    await call(ptok.a, 'moveTask', { id: ids[2], status: 'todo', beforeId: ids[0] });             // đưa K2 lên trước K0
    let col = (await work(ptok.a, w1)).tasks.filter(x => ids.includes(x.id) && x.status === 'todo').map(x => x.id);
    assert.deepEqual(col, [ids[2], ids[0], ids[1]]);
    await call(ptok.a, 'moveTask', { id: ids[0], status: 'review' });                              // sang cột Review (4 trạng thái)
    const t0 = (await work(ptok.a, w1)).tasks.find(x => x.id === ids[0]); assert.equal(t0.status, 'review');
    await call(ptok.a, 'moveTask', { id: ids[0], status: 'done' }); assert.ok((await work(ptok.a, w1)).tasks.find(x => x.id === ids[0]).completedAt);
    await call(ptok.a, 'moveTask', { id: ids[0], status: 'doing' }); assert.equal((await work(ptok.a, w1)).tasks.find(x => x.id === ids[0]).completedAt, '');
    await denied(ptok.a, 'moveTask', { id: ids[1], status: 'blocked' }, /Trạng thái/);
    assert.equal((await work(ptok.a, w1)).tasks.find(x => x.id === ids[1]).status, 'todo', 'trạng thái lạ không làm đổi dữ liệu');
  });

  test('Việc lặp lại theo tuần: Done → tự sinh việc kế tiếp, chỉ một lần', async () => {
    const today = todayISO();
    const wd = ((new Date(today + 'T00:00:00Z').getUTCDay()) || 7);
    const other = wd === 1 ? 3 : 1;                                                                     // thứ khác hôm nay
    const t = T({ title: 'Họp giao ban', assigneeIds: [a, b], priority: 'high', tags: ['họp'], due: today, status: 'doing',
      subtasks: [{ id: 'sub1', text: 'Chuẩn bị', done: true }], recurrence: { type: 'weekly', weekdays: [wd, other] } });
    await call(ptok.mgr, 'saveTask', { task: t });
    const r = await call(ptok.a, 'moveTask', { id: t.id, status: 'done' });
    assert.ok(r.result && r.result.spawned, 'phải báo việc mới');
    const all = (await work(ptok.mgr, w1)).tasks;
    const next = all.find(x => x.id === r.result.spawned.id);
    assert.ok(next, 'việc mới tồn tại');
    assert.equal(next.status, 'todo'); assert.equal(next.title, 'Họp giao ban'); assert.deepEqual(next.assigneeIds, [a, b]);
    assert.equal(next.priority, 'high'); assert.deepEqual(next.tags, ['họp']); assert.equal(next.createdBy, mgr);
    assert.equal(next.subtasks[0].done, false, 'việc con được đặt lại');
    assert.deepEqual(next.recurrence.weekdays.sort(), [wd, other].sort());
    assert.ok(next.due > today, 'hạn mới nằm sau hạn cũ'); assert.ok(next.due <= plusDays(7));
    assert.equal(next.seriesId, t.id);
    // mở lại rồi làm xong lần nữa → không sinh thêm
    await call(ptok.a, 'moveTask', { id: t.id, status: 'review' });
    const r2 = await call(ptok.a, 'moveTask', { id: t.id, status: 'done' });
    assert.ok(!r2.result.spawned);
    assert.equal((await work(ptok.mgr, w1)).tasks.filter(x => x.title === 'Họp giao ban').length, 2);
    // việc mới làm xong tiếp → sinh việc thứ 3 theo chuỗi
    const r3 = await call(ptok.a, 'moveTask', { id: next.id, status: 'done' });
    assert.ok(r3.result.spawned); assert.ok(r3.result.spawned.due > next.due);
  });
  test('Việc lặp lại theo ngày/tháng và ngày kết thúc', async () => {
    const dly = T({ title: 'Báo cáo ngày', assigneeIds: [a], due: todayISO(), recurrence: { type: 'daily' } });
    await call(ptok.mgr, 'saveTask', { task: dly });
    const r = await call(ptok.a, 'updateTask', { id: dly.id, patch: { status: 'done' } });        // đường cũ (báo cáo tuần) cũng kích hoạt
    assert.equal(r.result.spawned.due, plusDays(1));
    const mth = T({ title: 'Chốt công nợ', assigneeIds: [a], due: todayISO(), recurrence: { type: 'monthly', monthDay: 31 } });
    await call(ptok.mgr, 'saveTask', { task: mth });
    const r2 = await call(ptok.a, 'moveTask', { id: mth.id, status: 'done' });
    assert.match(r2.result.spawned.due, /^\d{4}-\d{2}-(28|29|30|31)$/);
    const fin = T({ title: 'Lặp có hạn', assigneeIds: [a], due: todayISO(), recurrence: { type: 'daily', end: todayISO() } });
    await call(ptok.mgr, 'saveTask', { task: fin });
    const r3 = await call(ptok.a, 'moveTask', { id: fin.id, status: 'done' });
    assert.ok(!r3.result.spawned, 'quá ngày kết thúc thì dừng');
    await denied(ptok.mgr, 'saveTask', { task: T({ due: plusDays(5), recurrence: { type: 'daily', end: plusDays(1) } }) }, /kết thúc/);
  });

  test('Bình luận có @nhắc tên, đúng phạm vi người xem', async () => {
    const t = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t });
    const cm = nid('c');
    await call(ptok.a, 'addTaskComment', { comment: { id: cm, taskId: t.id, text: '@Tên mgr xem giúp mình', mentions: [mgr, 'khong-co', mgr] } });
    const d = await detail(ptok.mgr, t.id);
    assert.equal(d.comments.length, 1); assert.deepEqual(d.comments[0].mentions, [mgr]); assert.equal(d.comments[0].authorId, a); assert.ok(d.comments[0].createdAt);
    assert.equal((await work(ptok.mgr, w1)).tasks.find(x => x.id === t.id).commentCount, 1);
    assert.equal((await detail(ptok.b, t.id)).ok, false, 'b không xem được chi tiết việc của a');
    await denied(ptok.b, 'addTaskComment', { comment: { id: nid('c'), taskId: t.id, text: 'chen ngang' } });
    await denied(ptok.mgr, 'deleteTaskComment', { id: cm }, /người viết/);
    await call(ptok.a, 'deleteTaskComment', { id: cm });
    assert.equal((await detail(ptok.a, t.id)).comments.length, 0);
  });

  test('Tệp đính kèm: tải lên, xem, phân quyền, xoá', async () => {
    const t = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const up = (token, name, body = png) => fetch(BASE + 'upload?taskId=' + t.id + '&name=' + encodeURIComponent(name), { method: 'POST', headers: { 'x-okr-token': token, 'Content-Type': 'application/octet-stream' }, body }).then(r => r.json());
    const ok = await up(ptok.a, 'ảnh chụp.png'); assert.equal(ok.ok, true, ok.error); assert.equal(ok.attachment.size, png.length);
    assert.equal((await up(ptok.a, 'virus.exe')).ok, false);
    assert.equal((await up(ptok.a, 'trang.html')).ok, false);
    assert.equal((await up(ptok.b, 'x.png')).ok, false, 'b không có quyền');
    assert.equal((await up('bad-token', 'x.png')).ok, false);
    assert.equal((await up(ptok.a, 'rong.png', Buffer.alloc(0))).ok, false);
    const list = (await detail(ptok.mgr, t.id)).attachments; assert.equal(list.length, 1); assert.equal(list[0].name, 'ảnh chụp.png');
    assert.equal((await work(ptok.mgr, w1)).tasks.find(x => x.id === t.id).attachCount, 1);
    const dl = await fetch(BASE + 'file/' + ok.attachment.id + '?token=' + encodeURIComponent(ptok.mgr));
    assert.equal(dl.status, 200); assert.equal(dl.headers.get('content-type'), 'image/png'); assert.match(dl.headers.get('content-disposition'), /^inline/);
    assert.deepEqual(Buffer.from(await dl.arrayBuffer()), png);
    const bad = await (await fetch(BASE + 'file/' + ok.attachment.id + '?token=' + encodeURIComponent(ptok.b))).json(); assert.equal(bad.ok, false);
    const pdf = await up(ptok.a, 'hop-dong.pdf', Buffer.from('%PDF-1.4 test')); assert.equal(pdf.ok, true);
    const dl2 = await fetch(BASE + 'file/' + pdf.attachment.id + '?token=' + encodeURIComponent(ptok.a)); assert.equal(dl2.headers.get('content-type'), 'application/pdf');
    const docx = await up(ptok.a, 'bao cao.docx', Buffer.from('PK test')); assert.equal(docx.ok, true);
    const dl3 = await fetch(BASE + 'file/' + docx.attachment.id + '?token=' + encodeURIComponent(ptok.a)); assert.match(dl3.headers.get('content-disposition'), /^attachment/);
    await denied(ptok.b, 'deleteAttachment', { id: ok.attachment.id });
    await call(ptok.a, 'deleteAttachment', { id: ok.attachment.id });
    assert.ok(!fs.existsSync(path.join(UP, t.id, ok.attachment.id)), 'tệp đã bị xoá khỏi đĩa');
    await call(ptok.mgr, 'deleteTask', { id: t.id });
    assert.ok(!fs.existsSync(path.join(UP, t.id)), 'xoá việc → xoá thư mục tệp');
  });
  test('Giới hạn dung lượng tệp', async () => {
    const t = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t });
    const r = await fetch(BASE + 'upload?taskId=' + t.id + '&name=lon.zip', { method: 'POST', headers: { 'x-okr-token': ptok.a }, body: Buffer.alloc(21 * 1024 * 1024) }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
    assert.equal(r.ok, false);
    assert.deepEqual(fs.existsSync(path.join(UP, t.id)) ? fs.readdirSync(path.join(UP, t.id)) : [], [], 'không để lại tệp dở dang');
  });

  test('Dự án: lưu trữ, xoá, ràng buộc', async () => {
    const t = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t });
    await denied(ptok.mgr, 'deleteProject', { id: p1 }, /công việc/);
    await denied(dir, 'deleteProject', { id: 'p_general' }, /mặc định/);
    await denied(dir, 'deleteWorkspace', { id: w1 }, /dự án/);
    await denied(dir, 'deleteDepartment', { id: d1 }, /dự án/);
    await call(dir, 'saveProject', { project: { id: 'prjTmp', workspaceId: w1, name: 'Tạm', managerId: mgr } });
    await call(ptok.mgr, 'deleteProject', { id: 'prjTmp' });
    await call(ptok.mgr, 'saveProject', { project: { id: 'prjOld', workspaceId: w1, name: 'Dự án cũ', archived: false } });
    await call(ptok.mgr, 'saveProject', { project: { id: 'prjOld', workspaceId: w1, name: 'Dự án cũ', archived: true } });
    await denied(ptok.mgr, 'saveTask', { task: { id: nid('t'), projectId: 'prjOld', title: 'Không thêm được' } }, /lưu trữ/);
  });
  test('Dự án mặc định: việc từ báo cáo tuần vẫn hiện, nhân viên chuyển trạng thái được', async () => {
    const wa = await work(ptok.a, 'w_default');
    assert.equal(wa.currentId, 'w_default'); assert.ok(wa.projects.some(p => p.id === 'p_general'));
    const t = nid('t');
    await call(ptok.a, 'addTask', { task: { id: t, title: 'Việc thủ công (form cũ)', assigneeId: a, due: plusDays(2) } });
    const got = (await work(ptok.a, 'w_default')).tasks.find(x => x.id === t);
    assert.equal(got.projectId, 'p_general'); assert.deepEqual(got.assigneeIds, [a]);
    await call(ptok.a, 'updateTask', { id: t, patch: { status: 'done' } });
    assert.equal((await work(ptok.a, 'w_default')).tasks.find(x => x.id === t).status, 'done');
    const old = await (await fetch(BASE + '?token=' + encodeURIComponent(ptok.a))).json();      // dữ liệu cũ cho màn báo cáo tuần
    assert.ok(old.db.tasks.some(x => x.id === t));
    assert.ok(!old.db.tasks.some(x => x.projectId), 'việc của dự án khác không đi vào db cũ');
  });
  test('Không khoá được người còn việc; nhân viên bị khoá không được giao thêm', async () => {
    await call(dir, 'setUserActive', { id: b, active: false });
    await denied(ptok.mgr, 'saveTask', { task: T({ assigneeIds: [b] }) }, /khoá/);
    await call(dir, 'setUserActive', { id: b, active: true });
  });
});

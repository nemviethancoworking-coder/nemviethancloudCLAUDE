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
const { recurrence } = require('../src/work.js');       // làm sạch rich text (hàm thuần) có bài test riêng không cần DB: test/rich.test.js

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
/** Chạy 1 câu SQL trực tiếp trên CSDL kiểm thử. */
async function sqlRun(q, args) {
  const db = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
  await db.connect(); try { return await db.query(q, args); } finally { await db.end(); }
}
/** Giả lập "đã đến ngày" của việc lặp lại kế tiếp: đặt ngày hẹn = hôm nay rồi khởi động lại máy chủ (máy chủ tạo việc đến ngày khi khởi động và mỗi 5 phút). */
async function arrive(tplId) {
  const r = await sqlRun(`UPDATE recurring_tasks SET next_due=$2 WHERE id=$1 AND next_due <> ''`, [tplId, todayISO()]);
  assert.equal(r.rowCount, 1, 'mẫu phải đang hẹn ngày cho việc kế tiếp');
  await stopServer(); await startServer();
}
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

  const T = (extra) => ({ id: nid('t'), projectId: p1, title: 'Việc ' + seqId, startDate: todayISO(), ...extra });
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
  test('Nhân viên chỉ thấy việc của mình; cấp trên thấy việc cấp dưới; giao việc KHÔNG giới hạn cấp bậc', async () => {
    const mine = T({ assigneeIds: [a] }), others = T({ assigneeIds: [b] });
    await call(ptok.mgr, 'saveTask', { task: mine }); await call(ptok.mgr, 'saveTask', { task: others });
    const wa = await work(ptok.a, w1);
    assert.ok(wa.tasks.some(x => x.id === mine.id)); assert.ok(!wa.tasks.some(x => x.id === others.id), 'a không được thấy việc của b');
    const wm = await work(ptok.mgr, w1); assert.ok(wm.tasks.some(x => x.id === mine.id) && wm.tasks.some(x => x.id === others.id));
    // v9: a giao cho b (ngang cấp) và cho cấp trên (head) đều được; người giao + người nhận đều thấy
    const toB = T({ assigneeIds: [b] }), toHead = T({ assigneeIds: [head] });
    await call(ptok.a, 'saveTask', { task: toB }); await call(ptok.a, 'saveTask', { task: toHead });
    for (const [tok, id] of [[ptok.a, toB.id], [ptok.b, toB.id], [ptok.a, toHead.id], [ptok.head, toHead.id]]) assert.ok((await work(tok, w1)).tasks.some(x => x.id === id));
    assert.ok(!(await work(ptok.b, w1)).tasks.some(x => x.id === toHead.id), 'b không thấy việc a giao cho head');
    // a không sửa nội dung / xoá / di chuyển việc của b do mgr tạo
    await denied(ptok.a, 'moveTask', { id: others.id, status: 'done' });
    await denied(ptok.a, 'deleteTask', { id: others.id });
    await denied(ptok.a, 'saveTask', { task: { ...others, title: 'Đổi tên' } });
    // người chưa thuộc dự án (mgr2, c) vẫn không tạo được việc trong dự án đó
    await denied(ptok.mgr2, 'saveTask', { task: T({ assigneeIds: [a] }) }, /chưa tham gia/);
    await denied(ptok.c, 'saveTask', { task: T({ assigneeIds: [c2] }) }, /chưa tham gia/);
  });
  test('v9: sau khi tạo chỉ người tạo sửa tên/mô tả; người nhận giao lại được; xoá chỉ người giao + cấp trên', async () => {
    const t = T({ title: 'Gốc', description: 'Mô tả gốc', assigneeIds: [b], subtasks: [{ id: 'sub9', text: 'Bước 1' }] });
    await call(ptok.a, 'saveTask', { task: t });                                                   // a (nhân viên) tạo, giao cho b
    assert.equal((await detail(ptok.a, t.id)).canEditContent, true); assert.equal((await detail(ptok.b, t.id)).canEditContent, false);
    // người nhận, cấp trên, bất kỳ ai khác người tạo: không sửa được tên/mô tả/hạn/ưu tiên
    for (const tok of [ptok.b, ptok.mgr, ptok.head, dir]) await denied(tok, 'saveTask', { task: { ...t, title: 'Đổi tên', description: 'Đổi mô tả' } }, /người tạo/);
    await denied(ptok.b, 'updateTask', { id: t.id, patch: { title: 'Đổi tên' } }, /không sửa/);
    await denied(ptok.b, 'updateTask', { id: t.id, patch: { due: plusDays(9) } }, /không sửa/);
    const same = (await work(ptok.a, w1)).tasks.find(x => x.id === t.id); assert.equal(same.title, 'Gốc'); assert.equal(same.description, 'Mô tả gốc');
    // người tạo sửa được (ở "nơi tạo")
    await call(ptok.a, 'saveTask', { task: { ...t, title: 'Gốc (đã sửa)', description: 'Mô tả mới', priority: 'high', due: plusDays(4) } });
    const edited = (await work(ptok.a, w1)).tasks.find(x => x.id === t.id);
    assert.equal(edited.title, 'Gốc (đã sửa)'); assert.equal(edited.priority, 'high'); assert.equal(edited.due, plusDays(4)); assert.deepEqual(edited.assigneeIds, [b]);
    // người nhận (b) giao lại cho c2 (khác nhánh, chưa thuộc dự án) → c2 thấy, b không còn thấy, có ghi vào bình luận
    await denied(ptok.mgr2, 'reassignTask', { id: t.id, assigneeIds: [c2] });                        // người không liên quan không giao lại được
    await call(ptok.b, 'reassignTask', { id: t.id, assigneeIds: [c2] });
    assert.deepEqual((await work(ptok.c, w1)).tasks.find(x => x.id === t.id).assigneeIds, [c2]);
    assert.ok(!(await work(ptok.b, w1)).tasks.some(x => x.id === t.id)); assert.ok((await work(ptok.a, w1)).tasks.some(x => x.id === t.id), 'người giao vẫn thấy');
    assert.ok((await detail(ptok.a, t.id)).comments.some(cm => /giao lại/.test(cm.text) && cm.authorId === b));
    await denied(ptok.b, 'reassignTask', { id: t.id, assigneeIds: [a] });                            // b không còn liên quan
    await denied(ptok.c, 'reassignTask', { id: t.id, assigneeIds: [] }, /ít nhất 1/);
    // c2 (người nhận mới) giao tiếp cho a (cấp trên của họ ở nhánh khác nhau → vẫn được)
    await call(ptok.c, 'reassignTask', { id: t.id, assigneeIds: [c2, a] });
    // tick việc con: người nhận được, người ngoài không
    await call(ptok.c, 'toggleSubtask', { id: t.id, subId: 'sub9', done: true });
    assert.equal((await work(ptok.a, w1)).tasks.find(x => x.id === t.id).subtasks[0].done, true);
    assert.equal((await work(ptok.a, w1)).tasks.find(x => x.id === t.id).subtasks[0].text, 'Bước 1');
    await denied(ptok.b, 'toggleSubtask', { id: t.id, subId: 'sub9', done: false });          // b đã không còn liên quan tới việc này
    // xoá: người nhận không được; người tạo hoặc cấp trên của người tạo được
    await denied(ptok.c, 'deleteTask', { id: t.id }); await denied(ptok.mgr2, 'deleteTask', { id: t.id });
    const t2 = T({ assigneeIds: [b] }); await call(ptok.a, 'saveTask', { task: t2 });
    await denied(ptok.b, 'deleteTask', { id: t2.id });
    await call(ptok.mgr, 'deleteTask', { id: t2.id });                                                // cấp trên của người tạo
    assert.ok(!(await work(ptok.a, w1)).tasks.some(x => x.id === t2.id));
    await call(ptok.a, 'deleteTask', { id: t.id });                                                   // người tạo
    // việc giao cho người bị khoá vẫn bị chặn
    const t3 = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t3 });
    await call(ptok.mgr, 'deleteTask', { id: t3.id });
  });
  test('v11: Giám đốc & Trưởng phòng thấy tất cả; cờ share_all của dự án không còn hiệu lực', async () => {
    const t = T({ assigneeIds: [b] }); await call(ptok.mgr, 'saveTask', { task: t });
    assert.ok(!(await work(ptok.a, w1)).tasks.some(x => x.id === t.id));
    await call(ptok.mgr, 'saveProject', { project: { id: p1, workspaceId: w1, departmentId: d1, name: 'Website', memberIds: [a, b], shareAll: true } });
    assert.ok(!(await work(ptok.a, w1)).tasks.some(x => x.id === t.id), 'v11: bật shareAll cũng KHÔNG làm a thấy việc của b');
    assert.equal((await work(ptok.a, w1)).projects.find(p => p.id === p1).shareAll, undefined);
    await denied(ptok.a, 'moveTask', { id: t.id, status: 'done' });
    assert.ok((await work(dir, w1)).tasks.some(x => x.id === t.id), 'Giám đốc thấy');
    assert.ok((await work(ptok.head, w1)).tasks.some(x => x.id === t.id), 'Trưởng phòng thấy');
    assert.ok((await work(ptok.mgr, w1)).tasks.some(x => x.id === t.id), 'người tạo thấy');
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

  const REC = (extra) => ({ id: nid('r'), projectId: p1, title: 'Lặp ' + seqId, description: '', assigneeIds: [a], priority: 'medium', tags: [], subtasks: [], firstDue: todayISO(), ...extra });
  test('Việc lặp lại: tạo ở một nơi, Done → tự sinh việc kế tiếp theo mẫu, chỉ một lần; sửa mẫu không đổi việc đã sinh', async () => {
    const today = todayISO();
    const wd = ((new Date(today + 'T00:00:00Z').getUTCDay()) || 7);
    const other = wd === 1 ? 3 : 1;                                                                     // thứ khác hôm nay
    const R = REC({ title: 'Họp giao ban', description: 'Mỗi tuần', assigneeIds: [a, b], priority: 'high', tags: ['họp'], subtasks: [{ id: 'sub1', text: 'Chuẩn bị', done: true }], rule: { type: 'weekly', weekdays: [wd, other] } });
    const cr = await call(ptok.mgr, 'saveRecurring', { recurring: R });
    assert.ok(cr.result.spawned, 'tạo mẫu → có ngay việc đầu tiên');
    const first = (await work(ptok.mgr, w1)).tasks.find(x => x.id === cr.result.spawned.id);
    assert.equal(first.due, today); assert.equal(first.seriesId, R.id); assert.equal(first.createdBy, mgr); assert.deepEqual(first.assigneeIds, [a, b]);
    assert.equal(first.subtasks[0].done, false, 'việc con được đặt lại'); assert.equal(first.recurrence.type, 'weekly');
    // việc sinh từ lịch lặp: khoá nội dung kể cả với người tạo → phải sửa ở mẫu
    await denied(ptok.mgr, 'saveTask', { task: { ...first, title: 'Đổi tên' } }, /lặp lại/);
    // Done → việc kế tiếp chỉ được HẸN NGÀY, chưa xuất hiện (ngày chưa đến)
    const r = await call(ptok.a, 'moveTask', { id: first.id, status: 'done' });
    assert.ok(r.result && !r.result.spawned, 'chưa đến ngày thì chưa tạo việc mới');
    assert.ok(r.result.scheduled && r.result.scheduled.due > today && r.result.scheduled.due <= plusDays(7), 'được hẹn đúng ngày kế tiếp theo lịch');
    const w0 = await work(ptok.mgr, w1);
    assert.equal(w0.tasks.filter(x => x.title === 'Họp giao ban').length, 1, 'danh sách chưa có việc mới');
    const tplRow = w0.recurring.find(x => x.id === R.id); assert.equal(tplRow.pendingDue, r.result.scheduled.due); assert.equal(tplRow.openCount, 0);
    // mở lại rồi làm xong lần nữa → không hẹn/sinh thêm
    await call(ptok.a, 'moveTask', { id: first.id, status: 'review' });
    const again = await call(ptok.a, 'moveTask', { id: first.id, status: 'done' }); assert.ok(!again.result.spawned && !again.result.scheduled);
    // sửa mẫu khi đang chờ đến ngày: không tạo việc sớm
    const early = await call(ptok.mgr, 'saveRecurring', { recurring: { ...R, description: 'Mỗi tuần' } });
    assert.ok(!early.result.spawned, 'chưa đến ngày thì sửa mẫu cũng không tạo việc sớm');
    assert.equal((await work(ptok.mgr, w1)).tasks.filter(x => x.title === 'Họp giao ban').length, 1);
    // đến ngày → máy chủ tự tạo việc theo mẫu
    await arrive(R.id);
    const wn = await work(ptok.mgr, w1);
    const next = wn.tasks.find(x => x.seriesId === R.id && x.status !== 'done');
    assert.ok(next, 'đến ngày thì việc mới xuất hiện');
    assert.equal(next.status, 'todo'); assert.equal(next.title, 'Họp giao ban'); assert.deepEqual(next.assigneeIds, [a, b]);
    assert.equal(next.priority, 'high'); assert.deepEqual(next.tags, ['họp']); assert.equal(next.description, 'Mỗi tuần'); assert.equal(next.createdBy, mgr);
    assert.equal(next.due, today); assert.equal(next.seriesId, R.id);
    assert.equal(wn.recurring.find(x => x.id === R.id).pendingDue, '', 'hết hẹn sau khi đã tạo');
    assert.equal(wn.tasks.find(x => x.id === first.id).spawned, true);
    assert.equal(wn.tasks.filter(x => x.title === 'Họp giao ban').length, 2);
    // sửa mẫu: việc đã sinh ra giữ nguyên; việc kế tiếp lấy nội dung mới
    const up = await call(ptok.mgr, 'saveRecurring', { recurring: { ...R, title: 'Họp giao ban (mới)', assigneeIds: [a], priority: 'low' } });
    assert.ok(!up.result.spawned, 'đang có việc mở thì không sinh thêm');
    const still = (await work(ptok.mgr, w1)).tasks.find(x => x.id === next.id); assert.equal(still.title, 'Họp giao ban'); assert.deepEqual(still.assigneeIds, [a, b]);
    const r3 = await call(ptok.a, 'moveTask', { id: next.id, status: 'done' });
    assert.ok(!r3.result.spawned && r3.result.scheduled.due > today);
    await arrive(R.id);
    const n3 = (await work(ptok.mgr, w1)).tasks.find(x => x.seriesId === R.id && x.status !== 'done');
    assert.equal(n3.title, 'Họp giao ban (mới)'); assert.deepEqual(n3.assigneeIds, [a]); assert.equal(n3.priority, 'low');
    // xoá mẫu: việc đã sinh còn nguyên, nhưng làm xong thì không hẹn/sinh thêm
    await call(ptok.mgr, 'deleteRecurring', { id: R.id });
    const gone = await call(ptok.a, 'moveTask', { id: n3.id, status: 'done' }); assert.ok(!gone.result.spawned && !gone.result.scheduled);
    assert.ok((await work(ptok.mgr, w1)).tasks.some(x => x.id === n3.id));
  });
  test('Việc lặp lại: ai cũng tạo được; sửa/xoá chỉ người tạo + cấp trên; danh sách đúng người xem', async () => {
    const R = REC({ title: 'Báo cáo ngày', assigneeIds: [b], rule: { type: 'daily' } });
    const cr = await call(ptok.a, 'saveRecurring', { recurring: R });                                // a là nhân viên, giao việc lặp cho b
    assert.equal(cr.result.spawned.due, todayISO());
    assert.ok((await work(ptok.b, w1)).tasks.some(x => x.id === cr.result.spawned.id), 'người nhận thấy việc được sinh');
    await denied(ptok.b, 'saveRecurring', { recurring: { ...R, title: 'X' } }, /người tạo/);
    await denied(ptok.b, 'deleteRecurring', { id: R.id }, /người tạo/);
    await denied(ptok.mgr2, 'deleteRecurring', { id: R.id });
    const find = async tok => (await work(tok, w1)).recurring.find(x => x.id === R.id);
    const ra = await find(ptok.a), rb = await find(ptok.b), rm = await find(ptok.mgr), rh = await find(ptok.head);
    assert.equal(ra.canEdit, true); assert.equal(rb.canEdit, false); assert.equal(rm.canEdit, true); assert.equal(rh.canEdit, true);
    assert.equal(ra.nextDue, todayISO()); assert.equal(ra.openCount, 1); assert.deepEqual(rb.assigneeIds, [b]); assert.equal(ra.rule.type, 'daily');
    assert.equal(await find(ptok.mgr2), undefined, 'người không liên quan không thấy');
    await denied(ptok.a, 'saveRecurring', { recurring: REC({ rule: { type: 'weekly', weekdays: [] } }) }, /lịch lặp/);
    await denied(ptok.a, 'saveRecurring', { recurring: REC({ firstDue: plusDays(5), rule: { type: 'daily', end: plusDays(1) } }) }, /kết thúc/);
    await denied(ptok.a, 'saveRecurring', { recurring: REC({ title: '  ', rule: { type: 'daily' } }) }, /Nhập tên/);
    await call(ptok.mgr, 'saveProject', { project: { id: 'prjPriv', workspaceId: w1, name: 'Dự án riêng', memberIds: [mgr] } });
    await denied(ptok.c, 'saveRecurring', { recurring: REC({ projectId: 'prjPriv', assigneeIds: [c2], rule: { type: 'daily' } }) }, /chưa tham gia/);
    await denied(ptok.mgr, 'deleteProject', { id: p1 }, /việc lặp lại|công việc/);
    await call(ptok.mgr, 'deleteRecurring', { id: R.id });                                           // cấp trên của người tạo xoá được
    assert.equal(await find(ptok.a), undefined);
  });
  test('Việc lặp lại theo ngày/tháng và ngày kết thúc', async () => {
    const mk = async (rule) => (await call(ptok.mgr, 'saveRecurring', { recurring: REC({ rule }) })).result.spawned.id;
    const dly = await mk({ type: 'daily' });
    const r = await call(ptok.a, 'updateTask', { id: dly, patch: { status: 'done' } });               // đường cũ (báo cáo tuần) cũng kích hoạt
    assert.equal(r.result.scheduled.due, plusDays(1)); assert.ok(!r.result.spawned, 'mai mới tới hạn thì hôm nay chưa tạo');
    const mth = await mk({ type: 'monthly', monthDay: 31 });
    const r2 = await call(ptok.a, 'moveTask', { id: mth, status: 'done' });
    assert.match(r2.result.scheduled.due, /^\d{4}-\d{2}-(28|29|30|31)$/);
    const fin = await mk({ type: 'daily', end: todayISO() });
    const r3 = await call(ptok.a, 'moveTask', { id: fin, status: 'done' });
    assert.ok(!r3.result.spawned && !r3.result.scheduled, 'quá ngày kết thúc thì dừng');
  });
  test('v9: việc lặp lại cũ (chưa có mẫu) được chuyển thành mẫu khi nâng cấp máy chủ', async () => {
    const db = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
    await db.connect();
    const id = nid('tleg');
    await db.query(`INSERT INTO tasks(id,title,assignee_id,due,status,created_at,project_id,description,priority,subtasks,recurrence,created_by)
      VALUES($1,'Việc lặp kiểu cũ',$2,$3,'todo',$4,$5,'Mô tả cũ','high','[{"id":"x1","text":"Việc con","done":true}]','{"type":"daily","interval":2,"end":""}',$6)`, [id, a, todayISO(), new Date().toISOString(), p1, mgr]);
    await db.query('INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2),($1,$3)', [id, a, b]);
    await db.end();
    await stopServer(); await startServer();                                                          // khởi động lại → migrate chạy
    ptok.a = await login('a'); ptok.mgr = await login('mgr'); ptok.b = await login('b'); ptok.head = await login('head'); ptok.c = await login('c'); ptok.mgr2 = await login('mgr2'); dir = await login('admin');
    const w = await work(ptok.mgr, w1);
    const tpl = w.recurring.find(x => x.id === 'r_' + id);
    assert.ok(tpl, 'phải có mẫu'); assert.equal(tpl.title, 'Việc lặp kiểu cũ'); assert.equal(tpl.createdBy, mgr); assert.deepEqual([...tpl.assigneeIds].sort(), [a, b].sort());
    assert.equal(tpl.rule.interval, 2); assert.equal(tpl.subtasks[0].done, false); assert.equal(tpl.openCount, 1); assert.equal(tpl.canEdit, true);
    assert.equal(w.tasks.find(x => x.id === id).seriesId, 'r_' + id);
    await denied(ptok.mgr, 'saveTask', { task: { id, projectId: p1, title: 'Đổi' } }, /lặp lại/);        // việc cũ cũng bị khoá nội dung
    const r = await call(ptok.a, 'moveTask', { id, status: 'done' });                                  // vẫn tự sinh việc kế tiếp
    assert.equal(r.result.scheduled.due, plusDays(2)); assert.ok(!r.result.spawned);
    await stopServer(); await startServer();                                                          // chạy migrate lần nữa: không tạo mẫu trùng
    ptok.mgr = await login('mgr'); ptok.a = await login('a'); ptok.b = await login('b'); ptok.head = await login('head'); ptok.c = await login('c'); ptok.mgr2 = await login('mgr2'); dir = await login('admin');
    assert.equal((await work(ptok.mgr, w1)).recurring.filter(x => x.title === 'Việc lặp kiểu cũ').length, 1);
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
    const r = await fetch(BASE + 'upload?taskId=' + t.id + '&name=lon.zip', { method: 'POST', headers: { 'x-okr-token': ptok.a }, body: Buffer.alloc(11 * 1024 * 1024) }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
    assert.equal(r.ok, false);
    assert.deepEqual(fs.existsSync(path.join(UP, t.id)) ? fs.readdirSync(path.join(UP, t.id)) : [], [], 'không để lại tệp dở dang');
  });

  test('Dự án: lưu trữ, xoá, ràng buộc', async () => {
    const t = T({ assigneeIds: [a] }); await call(ptok.mgr, 'saveTask', { task: t });
    await denied(ptok.mgr, 'deleteProject', { id: p1 }, /công việc|việc lặp lại/);
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
  test('v16: thời gian hoàn thành (giờ): lưu, giữ nguyên khi không gửi, xoá, làm tròn/giới hạn; việc lặp lại chuyển sang việc sinh ra', async () => {
    const t = { id: nid('t'), projectId: p1, title: 'Việc có giờ', description: '', priority: 'medium', assigneeIds: [a], startDate: todayISO(), due: plusDays(3), tags: [], subtasks: [], estHours: 2.5 };
    await call(ptok.a, 'saveTask', { task: t });
    const get = async id => (await work(ptok.a, w1)).tasks.find(x => x.id === id);
    assert.equal((await get(t.id)).estHours, 2.5);
    const { estHours: _drop, ...noHours } = t;
    await call(ptok.a, 'saveTask', { task: { ...noHours, title: 'Đổi tên' } });                       // không gửi estHours → giữ nguyên
    assert.equal((await get(t.id)).estHours, 2.5);
    await call(ptok.a, 'saveTask', { task: { ...t, estHours: '1,25' } }); assert.equal((await get(t.id)).estHours, 1.25);
    await call(ptok.a, 'saveTask', { task: { ...t, estHours: 5000 } }); assert.equal((await get(t.id)).estHours, 1000);
    for (const bad of ['', null, 0, -3, 'abc']) { await call(ptok.a, 'saveTask', { task: { ...t, estHours: bad } }); assert.equal((await get(t.id)).estHours, null, 'giá trị ' + JSON.stringify(bad) + ' → không đặt'); }
    const none = { ...t, id: nid('t') }; delete none.estHours; await call(ptok.a, 'saveTask', { task: none }); assert.equal((await get(none.id)).estHours, null);
    // việc lặp lại: số giờ nằm trên mẫu và được chép sang việc sinh ra (cả việc đầu tiên và việc kế tiếp)
    const R = REC({ title: 'Lặp có giờ', rule: { type: 'daily' }, estHours: 3 });
    const cr = await call(ptok.mgr, 'saveRecurring', { recurring: R });
    const first = (await work(ptok.mgr, w1)).tasks.find(x => x.id === cr.result.spawned.id); assert.equal(first.estHours, 3);
    assert.equal((await work(ptok.mgr, w1)).recurring.find(x => x.id === R.id).estHours, 3);
    const { estHours: _d2, ...rNo } = R; await call(ptok.mgr, 'saveRecurring', { recurring: rNo });     // không gửi → giữ nguyên
    assert.equal((await work(ptok.mgr, w1)).recurring.find(x => x.id === R.id).estHours, 3);
    await call(ptok.a, 'moveTask', { id: first.id, status: 'done' }); await arrive(R.id);
    assert.equal((await work(ptok.mgr, w1)).tasks.find(x => x.seriesId === R.id && x.status !== 'done').estHours, 3);
    await call(ptok.mgr, 'deleteRecurring', { id: R.id });
  });

  test('v16: việc lặp lại chỉ xuất hiện khi ĐẾN NGÀY; ngày chưa tới thì khởi động lại cũng không tạo; ngày đã qua thì nhảy tới lần gần nhất', async () => {
    const R = REC({ title: 'Lặp hẹn ngày', rule: { type: 'daily' } });
    const cr = await call(ptok.mgr, 'saveRecurring', { recurring: R });
    const r = await call(ptok.a, 'moveTask', { id: cr.result.spawned.id, status: 'done' });
    assert.equal(r.result.scheduled.due, plusDays(1));
    const count = async () => (await work(ptok.mgr, w1)).tasks.filter(x => x.seriesId === R.id).length;
    assert.equal(await count(), 1, 'vừa xong việc cũ: chưa có việc mới');
    await stopServer(); await startServer();                                                          // mai mới tới: khởi động lại vẫn chưa tạo
    assert.equal(await count(), 1, 'chưa đến ngày thì chưa hiện');
    assert.equal((await work(ptok.mgr, w1)).recurring.find(x => x.id === R.id).pendingDue, plusDays(1));
    // ngày hẹn đã qua (máy chủ tắt lâu) → tạo việc ở lần gần nhất chưa qua, không tạo việc quá hạn
    await sqlRun('UPDATE recurring_tasks SET next_due=$2 WHERE id=$1', [R.id, plusDays(-4)]);
    await stopServer(); await startServer();
    const ts = (await work(ptok.mgr, w1)).tasks.filter(x => x.seriesId === R.id);
    assert.equal(ts.length, 2); assert.equal(ts.find(x => x.status !== 'done').due, todayISO());
    // mẫu có ngày kết thúc: hẹn quá ngày kết thúc thì bị xoá hẹn, không tạo
    const R2 = REC({ title: 'Lặp sắp hết', rule: { type: 'daily', end: plusDays(1) } });
    const c2r = await call(ptok.mgr, 'saveRecurring', { recurring: R2 });
    assert.equal((await call(ptok.a, 'moveTask', { id: c2r.result.spawned.id, status: 'done' })).result.scheduled.due, plusDays(1));
    await sqlRun('UPDATE recurring_tasks SET rule=$2 WHERE id=$1', [R2.id, JSON.stringify({ type: 'daily', interval: 1, end: plusDays(-1) })]);
    await sqlRun('UPDATE recurring_tasks SET next_due=$2 WHERE id=$1', [R2.id, todayISO()]);
    await stopServer(); await startServer();
    assert.equal((await work(ptok.mgr, w1)).tasks.filter(x => x.seriesId === R2.id).length, 1, 'quá ngày kết thúc thì không tạo');
    assert.equal((await work(ptok.mgr, w1)).recurring.find(x => x.id === R2.id).pendingDue, '');
    await call(ptok.mgr, 'deleteRecurring', { id: R.id }); await call(ptok.mgr, 'deleteRecurring', { id: R2.id });
  });

  test('v16: ảnh dán vào mô tả: tải lên, xem bằng token, chỉ nhận ảnh thật, mô tả giữ mã ảnh và bỏ URL lạ', async () => {
    const RT = '<!--rt-->';
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const up = (token, name, body) => fetch(BASE + 'upload-inline?name=' + encodeURIComponent(name), { method: 'POST', headers: { 'x-okr-token': token, 'Content-Type': 'application/octet-stream' }, body }).then(r => r.json());
    const ok = await up(ptok.a, 'anh-dan.png', png); assert.equal(ok.ok, true, ok.error);
    const imgId = ok.image.id; assert.match(imgId, /^i[0-9a-f]+$/); assert.equal(ok.image.mime, 'image/png');
    const view = await fetch(BASE + 'file/' + imgId + '?token=' + encodeURIComponent(ptok.b));            // người khác đã đăng nhập cũng xem được ảnh trong mô tả
    assert.equal(view.status, 200); assert.equal(view.headers.get('content-type'), 'image/png'); assert.match(view.headers.get('content-disposition'), /^inline/);
    assert.deepEqual(Buffer.from(await view.arrayBuffer()), png);
    const noTok = await (await fetch(BASE + 'file/' + imgId + '?token=')).json(); assert.equal(noTok.ok, false, 'không có token thì không xem được');
    await up(ptok.a, 'x.png', Buffer.from('<html><script>alert(1)</script></html>')).then(j => { assert.equal(j.ok, false); assert.match(j.error, /không phải ảnh/); });
    await up(ptok.a, 'x.svg', Buffer.from('<svg/>')).then(j => { assert.equal(j.ok, false); assert.match(j.error, /PNG|JPG/); });
    await up(ptok.a, 'x.html', png).then(j => assert.equal(j.ok, false));
    await up(ptok.a, 'rong.png', Buffer.alloc(0)).then(j => assert.equal(j.ok, false));
    const bad = await fetch(BASE + 'upload-inline?name=a.png', { method: 'POST', headers: { 'x-okr-token': 'sai.token.x' }, body: png }).then(r => r.json()); assert.equal(bad.ok, false);
    const big = await fetch(BASE + 'upload-inline?name=lon.png', { method: 'POST', headers: { 'x-okr-token': ptok.a }, body: Buffer.concat([png, Buffer.alloc(11 * 1024 * 1024)]) }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
    assert.equal(big.ok, false, 'ảnh 11MB bị từ chối');
    // mô tả việc: chỉ giữ mã ảnh, bỏ URL/thuộc tính lạ
    const t = { id: nid('t'), projectId: p1, title: 'Việc có ảnh', priority: 'medium', assigneeIds: [a], startDate: todayISO(), due: '', tags: [], subtasks: [],
      description: RT + 'Xem ảnh<br><img data-f="' + imgId + '" src="http://evil.example/x.png" onerror="alert(1)"><img src="http://evil.example/y.png">' };
    await call(ptok.a, 'saveTask', { task: t });
    const saved = (await work(ptok.a, w1)).tasks.find(x => x.id === t.id);
    assert.equal(saved.description, RT + 'Xem ảnh<br><img data-f="' + imgId + '">');
    // mẫu lặp lại cũng giữ ảnh và chép sang việc sinh ra
    const R = REC({ title: 'Lặp có ảnh', description: RT + '<img data-f="' + imgId + '">', rule: { type: 'daily' } });
    const cr = await call(ptok.mgr, 'saveRecurring', { recurring: R });
    assert.equal((await work(ptok.mgr, w1)).tasks.find(x => x.id === cr.result.spawned.id).description, RT + '<img data-f="' + imgId + '">');
    await call(ptok.mgr, 'deleteRecurring', { id: R.id });
  });

});

describe('v11: người theo dõi, quyền xem/sửa/xoá việc, rich text', () => {
  const tk = {}, id = {};
  const WS = 'wsV11', PRJ = 'prjV11';
  const sorted = a => [...a].sort();
  const taskIn = async (who, tid, ws = WS) => (await work(tk[who], ws)).tasks.find(x => x.id === tid);
  const vis = async (who, tid) => !!(await taskIn(who, tid));
  const legacy = async who => (await (await fetch(BASE + '?token=' + encodeURIComponent(tk[who]))).json()).db;
  const TT = extra => ({ id: nid('t'), projectId: PRJ, title: 'Việc v11 ' + seqId, startDate: todayISO(), ...extra });
  const up = (who, taskId, name, body) => fetch(BASE + 'upload?taskId=' + taskId + '&name=' + encodeURIComponent(name), { method: 'POST', headers: { 'x-okr-token': tk[who] }, body }).then(r => r.json());
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  const RT = '<!--rt-->';
  let pg;
  before(async () => {
    try { cli('create-director', 'admin', 'secret1', 'Giám đốc'); } catch (e) { /* đã có */ }
    await startServer();
    tk.admin = await login('admin'); id.admin = (await work(tk.admin)).viewerId;
    const mk = async (key, role, managerId) => {
      id[key] = 'v11_' + key;
      await call(tk.admin, 'saveUser', { user: { id: id[key], username: 'v11' + key, password: 'secret1', name: 'V11 ' + key, role, managerId: managerId || '' } });
      tk[key] = await login('v11' + key);
    };
    await mk('head1', 'head', id.admin); await mk('head2', 'head', id.admin);
    await mk('mgrA', 'manager', id.head1); await mk('mgrB', 'manager', id.head2);
    await mk('ea1', 'employee', id.mgrA); await mk('ea2', 'employee', id.mgrA);
    await mk('eb1', 'employee', id.mgrB); await mk('es', 'employee', id.mgrB);
    await call(tk.admin, 'saveWorkspace', { workspace: { id: WS, name: 'V11', open: false, memberIds: [id.mgrA] } });
    await call(tk.mgrA, 'saveProject', { project: { id: PRJ, workspaceId: WS, name: 'Dự án đóng V11', memberIds: [] } });
    pg = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
    await pg.connect();
  });
  after(async () => { await pg.end(); await stopServer(); });

  test('ma trận XEM: Giám đốc, Trưởng phòng (kể cả phòng khác), Quản lý trong/ngoài chuỗi, Nhân viên tạo/nhận/theo dõi/người lạ', async () => {
    const ALL = ['admin', 'head1', 'head2', 'mgrA', 'mgrB', 'ea1', 'ea2', 'eb1', 'es'];
    const check = async (tid, yes) => {
      for (const w of ALL) {
        const should = yes.includes(w);
        assert.equal(await vis(w, tid), should, w + (should ? ' phải thấy ' : ' KHÔNG được thấy ') + tid);
        assert.equal((await detail(tk[w], tid)).ok, should, 'chi tiết của ' + w);
      }
    };
    // tA: mgrA tạo, ea1 làm, eb1 theo dõi → mgrB (cấp trên của người theo dõi) KHÔNG thấy
    const tA = TT({ assigneeIds: [id.ea1], followerIds: [id.eb1] }); await call(tk.mgrA, 'saveTask', { task: tA });
    await check(tA.id, ['admin', 'head1', 'head2', 'mgrA', 'ea1', 'eb1']);
    // tC: nhân viên ea1 tạo, giao ea2 → cấp trên trực tiếp (mgrA) thấy; mgrB và nhân viên ngoài thì không
    const tC = TT({ assigneeIds: [id.ea2] }); await call(tk.ea1, 'saveTask', { task: tC });
    await check(tC.id, ['admin', 'head1', 'head2', 'mgrA', 'ea1', 'ea2']);
    // tD: Trưởng phòng head1 tạo, giao mgrB → mgrA (không ở trên head1 hay mgrB) không thấy; head2 thấy dù khác phòng
    const tD = TT({ assigneeIds: [id.mgrB] }); await call(tk.head1, 'saveTask', { task: tD });
    await check(tD.id, ['admin', 'head1', 'head2', 'mgrB']);
    // tE: Giám đốc tạo, giao head1 → quản lý / nhân viên không thấy
    const tE = TT({ assigneeIds: [id.head1] }); await call(tk.admin, 'saveTask', { task: tE });
    await check(tE.id, ['admin', 'head1', 'head2']);
    // tF: head1 giao nhân viên ea1 → mgrA (cấp trên của người nhận) thấy
    const tF = TT({ assigneeIds: [id.ea1] }); await call(tk.head1, 'saveTask', { task: tF });
    await check(tF.id, ['admin', 'head1', 'head2', 'mgrA', 'ea1']);
    // Trưởng phòng thấy cả dự án đóng mà mình không là thành viên
    const wh = await work(tk.head2, WS); assert.equal(wh.currentId, WS); assert.equal(wh.projects.find(p => p.id === PRJ).access, 'pm');
    assert.ok((await work(tk.head2)).workspaces.some(w => w.id === WS), 'danh sách workspace có đủ cho Trưởng phòng');
    assert.equal((await work(tk.admin, WS)).projects.find(p => p.id === PRJ).access, 'admin');
    // người lạ không bình luận được
    await denied(tk.es, 'addTaskComment', { comment: { id: nid('c'), taskId: tA.id, text: 'chen ngang' } });
    // ensureMember: người theo dõi / người nhận thuộc phòng khác tự thấy dự án đóng
    assert.ok((await work(tk.eb1, WS)).projects.some(p => p.id === PRJ), 'người theo dõi thấy dự án đóng');
    assert.ok((await work(tk.mgrB, WS)).projects.some(p => p.id === PRJ), 'Quản lý được giao việc thấy dự án đóng');
  });

  test('đường cũ db.tasks (màn báo cáo tuần) lọc cùng quy tắc xem và có followerIds', async () => {
    const mkL = async (who, extra) => { const t = { id: nid('tl'), projectId: 'p_general', title: 'L ' + seqId, startDate: todayISO(), ...extra }; await call(tk[who], 'saveTask', { task: t }); return t.id; };
    const l1 = await mkL('mgrA', { assigneeIds: [id.ea1], followerIds: [id.eb1] });
    const l2 = await mkL('mgrB', { assigneeIds: [id.eb1] });
    const l3 = await mkL('ea2', { assigneeIds: [id.ea2] });
    const mine = [l1, l2, l3];
    const want = { admin: [l1, l2, l3], head1: [l1, l2, l3], head2: [l1, l2, l3], mgrA: [l1, l3], mgrB: [l2], ea1: [l1], ea2: [l3], eb1: [l1, l2], es: [] };
    for (const [who, ids] of Object.entries(want)) {
      const got = (await legacy(who)).tasks.filter(x => mine.includes(x.id)).map(x => x.id);
      assert.deepEqual(sorted(got), sorted(ids), 'db.tasks của ' + who);
    }
    const row = (await legacy('ea1')).tasks.find(x => x.id === l1);
    assert.deepEqual(row.followerIds, [id.eb1]); assert.equal(row.assigneeId, id.ea1);
    assert.deepEqual(sorted((await work(tk.mgrA, 'w_default')).tasks.filter(x => mine.includes(x.id)).map(x => x.id)), sorted([l1, l3]), 'màn Công việc cùng kết quả');
  });

  test('người theo dõi: xem + bình luận + tải tệp; KHÔNG sửa / đổi trạng thái / tick / giao lại / tải lên / xoá / đổi người theo dõi', async () => {
    const t = TT({ assigneeIds: [id.ea1], followerIds: [id.eb1], subtasks: [{ id: 'vs1', text: 'Bước' }] });
    await call(tk.mgrA, 'saveTask', { task: t });
    const f = await up('ea1', t.id, 'anh.png', png); assert.equal(f.ok, true, f.error);
    const dF = await detail(tk.eb1, t.id);
    assert.equal(dF.canEdit, false); assert.equal(dF.canDelete, false); assert.equal(dF.canFollow, false); assert.equal(dF.canEditContent, false);
    assert.deepEqual(dF.followerIds, [id.eb1]); assert.equal(dF.attachments.length, 1);
    const flags = async w => { const d = await detail(tk[w], t.id); return [d.canEdit, d.canDelete, d.canFollow]; };
    assert.deepEqual(await flags('ea1'), [true, false, true]);       // người nhận: sửa + giao lại + theo dõi, không xoá
    assert.deepEqual(await flags('mgrA'), [true, true, true]);       // người tạo
    assert.deepEqual(await flags('admin'), [true, true, true]);
    assert.deepEqual(await flags('head2'), [true, false, false]);    // Trưởng phòng: sửa được, KHÔNG xoá / không đổi người theo dõi
    assert.deepEqual(await flags('head1'), [true, true, false]);     // head1 là cấp trên của người tạo → xoá được
    // bình luận
    const cm = nid('c');
    await call(tk.eb1, 'addTaskComment', { comment: { id: cm, taskId: t.id, text: 'Mình theo dõi nhé', mentions: [id.ea1] } });
    assert.ok((await detail(tk.ea1, t.id)).comments.some(x => x.id === cm && x.authorId === id.eb1));
    assert.equal((await taskIn('eb1', t.id)).commentCount, 1);
    await denied(tk.ea1, 'deleteTaskComment', { id: cm }, /người viết/);
    await call(tk.eb1, 'deleteTaskComment', { id: cm });
    // tải tệp
    const dl = await fetch(BASE + 'file/' + f.attachment.id + '?token=' + encodeURIComponent(tk.eb1)); assert.equal(dl.status, 200);
    assert.deepEqual(Buffer.from(await dl.arrayBuffer()), png);
    assert.equal((await (await fetch(BASE + 'file/' + f.attachment.id + '?token=' + encodeURIComponent(tk.es))).json()).ok, false);
    // bị từ chối
    await denied(tk.eb1, 'moveTask', { id: t.id, status: 'doing' }, /theo dõi/);
    await denied(tk.eb1, 'updateTask', { id: t.id, patch: { status: 'done' } }, /theo dõi/);
    await denied(tk.eb1, 'toggleSubtask', { id: t.id, subId: 'vs1', done: true }, /theo dõi/);
    await denied(tk.eb1, 'reassignTask', { id: t.id, assigneeIds: [id.eb1] }, /theo dõi/);
    await denied(tk.eb1, 'saveTask', { task: { ...t, title: 'Đổi tên' } }, /người tạo/);
    await denied(tk.eb1, 'deleteTask', { id: t.id });
    await denied(tk.eb1, 'setFollowers', { id: t.id, followerIds: [] }, /Chỉ người tạo/);
    await denied(tk.eb1, 'deleteAttachment', { id: f.attachment.id });
    const u2 = await up('eb1', t.id, 'them.png', png); assert.equal(u2.ok, false); assert.match(u2.error, /theo dõi/);
    const after = await taskIn('mgrA', t.id);
    assert.equal(after.status, 'todo'); assert.equal(after.title, t.title); assert.equal(after.subtasks[0].done, false); assert.deepEqual(after.assigneeIds, [id.ea1]); assert.equal(after.attachCount, 1);
    // quyền SỬA: Trưởng phòng (kể cả phòng khác), người nhận, người tạo được; Quản lý ngoài chuỗi và người lạ thì không
    await call(tk.head2, 'moveTask', { id: t.id, status: 'doing' });
    await denied(tk.mgrB, 'moveTask', { id: t.id, status: 'done' }); await denied(tk.es, 'moveTask', { id: t.id, status: 'done' });
    await call(tk.mgrA, 'moveTask', { id: t.id, status: 'review' }); await call(tk.ea1, 'toggleSubtask', { id: t.id, subId: 'vs1', done: true });
    await call(tk.ea1, 'moveTask', { id: t.id, status: 'todo' });
  });

  test('setFollowers: ai được / không được, loại người nhận, nhắc tên, dự án đóng, khoá tài khoản', async () => {
    const t = TT({ assigneeIds: [id.ea1] }); await call(tk.mgrA, 'saveTask', { task: t });
    assert.ok(!(await vis('es', t.id)));
    await denied(tk.es, 'setFollowers', { id: t.id, followerIds: [id.es] }, /Không tìm thấy/);          // người lạ
    await denied(tk.mgrB, 'setFollowers', { id: t.id, followerIds: [id.es] }, /Không tìm thấy/);
    await denied(tk.head1, 'setFollowers', { id: t.id, followerIds: [id.es] }, /Chỉ người tạo/);          // thấy nhưng không phải người tạo/nhận/Giám đốc
    await denied(tk.ea1, 'setFollowers', { id: t.id, followerIds: ['khong-co'] }, /không tồn tại/);
    // người nhận đặt: chính mình (người nhận) bị lọc, trùng bị bỏ
    await call(tk.ea1, 'setFollowers', { id: t.id, followerIds: [id.eb1, id.ea2, id.ea1, id.eb1] });
    let d = await detail(tk.ea1, t.id); assert.deepEqual(sorted(d.followerIds), sorted([id.eb1, id.ea2]));
    const last = d.comments[d.comments.length - 1];
    assert.match(last.text, /^Đã cập nhật người theo dõi: \(không có\) → /); assert.equal(last.authorId, id.ea1);
    assert.match(last.text, /V11 eb1/); assert.deepEqual(sorted(last.mentions), sorted([id.eb1, id.ea2]));
    assert.ok(await vis('eb1', t.id), 'người theo dõi mới thuộc phòng khác thấy việc'); assert.ok(await vis('ea2', t.id));
    // không đổi gì → không thêm bình luận
    const n = d.comments.length;
    await call(tk.ea1, 'setFollowers', { id: t.id, followerIds: [id.ea2, id.eb1] });
    assert.equal((await detail(tk.ea1, t.id)).comments.length, n);
    // người tạo + Giám đốc đặt được; thêm es (dự án đóng → tự vào dự án)
    await call(tk.mgrA, 'setFollowers', { id: t.id, followerIds: [id.eb1, id.es] });
    assert.deepEqual(sorted((await detail(tk.mgrA, t.id)).followerIds), sorted([id.eb1, id.es]));
    assert.ok(await vis('es', t.id)); assert.ok((await work(tk.es, WS)).projects.some(p => p.id === PRJ));
    assert.ok(!(await vis('ea2', t.id)), 'ea2 bị gỡ khỏi người theo dõi thì không thấy nữa');
    await call(tk.admin, 'setFollowers', { id: t.id, followerIds: [] });
    d = await detail(tk.mgrA, t.id); assert.deepEqual(d.followerIds, []); assert.match(d.comments[d.comments.length - 1].text, /→ \(không có\)$/);
    assert.ok(!(await vis('es', t.id)));
    // tài khoản đã khoá không thêm mới được
    await call(tk.admin, 'setUserActive', { id: id.es, active: false });
    await denied(tk.mgrA, 'setFollowers', { id: t.id, followerIds: [id.es] }, /khoá/);
    await call(tk.admin, 'setUserActive', { id: id.es, active: true });
    // giao lại cho người đang theo dõi → họ thành người thực hiện và tự rời danh sách theo dõi
    await call(tk.mgrA, 'setFollowers', { id: t.id, followerIds: [id.eb1, id.ea2] });
    await call(tk.ea1, 'reassignTask', { id: t.id, assigneeIds: [id.ea1, id.ea2] });
    assert.deepEqual((await detail(tk.ea1, t.id)).followerIds, [id.eb1]);
    assert.deepEqual((await taskIn('ea1', t.id)).followerIds, [id.eb1]);
  });

  test('followers qua saveTask (tạo / sửa / không gửi thì giữ) và việc cũ không người tạo', async () => {
    const t = TT({ assigneeIds: [id.ea1], followerIds: [id.eb1, id.ea1, id.eb1] });
    await call(tk.mgrA, 'saveTask', { task: t });
    assert.deepEqual((await taskIn('mgrA', t.id)).followerIds, [id.eb1], 'người nhận & trùng bị loại');
    await call(tk.mgrA, 'saveTask', { task: { ...t, title: 'Sửa lần 1', followerIds: [id.ea2] } });
    assert.deepEqual((await taskIn('mgrA', t.id)).followerIds, [id.ea2]);
    const { followerIds: _f, ...base } = t;
    await call(tk.mgrA, 'saveTask', { task: { ...base, title: 'Sửa lần 2' } });                    // không gửi followerIds → giữ nguyên
    assert.deepEqual((await taskIn('mgrA', t.id)).followerIds, [id.ea2]);
    await call(tk.mgrA, 'saveTask', { task: { ...t, title: 'Sửa lần 3', assigneeIds: [id.ea2], followerIds: [id.ea2, id.eb1] } });   // người nhận mới không thể đồng thời là người theo dõi
    assert.deepEqual((await taskIn('mgrA', t.id)).followerIds, [id.eb1]);
    await denied(tk.ea2, 'saveTask', { task: { ...t, followerIds: [] } }, /người tạo/);              // chỉ người tạo sửa qua saveTask; người nhận dùng setFollowers
    await call(tk.admin, 'setUserActive', { id: id.es, active: false });
    await denied(tk.mgrA, 'saveTask', { task: TT({ assigneeIds: [id.ea1], followerIds: [id.es] }) }, /khoá/);
    await call(tk.admin, 'setUserActive', { id: id.es, active: true });
  });

  test('quyền XOÁ: Giám đốc, người tạo, cấp trên của người tạo; Trưởng phòng ngoài chuỗi chỉ xem; việc cũ theo cấp trên của người nhận', async () => {
    const mkD = async (who, assignee, followers) => { const t = TT({ assigneeIds: [assignee], followerIds: followers || [] }); await call(tk[who], 'saveTask', { task: t }); return t.id; };
    const exists = async tid => (await detail(tk.admin, tid)).ok;
    let d = await mkD('mgrA', id.ea1, [id.eb1]);
    for (const w of ['head2', 'mgrB', 'ea1', 'eb1', 'es', 'ea2']) await denied(tk[w], 'deleteTask', { id: d }, w === 'head2' ? /không được xoá/ : undefined);
    assert.ok(await exists(d));
    await call(tk.head1, 'deleteTask', { id: d });                                                    // cấp trên (chuỗi) của người tạo
    assert.ok(!(await exists(d)));
    d = await mkD('mgrA', id.ea1); await call(tk.admin, 'deleteTask', { id: d }); assert.ok(!(await exists(d)));
    d = await mkD('mgrA', id.ea1); await call(tk.mgrA, 'deleteTask', { id: d }); assert.ok(!(await exists(d)));
    d = await mkD('ea1', id.ea2);                                                                      // nhân viên tạo, giao đồng nghiệp
    await denied(tk.ea2, 'deleteTask', { id: d }); await denied(tk.head2, 'deleteTask', { id: d });
    await call(tk.mgrA, 'deleteTask', { id: d }); assert.ok(!(await exists(d)));
    d = await mkD('ea1', id.ea2); await call(tk.ea1, 'deleteTask', { id: d }); assert.ok(!(await exists(d)));
    // việc cũ không rõ người tạo: coi như theo người nhận; cấp trên của người nhận xoá được
    d = await mkD('mgrA', id.ea1, [id.eb1]); await pg.query("UPDATE tasks SET created_by='' WHERE id=$1", [d]);
    assert.ok(await vis('ea1', d) && await vis('eb1', d) && await vis('mgrA', d) && await vis('head2', d) && !(await vis('mgrB', d)) && !(await vis('ea2', d)));
    for (const w of ['ea1', 'eb1', 'head2']) await denied(tk[w], 'deleteTask', { id: d });
    await denied(tk.ea1, 'saveTask', { task: { id: d, projectId: PRJ, title: 'x' } }, /người tạo/);
    await call(tk.mgrA, 'deleteTask', { id: d }); assert.ok(!(await exists(d)));
  });

  test('việc lặp lại: followerIds lưu trên mẫu, người theo dõi thấy mẫu, việc sinh ra copy followers', async () => {
    const R = { id: nid('r'), projectId: PRJ, title: 'Lặp v11', description: '', assigneeIds: [id.ea1], followerIds: [id.eb1, id.ea1], priority: 'medium', tags: [], subtasks: [], firstDue: todayISO(), rule: { type: 'daily' } };
    const cr = await call(tk.mgrA, 'saveRecurring', { recurring: R });
    const first = await taskIn('mgrA', cr.result.spawned.id); assert.deepEqual(first.followerIds, [id.eb1]);
    const get = async w => (await work(tk[w], WS)).recurring.find(x => x.id === R.id);
    assert.deepEqual((await get('mgrA')).followerIds, [id.eb1]);
    const rb = await get('eb1'); assert.ok(rb, 'người theo dõi thấy mẫu'); assert.equal(rb.canEdit, false);
    assert.equal(await get('es'), undefined); assert.equal(await get('mgrB'), undefined);
    await denied(tk.eb1, 'saveRecurring', { recurring: { ...R, followerIds: [] } }, /người tạo/);
    const openIn = async () => (await work(tk.mgrA, WS)).tasks.find(x => x.seriesId === R.id && x.status !== 'done');
    const r2 = await call(tk.ea1, 'moveTask', { id: first.id, status: 'done' });
    assert.ok(r2.result.scheduled && !r2.result.spawned);
    await arrive(R.id);
    const next2 = await openIn();
    assert.deepEqual(next2.followerIds, [id.eb1], 'việc kế tiếp copy người theo dõi');
    const { followerIds: _omit, ...noFollow } = R;
    await call(tk.mgrA, 'saveRecurring', { recurring: { ...noFollow, title: 'Lặp v11 (sửa)' } });     // không gửi followerIds → giữ
    assert.deepEqual((await get('mgrA')).followerIds, [id.eb1]);
    await call(tk.mgrA, 'saveRecurring', { recurring: { ...R, followerIds: [id.ea2] } });
    assert.deepEqual((await get('mgrA')).followerIds, [id.ea2]);
    await call(tk.ea1, 'moveTask', { id: next2.id, status: 'done' });
    await arrive(R.id);
    assert.deepEqual((await openIn()).followerIds, [id.ea2]);
    assert.equal(await get('eb1'), undefined, 'bỏ khỏi mẫu thì không thấy mẫu nữa');
    await call(tk.mgrA, 'deleteRecurring', { id: R.id });
  });

  test('updateReport không làm mất người theo dõi; việc từ báo cáo tuần có followers rỗng lúc đầu', async () => {
    const cyc = (await (await fetch(BASE + '?token=' + encodeURIComponent(tk.admin))).json()).db.cycles[0].id;
    await call(tk.admin, 'saveOKR', { okr: { id: 'okrV11', title: 'OKR v11', ownerId: id.admin, cycleId: cyc, krs: [{ id: 'krV11', title: 'KR', baseline: 0, target: 10, unit: 'x' }] } });
    const sol = (sid, text) => ({ id: sid, krId: 'krV11', text, due: plusDays(5) });
    const ku = sols => ({ krId: 'krV11', value: 2, work: 'làm', issues: '', causes: '', solutions: sols });
    await call(tk.admin, 'addReport', { report: { id: 'rpV11', okrId: 'okrV11', week: 45, year: 2026, createdAt: new Date().toISOString(), work: 'x', krUpdates: [ku([sol('sv1', 'Giải pháp 1'), sol('sv2', 'Giải pháp 2')])], solutions: [sol('sv1', 'Giải pháp 1'), sol('sv2', 'Giải pháp 2')] },
      tasks: [{ id: 'tv1', title: 'Giải pháp 1', due: plusDays(5), status: 'todo', solutionId: 'sv1', okrId: 'okrV11', week: 45, year: 2026 }, { id: 'tv2', title: 'Giải pháp 2', due: plusDays(5), status: 'todo', solutionId: 'sv2', okrId: 'okrV11', week: 45, year: 2026 }] });
    const w0 = await work(tk.admin, 'w_default');
    assert.deepEqual(w0.tasks.find(x => x.id === 'tv1').followerIds, []);
    assert.ok(!(await legacy('eb1')).tasks.some(x => x.id === 'tv1'));
    await call(tk.admin, 'setFollowers', { id: 'tv1', followerIds: [id.eb1] });                       // chủ báo cáo (người nhận) tự thêm
    await call(tk.admin, 'setFollowers', { id: 'tv2', followerIds: [id.eb1] });
    assert.ok((await legacy('eb1')).tasks.some(x => x.id === 'tv1'), 'người theo dõi thấy việc ở đường cũ');
    await call(tk.admin, 'moveTask', { id: 'tv1', status: 'doing' });
    await call(tk.admin, 'updateReport', { report: { id: 'rpV11', okrId: 'okrV11', krUpdates: [ku([sol('sv1', 'Giải pháp 1 (sửa)'), sol('sv3', 'Giải pháp 3')])] }, tasks: [] });
    const w1 = await work(tk.admin, 'w_default');
    const t1 = w1.tasks.find(x => x.id === 'tv1');
    assert.equal(t1.title, 'Giải pháp 1 (sửa)'); assert.equal(t1.status, 'doing'); assert.deepEqual(t1.followerIds, [id.eb1], 'followers còn nguyên sau khi đồng bộ');
    assert.ok(!w1.tasks.some(x => x.id === 'tv2'), 'giải pháp bị xoá → việc "Cần làm" bị xoá (followers theo ON DELETE CASCADE)');
    assert.equal((await pg.query("SELECT count(*)::int AS n FROM task_followers WHERE task_id='tv2'")).rows[0].n, 0);
    assert.deepEqual(w1.tasks.find(x => x.title === 'Giải pháp 3').followerIds, []);
  });

  test('rich text qua API: làm sạch ở máy chủ cho mô tả việc, bình luận, mẫu lặp, báo cáo & phản hồi; chuỗi thuần giữ nguyên', async () => {
    const dirty = RT + '<b onclick="x()">đậm</b><script>alert(1)</script><img src=x onerror=alert(1)><span style="color:red" class="c-red">đỏ</span><a href="javascript:1">l</a> &amp; &lt;b&gt;';
    const cleaned = RT + '<b>đậm</b>alert(1)<span class="c-red">đỏ</span>l &amp; &lt;b&gt;';
    // mô tả việc
    const t = TT({ assigneeIds: [id.ea1], description: dirty }); await call(tk.mgrA, 'saveTask', { task: t });
    assert.equal((await taskIn('mgrA', t.id)).description, cleaned);
    await call(tk.mgrA, 'saveTask', { task: { ...t, description: '<b>thuần</b> & <script>x</script>  ' } });
    assert.equal((await taskIn('mgrA', t.id)).description, '<b>thuần</b> & <script>x</script>  ', 'chuỗi không tiền tố giữ nguyên');
    await call(tk.mgrA, 'saveTask', { task: { ...t, description: RT + '<br> <b></b>' } });
    assert.equal((await taskIn('mgrA', t.id)).description, '', 'rich không còn chữ → rỗng');
    await denied(tk.mgrA, 'saveTask', { task: { ...t, description: RT + 'x'.repeat(20001) } }, /quá dài/);
    // bình luận
    const c1 = nid('c'); await call(tk.ea1, 'addTaskComment', { comment: { id: c1, taskId: t.id, text: dirty } });
    assert.equal((await detail(tk.ea1, t.id)).comments.find(x => x.id === c1).text, cleaned);
    const c2 = nid('c'); await call(tk.ea1, 'addTaskComment', { comment: { id: c2, taskId: t.id, text: '  chữ thuần <i>x</i>  ' } });
    assert.equal((await detail(tk.ea1, t.id)).comments.find(x => x.id === c2).text, 'chữ thuần <i>x</i>', 'chuỗi thuần: cắt khoảng trắng hai đầu như trước');
    await denied(tk.ea1, 'addTaskComment', { comment: { id: nid('c'), taskId: t.id, text: RT + '<b> </b><br>' } }, /Thiếu nội dung/);
    await denied(tk.ea1, 'addTaskComment', { comment: { id: nid('c'), taskId: t.id, text: RT + 'y'.repeat(12001) } }, /quá dài/);
    // mẫu lặp lại
    const R = { id: nid('r'), projectId: PRJ, title: 'Lặp rich', description: dirty, assigneeIds: [id.ea1], rule: { type: 'daily' }, firstDue: todayISO() };
    await call(tk.mgrA, 'saveRecurring', { recurring: R });
    assert.equal((await work(tk.mgrA, WS)).recurring.find(x => x.id === R.id).description, cleaned);
    assert.equal((await taskIn('mgrA', (await work(tk.mgrA, WS)).tasks.find(x => x.seriesId === R.id).id)).description, cleaned);
    await call(tk.mgrA, 'deleteRecurring', { id: R.id });
    // báo cáo: work / issues / causes (cả trong krUpdates) + phản hồi của báo cáo
    const sol = (sid) => ({ id: sid, krId: 'krV11', text: '<b>giữ nguyên tên</b>', due: plusDays(5) });
    const ku = { krId: 'krV11', value: 3, work: dirty, issues: RT + '<p>a</p><p>b</p>', causes: 'thuần <script>', solutions: [sol('sv9')] };
    await call(tk.admin, 'addReport', { report: { id: 'rpV11b', okrId: 'okrV11', week: 46, year: 2026, createdAt: new Date().toISOString(), work: dirty, issues: RT + '<b>i</b>', causes: 'c <b>', krUpdates: [ku], solutions: [sol('sv9')] },
      tasks: [] });
    const rep = () => legacy('admin').then(db => db.reports.find(x => x.id === 'rpV11b'));
    let r = await rep();
    assert.equal(r.work, cleaned); assert.equal(r.issues, RT + '<b>i</b>'); assert.equal(r.causes, 'c <b>');
    assert.equal(r.krUpdates[0].work, cleaned); assert.equal(r.krUpdates[0].issues, RT + 'a<br>b'); assert.equal(r.krUpdates[0].causes, 'thuần <script>');
    assert.equal(r.krUpdates[0].solutions[0].text, '<b>giữ nguyên tên</b>', 'tên giải pháp không bị làm sạch');
    await call(tk.admin, 'updateReport', { report: { id: 'rpV11b', okrId: 'okrV11', work: dirty, krUpdates: [{ ...ku, work: dirty + '<script>2</script>', issues: '', causes: '' }] }, tasks: [] });
    r = await rep(); assert.equal(r.krUpdates[0].work, cleaned + '2'); assert.equal(r.work, cleaned);
    const cc = nid('c'); await call(tk.admin, 'addComment', { comment: { id: cc, reportId: 'rpV11b', text: dirty } });
    assert.equal((await rep()).comments.find(x => x.id === cc).text, cleaned);
    await denied(tk.admin, 'addComment', { comment: { id: nid('c'), reportId: 'rpV11b', text: RT + '<br>' } }, /Thiếu nội dung/);
  });

  test('migrate chạy lại nhiều lần an toàn (bảng task_followers, cột followers) và giữ dữ liệu', async () => {
    const count = async () => (await pg.query('SELECT count(*)::int AS n FROM task_followers')).rows[0].n;
    const before = await count(); assert.ok(before > 0);
    cli('count-users'); cli('count-users');                                                            // mỗi lần chạy lệnh đều gọi migrate()
    assert.equal(await count(), before);
    const col = await pg.query("SELECT data_type FROM information_schema.columns WHERE table_name='recurring_tasks' AND column_name='followers'");
    assert.equal(col.rows[0].data_type, 'jsonb');
    const ping = await (await fetch(BASE + '?ping=1')).json(); assert.equal(ping.version, 16);
    assert.equal((await (await fetch(BASE + 'health')).json()).version, 16);
  });
});

describe('KR nguồn của việc sinh từ báo cáo tuần (v10)', () => {
  let tk, me, week = 44;
  const taskOf = async id => (await work(tk)).tasks.find(x => x.id === id);
  const sol = (id, krId, text) => ({ id, krId, text: text || 'Giải pháp ' + id, due: plusDays(5) });
  const ku = (krId, solutions) => ({ krId, value: 1, work: 'đã làm', issues: '', causes: '', solutions });
  const tsk = (id, solutionId, extra) => ({ id, title: 'Việc ' + solutionId, due: plusDays(5), status: 'todo', solutionId, okrId: 'okrKS', week, year: 2026, ...extra });
  before(async () => {
    await startServer();
    tk = await login('admin'); me = (await work(tk)).viewerId;
    const cyc = (await (await fetch(BASE + '?token=' + encodeURIComponent(tk))).json()).db.cycles[0].id;
    await call(tk, 'saveOKR', { okr: { id: 'okrKS', title: 'Mục tiêu KS', ownerId: me, cycleId: cyc, krs: [{ id: 'krKA', title: 'KR A', baseline: 0, target: 10, unit: 'x' }, { id: 'krKB', title: 'KR B', baseline: 0, target: 10, unit: 'x' }] } });
    await call(tk, 'saveOKR', { okr: { id: 'okrKX', title: 'Mục tiêu khác', ownerId: me, cycleId: cyc, krs: [{ id: 'krKX', title: 'KR của OKR khác', baseline: 0, target: 10, unit: 'x' }] } });
  });
  after(stopServer);

  test('việc sinh từ báo cáo mang KR của khối chứa giải pháp; máy chủ không tin mã KR giả', async () => {
    const s1 = sol('ks1', 'krKA'), s2 = sol('ks2', 'krKB');
    await call(tk, 'addReport', { report: { id: 'rpKS', okrId: 'okrKS', week, year: 2026, createdAt: new Date().toISOString(), work: 'x', krUpdates: [ku('krKA', [s1]), ku('krKB', [s2])], solutions: [s1, s2] },
      tasks: [tsk('tks1', 'ks1', { krId: 'krKX' }), tsk('tks2', 'ks2')] });         // tks1 cố tình gửi KR của OKR khác
    assert.equal((await taskOf('tks1')).krId, 'krKA');
    assert.equal((await taskOf('tks2')).krId, 'krKB');
    const old = await (await fetch(BASE + '?token=' + encodeURIComponent(tk))).json();   // dữ liệu cho màn báo cáo tuần cũng có krId
    assert.equal(old.db.tasks.find(x => x.id === 'tks1').krId, 'krKA');
  });
  test('việc tạo tay / việc lặp lại không có KR', async () => {
    const id = nid('t');
    await call(tk, 'saveTask', { task: { id, projectId: 'p_general', title: 'Việc tay', startDate: todayISO(), assigneeIds: [me], due: plusDays(2), krId: 'krKA' } });
    assert.equal((await taskOf(id)).krId, '');
  });
  test('sửa báo cáo: đổi KR của giải pháp, thêm giải pháp mới; trạng thái việc giữ nguyên', async () => {
    await call(tk, 'updateTask', { id: 'tks1', patch: { status: 'doing' } });
    const s1 = sol('ks1', 'krKB'), s2 = sol('ks2', 'krKB'), s3 = sol('ks3', 'krKA');
    await call(tk, 'updateReport', { report: { id: 'rpKS', okrId: 'okrKS', krUpdates: [ku('krKA', [s3]), ku('krKB', [s1, s2])] }, tasks: [tsk('tks3', 'ks3')] });
    assert.equal((await taskOf('tks1')).krId, 'krKB'); assert.equal((await taskOf('tks1')).status, 'doing');
    assert.equal((await taskOf('tks2')).krId, 'krKB');
    assert.equal((await taskOf('tks3')).krId, 'krKA');
  });
  test('nâng cấp: việc cũ chưa có KR được điền từ báo cáo; giải pháp không có mã KR (báo cáo cũ) thì để trống', async () => {
    const pg = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
    await pg.connect();
    try {
      await call(tk, 'addReport', { report: { id: 'rpKO', okrId: 'okrKX', week, year: 2026, createdAt: new Date().toISOString(), work: 'x', krUpdates: [], solutions: [{ id: 'kso', text: 'Giải pháp báo cáo cũ', due: plusDays(3) }] },
        tasks: [tsk('tkso', 'kso', { okrId: 'okrKX' })] });
      await pg.query(`UPDATE tasks SET kr_id='' WHERE id IN ('tks1','tks2','tks3','tkso')`);
      await stopServer(); await startServer(); tk = await login('admin');           // khởi động lại → chạy lại phần nâng cấp
      assert.equal((await taskOf('tks1')).krId, 'krKB'); assert.equal((await taskOf('tks3')).krId, 'krKA');
      assert.equal((await taskOf('tkso')).krId, '');
    } finally { await pg.end(); }
  });
});

describe('v12: ngày bắt đầu, email thông báo, giới hạn 10MB', () => {
  let tk, me;
  const taskOf = async id => (await work(tk)).tasks.find(x => x.id === id);
  const mk = extra => ({ id: nid('t'), projectId: 'p_general', title: 'Việc v12 ' + seqId, ...extra });
  before(async () => { if (!proc) await startServer(); tk = await login('admin'); me = (await work(tk)).viewerId; });

  test('ngày bắt đầu bắt buộc khi tạo, không sau hạn chót, lưu và trả về đúng', async () => {
    await denied(tk, 'saveTask', { task: mk({ assigneeIds: [me] }) }, /ngày bắt đầu/i);
    await denied(tk, 'saveTask', { task: mk({ assigneeIds: [me], startDate: plusDays(3), due: plusDays(1) }) }, /không được sau hạn/i);
    await denied(tk, 'saveTask', { task: mk({ assigneeIds: [me], startDate: '2026-13-45' }) }, /không hợp lệ/i);
    const t = mk({ assigneeIds: [me], startDate: plusDays(1), due: plusDays(5) });
    await call(tk, 'saveTask', { task: t });
    assert.equal((await taskOf(t.id)).startDate, plusDays(1));
    await call(tk, 'saveTask', { task: { ...t, title: 'Đổi tên v12' } });                           // không gửi startDate → giữ nguyên
    assert.equal((await taskOf(t.id)).startDate, plusDays(1));
    await call(tk, 'saveTask', { task: { ...t, startDate: plusDays(2) } });
    assert.equal((await taskOf(t.id)).startDate, plusDays(2));
    await denied(tk, 'saveTask', { task: { ...t, startDate: '' } }, /ngày bắt đầu/i);               // việc đã có ngày bắt đầu thì không xoá được
  });

  test('nhãn trạng thái todo vẫn là "todo" trong dữ liệu', async () => {
    const t = mk({ assigneeIds: [me], startDate: todayISO() });
    await call(tk, 'saveTask', { task: t });
    assert.equal((await taskOf(t.id)).status, 'todo');
  });

  test('email: không lộ trong dữ liệu chung, Giám đốc nhập và xem được; email sai bị từ chối', async () => {
    const r = await (await fetch(BASE + '?token=' + encodeURIComponent(tk))).json();
    assert.ok(r.db.users.every(u => !('email' in u)), 'users công khai không có email');
    const admin0 = r.db.users.find(u => u.id === me);
    await denied(tk, 'saveUser', { user: { ...admin0, email: 'khong-hop-le' } }, /email/i);
    await call(tk, 'saveUser', { user: { ...admin0, email: 'Admin.Test@Example.com' } });
    const r2 = await (await fetch(BASE + '?token=' + encodeURIComponent(tk))).json();
    assert.equal(r2.db.emails[me], 'admin.test@example.com');
    assert.ok(r2.db.users.every(u => !('email' in u)));
  });

  test('mail.build: dựng đúng nội dung 4 loại thông báo, escape HTML, tắt khi thiếu SMTP', () => {
    const mail = require('../src/mail.js')({ pool: null, env: {}, log: { warn() {}, error() {} } });
    assert.equal(mail.enabled, false);
    mail.queue([{ kind: 'assigned', to: ['x'] }]);                                                  // tắt → không lỗi
    const actor = { name: 'Sếp <b>' };
    const t = { title: 'Làm <script>', project: 'Dự án', due: '2026-12-31', startDate: '2026-12-01', priority: 'high' };
    const a = mail.build({ kind: 'assigned', task: t }, actor);
    assert.match(a.subject, /giao việc/); assert.match(a.html, /01\/12\/2026/); assert.match(a.html, /31\/12\/2026/); assert.match(a.html, /Cao/);
    assert.ok(!a.html.includes('<script>') && !a.html.includes('Sếp <b>'), 'đã escape HTML');
    assert.match(mail.build({ kind: 'reassigned', task: t }, actor).subject, /giao lại/);
    assert.match(mail.build({ kind: 'taskComment', task: t, text: 'Xin chào' }, actor).html, /Xin chào/);
    assert.match(mail.build({ kind: 'reportFeedback', report: { week: 5, year: 2026, okrTitle: 'OKR' }, text: 'Tốt' }, actor).subject, /5\/2026/);
    assert.equal(mail.build({ kind: 'lạ' }, actor), null);
    assert.ok(mail.EMAIL_RE.test('a@b.vn') && !mail.EMAIL_RE.test('a b@c.d') && !mail.EMAIL_RE.test('abc'));
  });

  test('tệp: 9MB qua, 11MB bị từ chối', async () => {
    const t = mk({ assigneeIds: [me], startDate: todayISO() }); await call(tk, 'saveTask', { task: t });
    const up = n => fetch(BASE + 'upload?taskId=' + t.id + '&name=f' + n + '.zip', { method: 'POST', headers: { 'x-okr-token': tk }, body: Buffer.alloc(n * 1024 * 1024, 1) }).then(r => r.json()).catch(e => ({ ok: false, error: String(e) }));
    assert.equal((await up(9)).ok, true);
    assert.equal((await up(11)).ok, false);
  });
});

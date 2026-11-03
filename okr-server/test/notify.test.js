/**
 * Kiểm thử hộp thông báo trong app (src/notify.js) với PostgreSQL thật.
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
const DBNAME = 'okr_notif_' + Date.now().toString(36);
const PORT = 3500 + Math.floor(Math.random() * 300);
const BASE = 'http://127.0.0.1:' + PORT + '/';
const UP = fs.mkdtempSync(path.join(os.tmpdir(), 'okr-nt-'));
const SERVER = path.join(__dirname, '..', 'dist', 'server.js');
const todayISO = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
let proc, admin, seq = 0;
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
async function login(username) {
  const r = await fetch(BASE, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username, password: 'secret1' } }) });
  const j = await r.json(); assert.equal(j.ok, true, 'login ' + username + ': ' + j.error); return { token: j.token, id: j.user.id, cycleId: j.db.cycles[0].id };
}
const inbox = async (token, nv) => (await fetch(BASE + '?notif=1&token=' + encodeURIComponent(token) + (nv ? '&nv=' + encodeURIComponent(nv) : ''))).json();
const dataVersion = async token => (await (await fetch(BASE + '?token=' + encodeURIComponent(token))).json()).version;

before(async () => {
  admin = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: 'postgres' });
  await admin.connect(); await admin.query('CREATE DATABASE ' + DBNAME);
});
after(async () => {
  await stopServer();
  await admin.query('DROP DATABASE IF EXISTS ' + DBNAME + ' WITH (FORCE)'); await admin.end();
  fs.rmSync(UP, { recursive: true, force: true });
});

describe('Hộp thông báo trong app', () => {
  const P = 'prjWeb';
  let dir, mgr, a, b, other;           // dir = Giám đốc, mgr = Quản lý, a/b = nhân viên của mgr, other = người ngoài
  before(async () => {
    execFileSync('node', [SERVER, 'create-director', 'admin', 'secret1', 'Giám đốc'], { env: env(), encoding: 'utf8' });
    await startServer();
    dir = await login('admin');
    const mk = async (id, username, role, managerId) => {
      await call(dir.token, 'saveUser', { user: { id, username, password: 'secret1', name: 'Tên ' + username, role, managerId: managerId || '', dept: 'KD' } });
      return login(username);
    };
    const head = await mk('uhead', 'head', 'head', dir.id);
    mgr = await mk('umgr', 'mgr', 'manager', head.id);
    a = await mk('ua', 'a', 'employee', mgr.id);
    b = await mk('ub', 'b', 'employee', mgr.id);
    other = await mk('uo', 'other', 'employee', mgr.id);
    await call(dir.token, 'saveWorkspace', { workspace: { id: 'wsKD', name: 'Kinh doanh', color: '#059669', open: false, memberIds: [mgr.id, a.id, b.id, other.id] } });
    await call(dir.token, 'saveDepartment', { department: { id: 'depKD', workspaceId: 'wsKD', name: 'Phòng bán hàng', headId: head.id } });
    await call(mgr.token, 'saveProject', { project: { id: P, workspaceId: 'wsKD', departmentId: 'depKD', name: 'Website', memberIds: [a.id, b.id, other.id] } });
  });

  test('Chưa có gì thì hộp rỗng', async () => {
    const j = await inbox(a.token);
    assert.equal(j.ok, true); assert.equal(j.unread, 0); assert.deepEqual(j.items, []);
  });
  test('Cần đăng nhập mới xem được hộp thông báo', async () => {
    const r = await (await fetch(BASE + '?notif=1')).json();
    assert.equal(r.ok, false); assert.equal(r.auth, true);
  });

  test('Giao việc → người được giao có thông báo (người giao thì không), kèm workspace của việc', async () => {
    const t = { id: nid('t'), title: 'Làm trang chủ', projectId: P, startDate: todayISO(), assigneeIds: [a.id, b.id] };
    await call(mgr.token, 'saveTask', { task: t });
    const ja = await inbox(a.token), jb = await inbox(b.token), jm = await inbox(mgr.token);
    assert.equal(ja.unread, 1); assert.equal(jb.unread, 1); assert.equal(jm.unread, 0);
    const n = ja.items[0];
    assert.equal(n.kind, 'assigned'); assert.equal(n.actorId, mgr.id); assert.equal(n.refType, 'task'); assert.equal(n.refId, t.id);
    assert.equal(n.subject, 'Làm trang chủ'); assert.equal(n.read, false); assert.equal(n.refWs, 'wsKD');
    assert.match(n.createdAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  test('Bình luận: báo cho người liên quan, không báo cho chính người viết; @nhắc tên người ngoài cũng nhận', async () => {
    const tid = nid('t');
    await call(mgr.token, 'saveTask', { task: { id: tid, title: 'Việc bàn bạc', projectId: P, startDate: todayISO(), assigneeIds: [a.id] } });
    const before = (await inbox(other.token)).unread;
    await call(a.token, 'addTaskComment', { comment: { id: nid('c'), taskId: tid, text: 'Mình đã xong phần 1', mentions: [other.id] } });
    const jm = await inbox(mgr.token), jo = await inbox(other.token), ja = await inbox(a.token);
    const cm = jm.items.find(x => x.kind === 'taskComment' && x.refId === tid);
    assert.ok(cm, 'người giao việc nhận bình luận'); assert.equal(cm.detail, 'Mình đã xong phần 1'); assert.equal(cm.actorId, a.id);
    assert.equal(jo.unread, before + 1, 'người được @nhắc nhận thông báo');
    assert.ok(!ja.items.some(x => x.kind === 'taskComment'), 'người viết không tự nhận thông báo của mình');
  });

  test('Thêm người theo dõi → người mới được báo; người cũ và người thêm thì không', async () => {
    const tid = nid('t');
    await call(mgr.token, 'saveTask', { task: { id: tid, title: 'Việc có người theo dõi', projectId: P, startDate: todayISO(), assigneeIds: [a.id] } });
    const bBefore = (await inbox(b.token)).items.filter(x => x.kind === 'follower').length;
    await call(mgr.token, 'setFollowers', { id: tid, followerIds: [b.id] });
    const jb = await inbox(b.token);
    assert.equal(jb.items.filter(x => x.kind === 'follower').length, bBefore + 1);
    assert.equal(jb.items.find(x => x.kind === 'follower' && x.refId === tid).actorId, mgr.id);
    await call(mgr.token, 'setFollowers', { id: tid, followerIds: [b.id] });          // không đổi gì → không báo lại
    assert.equal((await inbox(b.token)).items.filter(x => x.kind === 'follower').length, bBefore + 1);
  });

  test('OKR: nhân viên đề xuất → quản lý được báo chờ duyệt; duyệt/từ chối → nhân viên được báo kèm nhận xét', async () => {
    const o = { id: nid('o'), title: 'Tăng doanh số quý 4', ownerId: a.id, cycleId: dir.cycleId, krs: [{ id: nid('k'), title: 'Doanh số', baseline: 0, target: 100, unit: 'tr' }] };
    await call(a.token, 'saveOKR', { okr: o });
    const pend = (await inbox(mgr.token)).items.find(x => x.kind === 'okrPending' && x.refId === o.id);
    assert.ok(pend, 'quản lý trực tiếp nhận thông báo chờ duyệt'); assert.equal(pend.actorId, a.id); assert.equal(pend.subject, 'Tăng doanh số quý 4'); assert.equal(pend.refType, 'okr');
    await call(mgr.token, 'reviewOKR', { id: o.id, status: 'rejected', reviewNote: 'Thiếu KR về chi phí' });
    const rej = (await inbox(a.token)).items.find(x => x.kind === 'okrRejected' && x.refId === o.id);
    assert.ok(rej); assert.equal(rej.detail, 'Thiếu KR về chi phí'); assert.equal(rej.actorId, mgr.id);
    await call(a.token, 'saveOKR', { okr: o });                                       // sửa lại gửi duyệt
    await call(mgr.token, 'reviewOKR', { id: o.id, status: 'approved', reviewNote: '' });
    assert.ok((await inbox(a.token)).items.some(x => x.kind === 'okrApproved' && x.refId === o.id));
    const own = { id: nid('o'), title: 'OKR do quản lý tạo cho nhân viên', ownerId: b.id, cycleId: dir.cycleId, krs: [{ id: nid('k'), title: 'KR', baseline: 0, target: 5, unit: 'x' }] };
    const mBefore = (await inbox(mgr.token)).unread;
    await call(mgr.token, 'saveOKR', { okr: own });                                   // cấp trên tạo thì duyệt ngay, không cần báo chờ duyệt
    assert.equal((await inbox(mgr.token)).unread, mBefore);
  });

  test('Phản hồi báo cáo tuần: người viết nhận, bấm được tới đúng báo cáo', async () => {
    const o = { id: nid('o'), title: 'OKR báo cáo', ownerId: a.id, cycleId: dir.cycleId, krs: [{ id: 'krRep', title: 'KR', baseline: 0, target: 10, unit: 'x' }] };
    await call(mgr.token, 'saveOKR', { okr: o });
    const rid = nid('r');
    await call(a.token, 'addReport', { report: { id: rid, okrId: o.id, week: 45, year: 2026, createdAt: new Date().toISOString(), work: 'x', krUpdates: [{ krId: 'krRep', value: 3, work: 'x', solutions: [] }] }, tasks: [] });
    await call(mgr.token, 'addComment', { comment: { id: nid('cm'), reportId: rid, text: 'Cần thêm số liệu', createdAt: new Date().toISOString() } });
    const n = (await inbox(a.token)).items.find(x => x.kind === 'reportFeedback');
    assert.ok(n); assert.equal(n.refType, 'report'); assert.equal(n.refId, rid); assert.match(n.subject, /Báo cáo tuần 45\/2026/); assert.equal(n.detail, 'Cần thêm số liệu');
  });

  test('Đánh dấu đã đọc / chưa đọc: chỉ đụng thông báo của chính mình', async () => {
    const mine = await inbox(a.token); assert.ok(mine.unread >= 3);
    const first = mine.items[0].id, otherBefore = (await inbox(b.token)).unread;
    let j = await call(a.token, 'notifMark', { ids: [first] });
    assert.equal(j.result.unread, mine.unread - 1); assert.equal(j.result.items.find(x => x.id === first).read, true);
    j = await call(a.token, 'notifMark', { ids: [first], read: false });
    assert.equal(j.result.unread, mine.unread);
    await call(b.token, 'notifMark', { ids: [first] });                               // dùng mã thông báo của người khác: không có tác dụng
    assert.equal((await inbox(a.token)).unread, mine.unread);
    j = await call(a.token, 'notifMark', { all: true });
    assert.equal(j.result.unread, 0); assert.ok(j.result.items.every(x => x.read));
    assert.equal((await inbox(b.token)).unread, otherBefore, 'đọc hết của a không ảnh hưởng b');
  });

  test('Xoá 1 thông báo và xoá hết thông báo đã đọc; không xoá được của người khác', async () => {
    const list = (await inbox(a.token)).items; assert.ok(list.length >= 3);
    const id = list[0].id;
    await call(b.token, 'notifRemove', { id });                                       // của người khác: không có tác dụng
    assert.equal((await inbox(a.token)).items.length, list.length);
    let j = await call(a.token, 'notifRemove', { id });
    assert.equal(j.result.items.length, list.length - 1); assert.ok(!j.result.items.some(x => x.id === id));
    await call(a.token, 'notifMark', { ids: [list[1].id], read: false });
    j = await call(a.token, 'notifRemove', { clearRead: true });
    assert.equal(j.result.items.length, 1); assert.equal(j.result.items[0].id, list[1].id);
  });

  test('Dấu phiên bản nv: không có gì mới thì trả unchanged; đọc/xoá không làm đổi phiên bản dữ liệu chung', async () => {
    const j1 = await inbox(b.token); assert.ok(j1.nv);
    assert.equal((await inbox(b.token, j1.nv)).unchanged, true);
    const dv = await dataVersion(b.token);
    const j2 = await call(b.token, 'notifMark', { all: true });
    assert.equal(await dataVersion(b.token), dv, 'đọc thông báo không bump phiên bản dữ liệu chung');
    assert.notEqual(j2.result.nv, j1.nv);
    assert.equal((await inbox(b.token, j2.result.nv)).unchanged, true);
    assert.equal((await inbox(b.token, j1.nv)).unchanged, undefined, 'dấu cũ → tải lại');
    await call(mgr.token, 'saveTask', { task: { id: nid('t'), title: 'Việc mới cho b', projectId: P, startDate: todayISO(), assigneeIds: [b.id] } });
    const j3 = await inbox(b.token, j2.result.nv);
    assert.equal(j3.unchanged, undefined); assert.equal(j3.unread, 1);
  });

  test('Chỉ giữ 200 thông báo mới nhất mỗi người', async () => {
    const tid = nid('t');
    await call(mgr.token, 'saveTask', { task: { id: tid, title: 'Việc nhiều bình luận', projectId: P, startDate: todayISO(), assigneeIds: [other.id] } });
    for (let i = 0; i < 205; i++) await call(mgr.token, 'addTaskComment', { comment: { id: nid('c'), taskId: tid, text: 'Bình luận ' + i } });
    const c = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
    await c.connect();
    const n = (await c.query("SELECT count(*)::int AS n FROM notifications WHERE user_id = 'uo'")).rows[0].n;
    const newest = (await c.query("SELECT subject, detail FROM notifications WHERE user_id = 'uo' ORDER BY seq DESC LIMIT 1")).rows[0];
    await c.end();
    assert.equal(n, 200); assert.equal(newest.detail, 'Bình luận 204');
    assert.equal((await inbox(other.token)).items.length, 60, 'app chỉ tải 60 thông báo gần nhất');
  });

  test('Khoá tài khoản: người đã khoá không nhận thông báo mới', async () => {
    const c = new Client({ ...PGENV, host: PGENV.PGHOST, port: Number(PGENV.PGPORT), user: PGENV.PGUSER, password: PGENV.PGPASSWORD, database: DBNAME });
    await c.connect();
    const count = async () => (await c.query("SELECT count(*)::int AS n FROM notifications WHERE user_id = 'ub'")).rows[0].n;
    await call(dir.token, 'setUserActive', { id: b.id, active: false });
    const before = await count();
    const tid = nid('t');
    await call(mgr.token, 'saveTask', { task: { id: tid, title: 'Việc có người theo dõi đã khoá', projectId: P, startDate: todayISO(), assigneeIds: [a.id] } });
    await call(mgr.token, 'setFollowers', { id: tid, followerIds: [b.id] }, false);   // có thể bị từ chối hoặc bỏ qua; dù sao b cũng không được nhận thêm thông báo
    const after = await count();
    await c.end();
    assert.equal(after, before);
  });
});

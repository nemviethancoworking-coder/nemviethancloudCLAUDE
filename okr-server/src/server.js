/**
 * OKR Weekly — API máy chủ (Node.js + PostgreSQL), thay cho Apps Script (Code.gs v4).
 * v8: thêm module quản lý công việc kiểu Base WeWork (src/work.js): Workspace → Phòng ban → Dự án → Công việc,
 *     Kanban/Danh sách, việc lặp lại, bình luận @nhắc tên, tệp đính kèm. Xem README.
 * Cùng giao thức với Code.gs để index.html không phải đổi:
 *   GET  /?token=…           → { ok, db }  (không token: db.tasks = [])
 *   GET  /?ping=1            → { ok, ping, version }
 *   POST /  {action,payload,token} → { ok, db, ...extra }   (lỗi token: { ok:false, auth:true })
 *   GET  /health             → { ok }
 * Phân quyền: Giám đốc → Trưởng phòng → Quản lý → Nhân viên (users.manager_id = cấp trên trực tiếp).
 * Lệnh phụ:
 *   node server.js import-gas   (env GAS_URL, GAS_USER, GAS_PASS) — nhập dữ liệu từ Apps Script cũ
 *   node server.js import-file <db.json> [--force]
 *   node server.js set-password <username> <password>
 */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');
const { promisify } = require('util');
const scryptAsync = promisify(crypto.scrypt);
const gzipAsync = promisify(zlib.gzip);
const { Pool } = require('pg');

const PORT = Number(process.env.PORT || 3100);
const TOKEN_SECRET = process.env.TOKEN_SECRET || '';
const TOKEN_DAYS = 30;
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
const VERSION = 8;
const ROLES = ['director', 'head', 'manager', 'employee'];
const PARENT_ROLE = { head: 'director', manager: 'head', employee: 'manager' };
const ROLE_NAME = { director: 'Giám đốc', head: 'Trưởng phòng', manager: 'Quản lý', employee: 'Nhân viên' };

const pool = new Pool({
  host: process.env.PGHOST || 'db', port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'okr', password: process.env.PGPASSWORD || '', database: process.env.PGDATABASE || 'okr',
  max: 10,
});

/* ---------------- Lược đồ ---------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS cycles (id text PRIMARY KEY, name text NOT NULL, start_date text NOT NULL, end_date text NOT NULL, active boolean NOT NULL DEFAULT false, seq bigserial);
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, username text NOT NULL UNIQUE, pass_hash text NOT NULL DEFAULT '', name text NOT NULL, role text NOT NULL DEFAULT 'employee',
  dept text NOT NULL DEFAULT '', title text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed', manager_id text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS okrs (id text PRIMARY KEY, owner_id text NOT NULL, title text NOT NULL, cycle_id text NOT NULL, status text NOT NULL DEFAULT 'pending',
  created_by text NOT NULL DEFAULT '', review_note text NOT NULL DEFAULT '', updated_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS krs (id text PRIMARY KEY, okr_id text NOT NULL REFERENCES okrs(id) ON DELETE CASCADE, title text NOT NULL, baseline double precision NOT NULL DEFAULT 0,
  current double precision NOT NULL DEFAULT 0, target double precision NOT NULL DEFAULT 0, unit text NOT NULL DEFAULT '', pos int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS reports (id text PRIMARY KEY, user_id text NOT NULL, week int NOT NULL, year int NOT NULL, okr_id text NOT NULL, created_at text NOT NULL DEFAULT '',
  work text NOT NULL DEFAULT '', issues text NOT NULL DEFAULT '', causes text NOT NULL DEFAULT '', kr_updates jsonb NOT NULL DEFAULT '[]', solutions jsonb NOT NULL DEFAULT '[]', seq bigserial);
CREATE TABLE IF NOT EXISTS comments (id text PRIMARY KEY, report_id text NOT NULL REFERENCES reports(id) ON DELETE CASCADE, author_id text NOT NULL, text text NOT NULL,
  created_at text NOT NULL DEFAULT '', acknowledged boolean NOT NULL DEFAULT false, ack_at text, seq bigserial);
CREATE TABLE IF NOT EXISTS tasks (id text PRIMARY KEY, title text NOT NULL, assignee_id text NOT NULL, report_id text, solution_id text, okr_id text, week int NOT NULL DEFAULT 0,
  year int NOT NULL DEFAULT 0, due text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'todo', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS task_comments (id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, author_id text NOT NULL, text text NOT NULL, created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS krs_okr ON krs(okr_id);
CREATE INDEX IF NOT EXISTS comments_report ON comments(report_id);
CREATE INDEX IF NOT EXISTS tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS reports_user ON reports(user_id);
`;
async function migrate() {
  await pool.query(SCHEMA);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true');   // v6: khoá tài khoản
  await W.migrate();                                                                                       // v8: workspace, dự án, việc nhiều người làm, tệp đính kèm
}

/* ---------------- Tiện ích ---------------- */
class AppError extends Error { constructor(msg, auth) { super(msg); this.auth = !!auth; } }
const deny = msg => { throw new AppError(msg || 'Bạn không có quyền thực hiện thao tác này.'); };
const authError = msg => new AppError(msg || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', true);
const str = v => (v === null || v === undefined) ? '' : String(v);
const num = v => Number(v) || 0;
const todayISO = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // GMT+7

/* Mật khẩu: scrypt + salt */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32);
  return 'scrypt$' + salt.toString('base64') + '$' + h.toString('base64');
}
async function checkPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const h = await scryptAsync(String(pw), Buffer.from(parts[1], 'base64'), 32);
  const want = Buffer.from(parts[2], 'base64');
  return want.length === h.length && crypto.timingSafeEqual(h, want);
}

/* Token: userId.exp.HMAC (giống Code.gs, khoá bí mật riêng của máy chủ) */
const sign = data => crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
function makeToken(uid) { const data = uid + '.' + (Date.now() + TOKEN_DAYS * 864e5); return data + '.' + sign(data); }
async function verifyToken(tok) {
  if (!tok) throw authError('Vui lòng đăng nhập lại để tiếp tục.');
  tok = String(tok);
  const i = tok.lastIndexOf('.'); if (i < 0) throw authError();
  const data = tok.slice(0, i), sig = tok.slice(i + 1);
  const j = data.lastIndexOf('.'); if (j < 0) throw authError();
  const uid = data.slice(0, j), exp = Number(data.slice(j + 1));
  const good = sign(data);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good)) || !(exp > Date.now())) throw authError();
  const u = (await getUsers()).find(x => x.id === uid);
  if (!u) throw authError('Tài khoản không còn tồn tại.');
  if (!u.active) throw authError('Tài khoản của bạn đã bị khoá. Liên hệ Giám đốc nếu cần mở lại.');
  return u;
}

/* Giới hạn đăng nhập sai: 8 lần / 15 phút cho mỗi (IP, tài khoản), 30 lần / 15 phút cho mỗi IP */
const fails = new Map();
const WINDOW = 15 * 60e3;
function failCount(key) { const a = (fails.get(key) || []).filter(t => Date.now() - t < WINDOW); fails.set(key, a); return a.length; }
function addFail(key) { const a = fails.get(key) || []; a.push(Date.now()); fails.set(key, a); }
setInterval(() => { for (const k of fails.keys()) if (!failCount(k)) fails.delete(k); }, 60e3).unref();

/* ---------------- Người dùng & phân quyền ---------------- */
function normalizeRoles(users) {
  users.forEach(u => { u.role = String(u.role || '').trim().toLowerCase(); if (!ROLES.includes(u.role)) u.role = 'employee'; u.managerId = u.managerId || ''; });
  if (!users.some(u => u.role === 'director')) users.forEach(u => { if ((u.role === 'manager' || u.role === 'head') && !u.managerId) u.role = 'director'; });
  return users;
}
async function getUsers(q = pool) {
  const r = await q.query('SELECT id, username, name, role, dept, title, color, manager_id, active FROM users ORDER BY seq');
  return normalizeRoles(r.rows.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, dept: u.dept, title: u.title, color: u.color, managerId: u.manager_id, active: u.active !== false })));
}
async function ctx(viewer, q = pool) {
  const users = await getUsers(q), byId = {};
  users.forEach(u => { byId[u.id] = u; });
  return { me: byId[viewer.id] || viewer, users, byId, q };
}
/** Ngữ cảnh phân quyền dựng từ danh sách người dùng đã có (không truy vấn lại). */
function ctxFor(viewer, users) {
  const byId = {}; users.forEach(u => { byId[u.id] = u; });
  return { me: byId[viewer.id] || viewer, users, byId, q: pool };
}
function canManage(c, targetId) {
  if (c.me.role === 'director') return true;
  if (c.me.role !== 'head' && c.me.role !== 'manager') return false;
  let t = c.byId[targetId]; const seen = {};
  if (!t || t.id === c.me.id) return false;
  while (t && t.managerId && !seen[t.id]) {
    if (t.managerId === c.me.id) return true;
    seen[t.id] = 1; t = c.byId[t.managerId];
  }
  return false;
}
const canSeeTaskOf = (c, assigneeId) => assigneeId === c.me.id || canManage(c, assigneeId);
const requireDirector = c => { if (c.me.role !== 'director') deny('Chỉ Giám đốc được thực hiện thao tác này.'); };

/* ---------------- Đọc dữ liệu (cùng định dạng với Code.gs) ----------------
 * dataVersion đổi sau mỗi lần ghi. Phần dữ liệu chung (chu kỳ, người dùng, OKR, báo cáo) giống nhau với mọi người
 * nên được dựng 1 lần cho mỗi phiên bản; chỉ phần công việc được lọc riêng theo người xem.
 * GET kèm v=<phiên bản đang có> → { unchanged:true } nếu không có gì mới (tiết kiệm băng thông khi app tự làm mới). */
let dataVersion = String(Date.now()), verSeq = 0;
const bumpVersion = () => { dataVersion = Date.now() + '.' + (++verSeq); };
let pubCache = { version: null, promise: null };
function publicPart() {
  if (pubCache.version !== dataVersion) {
    const v = dataVersion;
    pubCache = { version: v, promise: buildPublic().catch(e => { if (pubCache.version === v) pubCache.version = null; throw e; }) };
  }
  return pubCache.promise;
}
async function buildPublic() {
  const db = await loadDB(null);
  return { users: db.users, json: JSON.stringify({ cycles: db.cycles, users: db.users, okrs: db.okrs, reports: db.reports }).slice(1, -1) };
}
async function viewerTasks(viewer, users) {
  const c = { me: users.find(u => u.id === viewer.id) || viewer, byId: Object.fromEntries(users.map(u => [u.id, u])) };
  const ids = users.filter(u => canSeeTaskOf(c, u.id)).map(u => u.id);
  return tasksWithComments(ids);
}
/* Công việc của các người làm trong danh sách + bình luận/ghi chú của từng việc (chỉ người xem được việc mới nhận được bình luận). */
async function tasksWithComments(assigneeIds) {
  // Chỉ việc sinh từ báo cáo tuần + việc ở dự án mặc định (bản giao diện cũ); việc của các dự án khác do màn Công việc tự tải (?work=1).
  const tr = await pool.query(`SELECT * FROM tasks WHERE assignee_id = ANY($1) AND (report_id IS NOT NULL OR project_id = '${W.DEFAULT_PROJECT}') ORDER BY seq`, [assigneeIds]);
  const ids = tr.rows.map(t => t.id), by = {};
  if (ids.length) {
    const cr = await pool.query('SELECT * FROM task_comments WHERE task_id = ANY($1) ORDER BY seq', [ids]);
    cr.rows.forEach(c => { (by[c.task_id] = by[c.task_id] || []).push({ id: c.id, authorId: c.author_id, text: c.text, createdAt: c.created_at }); });
  }
  return tr.rows.map(t => ({ id: t.id, title: t.title, assigneeId: t.assignee_id, reportId: t.report_id || null, solutionId: t.solution_id || null, okrId: t.okr_id || null,
    week: t.week, year: t.year, due: t.due, status: t.status, createdAt: t.created_at, comments: by[t.id] || [] }));
}
/* Chuỗi JSON đầy đủ { ok, version, db, ...extra } — ghép từ phần chung đã dựng sẵn. */
async function dbResponse(viewer, extra) {
  const v = dataVersion, pub = await publicPart();
  const tasks = viewer ? await viewerTasks(viewer, pub.users) : [];
  const head = JSON.stringify({ ok: true, version: v, ...(extra || {}) }).slice(0, -1);
  return head + ',"db":{' + pub.json + ',"tasks":' + JSON.stringify(tasks) + ',"viewerId":' + JSON.stringify(viewer ? viewer.id : null) + ',"loadedAt":"' + new Date().toISOString() + '"}}';
}
async function loadDB(viewer) {
  const [cy, users, ok, kr, rp, cm] = await Promise.all([
    pool.query('SELECT * FROM cycles ORDER BY seq'), getUsers(),
    pool.query('SELECT * FROM okrs ORDER BY seq'), pool.query('SELECT * FROM krs ORDER BY okr_id, pos'),
    pool.query('SELECT * FROM reports ORDER BY seq'), pool.query('SELECT * FROM comments ORDER BY seq'),
  ]);
  let cycles = cy.rows.map(c => ({ id: c.id, name: c.name, start: c.start_date, end: c.end_date, active: c.active }));
  if (!cycles.length) {
    const s = todayISO(), e = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    await pool.query('INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,true) ON CONFLICT DO NOTHING', ['c1', 'Chu kỳ', s, e]);
    cycles = [{ id: 'c1', name: 'Chu kỳ', start: s, end: e, active: true }];
  }
  if (!cycles.some(c => c.active)) cycles[0].active = true;
  const activeId = cycles.find(c => c.active).id;
  const krBy = {};
  kr.rows.forEach(k => { (krBy[k.okr_id] = krBy[k.okr_id] || []).push({ id: k.id, title: k.title, baseline: k.baseline, current: k.current, target: k.target, unit: k.unit }); });
  const okrs = ok.rows.map(o => ({ id: o.id, ownerId: o.owner_id, title: o.title, cycleId: o.cycle_id || activeId, status: o.status || 'approved', createdBy: o.created_by || o.owner_id,
    reviewNote: o.review_note, updatedAt: o.updated_at, krs: krBy[o.id] || [] }));
  const cmBy = {};
  cm.rows.forEach(c => { (cmBy[c.report_id] = cmBy[c.report_id] || []).push({ id: c.id, authorId: c.author_id, text: c.text, createdAt: c.created_at, acknowledged: c.acknowledged, ackAt: c.ack_at || null }); });
  const reports = rp.rows.map(r => ({ id: r.id, userId: r.user_id, week: r.week, year: r.year, okrId: r.okr_id, createdAt: r.created_at, work: r.work, issues: r.issues, causes: r.causes,
    krUpdates: r.kr_updates || [], solutions: r.solutions || [], comments: cmBy[r.id] || [] }));
  let tasks = [];
  if (viewer) {
    const c = await ctx(viewer);
    const ids = c.users.filter(u => canSeeTaskOf(c, u.id)).map(u => u.id);
    tasks = await tasksWithComments(ids);
  }
  return { cycles, users, okrs, reports, tasks, viewerId: viewer ? viewer.id : null, loadedAt: new Date().toISOString() };
}

/* ---------------- Ghi dữ liệu (mỗi thao tác là 1 giao dịch, ghi tuần tự bằng advisory lock) ---------------- */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(4242)');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) { try { await client.query('ROLLBACK'); } catch (_) {} throw e; }
  finally { client.release(); }
}
const one = async (q, sql, args) => (await q.query(sql, args)).rows[0];
/* Module quản lý công việc (workspace → phòng ban → dự án → công việc): src/work.js */
const W = require('./work')({ pool, AppError, deny, str, num, one, canManage, todayISO, ctxFor });

async function login(p, ip) {
  const username = str(p.username).trim();
  const k1 = 'u:' + ip + ':' + username.toLowerCase(), k2 = 'ip:' + ip;
  if (failCount(k1) >= 8 || failCount(k2) >= 30) throw new AppError('Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
  const row = await one(pool, 'SELECT id, pass_hash FROM users WHERE username = $1', [username]);
  if (!row || !(await checkPassword(str(p.password), row.pass_hash))) { addFail(k1); addFail(k2); throw new AppError('Sai tên đăng nhập hoặc mật khẩu.'); }
  fails.delete(k1);
  const u = (await getUsers()).find(u => u.id === row.id);
  if (!u.active) throw new AppError('Tài khoản này đã bị khoá. Liên hệ Giám đốc nếu cần mở lại.');
  return u;
}

const A = {
  async addReport(c, p) {
    const r = p.report, tasks = p.tasks || [];
    if (!r || !r.id || !r.okrId) throw new AppError('Thiếu dữ liệu báo cáo.');
    const okr = await one(c.q, 'SELECT id, owner_id FROM okrs WHERE id = $1', [r.okrId]);
    if (!okr || okr.owner_id !== c.me.id) deny('Chỉ gửi được báo cáo cho OKR của chính bạn.');
    // Một OKR có thể báo cáo nhiều lần trong tuần, miễn mỗi KR chỉ báo cáo một lần (báo cáo cũ theo nguyên bộ có đủ mọi KR).
    const sent = new Set();
    const prev = await c.q.query('SELECT kr_updates FROM reports WHERE user_id=$1 AND okr_id=$2 AND week=$3 AND year=$4', [c.me.id, r.okrId, num(r.week), num(r.year)]);
    for (const row of prev.rows) for (const ku of row.kr_updates || []) sent.add(ku.krId);
    if (!(r.krUpdates || []).length && prev.rows.length) throw new AppError('Đã có báo cáo tuần này cho OKR này.');
    if ((r.krUpdates || []).some(ku => sent.has(ku.krId))) throw new AppError('Có KR đã được báo cáo trong tuần này rồi.');
    await c.q.query(`INSERT INTO reports(id,user_id,week,year,okr_id,created_at,work,issues,causes,kr_updates,solutions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [r.id, c.me.id, num(r.week), num(r.year), r.okrId, str(r.createdAt) || new Date().toISOString(), str(r.work), str(r.issues), str(r.causes),
       JSON.stringify(r.krUpdates || []), JSON.stringify(r.solutions || [])]);
    for (const ku of r.krUpdates || []) await c.q.query('UPDATE krs SET current = $1 WHERE id = $2 AND okr_id = $3', [num(ku.value), ku.krId, okr.id]);
    for (const t of tasks) await insertTask(c.q, { ...t, assigneeId: c.me.id, reportId: r.id });
  },
  async deleteReport(c, p) {
    const r = await one(c.q, 'SELECT user_id FROM reports WHERE id=$1', [p.id]); if (!r) return;
    if (r.user_id !== c.me.id && c.me.role !== 'director') deny('Chỉ người viết báo cáo hoặc Giám đốc được xoá báo cáo.');
    W.removeTaskFiles((await c.q.query('DELETE FROM tasks WHERE report_id=$1 RETURNING id', [p.id])).rows.map(x => x.id));
    await c.q.query('DELETE FROM reports WHERE id=$1', [p.id]);            // comments xoá theo ON DELETE CASCADE
  },
  /* Sửa báo cáo tuần: chỉ người gửi, và chỉ khi chưa có cấp trên nào phản hồi/đánh giá. */
  async updateReport(c, p) {
    const r = p.report, tasks = p.tasks || [];
    if (!r || !r.id || !r.okrId) throw new AppError('Thiếu dữ liệu báo cáo.');
    const old = await one(c.q, 'SELECT * FROM reports WHERE id=$1', [r.id]); if (!old) throw new AppError('Báo cáo không còn tồn tại.');
    if (old.user_id !== c.me.id) deny('Chỉ người gửi báo cáo được sửa báo cáo này.');
    if (old.okr_id !== r.okrId) throw new AppError('Không đổi được OKR của báo cáo đã gửi.');
    if (!(old.kr_updates || []).some(ku => 'work' in ku)) throw new AppError('Báo cáo cũ (theo nguyên bộ OKR) không sửa được.');
    if (await one(c.q, 'SELECT 1 FROM comments WHERE report_id=$1 AND author_id <> $2 LIMIT 1', [old.id, old.user_id]))
      throw new AppError('Cấp trên đã đánh giá báo cáo này nên không sửa được nữa.');
    const kus = r.krUpdates || [];
    if (!kus.length) throw new AppError('Cần chọn ít nhất 1 KR để báo cáo.');
    const okrKrs = (await c.q.query('SELECT id FROM krs WHERE okr_id=$1', [old.okr_id])).rows.map(x => x.id);
    if (kus.some(ku => !okrKrs.includes(ku.krId)) || new Set(kus.map(ku => ku.krId)).size !== kus.length) throw new AppError('KR không hợp lệ.');
    // KR đã nằm trong báo cáo khác của tuần này thì không báo cáo lại
    const others = await c.q.query('SELECT kr_updates FROM reports WHERE user_id=$1 AND okr_id=$2 AND week=$3 AND year=$4 AND id <> $5', [old.user_id, old.okr_id, old.week, old.year, old.id]);
    const sent = new Set(); others.rows.forEach(row => (row.kr_updates || []).forEach(ku => sent.add(ku.krId)));
    if (kus.some(ku => sent.has(ku.krId))) throw new AppError('Có KR đã được báo cáo ở một báo cáo khác trong tuần này.');
    const solutions = kus.flatMap(ku => ku.solutions || []);
    await c.q.query('UPDATE reports SET work=$2, issues=$3, causes=$4, kr_updates=$5, solutions=$6 WHERE id=$1',
      [old.id, str(r.work), str(r.issues), str(r.causes), JSON.stringify(kus), JSON.stringify(solutions)]);
    // Giá trị KR chỉ cập nhật khi chưa có báo cáo nào mới hơn chứa KR đó (tránh ghi đè số liệu mới)
    const newer = await c.q.query('SELECT kr_updates FROM reports WHERE okr_id=$1 AND seq > $2', [old.okr_id, old.seq]);
    const newerKr = new Set(); newer.rows.forEach(row => (row.kr_updates || []).forEach(ku => newerKr.add(ku.krId)));
    for (const ku of kus) if (!newerKr.has(ku.krId)) await c.q.query('UPDATE krs SET current=$1 WHERE id=$2 AND okr_id=$3', [num(ku.value), ku.krId, old.okr_id]);
    // Đồng bộ công việc sinh ra từ giải pháp: giữ trạng thái việc cũ, thêm việc mới, bỏ việc 'Cần làm' của giải pháp đã xoá
    const ex = (await c.q.query('SELECT id, solution_id, status FROM tasks WHERE report_id=$1', [old.id])).rows;
    const keepSol = new Set(solutions.map(s => s.id));
    for (const t of ex) if (t.solution_id && !keepSol.has(t.solution_id) && t.status === 'todo') { await c.q.query('DELETE FROM tasks WHERE id=$1', [t.id]); W.removeTaskFiles([t.id]); }
    for (const s of solutions) {
      const cur = ex.find(t => t.solution_id === s.id);
      if (cur) await c.q.query('UPDATE tasks SET title=$2, due=$3 WHERE id=$1', [cur.id, str(s.text), str(s.due)]);
      else {
        const nt = tasks.find(t => t.solutionId === s.id) || { id: 't' + crypto.randomBytes(6).toString('hex'), title: s.text, due: s.due, status: 'todo', week: old.week, year: old.year, okrId: old.okr_id };
        await insertTask(c.q, { ...nt, title: str(s.text), due: str(s.due), assigneeId: old.user_id, reportId: old.id, solutionId: s.id });
      }
    }
  },
  /* Bình luận / ghi chú trên công việc: ai xem được công việc thì được bình luận. */
  async addTaskComment(c, p) {
    const cm = p.comment;
    if (!cm || !cm.id || !cm.taskId || !str(cm.text).trim()) throw new AppError('Thiếu nội dung ghi chú.');
    const t = await one(c.q, 'SELECT assignee_id FROM tasks WHERE id=$1', [cm.taskId]); if (!t) throw new AppError('Công việc không còn tồn tại.');
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    await c.q.query('INSERT INTO task_comments(id,task_id,author_id,text,created_at) VALUES($1,$2,$3,$4,$5)', [cm.id, cm.taskId, c.me.id, str(cm.text).trim().slice(0, 4000), str(cm.createdAt) || new Date().toISOString()]);
  },
  async deleteTaskComment(c, p) {
    const row = await one(c.q, 'SELECT cm.author_id, t.assignee_id FROM task_comments cm JOIN tasks t ON t.id = cm.task_id WHERE cm.id=$1', [p.id]); if (!row) return;
    if (!canSeeTaskOf(c, row.assignee_id)) deny();
    if (row.author_id !== c.me.id && c.me.role !== 'director') deny('Chỉ người viết hoặc Giám đốc được xoá ghi chú này.');
    await c.q.query('DELETE FROM task_comments WHERE id=$1', [p.id]);
  },
  async addComment(c, p) {
    const cm = p.comment;
    if (!cm || !cm.id || !cm.reportId || !str(cm.text).trim()) throw new AppError('Thiếu nội dung phản hồi.');
    const r = await one(c.q, 'SELECT user_id FROM reports WHERE id=$1', [cm.reportId]); if (!r) throw new AppError('Báo cáo không còn tồn tại.');
    if (r.user_id !== c.me.id && !canManage(c, r.user_id)) deny('Chỉ cấp trên của người viết hoặc Giám đốc được phản hồi báo cáo này.');
    await c.q.query('INSERT INTO comments(id,report_id,author_id,text,created_at,acknowledged) VALUES($1,$2,$3,$4,$5,false)', [cm.id, cm.reportId, c.me.id, str(cm.text), str(cm.createdAt) || new Date().toISOString()]);
  },
  async ackComment(c, p) {
    const row = await one(c.q, 'SELECT r.user_id FROM comments cm JOIN reports r ON r.id = cm.report_id WHERE cm.id=$1', [p.id]);
    if (!row) throw new AppError('Không tìm thấy phản hồi.');
    if (row.user_id !== c.me.id) deny('Chỉ người viết báo cáo được xác nhận chỉ đạo.');
    await c.q.query('UPDATE comments SET acknowledged=true, ack_at=$2 WHERE id=$1', [p.id, str(p.ackAt) || new Date().toISOString()]);
  },
  async addTask(c, p) {
    const t = p.task;
    if (!t || !t.id || !str(t.title).trim()) throw new AppError('Thiếu dữ liệu công việc.');
    t.assigneeId = t.assigneeId || c.me.id;
    if (!canSeeTaskOf(c, t.assigneeId)) deny('Bạn chỉ giao được việc cho chính mình hoặc cấp dưới.');
    if (c.byId[t.assigneeId] && !c.byId[t.assigneeId].active) throw new AppError(c.byId[t.assigneeId].name + ' đã bị khoá tài khoản, không giao việc mới được.');
    await insertTask(c.q, t);
  },
  async updateTask(c, p) {
    const t = await one(c.q, 'SELECT assignee_id FROM tasks WHERE id=$1', [p.id]); if (!t) throw new AppError('Không tìm thấy công việc.');
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    const src = p.patch || {};
    if (src.status !== undefined && !['todo', 'doing', 'done'].includes(src.status)) throw new AppError('Trạng thái không hợp lệ.');
    await c.q.query(`UPDATE tasks SET status = COALESCE($2, status), title = COALESCE($3, title), due = COALESCE($4, due) WHERE id=$1`,
      [p.id, src.status ?? null, src.title !== undefined ? str(src.title) : null, src.due !== undefined ? str(src.due) : null]);
  },
  async deleteTask(c, p) {
    const t = await one(c.q, 'SELECT assignee_id FROM tasks WHERE id=$1', [p.id]); if (!t) return;
    if (!canSeeTaskOf(c, t.assignee_id)) deny();
    await c.q.query('DELETE FROM tasks WHERE id=$1', [p.id]);
  },
  async saveOKR(c, p) {
    const o = p.okr;
    if (!o || !o.id || !str(o.title).trim() || !o.ownerId || !o.cycleId) throw new AppError('Thiếu dữ liệu OKR.');
    if (!o.krs || !o.krs.length) throw new AppError('OKR cần ít nhất 1 KR.');
    if (!c.byId[o.ownerId]) throw new AppError('Người phụ trách không tồn tại.');
    const old = await one(c.q, 'SELECT * FROM okrs WHERE id=$1', [o.id]);
    const allowed = ownerId => ownerId === c.me.id || canManage(c, ownerId);
    if (!allowed(o.ownerId) || (old && !allowed(old.owner_id))) deny('Bạn chỉ tạo/sửa được OKR của chính mình hoặc cấp dưới.');
    if (!c.byId[o.ownerId].active && !(old && old.owner_id === o.ownerId)) throw new AppError(c.byId[o.ownerId].name + ' đã bị khoá tài khoản, không giao OKR mới được.');
    const approved = canManage(c, o.ownerId);
    const row = [o.id, o.ownerId, str(o.title), o.cycleId, approved ? 'approved' : 'pending', old ? (old.created_by || old.owner_id) : c.me.id,
      approved && old ? old.review_note : '', str(o.updatedAt) || new Date().toISOString()];
    if (old) await c.q.query('UPDATE okrs SET owner_id=$2, title=$3, cycle_id=$4, status=$5, created_by=$6, review_note=$7, updated_at=$8 WHERE id=$1', row);
    else await c.q.query('INSERT INTO okrs(id,owner_id,title,cycle_id,status,created_by,review_note,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', row);
    const existing = (await c.q.query('SELECT id, current FROM krs WHERE okr_id=$1', [o.id])).rows;
    const keep = [];
    for (let i = 0; i < o.krs.length; i++) {
      const k = o.krs[i], ex = existing.find(x => x.id === k.id);
      if (!k.id) throw new AppError('KR thiếu mã.');
      keep.push(k.id);
      const current = ex ? ex.current : (k.current !== undefined ? num(k.current) : num(k.baseline));
      await c.q.query(`INSERT INTO krs(id,okr_id,title,baseline,current,target,unit,pos) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, baseline=EXCLUDED.baseline, target=EXCLUDED.target, unit=EXCLUDED.unit, pos=EXCLUDED.pos WHERE krs.okr_id = EXCLUDED.okr_id`,
        [k.id, o.id, str(k.title), num(k.baseline), current, num(k.target), str(k.unit), i]);
    }
    await c.q.query('DELETE FROM krs WHERE okr_id=$1 AND NOT (id = ANY($2))', [o.id, keep]);
  },
  async reviewOKR(c, p) {
    if (!p.id || !['approved', 'rejected'].includes(p.status)) throw new AppError('Thiếu dữ liệu duyệt.');
    const o = await one(c.q, 'SELECT owner_id FROM okrs WHERE id=$1', [p.id]); if (!o) throw new AppError('Không tìm thấy OKR.');
    if (!canManage(c, o.owner_id)) deny('Chỉ cấp trên của người phụ trách hoặc Giám đốc được duyệt OKR này.');
    await c.q.query('UPDATE okrs SET status=$2, review_note=$3, updated_at=$4 WHERE id=$1', [p.id, p.status, str(p.reviewNote), str(p.updatedAt) || new Date().toISOString()]);
  },
  async deleteOKR(c, p) {
    const o = await one(c.q, 'SELECT owner_id, status FROM okrs WHERE id=$1', [p.id]); if (!o) return;
    if (!canManage(c, o.owner_id) && !(o.owner_id === c.me.id && o.status !== 'approved')) deny('Bạn không được xoá OKR này.');
    if (await one(c.q, 'SELECT 1 FROM reports WHERE okr_id=$1 LIMIT 1', [p.id])) throw new AppError('Đã có báo cáo tuần gắn với OKR này, không thể xoá.');
    await c.q.query('DELETE FROM okrs WHERE id=$1', [p.id]);
    await c.q.query('UPDATE tasks SET okr_id=NULL WHERE okr_id=$1', [p.id]);
  },
  async saveCycle(c, p) {
    requireDirector(c);
    const y = p.cycle;
    if (!y || !y.id || !str(y.name).trim() || !y.start || !y.end) throw new AppError('Thiếu dữ liệu chu kỳ.');
    await c.q.query(`INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, active=EXCLUDED.active`, [y.id, str(y.name), y.start, y.end, !!y.active]);
    if (y.active) await c.q.query('UPDATE cycles SET active = (id = $1)', [y.id]);
    else if (!(await one(c.q, 'SELECT 1 FROM cycles WHERE active LIMIT 1'))) await c.q.query('UPDATE cycles SET active=true WHERE id=$1', [y.id]);
  },
  async setActiveCycle(c, p) { requireDirector(c); await c.q.query('UPDATE cycles SET active = (id = $1)', [p.id]); },
  async deleteCycle(c, p) {
    requireDirector(c);
    if (await one(c.q, 'SELECT 1 FROM okrs WHERE cycle_id=$1 LIMIT 1', [p.id])) throw new AppError('Chu kỳ đang có OKR, không thể xoá.');
    const y = await one(c.q, 'SELECT active FROM cycles WHERE id=$1', [p.id]);
    if (y && y.active) throw new AppError('Không thể xoá chu kỳ đang hoạt động.');
    await c.q.query('DELETE FROM cycles WHERE id=$1', [p.id]);
  },
  async saveUser(c, p) {
    requireDirector(c);
    const u = p.user || {};
    const name = str(u.name).trim(), username = str(u.username).trim();
    if (!name || !username) throw new AppError('Nhập đủ họ tên và tên đăng nhập.');
    const role = ROLES.includes(u.role) ? u.role : 'employee';
    const old = u.id ? c.byId[u.id] : null;
    const id = old ? old.id : (str(u.id) || 'u' + crypto.randomBytes(4).toString('hex'));
    if (c.users.some(x => x.username === username && x.id !== id)) throw new AppError('Tên đăng nhập "' + username + '" đã được dùng.');
    if (!old && !u.password) throw new AppError('Tài khoản mới cần có mật khẩu.');
    if (old && old.id === c.me.id && role !== 'director') throw new AppError('Không thể tự bỏ vai trò Giám đốc của chính mình.');
    const mgrId = role === 'director' ? '' : str(u.managerId);
    if (mgrId) {
      const m = c.byId[mgrId];
      if (!m || m.id === id) throw new AppError('Cấp trên trực tiếp không hợp lệ.');
      if (!m.active && !(old && old.managerId === mgrId)) throw new AppError(m.name + ' đã bị khoá, không chọn làm cấp trên được.');
      if (m.role !== PARENT_ROLE[role]) throw new AppError(ROLE_NAME[role] + ' phải trực thuộc một ' + ROLE_NAME[PARENT_ROLE[role]] + '.');
    }
    if (old && old.role !== role) {
      const wrong = c.users.filter(x => x.managerId === old.id && PARENT_ROLE[x.role] !== role);
      if (wrong.length) throw new AppError('Còn ' + wrong.length + ' người trực thuộc không hợp với vai trò mới. Hãy chuyển họ sang cấp trên khác trước.');
    }
    const color = str(u.color) || (old && old.color) || '#2f6fed';
    if (old) {
      await c.q.query('UPDATE users SET username=$2, name=$3, role=$4, dept=$5, title=$6, color=$7, manager_id=$8 WHERE id=$1', [id, username, name, role, str(u.dept), str(u.title), color, mgrId]);
      if (u.password) await c.q.query('UPDATE users SET pass_hash=$2 WHERE id=$1', [id, hashPassword(u.password)]);
    } else {
      await c.q.query('INSERT INTO users(id,username,pass_hash,name,role,dept,title,color,manager_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [id, username, hashPassword(u.password), name, role, str(u.dept), str(u.title), color, mgrId]);
    }
  },
  /* Khoá / mở khoá (chỉ Giám đốc). Người bị khoá không đăng nhập được, phiên đang mở bị đăng xuất; dữ liệu cũ giữ nguyên. */
  async setUserActive(c, p) {
    requireDirector(c);
    const u = c.byId[p.id]; if (!u) throw new AppError('Không tìm thấy tài khoản.');
    const active = !!p.active;
    if (!active) {
      if (u.id === c.me.id) throw new AppError('Không thể tự khoá tài khoản của chính mình.');
      const subs = c.users.filter(x => x.managerId === u.id && x.active);
      if (subs.length) throw new AppError(u.name + ' còn ' + subs.length + ' người trực thuộc (' + subs.slice(0, 3).map(x => x.name).join(', ') + (subs.length > 3 ? '…' : '') + '). Hãy chuyển họ sang cấp trên khác trước khi khoá.');
    } else if (u.managerId && c.byId[u.managerId] && !c.byId[u.managerId].active) {
      throw new AppError('Cấp trên trực tiếp của ' + u.name + ' (' + c.byId[u.managerId].name + ') đang bị khoá. Hãy sửa cấp trên trước khi mở khoá.');
    }
    await c.q.query('UPDATE users SET active=$2 WHERE id=$1', [u.id, active]);
  },
  /* Xoá hẳn (chỉ Giám đốc) — chỉ cho tài khoản chưa có dữ liệu nào, ví dụ tạo nhầm. Có dữ liệu thì dùng Khoá. */
  async deleteUser(c, p) {
    requireDirector(c);
    const u = c.byId[p.id]; if (!u) return;
    if (u.id === c.me.id) throw new AppError('Không thể tự xoá tài khoản của chính mình.');
    if (c.users.some(x => x.managerId === u.id)) throw new AppError(u.name + ' còn người trực thuộc, không thể xoá.');
    const used = await one(c.q, `SELECT (SELECT count(*) FROM okrs WHERE owner_id=$1 OR created_by=$1) + (SELECT count(*) FROM reports WHERE user_id=$1)
      + (SELECT count(*) FROM tasks WHERE assignee_id=$1 OR created_by=$1) + (SELECT count(*) FROM task_assignees WHERE user_id=$1)
      + (SELECT count(*) FROM task_comments WHERE author_id=$1) + (SELECT count(*) FROM comments WHERE author_id=$1) AS n`, [u.id]);
    if (Number(used.n)) throw new AppError(u.name + ' đã có OKR, báo cáo, công việc hoặc phản hồi trong hệ thống nên không xoá được. Hãy dùng "Khoá tài khoản" để giữ lại lịch sử.');
    await c.q.query('DELETE FROM workspace_members WHERE user_id=$1', [u.id]);
    await c.q.query('DELETE FROM project_members WHERE user_id=$1', [u.id]);
    await c.q.query('DELETE FROM users WHERE id=$1', [u.id]);
  },
  /* Mỗi người tự đổi mật khẩu của mình (cần mật khẩu hiện tại). */
  async changePassword(c, p) {
    const pw = str(p.newPassword);
    if (pw.length < 6) throw new AppError('Mật khẩu mới cần ít nhất 6 ký tự.');
    const key = 'pw:' + c.me.id;
    if (failCount(key) >= 8) throw new AppError('Nhập sai mật khẩu hiện tại quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    const row = await one(c.q, 'SELECT pass_hash FROM users WHERE id=$1', [c.me.id]);
    if (!row || !(await checkPassword(str(p.oldPassword), row.pass_hash))) { addFail(key); throw new AppError('Mật khẩu hiện tại không đúng.'); }
    if (await checkPassword(pw, row.pass_hash)) throw new AppError('Mật khẩu mới phải khác mật khẩu hiện tại.');
    fails.delete(key);
    await c.q.query('UPDATE users SET pass_hash=$2 WHERE id=$1', [c.me.id, hashPassword(pw)]);
  },
};
Object.assign(A, W.actions);          // v8: thay thế addTask/updateTask/deleteTask/ghi chú bằng bản theo dự án + thêm các hành động mới
/** Việc sinh từ báo cáo tuần / nhập dữ liệu: thuộc dự án mặc định, người làm là người phụ trách. */
async function insertTask(q, t) {
  await q.query(`INSERT INTO tasks(id,title,assignee_id,report_id,solution_id,okr_id,week,year,due,status,created_at,project_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [t.id, str(t.title), t.assigneeId, t.reportId || null, t.solutionId || null, t.okrId || null, num(t.week), num(t.year), str(t.due),
     W.STATUSES.includes(t.status) ? t.status : 'todo', str(t.createdAt) || new Date().toISOString(), t.projectId || W.DEFAULT_PROJECT, str(t.createdBy) || t.assigneeId]);
  await q.query('INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [t.id, t.assigneeId]);
}

/* ---------------- HTTP ---------------- */
function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Okr-Token');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}
async function send(res, obj, code = 200, req) {
  let body = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj));
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  if (req && body.length > 2048 && /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''))) { body = await gzipAsync(body, { level: 5 }); headers['Content-Encoding'] = 'gzip'; headers['Vary'] = 'Accept-Encoding, Origin'; }
  res.writeHead(code, headers);
  res.end(body);
}
const errOut = (res, e) => {
  if (!(e instanceof AppError)) console.error(new Date().toISOString(), e);
  send(res, { ok: false, error: e instanceof AppError ? e.message : 'Lỗi máy chủ, vui lòng thử lại.', auth: !!(e && e.auth) });
};
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', d => { size += d.length; if (size > 1e6) { reject(new AppError('Dữ liệu gửi lên quá lớn.')); req.destroy(); } else chunks.push(d); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const clientIp = req => String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

async function handle(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET') {
      if (url.pathname.endsWith('/health')) { await pool.query('SELECT 1'); return send(res, { ok: true, version: VERSION }); }
      if (url.searchParams.get('ping')) return send(res, { ok: true, ping: 'pong', version: VERSION, backend: 'postgres', time: new Date().toISOString() });
      const tok = url.searchParams.get('token');
      const fileM = url.pathname.match(/\/file\/([A-Za-z0-9_-]+)$/);
      if (fileM) return await W.download(await ctx(await verifyToken(tok)), res, fileM[1]);            // tải / xem tệp đính kèm (token trên URL để dùng được với <img>, <a>)
      const viewer = tok ? await verifyToken(tok) : null;
      if (url.searchParams.get('work')) {                                                              // màn Công việc: dữ liệu theo workspace đang chọn
        if (!viewer) throw authError('Vui lòng đăng nhập lại để tiếp tục.');
        if (url.searchParams.get('v') && url.searchParams.get('v') === dataVersion) return send(res, { ok: true, unchanged: true, version: dataVersion });
        const v = dataVersion, users = (await publicPart()).users;
        return send(res, { ok: true, version: v, work: await W.loadWork(viewer, str(url.searchParams.get('ws')), users) }, 200, req);
      }
      if (url.searchParams.get('workTask')) {                                                          // chi tiết 1 công việc: bình luận + tệp
        if (!viewer) throw authError('Vui lòng đăng nhập lại để tiếp tục.');
        return send(res, { ok: true, ...(await W.loadTaskDetail(await ctx(viewer), str(url.searchParams.get('workTask')))) }, 200, req);
      }
      if (url.searchParams.get('v') && url.searchParams.get('v') === dataVersion) return send(res, { ok: true, unchanged: true, version: dataVersion });
      return send(res, await dbResponse(viewer), 200, req);
    }
    if (req.method !== 'POST') return send(res, { ok: false, error: 'Method not allowed' }, 405);
    if (url.pathname.endsWith('/upload')) {                                                            // tải tệp lên: thân yêu cầu là dữ liệu thô, token ở header
      const viewer = await verifyToken(req.headers['x-okr-token']);
      const file = await W.upload(await ctx(viewer), req, { taskId: url.searchParams.get('taskId'), name: url.searchParams.get('name') });
      bumpVersion();
      return send(res, { ok: true, version: dataVersion, attachment: file });
    }
    let body;
    try { body = JSON.parse(await readBody(req) || '{}'); } catch (e) { throw e instanceof AppError ? e : new AppError('Dữ liệu gửi lên không hợp lệ.'); }
    const action = body.action, p = body.payload || {};
    if (action === 'ping') return send(res, { ok: true, ping: 'pong', version: VERSION });
    if (action === 'login') {
      const u = await login(p, clientIp(req));
      return send(res, await dbResponse(u, { user: u, token: makeToken(u.id) }), 200, req);
    }
    if (!Object.prototype.hasOwnProperty.call(A, action)) throw new AppError('Hành động không hợp lệ: ' + action);
    let viewer = await verifyToken(body.token);
    const result = await tx(async client => { const c = await ctx(viewer, client); return await A[action](c, p); });
    bumpVersion();
    if (body.lite) return send(res, { ok: true, version: dataVersion, result });     // app tự cập nhật tại chỗ, sẽ tải lại sau
    viewer = (await getUsers()).find(u => u.id === viewer.id) || viewer;
    return send(res, await dbResponse(viewer, { result }), 200, req);
  } catch (e) { errOut(res, e); }
}

/* ---------------- Nhập dữ liệu ---------------- */
async function importDB(db, opts = {}) {
  const existing = await one(pool, 'SELECT count(*)::int AS n FROM users');
  if (existing.n && !opts.force) throw new Error('Cơ sở dữ liệu đã có dữ liệu (' + existing.n + ' người dùng). Thêm --force để ghi đè.');
  const temp = [];
  await tx(async q => {
    if (opts.force) await q.query('TRUNCATE comments, krs, reports, okrs, tasks, cycles, users CASCADE');
    for (const c of db.cycles || []) await q.query('INSERT INTO cycles(id,name,start_date,end_date,active) VALUES($1,$2,$3,$4,$5)', [c.id, str(c.name), str(c.start), str(c.end), !!c.active]);
    for (const u of db.users || []) {
      let pw = u.password || (opts.passwords || {})[u.username];
      if (!pw) { pw = crypto.randomBytes(12).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 8); temp.push({ username: u.username, name: u.name, password: pw }); }
      await q.query('INSERT INTO users(id,username,pass_hash,name,role,dept,title,color,manager_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [u.id, str(u.username), hashPassword(pw), str(u.name), str(u.role) || 'employee', str(u.dept), str(u.title), str(u.color) || '#2f6fed', str(u.managerId)]);
    }
    for (const o of db.okrs || []) {
      await q.query('INSERT INTO okrs(id,owner_id,title,cycle_id,status,created_by,review_note,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [o.id, o.ownerId, str(o.title), str(o.cycleId), str(o.status) || 'approved', str(o.createdBy), str(o.reviewNote), str(o.updatedAt)]);
      for (let i = 0; i < (o.krs || []).length; i++) { const k = o.krs[i];
        await q.query('INSERT INTO krs(id,okr_id,title,baseline,current,target,unit,pos) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [k.id, o.id, str(k.title), num(k.baseline), num(k.current), num(k.target), str(k.unit), i]); }
    }
    for (const r of db.reports || []) {
      await q.query('INSERT INTO reports(id,user_id,week,year,okr_id,created_at,work,issues,causes,kr_updates,solutions) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [r.id, r.userId, num(r.week), num(r.year), str(r.okrId), str(r.createdAt), str(r.work), str(r.issues), str(r.causes), JSON.stringify(r.krUpdates || []), JSON.stringify(r.solutions || [])]);
      for (const c of r.comments || []) await q.query('INSERT INTO comments(id,report_id,author_id,text,created_at,acknowledged,ack_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [c.id, r.id, c.authorId, str(c.text), str(c.createdAt), !!c.acknowledged, c.ackAt || null]);
    }
    for (const t of db.tasks || []) await insertTask(q, t);
  });
  bumpVersion();
  return { users: (db.users || []).length, okrs: (db.okrs || []).length, reports: (db.reports || []).length, tasks: (db.tasks || []).length, temp };
}
async function importFromGas() {
  const url = process.env.GAS_URL, user = process.env.GAS_USER, pass = process.env.GAS_PASS;
  if (!url || !user || !pass) throw new Error('Thiếu GAS_URL / GAS_USER / GAS_PASS');
  const res = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'login', payload: { username: user, password: pass } }), redirect: 'follow' });
  const j = JSON.parse(await res.text());
  if (!j.ok) throw new Error('Đăng nhập Apps Script thất bại: ' + j.error);
  if (j.user.role !== 'director') throw new Error('Cần đăng nhập bằng tài khoản Giám đốc để lấy toàn bộ công việc.');
  return importDB(j.db, { passwords: { [user]: pass }, force: process.argv.includes('--force') });
}
function printImport(r) {
  console.log(`Đã nhập: ${r.users} người dùng, ${r.okrs} OKR, ${r.reports} báo cáo, ${r.tasks} công việc.`);
  if (r.temp.length) {
    console.log('\nMẬT KHẨU TẠM cho các tài khoản (đổi lại trong màn Nhân sự & phân quyền):');
    r.temp.forEach(t => console.log('  ' + t.username.padEnd(16) + t.password + '   (' + t.name + ')'));
  }
}

/* ---------------- Khởi động ---------------- */
async function main() {
  const cmd = process.argv[2];
  for (let i = 0; ; i++) { try { await migrate(); break; } catch (e) { if (i > 30) throw e; await new Promise(r => setTimeout(r, 2000)); } }
  if (cmd === 'import-gas') { printImport(await importFromGas()); return pool.end(); }
  if (cmd === 'import-file') { printImport(await importDB(JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), { force: process.argv.includes('--force') })); return pool.end(); }
  if (cmd === 'count-users') { console.log((await one(pool, 'SELECT count(*)::int AS n FROM users')).n); return pool.end(); }
  if (cmd === 'create-director') {
    const [, , , username, password, ...nameParts] = process.argv;
    if (!username || !password) throw new Error('Cách dùng: create-director <tên đăng nhập> <mật khẩu> [họ tên]');
    await pool.query(`INSERT INTO users(id,username,pass_hash,name,role,color) VALUES($1,$2,$3,$4,'director','#1f2937')`,
      ['u' + crypto.randomBytes(4).toString('hex'), username, hashPassword(password), nameParts.join(' ') || 'Giám đốc']);
    console.log('Đã tạo tài khoản Giám đốc: ' + username); return pool.end();
  }
  if (cmd === 'set-password') {
    const r = await pool.query('UPDATE users SET pass_hash=$2 WHERE username=$1', [process.argv[3], hashPassword(process.argv[4])]);
    console.log(r.rowCount ? 'Đã đổi mật khẩu.' : 'Không tìm thấy tài khoản.'); return pool.end();
  }
  if (!TOKEN_SECRET || TOKEN_SECRET.length < 32) throw new Error('TOKEN_SECRET chưa được đặt (>= 32 ký tự).');
  http.createServer((req, res) => { handle(req, res); }).listen(PORT, () => console.log('OKR API v' + VERSION + ' listening on ' + PORT));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });

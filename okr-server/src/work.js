/**
 * OKR Weekly — Module quản lý công việc (kiểu Base WeWork).
 * Phân cấp: Công ty → Workspace → Phòng ban → Dự án → Công việc.
 *
 * Phân quyền ánh xạ từ 4 cấp nhân sự hiện có:
 *   Giám đốc            = Admin/Owner (thấy và sửa mọi thứ)
 *   Trưởng phòng/Quản lý = Quản lý dự án (tạo dự án, giao việc cho cấp dưới; thấy mọi việc trong dự án mình quản lý)
 *   Nhân viên           = Thành viên (thấy việc của mình; cấp trên thấy việc của cấp dưới theo chuỗi quản lý)
 *
 * Mô-đun được nạp bằng require('./work')(deps) để dùng chung kết nối, lỗi và hàm phân quyền với server.js.
 * Các hàm lặp lại (recurrence) là hàm thuần, xuất riêng ở require('./work').recurrence để kiểm thử.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

const STATUSES = ['todo', 'doing', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DEFAULT_WS = 'w_default', DEFAULT_DEPT = 'd_default', DEFAULT_PROJECT = 'p_general';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';
const MAX_FILE = Number(process.env.MAX_UPLOAD_MB || 20) * 1024 * 1024;
const MAX_FILES_PER_TASK = 30;
const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', heic: 'image/heic',
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text',
  ods: 'application/vnd.oasis.opendocument.spreadsheet', zip: 'application/zip',
};
const INLINE_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'pdf']);   // xem ngay trên trình duyệt; còn lại luôn tải về

/* ====================== Công việc lặp lại (hàm thuần, ngày theo UTC để không lệch múi giờ) ====================== */
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const validISO = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && isoOf(parseISO(s)) === s;
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();      // m: 0–11
const isoWeekday = d => d.getUTCDay() || 7;                                        // 1 = thứ Hai … 7 = Chủ nhật

/** Chuẩn hoá cấu hình lặp lại; trả về null nếu không lặp. */
function cleanRule(r) {
  if (!r || typeof r !== 'object' || !['daily', 'weekly', 'monthly'].includes(r.type)) return null;
  const out = { type: r.type };
  if (r.type === 'daily') out.interval = Math.min(365, Math.max(1, Math.floor(Number(r.interval)) || 1));
  if (r.type === 'weekly') {
    out.weekdays = [...new Set((Array.isArray(r.weekdays) ? r.weekdays : []).map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 7))].sort((a, b) => a - b);
    if (!out.weekdays.length) return null;
  }
  if (r.type === 'monthly') {
    out.monthDay = Math.floor(Number(r.monthDay));
    if (!(out.monthDay >= 1 && out.monthDay <= 31)) return null;
  }
  out.end = validISO(r.end) ? r.end : '';
  return out;
}
/** Lần xuất hiện kế tiếp NGAY SAU ngày d (Date UTC). Tháng ngắn hơn ngày cố định thì lấy ngày cuối tháng. */
function nextAfter(rule, d) {
  if (rule.type === 'daily') return addDays(d, rule.interval || 1);
  if (rule.type === 'weekly') {
    for (let i = 1; i <= 7; i++) { const n = addDays(d, i); if (rule.weekdays.includes(isoWeekday(n))) return n; }
  }
  if (rule.type === 'monthly') {
    let y = d.getUTCFullYear(), m = d.getUTCMonth();
    for (let i = 0; i < 25; i++) {
      const cand = new Date(Date.UTC(y, m, Math.min(rule.monthDay, daysInMonth(y, m))));
      if (cand > d) return cand;
      if (++m > 11) { m = 0; y++; }
    }
  }
  throw new Error('Cấu hình lặp lại không hợp lệ');
}
/**
 * Hạn của công việc kế tiếp, tính từ HẠN CŨ để giữ đúng lịch (vd. mỗi thứ Hai); nếu làm trễ nhiều kỳ
 * thì nhảy tới kỳ gần nhất chưa qua (không sinh một loạt việc đã quá hạn). Trả về null khi vượt ngày kết thúc.
 */
function nextDue(rule, baseDue, today) {
  let n = nextAfter(rule, validISO(baseDue) ? parseISO(baseDue) : parseISO(today));
  for (let guard = 0; isoOf(n) < today && guard < 2000; guard++) n = nextAfter(rule, n);
  const out = isoOf(n);
  return rule.end && out > rule.end ? null : out;
}

/* ====================== Mô-đun ====================== */
module.exports = function makeWork(D) {
  const { pool, AppError, deny, str, num, one, canManage, todayISO, ctxFor } = D;
  const newId = p => p + crypto.randomBytes(6).toString('hex');
  const uniq = a => [...new Set(a)];
  const idList = v => uniq((Array.isArray(v) ? v : []).map(str).filter(Boolean));
  const safeId = s => /^[A-Za-z0-9_-]{1,64}$/.test(String(s));

  /* ---------- Lược đồ ---------- */
  const SCHEMA = `
CREATE TABLE IF NOT EXISTS workspaces (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed',
  open boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false, created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS workspace_members (workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (workspace_id, user_id));
CREATE TABLE IF NOT EXISTS departments (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name text NOT NULL,
  head_id text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS projects (id text PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, department_id text NOT NULL DEFAULT '',
  name text NOT NULL, description text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed', manager_id text NOT NULL DEFAULT '',
  open boolean NOT NULL DEFAULT false, share_all boolean NOT NULL DEFAULT false, archived boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS project_members (project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (project_id, user_id));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id text NOT NULL DEFAULT '${DEFAULT_PROJECT}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags jsonb NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position double precision NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS spawned_id text NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS series_id text NOT NULL DEFAULT '';
ALTER TABLE task_comments ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS task_assignees (task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (task_id, user_id));
CREATE TABLE IF NOT EXISTS task_attachments (id text PRIMARY KEY, task_id text NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, name text NOT NULL,
  mime text NOT NULL DEFAULT '', size bigint NOT NULL DEFAULT 0, uploaded_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS task_assignees_user ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS task_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS projects_ws ON projects(workspace_id);
`;
  async function migrate() {
    await pool.query(SCHEMA);
    const now = new Date().toISOString();
    // Không gian mặc định (mở cho cả công ty): nơi chứa mọi công việc có sẵn, gồm việc sinh từ báo cáo tuần.
    await pool.query(`INSERT INTO workspaces(id,name,description,open,created_at) VALUES($1,'Công ty','Không gian chung của cả công ty',true,$2) ON CONFLICT DO NOTHING`, [DEFAULT_WS, now]);
    await pool.query(`INSERT INTO departments(id,workspace_id,name) VALUES($1,$2,'Chung') ON CONFLICT DO NOTHING`, [DEFAULT_DEPT, DEFAULT_WS]);
    await pool.query(`INSERT INTO projects(id,workspace_id,department_id,name,description,open,created_at) VALUES($1,$2,$3,'Công việc chung','Công việc hằng ngày và việc sinh ra từ báo cáo tuần',true,$4) ON CONFLICT DO NOTHING`,
      [DEFAULT_PROJECT, DEFAULT_WS, DEFAULT_DEPT, now]);
    // Việc cũ chỉ có 1 người làm → đưa vào bảng nhiều người làm (chạy lại an toàn)
    await pool.query(`INSERT INTO task_assignees(task_id,user_id) SELECT t.id, t.assignee_id FROM tasks t
      WHERE t.assignee_id <> '' AND NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id) ON CONFLICT DO NOTHING`);
    try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch (e) { console.error('Không tạo được thư mục tệp đính kèm ' + UPLOAD_DIR + ': ' + e.message); }
  }

  /* ---------- Quyền ---------- */
  /** Quyền của người xem trong 1 dự án: 'admin' (Giám đốc) | 'pm' (quản lý dự án / trưởng phòng ban) | 'member' | null. */
  function projectAccess(c, p, members, deptHeadId) {
    const me = c.me;
    if (me.role === 'director') return 'admin';
    if (p.manager_id === me.id || (deptHeadId && deptHeadId === me.id)) return 'pm';
    if (p.open || members.has(me.id)) return 'member';
    for (const uid of members) if (canManage(c, uid)) return 'member';       // cấp trên của một thành viên
    return null;
  }
  const seesAll = (access, p) => access === 'admin' || access === 'pm' || !!(p && p.share_all);
  function taskVisible(c, access, p, t, assignees) {
    if (!access) return false;
    if (seesAll(access, p)) return true;
    return t.created_by === c.me.id || assignees.includes(c.me.id) || assignees.some(a => canManage(c, a));
  }
  function canEditTask(c, access, t, assignees) {
    if (!access) return false;
    if (access === 'admin' || access === 'pm') return true;
    return t.created_by === c.me.id || assignees.includes(c.me.id) || assignees.some(a => canManage(c, a));
  }
  function canDeleteTask(c, access, t, assignees) {
    if (access === 'admin' || access === 'pm') return true;
    if (t.created_by === c.me.id) return true;
    return !!access && assignees.length > 0 && assignees.every(a => a === c.me.id || canManage(c, a));
  }
  function canAssign(c, access, uid) {
    const u = c.byId[uid];
    if (!u || !u.active) return false;
    return uid === c.me.id || access === 'admin' || access === 'pm' || canManage(c, uid);
  }

  /** Dự án + thành viên + quyền của người xem. */
  async function projectCtx(c, projectId) {
    const p = await one(c.q, 'SELECT * FROM projects WHERE id=$1', [projectId]);
    if (!p) return null;
    const members = new Set((await c.q.query('SELECT user_id FROM project_members WHERE project_id=$1', [projectId])).rows.map(r => r.user_id));
    const dept = p.department_id ? await one(c.q, 'SELECT head_id FROM departments WHERE id=$1', [p.department_id]) : null;
    return { p, members, access: projectAccess(c, p, members, dept && dept.head_id) };
  }
  async function taskCtx(c, taskId) {
    const t = await one(c.q, 'SELECT * FROM tasks WHERE id=$1', [taskId]);
    if (!t) return null;
    const pc = await projectCtx(c, t.project_id);
    const assignees = await taskAssignees(c.q, t);
    return { t, assignees, p: pc ? pc.p : null, members: pc ? pc.members : new Set(), access: pc ? pc.access : (c.me.role === 'director' ? 'admin' : null) };
  }
  async function taskAssignees(q, t) {
    const ids = (await q.query('SELECT user_id FROM task_assignees WHERE task_id=$1', [t.id])).rows.map(r => r.user_id);
    if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
    return [...ids.filter(x => x === t.assignee_id), ...ids.filter(x => x !== t.assignee_id).sort()];     // người phụ trách chính đứng đầu
  }
  async function ensureMember(q, projectId, wsId, userId) {
    await q.query('INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [projectId, userId]);
    await q.query('INSERT INTO workspace_members(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [wsId, userId]);
  }

  /* ---------- Đọc dữ liệu ---------- */
  const jsonTask = (t, assignees, cc, ac) => ({
    id: t.id, projectId: t.project_id, title: t.title, description: t.description, status: t.status, priority: t.priority,
    assigneeIds: assignees, due: t.due, tags: t.tags || [], subtasks: t.subtasks || [], recurrence: t.recurrence || null,
    createdBy: t.created_by, createdAt: t.created_at, completedAt: t.completed_at, position: t.position,
    reportId: t.report_id || null, okrId: t.okr_id || null, seriesId: t.series_id || '', spawned: !!t.spawned_id, commentCount: cc || 0, attachCount: ac || 0,
  });
  /** Dữ liệu màn Công việc cho người xem: các workspace truy cập được + toàn bộ phòng ban/dự án/công việc của workspace đang chọn. */
  async function loadWork(viewer, wsId, users) {
    const c = ctxFor(viewer, users);
    const [wsr, wmr, dpr, prr, pmr] = await Promise.all([
      pool.query('SELECT * FROM workspaces ORDER BY seq'), pool.query('SELECT * FROM workspace_members'), pool.query('SELECT * FROM departments ORDER BY seq'),
      pool.query('SELECT * FROM projects ORDER BY seq'), pool.query('SELECT * FROM project_members'),
    ]);
    const group = (rows, key) => { const m = new Map(); rows.forEach(r => { if (!m.has(r[key])) m.set(r[key], new Set()); m.get(r[key]).add(r.user_id); }); return m; };
    const wsMem = group(wmr.rows, 'workspace_id'), prMem = group(pmr.rows, 'project_id');
    const deptById = new Map(dpr.rows.map(d => [d.id, d]));
    const isDir = c.me.role === 'director';
    const access = new Map();             // projectId → quyền
    prr.rows.forEach(p => { const a = projectAccess(c, p, prMem.get(p.id) || new Set(), p.department_id && deptById.get(p.department_id) ? deptById.get(p.department_id).head_id : ''); if (a) access.set(p.id, a); });
    const myWs = wsr.rows.filter(w => isDir || w.open || w.created_by === c.me.id || (wsMem.get(w.id) || new Set()).has(c.me.id)
      || prr.rows.some(p => p.workspace_id === w.id && access.has(p.id)) || dpr.rows.some(d => d.workspace_id === w.id && d.head_id === c.me.id));
    const current = myWs.find(w => w.id === wsId) || myWs.find(w => w.id === DEFAULT_WS) || myWs[0] || null;
    const projects = current ? prr.rows.filter(p => p.workspace_id === current.id && access.has(p.id)) : [];
    const pids = projects.map(p => p.id), pById = new Map(projects.map(p => [p.id, p]));
    let tasks = [];
    if (pids.length) {
      const [tr, ar] = await Promise.all([
        pool.query(`SELECT t.*, (SELECT count(*) FROM task_comments k WHERE k.task_id = t.id)::int AS cc, (SELECT count(*) FROM task_attachments a WHERE a.task_id = t.id)::int AS ac
                    FROM tasks t WHERE t.project_id = ANY($1) ORDER BY t.position, t.seq`, [pids]),
        pool.query('SELECT a.task_id, a.user_id FROM task_assignees a JOIN tasks t ON t.id = a.task_id WHERE t.project_id = ANY($1)', [pids]),
      ]);
      const asg = new Map(); ar.rows.forEach(r => { if (!asg.has(r.task_id)) asg.set(r.task_id, []); asg.get(r.task_id).push(r.user_id); });
      tasks = tr.rows.map(t => {
        const ids = asg.get(t.id) || []; if (t.assignee_id && !ids.includes(t.assignee_id)) ids.push(t.assignee_id);
        const ordered = [...ids.filter(x => x === t.assignee_id), ...ids.filter(x => x !== t.assignee_id).sort()];
        const p = pById.get(t.project_id);
        return taskVisible(c, access.get(t.project_id), p, t, ordered) ? jsonTask(t, ordered, t.cc, t.ac) : null;
      }).filter(Boolean);
    }
    return {
      workspaces: myWs.map(w => ({ id: w.id, name: w.name, description: w.description, color: w.color, open: w.open, archived: w.archived,
        memberIds: isDir ? [...(wsMem.get(w.id) || [])] : undefined })),
      currentId: current ? current.id : null,
      departments: current ? dpr.rows.filter(d => d.workspace_id === current.id).map(d => ({ id: d.id, name: d.name, headId: d.head_id })) : [],
      projects: projects.map(p => ({ id: p.id, workspaceId: p.workspace_id, departmentId: p.department_id, name: p.name, description: p.description, color: p.color,
        managerId: p.manager_id, open: p.open, shareAll: p.share_all, archived: p.archived, createdAt: p.created_at, access: access.get(p.id),
        memberIds: [...(prMem.get(p.id) || [])] })),
      tasks, viewerId: c.me.id, loadedAt: new Date().toISOString(),
    };
  }
  /** Chi tiết 1 công việc: bình luận + tệp đính kèm (chỉ người xem được việc mới nhận). */
  async function loadTaskDetail(c, taskId) {
    const tc = await taskCtx(c, taskId);
    if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) throw new AppError('Không tìm thấy công việc hoặc bạn không có quyền xem.');
    const [cm, at] = await Promise.all([
      pool.query('SELECT * FROM task_comments WHERE task_id=$1 ORDER BY seq', [taskId]),
      pool.query('SELECT * FROM task_attachments WHERE task_id=$1 ORDER BY seq', [taskId]),
    ]);
    return {
      comments: cm.rows.map(r => ({ id: r.id, authorId: r.author_id, text: r.text, createdAt: r.created_at, mentions: r.mentions || [] })),
      attachments: at.rows.map(a => ({ id: a.id, name: a.name, mime: a.mime, size: Number(a.size), uploadedBy: a.uploaded_by, createdAt: a.created_at })),
      canEdit: canEditTask(c, tc.access, tc.t, tc.assignees), canDelete: canDeleteTask(c, tc.access, tc.t, tc.assignees),
    };
  }

  /* ---------- Ghi: giá trị hợp lệ ---------- */
  const cleanTags = v => uniq((Array.isArray(v) ? v : []).map(x => str(x).trim().slice(0, 30)).filter(Boolean)).slice(0, 12);
  const cleanSubtasks = v => (Array.isArray(v) ? v : []).slice(0, 100).map(s => ({ id: safeId(s && s.id) ? String(s.id) : newId('s'), text: str(s && s.text).trim().slice(0, 300), done: !!(s && s.done) })).filter(s => s.text);
  const normDue = v => { const s = str(v).slice(0, 10); return validISO(s) ? s : ''; };

  async function nextPosition(q, projectId, status) {
    const r = await one(q, 'SELECT COALESCE(MAX(position), 0) + 1000 AS p FROM tasks WHERE project_id=$1 AND status=$2', [projectId, status]);
    return Number(r.p);
  }
  async function renumberColumn(q, projectId, status, movingId, beforeId) {
    const ids = (await q.query('SELECT id FROM tasks WHERE project_id=$1 AND status=$2 AND id <> $3 ORDER BY position, seq', [projectId, status, movingId])).rows.map(r => r.id);
    const at = beforeId ? ids.indexOf(beforeId) : -1;
    if (at >= 0) ids.splice(at, 0, movingId); else ids.push(movingId);
    await q.query('UPDATE tasks t SET position = v.ord * 1000 FROM unnest($1::text[]) WITH ORDINALITY AS v(id, ord) WHERE t.id = v.id', [ids]);
  }

  /**
   * Đổi trạng thái 1 công việc. Khi chuyển sang Done: ghi thời điểm hoàn thành và, nếu là việc lặp lại,
   * tự sinh việc kế tiếp từ cấu hình mẫu (mỗi việc chỉ sinh MỘT lần dù mở lại rồi làm xong lần nữa).
   * Trả về { spawned: { id, due } } nếu có việc mới.
   */
  async function applyStatus(c, t, status) {
    if (t.status === status) return {};
    const done = status === 'done';
    await c.q.query('UPDATE tasks SET status=$2, completed_at=$3 WHERE id=$1', [t.id, status, done ? new Date().toISOString() : '']);
    if (!done || !t.recurrence || t.spawned_id) return {};
    const rule = cleanRule(t.recurrence); if (!rule) return {};
    const due = nextDue(rule, t.due, todayISO()); if (!due) return {};
    const id = newId('t');
    await c.q.query(`INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,series_id)
      VALUES($1,$2,$3,$4,0,0,$5,'todo',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [id, t.title, t.assignee_id, t.okr_id || null, due, new Date().toISOString(), t.project_id, t.description, t.priority, JSON.stringify(t.tags || []),
       JSON.stringify((t.subtasks || []).map(s => ({ ...s, done: false }))), JSON.stringify(rule), t.created_by, await nextPosition(c.q, t.project_id, 'todo'), t.series_id || t.id]);
    await c.q.query('INSERT INTO task_assignees(task_id,user_id) SELECT $1, user_id FROM task_assignees WHERE task_id=$2 ON CONFLICT DO NOTHING', [id, t.id]);
    await c.q.query('INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [id, t.assignee_id]);
    await c.q.query('UPDATE tasks SET spawned_id=$2 WHERE id=$1', [t.id, id]);
    return { spawned: { id, due, title: t.title } };
  }

  /* ---------- Tệp đính kèm trên đĩa ---------- */
  const taskDir = taskId => path.join(UPLOAD_DIR, taskId);
  function removeTaskFiles(taskIds) {
    for (const id of taskIds || []) { if (!safeId(id)) continue; try { fs.rmSync(taskDir(id), { recursive: true, force: true }); } catch (e) { console.error('Không xoá được tệp của việc ' + id + ': ' + e.message); } }
  }
  const cleanFileName = s => { const n = path.basename(str(s).replace(/\\/g, '/')).replace(/[\u0000-\u001f<>:"|?*]/g, '_').trim().slice(0, 150); return n || 'tep'; };
  const extOf = name => (name.includes('.') ? name.split('.').pop() : '').toLowerCase();

  /* ====================== Các hành động (ghi) — gọi trong giao dịch của server.js ====================== */
  const actions = {
    /* ----- Workspace / Phòng ban: chỉ Giám đốc (Admin/Owner) ----- */
    async saveWorkspace(c, p) {
      if (c.me.role !== 'director') deny('Chỉ Giám đốc được tạo/sửa Workspace.');
      const w = p.workspace || {};
      if (!safeId(w.id) || !str(w.name).trim()) throw new AppError('Nhập tên Workspace.');
      const old = await one(c.q, 'SELECT * FROM workspaces WHERE id=$1', [w.id]);
      if (old && old.id === DEFAULT_WS && w.archived) throw new AppError('Không lưu trữ được Workspace mặc định.');
      const row = [w.id, str(w.name).trim().slice(0, 80), str(w.description).slice(0, 500), str(w.color) || '#2f6fed', old && old.id === DEFAULT_WS ? true : !!w.open, !!w.archived];
      if (old) await c.q.query('UPDATE workspaces SET name=$2, description=$3, color=$4, open=$5, archived=$6 WHERE id=$1', row);
      else await c.q.query('INSERT INTO workspaces(id,name,description,color,open,archived,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [...row, c.me.id, new Date().toISOString()]);
      if (Array.isArray(w.memberIds)) {
        const ids = idList(w.memberIds).filter(id => c.byId[id]);
        await c.q.query('DELETE FROM workspace_members WHERE workspace_id=$1', [w.id]);
        for (const id of ids) await c.q.query('INSERT INTO workspace_members(workspace_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [w.id, id]);
      }
    },
    async deleteWorkspace(c, p) {
      if (c.me.role !== 'director') deny('Chỉ Giám đốc được xoá Workspace.');
      if (p.id === DEFAULT_WS) throw new AppError('Không xoá được Workspace mặc định.');
      if (await one(c.q, 'SELECT 1 FROM projects WHERE workspace_id=$1 LIMIT 1', [p.id])) throw new AppError('Workspace còn dự án. Hãy xoá hoặc lưu trữ các dự án trước, hoặc dùng "Lưu trữ" Workspace.');
      await c.q.query('DELETE FROM workspaces WHERE id=$1', [p.id]);
    },
    async saveDepartment(c, p) {
      if (c.me.role !== 'director') deny('Chỉ Giám đốc được tạo/sửa phòng ban.');
      const d = p.department || {};
      if (!safeId(d.id) || !str(d.name).trim() || !safeId(d.workspaceId)) throw new AppError('Nhập tên phòng ban.');
      if (!(await one(c.q, 'SELECT 1 FROM workspaces WHERE id=$1', [d.workspaceId]))) throw new AppError('Workspace không tồn tại.');
      const head = str(d.headId);
      if (head && (!c.byId[head] || c.byId[head].role === 'employee')) throw new AppError('Trưởng phòng ban phải là Giám đốc, Trưởng phòng hoặc Quản lý.');
      const old = await one(c.q, 'SELECT workspace_id FROM departments WHERE id=$1', [d.id]);
      if (old && old.workspace_id !== d.workspaceId) throw new AppError('Không chuyển phòng ban sang Workspace khác được.');
      if (old) await c.q.query('UPDATE departments SET name=$2, head_id=$3 WHERE id=$1', [d.id, str(d.name).trim().slice(0, 80), head]);
      else await c.q.query('INSERT INTO departments(id,workspace_id,name,head_id) VALUES($1,$2,$3,$4)', [d.id, d.workspaceId, str(d.name).trim().slice(0, 80), head]);
    },
    async deleteDepartment(c, p) {
      if (c.me.role !== 'director') deny('Chỉ Giám đốc được xoá phòng ban.');
      if (p.id === DEFAULT_DEPT) throw new AppError('Không xoá được phòng ban mặc định.');
      if (await one(c.q, 'SELECT 1 FROM projects WHERE department_id=$1 LIMIT 1', [p.id])) throw new AppError('Phòng ban còn dự án. Hãy chuyển hoặc xoá các dự án trước.');
      await c.q.query('DELETE FROM departments WHERE id=$1', [p.id]);
    },

    /* ----- Dự án: Giám đốc, hoặc Trưởng phòng/Quản lý với dự án do mình quản lý ----- */
    async saveProject(c, p) {
      const j = p.project || {};
      if (!safeId(j.id) || !str(j.name).trim() || !safeId(j.workspaceId)) throw new AppError('Nhập tên dự án.');
      const isDir = c.me.role === 'director';
      const old = await one(c.q, 'SELECT * FROM projects WHERE id=$1', [j.id]);
      if (old && old.workspace_id !== j.workspaceId) throw new AppError('Không chuyển dự án sang Workspace khác được.');
      const ws = await one(c.q, 'SELECT * FROM workspaces WHERE id=$1', [j.workspaceId]);
      if (!ws) throw new AppError('Workspace không tồn tại.');
      let managerId;
      if (old) {
        if (!isDir && old.manager_id !== c.me.id) deny('Chỉ Giám đốc hoặc người quản lý dự án được sửa dự án này.');
        managerId = isDir ? str(j.managerId) : old.manager_id;
      } else {
        if (c.me.role === 'employee') deny('Chỉ Giám đốc, Trưởng phòng hoặc Quản lý được tạo dự án.');
        if (!isDir) {
          const wm = await one(c.q, 'SELECT 1 FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [ws.id, c.me.id]);
          const isHead = await one(c.q, 'SELECT 1 FROM departments WHERE workspace_id=$1 AND head_id=$2', [ws.id, c.me.id]);
          if (!ws.open && !wm && !isHead && ws.created_by !== c.me.id) deny('Bạn chưa thuộc Workspace này.');
        }
        managerId = isDir ? (str(j.managerId) || c.me.id) : c.me.id;
      }
      if (managerId && (!c.byId[managerId] || c.byId[managerId].role === 'employee' || !c.byId[managerId].active)) throw new AppError('Người quản lý dự án phải là Giám đốc, Trưởng phòng hoặc Quản lý đang hoạt động.');
      const dept = str(j.departmentId);
      if (dept && !(await one(c.q, 'SELECT 1 FROM departments WHERE id=$1 AND workspace_id=$2', [dept, ws.id]))) throw new AppError('Phòng ban không thuộc Workspace này.');
      if (old && old.id === DEFAULT_PROJECT && j.archived) throw new AppError('Không lưu trữ được dự án mặc định.');
      const open = old && old.id === DEFAULT_PROJECT ? true : !!j.open;
      const row = [j.id, ws.id, dept, str(j.name).trim().slice(0, 100), str(j.description).slice(0, 1000), str(j.color) || '#2f6fed', managerId, open, !!j.shareAll, !!j.archived];
      if (old) await c.q.query('UPDATE projects SET workspace_id=$2, department_id=$3, name=$4, description=$5, color=$6, manager_id=$7, open=$8, share_all=$9, archived=$10 WHERE id=$1', row);
      else await c.q.query('INSERT INTO projects(id,workspace_id,department_id,name,description,color,manager_id,open,share_all,archived,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [...row, c.me.id, new Date().toISOString()]);
      if (Array.isArray(j.memberIds) || !old) {
        // Người còn việc chưa xong trong dự án luôn giữ quyền truy cập, kẻo mất quyền xem chính việc được giao cho mình.
        const keep = (await c.q.query(`SELECT DISTINCT a.user_id FROM task_assignees a JOIN tasks t ON t.id = a.task_id WHERE t.project_id=$1 AND t.status <> 'done'`, [j.id])).rows.map(r => r.user_id);
        const ids = uniq([...idList(j.memberIds), managerId, c.me.id, ...keep].filter(id => id && c.byId[id]));
        await c.q.query('DELETE FROM project_members WHERE project_id=$1', [j.id]);
        for (const id of ids) await ensureMember(c.q, j.id, ws.id, id);
      }
    },
    async deleteProject(c, p) {
      const pc = await projectCtx(c, p.id); if (!pc) return;
      if (pc.access !== 'admin' && pc.p.manager_id !== c.me.id) deny('Chỉ Giám đốc hoặc người quản lý dự án được xoá dự án.');
      if (p.id === DEFAULT_PROJECT) throw new AppError('Không xoá được dự án mặc định.');
      const n = await one(c.q, 'SELECT count(*)::int AS n FROM tasks WHERE project_id=$1', [p.id]);
      if (n.n) throw new AppError('Dự án còn ' + n.n + ' công việc nên không xoá được. Hãy chuyển dự án sang "Lưu trữ" để giữ lại lịch sử.');
      await c.q.query('DELETE FROM projects WHERE id=$1', [p.id]);
    },

    /* ----- Công việc ----- */
    /** Tạo mới hoặc cập nhật đầy đủ 1 công việc (form chi tiết). */
    async saveTask(c, p) {
      const t = p.task || {};
      if (!safeId(t.id)) throw new AppError('Thiếu mã công việc.');
      const title = str(t.title).trim().slice(0, 300);
      if (!title) throw new AppError('Nhập tên công việc.');
      const old = await taskCtx(c, t.id);
      const projectId = old ? old.t.project_id : (safeId(t.projectId) ? t.projectId : DEFAULT_PROJECT);
      const pc = old ? { p: old.p, members: old.members, access: old.access } : await projectCtx(c, projectId);
      if (!pc || !pc.p) throw new AppError('Dự án không tồn tại.');
      if (!pc.access) deny('Bạn chưa tham gia dự án này.');
      if (!old && pc.p.archived) throw new AppError('Dự án đã lưu trữ, không thêm việc mới được.');
      if (old && !canEditTask(c, old.access, old.t, old.assignees)) deny('Bạn chỉ sửa được công việc của mình, của cấp dưới hoặc trong dự án bạn quản lý.');
      const status = STATUSES.includes(t.status) ? t.status : (old ? old.t.status : 'todo');
      const priority = PRIORITIES.includes(t.priority) ? t.priority : (old ? old.t.priority : 'medium');
      let assignees = idList(t.assigneeIds);
      if (!assignees.length) assignees = old ? old.assignees : [c.me.id];
      const prev = old ? old.assignees : [];
      for (const a of assignees) if (!prev.includes(a) && !canAssign(c, pc.access, a)) {
        const u = c.byId[a];
        throw new AppError(!u ? 'Người thực hiện không tồn tại.' : !u.active ? u.name + ' đã bị khoá tài khoản.' : 'Bạn chỉ giao được việc cho chính mình hoặc cấp dưới (' + u.name + ' ngoài phạm vi của bạn).');
      }
      let rule = cleanRule(t.recurrence), due = normDue(t.due);
      if (rule && !due) due = todayISO();
      if (rule && rule.end && due > rule.end) throw new AppError('Ngày kết thúc lặp lại phải sau hạn chót.');
      const tags = cleanTags(t.tags), subtasks = cleanSubtasks(t.subtasks), desc = str(t.description).slice(0, 20000);
      const okrId = old ? old.t.okr_id : (t.okrId ? str(t.okrId) : null);
      const result = {};
      if (old) {
        await c.q.query(`UPDATE tasks SET title=$2, description=$3, priority=$4, due=$5, tags=$6, subtasks=$7, recurrence=$8, assignee_id=$9 WHERE id=$1`,
          [t.id, title, desc, priority, due, JSON.stringify(tags), JSON.stringify(subtasks), rule ? JSON.stringify(rule) : null, assignees[0]]);
        if (old.t.status !== status) {
          Object.assign(result, await applyStatus(c, { ...old.t, due, recurrence: rule, title, description: desc, priority, tags, subtasks, assignee_id: assignees[0] }, status));
          await c.q.query('UPDATE tasks SET position=$2 WHERE id=$1', [t.id, await nextPosition(c.q, projectId, status)]);
        }
      } else {
        await c.q.query(`INSERT INTO tasks(id,title,assignee_id,okr_id,week,year,due,status,created_at,project_id,description,priority,tags,subtasks,recurrence,created_by,position,completed_at,series_id)
          VALUES($1,$2,$3,$4,0,0,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'')`,
          [t.id, title, assignees[0], okrId, due, status, new Date().toISOString(), projectId, desc, priority, JSON.stringify(tags), JSON.stringify(subtasks),
           rule ? JSON.stringify(rule) : null, c.me.id, await nextPosition(c.q, projectId, status), status === 'done' ? new Date().toISOString() : '']);
      }
      await c.q.query('DELETE FROM task_assignees WHERE task_id=$1 AND NOT (user_id = ANY($2))', [t.id, assignees]);
      for (const a of assignees) {
        await c.q.query('INSERT INTO task_assignees(task_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [t.id, a]);
        if (!pc.members.has(a) && !pc.p.open) await ensureMember(c.q, projectId, pc.p.workspace_id, a);      // người được giao tự vào dự án để thấy việc của mình
      }
      return result;
    },
    /** Kéo thả Kanban: đổi cột và/hoặc vị trí (đặt trước việc beforeId; không có = cuối cột). */
    async moveTask(c, p) {
      const tc = await taskCtx(c, p.id); if (!tc) throw new AppError('Không tìm thấy công việc.');
      if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny('Bạn chỉ chuyển được trạng thái việc của mình, của cấp dưới hoặc trong dự án bạn quản lý.');
      if (p.status !== undefined && !STATUSES.includes(p.status)) throw new AppError('Trạng thái không hợp lệ.');
      const status = p.status !== undefined ? p.status : tc.t.status;
      const result = await applyStatus(c, tc.t, status);
      await renumberColumn(c.q, tc.t.project_id, status, tc.t.id, safeId(p.beforeId) ? p.beforeId : '');
      return result;
    },
    /** Tương thích với màn báo cáo tuần: { id, patch: { status, title, due } }. */
    async updateTask(c, p) {
      const tc = await taskCtx(c, p.id); if (!tc) throw new AppError('Không tìm thấy công việc.');
      if (!canEditTask(c, tc.access, tc.t, tc.assignees)) deny();
      const s = p.patch || {};
      if (s.status !== undefined && !STATUSES.includes(s.status)) throw new AppError('Trạng thái không hợp lệ.');
      await c.q.query('UPDATE tasks SET title = COALESCE($2, title), due = COALESCE($3, due) WHERE id=$1',
        [p.id, s.title !== undefined ? str(s.title).slice(0, 300) : null, s.due !== undefined ? normDue(s.due) : null]);
      if (s.status !== undefined) {
        const fresh = await one(c.q, 'SELECT * FROM tasks WHERE id=$1', [p.id]);
        const r = await applyStatus(c, fresh, s.status);
        if (fresh.status !== s.status) await c.q.query('UPDATE tasks SET position=$2 WHERE id=$1', [p.id, await nextPosition(c.q, fresh.project_id, s.status)]);
        return r;
      }
      return {};
    },
    /** Tương thích bản giao diện cũ (form "Thêm công việc" đơn giản). */
    async addTask(c, p) {
      const t = p.task;
      if (!t || !t.id || !str(t.title).trim()) throw new AppError('Thiếu dữ liệu công việc.');
      return actions.saveTask(c, { task: { id: t.id, title: t.title, due: t.due, okrId: t.okrId, projectId: DEFAULT_PROJECT, assigneeIds: [t.assigneeId || c.me.id], status: 'todo' } });
    },
    async deleteTask(c, p) {
      const tc = await taskCtx(c, p.id); if (!tc) return;
      if (!canDeleteTask(c, tc.access, tc.t, tc.assignees)) deny('Bạn không được xoá công việc này.');
      await c.q.query('DELETE FROM tasks WHERE id=$1', [p.id]);
      removeTaskFiles([p.id]);
    },

    /* ----- Bình luận (có @nhắc tên) ----- */
    async addTaskComment(c, p) {
      const cm = p.comment || {};
      if (!safeId(cm.id) || !safeId(cm.taskId) || !str(cm.text).trim()) throw new AppError('Thiếu nội dung bình luận.');
      const tc = await taskCtx(c, cm.taskId); if (!tc) throw new AppError('Công việc không còn tồn tại.');
      if (!taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny();
      const mentions = idList(cm.mentions).filter(id => c.byId[id]).slice(0, 20);
      await c.q.query('INSERT INTO task_comments(id,task_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)',
        [cm.id, cm.taskId, c.me.id, str(cm.text).trim().slice(0, 4000), new Date().toISOString(), JSON.stringify(mentions)]);
    },
    async deleteTaskComment(c, p) {
      const row = await one(c.q, 'SELECT author_id, task_id FROM task_comments WHERE id=$1', [p.id]); if (!row) return;
      const tc = await taskCtx(c, row.task_id);
      if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny();
      if (row.author_id !== c.me.id && c.me.role !== 'director') deny('Chỉ người viết hoặc Giám đốc được xoá bình luận này.');
      await c.q.query('DELETE FROM task_comments WHERE id=$1', [p.id]);
    },
    async deleteAttachment(c, p) {
      const a = await one(c.q, 'SELECT * FROM task_attachments WHERE id=$1', [p.id]); if (!a) return;
      const tc = await taskCtx(c, a.task_id);
      if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny();
      if (a.uploaded_by !== c.me.id && !canEditTask(c, tc.access, tc.t, tc.assignees)) deny('Bạn không được xoá tệp này.');
      await c.q.query('DELETE FROM task_attachments WHERE id=$1', [p.id]);
      try { fs.rmSync(path.join(taskDir(a.task_id), a.id), { force: true }); } catch (e) { /* tệp đã mất thì thôi */ }
    },
  };

  /* ====================== Tải lên / tải xuống tệp (HTTP thô, không qua JSON) ====================== */
  /** Nhận 1 tệp (thân yêu cầu là dữ liệu thô). Trả về thông tin tệp đã lưu. */
  async function upload(c, req, params) {
    const taskId = str(params.taskId);
    if (!safeId(taskId)) throw new AppError('Thiếu mã công việc.');
    const name = cleanFileName(params.name), ext = extOf(name);
    if (!MIME[ext]) throw new AppError('Loại tệp .' + (ext || '?') + ' chưa được hỗ trợ. Hỗ trợ: ảnh, PDF, Word, Excel, PowerPoint, văn bản, CSV, ZIP.');
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > MAX_FILE) throw new AppError('Tệp quá lớn (tối đa ' + Math.round(MAX_FILE / 1048576) + 'MB).');
    const tc = await taskCtx(c, taskId); if (!tc) throw new AppError('Công việc không còn tồn tại.');
    if (!taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny();
    if (tc.p && tc.p.archived) throw new AppError('Dự án đã lưu trữ.');
    const cnt = await one(c.q, 'SELECT count(*)::int AS n FROM task_attachments WHERE task_id=$1', [taskId]);
    if (cnt.n >= MAX_FILES_PER_TASK) throw new AppError('Mỗi công việc tối đa ' + MAX_FILES_PER_TASK + ' tệp.');
    const id = newId('f'), dir = taskDir(taskId), file = path.join(dir, id);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { console.error(e); throw new AppError('Máy chủ chưa cấu hình được nơi lưu tệp.'); }
    let size = 0;
    const counter = new Transform({ transform(chunk, _enc, cb) { size += chunk.length; if (size > MAX_FILE) cb(new AppError('Tệp quá lớn (tối đa ' + Math.round(MAX_FILE / 1048576) + 'MB).')); else cb(null, chunk); } });
    try {
      await pipeline(req, counter, fs.createWriteStream(file, { flags: 'wx', mode: 0o640 }));
      if (!size) throw new AppError('Tệp rỗng.');
      const now = new Date().toISOString();
      await c.q.query('INSERT INTO task_attachments(id,task_id,name,mime,size,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)', [id, taskId, name, MIME[ext], size, c.me.id, now]);
      return { id, name, mime: MIME[ext], size, uploadedBy: c.me.id, createdAt: now };
    } catch (e) { try { fs.rmSync(file, { force: true }); } catch (_) {} throw e; }
  }
  /** Gửi tệp về trình duyệt. Ảnh/PDF xem trực tiếp; còn lại luôn tải xuống. */
  async function download(c, res, attId) {
    if (!safeId(attId)) throw new AppError('Tệp không hợp lệ.');
    const a = await one(c.q, 'SELECT * FROM task_attachments WHERE id=$1', [attId]);
    if (!a) throw new AppError('Không tìm thấy tệp.');
    const tc = await taskCtx(c, a.task_id);
    if (!tc || !taskVisible(c, tc.access, tc.p, tc.t, tc.assignees)) deny('Bạn không có quyền xem tệp này.');
    const file = path.join(taskDir(a.task_id), a.id);
    let st; try { st = fs.statSync(file); } catch (e) { throw new AppError('Tệp không còn trên máy chủ.'); }
    const inline = INLINE_EXT.has(extOf(a.name));
    res.writeHead(200, {
      'Content-Type': a.mime || 'application/octet-stream', 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': (inline ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(a.name),
      'Cache-Control': 'private, max-age=300', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    });
    fs.createReadStream(file).pipe(res);
  }

  return { SCHEMA, migrate, actions, loadWork, loadTaskDetail, upload, download, removeTaskFiles, STATUSES, DEFAULT_PROJECT };
};
module.exports.recurrence = { cleanRule, nextAfter, nextDue, validISO };

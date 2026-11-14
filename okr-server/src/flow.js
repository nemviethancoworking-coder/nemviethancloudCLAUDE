/**
 * OKR Weekly — Module Quy trình (v22), kiểu Base Workflow.
 *   Quy trình (workflow) → Giai đoạn (stage) → Job. Job đi tuần tự qua các giai đoạn và kết thúc ở Hoàn thành / Thất bại.
 *
 * Quyền (lọc tại máy chủ):
 *   TẠO quy trình      : Giám đốc, Trưởng phòng (người tạo là owner).
 *   QUẢN LÝ quy trình  : owner + Giám đốc (giai đoạn, SLA, todo mẫu, trường tuỳ chỉnh, lý do thất bại, chuyển tiếp, thành viên, lưu trữ, mở lại job).
 *   XEM / BÌNH LUẬN    : thành viên của quy trình (Giám đốc luôn thấy tất cả). Mọi thành viên tạo được job.
 *   SỬA job            : người tạo, người thực hiện, owner, Giám đốc.
 *   CHUYỂN giai đoạn / Hoàn thành / Thất bại / chuyển tiếp : người thực hiện hiện tại, owner, Giám đốc.
 *   XOÁ job            : chỉ Giám đốc (owner chỉ Lưu trữ job đã đóng).
 *
 * Dữ liệu: bảng wf_* (tự tạo khi máy chủ khởi động). Tệp đính kèm lưu ở UPLOAD_DIR/wf/<mã job>/<mã tệp>.
 * Mô-đun được nạp bằng require('./flow')(deps) để dùng chung kết nối, lỗi và hàm làm sạch văn bản với server.js / work.js.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const FIELD_TYPES = ['text', 'textarea', 'number', 'money', 'date', 'select', 'multiselect', 'user', 'checkbox', 'link', 'file'];
const LIM = { stages: 20, todos: 30, fields: 30, reasons: 30, rules: 20, members: 300, tags: 10, files: 30, options: 50 };
const MAX_CHAIN = 8;                       // chuyển tiếp tự động nối tiếp tối đa 8 quy trình (chặn vòng lặp)

/* ====================== Mẫu quy trình dựng sẵn (nằm trong mã, không cần bảng) ====================== */
const TEMPLATES = {
  blank: {
    name: 'Quy trình trống', description: 'Hai giai đoạn cơ bản, bạn tự thêm/sửa trong Cài đặt.',
    stages: [{ name: 'Tiếp nhận', sla: 24, todos: [] }, { name: 'Xử lý', sla: 48, todos: [] }], fields: [], reasons: [],
  },
  recruit: {
    name: 'Tuyển dụng', description: 'Từ tiếp nhận hồ sơ ứng viên đến nhận việc.',
    stages: [
      { name: 'Tiếp nhận hồ sơ', sla: 24, todos: [['Kiểm tra hồ sơ đủ', true]] },
      { name: 'Sàng lọc CV', sla: 48, todos: [['Đánh giá CV theo mô tả công việc (JD)', true], ['Gọi điện sơ bộ', false]] },
      { name: 'Phỏng vấn vòng 1', sla: 72, todos: [['Xếp lịch phỏng vấn', true], ['Điền phiếu đánh giá phỏng vấn', true]] },
      { name: 'Phỏng vấn vòng 2', sla: 72, todos: [['Điền phiếu đánh giá phỏng vấn', true]] },
      { name: 'Đề nghị (offer)', sla: 48, todos: [['Soạn thư mời nhận việc', true], ['Thoả thuận lương và ngày nhận việc', false]] },
      { name: 'Nhận việc', sla: 120, todos: [['Ký hợp đồng', true], ['Bàn giao thiết bị, tài khoản', false]] },
    ],
    fields: [
      { name: 'Vị trí ứng tuyển', type: 'select', options: ['Nhân viên kinh doanh', 'Nhân viên marketing', 'Kế toán', 'Khác'], required: true },
      { name: 'Nguồn hồ sơ', type: 'select', options: ['Facebook', 'Zalo', 'Website tuyển dụng', 'Người giới thiệu', 'Khác'] },
      { name: 'Số điện thoại', type: 'text' }, { name: 'Email', type: 'text' },
      { name: 'Link CV', type: 'link' }, { name: 'File CV', type: 'file' },
      { name: 'Mức lương mong muốn', type: 'money' }, { name: 'Ngày có thể đi làm', type: 'date' }, { name: 'Người giới thiệu', type: 'user' },
    ],
    reasons: ['Không đạt CV', 'Không đạt phỏng vấn', 'Ứng viên từ chối offer', 'Ứng viên không phản hồi', 'Hết nhu cầu tuyển'],
  },
};

module.exports = function makeFlow(D) {
  const { pool, AppError, deny, str, num, one, W } = D;
  const { MIME, INLINE_EXT, MAX_FILE, UPLOAD_DIR, cleanFileName, extOf, safeId } = W.files;
  const newId = p => p + crypto.randomBytes(6).toString('hex');
  const uniq = a => [...new Set(a)];
  const idList = v => uniq((Array.isArray(v) ? v : []).map(str).filter(Boolean));
  const nowISO = () => new Date().toISOString();
  const todayISO = D.todayISO;
  const clipText = (s, n) => str(s).replace(/\s+/g, ' ').trim().slice(0, n);
  const validISO = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(new Date(s + 'T00:00:00Z').getTime()) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
  const isDirector = c => c.me.role === 'director';
  const canCreateWorkflow = c => c.me.role === 'director' || c.me.role === 'head';
  const fileRoot = () => path.join(UPLOAD_DIR, 'wf');
  const jobDir = id => path.join(fileRoot(), id);

  /* ---------- Lược đồ ---------- */
  const SCHEMA = `
CREATE TABLE IF NOT EXISTS wf_workflows (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#2f6fed',
  archived boolean NOT NULL DEFAULT false, created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE TABLE IF NOT EXISTS wf_members (workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, user_id text NOT NULL, is_owner boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false, PRIMARY KEY (workflow_id, user_id));
CREATE INDEX IF NOT EXISTS wf_members_user ON wf_members(user_id);
CREATE TABLE IF NOT EXISTS wf_stages (id text PRIMARY KEY, workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, name text NOT NULL, pos int NOT NULL DEFAULT 0,
  sla_hours double precision, assignees jsonb NOT NULL DEFAULT '[]');
CREATE INDEX IF NOT EXISTS wf_stages_wf ON wf_stages(workflow_id);
CREATE TABLE IF NOT EXISTS wf_stage_todos (id text PRIMARY KEY, stage_id text NOT NULL REFERENCES wf_stages(id) ON DELETE CASCADE, title text NOT NULL, required boolean NOT NULL DEFAULT false, pos int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS wf_fields (id text PRIMARY KEY, workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, name text NOT NULL, type text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]', required boolean NOT NULL DEFAULT false, pos int NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS wf_fields_wf ON wf_fields(workflow_id);
CREATE TABLE IF NOT EXISTS wf_fail_reasons (id text PRIMARY KEY, workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, text text NOT NULL, pos int NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS wf_forward_rules (id text PRIMARY KEY, workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, stage_id text NOT NULL DEFAULT '',
  target_workflow_id text NOT NULL, mode text NOT NULL DEFAULT 'manual', field_map jsonb NOT NULL DEFAULT '{}', seq bigserial);
CREATE TABLE IF NOT EXISTS wf_jobs (id text PRIMARY KEY, workflow_id text NOT NULL REFERENCES wf_workflows(id) ON DELETE CASCADE, title text NOT NULL, description text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'medium', due text NOT NULL DEFAULT '', tags jsonb NOT NULL DEFAULT '[]', stage_id text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'open',
  fail_reason text NOT NULL DEFAULT '', field_values jsonb NOT NULL DEFAULT '{}', created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '',
  stage_entered_at text NOT NULL DEFAULT '', sla_due_at text NOT NULL DEFAULT '', sla_notified text NOT NULL DEFAULT '', closed_at text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false, forwarded_from text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_jobs_wf ON wf_jobs(workflow_id);
CREATE TABLE IF NOT EXISTS wf_job_assignees (job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, user_id text NOT NULL, seq bigserial, PRIMARY KEY (job_id, user_id));
CREATE INDEX IF NOT EXISTS wf_job_assignees_user ON wf_job_assignees(user_id);
CREATE TABLE IF NOT EXISTS wf_job_followers (job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, user_id text NOT NULL, PRIMARY KEY (job_id, user_id));
CREATE INDEX IF NOT EXISTS wf_job_followers_user ON wf_job_followers(user_id);
CREATE TABLE IF NOT EXISTS wf_todos (id text PRIMARY KEY, job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, stage_id text NOT NULL DEFAULT '', tpl_id text NOT NULL DEFAULT '',
  title text NOT NULL, required boolean NOT NULL DEFAULT false, assignee_id text NOT NULL DEFAULT '', done boolean NOT NULL DEFAULT false, done_by text NOT NULL DEFAULT '',
  done_at text NOT NULL DEFAULT '', created_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_todos_job ON wf_todos(job_id);
CREATE INDEX IF NOT EXISTS wf_todos_assignee ON wf_todos(assignee_id);
CREATE TABLE IF NOT EXISTS wf_comments (id text PRIMARY KEY, job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, author_id text NOT NULL DEFAULT '', text text NOT NULL,
  created_at text NOT NULL DEFAULT '', is_system boolean NOT NULL DEFAULT false, mentions jsonb NOT NULL DEFAULT '[]', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_comments_job ON wf_comments(job_id);
CREATE TABLE IF NOT EXISTS wf_files (id text PRIMARY KEY, job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, field_id text NOT NULL DEFAULT '', name text NOT NULL,
  mime text NOT NULL DEFAULT '', size bigint NOT NULL DEFAULT 0, uploaded_by text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_files_job ON wf_files(job_id);
CREATE TABLE IF NOT EXISTS wf_activity (id text PRIMARY KEY, workflow_id text NOT NULL, job_id text NOT NULL DEFAULT '', actor_id text NOT NULL DEFAULT '', kind text NOT NULL,
  detail text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_activity_wf ON wf_activity(workflow_id, seq DESC);
CREATE INDEX IF NOT EXISTS wf_activity_job ON wf_activity(job_id);
CREATE TABLE IF NOT EXISTS wf_stage_log (seq bigserial PRIMARY KEY, job_id text NOT NULL REFERENCES wf_jobs(id) ON DELETE CASCADE, stage_id text NOT NULL, entered_at text NOT NULL, left_at text NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS wf_stage_log_job ON wf_stage_log(job_id);
CREATE TABLE IF NOT EXISTS wf_forward_log (id text PRIMARY KEY, rule_id text NOT NULL DEFAULT '', from_job_id text NOT NULL, to_job_id text NOT NULL, from_workflow_id text NOT NULL,
  to_workflow_id text NOT NULL, mode text NOT NULL DEFAULT 'manual', actor_id text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '', seq bigserial);
CREATE INDEX IF NOT EXISTS wf_forward_log_from ON wf_forward_log(from_job_id);
CREATE INDEX IF NOT EXISTS wf_forward_log_to ON wf_forward_log(to_job_id);
`;
  async function migrate() {
    await pool.query(SCHEMA);
    try { fs.mkdirSync(fileRoot(), { recursive: true }); } catch (e) { console.error('Không tạo được thư mục tệp Quy trình ' + fileRoot() + ': ' + e.message); }
  }

  /* ---------- Ngữ cảnh & quyền ---------- */
  async function wfCtx(c, id) {
    const w = await one(c.q, 'SELECT * FROM wf_workflows WHERE id=$1', [id]);
    if (!w) return null;
    const rows = (await c.q.query('SELECT user_id, is_owner, pinned FROM wf_members WHERE workflow_id=$1', [id])).rows;
    const members = new Map(rows.map(r => [r.user_id, r]));
    const mine = members.get(c.me.id), dir = isDirector(c);
    return { w, members, isMember: !!mine, isOwner: !!(mine && mine.is_owner), canView: dir || !!mine, canManage: dir || !!(mine && mine.is_owner) };
  }
  async function jobCtx(c, jobId) {
    const j = await one(c.q, 'SELECT * FROM wf_jobs WHERE id=$1', [jobId]);
    if (!j) return null;
    const wc = await wfCtx(c, j.workflow_id);
    const assignees = (await c.q.query('SELECT user_id FROM wf_job_assignees WHERE job_id=$1 ORDER BY seq', [jobId])).rows.map(r => r.user_id);
    const followers = (await c.q.query('SELECT user_id FROM wf_job_followers WHERE job_id=$1', [jobId])).rows.map(r => r.user_id);
    const me = c.me.id;
    return { j, wc, assignees, followers,
      canView: !!(wc && wc.canView),
      canEdit: !!(wc && (wc.canManage || j.created_by === me || assignees.includes(me))),
      canMove: !!(wc && (wc.canManage || assignees.includes(me))) };
  }
  const needView = (jc, msg) => { if (!jc || !jc.canView) deny(msg || 'Bạn không phải thành viên của quy trình này.'); };
  async function loadConfig(q, wfId) {
    const [st, td, fl, rs, ru] = await Promise.all([
      q.query('SELECT * FROM wf_stages WHERE workflow_id=$1 ORDER BY pos', [wfId]),
      q.query('SELECT t.* FROM wf_stage_todos t JOIN wf_stages s ON s.id = t.stage_id WHERE s.workflow_id=$1 ORDER BY t.pos', [wfId]),
      q.query('SELECT * FROM wf_fields WHERE workflow_id=$1 ORDER BY pos', [wfId]),
      q.query('SELECT * FROM wf_fail_reasons WHERE workflow_id=$1 ORDER BY pos', [wfId]),
      q.query('SELECT * FROM wf_forward_rules WHERE workflow_id=$1 ORDER BY seq', [wfId]),
    ]);
    const todosBy = {}; td.rows.forEach(t => { (todosBy[t.stage_id] = todosBy[t.stage_id] || []).push({ id: t.id, title: t.title, required: t.required }); });
    return {
      stages: st.rows.map(s => ({ id: s.id, name: s.name, pos: s.pos, slaHours: s.sla_hours === null ? null : Number(s.sla_hours), assigneeIds: idList(s.assignees), todos: todosBy[s.id] || [] })),
      fields: fl.rows.map(f => ({ id: f.id, name: f.name, type: f.type, options: Array.isArray(f.options) ? f.options : [], required: f.required })),
      failReasons: rs.rows.map(r => ({ id: r.id, text: r.text })),
      forwardRules: ru.rows.map(r => ({ id: r.id, stageId: r.stage_id, targetWorkflowId: r.target_workflow_id, mode: r.mode, fieldMap: r.field_map || {} })),
    };
  }

  /* ---------- Chuẩn hoá dữ liệu ---------- */
  const slaDue = (enteredISO, hours) => (hours && hours > 0) ? new Date(new Date(enteredISO).getTime() + hours * 3600e3).toISOString() : '';
  const emptyVal = (f, v, fileCount) => {
    if (f.type === 'checkbox') return v !== true;                       // ô tick bắt buộc = phải tick
    if (f.type === 'file') return !fileCount;
    if (f.type === 'multiselect') return !Array.isArray(v) || !v.length;
    return v === undefined || v === null || String(v).trim() === '';
  };
  /** Làm sạch giá trị trường tuỳ chỉnh theo kiểu; chỉ giữ trường thuộc quy trình (trừ kiểu tệp: dữ liệu nằm ở wf_files). */
  function cleanFieldValues(c, fields, input) {
    const src = input && typeof input === 'object' ? input : {}, out = {};
    for (const f of fields) {
      if (f.type === 'file' || !(f.id in src)) continue;
      const v = src[f.id];
      switch (f.type) {
        case 'text': { const s = clipText(v, 500); if (s) out[f.id] = s; break; }
        case 'textarea': { const s = W.cleanText(v, 5000); if (W.plainOf(s).trim()) out[f.id] = s; break; }
        case 'number': case 'money': { if (v === '' || v === null || v === undefined) break; const n = Number(v); if (!Number.isFinite(n)) throw new AppError('Trường "' + f.name + '" cần nhập số.'); out[f.id] = n; break; }
        case 'date': { if (!v) break; if (!validISO(v)) throw new AppError('Trường "' + f.name + '" cần nhập ngày hợp lệ.'); out[f.id] = v; break; }
        case 'select': { if (!v) break; if (!f.options.includes(v)) throw new AppError('Giá trị "' + clipText(v, 40) + '" không nằm trong danh sách của trường "' + f.name + '".'); out[f.id] = v; break; }
        case 'multiselect': { const a = uniq((Array.isArray(v) ? v : []).map(str)).filter(x => f.options.includes(x)); if (a.length) out[f.id] = a; break; }
        case 'user': { if (!v) break; if (!c.byId[v]) throw new AppError('Trường "' + f.name + '": người được chọn không tồn tại.'); out[f.id] = str(v); break; }
        case 'checkbox': { if (v === true) out[f.id] = true; break; }
        case 'link': { const s = str(v).trim().slice(0, 500); if (!s) break; if (!/^https?:\/\/[^\s<>"']+$/i.test(s)) throw new AppError('Trường "' + f.name + '" cần là đường link bắt đầu bằng http:// hoặc https://.'); out[f.id] = s; break; }
        default: break;
      }
    }
    return out;
  }
  async function checkRequiredFields(c, fields, values, jobId) {
    const files = jobId ? (await c.q.query('SELECT field_id, count(*)::int AS n FROM wf_files WHERE job_id=$1 GROUP BY field_id', [jobId])).rows : [];
    const cnt = {}; files.forEach(r => { cnt[r.field_id] = r.n; });
    const miss = fields.filter(f => f.required && emptyVal(f, values[f.id], cnt[f.id]));
    if (miss.length) throw new AppError('Còn trường bắt buộc chưa nhập: ' + miss.slice(0, 4).map(f => f.name).join(', ') + (miss.length > 4 ? '…' : '') + '.');
  }
  function cleanTags(v) { return uniq((Array.isArray(v) ? v : []).map(t => clipText(t, 30)).filter(Boolean)).slice(0, LIM.tags); }

  /* ---------- Nhật ký & bình luận hệ thống ---------- */
  async function logAct(c, wfId, jobId, kind, detail) {
    await c.q.query('INSERT INTO wf_activity(id,workflow_id,job_id,actor_id,kind,detail,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [newId('wa'), wfId, jobId || '', c.me.id, kind, JSON.stringify(detail || {}), nowISO()]);
  }
  async function sysComment(c, jobId, text) {
    await c.q.query('INSERT INTO wf_comments(id,job_id,author_id,text,created_at,is_system) VALUES($1,$2,$3,$4,$5,true)', [newId('wc'), jobId, c.me.id, text, nowISO()]);
  }
  const noteJob = (j, wf, stageName, extra) => ({ id: j.id, title: j.title, wfId: j.workflow_id || (wf && wf.id) || '', wfName: wf ? wf.name : '', stage: stageName || '', ...(extra || {}) });

  /* ---------- Kiểm tra người ---------- */
  function checkPeople(c, wc, ids, what) {
    for (const id of ids) {
      const u = c.byId[id];
      if (!u) throw new AppError(what + ' không tồn tại.');
      if (u.active === false) throw new AppError(u.name + ' đã bị khoá tài khoản, không chọn làm ' + what.toLowerCase() + ' được.');
      if (!wc.members.has(id) && u.role !== 'director') throw new AppError(u.name + ' chưa là thành viên của quy trình. Hãy thêm vào tab Thành viên trước.');
    }
  }
  async function writeAssignees(c, jobId, ids) {
    await c.q.query('DELETE FROM wf_job_assignees WHERE job_id=$1', [jobId]);
    for (const id of ids) await c.q.query('INSERT INTO wf_job_assignees(job_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [jobId, id]);
  }
  async function writeFollowers(c, jobId, ids) {
    await c.q.query('DELETE FROM wf_job_followers WHERE job_id=$1', [jobId]);
    for (const id of ids) await c.q.query('INSERT INTO wf_job_followers(job_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [jobId, id]);
  }

  /* ---------- Vào giai đoạn: nhật ký thời gian, SLA, todo mẫu ---------- */
  async function ensureStageTodos(c, jobId, stage, assigneeId, now) {
    const tpls = (await c.q.query('SELECT * FROM wf_stage_todos WHERE stage_id=$1 ORDER BY pos', [stage.id])).rows;
    for (const t of tpls) {
      const ex = await one(c.q, 'SELECT 1 FROM wf_todos WHERE job_id=$1 AND stage_id=$2 AND tpl_id=$3', [jobId, stage.id, t.id]);
      if (ex) continue;
      await c.q.query('INSERT INTO wf_todos(id,job_id,stage_id,tpl_id,title,required,assignee_id,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [newId('wt'), jobId, stage.id, t.id, t.title, t.required, assigneeId || '', c.me.id, now]);
    }
  }
  async function enterStage(c, j, stage, assigneeIds, now) {
    await c.q.query('UPDATE wf_stage_log SET left_at=$2 WHERE job_id=$1 AND left_at=\'\'', [j.id, now]);
    await c.q.query('INSERT INTO wf_stage_log(job_id,stage_id,entered_at) VALUES($1,$2,$3)', [j.id, stage.id, now]);
    await c.q.query("UPDATE wf_jobs SET stage_id=$2, stage_entered_at=$3, sla_due_at=$4, sla_notified='', status='open', fail_reason='', closed_at='' WHERE id=$1",
      [j.id, stage.id, now, slaDue(now, stage.slaHours)]);
    await ensureStageTodos(c, j.id, stage, assigneeIds[0], now);
  }
  const stageAssignees = (c, wc, stage, fallback) => {
    const ok = idList(stage.assigneeIds).filter(id => c.byId[id] && c.byId[id].active !== false && (wc.members.has(id) || c.byId[id].role === 'director'));
    return ok.length ? ok : fallback;
  };

  /* ---------- Chuyển tiếp job sang quy trình khác ---------- */
  async function chainLength(q, jobId) {
    let n = 0, id = jobId;
    while (id && n <= MAX_CHAIN + 1) { const r = await one(q, 'SELECT forwarded_from FROM wf_jobs WHERE id=$1', [id]); id = r ? r.forwarded_from : ''; if (id) n++; }
    return n;
  }
  /** Tạo job mới ở quy trình đích từ job nguồn theo luật chuyển tiếp. Trả về job mới (hoặc null khi bị chặn). */
  async function forwardJob(c, src, srcStageName, rule, mode) {
    const twc = await wfCtx(c, rule.target_workflow_id);
    if (!twc || twc.w.archived) return null;
    if (await chainLength(c.q, src.id) >= MAX_CHAIN) return null;
    const tcfg = await loadConfig(c.q, twc.w.id);
    if (!tcfg.stages.length) return null;
    const scfg = await loadConfig(c.q, src.workflow_id);
    const first = tcfg.stages[0], now = nowISO(), id = newId('wj');
    // Trường: ánh xạ owner đặt (đích ← nguồn), còn lại tự khớp theo tên + kiểu; không chép trường tệp
    const sv = src.field_values || {}, tv = {}, map = rule.field_map || {};
    for (const tf of tcfg.fields) {
      if (tf.type === 'file') continue;
      let sf = scfg.fields.find(f => f.id === map[tf.id]);
      if (!sf) sf = scfg.fields.find(f => f.type === tf.type && f.name.trim().toLowerCase() === tf.name.trim().toLowerCase());
      if (!sf || sf.type !== tf.type || !(sf.id in sv)) continue;
      let v = sv[sf.id];
      if ((tf.type === 'select') && !tf.options.includes(v)) continue;
      if (tf.type === 'multiselect') { v = (Array.isArray(v) ? v : []).filter(x => tf.options.includes(x)); if (!v.length) continue; }
      tv[tf.id] = v;
    }
    const assignees = stageAssignees(c, twc, first, twc.members.has(c.me.id) || isDirector(c) ? [c.me.id] : []);
    const srcFollowers = (await c.q.query('SELECT user_id FROM wf_job_followers WHERE job_id=$1', [src.id])).rows.map(r => r.user_id)
      .filter(u => twc.members.has(u) && !assignees.includes(u) && c.byId[u] && c.byId[u].active !== false);
    await c.q.query(`INSERT INTO wf_jobs(id,workflow_id,title,description,priority,due,tags,stage_id,status,field_values,created_by,created_at,stage_entered_at,sla_due_at,forwarded_from)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,$11,$11,$12,$13)`,
      [id, twc.w.id, src.title, src.description, src.priority, src.due, JSON.stringify(src.tags || []), first.id, JSON.stringify(tv), c.me.id, now, slaDue(now, first.slaHours), src.id]);
    await c.q.query('INSERT INTO wf_stage_log(job_id,stage_id,entered_at) VALUES($1,$2,$3)', [id, first.id, now]);
    await writeAssignees(c, id, assignees);
    await writeFollowers(c, id, srcFollowers);
    await ensureStageTodos(c, id, first, assignees[0], now);
    await c.q.query('INSERT INTO wf_forward_log(id,rule_id,from_job_id,to_job_id,from_workflow_id,to_workflow_id,mode,actor_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [newId('wl'), rule.id, src.id, id, src.workflow_id, twc.w.id, mode, c.me.id, now]);
    const srcWf = await one(c.q, 'SELECT name FROM wf_workflows WHERE id=$1', [src.workflow_id]);
    await sysComment(c, src.id, 'Đã chuyển tiếp sang quy trình "' + twc.w.name + '" (' + (mode === 'auto' ? 'tự động' : 'thủ công') + ').');
    await sysComment(c, id, 'Được chuyển tiếp từ quy trình "' + (srcWf ? srcWf.name : '') + '"' + (srcStageName ? ' (giai đoạn ' + srcStageName + ')' : '') + '.');
    await logAct(c, src.workflow_id, src.id, 'job.forward', { to: id, toWorkflow: twc.w.name, mode });
    await logAct(c, twc.w.id, id, 'job.create', { from: src.id, fromWorkflow: srcWf ? srcWf.name : '', forward: true });
    const nj = { id, title: src.title, workflow_id: twc.w.id };
    if (c.notes && assignees.length) c.notes.push({ kind: 'wfAssigned', to: assignees.filter(u => u !== c.me.id), actorId: c.me.id, job: noteJob(nj, twc.w, first.name, { priority: src.priority, due: src.due, fromForward: true }) });
    return nj;
  }
  /** Chạy các luật chuyển tiếp TỰ ĐỘNG của (quy trình nguồn, giai đoạn) cho job vừa vào giai đoạn / vừa Hoàn thành (stageId rỗng). */
  async function runAutoForward(c, jobId, stageId, stageName) {
    const src = await one(c.q, 'SELECT * FROM wf_jobs WHERE id=$1', [jobId]);
    const rules = (await c.q.query("SELECT * FROM wf_forward_rules WHERE workflow_id=$1 AND stage_id=$2 AND mode='auto' ORDER BY seq", [src.workflow_id, stageId])).rows;
    const made = [];
    for (const r of rules) {
      if (await one(c.q, 'SELECT 1 FROM wf_forward_log WHERE from_job_id=$1 AND rule_id=$2', [jobId, r.id])) continue;
      const nj = await forwardJob(c, src, stageName, r, 'auto');
      if (nj) made.push(nj);
    }
    return made;
  }

  /* ====================== Đọc dữ liệu ====================== */
  function jobJson(j, ex) {
    ex = ex || {};
    return { id: j.id, workflowId: j.workflow_id, title: j.title, priority: j.priority, due: j.due, tags: Array.isArray(j.tags) ? j.tags : [], stageId: j.stage_id, status: j.status,
      failReason: j.fail_reason, assigneeIds: ex.assignees || [], followerIds: ex.followers || [], createdBy: j.created_by, createdAt: j.created_at, stageEnteredAt: j.stage_entered_at,
      slaDueAt: j.sla_due_at, closedAt: j.closed_at, archived: j.archived, forwardedFrom: j.forwarded_from, fieldValues: j.field_values || {},
      todoTotal: ex.todoTotal || 0, todoDone: ex.todoDone || 0, todoReqOpen: ex.todoReqOpen || 0, commentCount: ex.commentCount || 0, fileCount: ex.fileCount || 0, fwd: ex.fwd || 0 };
  }
  async function jobExtras(q, jobRows) {
    const ids = jobRows.map(j => j.id), by = {};
    const get = id => (by[id] = by[id] || { assignees: [], followers: [] });
    if (!ids.length) return by;
    const [as, fo, td, cm, fl, fw] = await Promise.all([
      q.query('SELECT job_id, user_id FROM wf_job_assignees WHERE job_id = ANY($1) ORDER BY seq', [ids]),
      q.query('SELECT job_id, user_id FROM wf_job_followers WHERE job_id = ANY($1)', [ids]),
      q.query(`SELECT t.job_id, count(*)::int AS total, count(*) FILTER (WHERE t.done)::int AS done, count(*) FILTER (WHERE t.required AND NOT t.done)::int AS req_open
        FROM wf_todos t JOIN wf_jobs j ON j.id = t.job_id AND t.stage_id = j.stage_id WHERE t.job_id = ANY($1) GROUP BY t.job_id`, [ids]),
      q.query('SELECT job_id, count(*)::int AS n FROM wf_comments WHERE job_id = ANY($1) AND NOT is_system GROUP BY job_id', [ids]),
      q.query('SELECT job_id, count(*)::int AS n FROM wf_files WHERE job_id = ANY($1) GROUP BY job_id', [ids]),
      q.query('SELECT from_job_id AS job_id, count(*)::int AS n FROM wf_forward_log WHERE from_job_id = ANY($1) GROUP BY from_job_id', [ids]),
    ]);
    as.rows.forEach(r => get(r.job_id).assignees.push(r.user_id));
    fo.rows.forEach(r => get(r.job_id).followers.push(r.user_id));
    td.rows.forEach(r => { const e = get(r.job_id); e.todoTotal = r.total; e.todoDone = r.done; e.todoReqOpen = r.req_open; });
    cm.rows.forEach(r => { get(r.job_id).commentCount = r.n; });
    fl.rows.forEach(r => { get(r.job_id).fileCount = r.n; });
    fw.rows.forEach(r => { get(r.job_id).fwd = r.n; });
    return by;
  }
  /** Danh sách quy trình người xem thấy + số liệu tóm tắt. */
  async function loadList(c) {
    const dir = isDirector(c);
    const wfs = (await c.q.query(`SELECT w.* FROM wf_workflows w ${dir ? '' : 'WHERE EXISTS (SELECT 1 FROM wf_members m WHERE m.workflow_id = w.id AND m.user_id = $1)'} ORDER BY w.seq`, dir ? [] : [c.me.id])).rows;
    const ids = wfs.map(w => w.id);
    const [mem, cnt, stg] = await Promise.all([
      c.q.query('SELECT workflow_id, user_id, is_owner, pinned FROM wf_members WHERE workflow_id = ANY($1)', [ids]),
      c.q.query(`SELECT workflow_id, count(*) FILTER (WHERE status='open' AND NOT archived)::int AS open,
          count(*) FILTER (WHERE status='open' AND NOT archived AND ((sla_due_at <> '' AND sla_due_at < $2) OR (due <> '' AND due < $3)))::int AS overdue,
          count(*) FILTER (WHERE status='done' AND NOT archived)::int AS done, count(*) FILTER (WHERE status='failed' AND NOT archived)::int AS failed
        FROM wf_jobs WHERE workflow_id = ANY($1) GROUP BY workflow_id`, [ids, nowISO(), todayISO()]),
      c.q.query('SELECT workflow_id, count(*)::int AS n FROM wf_stages WHERE workflow_id = ANY($1) GROUP BY workflow_id', [ids]),
    ]);
    const cb = {}; cnt.rows.forEach(r => { cb[r.workflow_id] = r; });
    const sb = {}; stg.rows.forEach(r => { sb[r.workflow_id] = r.n; });
    const mb = {}; mem.rows.forEach(r => { (mb[r.workflow_id] = mb[r.workflow_id] || []).push(r); });
    return {
      workflows: wfs.map(w => {
        const ms = mb[w.id] || [], mine = ms.find(m => m.user_id === c.me.id), k = cb[w.id] || {};
        return { id: w.id, name: w.name, description: w.description, category: w.category, color: w.color, archived: w.archived, createdBy: w.created_by, createdAt: w.created_at,
          ownerIds: ms.filter(m => m.is_owner).map(m => m.user_id), memberCount: ms.length, stageCount: sb[w.id] || 0, pinned: !!(mine && mine.pinned),
          isMember: !!mine, canManage: dir || !!(mine && mine.is_owner),
          counts: { open: k.open || 0, overdue: k.overdue || 0, done: k.done || 0, failed: k.failed || 0 } };
      }),
      canCreate: canCreateWorkflow(c),
      templates: Object.entries(TEMPLATES).map(([key, t]) => ({ key, name: t.name, description: t.description, stages: t.stages.length })),
    };
  }
  /** Một quy trình: cấu hình, thành viên và các job (mặc định chưa lưu trữ; archived=1 lấy job đã lưu trữ). */
  async function loadWorkflow(c, id, archived) {
    const wc = await wfCtx(c, id);
    if (!wc || !wc.canView) deny(wc ? 'Bạn không phải thành viên của quy trình này.' : 'Quy trình không còn tồn tại.');
    const cfg = await loadConfig(c.q, id);
    const jobs = (await c.q.query('SELECT * FROM wf_jobs WHERE workflow_id=$1 AND archived=$2 ORDER BY seq DESC LIMIT 2000', [id, !!archived])).rows;
    const ex = await jobExtras(c.q, jobs);
    const w = wc.w;
    return { workflow: { id: w.id, name: w.name, description: w.description, category: w.category, color: w.color, archived: w.archived, createdBy: w.created_by, createdAt: w.created_at,
        members: [...wc.members.values()].map(m => ({ userId: m.user_id, owner: m.is_owner })), pinned: !!(wc.members.get(c.me.id) || {}).pinned, isMember: wc.isMember, isOwner: wc.isOwner, canManage: wc.canManage },
      ...cfg, jobs: jobs.map(j => jobJson(j, ex[j.id])), archivedView: !!archived };
  }
  async function loadJob(c, id) {
    const jc = await jobCtx(c, id);
    if (!jc || !jc.canView) deny(jc ? 'Bạn không phải thành viên của quy trình này.' : 'Job không còn tồn tại.');
    const j = jc.j;
    const [td, cm, fl, ac, fw, ex] = await Promise.all([
      c.q.query('SELECT * FROM wf_todos WHERE job_id=$1 ORDER BY seq', [id]),
      c.q.query('SELECT * FROM wf_comments WHERE job_id=$1 ORDER BY seq', [id]),
      c.q.query('SELECT * FROM wf_files WHERE job_id=$1 ORDER BY seq', [id]),
      c.q.query('SELECT * FROM wf_activity WHERE job_id=$1 ORDER BY seq DESC LIMIT 100', [id]),
      c.q.query(`SELECT l.*, fj.title AS from_title, tj.title AS to_title, fw.name AS from_wf, tw.name AS to_wf FROM wf_forward_log l
        LEFT JOIN wf_jobs fj ON fj.id = l.from_job_id LEFT JOIN wf_jobs tj ON tj.id = l.to_job_id
        LEFT JOIN wf_workflows fw ON fw.id = l.from_workflow_id LEFT JOIN wf_workflows tw ON tw.id = l.to_workflow_id
        WHERE l.from_job_id=$1 OR l.to_job_id=$1 ORDER BY l.seq`, [id]),
      jobExtras(c.q, [j]),
    ]);
    const out = jobJson(j, ex[j.id]);
    out.description = j.description;
    out.todos = td.rows.map(t => ({ id: t.id, stageId: t.stage_id, title: t.title, required: t.required, assigneeId: t.assignee_id, done: t.done, doneBy: t.done_by, doneAt: t.done_at, createdAt: t.created_at }));
    out.comments = cm.rows.map(m => ({ id: m.id, authorId: m.author_id, text: m.text, createdAt: m.created_at, system: m.is_system, mentions: idList(m.mentions) }));
    out.files = fl.rows.map(f => ({ id: f.id, fieldId: f.field_id, name: f.name, mime: f.mime, size: Number(f.size), uploadedBy: f.uploaded_by, createdAt: f.created_at }));
    out.history = ac.rows.map(a => { let d = {}; try { d = JSON.parse(a.detail || '{}'); } catch (e) { /* bỏ qua */ } return { id: a.id, kind: a.kind, actorId: a.actor_id, detail: d, createdAt: a.created_at }; });
    out.forwardLog = fw.rows.map(l => ({ id: l.id, fromJobId: l.from_job_id, toJobId: l.to_job_id, fromTitle: l.from_title || '', toTitle: l.to_title || '', fromWorkflow: l.from_wf || '', toWorkflow: l.to_wf || '',
      fromWorkflowId: l.from_workflow_id, toWorkflowId: l.to_workflow_id, ruleId: l.rule_id, mode: l.mode, actorId: l.actor_id, createdAt: l.created_at }));
    out.canEdit = jc.canEdit; out.canMove = jc.canMove; out.canManage = jc.wc.canManage;
    return { job: out };
  }
  /** "Của tôi": job giao cho tôi / tôi tạo / tôi theo dõi / của cấp dưới (Quản lý trở lên) + todo của tôi (cho mục Việc của tôi). */
  async function loadMine(c) {
    const me = c.me.id, dir = isDirector(c);
    const vis = dir ? '' : 'AND EXISTS (SELECT 1 FROM wf_members m WHERE m.workflow_id = j.workflow_id AND m.user_id = $1)';
    const team = c.me.role === 'employee' ? [] : c.users.filter(u => u.id !== me && D.canManage(c, u.id)).map(u => u.id);
    const rows = (await c.q.query(`SELECT j.*, w.name AS wf_name, w.color AS wf_color, s.name AS stage_name FROM wf_jobs j JOIN wf_workflows w ON w.id = j.workflow_id LEFT JOIN wf_stages s ON s.id = j.stage_id
      WHERE NOT j.archived AND NOT w.archived ${vis} AND (j.status = 'open' OR j.closed_at >= $3) AND (
        j.created_by = $1 OR EXISTS (SELECT 1 FROM wf_job_assignees a WHERE a.job_id = j.id AND (a.user_id = $1 OR a.user_id = ANY($2)))
        OR EXISTS (SELECT 1 FROM wf_job_followers f WHERE f.job_id = j.id AND f.user_id = $1))
      ORDER BY j.seq DESC LIMIT 500`, [me, team, new Date(Date.now() - 30 * 864e5).toISOString()])).rows;
    const ex = await jobExtras(c.q, rows);
    const jobs = rows.map(j => ({ ...jobJson(j, ex[j.id]), wfName: j.wf_name, wfColor: j.wf_color, stageName: j.stage_name || '' }));
    const todoRows = (await c.q.query(`SELECT t.*, j.title AS job_title, j.workflow_id, w.name AS wf_name, w.color AS wf_color, s.name AS stage_name FROM wf_todos t
      JOIN wf_jobs j ON j.id = t.job_id JOIN wf_workflows w ON w.id = j.workflow_id LEFT JOIN wf_stages s ON s.id = t.stage_id
      WHERE t.assignee_id = $1 AND j.status = 'open' AND NOT j.archived AND NOT w.archived ${vis} AND (NOT t.done OR t.done_at >= $2) ORDER BY t.done, t.seq LIMIT 300`,
      [me, new Date(Date.now() - 14 * 864e5).toISOString()])).rows;
    return { jobs, todos: todoRows.map(t => ({ id: t.id, jobId: t.job_id, jobTitle: t.job_title, workflowId: t.workflow_id, wfName: t.wf_name, wfColor: t.wf_color, stageName: t.stage_name || '',
      title: t.title, required: t.required, done: t.done, doneAt: t.done_at, createdAt: t.created_at })) };
  }
  async function loadActivity(c, id) {
    const wc = await wfCtx(c, id);
    if (!wc || !wc.canView) deny(wc ? 'Bạn không phải thành viên của quy trình này.' : 'Quy trình không còn tồn tại.');
    const rows = (await c.q.query('SELECT a.*, j.title AS job_title FROM wf_activity a LEFT JOIN wf_jobs j ON j.id = a.job_id WHERE a.workflow_id=$1 ORDER BY a.seq DESC LIMIT 200', [id])).rows;
    return { activity: rows.map(a => { let d = {}; try { d = JSON.parse(a.detail || '{}'); } catch (e) { /* bỏ qua */ } return { id: a.id, kind: a.kind, jobId: a.job_id, jobTitle: a.job_title || '', actorId: a.actor_id, detail: d, createdAt: a.created_at }; }) };
  }
  /** Báo cáo quy trình cho job tạo trong khoảng [from, to] (ngày giờ Việt Nam); bỏ trống = tất cả. */
  async function loadReport(c, id, from, to) {
    const wc = await wfCtx(c, id);
    if (!wc || !wc.canView) deny(wc ? 'Bạn không phải thành viên của quy trình này.' : 'Quy trình không còn tồn tại.');
    const cfg = await loadConfig(c.q, id), now = nowISO(), today = todayISO();
    const lo = validISO(from) ? new Date(from + 'T00:00:00+07:00').toISOString() : '', hi = validISO(to) ? new Date(to + 'T23:59:59.999+07:00').toISOString() : '9999';
    const jobs = (await c.q.query("SELECT * FROM wf_jobs WHERE workflow_id=$1 AND created_at >= $2 AND created_at <= $3", [id, lo, hi])).rows;
    const jobIds = jobs.map(j => j.id), ex = await jobExtras(c.q, jobs);
    const logs = jobIds.length ? (await c.q.query('SELECT * FROM wf_stage_log WHERE job_id = ANY($1)', [jobIds])).rows : [];
    const isOver = j => j.status === 'open' && ((j.sla_due_at && j.sla_due_at < now) || (j.due && j.due < today));
    const totals = { total: jobs.length, open: 0, overdue: 0, done: 0, failed: 0 };
    jobs.forEach(j => { if (j.status === 'open') { totals.open++; if (isOver(j)) totals.overdue++; } else if (j.status === 'done') totals.done++; else if (j.status === 'failed') totals.failed++; });
    const closed = totals.done + totals.failed;
    totals.doneRate = closed ? totals.done / closed : null;
    const doneJobs = jobs.filter(j => j.status === 'done' && j.closed_at);
    totals.avgCycleHours = doneJobs.length ? doneJobs.reduce((s, j) => s + (new Date(j.closed_at) - new Date(j.created_at)) / 3600e3, 0) / doneJobs.length : null;
    const byStage = cfg.stages.map(s => {
      const rows = logs.filter(l => l.stage_id === s.id && l.left_at);
      const durs = rows.map(l => (new Date(l.left_at) - new Date(l.entered_at)) / 3600e3);
      const met = s.slaHours ? durs.filter(d => d <= s.slaHours).length : 0;
      const openJobs = jobs.filter(j => j.status === 'open' && j.stage_id === s.id);
      return { stageId: s.id, name: s.name, slaHours: s.slaHours, open: openJobs.length, overdue: openJobs.filter(isOver).length, passed: durs.length,
        avgHours: durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null, slaMetRate: s.slaHours && durs.length ? met / durs.length : null };
    });
    const asg = {};
    jobs.forEach(j => ((ex[j.id] || {}).assignees || []).forEach(u => { const e = asg[u] = asg[u] || { userId: u, open: 0, overdue: 0, done: 0, failed: 0 }; if (j.status === 'open') { e.open++; if (isOver(j)) e.overdue++; } else if (j.status === 'done') e.done++; else if (j.status === 'failed') e.failed++; }));
    const rs = {}; jobs.filter(j => j.status === 'failed').forEach(j => { const k = j.fail_reason || '(Không ghi lý do)'; rs[k] = (rs[k] || 0) + 1; });
    return { report: { from: validISO(from) ? from : '', to: validISO(to) ? to : '', totals, byStage,
      byAssignee: Object.values(asg).sort((a, b) => b.open - a.open), failReasons: Object.entries(rs).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count) } };
  }
  /** Điểm vào của các lệnh GET ?flow=… (server.js gọi). */
  async function load(c, kind, p) {
    switch (kind) {
      case 'list': return loadList(c);
      case 'wf': return loadWorkflow(c, str(p.id), p.archived === '1');
      case 'job': return loadJob(c, str(p.id));
      case 'mine': return loadMine(c);
      case 'activity': return loadActivity(c, str(p.id));
      case 'report': return loadReport(c, str(p.id), str(p.from), str(p.to));
      default: throw new AppError('Yêu cầu không hợp lệ.');
    }
  }

  /* ====================== Quét SLA (chạy nền, xem server.js) ====================== */
  /** Báo chuông một lần cho mỗi (job, giai đoạn) khi quá hạn SLA: người thực hiện + owner. Trả về số job đã báo. */
  async function scanSla(c) {
    const now = nowISO();
    const rows = (await c.q.query(`SELECT j.*, w.name AS wf_name, s.name AS stage_name FROM wf_jobs j JOIN wf_workflows w ON w.id = j.workflow_id LEFT JOIN wf_stages s ON s.id = j.stage_id
      WHERE j.status = 'open' AND NOT j.archived AND NOT w.archived AND j.sla_due_at <> '' AND j.sla_due_at < $1 AND j.sla_notified <> j.stage_entered_at`, [now])).rows;
    for (const j of rows) {
      const as = (await c.q.query('SELECT user_id FROM wf_job_assignees WHERE job_id=$1', [j.id])).rows.map(r => r.user_id);
      const ow = (await c.q.query('SELECT user_id FROM wf_members WHERE workflow_id=$1 AND is_owner', [j.workflow_id])).rows.map(r => r.user_id);
      c.notes.push({ kind: 'wfOverdue', to: uniq([...as, ...ow]), actorId: '', job: noteJob(j, { id: j.workflow_id, name: j.wf_name }, j.stage_name || '', { slaDueAt: j.sla_due_at }) });
      await c.q.query('UPDATE wf_jobs SET sla_notified = stage_entered_at WHERE id=$1', [j.id]);
    }
    return rows.length;
  }

  /* ====================== Các hành động (ghi) — gọi trong giao dịch của server.js ====================== */
  async function getWc(c, id) { const wc = await wfCtx(c, id); if (!wc) throw new AppError('Quy trình không còn tồn tại.'); return wc; }
  async function getJc(c, id) { const jc = await jobCtx(c, id); if (!jc || !jc.wc) throw new AppError('Job không còn tồn tại.'); needView(jc); return jc; }
  async function stageOf(q, id) { return one(q, 'SELECT * FROM wf_stages WHERE id=$1', [id]); }
  const stageJson = s => ({ id: s.id, name: s.name, slaHours: s.sla_hours === null ? null : Number(s.sla_hours), assigneeIds: idList(s.assignees) });

  /** Chép cấu hình (giai đoạn, todo mẫu, trường, lý do) từ mẫu hoặc từ quy trình khác vào quy trình mới. */
  async function seedConfig(c, wfId, spec) {
    const idMap = {};
    for (let i = 0; i < spec.stages.length; i++) {
      const s = spec.stages[i], sid = newId('ws');
      await c.q.query('INSERT INTO wf_stages(id,workflow_id,name,pos,sla_hours,assignees) VALUES($1,$2,$3,$4,$5,$6)', [sid, wfId, s.name, i, s.sla || null, JSON.stringify(s.assignees || [])]);
      for (let k = 0; k < (s.todos || []).length; k++) await c.q.query('INSERT INTO wf_stage_todos(id,stage_id,title,required,pos) VALUES($1,$2,$3,$4,$5)', [newId('wp'), sid, s.todos[k][0], !!s.todos[k][1], k]);
      if (s.oldId) idMap[s.oldId] = sid;
    }
    for (let i = 0; i < (spec.fields || []).length; i++) {
      const f = spec.fields[i];
      await c.q.query('INSERT INTO wf_fields(id,workflow_id,name,type,options,required,pos) VALUES($1,$2,$3,$4,$5,$6,$7)', [newId('wf'), wfId, f.name, f.type, JSON.stringify(f.options || []), !!f.required, i]);
    }
    for (let i = 0; i < (spec.reasons || []).length; i++) await c.q.query('INSERT INTO wf_fail_reasons(id,workflow_id,text,pos) VALUES($1,$2,$3,$4)', [newId('wr'), wfId, spec.reasons[i], i]);
  }
  const actions = {
    /* ----- Quy trình ----- */
    async wfSaveWorkflow(c, p) {
      const w = p.workflow || {};
      if (!safeId(w.id)) throw new AppError('Thiếu mã quy trình.');
      const name = clipText(w.name, 100);
      if (!name) throw new AppError('Nhập tên quy trình.');
      const row = [w.id, name, W.cleanText(w.description, 1000), clipText(w.category, 40), /^#[0-9a-fA-F]{6}$/.test(str(w.color)) ? w.color : '#2f6fed'];
      const old = await one(c.q, 'SELECT * FROM wf_workflows WHERE id=$1', [w.id]);
      if (old) {
        const wc = await getWc(c, w.id);
        if (!wc.canManage) deny('Chỉ owner của quy trình hoặc Giám đốc được sửa quy trình.');
        await c.q.query('UPDATE wf_workflows SET name=$2, description=$3, category=$4, color=$5, archived=$6 WHERE id=$1', [...row, w.archived === undefined ? old.archived : !!w.archived]);
        await logAct(c, w.id, '', 'workflow.edit', { name });
        return;
      }
      if (!canCreateWorkflow(c)) deny('Chỉ Giám đốc hoặc Trưởng phòng được tạo quy trình.');
      let spec;
      if (p.cloneFromId) {                                              // nhân bản cấu trúc (không chép job, thành viên, luật chuyển tiếp)
        const src = await getWc(c, str(p.cloneFromId));
        if (!src.canView) deny('Bạn không xem được quy trình cần nhân bản.');
        const cfg = await loadConfig(c.q, src.w.id);
        spec = { stages: cfg.stages.map(s => ({ name: s.name, sla: s.slaHours, assignees: [], todos: s.todos.map(t => [t.title, t.required]) })),
          fields: cfg.fields, reasons: cfg.failReasons.map(r => r.text) };
      } else {
        const t = TEMPLATES[str(p.templateKey) || 'blank'];
        if (!t) throw new AppError('Mẫu quy trình không tồn tại.');
        spec = t;
      }
      await c.q.query('INSERT INTO wf_workflows(id,name,description,category,color,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)', [...row, c.me.id, nowISO()]);
      await c.q.query('INSERT INTO wf_members(workflow_id,user_id,is_owner) VALUES($1,$2,true)', [w.id, c.me.id]);
      await seedConfig(c, w.id, spec);
      await logAct(c, w.id, '', 'workflow.create', { name, template: p.cloneFromId ? 'clone' : str(p.templateKey) || 'blank' });
    },
    async wfDeleteWorkflow(c, p) {
      const wc = await wfCtx(c, str(p.id)); if (!wc) return;
      if (!wc.canManage) deny('Chỉ owner của quy trình hoặc Giám đốc được xoá quy trình.');
      const n = await one(c.q, 'SELECT count(*)::int AS n FROM wf_jobs WHERE workflow_id=$1', [wc.w.id]);
      if (n.n) throw new AppError('Quy trình còn ' + n.n + ' job nên không xoá được. Hãy Lưu trữ quy trình để giữ lại lịch sử.');
      await c.q.query('DELETE FROM wf_forward_rules WHERE target_workflow_id=$1', [wc.w.id]);
      await c.q.query('DELETE FROM wf_activity WHERE workflow_id=$1', [wc.w.id]);
      await c.q.query('DELETE FROM wf_workflows WHERE id=$1', [wc.w.id]);
    },
    async wfPin(c, p) {
      const r = await c.q.query('UPDATE wf_members SET pinned=$3 WHERE workflow_id=$1 AND user_id=$2', [str(p.workflowId), c.me.id, !!p.pinned]);
      if (!r.rowCount) throw new AppError('Bạn chưa là thành viên của quy trình này.');
    },
    /** Đặt lại danh sách thành viên: members = [{ userId, owner }]. Owner phải là Giám đốc/Trưởng phòng; người còn job đang làm luôn được giữ lại. */
    async wfSetMembers(c, p) {
      const wc = await getWc(c, str(p.workflowId));
      if (!wc.canManage) deny('Chỉ owner của quy trình hoặc Giám đốc được quản lý thành viên.');
      const list = (Array.isArray(p.members) ? p.members : []).filter(m => m && c.byId[m.userId]);
      const map = new Map();
      for (const m of list) map.set(m.userId, !!m.owner);
      for (const [uid, owner] of map) {
        const u = c.byId[uid], had = wc.members.has(uid);
        if (u.active === false && !had) throw new AppError(u.name + ' đã bị khoá tài khoản.');
        if (owner && u.role !== 'director' && u.role !== 'head') throw new AppError(u.name + ' không thể làm owner: owner phải là Giám đốc hoặc Trưởng phòng.');
      }
      const keep = (await c.q.query(`SELECT a.user_id FROM wf_job_assignees a JOIN wf_jobs j ON j.id = a.job_id WHERE j.workflow_id=$1 AND j.status='open' AND NOT j.archived
        UNION SELECT f.user_id FROM wf_job_followers f JOIN wf_jobs j ON j.id = f.job_id WHERE j.workflow_id=$1 AND j.status='open' AND NOT j.archived`, [wc.w.id])).rows.map(r => r.user_id);
      const kept = [];
      for (const uid of keep) if (!map.has(uid) && wc.members.has(uid)) { map.set(uid, false); kept.push((c.byId[uid] || {}).name || uid); }   // còn job đang làm thì giữ lại, kẻo mất quyền xem chính job của mình
      if (![...map.values()].some(Boolean)) throw new AppError('Quy trình cần ít nhất một owner.');
      if (map.size > LIM.members) throw new AppError('Quy trình tối đa ' + LIM.members + ' thành viên.');
      const pins = new Map([...wc.members.values()].map(m => [m.user_id, m.pinned]));
      await c.q.query('DELETE FROM wf_members WHERE workflow_id=$1', [wc.w.id]);
      for (const [uid, owner] of map) await c.q.query('INSERT INTO wf_members(workflow_id,user_id,is_owner,pinned) VALUES($1,$2,$3,$4)', [wc.w.id, uid, owner, !!pins.get(uid)]);
      await logAct(c, wc.w.id, '', 'members.set', { count: map.size, owners: [...map].filter(([, o]) => o).map(([u]) => (c.byId[u] || {}).name || u) });
      return { kept };
    },
    /** Lưu cấu hình: gửi phần nào thì thay phần đó (stages / fields / failReasons / forwardRules). */
    async wfSaveConfig(c, p) {
      const wc = await getWc(c, str(p.workflowId));
      if (!wc.canManage) deny('Chỉ owner của quy trình hoặc Giám đốc được sửa cấu hình.');
      const wfId = wc.w.id, cfg = await loadConfig(c.q, wfId);
      if (Array.isArray(p.stages)) {
        const stages = p.stages;
        if (!stages.length) throw new AppError('Quy trình cần ít nhất 1 giai đoạn.');
        if (stages.length > LIM.stages) throw new AppError('Tối đa ' + LIM.stages + ' giai đoạn.');
        const seen = new Set();
        for (const s of stages) {
          if (!safeId(s.id) || seen.has(s.id)) throw new AppError('Mã giai đoạn không hợp lệ.');
          seen.add(s.id);
          if (!clipText(s.name, 80)) throw new AppError('Nhập tên cho mọi giai đoạn.');
          const other = await one(c.q, 'SELECT workflow_id FROM wf_stages WHERE id=$1', [s.id]);
          if (other && other.workflow_id !== wfId) throw new AppError('Mã giai đoạn bị trùng.');
          const sla = s.slaHours === null || s.slaHours === undefined || s.slaHours === '' ? null : Number(s.slaHours);
          if (sla !== null && !(sla > 0 && sla <= 24 * 365)) throw new AppError('Hạn xử lý (SLA) của giai đoạn "' + clipText(s.name, 40) + '" không hợp lệ.');
          s._sla = sla;
          s._assignees = idList(s.assigneeIds);
          checkPeople(c, wc, s._assignees, 'Người thực hiện mặc định');
          if ((s.todos || []).length > LIM.todos) throw new AppError('Mỗi giai đoạn tối đa ' + LIM.todos + ' todo mẫu.');
        }
        for (const old of cfg.stages) {
          if (seen.has(old.id)) continue;
          const open = await one(c.q, "SELECT count(*)::int AS n FROM wf_jobs WHERE stage_id=$1 AND status='open'", [old.id]);
          if (open.n) throw new AppError('Giai đoạn "' + old.name + '" còn ' + open.n + ' job đang làm, hãy chuyển chúng đi trước khi xoá giai đoạn.');
          await c.q.query('DELETE FROM wf_stages WHERE id=$1', [old.id]);
          await c.q.query('DELETE FROM wf_forward_rules WHERE workflow_id=$1 AND stage_id=$2', [wfId, old.id]);
        }
        for (let i = 0; i < stages.length; i++) {
          const s = stages[i], exists = cfg.stages.some(o => o.id === s.id);
          if (exists) await c.q.query('UPDATE wf_stages SET name=$2, pos=$3, sla_hours=$4, assignees=$5 WHERE id=$1', [s.id, clipText(s.name, 80), i, s._sla, JSON.stringify(s._assignees)]);
          else await c.q.query('INSERT INTO wf_stages(id,workflow_id,name,pos,sla_hours,assignees) VALUES($1,$2,$3,$4,$5,$6)', [s.id, wfId, clipText(s.name, 80), i, s._sla, JSON.stringify(s._assignees)]);
          await c.q.query('DELETE FROM wf_stage_todos WHERE stage_id=$1', [s.id]);
          const tseen = new Set();
          for (let k = 0; k < (s.todos || []).length; k++) {
            const t = s.todos[k], title = clipText(t.title, 200); if (!title) continue;
            const tid = safeId(t.id) && !tseen.has(t.id) ? t.id : newId('wp'); tseen.add(tid);
            const clash = await one(c.q, 'SELECT stage_id FROM wf_stage_todos WHERE id=$1', [tid]);
            await c.q.query('INSERT INTO wf_stage_todos(id,stage_id,title,required,pos) VALUES($1,$2,$3,$4,$5)', [clash ? newId('wp') : tid, s.id, title, !!t.required, k]);
          }
        }
      }
      if (Array.isArray(p.fields)) {
        if (p.fields.length > LIM.fields) throw new AppError('Tối đa ' + LIM.fields + ' trường tuỳ chỉnh.');
        const seen = new Set();
        for (const f of p.fields) {
          if (!safeId(f.id) || seen.has(f.id)) throw new AppError('Mã trường không hợp lệ.');
          seen.add(f.id);
          if (!clipText(f.name, 80)) throw new AppError('Nhập tên cho mọi trường.');
          if (!FIELD_TYPES.includes(f.type)) throw new AppError('Kiểu trường không hợp lệ.');
          const other = await one(c.q, 'SELECT workflow_id FROM wf_fields WHERE id=$1', [f.id]);
          if (other && other.workflow_id !== wfId) throw new AppError('Mã trường bị trùng.');
          const prev = cfg.fields.find(o => o.id === f.id);
          if (prev && prev.type !== f.type) throw new AppError('Không đổi được kiểu của trường "' + prev.name + '". Hãy tạo trường mới.');
          if (f.type === 'select' || f.type === 'multiselect') {
            f._options = uniq((Array.isArray(f.options) ? f.options : []).map(o => clipText(o, 100)).filter(Boolean)).slice(0, LIM.options);
            if (!f._options.length) throw new AppError('Trường "' + clipText(f.name, 40) + '" cần ít nhất 1 lựa chọn.');
          } else f._options = [];
        }
        for (const old of cfg.fields) if (!seen.has(old.id)) {
          await c.q.query('DELETE FROM wf_fields WHERE id=$1', [old.id]);
          const files = (await c.q.query('SELECT id, job_id FROM wf_files WHERE field_id=$1', [old.id])).rows;
          for (const f of files) { try { fs.rmSync(path.join(jobDir(f.job_id), f.id), { force: true }); } catch (e) { /* đã mất */ } }
          await c.q.query('DELETE FROM wf_files WHERE field_id=$1', [old.id]);
        }
        for (let i = 0; i < p.fields.length; i++) {
          const f = p.fields[i], exists = cfg.fields.some(o => o.id === f.id);
          if (exists) await c.q.query('UPDATE wf_fields SET name=$2, options=$3, required=$4, pos=$5 WHERE id=$1', [f.id, clipText(f.name, 80), JSON.stringify(f._options), !!f.required, i]);
          else await c.q.query('INSERT INTO wf_fields(id,workflow_id,name,type,options,required,pos) VALUES($1,$2,$3,$4,$5,$6,$7)', [f.id, wfId, clipText(f.name, 80), f.type, JSON.stringify(f._options), !!f.required, i]);
        }
      }
      if (Array.isArray(p.failReasons)) {
        if (p.failReasons.length > LIM.reasons) throw new AppError('Tối đa ' + LIM.reasons + ' lý do thất bại.');
        await c.q.query('DELETE FROM wf_fail_reasons WHERE workflow_id=$1', [wfId]);
        const texts = uniq(p.failReasons.map(r => clipText(r && typeof r === 'object' ? r.text : r, 120)).filter(Boolean));
        for (let i = 0; i < texts.length; i++) await c.q.query('INSERT INTO wf_fail_reasons(id,workflow_id,text,pos) VALUES($1,$2,$3,$4)', [newId('wr'), wfId, texts[i], i]);
      }
      if (Array.isArray(p.forwardRules)) {
        if (p.forwardRules.length > LIM.rules) throw new AppError('Tối đa ' + LIM.rules + ' luật chuyển tiếp.');
        const cur = await loadConfig(c.q, wfId);
        const stageIds = new Set(cur.stages.map(s => s.id)), fieldIds = new Set(cur.fields.map(f => f.id));
        const rules = [];
        for (const r of p.forwardRules) {
          const sid = str(r.stageId);
          if (sid && !stageIds.has(sid)) throw new AppError('Luật chuyển tiếp: giai đoạn nguồn không hợp lệ.');
          const twc = await wfCtx(c, str(r.targetWorkflowId));
          if (!twc) throw new AppError('Luật chuyển tiếp: quy trình đích không tồn tại.');
          if (twc.w.id === wfId) throw new AppError('Luật chuyển tiếp: không chuyển tiếp sang chính quy trình này.');
          if (!twc.canView) deny('Bạn không phải thành viên của quy trình đích "' + twc.w.name + '".');
          const tcfg = await loadConfig(c.q, twc.w.id), tfIds = new Set(tcfg.fields.map(f => f.id));
          const fm = {}; const src = r.fieldMap && typeof r.fieldMap === 'object' ? r.fieldMap : {};
          for (const [tf, sf] of Object.entries(src)) if (tfIds.has(tf) && fieldIds.has(str(sf))) fm[tf] = str(sf);
          rules.push({ id: safeId(r.id) ? r.id : newId('wu'), stageId: sid, target: twc.w.id, mode: r.mode === 'auto' ? 'auto' : 'manual', fm });
        }
        const keep = new Set(rules.map(r => r.id));
        for (const old of cur.forwardRules) if (!keep.has(old.id)) await c.q.query('DELETE FROM wf_forward_rules WHERE id=$1', [old.id]);
        for (const r of rules) {
          const ex = await one(c.q, 'SELECT workflow_id FROM wf_forward_rules WHERE id=$1', [r.id]);
          if (ex && ex.workflow_id !== wfId) throw new AppError('Mã luật chuyển tiếp bị trùng.');
          if (ex) await c.q.query('UPDATE wf_forward_rules SET stage_id=$2, target_workflow_id=$3, mode=$4, field_map=$5 WHERE id=$1', [r.id, r.stageId, r.target, r.mode, JSON.stringify(r.fm)]);
          else await c.q.query('INSERT INTO wf_forward_rules(id,workflow_id,stage_id,target_workflow_id,mode,field_map) VALUES($1,$2,$3,$4,$5,$6)', [r.id, wfId, r.stageId, r.target, r.mode, JSON.stringify(r.fm)]);
        }
      }
      await logAct(c, wfId, '', 'config.save', { parts: ['stages', 'fields', 'failReasons', 'forwardRules'].filter(k => Array.isArray(p[k])) });
    },

    /* ----- Job ----- */
    async wfSaveJob(c, p) {
      const t = p.job || {};
      if (!safeId(t.id)) throw new AppError('Thiếu mã job.');
      const old = await jobCtx(c, t.id);
      const wfId = old ? old.j.workflow_id : str(t.workflowId);
      const wc = old ? old.wc : await getWc(c, wfId);
      if (!wc || !wc.canView) deny('Bạn không phải thành viên của quy trình này.');
      if (wc.w.archived) throw new AppError('Quy trình đã lưu trữ.');
      if (old && !old.canEdit) deny('Chỉ người tạo, người thực hiện, owner hoặc Giám đốc được sửa job này.');
      const title = clipText(t.title, 300);
      if (!title) throw new AppError('Nhập tên job.');
      const cfg = await loadConfig(c.q, wfId);
      if (!cfg.stages.length) throw new AppError('Quy trình chưa có giai đoạn nào.');
      const due = str(t.due); if (due && !validISO(due)) throw new AppError('Hạn chót không hợp lệ.');
      const priority = PRIORITIES.includes(t.priority) ? t.priority : (old ? old.j.priority : 'medium');
      const desc = W.cleanText(t.description, 30000), tags = cleanTags(t.tags);
      const values = cleanFieldValues(c, cfg.fields, t.fieldValues);
      const followersIn = idList(t.followerIds);
      if (old) {
        if (old.j.status !== 'open' && !wc.canManage) throw new AppError('Job đã đóng, chỉ owner mở lại được.');
        const merged = { ...(old.j.field_values || {}), ...values };
        for (const f of cfg.fields) if (f.id in (t.fieldValues || {}) && !(f.id in values)) delete merged[f.id];    // xoá giá trị khi người dùng bỏ trống
        const assignees = Array.isArray(t.assigneeIds) ? idList(t.assigneeIds) : old.assignees;
        if (Array.isArray(t.assigneeIds)) checkPeople(c, wc, assignees, 'Người thực hiện');
        const followers = Array.isArray(t.followerIds) ? followersIn.filter(u => !assignees.includes(u)) : old.followers;
        if (Array.isArray(t.followerIds)) checkPeople(c, wc, followers, 'Người theo dõi');
        await c.q.query('UPDATE wf_jobs SET title=$2, description=$3, priority=$4, due=$5, tags=$6, field_values=$7 WHERE id=$1', [old.j.id, title, desc, priority, due, JSON.stringify(tags), JSON.stringify(merged)]);
        const newcomers = assignees.filter(u => !old.assignees.includes(u) && u !== c.me.id);
        if (Array.isArray(t.assigneeIds)) {
          if (!assignees.length && old.j.status === 'open') throw new AppError('Job cần ít nhất 1 người thực hiện.');
          await writeAssignees(c, old.j.id, assignees);
        }
        if (Array.isArray(t.followerIds)) await writeFollowers(c, old.j.id, followers.filter(u => !assignees.includes(u)));
        if (newcomers.length && c.notes) c.notes.push({ kind: 'wfAssigned', to: newcomers, actorId: c.me.id, job: noteJob(old.j, wc.w, (cfg.stages.find(s => s.id === old.j.stage_id) || {}).name, { priority, due }) });
        await logAct(c, wfId, old.j.id, 'job.edit', {});
        return;
      }
      await checkRequiredFields(c, cfg.fields.filter(f => f.type !== 'file'), values, null);
      const first = cfg.stages[0], now = nowISO();
      let assignees = Array.isArray(t.assigneeIds) ? idList(t.assigneeIds) : [];
      if (assignees.length) checkPeople(c, wc, assignees, 'Người thực hiện');
      else assignees = stageAssignees(c, wc, first, [c.me.id]);
      const followers = followersIn.filter(u => !assignees.includes(u)); checkPeople(c, wc, followers, 'Người theo dõi');
      await c.q.query(`INSERT INTO wf_jobs(id,workflow_id,title,description,priority,due,tags,stage_id,status,field_values,created_by,created_at,stage_entered_at,sla_due_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,$11,$11,$12)`,
        [t.id, wfId, title, desc, priority, due, JSON.stringify(tags), first.id, JSON.stringify(values), c.me.id, now, slaDue(now, first.slaHours)]);
      await c.q.query('INSERT INTO wf_stage_log(job_id,stage_id,entered_at) VALUES($1,$2,$3)', [t.id, first.id, now]);
      await writeAssignees(c, t.id, assignees); await writeFollowers(c, t.id, followers);
      await ensureStageTodos(c, t.id, first, assignees[0], now);
      await logAct(c, wfId, t.id, 'job.create', { title });
      const nj = { id: t.id, title, workflow_id: wfId };
      if (c.notes) c.notes.push({ kind: 'wfAssigned', to: assignees.filter(u => u !== c.me.id), actorId: c.me.id, job: noteJob(nj, wc.w, first.name, { priority, due }) });
      await runAutoForward(c, t.id, first.id, first.name);
    },
    /** Chuyển giai đoạn tuần tự: dir = 'next' | 'prev'. assigneeIds (tuỳ chọn) = người thực hiện ở giai đoạn mới. */
    async wfMoveJob(c, p) {
      const jc = await getJc(c, str(p.id)), j = jc.j;
      if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được chuyển giai đoạn.');
      if (jc.wc.w.archived) throw new AppError('Quy trình đã lưu trữ.');
      if (j.status !== 'open') throw new AppError('Job đã đóng, hãy mở lại trước khi chuyển giai đoạn.');
      const dir = p.dir === 'prev' ? 'prev' : p.dir === 'next' ? 'next' : '';
      if (!dir) throw new AppError('Hướng chuyển không hợp lệ.');
      const cfg = await loadConfig(c.q, j.workflow_id);
      const idx = cfg.stages.findIndex(s => s.id === j.stage_id);
      if (idx < 0) throw new AppError('Giai đoạn hiện tại không còn tồn tại, hãy nhờ owner kiểm tra cấu hình.');
      const to = cfg.stages[idx + (dir === 'next' ? 1 : -1)];
      if (!to) throw new AppError(dir === 'next' ? 'Đây là giai đoạn cuối. Hãy bấm Hoàn thành.' : 'Đây là giai đoạn đầu tiên.');
      if (dir === 'next') {
        const open = (await c.q.query('SELECT title FROM wf_todos WHERE job_id=$1 AND stage_id=$2 AND required AND NOT done ORDER BY seq', [j.id, j.stage_id])).rows;
        if (open.length) throw new AppError('Còn ' + open.length + ' todo bắt buộc chưa xong: ' + open.slice(0, 3).map(t => '"' + t.title + '"').join(', ') + (open.length > 3 ? '…' : '') + '.');
        await checkRequiredFields(c, cfg.fields, j.field_values || {}, j.id);
      }
      const now = nowISO(), cur = cfg.stages[idx];
      let assignees = idList(p.assigneeIds);
      if (assignees.length) checkPeople(c, jc.wc, assignees, 'Người thực hiện');
      else assignees = stageAssignees(c, jc.wc, to, jc.assignees);
      await writeAssignees(c, j.id, assignees);
      await writeFollowers(c, j.id, jc.followers.filter(u => !assignees.includes(u)));
      await enterStage(c, j, to, assignees, now);
      await sysComment(c, j.id, (dir === 'next' ? 'Chuyển tiếp' : 'Trả lại') + ' từ giai đoạn "' + cur.name + '" sang "' + to.name + '".');
      await logAct(c, j.workflow_id, j.id, 'job.move', { from: cur.name, to: to.name, dir });
      if (c.notes) c.notes.push({ kind: 'wfAssigned', to: assignees.filter(u => u !== c.me.id), actorId: c.me.id, job: noteJob(j, jc.wc.w, to.name, { priority: j.priority, due: j.due }) });
      await runAutoForward(c, j.id, to.id, to.name);
    },
    /** Đóng job: status = 'done' (chỉ ở giai đoạn cuối) | 'failed' (mọi giai đoạn, kèm lý do từ danh sách của owner). */
    async wfCloseJob(c, p) {
      const jc = await getJc(c, str(p.id)), j = jc.j;
      if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được đóng job.');
      if (j.status !== 'open') throw new AppError('Job đã đóng rồi.');
      const status = p.status === 'failed' ? 'failed' : p.status === 'done' ? 'done' : '';
      if (!status) throw new AppError('Trạng thái không hợp lệ.');
      const cfg = await loadConfig(c.q, j.workflow_id);
      const cur = cfg.stages.find(s => s.id === j.stage_id), isLast = cfg.stages.length && cfg.stages[cfg.stages.length - 1].id === j.stage_id;
      let reason = '';
      if (status === 'done') {
        if (!isLast) throw new AppError('Chỉ bấm Hoàn thành được ở giai đoạn cuối. Nếu job không đi tiếp, hãy đánh dấu Thất bại.');
        const open = (await c.q.query('SELECT title FROM wf_todos WHERE job_id=$1 AND stage_id=$2 AND required AND NOT done', [j.id, j.stage_id])).rows;
        if (open.length) throw new AppError('Còn ' + open.length + ' todo bắt buộc chưa xong: ' + open.slice(0, 3).map(t => '"' + t.title + '"').join(', ') + '.');
        await checkRequiredFields(c, cfg.fields, j.field_values || {}, j.id);
      } else {
        reason = clipText(p.reason, 200);
        if (cfg.failReasons.length && !cfg.failReasons.some(r => r.text === reason)) throw new AppError('Hãy chọn một lý do thất bại trong danh sách.');
      }
      const now = nowISO();
      await c.q.query('UPDATE wf_stage_log SET left_at=$2 WHERE job_id=$1 AND left_at=\'\'', [j.id, now]);
      await c.q.query('UPDATE wf_jobs SET status=$2, fail_reason=$3, closed_at=$4 WHERE id=$1', [j.id, status, reason, now]);
      await sysComment(c, j.id, status === 'done' ? 'Đã đánh dấu Hoàn thành.' : 'Đã đánh dấu Thất bại' + (reason ? ': ' + reason : '') + '.');
      await logAct(c, j.workflow_id, j.id, status === 'done' ? 'job.done' : 'job.failed', { reason, stage: cur ? cur.name : '' });
      const owners = [...jc.wc.members.values()].filter(m => m.is_owner).map(m => m.user_id);
      const to = uniq([j.created_by, ...jc.followers, ...owners]).filter(u => u && u !== c.me.id);
      if (c.notes && to.length) c.notes.push({ kind: status === 'done' ? 'wfDone' : 'wfFailed', to, actorId: c.me.id, job: noteJob(j, jc.wc.w, cur ? cur.name : ''), text: reason });
      if (status === 'done') await runAutoForward(c, j.id, '', 'Hoàn thành');
    },
    async wfReopenJob(c, p) {
      const jc = await getJc(c, str(p.id)), j = jc.j;
      if (!jc.wc.canManage) deny('Chỉ owner hoặc Giám đốc được mở lại job đã đóng.');
      if (j.status === 'open') return;
      if (jc.wc.w.archived) throw new AppError('Quy trình đã lưu trữ.');
      const cfg = await loadConfig(c.q, j.workflow_id);
      const stage = cfg.stages.find(s => s.id === j.stage_id) || cfg.stages[cfg.stages.length - 1];
      if (!stage) throw new AppError('Quy trình chưa có giai đoạn nào.');
      const was = j.status;
      await c.q.query("UPDATE wf_jobs SET archived=false WHERE id=$1", [j.id]);
      await enterStage(c, j, stage, jc.assignees, nowISO());
      await sysComment(c, j.id, 'Đã mở lại job (trước đó: ' + (was === 'done' ? 'Hoàn thành' : 'Thất bại') + ') ở giai đoạn "' + stage.name + '".');
      await logAct(c, j.workflow_id, j.id, 'job.reopen', { stage: stage.name });
    },
    async wfArchiveJob(c, p) {
      const jc = await getJc(c, str(p.id));
      if (!jc.wc.canManage) deny('Chỉ owner hoặc Giám đốc được lưu trữ job.');
      const archived = p.archived !== false;
      if (archived && jc.j.status === 'open') throw new AppError('Chỉ lưu trữ được job đã Hoàn thành hoặc Thất bại.');
      await c.q.query('UPDATE wf_jobs SET archived=$2 WHERE id=$1', [jc.j.id, archived]);
      await logAct(c, jc.j.workflow_id, jc.j.id, archived ? 'job.archive' : 'job.unarchive', {});
    },
    async wfDeleteJob(c, p) {
      const jc = await jobCtx(c, str(p.id)); if (!jc) return;
      if (!isDirector(c)) deny('Chỉ Giám đốc được xoá hẳn job. Owner có thể Lưu trữ job đã đóng.');
      const wf = jc.j.workflow_id;
      await c.q.query('DELETE FROM wf_jobs WHERE id=$1', [jc.j.id]);
      try { fs.rmSync(jobDir(jc.j.id), { recursive: true, force: true }); } catch (e) { console.error('Không xoá được tệp của job ' + jc.j.id + ': ' + e.message); }
      await logAct(c, wf, '', 'job.delete', { title: jc.j.title });
    },
    async wfSetFollowers(c, p) {
      const jc = await getJc(c, str(p.jobId));
      if (!jc.canEdit) deny('Chỉ người tạo, người thực hiện, owner hoặc Giám đốc được thêm/bớt người theo dõi.');
      const ids = idList(p.followerIds).filter(u => !jc.assignees.includes(u));
      checkPeople(c, jc.wc, ids, 'Người theo dõi');
      await writeFollowers(c, jc.j.id, ids);
      await logAct(c, jc.j.workflow_id, jc.j.id, 'job.followers', { count: ids.length });
    },
    /** Chuyển tiếp thủ công theo một luật: luật ở giai đoạn X dùng được khi job đang ở X; luật "Hoàn thành" dùng được khi job đã Hoàn thành. */
    async wfForwardJob(c, p) {
      const jc = await getJc(c, str(p.id)), j = jc.j;
      if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được chuyển tiếp job.');
      const rule = await one(c.q, 'SELECT * FROM wf_forward_rules WHERE id=$1 AND workflow_id=$2', [str(p.ruleId), j.workflow_id]);
      if (!rule) throw new AppError('Luật chuyển tiếp không còn tồn tại.');
      const okState = rule.stage_id ? (j.status === 'open' && j.stage_id === rule.stage_id) : j.status === 'done';
      if (!okState) throw new AppError(rule.stage_id ? 'Luật này chỉ dùng được khi job đang ở giai đoạn tương ứng.' : 'Luật này chỉ dùng được khi job đã Hoàn thành.');
      if (await one(c.q, 'SELECT 1 FROM wf_forward_log WHERE from_job_id=$1 AND rule_id=$2', [j.id, rule.id])) throw new AppError('Job này đã được chuyển tiếp theo luật này rồi.');
      const cfg = await loadConfig(c.q, j.workflow_id);
      const nj = await forwardJob(c, j, (cfg.stages.find(s => s.id === j.stage_id) || {}).name || '', rule, 'manual');
      if (!nj) throw new AppError('Không chuyển tiếp được (quy trình đích đã lưu trữ, chưa có giai đoạn, hoặc chuỗi chuyển tiếp quá dài).');
      return { forwarded: { id: nj.id, workflowId: nj.workflow_id } };
    },

    /* ----- Todo ----- */
    async wfAddTodo(c, p) {
      const t = p.todo || {};
      if (!safeId(t.id)) throw new AppError('Thiếu mã todo.');
      const jc = await getJc(c, str(t.jobId));
      if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được thêm todo.');
      if (jc.j.status !== 'open') throw new AppError('Job đã đóng.');
      const title = clipText(t.title, 200); if (!title) throw new AppError('Nhập nội dung todo.');
      const n = await one(c.q, 'SELECT count(*)::int AS n FROM wf_todos WHERE job_id=$1 AND stage_id=$2', [jc.j.id, jc.j.stage_id]);
      if (n.n >= 60) throw new AppError('Mỗi giai đoạn tối đa 60 todo.');
      const who = str(t.assigneeId) || jc.assignees[0] || c.me.id;
      checkPeople(c, jc.wc, [who], 'Người được giao todo');
      await c.q.query('INSERT INTO wf_todos(id,job_id,stage_id,title,required,assignee_id,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [t.id, jc.j.id, jc.j.stage_id, title, !!t.required, who, c.me.id, nowISO()]);
      await logAct(c, jc.j.workflow_id, jc.j.id, 'todo.add', { title });
      if (c.notes && who !== c.me.id) c.notes.push({ kind: 'wfTodo', to: [who], actorId: c.me.id, job: noteJob(jc.j, jc.wc.w, ''), text: title });
    },
    /** Tick xong/chưa xong (người được giao todo cũng tick được), đổi tên / người được giao / bắt buộc (người thực hiện job, owner, Giám đốc). */
    async wfSetTodo(c, p) {
      const td = await one(c.q, 'SELECT * FROM wf_todos WHERE id=$1', [str(p.id)]); if (!td) throw new AppError('Todo không còn tồn tại.');
      const jc = await getJc(c, td.job_id);
      const isMine = td.assignee_id === c.me.id;
      if (p.done !== undefined) {
        if (!isMine && !jc.canMove) deny('Chỉ người được giao todo, người thực hiện job, owner hoặc Giám đốc được tick todo.');
        if (jc.j.status !== 'open') throw new AppError('Job đã đóng.');
        const done = !!p.done;
        await c.q.query('UPDATE wf_todos SET done=$2, done_by=$3, done_at=$4 WHERE id=$1', [td.id, done, done ? c.me.id : '', done ? nowISO() : '']);
        await logAct(c, jc.j.workflow_id, jc.j.id, done ? 'todo.done' : 'todo.undo', { title: td.title });
      }
      if (p.title !== undefined || p.assigneeId !== undefined || p.required !== undefined) {
        if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được sửa todo.');
        const title = p.title !== undefined ? clipText(p.title, 200) : td.title; if (!title) throw new AppError('Nhập nội dung todo.');
        const who = p.assigneeId !== undefined ? str(p.assigneeId) : td.assignee_id;
        if (who && who !== td.assignee_id) checkPeople(c, jc.wc, [who], 'Người được giao todo');
        await c.q.query('UPDATE wf_todos SET title=$2, assignee_id=$3, required=$4 WHERE id=$1', [td.id, title, who, p.required !== undefined ? !!p.required : td.required]);
        if (c.notes && who && who !== td.assignee_id && who !== c.me.id) c.notes.push({ kind: 'wfTodo', to: [who], actorId: c.me.id, job: noteJob(jc.j, jc.wc.w, ''), text: title });
      }
    },
    async wfDeleteTodo(c, p) {
      const td = await one(c.q, 'SELECT * FROM wf_todos WHERE id=$1', [str(p.id)]); if (!td) return;
      const jc = await getJc(c, td.job_id);
      if (!jc.canMove) deny('Chỉ người thực hiện, owner hoặc Giám đốc được xoá todo.');
      if (jc.j.status !== 'open') throw new AppError('Job đã đóng.');
      await c.q.query('DELETE FROM wf_todos WHERE id=$1', [td.id]);
    },

    /* ----- Bình luận & tệp ----- */
    async wfAddComment(c, p) {
      const cm = p.comment || {};
      if (!safeId(cm.id) || !safeId(cm.jobId)) throw new AppError('Thiếu nội dung bình luận.');
      const text = W.cleanText(cm.text, 12000);
      if (!W.plainOf(text).trim()) throw new AppError('Thiếu nội dung bình luận.');
      const jc = await getJc(c, cm.jobId);
      const mentions = idList(cm.mentions).filter(id => c.byId[id]).slice(0, 20);
      await c.q.query('INSERT INTO wf_comments(id,job_id,author_id,text,created_at,mentions) VALUES($1,$2,$3,$4,$5,$6)', [cm.id, jc.j.id, c.me.id, text, nowISO(), JSON.stringify(mentions)]);
      const to = uniq([jc.j.created_by, ...jc.assignees, ...jc.followers, ...mentions]).filter(u => u && u !== c.me.id);
      if (c.notes && to.length) c.notes.push({ kind: 'wfComment', to, actorId: c.me.id, job: noteJob(jc.j, jc.wc.w, ''), text: W.plainOf(text).trim().slice(0, 600) });
    },
    async wfDeleteComment(c, p) {
      const row = await one(c.q, 'SELECT * FROM wf_comments WHERE id=$1', [str(p.id)]); if (!row) return;
      await getJc(c, row.job_id);
      if (row.is_system) throw new AppError('Không xoá được ghi chú của hệ thống.');
      if (row.author_id !== c.me.id && !isDirector(c)) deny('Chỉ người viết hoặc Giám đốc được xoá bình luận này.');
      await c.q.query('DELETE FROM wf_comments WHERE id=$1', [row.id]);
    },
    async wfDeleteFile(c, p) {
      const f = await one(c.q, 'SELECT * FROM wf_files WHERE id=$1', [str(p.id)]); if (!f) return;
      const jc = await getJc(c, f.job_id);
      if (f.uploaded_by !== c.me.id && !jc.canEdit) deny('Bạn không được xoá tệp này.');
      await c.q.query('DELETE FROM wf_files WHERE id=$1', [f.id]);
      try { fs.rmSync(path.join(jobDir(f.job_id), f.id), { force: true }); } catch (e) { /* tệp đã mất thì thôi */ }
    },
  };

  /* ====================== Tải lên / tải xuống tệp (HTTP thô) ====================== */
  /** Nhận 1 tệp đính kèm job (thân yêu cầu là dữ liệu thô). params: jobId, name, fieldId (tuỳ chọn: trường kiểu tệp). */
  async function upload(c, req, params) {
    const jobId = str(params.jobId);
    if (!safeId(jobId)) throw new AppError('Thiếu mã job.');
    const name = cleanFileName(params.name), ext = extOf(name);
    if (!MIME[ext]) throw new AppError('Loại tệp .' + (ext || '?') + ' chưa được hỗ trợ. Hỗ trợ: ảnh, PDF, Word, Excel, PowerPoint, văn bản, CSV, ZIP.');
    if (Number(req.headers['content-length'] || 0) > MAX_FILE) throw new AppError('Tệp quá lớn (tối đa ' + Math.round(MAX_FILE / 1048576) + 'MB).');
    const jc = await jobCtx(c, jobId); if (!jc || !jc.wc) throw new AppError('Job không còn tồn tại.');
    needView(jc);
    if (!jc.canEdit) deny('Bạn không đính kèm được tệp vào job này.');
    const fieldId = str(params.fieldId);
    if (fieldId) {
      const f = await one(c.q, 'SELECT type FROM wf_fields WHERE id=$1 AND workflow_id=$2', [fieldId, jc.j.workflow_id]);
      if (!f || f.type !== 'file') throw new AppError('Trường tệp không hợp lệ.');
    }
    const cnt = await one(c.q, 'SELECT count(*)::int AS n FROM wf_files WHERE job_id=$1', [jobId]);
    if (cnt.n >= LIM.files) throw new AppError('Mỗi job tối đa ' + LIM.files + ' tệp.');
    const id = newId('wf'), dir = jobDir(jobId), file = path.join(dir, id);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) { console.error(e); throw new AppError('Máy chủ chưa cấu hình được nơi lưu tệp.'); }
    let size = 0;
    const counter = new Transform({ transform(chunk, _enc, cb) { size += chunk.length; if (size > MAX_FILE) cb(new AppError('Tệp quá lớn (tối đa ' + Math.round(MAX_FILE / 1048576) + 'MB).')); else cb(null, chunk); } });
    try {
      await pipeline(req, counter, fs.createWriteStream(file, { flags: 'wx', mode: 0o640 }));
      if (!size) throw new AppError('Tệp rỗng.');
      const now = nowISO();
      await c.q.query('INSERT INTO wf_files(id,job_id,field_id,name,mime,size,uploaded_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, jobId, fieldId, name, MIME[ext], size, c.me.id, now]);
      return { id, fieldId, name, mime: MIME[ext], size, uploadedBy: c.me.id, createdAt: now };
    } catch (e) { try { fs.rmSync(file, { force: true }); } catch (_) { /* chưa tạo */ } throw e; }
  }
  /** Gửi tệp về trình duyệt (thành viên của quy trình hoặc Giám đốc). Ảnh/PDF xem trực tiếp; còn lại luôn tải xuống. */
  async function download(c, res, fileId) {
    if (!safeId(fileId)) throw new AppError('Tệp không hợp lệ.');
    const f = await one(c.q, 'SELECT * FROM wf_files WHERE id=$1', [fileId]);
    if (!f) throw new AppError('Không tìm thấy tệp.');
    const jc = await jobCtx(c, f.job_id);
    if (!jc || !jc.canView) deny('Bạn không có quyền xem tệp này.');
    const file = path.join(jobDir(f.job_id), f.id);
    let st; try { st = fs.statSync(file); } catch (e) { throw new AppError('Tệp không còn trên máy chủ.'); }
    res.writeHead(200, { 'Content-Type': f.mime || 'application/octet-stream', 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': (INLINE_EXT.has(extOf(f.name)) ? 'inline' : 'attachment') + "; filename*=UTF-8''" + encodeURIComponent(f.name),
      'Cache-Control': 'private, max-age=300', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
    fs.createReadStream(file).pipe(res);
  }

  return { SCHEMA, migrate, actions, load, upload, download, scanSla, TEMPLATES, FIELD_TYPES };
};

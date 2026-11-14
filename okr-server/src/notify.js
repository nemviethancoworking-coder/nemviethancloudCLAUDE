/**
 * Hộp thông báo trong app (v14). Dùng chung luồng "notes" với email (src/mail.js): hành động ghi thông báo vào c.notes,
 * máy chủ lưu vào bảng notifications TRONG CÙNG giao dịch với hành động đó (hành động lỗi thì không có thông báo),
 * rồi mới gửi email ở nền.
 *
 * Mỗi dòng là dữ liệu có cấu trúc; câu chữ hiển thị do app ghép từ kind + tên người thực hiện:
 *   kind     assigned · reassigned · taskComment · follower · reportFeedback · okrApproved · okrRejected · okrPending
 *            v22 (module Quy trình): wfAssigned · wfTodo · wfComment · wfDone · wfFailed · wfOverdue
 *   refType  task | report | okr | flow   (đích khi bấm vào thông báo)      refId  mã của đối tượng đó (flow: mã job)
 *   refWs    workspace chứa công việc (để mở đúng workspace; flow: mã quy trình)   subject  tên việc / OKR / báo cáo / job      detail  trích bình luận / nhận xét
 */
'use strict';
const crypto = require('crypto');

const KINDS = {
  assigned: 'task', reassigned: 'task', taskComment: 'task', follower: 'task',
  reportFeedback: 'report', okrApproved: 'okr', okrRejected: 'okr', okrPending: 'okr',
  wfAssigned: 'flow', wfTodo: 'flow', wfComment: 'flow', wfDone: 'flow', wfFailed: 'flow', wfOverdue: 'flow',
};
const KEEP = 200;            // mỗi người giữ tối đa 200 thông báo mới nhất
const LIST_LIMIT = 60;       // app tải tối đa 60 thông báo gần nhất
const clip = (s, n) => String(s === null || s === undefined ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const newId = () => 'n' + crypto.randomBytes(8).toString('hex');

/** Chủ đề (subject) của thông báo theo loại. */
function subjectOf(note) {
  if (KINDS[note.kind] === 'task') return clip(note.task && note.task.title, 200);
  if (KINDS[note.kind] === 'flow') return clip(note.job && note.job.title, 200);
  if (note.kind === 'reportFeedback') {
    const r = note.report || {};
    return clip('Báo cáo tuần ' + r.week + '/' + r.year + (r.okrTitle ? ' · ' + r.okrTitle : ''), 200);
  }
  return clip(note.okr && note.okr.title, 200);
}
const refIdOf = note => KINDS[note.kind] === 'task' ? (note.task && note.task.id) : KINDS[note.kind] === 'flow' ? (note.job && note.job.id) : note.kind === 'reportFeedback' ? (note.report && note.report.id) : (note.okr && note.okr.id);

/**
 * Lưu thông báo cho từng người nhận (bỏ người thực hiện, người không tồn tại hoặc đã khoá).
 * q: client giao dịch; byId: bản đồ người dùng. Trả về danh sách mã người nhận (để tăng dấu phiên bản sau khi giao dịch xong).
 */
async function save(q, notes, byId) {
  const recipients = new Set(), wsCache = new Map();
  const wsOf = async taskId => {
    if (!wsCache.has(taskId)) {
      const r = await q.query('SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1', [taskId]);
      wsCache.set(taskId, r.rows[0] ? r.rows[0].workspace_id || '' : '');
    }
    return wsCache.get(taskId);
  };
  for (const note of notes || []) {
    const refType = KINDS[note.kind]; if (!refType) continue;
    const refId = refIdOf(note); if (!refId) continue;
    const refWs = refType === 'task' ? await wsOf(refId) : refType === 'flow' ? String((note.job && note.job.wfId) || '') : '';
    const detail = clip(note.text || (note.okr && note.okr.note), 600);
    const subject = subjectOf(note), when = new Date().toISOString();
    for (const to of [...new Set(note.to || [])]) {
      const u = byId[to];
      if (!u || u.active === false || to === note.actorId) continue;
      await q.query('INSERT INTO notifications(id,user_id,kind,actor_id,ref_type,ref_id,ref_ws,subject,detail,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [newId(), to, note.kind, note.actorId || '', refType, String(refId), refWs, subject, detail, when]);
      recipients.add(to);
    }
  }
  for (const uid of recipients) {
    await q.query('DELETE FROM notifications WHERE user_id = $1 AND seq < (SELECT seq FROM notifications WHERE user_id = $1 ORDER BY seq DESC OFFSET $2 LIMIT 1)', [uid, KEEP - 1]);
  }
  return [...recipients];
}

/** Danh sách thông báo của một người (mới nhất trước) + tổng số chưa đọc. */
async function list(q, userId) {
  const [rows, cnt] = await Promise.all([
    q.query('SELECT id, kind, actor_id, ref_type, ref_id, ref_ws, subject, detail, created_at, is_read FROM notifications WHERE user_id = $1 ORDER BY seq DESC LIMIT $2', [userId, LIST_LIMIT]),
    q.query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read', [userId]),
  ]);
  return {
    unread: cnt.rows[0].n,
    items: rows.rows.map(r => ({ id: r.id, kind: r.kind, actorId: r.actor_id, refType: r.ref_type, refId: r.ref_id, refWs: r.ref_ws, subject: r.subject, detail: r.detail, createdAt: r.created_at, read: r.is_read })),
  };
}

/** Đánh dấu đã đọc / chưa đọc: { all:true } hoặc { ids:[…] }, read mặc định true. Chỉ đụng thông báo của chính người gọi. */
async function mark(q, userId, p) {
  const read = p.read !== false;
  if (p.all) await q.query('UPDATE notifications SET is_read = $2 WHERE user_id = $1 AND is_read <> $2', [userId, read]);
  else {
    const ids = (Array.isArray(p.ids) ? p.ids : []).map(String).slice(0, 200);
    if (ids.length) await q.query('UPDATE notifications SET is_read = $3 WHERE user_id = $1 AND id = ANY($2)', [userId, ids, read]);
  }
}

/** Xoá 1 thông báo { id } hoặc tất cả thông báo đã đọc { clearRead:true } của chính người gọi. */
async function remove(q, userId, p) {
  if (p.clearRead) await q.query('DELETE FROM notifications WHERE user_id = $1 AND is_read', [userId]);
  else if (p.id) await q.query('DELETE FROM notifications WHERE user_id = $1 AND id = $2', [userId, String(p.id)]);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS notifications (id text PRIMARY KEY, user_id text NOT NULL, kind text NOT NULL, actor_id text NOT NULL DEFAULT '', ref_type text NOT NULL DEFAULT '',
  ref_id text NOT NULL DEFAULT '', ref_ws text NOT NULL DEFAULT '', subject text NOT NULL DEFAULT '', detail text NOT NULL DEFAULT '', created_at text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false, seq bigserial);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id, seq DESC);
`;

module.exports = { KINDS, SCHEMA, save, list, mark, remove };

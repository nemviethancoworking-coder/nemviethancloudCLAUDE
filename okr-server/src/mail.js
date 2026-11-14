/**
 * Thông báo qua email (Gmail SMTP). Cấu hình bằng biến môi trường — thiếu SMTP_USER/SMTP_PASS thì tắt, app vẫn chạy bình thường:
 *   SMTP_USER   tài khoản gửi, vd. nemviethancoworking@gmail.com
 *   SMTP_PASS   "Mật khẩu ứng dụng" (App Password) 16 ký tự của tài khoản đó — KHÔNG phải mật khẩu đăng nhập Gmail
 *   SMTP_HOST   mặc định smtp.gmail.com      SMTP_PORT mặc định 465 (SSL)
 *   MAIL_FROM_NAME   tên hiển thị người gửi (mặc định "OKR Weekly")
 *   APP_URL     đường dẫn mở app trong email
 * Cách dùng: hành động ghi thông báo vào c.notes (xem work.js / server.js); sau khi giao dịch thành công, server gọi mail.queue(notes).
 * Gửi tuần tự ở nền, lỗi chỉ ghi log — không bao giờ làm hỏng thao tác của người dùng.
 */
'use strict';

const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;
const PRIORITY = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' };
const fmtDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };

module.exports = function makeMail({ pool, env = process.env, log = console }) {
  const user = String(env.SMTP_USER || '').trim(), pass = String(env.SMTP_PASS || '').replace(/\s+/g, '');
  const appUrl = String(env.APP_URL || 'https://nemviethancoworking-coder.github.io/nemviethancloudCLAUDE/okr/').trim();
  const fromName = String(env.MAIL_FROM_NAME || 'OKR Weekly').trim();
  const enabled = !!(user && pass);
  let transporter = null, chain = Promise.resolve(), warned = false;

  function getTransporter() {
    if (transporter) return transporter;
    const nodemailer = require('nodemailer');
    const port = Number(env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com', port, secure: port === 465, auth: { user, pass },
      pool: true, maxConnections: 2, connectionTimeout: 15000, socketTimeout: 30000,
    });
    return transporter;
  }

  /** Khung email dùng chung: tiêu đề, vài dòng thông tin, nút mở app. */
  function layout(heading, lines, extraHtml) {
    const rows = lines.filter(l => l && l[1]).map(l => `<tr><td style="padding:3px 14px 3px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${esc(l[0])}</td><td style="padding:3px 0;color:#111827">${esc(l[1])}</td></tr>`).join('');
    return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;max-width:560px">
<div style="font-size:16px;font-weight:bold;margin-bottom:12px">${esc(heading)}</div>
<table style="border-collapse:collapse;font-size:14px">${rows}</table>
${extraHtml || ''}
<p style="margin:18px 0 6px"><a href="${esc(appUrl)}" style="background:#2f6fed;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;display:inline-block">Mở OKR Weekly</a></p>
<p style="color:#9ca3af;font-size:12px;margin-top:14px">Email tự động từ hệ thống OKR Weekly. Vui lòng không trả lời email này.</p></div>`;
  }
  const quote = text => text ? `<div style="margin-top:12px;padding:10px 12px;background:#f3f4f6;border-left:3px solid #2f6fed;border-radius:4px;white-space:pre-wrap">${esc(text)}</div>` : '';

  /** Dựng nội dung email từ một thông báo (note) cho một người nhận. */
  function build(note, actor) {
    const who = actor ? actor.name : 'Một đồng nghiệp';
    const t = note.task || {};
    const taskLines = [['Công việc', t.title], ['Dự án', t.project], ['Người giao', who], ['Ngày bắt đầu', fmtDate(t.startDate)], ['Hạn chót', fmtDate(t.due)], ['Ưu tiên', PRIORITY[t.priority] || '']];
    if (note.kind === 'assigned') return { subject: '[OKR Weekly] Bạn được giao việc: ' + t.title, html: layout(who + ' vừa giao việc cho bạn', taskLines) };
    if (note.kind === 'reassigned') return { subject: '[OKR Weekly] Bạn được giao lại việc: ' + t.title, html: layout(who + ' vừa giao lại một công việc cho bạn', taskLines) };
    if (note.kind === 'taskComment') return { subject: '[OKR Weekly] Bình luận mới: ' + t.title, html: layout(who + ' vừa bình luận trong một công việc', [['Công việc', t.title]], quote(note.text)) };
    if (note.kind.startsWith('wf')) {                                                              // v22 — module Quy trình
      const j = note.job || {};
      const info = [['Job', j.title], ['Quy trình', j.wfName], ['Giai đoạn', j.stage], ['Người thực hiện hành động', who], ['Hạn chót', fmtDate(j.due)], ['Ưu tiên', PRIORITY[j.priority] || '']];
      if (note.kind === 'wfAssigned') return { subject: '[OKR Weekly] Bạn được giao job: ' + j.title, html: layout(who + ' vừa giao một job trong quy trình "' + (j.wfName || '') + '" cho bạn', info) };
      if (note.kind === 'wfTodo') return { subject: '[OKR Weekly] Bạn được giao todo trong job: ' + j.title, html: layout(who + ' vừa giao todo cho bạn', [['Job', j.title], ['Quy trình', j.wfName]], quote(note.text)) };
      if (note.kind === 'wfComment') return { subject: '[OKR Weekly] Bình luận mới trong job: ' + j.title, html: layout(who + ' vừa bình luận trong một job', [['Job', j.title], ['Quy trình', j.wfName]], quote(note.text)) };
      if (note.kind === 'wfDone') return { subject: '[OKR Weekly] Job đã Hoàn thành: ' + j.title, html: layout('Job "' + (j.title || '') + '" đã Hoàn thành', [['Quy trình', j.wfName], ['Người đóng job', who]]) };
      if (note.kind === 'wfFailed') return { subject: '[OKR Weekly] Job Thất bại: ' + j.title, html: layout('Job "' + (j.title || '') + '" đã bị đánh dấu Thất bại', [['Quy trình', j.wfName], ['Giai đoạn', j.stage], ['Người đóng job', who]], quote(note.text ? 'Lý do: ' + note.text : '')) };
      return null;                                                                                   // wfOverdue chỉ báo chuông, không gửi email
    }
    if (note.kind === 'reportFeedback') {
      const r = note.report || {};
      return { subject: '[OKR Weekly] ' + who + ' đã phản hồi báo cáo tuần ' + r.week + '/' + r.year,
        html: layout(who + ' vừa phản hồi báo cáo tuần của bạn', [['Báo cáo', 'Tuần ' + r.week + '/' + r.year], ['Mục tiêu (OKR)', r.okrTitle]], quote(note.text)) };
    }
    return null;
  }

  async function deliver(notes) {
    const ids = [...new Set(notes.flatMap(n => (n.to || []).concat(n.actorId ? [n.actorId] : [])))];
    if (!ids.length) return;
    const rows = (await pool.query('SELECT id, name, email, active FROM users WHERE id = ANY($1)', [ids])).rows;
    const by = new Map(rows.map(r => [r.id, r]));
    for (const note of notes) {
      const msg = build(note, by.get(note.actorId));
      if (!msg) continue;
      for (const id of note.to || []) {
        const r = by.get(id);
        if (!r || r.active === false || !EMAIL_RE.test(String(r.email || ''))) continue;      // chưa có email hợp lệ / tài khoản đã khoá → bỏ qua
        try {
          await getTransporter().sendMail({ from: '"' + fromName.replace(/"/g, '') + '" <' + user + '>', to: r.email, subject: msg.subject, html: msg.html });
        } catch (e) { log.error('Gửi email tới ' + r.email + ' thất bại: ' + (e && e.message || e)); }
      }
    }
  }

  /** Xếp hàng gửi ở nền (không chờ). An toàn khi gọi với mảng rỗng hoặc khi email chưa cấu hình. */
  function queue(notes) {
    if (!notes || !notes.length) return;
    if (!enabled) { if (!warned) { warned = true; log.warn('Email thông báo đang TẮT (chưa đặt SMTP_USER / SMTP_PASS).'); } return; }
    chain = chain.then(() => deliver(notes)).catch(e => log.error('Lỗi gửi email: ' + (e && e.message || e)));
  }
  return { enabled, queue, build, EMAIL_RE, whenIdle: () => chain };
};
module.exports.EMAIL_RE = EMAIL_RE;

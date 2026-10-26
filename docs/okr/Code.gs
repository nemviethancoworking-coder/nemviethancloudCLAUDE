/**
 * OKR Weekly — Backend Google Apps Script
 * Gắn với Google Sheet "OKR Weekly - Data" (7 tab: Cycles, Users, OKRs, KRs, Reports, Comments, Tasks)
 * Phiên bản 4: sơ đồ tổ chức 4 cấp Giám đốc → Trưởng phòng → Quản lý → Nhân viên.
 *   - Vai trò: director (Giám đốc) · head (Trưởng phòng) · manager (Quản lý) · employee (Nhân viên);
 *     cột Users.managerId = cấp trên trực tiếp, bắt buộc đúng cấp: NV → Quản lý → Trưởng phòng → Giám đốc.
 *   - Cấp trên (trực tiếp hoặc gián tiếp) quản lý được toàn bộ cấp dưới của mình: Trưởng phòng thấy cả phòng.
 *   - OKR và báo cáo tuần: cả đội xem được của nhau.
 *   - Công việc (Tasks): lọc NGAY TẠI MÁY CHỦ — mỗi người nhận việc của mình + toàn bộ cấp dưới; Giám đốc nhận tất cả. Người không đăng nhập (không có token) không nhận được công việc nào.
 *   - Duyệt OKR, viết chỉ đạo trên báo cáo, giao/sửa công việc: cấp trên trong chuỗi quản lý hoặc Giám đốc.
 *   - Đăng nhập trả về token ký HMAC (hạn 30 ngày); mọi thao tác ghi đều kiểm tra token và quyền.
 * Sau khi dán code mới: Triển khai → Quản lý tuỳ chọn triển khai → ✏️ → Phiên bản: Mới → Triển khai (URL /exec không đổi).
 *
 * Triển khai lần đầu: Tiện ích mở rộng > Apps Script > dán file này > Triển khai > Ứng dụng web
 *   - Thực thi với tư cách: Tôi (chủ sở hữu Sheet)
 *   - Ai có quyền truy cập: Bất kỳ ai
 */

var TABS = {
  Cycles:   ['id', 'name', 'start', 'end', 'active'],
  Users:    ['id', 'username', 'password', 'name', 'role', 'dept', 'title', 'color', 'managerId'],
  OKRs:     ['id', 'ownerId', 'title', 'cycleId', 'status', 'createdBy', 'reviewNote', 'updatedAt'],
  KRs:      ['id', 'okrId', 'title', 'current', 'target', 'unit', 'baseline'],
  Reports:  ['id', 'userId', 'week', 'year', 'okrId', 'createdAt', 'work', 'issues', 'causes', 'krUpdates', 'solutions'],
  Comments: ['id', 'reportId', 'authorId', 'text', 'createdAt', 'acknowledged', 'ackAt'],
  Tasks:    ['id', 'title', 'assigneeId', 'reportId', 'solutionId', 'okrId', 'week', 'year', 'due', 'status', 'createdAt']
};
var NUMERIC = { week: 1, year: 1, current: 1, target: 1, baseline: 1 };
var DATE_ONLY = { due: 1, start: 1, end: 1 };
var BOOL = { acknowledged: 1, active: 1 };
var ROLES = ['director', 'head', 'manager', 'employee'];
var PARENT_ROLE = { head: 'director', manager: 'head', employee: 'manager' };   // cấp trên trực tiếp bắt buộc
var TOKEN_DAYS = 30;
var SCHEMA_VERSION = '3';
var ROLE_NAME = { director: 'Giám đốc', head: 'Trưởng phòng', manager: 'Quản lý', employee: 'Nhân viên' };

/* ---------------- HTTP ---------------- */
function doGet(e) {
  try {
    ensureSchema_();
    var p = (e && e.parameter) || {};
    if (p.ping) return json({ ok: true, ping: 'pong', version: 4, time: new Date().toISOString() });
    var viewer = p.token ? verifyToken(p.token) : null;   // không token: vẫn xem OKR/báo cáo, nhưng không có công việc
    return json({ ok: true, db: loadDB(viewer) });
  } catch (err) { return errJson(err); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    ensureSchema_();
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action, p = body.payload || {};
    if (action === 'ping') return json({ ok: true, ping: 'pong', version: 4 });
    lock.waitLock(15000);
    var extra = {}, viewer;
    if (action === 'login') {
      viewer = login(p);
      extra.user = viewer; extra.token = makeToken(viewer.id);
    } else {
      viewer = verifyToken(body.token);
      var c = ctx_(viewer);
      switch (action) {
        case 'addReport':      addReport(c, p); break;
        case 'deleteReport':   deleteReport(c, p); break;
        case 'addComment':     addComment(c, p); break;
        case 'ackComment':     ackComment(c, p); break;
        case 'addTask':        addTask(c, p); break;
        case 'updateTask':     updateTask(c, p); break;
        case 'deleteTask':     deleteTask(c, p); break;
        case 'saveOKR':        saveOKR(c, p); break;
        case 'reviewOKR':      reviewOKR(c, p); break;
        case 'deleteOKR':      deleteOKR(c, p); break;
        case 'saveCycle':      requireDirector_(c); saveCycle(p); break;
        case 'setActiveCycle': requireDirector_(c); setActiveCycle(p); break;
        case 'deleteCycle':    requireDirector_(c); deleteCycle(p); break;
        case 'saveUser':       saveUser(c, p); break;
        default: throw new Error('Hành động không hợp lệ: ' + action);
      }
      viewer = getUsers().filter(function (u) { return u.id === viewer.id; })[0] || viewer;   // vai trò có thể vừa đổi
    }
    var out = { ok: true, db: loadDB(viewer) };
    for (var k in extra) out[k] = extra[k];
    return json(out);
  } catch (err) {
    return errJson(err);
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function errJson(err) {
  return json({ ok: false, error: String(err && err.message || err), auth: !!(err && err.auth) });
}

/* ---------------- Token đăng nhập (HMAC, không cần lưu phiên) ---------------- */
function secret_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty('TOKEN_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('TOKEN_SECRET', s); }
  return s;
}
function sign_(data) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(data, secret_())).replace(/=+$/, '');
}
function makeToken(userId) {
  var data = userId + '.' + (Date.now() + TOKEN_DAYS * 864e5);
  return data + '.' + sign_(data);
}
function authError_(msg) {
  var e = new Error(msg || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
  e.auth = true;
  return e;
}
function verifyToken(tok) {
  if (!tok) throw authError_('Vui lòng đăng nhập lại để tiếp tục.');
  tok = String(tok);
  var i = tok.lastIndexOf('.'); if (i < 0) throw authError_();
  var data = tok.slice(0, i), sig = tok.slice(i + 1);
  var j = data.lastIndexOf('.'); if (j < 0) throw authError_();
  var uid = data.slice(0, j), exp = Number(data.slice(j + 1));
  if (sign_(data) !== sig || !(exp > Date.now())) throw authError_();
  var u = getUsers().filter(function (x) { return x.id === uid; })[0];
  if (!u) throw authError_('Tài khoản không còn tồn tại.');
  return u;
}

/* ---------------- Phân quyền ---------------- */
function normalizeRoles_(users) {
  users.forEach(function (u) {
    u.role = String(u.role || '').trim().toLowerCase();
    if (ROLES.indexOf(u.role) < 0) u.role = 'employee';
    u.managerId = u.managerId || '';
  });
  // Dữ liệu cũ chưa có Giám đốc: quản lý / trưởng phòng không có cấp trên được coi là Giám đốc.
  if (!users.some(function (u) { return u.role === 'director'; }))
    users.forEach(function (u) { if ((u.role === 'manager' || u.role === 'head') && !u.managerId) u.role = 'director'; });
  return users;
}
function getUsers(withPassword) {
  var users = normalizeRoles_(readTab('Users'));
  if (!withPassword) users.forEach(function (u) { delete u.password; });
  return users;
}
function ctx_(viewer) {
  var users = getUsers(), byId = {};
  users.forEach(function (u) { byId[u.id] = u; });
  return { me: byId[viewer.id] || viewer, users: users, byId: byId };
}
/* viewer quản lý được targetId khi là Giám đốc, hoặc là cấp trên (trực tiếp/gián tiếp) của target trong chuỗi managerId. */
function canManage_(c, targetId) {
  if (c.me.role === 'director') return true;
  if (c.me.role !== 'head' && c.me.role !== 'manager') return false;
  var t = c.byId[targetId], seen = {};
  if (!t || t.id === c.me.id) return false;
  while (t && t.managerId && !seen[t.id]) {
    if (t.managerId === c.me.id) return true;
    seen[t.id] = 1; t = c.byId[t.managerId];
  }
  return false;
}
function canSeeTaskOf_(c, assigneeId) { return assigneeId === c.me.id || canManage_(c, assigneeId); }
function requireDirector_(c) { if (c.me.role !== 'director') throw new Error('Chỉ Giám đốc được thực hiện thao tác này.'); }
function deny_(msg) { throw new Error(msg || 'Bạn không có quyền thực hiện thao tác này.'); }

/* ---------------- Đọc dữ liệu ---------------- */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name) {
  var s = ss().getSheetByName(name);
  if (!s) throw new Error('Thiếu tab "' + name + '" trong Sheet');
  return s;
}
/* Bổ sung tiêu đề cột mới (vd Users.managerId) cho Sheet cũ — chạy một lần cho mỗi phiên bản. */
function ensureSchema_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SCHEMA') === SCHEMA_VERSION) return;
  Object.keys(TABS).forEach(function (name) {
    var s = ss().getSheetByName(name); if (!s) return;
    var cols = TABS[name], head = s.getRange(1, 1, 1, cols.length).getValues()[0];
    cols.forEach(function (col, i) { if (head[i] === '' || head[i] === null || head[i] === undefined) s.getRange(1, i + 1).setValue(col); });
  });
  props.setProperty('SCHEMA', SCHEMA_VERSION);
}
function cell(v, col) {
  if (v instanceof Date) return DATE_ONLY[col] ? Utilities.formatDate(v, 'GMT+7', 'yyyy-MM-dd') : v.toISOString();
  if (NUMERIC[col]) return v === '' ? 0 : Number(v);
  if (BOOL[col]) return v === true || String(v).toUpperCase() === 'TRUE';
  if (v === '') return '';
  return typeof v === 'string' ? v : String(v);
}
function readTab(name) {
  var cols = TABS[name];
  var rows = sheet(name).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === '' || rows[i][0] === null) continue;
    var o = {};
    for (var c = 0; c < cols.length; c++) o[cols[c]] = cell(rows[i][c] === undefined || rows[i][c] === null ? '' : rows[i][c], cols[c]);
    out.push(o);
  }
  return out;
}
function parseJSON(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch (_) { return fallback; } }

/* viewer = người đang đăng nhập (null nếu chưa đăng nhập). Tasks được lọc theo quyền của viewer. */
function loadDB(viewer) {
  var cycles = readTab('Cycles');
  if (!cycles.length) { appendObj('Cycles', { id: 'c1', name: 'Chu kỳ', start: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'), end: Utilities.formatDate(new Date(Date.now() + 90 * 864e5), 'GMT+7', 'yyyy-MM-dd'), active: true }); cycles = readTab('Cycles'); }
  if (!cycles.some(function (c) { return c.active; })) cycles[0].active = true;
  var activeId = cycles.filter(function (c) { return c.active; })[0].id;
  var users = getUsers();
  var krs = readTab('KRs');
  var okrs = readTab('OKRs').map(function (o) {
    o.cycleId = o.cycleId || activeId; o.status = o.status || 'approved'; o.createdBy = o.createdBy || o.ownerId;
    o.krs = krs.filter(function (k) { return k.okrId === o.id; }).map(function (k) { return { id: k.id, title: k.title, baseline: k.baseline, current: k.current, target: k.target, unit: k.unit }; });
    return o;
  });
  var comments = readTab('Comments');
  var reports = readTab('Reports').map(function (r) {
    r.krUpdates = parseJSON(r.krUpdates, []);
    r.solutions = parseJSON(r.solutions, []);
    r.comments = comments.filter(function (c) { return c.reportId === r.id; }).map(function (c) {
      return { id: c.id, authorId: c.authorId, text: c.text, createdAt: c.createdAt, acknowledged: c.acknowledged, ackAt: c.ackAt || null };
    });
    return r;
  });
  var tasks = [];
  if (viewer) {
    var c = ctx_(viewer);
    tasks = readTab('Tasks').filter(function (t) { return canSeeTaskOf_(c, t.assigneeId); }).map(function (t) {
      t.reportId = t.reportId || null; t.solutionId = t.solutionId || null; t.okrId = t.okrId || null;
      return t;
    });
  }
  return { cycles: cycles, users: users, okrs: okrs, reports: reports, tasks: tasks, viewerId: viewer ? viewer.id : null, loadedAt: new Date().toISOString() };
}

/* ---------------- Ghi dữ liệu ---------------- */
function safe(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return v;
  var s = String(v);
  return /^[=+\-@]/.test(s) ? ' ' + s : s;   // tránh bị hiểu là công thức
}
function appendObj(name, obj) {
  var cols = TABS[name], s = sheet(name);
  var row = cols.map(function (c) { return safe(obj[c]); });
  var r = s.getLastRow() + 1;
  var rng = s.getRange(r, 1, 1, cols.length);
  rng.setNumberFormat('@');
  rng.setValues([row]);
}
function findRow(name, id) {
  var ids = sheet(name).getRange(2, 1, Math.max(sheet(name).getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}
function updateById(name, id, patch) {
  var row = findRow(name, id);
  if (row < 0) throw new Error('Không tìm thấy ' + name + ' id=' + id);
  var cols = TABS[name], s = sheet(name);
  for (var k in patch) {
    var ci = cols.indexOf(k);
    if (ci >= 0) { var rg = s.getRange(row, ci + 1); rg.setNumberFormat('@'); rg.setValue(safe(patch[k])); }
  }
}
function deleteWhere(name, pred) {
  var s = sheet(name), rows = readTab(name), n = 0;
  for (var i = rows.length - 1; i >= 0; i--) {
    if (pred(rows[i])) { var r = findRow(name, rows[i].id); if (r > 0) { s.deleteRow(r); n++; } }
  }
  return n;
}
function byId_(name, id) { return readTab(name).filter(function (x) { return x.id === id; })[0]; }

/* ---------------- Hành động ---------------- */
function login(p) {
  var u = getUsers(true).filter(function (x) { return x.username === String(p.username || '').trim() && String(x.password) === String(p.password || ''); })[0];
  if (!u) throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
  delete u.password;
  return u;
}

/* Báo cáo tuần: chỉ chủ báo cáo được gửi; công việc sinh ra luôn giao cho chính người gửi. */
function addReport(c, p) {
  var r = p.report, tasks = p.tasks || [];
  if (!r || !r.id || !r.okrId) throw new Error('Thiếu dữ liệu báo cáo.');
  r.userId = c.me.id;
  var okr = byId_('OKRs', r.okrId);
  if (!okr || okr.ownerId !== c.me.id) deny_('Chỉ gửi được báo cáo cho OKR của chính bạn.');
  var dup = readTab('Reports').some(function (x) { return x.userId === r.userId && x.okrId === r.okrId && Number(x.week) === Number(r.week) && Number(x.year) === Number(r.year); });
  if (dup) throw new Error('Đã có báo cáo tuần này cho OKR này.');
  appendObj('Reports', {
    id: r.id, userId: r.userId, week: Number(r.week), year: Number(r.year), okrId: r.okrId, createdAt: r.createdAt,
    work: r.work, issues: r.issues, causes: r.causes,
    krUpdates: JSON.stringify(r.krUpdates || []), solutions: JSON.stringify(r.solutions || [])
  });
  var krIds = {}; readTab('KRs').forEach(function (k) { if (k.okrId === okr.id) krIds[k.id] = 1; });
  (r.krUpdates || []).forEach(function (ku) { if (krIds[ku.krId]) updateById('KRs', ku.krId, { current: Number(ku.value) || 0 }); });
  tasks.forEach(function (t) { t.assigneeId = c.me.id; t.reportId = r.id; appendObj('Tasks', t); });
}
function deleteReport(c, p) {
  var r = byId_('Reports', p.id); if (!r) return;
  if (r.userId !== c.me.id && c.me.role !== 'director') deny_('Chỉ người viết báo cáo hoặc Giám đốc được xoá báo cáo.');
  deleteWhere('Tasks', function (t) { return t.reportId === p.id; });
  deleteWhere('Comments', function (x) { return x.reportId === p.id; });
  deleteWhere('Reports', function (x) { return x.id === p.id; });
}
/* Phản hồi: chủ báo cáo, quản lý trực tiếp của họ, hoặc Giám đốc. */
function addComment(c, p) {
  var cm = p.comment;
  if (!cm || !cm.reportId || !cm.text) throw new Error('Thiếu nội dung phản hồi.');
  var r = byId_('Reports', cm.reportId); if (!r) throw new Error('Báo cáo không còn tồn tại.');
  if (r.userId !== c.me.id && !canManage_(c, r.userId)) deny_('Chỉ cấp trên của người viết hoặc Giám đốc được phản hồi báo cáo này.');
  appendObj('Comments', { id: cm.id, reportId: cm.reportId, authorId: c.me.id, text: cm.text, createdAt: cm.createdAt, acknowledged: false, ackAt: '' });
}
function ackComment(c, p) {
  var cm = byId_('Comments', p.id); if (!cm) throw new Error('Không tìm thấy phản hồi.');
  var r = byId_('Reports', cm.reportId);
  if (!r || r.userId !== c.me.id) deny_('Chỉ người viết báo cáo được xác nhận chỉ đạo.');
  updateById('Comments', p.id, { acknowledged: true, ackAt: p.ackAt || new Date().toISOString() });
}
/* Công việc: chỉ trong phạm vi của mình (bản thân + nhân viên trực thuộc; Giám đốc: tất cả). */
function addTask(c, p) {
  var t = p.task;
  if (!t || !t.id || !t.title) throw new Error('Thiếu dữ liệu công việc.');
  t.assigneeId = t.assigneeId || c.me.id;
  if (!canSeeTaskOf_(c, t.assigneeId)) deny_('Bạn chỉ giao được việc cho chính mình hoặc nhân viên trực thuộc.');
  appendObj('Tasks', t);
}
function updateTask(c, p) {
  var t = byId_('Tasks', p.id); if (!t) throw new Error('Không tìm thấy công việc.');
  if (!canSeeTaskOf_(c, t.assigneeId)) deny_();
  var patch = {}, src = p.patch || {};
  ['status', 'title', 'due'].forEach(function (k) { if (src[k] !== undefined) patch[k] = src[k]; });
  updateById('Tasks', p.id, patch);
}
function deleteTask(c, p) {
  var t = byId_('Tasks', p.id); if (!t) return;
  if (!canSeeTaskOf_(c, t.assigneeId)) deny_();
  deleteWhere('Tasks', function (x) { return x.id === p.id; });
}

/* OKR: chủ OKR tự đề xuất (chờ duyệt), hoặc quản lý trực tiếp/Giám đốc tạo-sửa (duyệt ngay). */
function saveOKR(c, p) {
  var o = p.okr;
  if (!o || !o.id || !o.title || !o.ownerId || !o.cycleId) throw new Error('Thiếu dữ liệu OKR.');
  if (!o.krs || !o.krs.length) throw new Error('OKR cần ít nhất 1 KR.');
  if (!c.byId[o.ownerId]) throw new Error('Người phụ trách không tồn tại.');
  var old = byId_('OKRs', o.id);
  var allowed = function (ownerId) { return ownerId === c.me.id || canManage_(c, ownerId); };
  if (!allowed(o.ownerId) || (old && !allowed(old.ownerId))) deny_('Bạn chỉ tạo/sửa được OKR của chính mình hoặc nhân viên trực thuộc.');
  var approved = canManage_(c, o.ownerId);
  var row = { id: o.id, ownerId: o.ownerId, title: o.title, cycleId: o.cycleId, status: approved ? 'approved' : 'pending',
              createdBy: old ? (old.createdBy || old.ownerId) : c.me.id, reviewNote: approved && old ? old.reviewNote : '', updatedAt: o.updatedAt || new Date().toISOString() };
  if (old) updateById('OKRs', o.id, row); else appendObj('OKRs', row);
  var existing = readTab('KRs').filter(function (k) { return k.okrId === o.id; });
  var keep = {};
  o.krs.forEach(function (k) {
    keep[k.id] = true;
    var oldK = existing.filter(function (x) { return x.id === k.id; })[0];
    var rec = { id: k.id, okrId: o.id, title: k.title, baseline: Number(k.baseline) || 0, target: Number(k.target) || 0, unit: k.unit || '',
                current: oldK ? oldK.current : (k.current !== undefined ? Number(k.current) || 0 : Number(k.baseline) || 0) };
    if (oldK) updateById('KRs', k.id, rec); else appendObj('KRs', rec);
  });
  deleteWhere('KRs', function (k) { return k.okrId === o.id && !keep[k.id]; });
}
function reviewOKR(c, p) {
  if (!p.id || ['approved', 'rejected'].indexOf(p.status) < 0) throw new Error('Thiếu dữ liệu duyệt.');
  var o = byId_('OKRs', p.id); if (!o) throw new Error('Không tìm thấy OKR.');
  if (!canManage_(c, o.ownerId)) deny_('Chỉ cấp trên của người phụ trách hoặc Giám đốc được duyệt OKR này.');
  updateById('OKRs', p.id, { status: p.status, reviewNote: p.reviewNote || '', updatedAt: p.updatedAt || new Date().toISOString() });
}
function deleteOKR(c, p) {
  var o = byId_('OKRs', p.id); if (!o) return;
  if (!canManage_(c, o.ownerId) && !(o.ownerId === c.me.id && o.status !== 'approved')) deny_('Bạn không được xoá OKR này.');
  if (readTab('Reports').some(function (r) { return r.okrId === p.id; })) throw new Error('Đã có báo cáo tuần gắn với OKR này, không thể xoá.');
  deleteWhere('KRs', function (k) { return k.okrId === p.id; });
  deleteWhere('OKRs', function (x) { return x.id === p.id; });
  readTab('Tasks').forEach(function (t) { if (t.okrId === p.id) updateById('Tasks', t.id, { okrId: '' }); });
}

/* Nhân sự (chỉ Giám đốc): thêm/sửa tài khoản, vai trò, quản lý trực tiếp. */
function saveUser(c, p) {
  requireDirector_(c);
  var u = p.user || {};
  var name = String(u.name || '').trim(), username = String(u.username || '').trim();
  if (!name || !username) throw new Error('Nhập đủ họ tên và tên đăng nhập.');
  var role = ROLES.indexOf(u.role) >= 0 ? u.role : 'employee';
  var all = getUsers(true), old = u.id ? all.filter(function (x) { return x.id === u.id; })[0] : null;
  var id = old ? old.id : (u.id || ('u' + Utilities.getUuid().replace(/-/g, '').slice(0, 8)));
  if (all.some(function (x) { return x.username === username && x.id !== id; })) throw new Error('Tên đăng nhập "' + username + '" đã được dùng.');
  if (!old && !u.password) throw new Error('Tài khoản mới cần có mật khẩu.');
  if (old && old.id === c.me.id && role !== 'director') throw new Error('Không thể tự bỏ vai trò Giám đốc của chính mình.');
  var mgrId = role === 'director' ? '' : (u.managerId || '');
  if (mgrId) {
    var m = all.filter(function (x) { return x.id === mgrId; })[0];
    if (!m || m.id === id) throw new Error('Cấp trên trực tiếp không hợp lệ.');
    if (m.role !== PARENT_ROLE[role]) throw new Error(ROLE_NAME[role] + ' phải trực thuộc một ' + ROLE_NAME[PARENT_ROLE[role]] + '.');
  }
  if (old && old.role !== role) {
    var wrong = all.filter(function (x) { return x.managerId === old.id && PARENT_ROLE[x.role] !== role; });
    if (wrong.length) throw new Error('Còn ' + wrong.length + ' người trực thuộc không hợp với vai trò mới. Hãy chuyển họ sang cấp trên khác trước.');
  }
  var rec = { id: id, username: username, name: name, role: role, dept: u.dept || '', title: u.title || '', color: u.color || (old && old.color) || '#2f6fed', managerId: mgrId };
  if (u.password) rec.password = String(u.password);
  if (old) updateById('Users', id, rec); else appendObj('Users', rec);
}

/* Chu kỳ */
function saveCycle(p) {
  var c = p.cycle;
  if (!c || !c.id || !c.name || !c.start || !c.end) throw new Error('Thiếu dữ liệu chu kỳ.');
  var rec = { id: c.id, name: c.name, start: c.start, end: c.end, active: !!c.active };
  if (findRow('Cycles', c.id) > 0) updateById('Cycles', c.id, rec); else appendObj('Cycles', rec);
  if (c.active) setActiveCycle({ id: c.id });
  else if (!readTab('Cycles').some(function (x) { return x.active; })) updateById('Cycles', c.id, { active: true });
}
function setActiveCycle(p) {
  readTab('Cycles').forEach(function (c) { updateById('Cycles', c.id, { active: c.id === p.id }); });
}
function deleteCycle(p) {
  if (readTab('OKRs').some(function (o) { return o.cycleId === p.id; })) throw new Error('Chu kỳ đang có OKR, không thể xoá.');
  var c = readTab('Cycles').filter(function (x) { return x.id === p.id; })[0];
  if (c && c.active) throw new Error('Không thể xoá chu kỳ đang hoạt động.');
  deleteWhere('Cycles', function (x) { return x.id === p.id; });
}

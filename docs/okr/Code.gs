/**
 * OKR Weekly — Backend Google Apps Script
 * Gắn với Google Sheet "OKR Weekly - Data" (7 tab: Cycle, Users, OKRs, KRs, Reports, Comments, Tasks)
 *
 * Triển khai: Tiện ích mở rộng > Apps Script > dán file này > Triển khai > Ứng dụng web
 *   - Thực thi với tư cách: Tôi (chủ sở hữu Sheet)
 *   - Ai có quyền truy cập: Bất kỳ ai
 * Dán URL ứng dụng web (…/exec) vào mục "Cài đặt đồng bộ" của index.html.
 */

var TABS = {
  Cycle:    ['name', 'start', 'end'],
  Users:    ['id', 'username', 'password', 'name', 'role', 'dept', 'title', 'color'],
  OKRs:     ['id', 'ownerId', 'title'],
  KRs:      ['id', 'okrId', 'title', 'current', 'target', 'unit'],
  Reports:  ['id', 'userId', 'week', 'year', 'okrId', 'createdAt', 'work', 'issues', 'causes', 'krUpdates', 'solutions'],
  Comments: ['id', 'reportId', 'authorId', 'text', 'createdAt', 'acknowledged', 'ackAt'],
  Tasks:    ['id', 'title', 'assigneeId', 'reportId', 'solutionId', 'okrId', 'week', 'year', 'due', 'status', 'createdAt']
};
var NUMERIC = { week: 1, year: 1, current: 1, target: 1 };
var DATE_ONLY = { due: 1, start: 1, end: 1 };

/* ---------------- HTTP ---------------- */
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.ping) return json({ ok: true, ping: 'pong', time: new Date().toISOString() });
    return json({ ok: true, db: loadDB() });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action, p = body.payload || {};
    var extra = {};
    switch (action) {
      case 'login':       extra.user = login(p); break;
      case 'addReport':   addReport(p); break;
      case 'deleteReport': deleteReport(p); break;
      case 'addComment':  addComment(p); break;
      case 'ackComment':  ackComment(p); break;
      case 'addTask':     addTask(p); break;
      case 'updateTask':  updateTask(p); break;
      case 'deleteTask':  deleteTask(p); break;
      case 'ping':        return json({ ok: true, ping: 'pong' });
      default: throw new Error('Hành động không hợp lệ: ' + action);
    }
    var out = { ok: true, db: loadDB() };
    for (var k in extra) out[k] = extra[k];
    return json(out);
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Đọc dữ liệu ---------------- */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name) {
  var s = ss().getSheetByName(name);
  if (!s) throw new Error('Thiếu tab "' + name + '" trong Sheet');
  return s;
}
function cell(v, col) {
  if (v instanceof Date) return DATE_ONLY[col] ? Utilities.formatDate(v, 'GMT+7', 'yyyy-MM-dd') : v.toISOString();
  if (NUMERIC[col]) return v === '' ? 0 : Number(v);
  if (col === 'acknowledged') return v === true || String(v).toUpperCase() === 'TRUE';
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
    for (var c = 0; c < cols.length; c++) o[cols[c]] = cell(rows[i][c] === undefined ? '' : rows[i][c], cols[c]);
    out.push(o);
  }
  return out;
}
function parseJSON(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch (_) { return fallback; } }

function loadDB() {
  var cycleRows = readTab('Cycle');
  var cycle = cycleRows[0] || { name: 'Chu kỳ', start: '', end: '' };
  var users = readTab('Users').map(function (u) { delete u.password; return u; });
  var krs = readTab('KRs');
  var okrs = readTab('OKRs').map(function (o) {
    o.krs = krs.filter(function (k) { return k.okrId === o.id; }).map(function (k) { return { id: k.id, title: k.title, current: k.current, target: k.target, unit: k.unit }; });
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
  var tasks = readTab('Tasks').map(function (t) {
    t.reportId = t.reportId || null; t.solutionId = t.solutionId || null; t.okrId = t.okrId || null;
    return t;
  });
  return { cycle: cycle, users: users, okrs: okrs, reports: reports, tasks: tasks, loadedAt: new Date().toISOString() };
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

/* ---------------- Hành động ---------------- */
function login(p) {
  var u = readTab('Users').filter(function (x) { return x.username === String(p.username || '').trim() && String(x.password) === String(p.password || ''); })[0];
  if (!u) throw new Error('Sai tên đăng nhập hoặc mật khẩu.');
  delete u.password;
  return u;
}
function addReport(p) {
  var r = p.report, tasks = p.tasks || [];
  if (!r || !r.id || !r.userId || !r.okrId) throw new Error('Thiếu dữ liệu báo cáo.');
  var dup = readTab('Reports').some(function (x) { return x.userId === r.userId && x.okrId === r.okrId && Number(x.week) === Number(r.week) && Number(x.year) === Number(r.year); });
  if (dup) throw new Error('Đã có báo cáo tuần này cho OKR này.');
  appendObj('Reports', {
    id: r.id, userId: r.userId, week: Number(r.week), year: Number(r.year), okrId: r.okrId, createdAt: r.createdAt,
    work: r.work, issues: r.issues, causes: r.causes,
    krUpdates: JSON.stringify(r.krUpdates || []), solutions: JSON.stringify(r.solutions || [])
  });
  (r.krUpdates || []).forEach(function (ku) { updateById('KRs', ku.krId, { current: Number(ku.value) || 0 }); });
  tasks.forEach(function (t) { appendObj('Tasks', t); });
}
function deleteReport(p) {
  deleteWhere('Tasks', function (t) { return t.reportId === p.id; });
  deleteWhere('Comments', function (c) { return c.reportId === p.id; });
  deleteWhere('Reports', function (r) { return r.id === p.id; });
}
function addComment(p) {
  var c = p.comment;
  if (!c || !c.reportId || !c.text) throw new Error('Thiếu nội dung phản hồi.');
  appendObj('Comments', { id: c.id, reportId: c.reportId, authorId: c.authorId, text: c.text, createdAt: c.createdAt, acknowledged: false, ackAt: '' });
}
function ackComment(p) { updateById('Comments', p.id, { acknowledged: true, ackAt: p.ackAt || new Date().toISOString() }); }
function addTask(p) { appendObj('Tasks', p.task); }
function updateTask(p) { updateById('Tasks', p.id, p.patch || {}); }
function deleteTask(p) { deleteWhere('Tasks', function (t) { return t.id === p.id; }); }

/* ============================================================
   MODULE QUY TRÌNH (kiểu Base Workflow) — chạy trong app OKR Weekly (v22)
   Quy trình → Giai đoạn → Job. Mỗi job đi tuần tự qua các giai đoạn, có người thực hiện, hạn SLA, todo (có todo bắt buộc),
   trường tuỳ chỉnh, bình luận, tệp đính kèm, chuyển tiếp sang quy trình khác.
   - Quyền: Giám đốc + Trưởng phòng tạo quy trình (người tạo = owner). Chỉ thành viên (và Giám đốc) thấy quy trình; mọi thành viên tạo được job.
   - Chuyển giai đoạn: người thực hiện hiện tại hoặc owner/Giám đốc, tuần tự 1 bước tiến / 1 bước lùi. Chặn khi còn todo/trường bắt buộc.
   - Mọi quyền đều được máy chủ kiểm tra lại; giao diện chỉ ẩn/hiện nút cho gọn.
   Dùng chung đăng nhập, API và hàm tiện ích của index.html. Toàn bộ nằm trong 1 IIFE và chỉ lộ ra đối tượng Fl.
   ============================================================ */
(function(){
'use strict';

/* ---------- Hằng số hiển thị ---------- */
const PRIO = {
  low:    { t:'Thấp',       c:'bg-slate-100 text-slate-600 border-slate-200', bar:'#94a3b8' },
  medium: { t:'Trung bình', c:'bg-blue-50 text-blue-700 border-blue-200',     bar:'#2f6fed' },
  high:   { t:'Cao',        c:'bg-amber-50 text-amber-700 border-amber-200',  bar:'#d97706' },
  urgent: { t:'Khẩn cấp',   c:'bg-red-50 text-red-700 border-red-200',        bar:'#dc2626' },
};
const FT = { text:'Chữ một dòng', textarea:'Đoạn văn', number:'Số', money:'Tiền (đ)', date:'Ngày', select:'Chọn một', multiselect:'Chọn nhiều', user:'Người', checkbox:'Ô tick', link:'Liên kết', file:'Tệp đính kèm' };
const COLORS = ['#2f6fed', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#dc2626', '#4f46e5', '#0d9488'];
const OK_EXT = ['jpg','jpeg','png','gif','webp','bmp','heic','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','rtf','odt','ods','zip'];
const MAX_MB = 10;
const CLOSED_SHOW = 20;                         // số thẻ Hoàn thành / Thất bại hiện sẵn trong bảng
const FINE = !!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches);
const svg = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const FI = {
  board:  svg('<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>'),
  list:   svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  chart:  svg('<path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/>'),
  clip:   svg('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', 14),
  clock:  svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 13),
  cal:    svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 13),
  check:  svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', 13),
  star:   svg('<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', 16),
  right:  svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 15),
  left:   svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 15),
  gear:   svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>', 15),
  users:  svg('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>', 15),
  hist:   svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>', 15),
  box:    svg('<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>', 15),
  down:   svg('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>', 15),
  fwd:    svg('<path d="M15 14l5-5-5-5"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>', 15),
  up:     svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 14),
  dn:     svg('<path d="M12 5v14M5 12l7 7 7-7"/>', 14),
};

/* ---------- Trạng thái ---------- */
const lsGet = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
const S = {
  list: null, tmpl: [], canCreate: false, loading: false, error: null, ver: {},
  tab: lsGet('okr_flow_tab') === 'mine' ? 'mine' : 'home',          // màn gốc: danh sách quy trình / job của tôi
  mineTab: 'assigned', showArchWf: false,
  wfId: '', wfTab: 'board', cache: {},                                // cache[id] = dữ liệu 1 quy trình (cấu hình + job)
  mine: null, report: null, repRange: { from: '', to: '' }, activity: null, arch: null,
  f: { q: '', who: 'all', pri: 'all', over: false }, sort: { k: 'due', d: 1 }, closedLimit: CLOSED_SHOW, listLimit: 200,
  det: null, detId: '', detLoading: false, drag: null, over: null, mention: new Set(),
  cfg: null, mem: null, draft: null, uploading: 0, ver2: 0,
};

/* ---------- Tiện ích ---------- */
const $ = id => document.getElementById(id);
const meId = () => session();
const newId = p => p + uid() + Math.random().toString(36).slice(2, 6);
const today = () => toISO(new Date());
const enc = encodeURIComponent;
const qurl = q => apiUrl() + (apiUrl().includes('?') ? '&' : '?') + q;
const wfd = id => S.cache[id || S.wfId] || null;                     // dữ liệu quy trình đã tải
const wfInfo = id => { const w = S.list ? S.list.workflows.find(x => x.id === id) : null; return w; };
const stageOf = (d, id) => d ? d.stages.find(s => s.id === id) : null;
const stageIdx = (d, id) => d ? d.stages.findIndex(s => s.id === id) : -1;
const activeUsers = () => DB.users.filter(isActive);
const uName = id => (findUser(id) || { name: '?' }).name;
const isOwnerOrDir = d => !!(d && d.workflow && d.workflow.canManage);
const canMoveJob = (j, d) => isOwnerOrDir(d) || (j.assigneeIds || []).includes(meId());
const canEditJob = (j, d) => canMoveJob(j, d) || j.createdBy === meId();
const plain = v => richPlain(v || '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const sizeText = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const fileUrl = id => apiUrl() + 'file/' + enc(id) + '?token=' + enc(token());
const money = v => { const n = Number(v); return isFinite(n) ? n.toLocaleString('vi-VN') + ' đ' : String(v); };
const stack = (ids, max = 3) => {
  ids = ids || []; if(!ids.length) return '<span class="text-gray-300 text-[12px]">Chưa giao</span>';
  const shown = ids.slice(0, max).map(id => `<span class="-ml-1.5 first:ml-0 ring-2 ring-white rounded-full" title="${esc(uName(id))}">${avatar(user(id), 'w-6 h-6 text-[10px]')}</span>`).join('');
  return `<span class="inline-flex items-center">${shown}${ids.length > max ? `<span class="-ml-1.5 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">+${ids.length - max}</span>` : ''}</span>`;
};
function dur(ms){ const m = Math.max(1, Math.round(ms / 60000)); if(m < 60) return m + ' phút'; const h = Math.round(m / 60); return h < 48 ? h + ' giờ' : Math.round(h / 24) + ' ngày'; }
const slaOver = j => j.status === 'open' && !!j.slaDueAt && new Date(j.slaDueAt).getTime() < Date.now();
const dueOver = j => j.status === 'open' && !!j.due && j.due < today();
const isOver = j => slaOver(j) || dueOver(j);
function slaChip(j){
  if(j.status !== 'open' || !j.slaDueAt) return '';
  const ms = new Date(j.slaDueAt).getTime() - Date.now(), over = ms < 0;
  const c = over ? 'bg-red-50 text-red-700 border-red-200 font-semibold' : ms < 4 * 3600e3 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200';
  return `<span class="inline-flex items-center gap-1 text-[11.5px] px-1.5 py-0.5 rounded border whitespace-nowrap ${c}" title="Hạn SLA của giai đoạn: ${fmtDT(j.slaDueAt)}">${FI.clock} ${over ? 'Quá ' + dur(-ms) : 'Còn ' + dur(ms)}</span>`;
}
function dueChip(j){
  if(!j.due) return '';
  const od = dueOver(j);
  return `<span class="inline-flex items-center gap-1 text-[12px] whitespace-nowrap ${od ? 'text-red-600 font-semibold' : 'text-gray-500'}" title="Hạn chót của cả job">${FI.cal} ${fmt(j.due)}</span>`;
}
const prioBadge = p => `<span class="badge ${PRIO[p] ? PRIO[p].c : PRIO.medium.c}">${PRIO[p] ? PRIO[p].t : 'Trung bình'}</span>`;
function statusBadge(j){
  if(j.status === 'done') return '<span class="badge bg-green-50 text-green-700 border-green-200">Hoàn thành</span>';
  if(j.status === 'failed') return `<span class="badge bg-red-50 text-red-700 border-red-200" title="${esc(j.failReason || '')}">Thất bại</span>`;
  return '<span class="badge bg-blue-50 text-blue-700 border-blue-200">Đang làm</span>';
}
const tagChips = tags => (tags || []).map(t => `<span class="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">${esc(t)}</span>`).join('');
const dot = c => `<span class="w-2.5 h-2.5 rounded-full shrink-0 inline-block" style="background:${esc(c || '#2f6fed')}"></span>`;
const loadingCard = msg => `<div class="card p-10 text-center text-gray-500 flex items-center justify-center gap-3"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>${msg}</div>`;
const errorCard = (msg, fn) => `<div class="card p-10 text-center"><div class="text-red-600 mb-3">${esc(msg)}</div><button class="btn btn-primary" onclick="${fn}">${I.refresh} Thử lại</button></div>`;
const KIND_TXT = {
  'workflow.create': 'tạo quy trình', 'workflow.edit': 'sửa thông tin quy trình', 'config.save': 'lưu cấu hình quy trình', 'members.set': 'cập nhật thành viên',
  'job.create': 'tạo job', 'job.edit': 'sửa job', 'job.move': 'chuyển giai đoạn', 'job.done': 'đánh dấu Hoàn thành', 'job.failed': 'đánh dấu Thất bại', 'job.reopen': 'mở lại job',
  'job.archive': 'lưu trữ job', 'job.unarchive': 'bỏ lưu trữ job', 'job.delete': 'xoá job', 'job.followers': 'cập nhật người theo dõi', 'job.forward': 'chuyển tiếp job',
  'todo.add': 'thêm todo', 'todo.done': 'hoàn thành todo', 'todo.undo': 'bỏ tick todo',
};
function actText(a){
  const d = a.detail || {}, base = KIND_TXT[a.kind] || a.kind;
  switch(a.kind){
    case 'job.move': return `${base}: ${esc(d.from || '?')} → ${esc(d.to || '?')}`;
    case 'job.failed': return `${base}${d.reason ? ' — ' + esc(d.reason) : ''}`;
    case 'job.forward': return `${base} sang “${esc(d.toWorkflow || '?')}”${d.mode === 'auto' ? ' (tự động)' : ''}`;
    case 'job.create': return d.forward ? `nhận job chuyển tiếp từ “${esc(d.fromWorkflow || '?')}”` : base;
    case 'todo.add': case 'todo.done': case 'todo.undo': return `${base}: ${esc(d.title || '')}`;
    case 'job.reopen': return `${base} về giai đoạn ${esc(d.stage || '?')}`;
    case 'members.set': return `${base} (${d.count || 0} người)`;
  }
  return base;
}

/* ---------- Gọi máy chủ ---------- */
async function ffetch(url, opts){
  const res = await fetch(url, opts), txt = await res.text();
  let j; try { j = JSON.parse(txt); } catch(e){ throw new Error('Không kết nối được máy chủ dữ liệu, vui lòng thử lại.'); }
  if(!j.ok){ const e = new Error(j.error || 'Lỗi máy chủ'); e.auth = !!j.auth; throw e; }
  return j;
}
async function get(kind, params, key){
  const q = ['flow=' + enc(kind)];
  Object.keys(params || {}).forEach(k => { if(params[k] !== '' && params[k] != null) q.push(k + '=' + enc(params[k])); });
  q.push('t=' + Date.now(), 'token=' + enc(token()));
  if(key && S.ver[key]) q.push('v=' + enc(S.ver[key]));
  const j = await ffetch(qurl(q.join('&')));
  if(key && j.version && !j.unchanged) S.ver[key] = j.version;
  return j;
}
const sig = o => JSON.stringify(o);
const active = () => typeof state !== 'undefined' && state.view === 'flow' && !!session();
function repaintIfActive(quiet){ if(active()) repaint(quiet); }
function repaint(quiet){
  const c = $('content'), b = $('fl-board');
  const top = c ? c.scrollTop : 0, left = b ? b.scrollLeft : 0, colTops = [...document.querySelectorAll('[data-fcol]')].map(e => e.scrollTop);
  render();
  const c2 = $('content'), b2 = $('fl-board');
  if(c2) c2.scrollTop = top; if(b2) b2.scrollLeft = left;
  document.querySelectorAll('[data-fcol]').forEach((e, i) => { if(colTops[i]) e.scrollTop = colTops[i]; });
  if(quiet && typeof killFade === 'function') killFade();
}
function authFail(e){ if(e.auth){ forceLogout(e.message); return true; } return false; }

/** Mỗi hàm tải trả về true nếu nội dung thật sự đổi. opts.noPaint: để người gọi tự vẽ lại. */
async function loadList(silent, opts){
  opts = opts || {}; if(!online() || !session()) return false;
  try {
    const j = await get('list', {}, 'list');
    if(j.unchanged) return false;
    const prev = sig([S.list, S.canCreate]);
    S.list = { workflows: j.workflows || [] }; S.tmpl = j.templates || []; S.canCreate = !!j.canCreate; S.error = null;
    const ch = prev !== sig([S.list, S.canCreate]); if(ch && !opts.noPaint) repaintIfActive(true); return ch;
  } catch(e){
    if(authFail(e)) return false;
    S.error = e.message; if(!silent) toast(e.message, 'error'); if(!opts.noPaint) repaintIfActive(true); return true;
  }
}
async function loadWf(id, silent, opts){
  opts = opts || {}; if(!online() || !session() || !id) return false;
  try {
    const j = await get('wf', { id }, 'wf:' + id);
    if(j.unchanged) return false;
    const prev = sig(S.cache[id]);
    S.cache[id] = j; S.error = null;
    const ch = prev !== sig(j); if(ch && !opts.noPaint) repaintIfActive(true); return ch;
  } catch(e){
    if(authFail(e)) return false;
    if(S.wfId === id){ S.error = e.message; if(!silent) toast(e.message, 'error'); if(!opts.noPaint) repaintIfActive(true); }
    return true;
  }
}
async function loadMine(silent, opts){
  opts = opts || {}; if(!online() || !session()) return false;
  try {
    const j = await get('mine', {}, 'mine');
    if(j.unchanged) return false;
    const prev = sig(S.mine); S.mine = { jobs: j.jobs || [], todos: j.todos || [] };
    const ch = prev !== sig(S.mine); if(ch && !opts.noPaint) repaintIfActive(true); return ch;
  } catch(e){ if(!authFail(e) && !silent) toast(e.message, 'error'); return false; }
}
async function loadArch(id){
  try { const j = await get('wf', { id, archived: '1' }); S.arch = { id, jobs: j.jobs || [] }; }
  catch(e){ if(!authFail(e)) toast(e.message, 'error'); S.arch = { id, jobs: [] }; }
  repaintIfActive(true);
}
async function loadReport(id){
  try { const j = await get('report', { id, from: S.repRange.from, to: S.repRange.to }); S.report = { id, ...j.report }; }
  catch(e){ if(!authFail(e)) toast(e.message, 'error'); S.report = { id, error: e.message }; }
  repaintIfActive(true);
}
async function loadActivity(id){
  try { const j = await get('activity', { id }); S.activity = { id, items: j.activity || [] }; }
  catch(e){ if(!authFail(e)) toast(e.message, 'error'); S.activity = { id, items: [], error: e.message }; }
  repaintIfActive(true);
}
/** Tải lại những gì đang xem (sau khi ghi) rồi vẽ lại một lần. */
async function refresh(){
  S.ver = {};
  const ps = [loadList(true, { noPaint: true })];
  if(S.wfId) ps.push(loadWf(S.wfId, true, { noPaint: true }));
  if(!S.wfId && S.tab === 'mine') ps.push(loadMine(true, { noPaint: true }));
  else if(S.mine) ps.push(loadMine(true, { noPaint: true }));
  await Promise.all(ps);
  if(S.wfId && S.wfTab === 'archive') await loadArch(S.wfId);
  if(S.det && detOpen()) await loadDetail(S.det.id, true);
  repaintIfActive(true);
}
/** Gửi 1 hành động ghi; thành công trả về phản hồi máy chủ và tải lại dữ liệu, lỗi trả về null (đã báo lỗi). */
async function act(action, payload, okMsg, quiet){
  try {
    const j = await ffetch(apiUrl(), { method: 'POST', body: JSON.stringify({ action, payload, token: token(), lite: true }) });
    if(okMsg) toast(okMsg);
    if(!quiet) await refresh(); else S.ver = {};
    return j;
  } catch(e){
    if(authFail(e)) return null;
    toast(e.message, 'error'); S.ver = {}; if(!quiet) await refresh(); return null;
  }
}
function reset(){ S.list = null; S.cache = {}; S.mine = null; S.report = null; S.activity = null; S.arch = null; S.ver = {}; S.det = null; S.detId = ''; S.wfId = ''; S.cfg = null; S.mem = null; S.draft = null; }
const poll = async () => {
  if(!active() || document.getElementById('modal').innerHTML.trim()) return false;
  const a = await loadList(true, { noPaint: true });
  const b = S.wfId ? await loadWf(S.wfId, true, { noPaint: true }) : false;
  const c = !S.wfId && S.tab === 'mine' ? await loadMine(true, { noPaint: true }) : false;
  return a || b || c;
};
const dragging = () => !!S.drag;
/** Todo của tôi (cho mục Việc của tôi của module Công việc). Tải một lần khi cần, vẽ lại màn Công việc khi có dữ liệu. */
let todoBusy = false;
async function ensureTodos(force){
  if(todoBusy || !online() || !session()) return;
  if(S.mine && !force) return;
  todoBusy = true;
  try { const ch = await loadMine(true, { noPaint: true }); if(ch && typeof W !== 'undefined' && W.active && W.active()) W.repaint(true); }
  finally { todoBusy = false; }
}
async function pollTodos(){
  if(!S.mine || todoBusy) return false;
  todoBusy = true;
  try { return await loadMine(true, { noPaint: true }); } finally { todoBusy = false; }
}
const myTodos = () => S.mine ? S.mine.todos : [];

/* ---------- Bộ chọn người ---------- */
function picker(id, selected, users, empty){
  return `<div id="${id}"><input class="input !py-1.5 mb-1.5" placeholder="Tìm tên..." oninput="Fl.filterPick('${id}',this.value)">
    <div class="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">${users.map(u => `
      <label class="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50" data-n="${esc(u.name.toLowerCase())}"><input type="checkbox" class="checkbox" value="${u.id}" ${selected.includes(u.id) ? 'checked' : ''} onchange="modalDirty=true">${avatar(u, 'w-6 h-6 text-[10px]')}<span class="flex-1 text-[13px] truncate">${esc(u.name)}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}</span></label>`).join('') || `<div class="p-3 text-[12.5px] text-gray-400">${empty || 'Chưa có ai.'}</div>`}</div></div>`;
}
const picked = id => [...document.querySelectorAll('#' + id + ' input[type=checkbox]:checked')].map(i => i.value);
function filterPick(id, v){ v = v.trim().toLowerCase(); document.querySelectorAll('#' + id + ' label').forEach(l => { l.style.display = !v || l.dataset.n.includes(v) ? '' : 'none'; }); }
/** Người có thể làm việc trong quy trình: thành viên + Giám đốc (đang hoạt động). */
function workers(d){
  const ids = new Set((d.workflow.members || []).map(m => m.userId));
  DB.users.forEach(u => { if(u.role === 'director') ids.add(u.id); });
  return [...ids].map(findUser).filter(u => u && isActive(u)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/* ============================================================
   MÀN GỐC: danh sách quy trình · job của tôi
   ============================================================ */
function view(){
  if(!online()) return `<div class="card p-10 text-center text-gray-500">Module Quy trình cần kết nối máy chủ dữ liệu.</div>`;
  if(!S.list){
    if(!S.loading && !S.error){ S.loading = true; loadList().finally(() => { S.loading = false; repaintIfActive(true); }); }
    return S.error ? errorCard(S.error, 'Fl.retry()') : loadingCard('Đang tải quy trình...');
  }
  if(S.wfId) return wfView();
  return S.tab === 'mine' ? mineView() : homeView();
}
function retry(){ S.error = null; S.list = null; S.ver = {}; repaintIfActive(); }
function topTabs(){
  const t = (k, label, ic) => `<button class="btn btn-sm ${S.tab === k ? 'btn-primary' : 'btn-ghost'}" onclick="Fl.setTab('${k}')">${ic} ${label}</button>`;
  return `<div class="flex items-center gap-2 mb-4 flex-wrap fl-tabs">${t('home', 'Quy trình', FI.board)}${t('mine', 'Job của tôi', FI.check)}
    <div class="flex-1"></div>
    ${S.tab === 'home' && S.canCreate ? `<button class="btn btn-primary tb-add" onclick="Fl.openWorkflowForm('')">${I.plus} <span class="fab-text">Tạo quy trình</span></button>` : ''}</div>`;
}
function setTab(k){ S.tab = k === 'mine' ? 'mine' : 'home'; lsSet('okr_flow_tab', S.tab); S.wfId = ''; if(S.tab === 'mine') loadMine().then(() => repaintIfActive(true)); repaint(); }
function homeView(){
  const all = S.list.workflows, shownAll = S.showArchWf ? all : all.filter(w => !w.archived), nArch = all.filter(w => w.archived).length;
  const pinned = shownAll.filter(w => w.pinned), rest = shownAll.filter(w => !w.pinned);
  const cats = [...new Set(rest.map(w => w.category || ''))].sort((a, b) => (a === '') - (b === '') || a.localeCompare(b, 'vi'));
  const grid = ws => `<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${ws.map(wfCard).join('')}</div>`;
  const sec = (title, ws) => ws.length ? `<div class="mb-5"><div class="section-title mb-2">${title}</div>${grid(ws)}</div>` : '';
  const empty = !shownAll.length ? `<div class="card p-10 text-center text-gray-500">${S.canCreate ? 'Chưa có quy trình nào. Bấm <b>Tạo quy trình</b> để bắt đầu (có sẵn mẫu Tuyển dụng).' : 'Bạn chưa là thành viên của quy trình nào. Khi owner thêm bạn vào quy trình, nó sẽ hiện ở đây.'}</div>` : '';
  return `${topTabs()}
    ${S.error ? `<div class="card px-4 py-2 mb-3 text-[13px] text-red-600">${esc(S.error)}</div>` : ''}
    ${empty}${sec('★ Đã ghim', pinned)}${cats.map(c => sec(c ? esc(c) : (pinned.length || cats.length > 1 ? 'Khác' : 'Quy trình'), rest.filter(w => (w.category || '') === c))).join('')}
    ${nArch ? `<div class="text-center mt-2"><button class="text-[12.5px] text-gray-500 hover:text-slate-800 underline" onclick="Fl.toggleArchWf()">${S.showArchWf ? 'Ẩn' : 'Hiện'} ${nArch} quy trình đã lưu trữ</button></div>` : ''}`;
}
function toggleArchWf(){ S.showArchWf = !S.showArchWf; repaint(); }
function wfCard(w){
  const k = w.counts || {};
  return `
  <div class="card p-4 cursor-pointer hover:shadow-md transition-shadow ${w.archived ? 'opacity-60' : ''}" onclick="Fl.openWf('${w.id}')">
    <div class="flex items-start gap-2.5">
      <div class="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0" style="background:${esc(w.color)}">${FI.board}</div>
      <div class="min-w-0 flex-1"><div class="font-semibold text-slate-900 leading-snug">${esc(w.name)}</div>
        <div class="text-[12px] text-gray-500 truncate">${w.category ? esc(w.category) + ' · ' : ''}${w.stageCount} giai đoạn · ${w.memberCount} thành viên${w.archived ? ' · <b>Đã lưu trữ</b>' : ''}</div></div>
      ${w.isMember ? `<button class="p-1 ${w.pinned ? 'text-amber-500' : 'text-gray-300 hover:text-amber-500'}" title="${w.pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}" onclick="event.stopPropagation();Fl.pin('${w.id}',${!w.pinned})">${FI.star}</button>` : ''}
    </div>
    ${plain(w.description) ? `<div class="text-[12.5px] text-gray-500 mt-2" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(plain(w.description))}</div>` : ''}
    <div class="grid grid-cols-4 gap-2 mt-3 text-center">
      <div class="rounded-lg bg-blue-50 py-1.5"><div class="font-semibold text-blue-700">${k.open || 0}</div><div class="text-[10.5px] text-blue-600">Đang làm</div></div>
      <div class="rounded-lg ${k.overdue ? 'bg-red-50' : 'bg-gray-50'} py-1.5"><div class="font-semibold ${k.overdue ? 'text-red-600' : 'text-gray-400'}">${k.overdue || 0}</div><div class="text-[10.5px] ${k.overdue ? 'text-red-500' : 'text-gray-400'}">Quá hạn</div></div>
      <div class="rounded-lg bg-green-50 py-1.5"><div class="font-semibold text-green-700">${k.done || 0}</div><div class="text-[10.5px] text-green-600">Xong</div></div>
      <div class="rounded-lg bg-gray-50 py-1.5"><div class="font-semibold text-gray-600">${k.failed || 0}</div><div class="text-[10.5px] text-gray-500">Thất bại</div></div>
    </div>
    <div class="flex items-center justify-between mt-3"><span class="text-[11.5px] text-gray-400">${w.isMember ? (w.canManage ? 'Bạn là owner' : 'Bạn là thành viên') : 'Giám đốc (xem toàn bộ)'}</span>${stack(w.ownerIds, 4)}</div>
  </div>`;
}
async function pin(id, pinned){ await act('wfPin', { workflowId: id, pinned: !!pinned }); }

/* ---------- Job của tôi ---------- */
function mineView(){
  if(!S.mine){ return topTabs() + loadingCard('Đang tải job của bạn...'); }
  const me = meId(), jobs = S.mine.jobs, todos = S.mine.todos;
  const sets = {
    assigned: jobs.filter(j => j.assigneeIds.includes(me)),
    created: jobs.filter(j => j.createdBy === me),
    follow: jobs.filter(j => j.followerIds.includes(me)),
    team: jobs.filter(j => !j.assigneeIds.includes(me) && j.createdBy !== me && !j.followerIds.includes(me)),
  };
  const tabs = [['assigned', 'Giao cho tôi'], ['created', 'Tôi tạo'], ['follow', 'Tôi theo dõi']].concat(isMgr() ? [['team', 'Của cấp dưới']] : []);
  const tab = tabs.some(t => t[0] === S.mineTab) || S.mineTab === 'todo' ? S.mineTab : 'assigned';
  const chip = (k, label, n) => `<span class="chip ${tab === k ? 'active' : ''}" onclick="Fl.setMineTab('${k}')">${label} <span class="opacity-70">${n}</span></span>`;
  const openTodos = todos.filter(t => !t.done).length;
  let body;
  if(tab === 'todo') body = todos.length ? `<div class="card divide-y divide-gray-100">${todos.map(todoRow).join('')}</div>` : `<div class="card p-10 text-center text-gray-400">Bạn chưa được giao todo nào.</div>`;
  else {
    const list = (sets[tab] || []).slice().sort((a, b) => (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) || (a.slaDueAt || a.due || '9999').localeCompare(b.slaDueAt || b.due || '9999'));
    body = list.length ? `<div class="card divide-y divide-gray-100">${list.map(j => jobRow(j, true)).join('')}</div>` : `<div class="card p-10 text-center text-gray-400">Không có job nào trong mục này.</div>`;
  }
  return `${topTabs()}
    <div class="flex items-center gap-2 mb-3 flex-wrap fl-tabs">${tabs.map(t => chip(t[0], t[1], sets[t[0]].length)).join('')}${chip('todo', 'Todo của tôi', openTodos)}</div>
    <div class="text-[12px] text-gray-400 mb-3">Job đang mở và job đã đóng trong 30 ngày gần đây. Todo của bạn cũng hiện ở mục <b>Việc của tôi</b> của Quản lý công việc.</div>${body}`;
}
function setMineTab(k){ S.mineTab = k; repaint(); }
function jobRow(j, showWf){
  return `
  <div class="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${j.status !== 'open' ? 'opacity-75' : ''}" onclick="Fl.openJob('${j.id}')">
    <div class="w-1 self-stretch rounded-full shrink-0" style="background:${(PRIO[j.priority] || PRIO.medium).bar}"></div>
    <div class="min-w-0 flex-1">
      <div class="font-medium text-slate-900 leading-snug">${esc(j.title)}</div>
      <div class="flex items-center gap-2 flex-wrap mt-1 text-[12px] text-gray-500">
        ${showWf ? `<span class="inline-flex items-center gap-1.5">${dot(j.wfColor)}${esc(j.wfName || '')}</span><span class="text-gray-300">›</span>` : ''}<span>${esc(j.stageName || '')}</span>
        ${statusBadge(j)}${slaChip(j)}${dueChip(j)}${j.todoTotal ? `<span class="inline-flex items-center gap-1">${FI.check} ${j.todoDone}/${j.todoTotal}</span>` : ''}
      </div>
    </div>
    <div class="shrink-0">${stack(j.assigneeIds, 3)}</div>
  </div>`;
}
function todoRow(t){
  return `
  <div class="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
    <input type="checkbox" class="checkbox mt-0.5" ${t.done ? 'checked' : ''} onclick="event.stopPropagation()" onchange="Fl.tickTodo('${t.id}',this.checked)">
    <div class="min-w-0 flex-1 cursor-pointer" onclick="Fl.openJob('${t.jobId}')">
      <div class="${t.done ? 'line-through text-gray-400' : 'text-slate-900'}">${esc(t.title)}${t.required ? ' <span class="text-[10.5px] text-red-500 font-medium">Bắt buộc</span>' : ''}</div>
      <div class="text-[12px] text-gray-500 mt-0.5">${flowLabel(t)}</div>
    </div>
  </div>`;
}
/** Nhãn "Quy trình · tên job" đặt cạnh todo (dùng cả ở Việc của tôi). */
const flowLabel = t => `<span class="inline-flex items-center gap-1.5 whitespace-nowrap max-w-full">${dot(t.wfColor)}<span class="truncate">Quy trình · ${esc(clip(t.jobTitle || '', 60))}</span></span>${t.stageName ? ` <span class="text-gray-400">(${esc(t.stageName)})</span>` : ''}`;
async function tickTodo(id, done){
  const t = (S.mine ? S.mine.todos : []).find(x => x.id === id); if(t){ t.done = !!done; t.doneAt = done ? new Date().toISOString() : ''; }
  const j = await act('wfSetTodo', { id, done: !!done }, '', true);
  S.ver = {}; await loadMine(true, { noPaint: true }); if(S.det && detOpen()) await loadDetail(S.det.id, true);
  if(!j) { /* lỗi đã báo; dữ liệu vừa tải lại */ }
  if(typeof W !== 'undefined' && W.active && W.active()) W.repaint(true); else repaintIfActive(true);
}

/* ============================================================
   MỘT QUY TRÌNH: Bảng · Danh sách · Báo cáo · Hoạt động · Lưu trữ · Thành viên · Cài đặt
   ============================================================ */
const WF_TABS = [['board', 'Bảng', FI.board], ['list', 'Danh sách', FI.list], ['report', 'Báo cáo', FI.chart], ['activity', 'Hoạt động', FI.hist], ['archive', 'Lưu trữ', FI.box], ['members', 'Thành viên', FI.users], ['settings', 'Cài đặt', FI.gear]];
let wfBusy = false;
function wfView(){
  const d = wfd(S.wfId);
  if(!d){
    if(!wfBusy && !S.error){ wfBusy = true; loadWf(S.wfId).finally(() => { wfBusy = false; repaintIfActive(true); }); }
    return S.error ? `<div class="card p-10 text-center"><div class="text-red-600 mb-3">${esc(S.error)}</div><div class="flex gap-2 justify-center"><button class="btn btn-ghost" onclick="Fl.back()">Quay lại</button><button class="btn btn-primary" onclick="Fl.retryWf()">${I.refresh} Thử lại</button></div></div>` : loadingCard('Đang tải quy trình...');
  }
  const w = d.workflow, tabs = WF_TABS.filter(t => t[0] !== 'settings' || w.canManage);
  if(!tabs.some(t => t[0] === S.wfTab)) S.wfTab = 'board';
  const body = S.wfTab === 'board' ? boardView(d) : S.wfTab === 'list' ? listView(d) : S.wfTab === 'report' ? reportView(d) : S.wfTab === 'activity' ? activityView(d)
    : S.wfTab === 'archive' ? archiveView(d) : S.wfTab === 'members' ? membersView(d) : settingsView(d);
  const canAdd = !w.archived && (w.isMember || isDir());
  return `
  <div class="flex items-center gap-2 mb-2 flex-wrap">
    <button class="btn btn-ghost btn-sm" onclick="Fl.back()">${FI.left} Quy trình</button>
    <div class="flex items-center gap-2 min-w-0 flex-1">${dot(w.color)}<h2 class="text-[17px] font-semibold text-slate-900 truncate">${esc(w.name)}</h2>${w.category ? `<span class="text-[12px] text-gray-500 hidden sm:inline">· ${esc(w.category)}</span>` : ''}${w.archived ? '<span class="badge bg-gray-200 text-gray-600 border-gray-300">Đã lưu trữ</span>' : ''}</div>
    ${canAdd && (S.wfTab === 'board' || S.wfTab === 'list') ? `<button class="btn btn-primary tb-add" onclick="Fl.openJobForm('')">${I.plus} <span class="fab-text">Tạo job</span></button>` : ''}
  </div>
  ${plain(w.description) ? `<div class="text-[12.5px] text-gray-500 mb-3">${esc(plain(w.description))}</div>` : ''}
  <div class="flex items-center gap-1.5 mb-3 flex-wrap fl-tabs border-b border-gray-200 pb-2">${tabs.map(t => `<button class="btn btn-sm ${S.wfTab === t[0] ? 'btn-primary' : 'btn-ghost'}" onclick="Fl.setWfTab('${t[0]}')">${t[2]} ${t[1]}</button>`).join('')}</div>
  ${S.error ? `<div class="card px-4 py-2 mb-3 text-[13px] text-red-600">${esc(S.error)}</div>` : ''}${body}`;
}
function retryWf(){ S.error = null; delete S.cache[S.wfId]; S.ver = {}; repaintIfActive(); }
function openWf(id, tab){
  S.wfId = id; S.wfTab = tab || 'board'; S.error = null; S.f = { q: '', who: 'all', pri: 'all', over: false, st: 'open' }; S.closedLimit = CLOSED_SHOW; S.listLimit = 200;
  S.cfg = null; S.mem = null; S.report = null; S.activity = null; S.arch = null; S.sort = { k: 'due', d: 1 };
  if(state.view !== 'flow'){ state.view = 'flow'; render(); } else repaint();
  loadWf(id, true);
}
function back(){ S.wfId = ''; S.error = null; S.cfg = null; S.mem = null; if(S.tab === 'mine') loadMine(true); repaint(); loadList(true); }
function setWfTab(t){
  S.wfTab = t; S.error = null;
  if(t === 'settings'){ S.cfg = null; } if(t === 'members'){ S.mem = null; }
  if(t === 'report'){ S.report = null; loadReport(S.wfId); }
  else if(t === 'activity'){ S.activity = null; loadActivity(S.wfId); }
  else if(t === 'archive'){ S.arch = null; loadArch(S.wfId); }
  repaint();
}
/** Mở 1 quy trình ở đúng job từ hộp thông báo / Job của tôi / Việc của tôi. */
async function gotoJob(jobId, wfId){
  if(wfId && S.wfId !== wfId){ S.wfId = wfId; S.wfTab = 'board'; S.f = { q: '', who: 'all', pri: 'all', over: false, st: 'open' }; S.cfg = null; S.mem = null; }
  state.view = 'flow'; render();
  if(wfId) loadWf(wfId, true);
  await openJob(jobId, true);
}

/* ---------- Bộ lọc ---------- */
function toolbar(d, withStatus){
  const f = S.f, ms = (d.workflow.members || []).map(m => findUser(m.userId)).filter(Boolean);
  const sel = (id, cur, opts, ev) => `<select id="${id}" class="input !py-1.5 !w-auto" onchange="${ev}">${opts.map(o => `<option value="${o[0]}" ${String(cur) === String(o[0]) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  return `
  <div class="flex items-center gap-2 mb-3 flex-wrap">
    <input id="fl-q" class="input !py-1.5 !w-56" placeholder="Tìm job, nhãn..." value="${esc(f.q)}" oninput="Fl.setQ(this.value)">
    ${sel('fl-who', f.who, [['all', 'Mọi người thực hiện'], ['me', 'Của tôi'], ['none', 'Chưa giao']].concat(ms.map(u => [u.id, u.name])), "Fl.setF('who',this.value)")}
    ${sel('fl-pri', f.pri, [['all', 'Mọi mức ưu tiên']].concat(Object.keys(PRIO).map(k => [k, PRIO[k].t])), "Fl.setF('pri',this.value)")}
    <span class="chip ${f.over ? 'active' : ''}" onclick="Fl.setF('over',${!f.over})">Quá hạn</span>
    ${withStatus ? `<span class="text-gray-300 mx-1">|</span>${[['open', 'Đang làm'], ['closed', 'Đã đóng'], ['all', 'Tất cả']].map(x => `<span class="chip ${f.st === x[0] ? 'active' : ''}" onclick="Fl.setF('st','${x[0]}')">${x[1]}</span>`).join('')}` : ''}
  </div>`;
}
let qTimer = null;
function setQ(v){ S.f.q = v; clearTimeout(qTimer); qTimer = setTimeout(() => { repaint(); const el = $('fl-q'); if(el){ el.focus(); el.setSelectionRange(v.length, v.length); } }, 250); }
function setF(k, v){ S.f[k] = v; S.listLimit = 200; S.closedLimit = CLOSED_SHOW; repaint(); }
function filtered(d, jobsIn){
  const f = S.f, q = f.q.trim().toLowerCase(), me = meId();
  return (jobsIn || d.jobs).filter(j => {
    if(q && !(j.title.toLowerCase().includes(q) || (j.tags || []).some(t => t.toLowerCase().includes(q)))) return false;
    if(f.who === 'me' && !j.assigneeIds.includes(me)) return false;
    if(f.who === 'none' && j.assigneeIds.length) return false;
    if(f.who !== 'all' && f.who !== 'me' && f.who !== 'none' && !j.assigneeIds.includes(f.who)) return false;
    if(f.pri !== 'all' && j.priority !== f.pri) return false;
    if(f.over && !isOver(j)) return false;
    return true;
  });
}
const byUrgency = (a, b) => (a.slaDueAt || '9999').localeCompare(b.slaDueAt || '9999') || (a.due || '9999').localeCompare(b.due || '9999') || (b.createdAt || '').localeCompare(a.createdAt || '');

/* ---------- Bảng (Kanban) ---------- */
function boardView(d){
  const jobs = filtered(d), open = jobs.filter(j => j.status === 'open');
  const done = jobs.filter(j => j.status === 'done').sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
  const failed = jobs.filter(j => j.status === 'failed').sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
  if(!d.stages.length) return `<div class="card p-10 text-center text-gray-500">Quy trình chưa có giai đoạn nào.${d.workflow.canManage ? ' Vào <b>Cài đặt</b> để thêm giai đoạn.' : ''}</div>`;
  const n = d.stages.length + 2, canAdd = !d.workflow.archived;
  const col = (key, head, items, extra) => `
    <div class="rounded-xl bg-gray-100/80 border border-gray-200 p-2.5 min-h-[160px]" data-fkey="${key}" ondragover="Fl.colOver(event,'${key}')" ondragleave="Fl.colLeave(event)" ondrop="Fl.drop(event,'${key}')">
      ${head}<div class="space-y-2" data-fcol="${key}" style="max-height:calc(100vh - 330px);overflow-y:auto">${items}${extra || ''}</div>
    </div>`;
  const stageCols = d.stages.map((s, i) => {
    const its = open.filter(j => j.stageId === s.id).sort(byUrgency);
    const head = `<div class="flex items-start justify-between px-1 pb-2 gap-2"><div class="min-w-0"><div class="flex items-center gap-2"><span class="font-semibold text-slate-800 truncate">${esc(s.name)}</span><span class="text-[12px] text-gray-500 bg-white rounded-full px-2 border border-gray-200">${its.length}</span></div>
      <div class="text-[11px] text-gray-400">${s.slaHours ? 'SLA ' + s.slaHours + ' giờ' : 'Không SLA'}${s.assigneeIds.length ? ' · ' + s.assigneeIds.slice(0, 2).map(uName).map(esc).join(', ') + (s.assigneeIds.length > 2 ? '…' : '') : ''}</div></div>
      ${i === 0 && canAdd ? `<button class="text-gray-400 hover:text-base-600" title="Thêm job vào giai đoạn đầu" onclick="Fl.openJobForm('')">${I.plus}</button>` : ''}</div>`;
    return col(s.id, head, its.map(j => jobCard(j, d, i)).join('') || `<div class="text-center text-[12.5px] text-gray-400 py-6 border border-dashed border-gray-300 rounded-lg">Chưa có job</div>`);
  }).join('');
  const closedCol = (key, title, color, items) => {
    const shown = items.slice(0, S.closedLimit);
    return col(key, `<div class="flex items-center gap-2 px-1 pb-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${color}"></span><span class="font-semibold text-slate-800">${title}</span><span class="text-[12px] text-gray-500 bg-white rounded-full px-2 border border-gray-200">${items.length}</span></div>`,
      shown.map(j => jobCard(j, d, -1)).join('') || `<div class="text-center text-[12.5px] text-gray-400 py-6 border border-dashed border-gray-300 rounded-lg">${key === '@done' ? 'Kéo job ở giai đoạn cuối vào đây' : 'Kéo job vào đây khi thất bại'}</div>`,
      items.length > shown.length ? `<button class="btn btn-ghost btn-sm w-full justify-center" onclick="Fl.moreClosed()">Xem thêm ${Math.min(CLOSED_SHOW, items.length - shown.length)} job (còn ${items.length - shown.length})</button>` : '');
  };
  return `${toolbar(d)}
  <div id="fl-board" class="grid gap-3 items-start overflow-x-auto pb-2" style="--fl-n:${n};grid-template-columns:repeat(${n},minmax(250px,1fr))">
    ${stageCols}${closedCol('@done', 'Hoàn thành', '#16a34a', done)}${closedCol('@failed', 'Thất bại', '#dc2626', failed)}
  </div>
  <div class="text-[12px] text-gray-400 mt-2 desk-only">Kéo thẻ sang giai đoạn <b>kề bên</b> để chuyển (tuần tự một bước). Ở giai đoạn cuối, kéo vào <b>Hoàn thành</b>; kéo vào <b>Thất bại</b> để đóng job kèm lý do. Thẻ viền đỏ là job quá hạn SLA hoặc quá hạn chót.</div>`;
}
function moreClosed(){ S.closedLimit += CLOSED_SHOW; repaint(); }
function jobCard(j, d, idx){
  const open = j.status === 'open', mv = open && canMoveJob(j, d) && !d.workflow.archived, od = isOver(j), last = idx === d.stages.length - 1;
  const todoChip = j.todoTotal ? `<span class="inline-flex items-center gap-1 ${j.todoReqOpen ? 'text-amber-700' : ''}" title="${j.todoReqOpen ? j.todoReqOpen + ' todo bắt buộc chưa xong' : 'Todo của giai đoạn hiện tại'}">${FI.check} ${j.todoDone}/${j.todoTotal}</span>` : '';
  return `
  <div class="bg-white rounded-lg border ${od ? 'border-red-300' : 'border-gray-200'} p-3 shadow-sm hover:shadow-md transition-shadow ${mv && FINE ? 'cursor-grab' : 'cursor-pointer'} ${j.status === 'done' ? 'opacity-80' : ''}"
       data-id="${j.id}" ${mv && FINE ? `draggable="true" ondragstart="Fl.dragStart(event,'${j.id}')" ondragend="Fl.dragEnd(event)"` : ''} onclick="Fl.openJob('${j.id}')">
    <div class="flex items-start gap-2">
      <div class="w-1 self-stretch rounded-full shrink-0" style="background:${(PRIO[j.priority] || PRIO.medium).bar}" title="Ưu tiên: ${(PRIO[j.priority] || PRIO.medium).t}"></div>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-slate-900 leading-snug">${esc(j.title)}</div>
        ${j.status === 'failed' && j.failReason ? `<div class="text-[12px] text-red-600 mt-0.5">${esc(j.failReason)}</div>` : ''}
        ${j.tags.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${tagChips(j.tags.slice(0, 4))}</div>` : ''}
        <div class="flex items-center justify-between gap-2 mt-2.5">
          <div class="flex items-center gap-2 text-[12px] text-gray-500 flex-wrap">${slaChip(j)}${dueChip(j)}${todoChip}
            ${j.commentCount ? `<span class="inline-flex items-center gap-1">${I.chat}${j.commentCount}</span>` : ''}${j.fileCount ? `<span class="inline-flex items-center gap-1">${FI.clip}${j.fileCount}</span>` : ''}
            ${j.fwd ? `<span class="inline-flex items-center gap-1 text-indigo-600" title="Đã chuyển tiếp sang quy trình khác">${FI.fwd}</span>` : ''}${j.forwardedFrom ? `<span class="text-indigo-600 text-[11px]" title="Job được chuyển tiếp từ quy trình khác">Chuyển tới</span>` : ''}</div>
          ${stack(j.assigneeIds)}
        </div>
        ${mv ? `<div class="m-only mt-2.5"><div class="flex gap-2" onclick="event.stopPropagation()">
          ${idx > 0 ? `<button class="btn btn-ghost btn-sm flex-1 justify-center" onclick="Fl.openMove('${j.id}','prev')">${FI.left} Lùi</button>` : ''}
          ${last ? `<button class="btn btn-ghost btn-sm flex-1 justify-center" onclick="Fl.openClose('${j.id}','done')">${I.check} Hoàn thành</button>` : `<button class="btn btn-primary btn-sm flex-1 justify-center" onclick="Fl.openMove('${j.id}','next')">Tiến ${FI.right}</button>`}
        </div></div>` : ''}
      </div>
    </div>
  </div>`;
}

/* ---------- Kéo thả (chỉ chuột; điện thoại dùng nút Tiến / Lùi) ---------- */
function dragStart(e, id){ S.drag = id; S.over = null; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); const el = e.currentTarget; setTimeout(() => { if(el) el.classList.add('opacity-40'); }, 0); }
function clearMarks(){ document.querySelectorAll('[data-fkey].ring-2').forEach(e => e.classList.remove('ring-2', 'ring-base-500', 'bg-base-50')); }
function dragEnd(){ S.drag = null; S.over = null; clearMarks(); document.querySelectorAll('[data-id].opacity-40').forEach(e => e.classList.remove('opacity-40')); }
function colOver(e, key){ if(!S.drag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if(S.over !== key){ clearMarks(); S.over = key; e.currentTarget.classList.add('ring-2', 'ring-base-500', 'bg-base-50'); } }
function colLeave(e){ const c = e.currentTarget; if(!c.contains(e.relatedTarget)) c.classList.remove('ring-2', 'ring-base-500', 'bg-base-50'); }
function drop(e, key){
  e.preventDefault(); const id = S.drag; dragEnd(); if(!id) return;
  const d = wfd(), j = d && d.jobs.find(x => x.id === id); if(!j) return;
  if(j.status !== 'open'){ toast('Job đã đóng. Owner dùng nút Mở lại trong chi tiết job.', 'error'); return; }
  const cur = stageIdx(d, j.stageId);
  if(key === '@done'){ if(cur === d.stages.length - 1) openClose(id, 'done'); else toast('Chỉ bấm Hoàn thành được ở giai đoạn cuối. Hãy chuyển job qua từng giai đoạn trước.', 'error'); return; }
  if(key === '@failed'){ openClose(id, 'failed'); return; }
  const to = stageIdx(d, key);
  if(to === cur) return;
  if(to === cur + 1) openMove(id, 'next'); else if(to === cur - 1) openMove(id, 'prev');
  else toast('Chỉ chuyển được sang giai đoạn kề bên (tuần tự từng bước).', 'error');
}

/* ---------- Chuyển giai đoạn / đóng job ---------- */
let backTo = '';                                                    // đang mở từ khung chi tiết → xong thì quay lại chi tiết
const findJob = id => { if(S.det && S.det.id === id) return S.det; for(const k in S.cache){ const j = S.cache[k].jobs.find(x => x.id === id); if(j) return j; } return null; };
function subClose(){ A.closeModal(); const b = backTo; backTo = ''; if(b) openJob(b); }
function openMove(id, dir, fromDetail){
  const j = findJob(id), d = j && wfd(j.workflowId); if(!j || !d) return;
  backTo = fromDetail ? id : '';
  const cur = stageOf(d, j.stageId), to = d.stages[stageIdx(d, j.stageId) + (dir === 'next' ? 1 : -1)];
  if(!to){ toast(dir === 'next' ? 'Đây là giai đoạn cuối. Hãy bấm Hoàn thành.' : 'Đây là giai đoạn đầu tiên.', 'error'); return; }
  const def = to.assigneeIds.length ? to.assigneeIds : j.assigneeIds;
  openModal(`
    ${modalHeader(dir === 'next' ? 'Chuyển sang giai đoạn tiếp theo' : 'Lùi về giai đoạn trước', esc(j.title))}
    <div class="p-6 space-y-4">
      <div class="flex items-center gap-2 flex-wrap text-[14px]"><span class="badge bg-gray-100 text-gray-700 border-gray-200">${esc(cur ? cur.name : '?')}</span><span class="text-gray-400">${dir === 'next' ? FI.right : FI.left}</span><span class="badge bg-blue-50 text-blue-700 border-blue-200 font-semibold">${esc(to.name)}</span>${to.slaHours ? `<span class="text-[12px] text-gray-500">SLA ${to.slaHours} giờ</span>` : ''}</div>
      ${dir === 'next' && j.todoReqOpen ? `<div class="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[13px] px-3 py-2">Còn <b>${j.todoReqOpen}</b> todo bắt buộc chưa xong ở giai đoạn hiện tại. Hãy hoàn thành trước khi chuyển.</div>` : ''}
      <div><label class="label">Người thực hiện ở giai đoạn “${esc(to.name)}”</label>${picker('fl-mv-asg', def, workers(d))}<div class="text-[12px] text-gray-400 mt-1">Đã chọn sẵn theo người mặc định của giai đoạn; bạn có thể đổi. Người mới nhận sẽ được báo chuông và email.</div></div>
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="Fl.subClose()">Huỷ</button><button class="btn btn-primary" id="fl-mv-ok" onclick="Fl.doMove('${id}','${dir}')">${dir === 'next' ? 'Chuyển giai đoạn' : 'Lùi giai đoạn'}</button></div>`, 'max-w-lg');
}
async function doMove(id, dir){
  const ids = picked('fl-mv-asg'), b = $('fl-mv-ok'); if(b) b.disabled = true;
  const j = await act('wfMoveJob', { id, dir, assigneeIds: ids.length ? ids : undefined }, dir === 'next' ? 'Đã chuyển sang giai đoạn tiếp theo.' : 'Đã lùi về giai đoạn trước.');
  if(!j){ if($('fl-mv-ok')) $('fl-mv-ok').disabled = false; return; }
  subClose();
}
function openClose(id, status, fromDetail){
  const j = findJob(id), d = j && wfd(j.workflowId); if(!j || !d) return;
  backTo = fromDetail ? id : '';
  const reasons = d.failReasons || [];
  openModal(`
    ${modalHeader(status === 'done' ? 'Đánh dấu Hoàn thành' : 'Đánh dấu Thất bại', esc(j.title))}
    <div class="p-6 space-y-3">
      ${status === 'done' ? `<div class="text-[13.5px] text-slate-700">Job sẽ được đóng ở trạng thái <b class="text-green-700">Hoàn thành</b>. Người tạo và người theo dõi sẽ được báo. Sau đó bạn vẫn có thể chuyển tiếp job sang quy trình khác (nếu owner đã cài).</div>`
        : `<div><label class="label">Lý do thất bại</label>${reasons.length ? `<select id="fl-reason" class="input">${reasons.map(r => `<option value="${esc(r.text)}">${esc(r.text)}</option>`).join('')}</select>` : `<input id="fl-reason" class="input" maxlength="200" placeholder="Nhập lý do (owner chưa cài danh sách lý do)">`}</div>
        <div class="text-[12.5px] text-gray-500">Chỉ owner hoặc Giám đốc mở lại được job đã đóng.</div>`}
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="Fl.subClose()">Huỷ</button><button class="btn ${status === 'done' ? 'btn-primary' : 'btn-danger'}" id="fl-cl-ok" onclick="Fl.doClose('${id}','${status}')">${status === 'done' ? 'Hoàn thành' : 'Đánh dấu thất bại'}</button></div>`, 'max-w-md');
}
async function doClose(id, status){
  const r = $('fl-reason'), b = $('fl-cl-ok'); if(b) b.disabled = true;
  const j = await act('wfCloseJob', { id, status, reason: r ? r.value : '' }, status === 'done' ? 'Đã đánh dấu Hoàn thành.' : 'Đã đánh dấu Thất bại.');
  if(!j){ if($('fl-cl-ok')) $('fl-cl-ok').disabled = false; return; }
  subClose();
}

/* ---------- Danh sách ---------- */
function sortBy(k){ S.sort = S.sort.k === k ? { k, d: -S.sort.d } : { k, d: 1 }; repaint(); }
function sortJobs(d, list){
  const { k, d: dir } = S.sort, pw = { urgent: 4, high: 3, medium: 2, low: 1 };
  const key = j => k === 'title' ? j.title.toLowerCase() : k === 'stage' ? String(stageIdx(d, j.stageId)).padStart(3, '0') : k === 'pri' ? 9 - (pw[j.priority] || 2)
    : k === 'created' ? j.createdAt || '' : k === 'status' ? j.status : (j.status === 'open' ? (j.slaDueAt || j.due || '9999') : '9999z');
  return list.slice().sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir; });
}
function listView(d){
  S.f.st = S.f.st || 'open';
  let jobs = filtered(d); if(S.f.st === 'open') jobs = jobs.filter(j => j.status === 'open'); else if(S.f.st === 'closed') jobs = jobs.filter(j => j.status !== 'open');
  jobs = sortJobs(d, jobs);
  const th = (k, label, cls = 'px-2') => `<th class="text-left font-medium py-2.5 ${cls} ${k ? 'cursor-pointer select-none hover:text-slate-800' : ''}" ${k ? `onclick="Fl.sortBy('${k}')"` : ''}>${label}${k && S.sort.k === k ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  return `${toolbar(d, true)}
  <div class="flex items-center justify-between mb-2 flex-wrap gap-2"><div class="text-[12.5px] text-gray-500">${jobs.length} job</div><button class="btn btn-ghost btn-sm" onclick="Fl.exportXlsx()">${FI.down} Xuất Excel</button></div>
  <div class="card overflow-x-auto"><table class="w-full m-cards">
    <thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr>${th('title', 'Job', 'px-3')}${th('stage', 'Giai đoạn')}${th('', 'Người thực hiện')}${th('pri', 'Ưu tiên')}${th('due', 'Hạn')}${th('status', 'Trạng thái')}</tr></thead>
    <tbody class="divide-y divide-gray-100">
      ${jobs.length ? jobs.slice(0, S.listLimit).map(j => { const st = stageOf(d, j.stageId); return `
      <tr class="hover:bg-gray-50 cursor-pointer ${j.status !== 'open' ? 'opacity-75' : ''} ${isOver(j) ? 'bg-red-50/40' : ''}" onclick="Fl.openJob('${j.id}')">
        <td class="mc-title py-3 px-3 max-w-md"><div class="font-medium text-slate-900">${esc(j.title)}</div>${j.tags.length ? `<div class="flex flex-wrap gap-1 mt-1">${tagChips(j.tags.slice(0, 4))}</div>` : ''}</td>
        <td class="py-3 px-2 text-[12.5px] text-slate-600 whitespace-nowrap">${esc(st ? st.name : '—')}</td>
        <td class="py-3 px-2">${stack(j.assigneeIds, 4)}</td><td class="py-3 px-2">${prioBadge(j.priority)}</td>
        <td class="py-3 px-2"><div class="flex flex-col gap-1 items-start">${slaChip(j)}${dueChip(j)}</div></td><td class="mc-st py-3 px-2">${statusBadge(j)}</td>
      </tr>`; }).join('') + (jobs.length > S.listLimit ? `<tr><td colspan="6" class="p-3 text-center"><button class="btn btn-ghost btn-sm" onclick="Fl.moreList()">Xem thêm ${Math.min(200, jobs.length - S.listLimit)} job (còn ${jobs.length - S.listLimit})</button></td></tr>` : '')
      : `<tr><td colspan="6" class="p-10 text-center text-gray-400">Không có job nào.</td></tr>`}
    </tbody></table></div>`;
}
function moreList(){ S.listLimit += 200; repaint(); }

/* ---------- Lưu trữ ---------- */
function archiveView(d){
  if(!S.arch || S.arch.id !== d.workflow.id) return loadingCard('Đang tải job lưu trữ...');
  const list = S.arch.jobs, can = d.workflow.canManage;
  return `<div class="text-[12.5px] text-gray-500 mb-3">Job đã Hoàn thành / Thất bại được owner lưu trữ để gọn bảng. Job lưu trữ vẫn tính trong báo cáo.</div>
  ${list.length ? `<div class="card divide-y divide-gray-100">${list.map(j => `
    <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onclick="Fl.openJob('${j.id}')">
      <div class="min-w-0 flex-1"><div class="font-medium text-slate-900">${esc(j.title)}</div><div class="text-[12px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">${statusBadge(j)}${j.failReason ? esc(j.failReason) : ''}<span>${j.closedAt ? 'Đóng ' + fmtDT(j.closedAt) : ''}</span></div></div>
      ${stack(j.assigneeIds, 3)}
      ${can ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Fl.unarchive('${j.id}')">Bỏ lưu trữ</button>` : ''}
    </div>`).join('')}</div>` : `<div class="card p-10 text-center text-gray-400">Chưa có job nào được lưu trữ.</div>`}`;
}
async function unarchive(id){ const j = await act('wfArchiveJob', { id, archived: false }, 'Đã bỏ lưu trữ job.', true); if(j){ await refresh(); } }
async function archiveJob(id){ const j = await act('wfArchiveJob', { id, archived: true }, 'Đã lưu trữ job.'); if(j){ A.closeModal(); S.det = null; } }

/* ---------- Xuất Excel (làm ngay trên trình duyệt) ---------- */
function fieldText(f, v){
  if(v === undefined || v === null || v === '') return '';
  switch(f.type){
    case 'checkbox': return v === true ? 'Có' : 'Không';
    case 'multiselect': return Array.isArray(v) ? v.join(', ') : String(v);
    case 'user': return uName(v);
    case 'money': return money(v);
    case 'date': return fmt(v);
    case 'file': return '';
  }
  return String(v);
}
function loadXlsxLib(){
  if(window.XLSX) return Promise.resolve(window.XLSX);
  return new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => window.XLSX ? ok(window.XLSX) : no(new Error('no lib')); s.onerror = () => no(new Error('no lib')); document.head.appendChild(s);
  });
}
function saveBlob(blob, name){ const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
/** sheets: [{ name, rows: mảng các mảng }]. Có thư viện SheetJS → .xlsx; không tải được (mất mạng...) → .csv của trang đầu. */
async function download(base, sheets){
  const stamp = today(), safe = String(base).replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) || 'quy-trinh';
  try {
    const X = await loadXlsxLib(), wb = X.utils.book_new();
    sheets.forEach(s => { const ws = X.utils.aoa_to_sheet(s.rows); ws['!cols'] = (s.rows[0] || []).map((_, i) => ({ wch: Math.min(48, Math.max(10, ...s.rows.slice(0, 60).map(r => String(r[i] == null ? '' : r[i]).length + 2))) })); X.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
    const out = X.write(wb, { bookType: 'xlsx', type: 'array' });
    saveBlob(new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), safe + ' ' + stamp + '.xlsx');
    toast('Đã xuất file Excel.');
  } catch(e){
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    saveBlob(new Blob(['﻿' + sheets[0].rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), safe + ' ' + stamp + '.csv');
    toast('Không tải được thư viện Excel (có thể do mạng) nên đã xuất file .csv — Excel vẫn mở được.', 'info');
  }
}
function exportXlsx(){
  const d = wfd(); if(!d) return;
  let jobs = filtered(d); if(S.f.st === 'open') jobs = jobs.filter(j => j.status === 'open'); else if(S.f.st === 'closed') jobs = jobs.filter(j => j.status !== 'open');
  jobs = sortJobs(d, jobs);
  const fields = d.fields.filter(f => f.type !== 'file');
  const head = ['Job', 'Giai đoạn', 'Trạng thái', 'Lý do thất bại', 'Ưu tiên', 'Người thực hiện', 'Người theo dõi', 'Người tạo', 'Ngày tạo', 'Hạn chót', 'Hạn SLA giai đoạn', 'Thẻ nhãn'].concat(fields.map(f => f.name));
  const rows = [head].concat(jobs.map(j => [j.title, (stageOf(d, j.stageId) || {}).name || '', j.status === 'open' ? 'Đang làm' : j.status === 'done' ? 'Hoàn thành' : 'Thất bại', j.failReason || '', (PRIO[j.priority] || PRIO.medium).t,
    j.assigneeIds.map(uName).join(', '), j.followerIds.map(uName).join(', '), uName(j.createdBy), j.createdAt ? fmtDT(j.createdAt) : '', j.due ? fmt(j.due) : '', j.status === 'open' && j.slaDueAt ? fmtDT(j.slaDueAt) : '', (j.tags || []).join(', ')]
    .concat(fields.map(f => fieldText(f, (j.fieldValues || {})[f.id])))));
  download(d.workflow.name, [{ name: 'Job', rows }]);
}

/* ============================================================
   CHI TIẾT JOB
   ============================================================ */
const curDet = () => (S.det && S.det.id === S.detId ? S.det : null);
const detOpen = () => !!$('fl-d-head');
async function openJob(id, fromGoto){
  S.detId = id; S.det = null; S.mention = new Set();
  openModal(`
    <div id="fl-d-head" class="flex items-start justify-between px-6 py-4 border-b border-gray-200"><div class="text-gray-400 text-[13px]">Đang tải job...</div><button class="text-gray-400 hover:text-gray-700 p-1 rounded" onclick="A.cancelModal()">${I.x}</button></div>
    <div id="fl-d-body" class="p-6 grid md:grid-cols-5 gap-6">
      <div class="md:col-span-3 order-2 md:order-1 space-y-5 min-w-0">
        <div id="fl-d-steps"></div><div id="fl-d-desc"></div><div id="fl-d-fields"></div><div id="fl-d-todos"></div><div id="fl-d-files"></div>
        <div><label class="label">Bình luận</label><div id="fl-d-cm" class="space-y-3"><div class="text-[12.5px] text-gray-400">Đang tải...</div></div>
          <div class="mt-3 relative">
            ${richEditor('fl-cmt', { placeholder: 'Viết bình luận... gõ @ để nhắc tên đồng nghiệp (có thể dán ảnh bằng Ctrl+V)', minHeight: 70, nodirty: true, images: true, onInput: 'event.stopPropagation();Fl.cmInput(this)', onKeyDown: 'Fl.cmKey(event)' })}
            <div id="fl-mention" class="hidden absolute left-2 right-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" style="bottom:100%"></div>
            <div class="flex items-center justify-between mt-2"><span class="text-[12px] text-gray-400 desk-only">Ctrl + Enter để gửi</span><button class="btn btn-primary btn-sm" id="fl-cm-send" onclick="Fl.postComment()">${I.chat} Gửi</button></div>
          </div></div>
      </div>
      <div class="md:col-span-2 order-1 md:order-2 space-y-4 min-w-0" id="fl-d-side"></div>
    </div>
    <div id="fl-d-foot" class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="A.cancelModal()">Đóng</button></div>`, 'max-w-5xl');
  await loadDetail(id, false, fromGoto);
}
async function loadDetail(id, quiet, fromGoto){
  try {
    const j = await get('job', { id });
    if(S.detId !== id) return;
    S.det = j.job;
    if(!wfd(j.job.workflowId)) await loadWf(j.job.workflowId, true, { noPaint: true });
    paintDetail();
  } catch(e){
    if(authFail(e)){ A.closeModal(); return; }
    if(S.detId !== id) return;
    if(!quiet || fromGoto){ if(detOpen()){ A.closeModal(); } toast(fromGoto ? 'Không mở được job này. Có thể job đã bị xoá hoặc bạn không còn là thành viên của quy trình.' : e.message, 'error'); }
    else toast(e.message, 'error');
  }
}
/** Sau khi sửa gì đó trong khung chi tiết: tải lại chi tiết + làm mới bảng nền (không vẽ lại khung chi tiết hai lần). */
async function afterChange(){
  S.ver = {};
  const j = curDet(); if(j) await loadDetail(j.id, true);
  const ps = [loadList(true, { noPaint: true })]; if(S.wfId) ps.push(loadWf(S.wfId, true, { noPaint: true })); if(S.mine) ps.push(loadMine(true, { noPaint: true }));
  Promise.all(ps).then(() => repaintIfActive(true));
}
function fieldValueHtml(f, j){
  const v = (j.fieldValues || {})[f.id];
  if(f.type === 'file'){
    const fs = j.files.filter(x => x.fieldId === f.id);
    return fs.length ? `<div class="space-y-1">${fs.map(fileRow).join('')}</div>` : '<span class="text-gray-300">—</span>';
  }
  if(v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return f.type === 'checkbox' ? '<span class="text-gray-400">Chưa tick</span>' : '<span class="text-gray-300">—</span>';
  switch(f.type){
    case 'checkbox': return v === true ? '<span class="text-green-700 font-medium">✓ Có</span>' : '<span class="text-gray-400">Chưa tick</span>';
    case 'multiselect': return `<div class="flex flex-wrap gap-1">${(Array.isArray(v) ? v : [v]).map(x => `<span class="badge bg-slate-100 text-slate-700 border-slate-200">${esc(x)}</span>`).join('')}</div>`;
    case 'user': { const u = findUser(v); return u ? `<span class="inline-flex items-center gap-1.5">${avatar(u, 'w-5 h-5 text-[9px]')}${esc(u.name)}</span>` : esc(v); }
    case 'money': return esc(money(v));
    case 'date': return esc(fmt(v));
    case 'link': return /^https?:\/\//i.test(String(v)) ? `<a class="text-base-600 hover:underline break-all" href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>` : esc(v);
    case 'textarea': return `<span class="whitespace-pre-wrap break-words">${esc(v)}</span>`;
  }
  return `<span class="break-words">${esc(v)}</span>`;
}
function fileRow(a){
  const img = /^image\//.test(a.mime) && a.mime !== 'image/heic', j = curDet(), d = j && wfd(j.workflowId);
  const del = j && j.canEdit && j.status === 'open' && (a.uploadedBy === meId() || (d && d.workflow.canManage));
  return `
  <div class="flex items-center gap-2.5 border border-gray-200 rounded-lg p-2 hover:bg-gray-50">
    ${img ? `<a href="${fileUrl(a.id)}" target="_blank" rel="noopener"><img src="${fileUrl(a.id)}" alt="" class="w-10 h-10 object-cover rounded border border-gray-200"></a>` : `<div class="w-10 h-10 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold uppercase">${esc((a.name.split('.').pop() || '').slice(0, 4))}</div>`}
    <div class="min-w-0 flex-1"><a class="text-[13px] font-medium text-base-600 hover:underline truncate block" href="${fileUrl(a.id)}" target="_blank" rel="noopener" title="${esc(a.name)}">${esc(a.name)}</a><div class="text-[11.5px] text-gray-400">${sizeText(a.size)} · ${esc(uName(a.uploadedBy))} · ${fmtDT(a.createdAt)}</div></div>
    ${del ? `<button class="text-gray-400 hover:text-red-600 p-1" title="Xoá tệp" onclick="Fl.delFile('${a.id}')">${I.trash}</button>` : ''}</div>`;
}
function uploadBtn(fieldId, label){
  return `<label class="btn btn-ghost btn-sm cursor-pointer">${FI.clip} ${label || 'Thêm tệp'}<input type="file" multiple class="hidden" onchange="event.stopPropagation();Fl.pickFiles(this,'${fieldId || ''}')" accept=".${OK_EXT.join(',.')}"></label>`;
}
function paintDetail(){
  const j = curDet(); if(!j || !detOpen()) return;
  const d = wfd(j.workflowId), set = (id, html) => { const el = $(id); if(el) el.innerHTML = html; };
  const st = d ? stageOf(d, j.stageId) : null, idx = d ? stageIdx(d, j.stageId) : -1, open = j.status === 'open', archived = d && d.workflow.archived;
  const mv = j.canMove && open && !archived, last = d && idx === d.stages.length - 1;
  /* Đầu khung */
  set('fl-d-head', `
    <div class="min-w-0"><div class="flex items-center gap-2 flex-wrap mb-1">${d ? `<span class="inline-flex items-center gap-1.5 text-[12px] text-gray-500">${dot(d.workflow.color)}${esc(d.workflow.name)}</span>` : ''}${statusBadge(j)}${prioBadge(j.priority)}${j.archived ? '<span class="badge bg-gray-200 text-gray-600 border-gray-300">Đã lưu trữ</span>' : ''}</div>
      <h3 class="text-[17px] font-semibold text-slate-900 break-words">${esc(j.title)}</h3>
      <p class="text-xs text-gray-500 mt-0.5">Tạo bởi ${esc(uName(j.createdBy))} · ${j.createdAt ? fmtDT(j.createdAt) : ''}${j.forwardedFrom ? ' · Chuyển tiếp từ quy trình khác' : ''}</p></div>
    <button class="text-gray-400 hover:text-gray-700 p-1 rounded shrink-0" onclick="A.cancelModal()">${I.x}</button>`);
  /* Các giai đoạn */
  set('fl-d-steps', d ? `<div class="flex items-center gap-1 overflow-x-auto pb-1">${d.stages.map((s, i) => {
      const cur = i === idx, passed = i < idx || (j.status === 'done');
      const c = cur && j.status === 'failed' ? 'bg-red-600 text-white' : cur && j.status === 'done' ? 'bg-green-600 text-white' : cur ? 'bg-blue-600 text-white' : passed ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500';
      return `<span class="shrink-0 text-[12px] px-2.5 py-1 rounded-full ${c} ${cur ? 'font-semibold' : ''}">${esc(s.name)}</span>${i < d.stages.length - 1 ? '<span class="text-gray-300 shrink-0">›</span>' : ''}`; }).join('')}</div>` : '');
  /* Mô tả */
  set('fl-d-desc', plain(j.description) || /<img/.test(j.description || '') ? `<div><label class="label">Mô tả</label><div class="text-[13.5px] text-slate-700 break-words">${richHtml(j.description || '')}</div></div>` : '');
  /* Trường tuỳ chỉnh */
  set('fl-d-fields', d && d.fields.length ? `<div><div class="flex items-center justify-between"><label class="label">Thông tin theo quy trình</label></div>
    <div class="border border-gray-200 rounded-lg divide-y divide-gray-100">${d.fields.map(f => `
      <div class="px-3 py-2 grid sm:grid-cols-3 gap-1 sm:gap-3 items-start"><div class="text-[12.5px] text-gray-500">${esc(f.name)}${f.required ? ' <span class="text-red-500">*</span>' : ''}</div>
        <div class="sm:col-span-2 text-[13.5px] text-slate-800 min-w-0">${fieldValueHtml(f, j)}${f.type === 'file' && j.canEdit && open ? `<div class="mt-1.5">${uploadBtn(f.id, 'Thêm tệp')}</div>` : ''}</div></div>`).join('')}</div></div>` : '');
  /* Todo */
  set('fl-d-todos', todoHtml(j, d, mv));
  /* Tệp chung */
  const gen = j.files.filter(x => !x.fieldId);
  set('fl-d-files', `<div><div class="flex items-center justify-between"><label class="label">Tệp đính kèm${S.uploading ? '' : ''}</label>${j.canEdit && open ? uploadBtn('', 'Thêm tệp') : ''}</div>
    <div class="space-y-1.5">${gen.length ? gen.map(fileRow).join('') : '<div class="text-[12.5px] text-gray-400">Chưa có tệp nào.</div>'}${S.uploading ? `<div class="text-[12.5px] text-amber-600 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>Đang tải lên ${S.uploading} tệp...</div>` : ''}</div></div>`);
  paintComments();
  /* Cột bên */
  set('fl-d-side', sideHtml(j, d, st, idx, mv, last, open));
  /* Chân khung */
  set('fl-d-foot', `<div class="flex gap-2 flex-wrap">${isDir() ? `<button class="btn btn-danger" onclick="Fl.deleteJob('${j.id}')">${I.trash} Xoá</button>` : ''}</div>
    <div class="flex gap-2 flex-wrap justify-end">${j.canEdit && !archived && (open || j.canManage) ? `<button class="btn btn-ghost" onclick="Fl.openJobForm('${j.id}')">${I.edit} Sửa job</button>` : ''}<button class="btn btn-ghost" onclick="A.cancelModal()">Đóng</button></div>`);
}
function todoHtml(j, d, mv){
  const me = meId(), open = j.status === 'open';
  const cur = j.todos.filter(t => t.stageId === j.stageId), others = j.todos.filter(t => t.stageId !== j.stageId);
  const row = t => {
    const can = open && (t.assigneeId === me || j.canMove);
    return `<div class="flex items-start gap-2.5 px-3 py-2">
      <input type="checkbox" class="checkbox mt-0.5" ${t.done ? 'checked' : ''} ${can ? '' : 'disabled'} onchange="Fl.tickTodoD('${t.id}',this.checked)">
      <div class="min-w-0 flex-1"><div class="text-[13.5px] ${t.done ? 'line-through text-gray-400' : 'text-slate-800'} break-words">${esc(t.title)}${t.required ? ' <span class="text-[10.5px] text-red-500 font-medium no-underline">Bắt buộc</span>' : ''}</div>
        ${t.done && t.doneBy ? `<div class="text-[11.5px] text-gray-400">${esc(uName(t.doneBy))} · ${t.doneAt ? fmtDT(t.doneAt) : ''}</div>` : ''}</div>
      ${t.assigneeId ? `<span title="${esc(uName(t.assigneeId))}">${avatar(user(t.assigneeId), 'w-6 h-6 text-[10px]')}</span>` : ''}
      ${open && j.canMove ? `<button class="text-gray-300 hover:text-red-600 p-1" title="Xoá todo" onclick="Fl.delTodo('${t.id}')">${I.trash}</button>` : ''}</div>`;
  };
  const doneN = cur.filter(t => t.done).length, ws = d ? workers(d) : [];
  const oByStage = {}; others.forEach(t => { (oByStage[t.stageId] = oByStage[t.stageId] || []).push(t); });
  return `<div><label class="label">Todo giai đoạn hiện tại <span class="font-normal text-gray-400">${cur.length ? doneN + '/' + cur.length : ''}</span></label>
    <div class="border border-gray-200 rounded-lg divide-y divide-gray-100">${cur.length ? cur.map(row).join('') : '<div class="px-3 py-3 text-[12.5px] text-gray-400">Giai đoạn này chưa có todo.</div>'}</div>
    ${open && j.canMove ? `<div class="flex items-center gap-2 mt-2 flex-wrap"><input id="fl-td-new" class="input !py-1.5 flex-1 min-w-[160px]" placeholder="Thêm todo..." maxlength="200" onkeydown="if(event.key==='Enter'){event.preventDefault();Fl.addTodo()}">
      <select id="fl-td-who" class="input !py-1.5 !w-auto max-w-[160px]"><option value="">Người thực hiện job</option>${ws.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select>
      <label class="flex items-center gap-1.5 text-[12.5px] text-gray-600 whitespace-nowrap"><input type="checkbox" id="fl-td-req" class="checkbox"> Bắt buộc</label>
      <button class="btn btn-ghost btn-sm" onclick="Fl.addTodo()">${I.plus} Thêm</button></div>` : ''}
    ${others.length ? `<details class="mt-2"><summary class="text-[12.5px] text-gray-500 cursor-pointer">Todo của các giai đoạn khác (${others.length})</summary>${Object.keys(oByStage).map(sid => `<div class="mt-2"><div class="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide mb-1">${esc((stageOf(d, sid) || { name: 'Giai đoạn đã xoá' }).name)}</div><div class="border border-gray-200 rounded-lg divide-y divide-gray-100">${oByStage[sid].map(row).join('')}</div></div>`).join('')}</details>` : ''}</div>`;
}
function sideHtml(j, d, st, idx, mv, last, open){
  const ownerOrDir = j.canManage, archivedWf = d && d.workflow.archived;
  const next = d && d.stages[idx + 1], prev = d && d.stages[idx - 1];
  const rules = d ? (d.forwardRules || []).filter(r => r.mode === 'manual' && (r.stageId ? (open && r.stageId === j.stageId) : j.status === 'done') && !j.forwardLog.some(l => l.fromJobId === j.id && l.ruleId === r.id)) : [];
  const btn = (cls, js, html) => `<button class="btn ${cls} w-full justify-center" onclick="${js}">${html}</button>`;
  const acts = [];
  if(open && mv){
    if(last) acts.push(btn('btn-primary', `Fl.openClose('${j.id}','done',true)`, `${I.check} Hoàn thành job`));
    else if(next) acts.push(btn('btn-primary', `Fl.openMove('${j.id}','next',true)`, `Chuyển sang “${esc(clip(next.name, 28))}” ${FI.right}`));
    if(prev) acts.push(btn('btn-ghost', `Fl.openMove('${j.id}','prev',true)`, `${FI.left} Lùi về “${esc(clip(prev.name, 28))}”`));
    acts.push(btn('btn-ghost !text-red-600', `Fl.openClose('${j.id}','failed',true)`, 'Đánh dấu thất bại'));
  }
  if(!open && ownerOrDir && !archivedWf){
    acts.push(btn('btn-primary', `Fl.reopenJob('${j.id}')`, 'Mở lại job'));
    acts.push(j.archived ? btn('btn-ghost', `Fl.unarchive('${j.id}')`, 'Bỏ lưu trữ') : btn('btn-ghost', `Fl.archiveJob('${j.id}')`, `${FI.box} Lưu trữ job`));
  }
  if(j.canMove) rules.forEach(r => { const t = wfInfo(r.targetWorkflowId); acts.push(btn('btn-ghost', `Fl.forward('${j.id}','${r.id}')`, `${FI.fwd} Chuyển tiếp → ${esc(t ? t.name : 'quy trình khác')}`)); });
  const row = (label, val) => `<div class="flex items-start justify-between gap-3 py-1.5"><span class="text-gray-500 shrink-0">${label}</span><span class="text-right min-w-0">${val}</span></div>`;
  return `
    ${j.status === 'failed' ? `<div class="rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] px-3 py-2"><b>Thất bại</b>${j.failReason ? ': ' + esc(j.failReason) : ''}</div>` : ''}
    ${acts.length ? `<div class="space-y-2">${acts.join('')}</div>` : ''}
    <div class="rounded-lg border border-gray-200 px-3 py-1 text-[13px] divide-y divide-gray-100">
      ${row('Giai đoạn', `<b>${esc(st ? st.name : '—')}</b>`)}
      ${open ? row('Hạn SLA', st && st.slaHours ? `${slaChip(j) || ''}<div class="text-[11.5px] text-gray-400">${j.slaDueAt ? fmtDT(j.slaDueAt) : ''}</div>` : '<span class="text-gray-400">Không có</span>') : ''}
      ${row('Hạn chót', j.due ? `<span class="${dueOver(j) ? 'text-red-600 font-semibold' : ''}">${fmt(j.due)}</span>` : '<span class="text-gray-400">—</span>')}
      ${row('Vào giai đoạn', j.stageEnteredAt ? fmtDT(j.stageEnteredAt) : '—')}
      ${j.closedAt ? row('Đóng lúc', fmtDT(j.closedAt)) : ''}
      ${row('Người thực hiện', stack(j.assigneeIds, 4) + (j.assigneeIds.length ? `<div class="text-[12px] text-slate-600">${j.assigneeIds.map(id => esc(uName(id))).join(', ')}</div>` : ''))}
      ${row('Theo dõi', (j.followerIds.length ? `<div class="text-[12px] text-slate-600">${j.followerIds.map(id => esc(uName(id))).join(', ')}</div>` : '<span class="text-gray-400">Chưa có</span>') + (j.canEdit && !archivedWf ? `<button class="text-[12px] text-base-600 hover:underline" onclick="Fl.openFollowers('${j.id}')">Sửa</button>` : ''))}
      ${j.tags.length ? row('Nhãn', `<div class="flex flex-wrap gap-1 justify-end">${tagChips(j.tags)}</div>`) : ''}
    </div>
    ${j.forwardLog.length ? `<div><label class="label">Chuyển tiếp</label><div class="space-y-1.5">${j.forwardLog.map(l => {
      const out = l.fromJobId === j.id, other = out ? l.toJobId : l.fromJobId;
      return `<div class="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-[12.5px] cursor-pointer hover:bg-indigo-50" onclick="Fl.openJob('${other}')"><div class="font-medium text-indigo-800">${out ? 'Chuyển tới' : 'Nhận từ'} “${esc(out ? l.toWorkflow : l.fromWorkflow)}”</div>
        <div class="text-gray-600 truncate">${esc(out ? l.toTitle : l.fromTitle)}</div><div class="text-[11.5px] text-gray-400">${l.mode === 'auto' ? 'Tự động' : 'Thủ công'} · ${uName(l.actorId) !== '?' ? esc(uName(l.actorId)) + ' · ' : ''}${fmtDT(l.createdAt)}</div></div>`; }).join('')}</div></div>` : ''}
    <details><summary class="text-[12.5px] text-gray-500 cursor-pointer">Lịch sử hoạt động (${j.history.length})</summary>
      <div class="mt-2 space-y-1.5 max-h-64 overflow-y-auto">${j.history.map(h => `<div class="text-[12px] text-gray-600"><span class="text-gray-400">${fmtDT(h.createdAt)}</span> · <b>${esc(uName(h.actorId))}</b> ${actText(h)}</div>`).join('') || '<div class="text-[12px] text-gray-400">Chưa có.</div>'}</div></details>`;
}

/* ---------- Bình luận ---------- */
function fmtComment(text){
  const names = DB.users.map(u => esc(u.name)).filter(Boolean).sort((a, b) => b.length - a.length);
  if(!names.length) return richHtml(text);
  const re = new RegExp('@(?:' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  return richHtml(text, h => h.replace(re, m => `<span class="text-base-600 font-medium bg-base-50 rounded px-1">${m}</span>`));
}
function paintComments(){
  const el = $('fl-d-cm'), j = curDet(); if(!el || !j) return;
  el.innerHTML = j.comments.length ? j.comments.map(c => {
    if(c.system) return `<div class="flex items-start gap-2 text-[12.5px] text-gray-500"><span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0"></span><div class="min-w-0"><span class="font-medium text-gray-600">${esc(uName(c.authorId))}</span> ${esc(c.text)} <span class="text-gray-400">· ${fmtDT(c.createdAt)}</span></div></div>`;
    const a = user(c.authorId), mine = c.authorId === meId();
    return `<div class="flex gap-2.5">${avatar(a, 'w-8 h-8 text-[11px]')}
      <div class="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2">
        <div class="flex items-center gap-2 text-[12px]"><span class="font-semibold text-slate-900">${esc(a.name)}</span><span class="text-gray-400">${fmtDT(c.createdAt)}</span>${mine || j.canManage ? `<button class="ml-auto text-gray-400 hover:text-red-600" title="Xoá bình luận" onclick="Fl.delComment('${c.id}')">${I.trash}</button>` : ''}</div>
        <div class="text-[13.5px] text-slate-700 mt-0.5 break-words">${fmtComment(c.text)}</div></div></div>`; }).join('') : '<div class="text-[12.5px] text-gray-400">Chưa có bình luận nào.</div>';
}
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
function mentionable(){
  const j = curDet(), d = j && wfd(j.workflowId), ids = new Set(j ? [...j.assigneeIds, ...j.followerIds, j.createdBy] : []);
  if(d) workers(d).forEach(u => ids.add(u.id));
  return [...ids].filter(id => id && id !== meId()).map(findUser).filter(u => u && isActive(u)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
function mentionCtx(el){
  const sel = window.getSelection(); if(!el || !sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0), n = r.startContainer;
  if(!r.collapsed || n.nodeType !== 3 || !el.contains(n)) return null;
  const before = n.data.slice(0, r.startOffset), m = before.match(/@([^@\n]{0,30})$/);
  return m ? { n, off: r.startOffset, m, before } : null;
}
function cmInput(el){
  const box = $('fl-mention'); if(!box) return;
  const c = mentionCtx(el), m = c && c.m;
  if(!m){ box.classList.add('hidden'); return; }
  const q = norm(m[1]), list = mentionable().filter(u => !q || norm(u.name).includes(q)).slice(0, 8);
  if(!list.length){ box.classList.add('hidden'); return; }
  box.innerHTML = list.map(u => `<div class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-base-50 text-[13px]" onmousedown="event.preventDefault();Fl.cmPick('${u.id}')">${avatar(u, 'w-5 h-5 text-[9px]')}<span class="flex-1">${esc(u.name)}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}</span></div>`).join('');
  box.classList.remove('hidden');
}
function cmPick(id){
  const el = $('fl-cmt'), u = findUser(id), c = u && mentionCtx(el); if(!c) return;
  const pre = c.before.slice(0, c.before.length - c.m[0].length), post = c.n.data.slice(c.off), ins = pre + '@' + u.name + ' ';
  c.n.data = ins + post;
  const r = document.createRange(), sel = window.getSelection(); r.setStart(c.n, ins.length); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); el.focus();
  S.mention.add(id); $('fl-mention').classList.add('hidden');
}
function cmKey(e){ if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); postComment(); } else if(e.key === 'Escape' && !$('fl-mention').classList.contains('hidden')){ e.stopPropagation(); $('fl-mention').classList.add('hidden'); } }
async function postComment(){
  const ta = $('fl-cmt'), j = curDet(); if(!ta || !j) return;
  const text = richGet(ta), pl = richPlain(text); if(!pl.trim()) return;
  const mentions = DB.users.filter(u => u.id !== meId() && pl.includes('@' + u.name)).map(u => u.id);
  const btn = $('fl-cm-send'); btn.disabled = true;
  const r = await act('wfAddComment', { comment: { id: newId('wc'), jobId: j.id, text, mentions } }, '', true);
  const b2 = $('fl-cm-send'); if(b2) b2.disabled = false; if(!r) return;
  const e2 = $('fl-cmt'); if(e2) richSet(e2, ''); const mb = $('fl-mention'); if(mb) mb.classList.add('hidden');
  S.mention = new Set(); await afterChange();
}
async function delComment(id){ if(!confirm('Xoá bình luận này?')) return; const r = await act('wfDeleteComment', { id }, '', true); if(r) await afterChange(); }

/* ---------- Todo ---------- */
async function addTodo(){
  const j = curDet(), el = $('fl-td-new'); if(!j || !el) return;
  const title = el.value.trim(); if(!title) return;
  const r = await act('wfAddTodo', { todo: { id: newId('wt'), jobId: j.id, title, assigneeId: $('fl-td-who').value, required: $('fl-td-req').checked } }, '', true);
  if(r) await afterChange();
}
async function tickTodoD(id, done){ const r = await act('wfSetTodo', { id, done: !!done }, '', true); await afterChange(); if(!r) return; if(S.mine) loadMine(true, { noPaint: true }).then(() => { if(typeof W !== 'undefined' && W.active && W.active()) W.repaint(true); }); }
async function delTodo(id){ if(!confirm('Xoá todo này?')) return; const r = await act('wfDeleteTodo', { id }, '', true); if(r) await afterChange(); }

/* ---------- Tệp ---------- */
async function uploadFile(jobId, f, fieldId){
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  if(!OK_EXT.includes(ext)){ toast('Không hỗ trợ tệp .' + ext + ' (' + f.name + ').', 'error'); return false; }
  if(f.size > MAX_MB * 1048576){ toast(f.name + ' lớn hơn ' + MAX_MB + 'MB.', 'error'); return false; }
  if(!f.size){ toast(f.name + ' là tệp rỗng.', 'error'); return false; }
  try { await ffetch(apiUrl() + 'flow-upload?jobId=' + enc(jobId) + '&name=' + enc(f.name) + (fieldId ? '&fieldId=' + enc(fieldId) : ''), { method: 'POST', headers: { 'X-Okr-Token': token(), 'Content-Type': 'application/octet-stream' }, body: f }); return true; }
  catch(e){ if(e.auth){ forceLogout(e.message); return false; } toast(f.name + ': ' + (e.message === 'Failed to fetch' ? 'tải lên thất bại, kiểm tra kết nối.' : e.message), 'error'); return false; }
}
async function pickFiles(input, fieldId){
  const files = [...input.files]; input.value = ''; const j = curDet(); if(!files.length || !j) return;
  for(const f of files){ S.uploading++; paintDetail(); await uploadFile(j.id, f, fieldId); S.uploading--; }
  await afterChange();
}
async function delFile(id){ if(!confirm('Xoá tệp này?')) return; const r = await act('wfDeleteFile', { id }, '', true); if(r) await afterChange(); }

/* ---------- Sửa nhanh: người theo dõi, mở lại, xoá, chuyển tiếp ---------- */
function openFollowers(id){
  const j = curDet(), d = j && wfd(j.workflowId); if(!j || !d) return; backTo = id;
  openModal(`${modalHeader('Người theo dõi', esc(j.title))}
    <div class="p-6"><div class="text-[12.5px] text-gray-500 mb-2">Người theo dõi nhận thông báo khi có bình luận và khi job Hoàn thành / Thất bại.</div>${picker('fl-fol', j.followerIds, workers(d).filter(u => !j.assigneeIds.includes(u.id)))}</div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="Fl.subClose()">Huỷ</button><button class="btn btn-primary" id="fl-fol-ok" onclick="Fl.saveFollowers('${id}')">${I.check} Lưu</button></div>`, 'max-w-md');
}
async function saveFollowers(id){
  const b = $('fl-fol-ok'); if(b) b.disabled = true;
  const r = await act('wfSetFollowers', { jobId: id, followerIds: picked('fl-fol') }, 'Đã cập nhật người theo dõi.', true);
  if(!r){ if($('fl-fol-ok')) $('fl-fol-ok').disabled = false; return; }
  S.ver = {}; subClose(); loadList(true, { noPaint: true }); if(S.wfId) loadWf(S.wfId, true);
}
async function reopenJob(id){
  if(!confirm('Mở lại job này? Job sẽ quay về giai đoạn cuối cùng đã làm ở trạng thái đang làm.')) return;
  const r = await act('wfReopenJob', { id }, 'Đã mở lại job.', true); if(r) await afterChange();
}
async function deleteJob(id){
  if(!confirm('Xoá hẳn job này? Mọi todo, bình luận, tệp của job sẽ mất và không khôi phục được.\n\n(Nên dùng Lưu trữ thay vì xoá nếu chỉ muốn gọn bảng.)')) return;
  const r = await act('wfDeleteJob', { id }, 'Đã xoá job.'); if(r){ A.closeModal(); S.det = null; S.detId = ''; }
}
async function forward(id, ruleId){
  const j = curDet(), rule = j && wfd(j.workflowId) && wfd(j.workflowId).forwardRules.find(r => r.id === ruleId), t = rule && wfInfo(rule.targetWorkflowId);
  if(!confirm('Chuyển tiếp job này sang quy trình “' + (t ? t.name : 'khác') + '”?\n\nJob mới được tạo ở giai đoạn đầu của quy trình đích; job hiện tại vẫn giữ nguyên và được đánh dấu đã chuyển tiếp.')) return;
  const r = await act('wfForwardJob', { id, ruleId }, 'Đã chuyển tiếp job.', true);
  if(!r) return;
  await afterChange();
  const nj = r.result && r.result.forwarded; if(nj && nj.id) openJob(nj.id);
}

/* ============================================================
   FORM TẠO / SỬA JOB
   ============================================================ */
function fieldInput(f, v){
  const id = 'fl-f-' + f.id, val = v === undefined || v === null ? '' : v;
  switch(f.type){
    case 'textarea': return `<textarea id="${id}" class="input" rows="3" maxlength="5000" onchange="modalDirty=true">${esc(val)}</textarea>`;
    case 'number': return `<input id="${id}" class="input" type="number" inputmode="decimal" step="any" value="${esc(val)}" onchange="modalDirty=true">`;
    case 'money': return `<div class="relative"><input id="${id}" class="input !pr-8" type="number" inputmode="numeric" step="1000" value="${esc(val)}" onchange="modalDirty=true"><span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[13px]">đ</span></div>`;
    case 'date': return `<input id="${id}" class="input" type="date" value="${esc(val)}" onchange="modalDirty=true">`;
    case 'link': return `<input id="${id}" class="input" type="url" inputmode="url" placeholder="https://..." value="${esc(val)}" onchange="modalDirty=true">`;
    case 'select': return `<select id="${id}" class="input" onchange="modalDirty=true"><option value="">— Chọn —</option>${f.options.map(o => `<option value="${esc(o)}" ${String(val) === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    case 'multiselect': { const cur = Array.isArray(val) ? val : []; return `<div id="${id}" class="flex flex-wrap gap-x-4 gap-y-1.5">${f.options.map(o => `<label class="flex items-center gap-1.5 text-[13.5px]"><input type="checkbox" class="checkbox" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''} onchange="modalDirty=true">${esc(o)}</label>`).join('') || '<span class="text-[12.5px] text-gray-400">Chưa có lựa chọn.</span>'}</div>`; }
    case 'user': { const d = wfd(S.draft.wfId); return `<select id="${id}" class="input" onchange="modalDirty=true"><option value="">— Chọn người —</option>${(d ? workers(d) : []).map(u => `<option value="${u.id}" ${val === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>`; }
    case 'checkbox': return `<label class="flex items-center gap-2 text-[13.5px]"><input id="${id}" type="checkbox" class="checkbox" ${val === true ? 'checked' : ''} onchange="modalDirty=true"> Có</label>`;
    case 'file': return S.draft.isNew
      ? `<div><label class="btn btn-ghost btn-sm cursor-pointer">${FI.clip} Chọn tệp<input type="file" multiple class="hidden" onchange="event.stopPropagation();Fl.pendFiles(this,'${f.id}')" accept=".${OK_EXT.join(',.')}"></label><div id="fl-pend-${f.id}" class="mt-1.5 space-y-1"></div></div>`
      : '<div class="text-[12.5px] text-gray-400">Đính kèm / xoá tệp ngay ở màn chi tiết job.</div>';
  }
  return `<input id="${id}" class="input" maxlength="500" value="${esc(val)}" onchange="modalDirty=true">`;
}
function openJobForm(id){
  let j = null, d;
  if(id){ j = curDet(); if(!j || j.id !== id) return; d = wfd(j.workflowId); } else d = wfd();
  if(!d) return;
  if(!d.stages.length){ toast('Quy trình chưa có giai đoạn nào. Hãy nhờ owner thêm giai đoạn ở mục Cài đặt.', 'error'); return; }
  backTo = id || '';
  S.draft = { id: id || newId('wj'), isNew: !id, wfId: d.workflow.id, pending: [] };
  const first = d.stages[0], defAsg = j ? j.assigneeIds : (first.assigneeIds.length ? first.assigneeIds : [meId()]), ws = workers(d);
  openModal(`
    ${modalHeader(id ? 'Sửa job' : 'Tạo job mới', esc(d.workflow.name) + (id ? '' : ' · vào giai đoạn “' + esc(first.name) + '”'))}
    <div class="p-6 space-y-4">
      <div><label class="label">Tên job <span class="text-red-500">*</span></label><input id="fl-j-title" class="input" maxlength="300" value="${esc(j ? j.title : '')}" placeholder="Ví dụ: Nguyễn Văn A — Kế toán" onchange="modalDirty=true"></div>
      <div><label class="label">Mô tả</label>${richEditor('fl-j-desc', { placeholder: 'Mô tả chi tiết (có thể dán ảnh bằng Ctrl+V)', minHeight: 90, images: true })}</div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="label">Mức ưu tiên</label><select id="fl-j-pri" class="input" onchange="modalDirty=true">${Object.keys(PRIO).map(k => `<option value="${k}" ${(j ? j.priority : 'medium') === k ? 'selected' : ''}>${PRIO[k].t}</option>`).join('')}</select></div>
        <div><label class="label">Hạn chót của cả job</label><input id="fl-j-due" type="date" class="input" value="${esc(j ? j.due : '')}" onchange="modalDirty=true"></div>
      </div>
      <div><label class="label">Thẻ nhãn <span class="font-normal text-gray-400">(cách nhau bằng dấu phẩy)</span></label><input id="fl-j-tags" class="input" maxlength="200" value="${esc(j ? j.tags.join(', ') : '')}" onchange="modalDirty=true"></div>
      ${d.fields.length ? `<div class="rounded-lg border border-gray-200 p-4 space-y-3"><div class="section-title">Thông tin theo quy trình</div>${d.fields.map(f => `<div><label class="label">${esc(f.name)}${f.required && f.type !== 'file' ? ' <span class="text-red-500">*</span>' : ''}${f.type === 'file' && f.required ? ' <span class="font-normal text-amber-600">(cần có tệp trước khi chuyển giai đoạn)</span>' : ''}</label>${fieldInput(f, j ? (j.fieldValues || {})[f.id] : undefined)}</div>`).join('')}</div>` : ''}
      <div class="grid md:grid-cols-2 gap-4">
        <div><label class="label">Người thực hiện</label>${picker('fl-j-asg', defAsg, ws)}<div class="text-[12px] text-gray-400 mt-1">${id ? 'Bỏ trống hết sẽ báo lỗi: job cần ít nhất 1 người.' : 'Đã chọn sẵn theo người mặc định của giai đoạn đầu.'}</div></div>
        <div><label class="label">Người theo dõi</label>${picker('fl-j-fol', j ? j.followerIds : [], ws)}<div class="text-[12px] text-gray-400 mt-1">Chỉ xem và bình luận.</div></div>
      </div>
      ${S.draft.isNew ? `<div><div class="flex items-center justify-between"><label class="label">Tệp đính kèm</label><label class="btn btn-ghost btn-sm cursor-pointer">${FI.clip} Thêm tệp<input type="file" multiple class="hidden" onchange="event.stopPropagation();Fl.pendFiles(this,'')" accept=".${OK_EXT.join(',.')}"></label></div><div id="fl-pend-" class="space-y-1"></div></div>` : ''}
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="Fl.formCancel()">Huỷ</button><button class="btn btn-primary" id="fl-j-save" onclick="Fl.saveJob()">${I.check} ${id ? 'Lưu' : 'Tạo job'}</button></div>`, 'max-w-3xl');
  const de = $('fl-j-desc'); if(de && j) richSet(de, j.description || '');
  setTimeout(() => { const el = $('fl-j-title'); if(el && !id) el.focus(); modalDirty = false; }, 60);
}
function formCancel(){ if(modalDirty && !confirm('Bỏ nội dung đang nhập?')) return; modalDirty = false; subClose(); }
function pendFiles(input, fieldId){
  const files = [...input.files]; input.value = ''; if(!S.draft) return;
  files.forEach(f => {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if(!OK_EXT.includes(ext)){ toast('Không hỗ trợ tệp .' + ext + ' (' + f.name + ').', 'error'); return; }
    if(f.size > MAX_MB * 1048576){ toast(f.name + ' lớn hơn ' + MAX_MB + 'MB.', 'error'); return; }
    if(!f.size){ toast(f.name + ' là tệp rỗng.', 'error'); return; }
    S.draft.pending.push({ file: f, fieldId });
  });
  modalDirty = true; paintPend();
}
function paintPend(){
  if(!S.draft) return;
  const keys = new Set(S.draft.pending.map(p => p.fieldId).concat(['']));
  document.querySelectorAll('[id^="fl-pend-"]').forEach(el => keys.add(el.id.slice(8)));
  keys.forEach(k => { const el = $('fl-pend-' + k); if(!el) return;
    el.innerHTML = S.draft.pending.map((p, i) => p.fieldId === k ? `<div class="flex items-center gap-2 text-[12.5px] bg-gray-50 border border-gray-200 rounded px-2 py-1">${FI.clip}<span class="truncate flex-1">${esc(p.file.name)}</span><span class="text-gray-400">${sizeText(p.file.size)}</span><button class="text-gray-400 hover:text-red-600" onclick="Fl.pendDel(${i})">${I.x}</button></div>` : '').join(''); });
}
function pendDel(i){ if(S.draft){ S.draft.pending.splice(i, 1); paintPend(); } }
function readFieldValues(d){
  const out = {};
  d.fields.forEach(f => {
    if(f.type === 'file') return;
    const el = $('fl-f-' + f.id); if(!el) return;
    out[f.id] = f.type === 'checkbox' ? el.checked : f.type === 'multiselect' ? [...el.querySelectorAll('input:checked')].map(i => i.value) : el.value.trim();
  });
  return out;
}
async function saveJob(){
  const dr = S.draft, d = dr && wfd(dr.wfId); if(!d) return;
  const title = $('fl-j-title').value.trim(); if(!title){ toast('Nhập tên job.', 'error'); return; }
  const asg = picked('fl-j-asg');
  const job = { id: dr.id, workflowId: dr.wfId, title, description: richGet($('fl-j-desc')), priority: $('fl-j-pri').value, due: $('fl-j-due').value, tags: $('fl-j-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    fieldValues: readFieldValues(d), followerIds: picked('fl-j-fol') };
  if(asg.length || !dr.isNew) job.assigneeIds = asg;
  const btn = $('fl-j-save'); btn.disabled = true;
  const r = await act('wfSaveJob', { job }, '', true);
  if(!r){ const b = $('fl-j-save'); if(b) b.disabled = false; return; }
  let upFail = 0;
  for(const p of dr.pending){ const ok = await uploadFile(dr.id, p.file, p.fieldId); if(!ok) upFail++; }
  toast(dr.isNew ? 'Đã tạo job.' : 'Đã lưu job.'); modalDirty = false;
  if(dr.isNew){ A.closeModal(); backTo = ''; S.draft = null; await refresh(); return; }
  S.draft = null; S.ver = {}; subClose(); refresh();
}

/* ============================================================
   FORM TẠO / SỬA QUY TRÌNH, NHÂN BẢN, MẪU
   ============================================================ */
const swatches = (name, cur) => `<div class="flex gap-1.5 flex-wrap" id="${name}">${COLORS.map(c => `<label class="cursor-pointer"><input type="radio" name="${name}" value="${c}" class="hidden peer" ${c === cur ? 'checked' : ''}><span class="block w-7 h-7 rounded-full border-2 border-transparent peer-checked:border-slate-800 peer-checked:ring-2 peer-checked:ring-white" style="background:${c}"></span></label>`).join('')}</div>`;
const pickedColor = name => { const el = document.querySelector('#' + name + ' input:checked'); return el ? el.value : COLORS[0]; };
function openWorkflowForm(id){
  const w = id ? (wfd(id) ? wfd(id).workflow : wfInfo(id)) : null;
  if(id && !w) return;
  const src = (S.list ? S.list.workflows : []).filter(x => x.isMember || isDir());
  backTo = '';
  openModal(`
    ${modalHeader(id ? 'Sửa thông tin quy trình' : 'Tạo quy trình mới', id ? '' : 'Bạn sẽ là owner của quy trình này.')}
    <div class="p-6 space-y-4">
      <div><label class="label">Tên quy trình <span class="text-red-500">*</span></label><input id="fl-w-name" class="input" maxlength="100" value="${esc(w ? w.name : '')}" placeholder="Ví dụ: Tuyển dụng" onchange="modalDirty=true"></div>
      <div class="grid sm:grid-cols-2 gap-4">
        <div><label class="label">Nhóm</label><input id="fl-w-cat" class="input" maxlength="40" list="fl-cats" value="${esc(w ? w.category : '')}" placeholder="Ví dụ: Nhân sự" onchange="modalDirty=true"><datalist id="fl-cats">${[...new Set((S.list ? S.list.workflows : []).map(x => x.category).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
        <div><label class="label">Màu</label>${swatches('fl-w-color', w ? w.color : COLORS[0])}</div>
      </div>
      <div><label class="label">Mô tả</label><textarea id="fl-w-desc" class="input" rows="2" maxlength="1000" onchange="modalDirty=true">${esc(w ? plain(w.description) : '')}</textarea></div>
      ${id ? '' : `<div><label class="label">Bắt đầu từ</label>
        <div class="space-y-2">
          ${S.tmpl.map((t, i) => `<label class="flex items-start gap-2.5 border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50"><input type="radio" name="fl-w-tpl" value="t:${esc(t.key)}" class="mt-1" ${i === 0 ? 'checked' : ''}><span><b class="text-slate-900">${esc(t.name)}</b><span class="text-gray-400 text-[12px]"> · ${t.stages} giai đoạn</span><br><span class="text-[12.5px] text-gray-500">${esc(t.description)}</span></span></label>`).join('')}
          ${src.length ? `<label class="flex items-start gap-2.5 border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50"><input type="radio" name="fl-w-tpl" value="clone" class="mt-1"><span class="flex-1"><b class="text-slate-900">Nhân bản quy trình có sẵn</b><br><span class="text-[12.5px] text-gray-500">Chép giai đoạn, todo mẫu, trường tuỳ chỉnh, lý do thất bại. Không chép job, thành viên, luật chuyển tiếp.</span>
            <select id="fl-w-src" class="input !py-1.5 mt-2" onclick="document.querySelector('input[name=fl-w-tpl][value=clone]').checked=true">${src.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></span></label>` : ''}
        </div></div>`}
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="A.cancelModal()">Huỷ</button><button class="btn btn-primary" id="fl-w-save" onclick="Fl.saveWorkflow('${id || ''}')">${I.check} ${id ? 'Lưu' : 'Tạo quy trình'}</button></div>`, 'max-w-xl');
  setTimeout(() => { const el = $('fl-w-name'); if(el && !id) el.focus(); }, 50);
}
async function saveWorkflow(id){
  const name = $('fl-w-name').value.trim(); if(!name){ toast('Nhập tên quy trình.', 'error'); return; }
  const wid = id || newId('wf'), body = { workflow: { id: wid, name, category: $('fl-w-cat').value.trim(), description: $('fl-w-desc').value, color: pickedColor('fl-w-color') } };
  if(id){ const d = wfd(id); body.workflow.archived = d ? d.workflow.archived : undefined; }
  else { const r = document.querySelector('input[name=fl-w-tpl]:checked'), v = r ? r.value : 't:blank'; if(v === 'clone') body.cloneFromId = $('fl-w-src').value; else body.templateKey = v.slice(2); }
  $('fl-w-save').disabled = true;
  const j = await act('wfSaveWorkflow', body, id ? 'Đã lưu quy trình.' : 'Đã tạo quy trình.');
  if(!j){ if($('fl-w-save')) $('fl-w-save').disabled = false; return; }
  A.closeModal();
  if(!id){ openWf(wid, 'settings'); toast('Đã tạo quy trình. Hãy thêm thành viên ở mục Thành viên và kiểm tra cấu hình ở Cài đặt.', 'info'); }
}

/* ============================================================
   CÀI ĐẶT QUY TRÌNH (owner / Giám đốc)
   ============================================================ */
const clone = o => JSON.parse(JSON.stringify(o));
function cfgInit(d){
  if(S.cfg && S.cfg.id === d.workflow.id) return;
  S.cfg = { id: d.workflow.id, stages: d.stages.map(s => ({ id: s.id, name: s.name, slaHours: s.slaHours === null ? '' : s.slaHours, assigneeIds: [...s.assigneeIds], todos: s.todos.map(t => ({ id: t.id, title: t.title, required: !!t.required })) })),
    fields: d.fields.map(f => ({ id: f.id, name: f.name, type: f.type, required: !!f.required, optText: (f.options || []).join('\n'), old: true })),
    reasons: d.failReasons.map(r => r.text), rules: d.forwardRules.map(r => clone(r)), dirty: false };
}
function settingsView(d){
  if(!d.workflow.canManage) return `<div class="card p-10 text-center text-gray-500">Chỉ owner của quy trình hoặc Giám đốc xem được mục Cài đặt.</div>`;
  cfgInit(d); const w = d.workflow;
  return `
  <div class="card p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
    <div class="flex items-center gap-2.5 min-w-0">${dot(w.color)}<div class="min-w-0"><div class="font-semibold text-slate-900 truncate">${esc(w.name)}</div><div class="text-[12px] text-gray-500">Tên, nhóm, màu, mô tả của quy trình</div></div></div>
    <div class="flex gap-2 flex-wrap"><button class="btn btn-ghost btn-sm" onclick="Fl.openWorkflowForm('${w.id}')">${I.edit} Sửa thông tin</button>
      <button class="btn btn-ghost btn-sm" onclick="Fl.toggleArchWorkflow()">${FI.box} ${w.archived ? 'Bỏ lưu trữ quy trình' : 'Lưu trữ quy trình'}</button>
      <button class="btn btn-danger btn-sm" onclick="Fl.deleteWorkflow()">${I.trash} Xoá</button></div>
  </div>
  <div id="fl-cfg">${cfgHtml(d)}</div>
  <div class="sticky bottom-0 -mx-1 px-1 py-3 bg-[#f4f5f7]/95 backdrop-blur flex items-center justify-between gap-2 border-t border-gray-200 mt-4" style="padding-bottom:calc(12px + env(safe-area-inset-bottom))">
    <span class="text-[12.5px] text-gray-500" id="fl-cfg-note">Chỉnh xong bấm <b>Lưu cấu hình</b>. Job đang chạy giữ nguyên; todo mẫu mới chỉ áp dụng cho job vào giai đoạn sau đó.</span>
    <div class="flex gap-2"><button class="btn btn-ghost" onclick="Fl.cfgReset()">Hoàn tác</button><button class="btn btn-primary" id="fl-cfg-save" onclick="Fl.cfgSave()">${I.check} Lưu cấu hình</button></div>
  </div>`;
}
function cfgHtml(d){
  const c = S.cfg, ms = (d.workflow.members || []);
  const sec = (title, sub, body, add) => `<div class="card mb-4"><div class="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap"><div><div class="font-semibold text-slate-900">${title}</div><div class="text-[12px] text-gray-500">${sub}</div></div>${add || ''}</div><div class="p-4 space-y-3">${body}</div></div>`;
  const stages = c.stages.map((s, i) => `
    <div class="border border-gray-200 rounded-lg p-3 bg-white">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="w-6 h-6 rounded-full bg-blue-50 text-blue-700 text-[12px] font-semibold flex items-center justify-center shrink-0">${i + 1}</span>
        <input class="input !py-1.5 flex-1 min-w-[160px] font-medium" maxlength="80" value="${esc(s.name)}" placeholder="Tên giai đoạn" oninput="Fl.cfgSet('stages',${i},'name',this.value)">
        <div class="flex items-center gap-1.5"><input class="input !py-1.5 !w-24 text-right" type="number" min="1" step="1" inputmode="numeric" value="${esc(s.slaHours)}" placeholder="SLA" title="Hạn xử lý của giai đoạn (giờ liên tục). Để trống = không SLA" oninput="Fl.cfgSet('stages',${i},'slaHours',this.value)"><span class="text-[12px] text-gray-500">giờ SLA</span></div>
        <div class="flex gap-1 ml-auto"><button class="p-1.5 text-gray-400 hover:text-slate-800 disabled:opacity-30" ${i === 0 ? 'disabled' : ''} title="Lên" onclick="Fl.cfgMove('stages',${i},-1)">${FI.up}</button><button class="p-1.5 text-gray-400 hover:text-slate-800 disabled:opacity-30" ${i === c.stages.length - 1 ? 'disabled' : ''} title="Xuống" onclick="Fl.cfgMove('stages',${i},1)">${FI.dn}</button><button class="p-1.5 text-gray-400 hover:text-red-600" title="Xoá giai đoạn" onclick="Fl.cfgDel('stages',${i})">${I.trash}</button></div>
      </div>
      <div class="mt-2.5 flex items-center gap-2 flex-wrap text-[12.5px]"><span class="text-gray-500">Người thực hiện mặc định:</span>${s.assigneeIds.length ? stack(s.assigneeIds, 5) + `<span class="text-slate-600">${s.assigneeIds.map(id => esc(uName(id))).join(', ')}</span>` : '<span class="text-gray-400">Chưa chọn (người tạo / người đang giữ job)</span>'}<button class="text-base-600 hover:underline" onclick="Fl.cfgPickAsg(${i})">${s.assigneeIds.length ? 'Đổi' : 'Chọn'}</button></div>
      <div class="mt-2.5"><div class="text-[12px] text-gray-500 mb-1">Todo mẫu (tự sinh khi job vào giai đoạn này)</div>
        ${s.todos.map((t, k) => `<div class="flex items-center gap-2 mb-1.5"><input class="input !py-1.5 flex-1" maxlength="200" value="${esc(t.title)}" placeholder="Nội dung todo" oninput="Fl.cfgTodo(${i},${k},'title',this.value)"><label class="flex items-center gap-1.5 text-[12.5px] text-gray-600 whitespace-nowrap"><input type="checkbox" class="checkbox" ${t.required ? 'checked' : ''} onchange="Fl.cfgTodo(${i},${k},'required',this.checked)"> Bắt buộc</label><button class="p-1 text-gray-300 hover:text-red-600" onclick="Fl.cfgDelTodo(${i},${k})">${I.x}</button></div>`).join('')}
        <button class="text-[12.5px] text-base-600 hover:underline" onclick="Fl.cfgAddTodo(${i})">+ Thêm todo mẫu</button></div>
    </div>`).join('');
  const fields = c.fields.map((f, i) => `
    <div class="border border-gray-200 rounded-lg p-3 bg-white">
      <div class="flex items-center gap-2 flex-wrap">
        <input class="input !py-1.5 flex-1 min-w-[150px]" maxlength="80" value="${esc(f.name)}" placeholder="Tên trường" oninput="Fl.cfgSet('fields',${i},'name',this.value)">
        ${f.old ? `<span class="badge bg-gray-100 text-gray-700 border-gray-200" title="Không đổi được kiểu của trường đã tạo">${esc(FT[f.type])}</span>` : `<select class="input !py-1.5 !w-auto" onchange="Fl.cfgFieldType(${i},this.value)">${Object.keys(FT).map(k => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${FT[k]}</option>`).join('')}</select>`}
        ${f.type === 'file' ? '' : `<label class="flex items-center gap-1.5 text-[12.5px] text-gray-600 whitespace-nowrap"><input type="checkbox" class="checkbox" ${f.required ? 'checked' : ''} onchange="Fl.cfgSet('fields',${i},'required',this.checked)"> Bắt buộc</label>`}
        ${f.type === 'file' ? `<label class="flex items-center gap-1.5 text-[12.5px] text-gray-600 whitespace-nowrap"><input type="checkbox" class="checkbox" ${f.required ? 'checked' : ''} onchange="Fl.cfgSet('fields',${i},'required',this.checked)"> Cần có tệp mới được chuyển giai đoạn</label>` : ''}
        <div class="flex gap-1 ml-auto"><button class="p-1.5 text-gray-400 hover:text-slate-800 disabled:opacity-30" ${i === 0 ? 'disabled' : ''} onclick="Fl.cfgMove('fields',${i},-1)">${FI.up}</button><button class="p-1.5 text-gray-400 hover:text-slate-800 disabled:opacity-30" ${i === c.fields.length - 1 ? 'disabled' : ''} onclick="Fl.cfgMove('fields',${i},1)">${FI.dn}</button><button class="p-1.5 text-gray-400 hover:text-red-600" title="Xoá trường (xoá luôn dữ liệu của trường này ở mọi job)" onclick="Fl.cfgDel('fields',${i})">${I.trash}</button></div>
      </div>
      ${f.type === 'select' || f.type === 'multiselect' ? `<div class="mt-2"><div class="text-[12px] text-gray-500 mb-1">Các lựa chọn (mỗi dòng một lựa chọn)</div><textarea class="input" rows="3" oninput="Fl.cfgSet('fields',${i},'optText',this.value)">${esc(f.optText)}</textarea></div>` : ''}
    </div>`).join('');
  const reasons = c.reasons.map((r, i) => `<div class="flex items-center gap-2"><input class="input !py-1.5 flex-1" maxlength="120" value="${esc(r)}" placeholder="Lý do thất bại" oninput="Fl.cfgReason(${i},this.value)"><button class="p-1 text-gray-300 hover:text-red-600" onclick="Fl.cfgDel('reasons',${i})">${I.x}</button></div>`).join('');
  const targets = (S.list ? S.list.workflows : []).filter(x => x.id !== d.workflow.id && !x.archived && (x.isMember || isDir()));
  const rules = c.rules.map((r, i) => `
    <div class="border border-gray-200 rounded-lg p-3 bg-white grid sm:grid-cols-12 gap-2 items-center">
      <div class="sm:col-span-4"><div class="text-[11.5px] text-gray-500 mb-0.5">Khi</div><select class="input !py-1.5" onchange="Fl.cfgRule(${i},'stageId',this.value)"><option value="" ${r.stageId === '' ? 'selected' : ''}>Job Hoàn thành</option>${c.stages.map(s => `<option value="${s.id}" ${r.stageId === s.id ? 'selected' : ''}>Job đang ở “${esc(s.name || 'Giai đoạn mới')}”</option>`).join('')}</select></div>
      <div class="sm:col-span-4"><div class="text-[11.5px] text-gray-500 mb-0.5">Chuyển tiếp sang</div><select class="input !py-1.5" onchange="Fl.cfgRule(${i},'targetWorkflowId',this.value)"><option value="">— Chọn quy trình —</option>${targets.map(x => `<option value="${x.id}" ${r.targetWorkflowId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}${r.targetWorkflowId && !targets.some(x => x.id === r.targetWorkflowId) ? `<option value="${r.targetWorkflowId}" selected>(quy trình khác)</option>` : ''}</select></div>
      <div class="sm:col-span-3"><div class="text-[11.5px] text-gray-500 mb-0.5">Cách chuyển</div><select class="input !py-1.5" onchange="Fl.cfgRule(${i},'mode',this.value)"><option value="manual" ${r.mode === 'manual' ? 'selected' : ''}>Thủ công (bấm nút)</option><option value="auto" ${r.mode === 'auto' ? 'selected' : ''}>Tự động</option></select></div>
      <div class="sm:col-span-1 text-right"><button class="p-1.5 text-gray-400 hover:text-red-600" onclick="Fl.cfgDel('rules',${i})">${I.trash}</button></div>
    </div>`).join('');
  return sec('Giai đoạn', 'Job đi tuần tự từ giai đoạn đầu đến giai đoạn cuối rồi Hoàn thành. Mỗi giai đoạn có SLA, người thực hiện mặc định và todo mẫu.', stages || '<div class="text-gray-400 text-[13px]">Chưa có giai đoạn.</div>', `<button class="btn btn-ghost btn-sm" onclick="Fl.cfgAdd('stages')">${I.plus} Thêm giai đoạn</button>`)
    + sec('Trường tuỳ chỉnh', 'Thông tin riêng của quy trình, điền ở mỗi job (ví dụ Vị trí ứng tuyển, Mức lương...). Trường “Bắt buộc” phải điền khi tạo job.', fields || '<div class="text-gray-400 text-[13px]">Chưa có trường nào.</div>', `<button class="btn btn-ghost btn-sm" onclick="Fl.cfgAdd('fields')">${I.plus} Thêm trường</button>`)
    + sec('Lý do thất bại', 'Khi đánh dấu Thất bại, người dùng chọn một lý do trong danh sách này. Danh sách trống thì được nhập tự do.', reasons || '<div class="text-gray-400 text-[13px]">Chưa có lý do nào.</div>', `<button class="btn btn-ghost btn-sm" onclick="Fl.cfgAdd('reasons')">${I.plus} Thêm lý do</button>`)
    + sec('Chuyển tiếp sang quy trình khác', 'Ví dụ: job Tuyển dụng Hoàn thành → tạo job ở quy trình Onboarding. Job mới vào giai đoạn đầu của quy trình đích; job gốc vẫn giữ lại và được đánh dấu đã chuyển tiếp. Trường cùng tên và cùng kiểu được tự chép sang.', rules || '<div class="text-gray-400 text-[13px]">Chưa có luật nào.</div>', targets.length ? `<button class="btn btn-ghost btn-sm" onclick="Fl.cfgAdd('rules')">${I.plus} Thêm luật</button>` : '<span class="text-[12px] text-gray-400">Cần có quy trình khác mà bạn là thành viên</span>');
}
function paintCfg(){ const d = wfd(), el = $('fl-cfg'); if(!d || !el || !S.cfg) return; const top = $('content') ? $('content').scrollTop : 0; el.innerHTML = cfgHtml(d); if($('content')) $('content').scrollTop = top; }
function cfgSet(list, i, k, v){ const o = S.cfg[list][i]; if(!o) return; o[k] = v; }
function cfgFieldType(i, v){ const f = S.cfg.fields[i]; if(f){ f.type = v; paintCfg(); } }
function cfgTodo(i, k, key, v){ const t = S.cfg.stages[i] && S.cfg.stages[i].todos[k]; if(t) t[key] = v; }
function cfgReason(i, v){ S.cfg.reasons[i] = v; }
function cfgRule(i, k, v){ const r = S.cfg.rules[i]; if(r){ r[k] = v; } }
function cfgMove(list, i, dir){ const a = S.cfg[list], j = i + dir; if(j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; paintCfg(); }
function cfgDel(list, i){
  const a = S.cfg[list];
  if(list === 'stages' && !confirm('Xoá giai đoạn này? (Chỉ xoá được khi không còn job đang làm ở đó.)')) return;
  if(list === 'fields' && S.cfg.fields[i].old && !confirm('Xoá trường này? Dữ liệu của trường ở mọi job (kể cả tệp đính kèm theo trường) sẽ bị xoá khi bạn bấm Lưu cấu hình.')) return;
  a.splice(i, 1); paintCfg();
}
function cfgAdd(list){
  const c = S.cfg;
  if(list === 'stages') c.stages.push({ id: newId('ws'), name: '', slaHours: '', assigneeIds: [], todos: [] });
  else if(list === 'fields') c.fields.push({ id: newId('wd'), name: '', type: 'text', required: false, optText: '', old: false });
  else if(list === 'reasons') c.reasons.push('');
  else if(list === 'rules') c.rules.push({ id: newId('wu'), stageId: '', targetWorkflowId: '', mode: 'manual', fieldMap: {} });
  paintCfg();
  const last = document.querySelector('#fl-cfg .card:last-of-type'); if(last && list !== 'stages') { /* giữ vị trí */ }
}
function cfgAddTodo(i){ S.cfg.stages[i].todos.push({ id: newId('wp'), title: '', required: false }); paintCfg(); }
function cfgDelTodo(i, k){ S.cfg.stages[i].todos.splice(k, 1); paintCfg(); }
function cfgPickAsg(i){
  const d = wfd(); if(!d) return; const s = S.cfg.stages[i];
  openModal(`${modalHeader('Người thực hiện mặc định', esc(s.name || 'Giai đoạn mới'))}
    <div class="p-6"><div class="text-[12.5px] text-gray-500 mb-2">Job vào giai đoạn này sẽ được giao cho những người này (người chuyển giai đoạn vẫn đổi được). Chỉ chọn được thành viên của quy trình và Giám đốc.</div>${picker('fl-cfg-asg', s.assigneeIds, workers(d))}</div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2"><button class="btn btn-ghost" onclick="A.closeModal()">Huỷ</button><button class="btn btn-primary" onclick="Fl.cfgAsgOk(${i})">${I.check} Chọn</button></div>`, 'max-w-md');
}
function cfgAsgOk(i){ S.cfg.stages[i].assigneeIds = picked('fl-cfg-asg'); A.closeModal(); paintCfg(); }
function cfgReset(){ S.cfg = null; repaint(); toast('Đã hoàn tác về cấu hình đang lưu.', 'info'); }
async function cfgSave(){
  const d = wfd(), c = S.cfg; if(!d || !c) return;
  const body = { workflowId: d.workflow.id,
    stages: c.stages.map(s => ({ id: s.id, name: s.name.trim(), slaHours: String(s.slaHours).trim() === '' ? null : Number(s.slaHours), assigneeIds: s.assigneeIds, todos: s.todos.map(t => ({ id: t.id, title: t.title.trim(), required: !!t.required })).filter(t => t.title) })),
    fields: c.fields.map(f => ({ id: f.id, name: f.name.trim(), type: f.type, required: !!f.required, options: f.type === 'select' || f.type === 'multiselect' ? f.optText.split('\n').map(x => x.trim()).filter(Boolean) : [] })),
    failReasons: c.reasons.map(r => r.trim()).filter(Boolean),
    forwardRules: c.rules.filter(r => r.targetWorkflowId).map(r => ({ id: r.id, stageId: r.stageId, targetWorkflowId: r.targetWorkflowId, mode: r.mode, fieldMap: r.fieldMap || {} })) };
  const b = $('fl-cfg-save'); if(b) b.disabled = true;
  const j = await act('wfSaveConfig', body, 'Đã lưu cấu hình quy trình.', true);
  if(!j){ const b2 = $('fl-cfg-save'); if(b2) b2.disabled = false; return; }
  S.cfg = null; await refresh();
}
async function toggleArchWorkflow(){
  const d = wfd(); if(!d) return; const w = d.workflow;
  if(!w.archived && !confirm('Lưu trữ quy trình này? Quy trình đã lưu trữ không tạo được job mới và ẩn khỏi danh sách (xem lại bằng “Hiện quy trình đã lưu trữ”).')) return;
  await act('wfSaveWorkflow', { workflow: { id: w.id, name: w.name, description: plain(w.description), category: w.category, color: w.color, archived: !w.archived } }, w.archived ? 'Đã bỏ lưu trữ quy trình.' : 'Đã lưu trữ quy trình.');
}
async function deleteWorkflow(){
  const d = wfd(); if(!d) return;
  if(!confirm('Xoá quy trình “' + d.workflow.name + '”? Chỉ xoá được khi quy trình chưa có job nào (nếu đã có job, hãy dùng Lưu trữ quy trình).')) return;
  const j = await act('wfDeleteWorkflow', { id: d.workflow.id }, 'Đã xoá quy trình.'); if(j){ delete S.cache[d.workflow.id]; back(); }
}

/* ============================================================
   THÀNH VIÊN
   ============================================================ */
function membersView(d){
  const w = d.workflow, can = w.canManage;
  if(!S.mem || S.mem.id !== w.id) S.mem = { id: w.id, list: w.members.map(m => ({ userId: m.userId, owner: !!m.owner })) };
  const list = S.mem.list.slice().sort((a, b) => (b.owner - a.owner) || uName(a.userId).localeCompare(uName(b.userId), 'vi'));
  const inList = new Set(S.mem.list.map(m => m.userId)), cand = activeUsers().filter(u => !inList.has(u.id)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  return `
  <div class="card">
    <div class="px-4 py-3 border-b border-gray-200"><div class="font-semibold text-slate-900">Thành viên (${list.length})</div>
      <div class="text-[12px] text-gray-500">Chỉ thành viên (và Giám đốc) xem được quy trình; mọi thành viên tạo được job. <b>Owner</b> cấu hình quy trình, quản lý thành viên, mở lại và lưu trữ job — owner phải là Giám đốc hoặc Trưởng phòng.</div></div>
    <div class="divide-y divide-gray-100">${list.map(m => { const u = user(m.userId), canOwn = u.role === 'director' || u.role === 'head'; return `
      <div class="flex items-center gap-3 px-4 py-2.5">${avatar(u, 'w-8 h-8 text-[11px]')}
        <div class="min-w-0 flex-1"><div class="font-medium text-slate-900 truncate">${esc(u.name)}</div><div class="text-[12px] text-gray-500 truncate">${ROLES[u.role].t}${u.dept ? ' · ' + esc(u.dept) : ''}${isActive(u) ? '' : ' · Đã khoá'}</div></div>
        <label class="flex items-center gap-1.5 text-[12.5px] ${canOwn ? 'text-slate-700' : 'text-gray-300'} whitespace-nowrap" title="${canOwn ? '' : 'Chỉ Giám đốc / Trưởng phòng làm owner được'}"><input type="checkbox" class="checkbox" ${m.owner ? 'checked' : ''} ${can && canOwn ? '' : 'disabled'} onchange="Fl.memOwner('${m.userId}',this.checked)"> Owner</label>
        ${can ? `<button class="p-1.5 text-gray-400 hover:text-red-600" title="Bỏ khỏi quy trình" onclick="Fl.memDel('${m.userId}')">${I.trash}</button>` : ''}</div>`; }).join('')}</div>
    ${can ? `<div class="px-4 py-3 border-t border-gray-200 flex items-center gap-2 flex-wrap"><select id="fl-mem-add" class="input !py-1.5 flex-1 min-w-[180px]"><option value="">— Thêm thành viên —</option>${cand.map(u => `<option value="${u.id}">${esc(u.name)} · ${ROLES[u.role].t}</option>`).join('')}</select><button class="btn btn-ghost" onclick="Fl.memAdd()">${I.plus} Thêm</button>
      <div class="flex-1"></div><button class="btn btn-ghost" onclick="Fl.memReset()">Hoàn tác</button><button class="btn btn-primary" onclick="Fl.memSave()">${I.check} Lưu thành viên</button></div>` : ''}
  </div>`;
}
function memAdd(){ const el = $('fl-mem-add'); if(!el || !el.value) return; S.mem.list.push({ userId: el.value, owner: false }); repaint(); }
function memDel(id){ S.mem.list = S.mem.list.filter(m => m.userId !== id); repaint(); }
function memOwner(id, v){ const m = S.mem.list.find(x => x.userId === id); if(m){ m.owner = !!v; } }
function memReset(){ S.mem = null; repaint(); }
async function memSave(){
  const d = wfd(); if(!d || !S.mem) return;
  const j = await act('wfSetMembers', { workflowId: d.workflow.id, members: S.mem.list }, '', true);
  if(!j) return;
  const kept = j.result && j.result.kept || [];
  S.mem = null; await refresh();
  toast(kept.length ? 'Đã lưu thành viên. Giữ lại ' + kept.join(', ') + ' vì họ còn job đang làm.' : 'Đã lưu thành viên.', kept.length ? 'info' : 'success');
}

/* ============================================================
   BÁO CÁO · HOẠT ĐỘNG
   ============================================================ */
const hoursText = h => h === null || h === undefined ? '—' : h < 1 ? Math.round(h * 60) + ' phút' : h < 48 ? (Math.round(h * 10) / 10) + ' giờ' : (Math.round(h / 2.4) / 10) + ' ngày';
const pct = v => v === null || v === undefined ? '—' : Math.round(v * 100) + '%';
function reportView(d){
  const r = S.report;
  const range = `<div class="flex items-center gap-2 mb-3 flex-wrap"><span class="text-[12.5px] text-gray-500">Job tạo từ</span><input type="date" class="input !py-1.5 !w-auto" value="${esc(S.repRange.from)}" onchange="Fl.setRange('from',this.value)"><span class="text-[12.5px] text-gray-500">đến</span><input type="date" class="input !py-1.5 !w-auto" value="${esc(S.repRange.to)}" onchange="Fl.setRange('to',this.value)">
    ${S.repRange.from || S.repRange.to ? `<button class="btn btn-ghost btn-sm" onclick="Fl.clearRange()">Bỏ lọc</button>` : '<span class="text-[12px] text-gray-400">(để trống = tất cả)</span>'}<div class="flex-1"></div><button class="btn btn-ghost btn-sm" onclick="Fl.exportReport()" ${r && !r.error && r.id === d.workflow.id ? '' : 'disabled'}>${FI.down} Xuất Excel</button></div>`;
  if(!r || r.id !== d.workflow.id) return range + loadingCard('Đang tính báo cáo...');
  if(r.error) return range + `<div class="card p-6 text-center text-red-600">${esc(r.error)}</div>`;
  const t = r.totals, tile = (label, val, tone) => `<div class="card p-3.5"><div class="text-[12px] text-gray-500">${label}</div><div class="text-[22px] font-semibold ${tone || 'text-slate-900'} leading-tight mt-0.5">${val}</div></div>`;
  const maxFail = Math.max(1, ...r.failReasons.map(x => x.count));
  return range + `
  <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
    ${tile('Tổng job', t.total)}${tile('Đang làm', t.open, 'text-blue-700')}${tile('Quá hạn', t.overdue, t.overdue ? 'text-red-600' : 'text-gray-400')}${tile('Hoàn thành', t.done, 'text-green-700')}${tile('Thất bại', t.failed, t.failed ? 'text-red-600' : 'text-gray-400')}${tile('Tỉ lệ thành công', pct(t.doneRate))}
  </div>
  <div class="text-[12.5px] text-gray-500 mb-3">Thời gian trung bình từ lúc tạo đến Hoàn thành: <b class="text-slate-800">${hoursText(t.avgCycleHours)}</b>. “Tỉ lệ thành công” = Hoàn thành / (Hoàn thành + Thất bại).</div>
  <div class="card mb-4 overflow-x-auto"><div class="px-4 py-3 border-b border-gray-200 font-semibold text-slate-900">Theo giai đoạn</div>
    <table class="w-full text-[13px]"><thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr><th class="text-left font-medium py-2 px-4">Giai đoạn</th><th class="text-right font-medium py-2 px-2">SLA</th><th class="text-right font-medium py-2 px-2">Đang ở đây</th><th class="text-right font-medium py-2 px-2">Quá hạn</th><th class="text-right font-medium py-2 px-2">Đã qua</th><th class="text-right font-medium py-2 px-2">TB thời gian</th><th class="text-right font-medium py-2 px-4">Đúng SLA</th></tr></thead>
    <tbody class="divide-y divide-gray-100">${r.byStage.map(s => `<tr><td class="py-2 px-4 font-medium text-slate-800">${esc(s.name)}</td><td class="py-2 px-2 text-right text-gray-500">${s.slaHours ? s.slaHours + ' giờ' : '—'}</td><td class="py-2 px-2 text-right">${s.open}</td><td class="py-2 px-2 text-right ${s.overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}">${s.overdue}</td><td class="py-2 px-2 text-right">${s.passed}</td><td class="py-2 px-2 text-right">${hoursText(s.avgHours)}</td><td class="py-2 px-4 text-right">${pct(s.slaMetRate)}</td></tr>`).join('')}</tbody></table></div>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="card overflow-x-auto"><div class="px-4 py-3 border-b border-gray-200 font-semibold text-slate-900">Theo người thực hiện</div>
      <table class="w-full text-[13px]"><thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr><th class="text-left font-medium py-2 px-4">Người</th><th class="text-right font-medium py-2 px-2">Đang làm</th><th class="text-right font-medium py-2 px-2">Quá hạn</th><th class="text-right font-medium py-2 px-2">Xong</th><th class="text-right font-medium py-2 px-4">Thất bại</th></tr></thead>
      <tbody class="divide-y divide-gray-100">${r.byAssignee.map(a => `<tr><td class="py-2 px-4"><span class="inline-flex items-center gap-2">${avatar(user(a.userId), 'w-6 h-6 text-[10px]')}${esc(uName(a.userId))}</span></td><td class="py-2 px-2 text-right">${a.open}</td><td class="py-2 px-2 text-right ${a.overdue ? 'text-red-600 font-semibold' : 'text-gray-400'}">${a.overdue}</td><td class="py-2 px-2 text-right text-green-700">${a.done}</td><td class="py-2 px-4 text-right">${a.failed}</td></tr>`).join('') || '<tr><td colspan="5" class="py-6 text-center text-gray-400">Chưa có dữ liệu.</td></tr>'}</tbody></table></div>
    <div class="card"><div class="px-4 py-3 border-b border-gray-200 font-semibold text-slate-900">Lý do thất bại</div>
      <div class="p-4 space-y-2.5">${r.failReasons.map(x => `<div><div class="flex justify-between text-[13px]"><span class="text-slate-700">${esc(x.reason)}</span><span class="font-medium">${x.count}</span></div><div class="h-2 rounded-full bg-gray-100 mt-1"><div class="h-2 rounded-full bg-red-400" style="width:${Math.round(x.count / maxFail * 100)}%"></div></div></div>`).join('') || '<div class="text-center text-gray-400 text-[13px] py-4">Chưa có job thất bại.</div>'}</div></div>
  </div>`;
}
function setRange(k, v){ S.repRange[k] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; S.report = null; loadReport(S.wfId); repaint(); }
function clearRange(){ S.repRange = { from: '', to: '' }; S.report = null; loadReport(S.wfId); repaint(); }
function exportReport(){
  const r = S.report, d = wfd(); if(!r || !d || r.error) return;
  const t = r.totals;
  download(d.workflow.name + ' - báo cáo', [
    { name: 'Tổng quan', rows: [['Chỉ số', 'Giá trị'], ['Khoảng thời gian (ngày tạo job)', (r.from || '…') + ' → ' + (r.to || '…')], ['Tổng job', t.total], ['Đang làm', t.open], ['Quá hạn', t.overdue], ['Hoàn thành', t.done], ['Thất bại', t.failed], ['Tỉ lệ thành công', pct(t.doneRate)], ['Thời gian TB đến Hoàn thành', hoursText(t.avgCycleHours)]] },
    { name: 'Theo giai đoạn', rows: [['Giai đoạn', 'SLA (giờ)', 'Đang ở đây', 'Quá hạn', 'Đã qua', 'TB thời gian', 'Đúng SLA']].concat(r.byStage.map(s => [s.name, s.slaHours || '', s.open, s.overdue, s.passed, hoursText(s.avgHours), pct(s.slaMetRate)])) },
    { name: 'Theo người', rows: [['Người', 'Đang làm', 'Quá hạn', 'Hoàn thành', 'Thất bại']].concat(r.byAssignee.map(a => [uName(a.userId), a.open, a.overdue, a.done, a.failed])) },
    { name: 'Lý do thất bại', rows: [['Lý do', 'Số job']].concat(r.failReasons.map(x => [x.reason, x.count])) },
  ]);
}
function activityView(d){
  const a = S.activity;
  if(!a || a.id !== d.workflow.id) return loadingCard('Đang tải nhật ký...');
  if(a.error) return `<div class="card p-6 text-center text-red-600">${esc(a.error)}</div>`;
  return `<div class="text-[12.5px] text-gray-500 mb-3">200 hoạt động gần nhất của quy trình.</div>
    <div class="card divide-y divide-gray-100">${a.items.map(x => `
      <div class="flex items-start gap-3 px-4 py-2.5 ${x.jobId ? 'cursor-pointer hover:bg-gray-50' : ''}" ${x.jobId ? `onclick="Fl.openJob('${x.jobId}')"` : ''}>
        ${avatar(user(x.actorId), 'w-7 h-7 text-[10px]')}
        <div class="min-w-0 flex-1 text-[13px]"><b class="text-slate-900">${esc(uName(x.actorId))}</b> <span class="text-slate-600">${actText(x)}</span>${x.jobTitle ? ` <span class="text-base-600">· ${esc(clip(x.jobTitle, 70))}</span>` : ''}<div class="text-[11.5px] text-gray-400">${fmtDT(x.createdAt)}</div></div>
      </div>`).join('') || '<div class="p-10 text-center text-gray-400">Chưa có hoạt động nào.</div>'}</div>`;
}

/* ============================================================
   TODO Ở MỤC "VIỆC CỦA TÔI" (module Công việc dùng các hàm này)
   ============================================================ */
/** Thẻ todo trong Kanban "Việc của tôi": cột todo (chưa xong) hoặc done (đã xong). */
function todoCards(col){
  return myTodos().filter(t => col === 'done' ? t.done : !t.done).map(t => `
    <div class="bg-white rounded-lg border border-indigo-200 p-3 shadow-sm hover:shadow-md cursor-pointer ${t.done ? 'opacity-75' : ''}" onclick="Fl.openJob('${t.jobId}')">
      <div class="flex items-start gap-2.5"><input type="checkbox" class="checkbox mt-0.5" ${t.done ? 'checked' : ''} onclick="event.stopPropagation()" onchange="Fl.tickTodo('${t.id}',this.checked)">
        <div class="min-w-0 flex-1"><div class="font-medium leading-snug ${t.done ? 'line-through text-gray-500' : 'text-slate-900'}">${esc(t.title)}</div>
          <div class="mt-1.5 text-[12px] text-indigo-700">${flowLabel(t)}</div>${t.required ? '<div class="text-[11px] text-red-500 mt-0.5">Todo bắt buộc</div>' : ''}</div></div>
    </div>`).join('');
}
/** Dòng todo trong bảng "Việc của tôi" dạng danh sách (tab: open / done / all). */
function todoRows(tab, q, multi){
  q = (q || '').trim().toLowerCase();
  return myTodos().filter(t => (tab === 'all' || (tab === 'open' ? !t.done : t.done)) && (!q || t.title.toLowerCase().includes(q) || (t.jobTitle || '').toLowerCase().includes(q))).map(t => `
    <tr class="hover:bg-gray-50 cursor-pointer ${t.done ? 'opacity-70' : ''}" onclick="Fl.openJob('${t.jobId}')">
      <td class="mc-title py-3 px-3 max-w-md"><div class="flex items-start gap-2.5"><input type="checkbox" class="checkbox mt-0.5" ${t.done ? 'checked' : ''} onclick="event.stopPropagation()" onchange="Fl.tickTodo('${t.id}',this.checked)"><div class="min-w-0"><div class="font-medium ${t.done ? 'line-through text-gray-400' : 'text-slate-900'}">${esc(t.title)}</div><div class="mt-1 text-[12px] text-indigo-700">${flowLabel(t)}</div></div></div></td>
      ${multi ? '<td class="py-3 px-2 text-[12.5px] text-gray-400">Quy trình</td>' : ''}<td class="py-3 px-2"></td><td class="py-3 px-2"></td><td class="py-3 px-2"></td>
      <td class="mc-st py-3 px-2">${t.done ? '<span class="badge bg-green-50 text-green-700 border-green-200">Hoàn thành</span>' : '<span class="badge bg-slate-100 text-slate-700 border-slate-200">Chưa thực hiện</span>'}</td><td class="mc-act"></td>
    </tr>`).join('');
}
const todoCount = tab => myTodos().filter(t => tab === 'all' || (tab === 'open' ? !t.done : t.done)).length;

window.Fl = {
  view, active, repaint, reset, poll, dragging, retry, retryWf, setTab, setMineTab, toggleArchWf, pin, openWf, back, setWfTab, gotoJob, openJob, setQ, setF, moreClosed, moreList, sortBy,
  dragStart, dragEnd, colOver, colLeave, drop, openMove, doMove, openClose, doClose, subClose, unarchive, archiveJob, exportXlsx, exportReport,
  openJobForm, formCancel, saveJob, pendFiles, pendDel, addTodo, tickTodo, tickTodoD, delTodo, pickFiles, delFile, openFollowers, saveFollowers, reopenJob, deleteJob, forward,
  cmInput, cmPick, cmKey, postComment, delComment, filterPick,
  openWorkflowForm, saveWorkflow, cfgSet, cfgFieldType, cfgTodo, cfgReason, cfgRule, cfgMove, cfgDel, cfgAdd, cfgAddTodo, cfgDelTodo, cfgPickAsg, cfgAsgOk, cfgReset, cfgSave, toggleArchWorkflow, deleteWorkflow,
  memAdd, memDel, memOwner, memReset, memSave, setRange, clearRange,
  reload: () => { S.ver = {}; return refresh(); }, ensureTodos, pollTodos, todoCards, todoRows, todoCount, myTodos,
  _test: { S, slaOver, dueOver, isOver, filtered, canMoveJob, fieldText, actText, dur },
};
})();

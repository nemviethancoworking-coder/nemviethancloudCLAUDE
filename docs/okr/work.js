/* ============================================================
   MODULE QUẢN LÝ CÔNG VIỆC (kiểu Base WeWork) — chạy trong app OKR Weekly
   Công ty → Workspace → Phòng ban → Dự án → Công việc
   - Hiển thị Kanban (kéo thả) / Danh sách (sắp xếp, lọc) / Tổng quan (thống kê)
   - Công việc: nhiều người làm, người theo dõi (chỉ xem + bình luận), ưu tiên, hạn, nhãn, việc con, lặp lại, bình luận @nhắc tên (in đậm / nghiêng / màu), tệp đính kèm
   - Quyền XEM (máy chủ lọc): Giám đốc + Trưởng phòng xem tất cả · Quản lý xem việc của mình + việc có cấp dưới tạo/nhận · Nhân viên chỉ xem việc mình tạo / được giao / theo dõi
   - Quyền SỬA việc: Giám đốc, Trưởng phòng, người tạo, người thực hiện, Quản lý có cấp dưới là người tạo/thực hiện. Người theo dõi chỉ xem và bình luận.
   - Quản lý dự án chỉ chỉnh được cài đặt dự án, không có đặc quyền sửa việc của người khác.
   Dùng chung đăng nhập, API và hàm tiện ích của index.html; mọi quyền được máy chủ kiểm tra lại.
   Toàn bộ nằm trong 1 IIFE và chỉ lộ ra đối tượng W (không đụng biến toàn cục của index.html).
   ============================================================ */
(function(){
'use strict';

/* ---------- Hằng số hiển thị ---------- */
const STATUS = {
  todo:   { t:'Chưa thực hiện', dot:'#94a3b8', c:'bg-slate-100 text-slate-700 border-slate-200' },
  doing:  { t:'Đang làm',   dot:'#2f6fed', c:'bg-blue-50 text-blue-700 border-blue-200' },
  review: { t:'Chờ duyệt',  dot:'#d97706', c:'bg-amber-50 text-amber-700 border-amber-200' },
  done:   { t:'Hoàn thành', dot:'#16a34a', c:'bg-green-50 text-green-700 border-green-200' },
};
const STATUS_KEYS = ['todo', 'doing', 'review', 'done'];
const PRIO = {
  low:    { t:'Thấp',       c:'bg-slate-100 text-slate-600 border-slate-200', w:1, bar:'#94a3b8' },
  medium: { t:'Trung bình', c:'bg-blue-50 text-blue-700 border-blue-200',     w:2, bar:'#2f6fed' },
  high:   { t:'Cao',        c:'bg-amber-50 text-amber-700 border-amber-200',  w:3, bar:'#d97706' },
  urgent: { t:'Khẩn cấp',   c:'bg-red-50 text-red-700 border-red-200',        w:4, bar:'#dc2626' },
};
const COLORS = ['#2f6fed', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#dc2626', '#4f46e5', '#0d9488'];
const WD = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const OK_EXT = ['jpg','jpeg','png','gif','webp','bmp','heic','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','rtf','odt','ods','zip'];
const MAX_MB = 10;
const DONE_SHOW = 30;           // số thẻ "Hoàn thành" hiện sẵn trong Kanban

/* ---------- Biểu tượng riêng của module ---------- */
const FINE = !!(window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches);
const svg = (p, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const WI = {
  kanban: svg('<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="4" height="8" rx="1"/>'),
  list:   svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  chart:  svg('<path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/>'),
  clip:   svg('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', 14),
  repeat: svg('<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>', 14),
  clock:  svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 13),
  cal:    svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 13),
  check:  svg('<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', 13),
  folder: svg('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>', 14),
  eye:    svg('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', 13),
  lock:   svg('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', 13),
  down:   svg('<path d="M12 5v14M5 12l7 7 7-7"/>', 14),
};

/* ---------- Trạng thái ---------- */
const S = {
  data: null, loading: false, error: null, version: null, wsLoaded: null,
  ws: lsGet('okr_work_ws') || '', mode: ['kanban', 'list', 'dash', 'mine', 'created', 'rec'].includes(lsGet('okr_work_mode')) ? lsGet('okr_work_mode') : 'kanban', tabs: { created: 'open', mine: 'open' }, mineView: lsGet('okr_work_mine_view') === 'list' ? 'list' : 'kanban', project: 'all', showArch: false,
  f: { q: '', who: 'all', pri: 'all', st: 'all', fol: false },
  rf: { who: 'all', pri: 'all', type: 'all' },              // bộ lọc riêng của mục Việc lặp lại: người thực hiện, ưu tiên, kiểu lịch lặp
  tm: { p: 'all', by: 'span', from: '', to: '' },          // khung thời gian: mốc có sẵn (p), tính theo gì (by), khoảng tuỳ chỉnh
  sort: { k: 'due', d: 1 }, doneLimit: DONE_SHOW, listLimit: 200,
  drag: null, over: null, draft: null, detail: null, mention: new Set(), uploading: 0,
};
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

/* ---------- Tiện ích ---------- */
const $ = id => document.getElementById(id);
const today = () => toISO(new Date());
const newId = p => p + uid() + Math.random().toString(36).slice(2, 6);
const isOpen = t => t.status !== 'done';
const overdue = t => isOpen(t) && t.due && t.due < today();
const plural = (n, s) => `${n} ${s}`;
const projById = id => (S.data ? S.data.projects : []).find(p => p.id === id);
const deptById = id => (S.data ? S.data.departments : []).find(d => d.id === id);
const activeUsers = () => DB.users.filter(isActive);
const meId = () => session();

/** Quyền ở giao diện (máy chủ vẫn kiểm tra lại).
 *  - canEdit: làm việc trên bảng (đổi trạng thái, tick việc con, giao lại, tệp): Giám đốc, Trưởng phòng, người tạo, người thực hiện,
 *    Quản lý có người thực hiện / người tạo là cấp dưới. Người THEO DÕI không có canEdit (chỉ xem + bình luận).
 *  - canEditContent: sửa tên, mô tả, nội dung — CHỈ người tạo (và không phải việc sinh từ lịch lặp lại), ở mục "Việc tôi tạo".
 *  - canDelete: Giám đốc, người giao (người tạo) và cấp trên của người đó; việc cũ không có người tạo thì cấp trên của người nhận.
 *  - assignable: giao việc không bị giới hạn bởi phân quyền — ai đang hoạt động cũng chọn được. */
const isHead = () => !!me() && me().role === 'head';
const fids = t => (t && t.followerIds) || [];
function canEdit(t){
  if(isDir() || isHead()) return true;
  return t.createdBy === meId() || t.assigneeIds.includes(meId()) || t.assigneeIds.some(a => canManage(a)) || (!!t.createdBy && canManage(t.createdBy));
}
const isFollower = t => fids(t).includes(meId());
const followerOnly = t => isFollower(t) && !canEdit(t);
/** Nút "Sửa người theo dõi": ưu tiên cờ canFollow do máy chủ trả về khi mở chi tiết; trước khi tải xong thì tạm tính. */
const canFollowUI = t => S.detail ? !!S.detail.canFollow : (isDir() || t.createdBy === meId() || t.assigneeIds.includes(meId()));
const canEditContent = t => !t.seriesId && !!t.createdBy && t.createdBy === meId();
function canDelete(t){
  if(isDir()) return true;
  if(t.createdBy) return t.createdBy === meId() || canManage(t.createdBy);
  return t.assigneeIds.some(a => canManage(a));
}
const canCreateProject = () => isMgr();
const canEditProject = p => isDir() || p.managerId === meId();
const assignable = () => activeUsers();
function creatableProjects(){ return (S.data ? S.data.projects : []).filter(p => !p.archived); }

/* ---------- Gọi máy chủ ---------- */
async function wfetch(url, opts){
  const res = await fetch(url, opts), txt = await res.text();
  let j; try { j = JSON.parse(txt); } catch(e){ throw new Error('Không kết nối được máy chủ dữ liệu, vui lòng thử lại.'); }
  if(!j.ok){ const e = new Error(j.error || 'Lỗi máy chủ'); e.auth = !!j.auth; throw e; }
  return j;
}
const enc = encodeURIComponent;
const qurl = q => apiUrl() + (apiUrl().includes('?') ? '&' : '?') + q;
/** Dấu nội dung của dữ liệu Công việc, bỏ `loadedAt` (đổi mỗi lần tải) để so sánh có thay đổi thật hay không. */
const sigOf = d => JSON.stringify(d, (k, v) => k === 'loadedAt' ? undefined : v);
/** Tải dữ liệu Công việc. Trả về true nếu nội dung thật sự đổi.
 *  opts.poll: lần tải tự động — không vẽ lại nếu nội dung giống hệt (máy chủ chỉ đổi phiên bản vì người khác sửa phần khác).
 *  opts.noPaint: chỉ tải, để người gọi tự vẽ lại một lần. */
async function load(silent, opts){
  opts = opts || {};
  if(!online() || !session()) return false;
  if(S.loading) return false;
  S.loading = true; if(!silent){ S.error = null; }
  let changed = false;
  try {
    const sameWs = S.wsLoaded === S.ws && S.data;
    const j = await wfetch(qurl('work=1&ws=' + enc(S.ws) + '&t=' + Date.now() + '&token=' + enc(token()) + (sameWs && S.version ? '&v=' + enc(S.version) : '')));
    if(!j.unchanged){
      const prev = opts.poll && sameWs ? sigOf(S.data) : null;
      S.data = j.work; S.version = j.version; S.wsLoaded = S.ws;
      if(S.data.currentId && S.data.currentId !== S.ws){ S.ws = S.data.currentId; S.wsLoaded = S.ws; lsSet('okr_work_ws', S.ws); }
      if(S.project !== 'all' && !projById(S.project)) S.project = 'all';
      S.error = null;
      changed = prev === null || prev !== sigOf(S.data);
      if(changed && !opts.noPaint) repaintIfActive(true);
    } else if(S.error){ S.error = null; changed = true; if(!opts.noPaint) repaintIfActive(true); }
  } catch(e){
    if(e.auth){ S.loading = false; forceLogout(e.message); return false; }
    S.error = e.message; if(!silent) toast(e.message, 'error'); if(!opts.noPaint) repaintIfActive(true); changed = true;
  } finally { S.loading = false; }
  return changed;
}
const active = () => typeof state !== 'undefined' && state.view === 'tasks' && !!session();
function repaintIfActive(quiet){ if(active()) repaint(quiet); }
/** Vẽ lại màn hình nhưng giữ vị trí cuộn (trang và bảng Kanban). quiet: tắt hiệu ứng mờ-hiện để lần làm mới ngầm không nháy. */
function repaint(quiet){
  const c = $('content'), b = $('kb-board');
  const top = c ? c.scrollTop : 0, left = b ? b.scrollLeft : 0, colTops = [...document.querySelectorAll('[data-col]')].map(e => e.scrollTop);
  render();
  const c2 = $('content'), b2 = $('kb-board');
  if(c2) c2.scrollTop = top; if(b2) b2.scrollLeft = left;
  document.querySelectorAll('[data-col]').forEach((e, i) => { if(colTops[i]) e.scrollTop = colTops[i]; });
  if(quiet && typeof killFade === 'function') killFade();
}
/** Mở chi tiết 1 việc từ hộp thông báo: sang màn Công việc (đúng workspace), tải dữ liệu mới rồi mở chi tiết. */
async function gotoTask(id, ws){
  if(ws && S.ws !== ws){ S.ws = ws; lsSet('okr_work_ws', ws); S.project = 'all'; }
  S.version = null;
  state.view = 'tasks'; render();
  for(let i = 0; i < 40 && S.loading; i++) await new Promise(r => setTimeout(r, 100));
  await load(true);
  if(S.data && S.data.tasks.some(x => x.id === id)) openDetail(id);
  else toast('Không mở được công việc này. Có thể việc đã bị xoá hoặc bạn không còn quyền xem.', 'error');
}
/** Gửi 1 hành động ghi, rồi tải lại dữ liệu. Trả về kết quả máy chủ hoặc null nếu lỗi (đã báo lỗi). */
async function act(action, payload, okMsg){
  try {
    const j = await wfetch(apiUrl(), { method:'POST', body: JSON.stringify({ action, payload, token: token(), lite: true }) });
    S.version = null;
    if(okMsg) toast(okMsg);
    await load(true);
    return j;
  } catch(e){
    if(e.auth){ forceLogout(e.message); return null; }
    toast(e.message, 'error'); S.version = null; await load(true); return null;
  }
}
function reset(){ S.data = null; S.version = null; S.wsLoaded = null; S.error = null; S.project = 'all'; S.detail = null; S.draft = null; }
/** Làm mới ngầm cho bộ hẹn giờ chung ở index.html: tải dữ liệu Công việc (nếu đang ở màn này), không vẽ lại; trả về true nếu có thay đổi thật. */
const poll = () => active() ? load(true, { poll: true, noPaint: true }) : Promise.resolve(false);
const dragging = () => !!S.drag;

/* ---------- Lọc & sắp xếp ---------- */
/* Khung thời gian: Hôm nay · Tuần này (T2–CN) · Tháng này/trước · Quý này/trước (quý dương lịch) · Năm này · Tuỳ chỉnh.
   Việc thuộc khung khi mốc đã chọn rơi vào khoảng đó:
   - span (mặc định): khoảng [Ngày bắt đầu, Hạn chót] giao với khung; thiếu một đầu thì lấy đầu còn lại; không có ngày nào thì lấy ngày tạo.
   - due / start: đúng Hạn chót / Ngày bắt đầu (việc không có ngày đó bị loại).
   - done: ngày bấm Hoàn thành (chỉ việc đã hoàn thành). */
const TM_PRESETS = [['all', 'Tất cả'], ['today', 'Hôm nay'], ['week', 'Tuần này'], ['month', 'Tháng này'], ['lmonth', 'Tháng trước'], ['quarter', 'Quý này'], ['lquarter', 'Quý trước'], ['year', 'Năm này'], ['custom', 'Tùy chỉnh']];
const TM_BY = [['span', 'Thời gian thực hiện'], ['due', 'Hạn chót'], ['start', 'Ngày bắt đầu'], ['done', 'Ngày hoàn thành']];
/** Khoảng [từ, đến] (yyyy-mm-dd, gồm cả hai đầu) của khung đang chọn; null = không lọc. */
function tmRange(now = new Date(), tm = S.tm){
  const p = tm.p; if(p === 'all') return null;
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate(), q = Math.floor(m / 3) * 3;
  const iso = (yy, mm, dd) => toISO(new Date(yy, mm, dd));
  switch(p){
    case 'today':    return [iso(y, m, d), iso(y, m, d)];
    case 'week':     { const wd = now.getDay() || 7; return [iso(y, m, d - wd + 1), iso(y, m, d - wd + 7)]; }
    case 'month':    return [iso(y, m, 1), iso(y, m + 1, 0)];
    case 'lmonth':   return [iso(y, m - 1, 1), iso(y, m, 0)];
    case 'quarter':  return [iso(y, q, 1), iso(y, q + 3, 0)];
    case 'lquarter': return [iso(y, q - 3, 1), iso(y, q, 0)];
    case 'year':     return [iso(y, 0, 1), iso(y, 11, 31)];
    case 'custom':   { let a = tm.from, b = tm.to; if(!a && !b) return null; if(a && b && a > b) [a, b] = [b, a]; return [a || '0000-01-01', b || '9999-12-31']; }
  }
  return null;
}
const localDay = s => { if(!s) return ''; const d = new Date(s); return isNaN(d) ? '' : toISO(d); };
function inRange(t, r, by = S.tm.by){
  const [a, b] = r, s = t.startDate || '', e = t.due || '';
  if(by === 'done'){ const c = t.status === 'done' ? localDay(t.completedAt) : ''; return !!c && c >= a && c <= b; }
  let from, to;
  if(by === 'due'){ if(!e) return false; from = to = e; }
  else if(by === 'start'){ if(!s) return false; from = to = s; }
  else { from = s || e; to = e || s; if(!from) from = to = localDay(t.createdAt); if(!from) return false; if(from > to) [from, to] = [to, from]; }
  return from <= b && to >= a;
}
function scopeTasks(opts = {}){           // theo dự án đang chọn + khung thời gian (chưa áp bộ lọc tìm kiếm). opts.time === false: bỏ qua khung thời gian
  if(!S.data) return [];
  const ps = new Set(S.data.projects.filter(p => !p.archived || S.project === p.id).map(p => p.id));
  const r = opts.time === false ? null : tmRange();
  return S.data.tasks.filter(t => (S.project === 'all' ? ps.has(t.projectId) : t.projectId === S.project) && (!r || inRange(t, r)));
}
function timebar(){
  if(S.mode === 'rec') return '';
  const t = S.tm, r = tmRange();
  const chip = ([k, l]) => `<span class="chip ${t.p === k ? 'active' : ''}" onclick="W.setTm('${k}')">${l}</span>`;
  const edge = (s, none) => s === none ? '…' : fmt(s);
  const rangeTxt = r ? (r[0] === r[1] ? fmt(r[0]) : `${edge(r[0], '0000-01-01')} – ${edge(r[1], '9999-12-31')}`) : '';
  return `<div class="tm-bar flex items-center gap-2 mb-3 flex-wrap">
    <span class="text-[12.5px] text-gray-500 inline-flex items-center gap-1">${WI.cal} Thời gian:</span>
    ${TM_PRESETS.map(chip).join('')}
    ${t.p === 'custom' ? `<input type="date" class="input !w-auto !py-1" title="Từ ngày" value="${esc(t.from)}" ${t.to ? 'max="' + esc(t.to) + '"' : ''} onchange="W.setTmDate('from',this.value)"><span class="text-gray-400">→</span><input type="date" class="input !w-auto !py-1" title="Đến ngày" value="${esc(t.to)}" ${t.from ? 'min="' + esc(t.from) + '"' : ''} onchange="W.setTmDate('to',this.value)">` : ''}
    ${r ? `<span class="w-px h-5 bg-gray-200 mx-1"></span><span class="text-[12.5px] text-gray-500">Tính theo</span><select class="input !w-auto !py-1 text-[13px]" onchange="W.setTmBy(this.value)">${TM_BY.map(([k, l]) => `<option value="${k}" ${t.by === k ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="text-[12.5px] font-medium text-slate-700">${rangeTxt}</span>`
      : t.p === 'custom' ? '<span class="text-[12.5px] text-gray-400">Chọn ngày bắt đầu và/hoặc kết thúc để lọc.</span>' : ''}
  </div>`;
}
function filtered(opts = {}){
  const q = S.f.q.trim().toLowerCase();
  return scopeTasks().filter(t => {
    if(S.f.fol && !isFollower(t)) return false;
    if(S.f.who !== 'all' && !t.assigneeIds.includes(S.f.who)) return false;
    if(S.f.pri !== 'all' && t.priority !== S.f.pri) return false;
    if(!opts.kanban && S.f.st !== 'all'){ if(S.f.st === 'overdue' ? !overdue(t) : t.status !== S.f.st) return false; }
    if(q && !(t.title.toLowerCase().includes(q) || t.tags.some(g => g.toLowerCase().includes(q)) || richPlain(t.description).toLowerCase().includes(q))) return false;
    return true;
  });
}

/* ---------- Thành phần giao diện nhỏ ---------- */
const stack = (ids, max = 3) => {
  if(!ids.length) return '<span class="text-[12px] text-gray-400">Chưa giao</span>';
  return `<div class="flex -space-x-1.5" title="${esc(ids.map(i => user(i).name).join(', '))}">${ids.slice(0, max).map(i => avatar(user(i), 'w-6 h-6 text-[10px] ring-2 ring-white')).join('')}${ids.length > max ? `<div class="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">+${ids.length - max}</div>` : ''}</div>`;
};
const prioBadge = p => badge(PRIO[p].t, PRIO[p].c);
const statusBadge = s => badge(STATUS[s].t, STATUS[s].c);
function dueHtml(t){
  if(!t.due) return '<span class="text-gray-400">—</span>';
  const od = overdue(t), td = t.due === today() && isOpen(t);
  return `<span class="inline-flex items-center gap-1 whitespace-nowrap ${od ? 'text-red-600 font-medium' : td ? 'text-amber-600 font-medium' : 'text-gray-600'}">${WI.cal}${fmt(t.due)}${od ? ' · Quá hạn' : td ? ' · Hôm nay' : ''}</span>`;
}
const subProg = t => { const n = t.subtasks.length; if(!n) return ''; const d = t.subtasks.filter(s => s.done).length; return `<span class="inline-flex items-center gap-1 text-[12px] ${d === n ? 'text-green-600' : 'text-gray-500'}" title="Việc con">${WI.check}${d}/${n}</span>`; };
/** Biểu tượng mắt + số người theo dõi (tooltip liệt kê tên); không hiện nếu chưa có ai. */
function folBadge(t){
  const f = fids(t); if(!f.length) return '';
  return `<span class="inline-flex items-center gap-1 text-[12px] text-gray-500" title="Người theo dõi: ${esc(f.map(i => user(i).name).join(', '))}">${WI.eye}${f.length}</span>`;
}
/* v10: việc sinh từ báo cáo tuần ghi rõ thuộc KR nào (lấy tên mới nhất từ OKR; việc cũ/việc không từ OKR hoặc KR đã bị xoá thì không có nhãn) */
function krRef(t){
  if(!t || !t.krId) return null;
  const o = (DB.okrs || []).find(o => o.id === t.okrId), k = o && o.krs.find(k => k.id === t.krId);
  return k ? { k, o } : null;
}
const krChip = t => { const r = krRef(t); return r ? `<span class="inline-flex items-center gap-1 max-w-full px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-medium" title="Mục tiêu: ${esc(r.o.title)}"><span class="shrink-0">KR</span><span class="truncate">${esc(r.k.title)}</span></span>` : ''; };
const tagChips = tags => tags.map(g => `<span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[11px] font-medium">${esc(g)}</span>`).join('');
/** Số giờ hoàn thành dự kiến: 2 → "2 giờ", 1.5 → "1,5 giờ". */
const hoursText = h => (Number(h) % 1 ? String(Number(h)).replace('.', ',') : String(Number(h))) + ' giờ';
const hoursChip = t => t.estHours ? `<span class="inline-flex items-center gap-1 whitespace-nowrap" title="Thời gian hoàn thành dự kiến">${WI.clock}${hoursText(t.estHours)}</span>` : '';
const projDot = p => p ? `<span class="inline-block w-2 h-2 rounded-full shrink-0" style="background:${esc(p.color)}"></span>` : '';
function recText(r){
  if(!r) return '';
  if(r.type === 'daily') return r.interval > 1 ? `Mỗi ${r.interval} ngày` : 'Hằng ngày';
  if(r.type === 'weekly') return 'Hằng tuần: ' + r.weekdays.map(d => WD[d]).join(', ');
  if(r.type === 'monthly') return `Hằng tháng: ngày ${r.monthDay}`;
  return '';
}

/* ---------- Công việc lặp lại: tính hạn kế tiếp để xem trước (giống máy chủ) ---------- */
const iso = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
const pIso = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dayAdd = (d, n) => new Date(d.getTime() + n * 864e5);
function nextAfter(r, d){
  if(r.type === 'daily') return dayAdd(d, r.interval || 1);
  if(r.type === 'weekly'){ for(let i = 1; i <= 7; i++){ const n = dayAdd(d, i); if(r.weekdays.includes(n.getUTCDay() || 7)) return n; } }
  if(r.type === 'monthly'){
    let y = d.getUTCFullYear(), m = d.getUTCMonth();
    for(let i = 0; i < 25; i++){ const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(), c = new Date(Date.UTC(y, m, Math.min(r.monthDay, dim))); if(c > d) return c; if(++m > 11){ m = 0; y++; } }
  }
  return null;
}
function nextDueOf(r, due){
  if(!r) return null;
  if(r.type === 'weekly' && !r.weekdays.length) return null;
  let n = nextAfter(r, due ? pIso(due) : pIso(today())), g = 0;
  while(n && iso(n) < today() && g++ < 2000) n = nextAfter(r, n);
  if(!n) return null; const out = iso(n);
  return r.end && out > r.end ? null : out;
}

/* ============================================================
   MÀN HÌNH CHÍNH
   ============================================================ */
function view(){
  if(!online()) return `<div class="card p-10 text-center text-gray-500">Module công việc cần kết nối máy chủ dữ liệu.</div>`;
  if(!S.data){
    if(!S.loading && !S.error) load();
    return S.error
      ? `<div class="card p-10 text-center"><div class="text-red-600 mb-3">${esc(S.error)}</div><button class="btn btn-primary" onclick="W.retry()">${I.refresh} Thử lại</button></div>`
      : `<div class="card p-10 text-center text-gray-500 flex items-center justify-center gap-3"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>Đang tải công việc...</div>`;
  }
  const d = S.data, ws = d.workspaces.find(w => w.id === d.currentId);
  const projs = d.projects.filter(p => !p.archived);
  const body = !projs.length && !d.projects.length ? emptyWorkspace() : S.mode === 'kanban' ? kanban() : S.mode === 'list' ? listView() : S.mode === 'mine' ? mineBoard() : S.mode === 'created' ? personalView('created') : S.mode === 'rec' ? recView() : dashboard();
  return `
  ${toolbar(ws)}
  <div class="desk-only text-[12px] text-gray-400 mb-3 -mt-1 flex items-center gap-1.5">${WI.eye} ${esc(scopeNote())}</div>
  ${timebar()}
  <div class="flex flex-col md:flex-row gap-4 items-stretch md:items-start">
    ${tree()}
    <div class="flex-1 min-w-0" id="work-body">${S.error ? `<div class="card px-4 py-2 mb-3 text-[13px] text-red-600">${esc(S.error)}</div>` : ''}${body}</div>
  </div>`;
}

/** Một dòng nhỏ nói rõ phạm vi xem công việc của người đang đăng nhập (đúng quy tắc lọc của máy chủ). */
function scopeNote(){
  if(isDir() || isHead()) return 'Bạn xem được toàn bộ công việc.';
  if(isMgr()) return 'Bạn xem được việc bạn tạo, được giao, theo dõi và việc của cấp dưới.';
  return 'Bạn chỉ xem được việc bạn tạo, được giao, theo dõi.';
}
function toolbar(ws){
  const d = S.data, people = scopeUsersForFilter(), showF = !['rec', 'created', 'mine'].includes(S.mode);
  const tab = (k, ic, label) => `<button class="btn btn-sm ${S.mode === k ? 'btn-primary' : 'btn-ghost'}" onclick="W.setMode('${k}')">${ic} ${label}</button>`;
  return `
  <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
    <div class="tb-left flex items-center gap-2 flex-wrap">
      <div class="flex items-center gap-2 card !rounded-lg px-2 py-1">
        <span class="w-3 h-3 rounded shrink-0" style="background:${esc(ws ? ws.color : '#2f6fed')}"></span>
        <select class="!border-0 !shadow-none bg-transparent font-semibold text-slate-900 text-[14px] outline-none cursor-pointer max-w-[220px]" title="Chuyển Workspace" onchange="W.setWs(this.value)">
          ${d.workspaces.map(w => `<option value="${esc(w.id)}" ${w.id === d.currentId ? 'selected' : ''}>${esc(w.name)}${w.archived ? ' (lưu trữ)' : ''}</option>`).join('')}
        </select>
      </div>
      ${isDir() ? `<button class="btn btn-ghost btn-sm" title="Quản lý Workspace" onclick="W.openWorkspace('${esc(d.currentId)}')">${I.gear} Workspace</button><button class="btn btn-ghost btn-sm" title="Thêm Workspace mới" onclick="W.openWorkspace('')">${I.plus}</button>` : ''}
      <span class="w-px h-6 bg-gray-200 mx-1 desk-only"></span>
      <div class="tb-tabs">${tab('kanban', WI.kanban, 'Kanban')}${tab('list', WI.list, 'Danh sách')}${tab('dash', WI.chart, 'Tổng quan')}<span class="w-px h-6 bg-gray-200 mx-1"></span>${tab('mine', WI.check, 'Việc của tôi')}${tab('created', I.edit, 'Việc tôi tạo')}${tab('rec', WI.repeat, 'Việc lặp lại')}</div>
    </div>
    <div class="tb-right flex items-center gap-2 flex-wrap">
      <input class="input !w-48" id="wk-q" placeholder="Tìm công việc, nhãn..." value="${esc(S.f.q)}" oninput="W.setQ(this.value)">
      ${!showF ? '' : people.length > 1 ? `<select class="input !w-auto" onchange="W.setF('who',this.value)"><option value="all">Mọi người</option>${people.map(u => `<option value="${u.id}" ${S.f.who === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : ''}
      ${!showF ? '' : `<select class="input !w-auto" onchange="W.setF('pri',this.value)"><option value="all">Mọi ưu tiên</option>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${S.f.pri === k ? 'selected' : ''}>${v.t}</option>`).join('')}</select>
      <span class="chip ${S.f.fol ? 'active' : ''}" title="Chỉ hiện việc bạn là người theo dõi" onclick="W.toggleFol()">Tôi theo dõi</span>`}
      ${S.mode === 'rec' ? `<button class="btn btn-primary tb-add" aria-label="Thêm việc lặp lại" onclick="W.openRecurring('')">${I.plus}<span class="fab-text"> Thêm việc lặp lại</span></button>` : `<button class="btn btn-primary tb-add" aria-label="Thêm công việc" onclick="W.openTaskForm('')">${I.plus}<span class="fab-text"> Thêm công việc</span></button>`}
    </div>
  </div>`;
}
/** Người có thể lọc theo: những ai xuất hiện trong các việc đang xem được. */
function scopeUsersForFilter(){
  const ids = new Set(); scopeTasks({ time: false }).forEach(t => t.assigneeIds.forEach(a => ids.add(a)));
  return [...ids].map(user).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

/* ---------- Cây Phòng ban → Dự án ---------- */
function tree(){
  const d = S.data, ts = S.data.tasks;
  const cnt = {}; ts.forEach(t => { if(isOpen(t)) cnt[t.projectId] = (cnt[t.projectId] || 0) + 1; });
  const live = d.projects.filter(p => !p.archived), arch = d.projects.filter(p => p.archived);
  const row = p => `<div class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[13.5px] group ${S.project === p.id ? 'bg-base-50 text-base-700 font-semibold' : 'text-slate-700 hover:bg-gray-100'}" onclick="W.setProject('${p.id}')">
      ${projDot(p)}<span class="truncate flex-1" title="${esc(p.name)}">${esc(p.name)}</span>
      <span class="text-[11.5px] text-gray-400">${cnt[p.id] || ''}</span>
      ${canEditProject(p) ? `<button class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-base-600" title="Cài đặt dự án" onclick="event.stopPropagation();W.openProject('${p.id}')">${I.gear}</button>` : ''}
    </div>`;
  const groups = d.departments.map(dp => ({ dp, ps: live.filter(p => p.departmentId === dp.id) }));
  const loose = live.filter(p => !p.departmentId || !d.departments.some(x => x.id === p.departmentId));
  const head = id => id ? `<div class="text-[11px] text-gray-400 font-normal normal-case truncate">Trưởng: ${esc(user(id).name)}</div>` : '';
  const curProj = S.project === 'all' ? 'Tất cả dự án' : (projById(S.project) || { name: '?' }).name;
  return `
  <aside id="wk-tree" class="wk-tree w-full md:w-60 shrink-0 card p-3">
    <button class="tree-toggle" onclick="W.treeToggle()"><span class="flex items-center gap-2 min-w-0">${WI.folder}<span class="truncate">Dự án: <b>${esc(curProj)}</b></span></span><span class="text-gray-400">▾</span></button>
    <div class="tree-body">
    <div class="flex items-center justify-between mb-2"><span class="section-title">Dự án</span>
      <span class="flex items-center gap-2">${isDir() ? `<a class="normal-case text-[12px] font-medium text-base-600 hover:underline cursor-pointer" onclick="W.openDepartments()">Phòng ban</a>` : ''}${canCreateProject() ? `<button class="text-base-600 hover:text-base-700" title="Thêm dự án" onclick="W.openProject('')">${I.plus}</button>` : ''}</span></div>
    <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-[13.5px] ${S.project === 'all' ? 'bg-base-50 text-base-700 font-semibold' : 'text-slate-700 hover:bg-gray-100'}" onclick="W.setProject('all')">${WI.folder}<span class="flex-1">Tất cả dự án</span><span class="text-[11.5px] text-gray-400">${ts.filter(t => isOpen(t) && live.some(p => p.id === t.projectId)).length || ''}</span></div>
    <div class="mt-2 space-y-2">
      ${groups.filter(g => g.ps.length || isDir()).map(g => `<div><div class="px-2 pt-1 pb-0.5 text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">${esc(g.dp.name)}${head(g.dp.headId)}</div>${g.ps.map(row).join('') || '<div class="px-2 py-1 text-[12px] text-gray-400">Chưa có dự án</div>'}</div>`).join('')}
      ${loose.length ? `<div><div class="px-2 pt-1 pb-0.5 text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide">Chưa xếp phòng ban</div>${loose.map(row).join('')}</div>` : ''}
      ${arch.length ? `<div><div class="px-2 pt-1 pb-0.5 text-[11.5px] font-semibold text-gray-400 uppercase tracking-wide cursor-pointer" onclick="W.toggleArch()">${S.showArch ? '▾' : '▸'} Đã lưu trữ (${arch.length})</div>${S.showArch ? arch.map(row).join('') : ''}</div>` : ''}
    </div>
    ${!live.length && !arch.length ? '<div class="px-2 py-3 text-[12.5px] text-gray-400">Bạn chưa tham gia dự án nào trong Workspace này.</div>' : ''}
    </div>
  </aside>`;
}
function emptyWorkspace(){
  return `<div class="card p-10 text-center text-gray-500">
    <div class="text-slate-700 font-medium mb-1">Chưa có dự án nào ở đây</div>
    <div class="mb-4">${canCreateProject() ? 'Tạo dự án đầu tiên để bắt đầu giao việc.' : 'Hãy nhờ quản lý thêm bạn vào một dự án, hoặc chuyển sang Workspace khác.'}</div>
    ${canCreateProject() ? `<button class="btn btn-primary" onclick="W.openProject('')">${I.plus} Tạo dự án</button>` : ''}</div>`;
}

/* ============================================================
   KANBAN
   ============================================================ */
function kanban(list){
  const ts = list || filtered({ kanban: true }), multi = S.project === 'all';
  // Thẻ tự xếp theo thời gian: cột chưa xong → hạn gần nhất ở trên (không hạn xuống cuối); cột Hoàn thành → mới hoàn thành ở trên. Bằng nhau giữ thứ tự cũ.
  const cols = STATUS_KEYS.map(k => ({ k, items: ts.filter(t => t.status === k).sort(k === 'done' ? (a, b) => (b.completedAt || b.createdAt || '').localeCompare(a.completedAt || a.createdAt || '') : (a, b) => (a.due || '9999').localeCompare(b.due || '9999')) }));
  return `
  <div id="kb-board" class="grid gap-3 items-start overflow-x-auto pb-2" style="grid-template-columns:repeat(4,minmax(250px,1fr))">
    ${cols.map(c => {
      const shown = c.k === 'done' ? c.items.slice(0, S.doneLimit) : c.items;
      return `
      <div class="rounded-xl bg-gray-100/80 border border-gray-200 p-2.5 min-h-[160px]" data-status="${c.k}" ondragover="W.colOver(event,'${c.k}')" ondragleave="W.colLeave(event)" ondrop="W.drop(event,'${c.k}')">
        <div class="flex items-center justify-between px-1 pb-2">
          <div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${STATUS[c.k].dot}"></span><span class="font-semibold text-slate-800">${STATUS[c.k].t}</span><span class="text-[12px] text-gray-500 bg-white rounded-full px-2 border border-gray-200">${c.items.length}</span></div>
          <button class="text-gray-400 hover:text-base-600" title="Thêm công việc vào cột này" onclick="W.openTask('', '${c.k}')">${I.plus}</button>
        </div>
        <div class="space-y-2" data-col="${c.k}" style="max-height:calc(100vh - 290px);overflow-y:auto">
          ${shown.map(t => card(t, multi)).join('') || `<div class="text-center text-[12.5px] text-gray-400 py-6 border border-dashed border-gray-300 rounded-lg">Kéo công việc vào đây</div>`}
          ${c.k === 'done' && c.items.length > shown.length ? `<button class="btn btn-ghost btn-sm w-full justify-center" onclick="W.moreDone()">Xem thêm ${Math.min(DONE_SHOW, c.items.length - shown.length)} việc (còn ${c.items.length - shown.length})</button>` : ''}
        </div>
      </div>`;
    }).join('')}
  </div>
  <div class="text-[12px] text-gray-400 mt-2">Kéo thả thẻ để đổi trạng thái; trong mỗi cột thẻ tự xếp theo hạn gần nhất ở trên. Tên và mô tả của việc đã tạo bị khoá — người tạo sửa ở mục <b>Việc tôi tạo</b>; việc lặp lại được tạo ở mục <b>Việc lặp lại</b>.</div>`;
}
function card(t, multi){
  const p = projById(t.projectId), od = overdue(t), ed = canEdit(t);
  return `
  <div class="bg-white rounded-lg border ${od ? 'border-red-200' : 'border-gray-200'} p-3 shadow-sm hover:shadow-md transition-shadow ${ed ? 'cursor-grab' : 'cursor-pointer'} ${t.status === 'done' ? 'opacity-75' : ''}"
       data-id="${t.id}" ${ed && FINE ? 'draggable="true" ondragstart="W.dragStart(event,\'' + t.id + '\')" ondragend="W.dragEnd(event)"' : ''}
       ondragover="W.cardOver(event,'${t.id}')" onclick="W.openTask('${t.id}')">
    <div class="flex items-start gap-2">
      <div class="w-1 self-stretch rounded-full shrink-0" style="background:${PRIO[t.priority].bar}" title="Ưu tiên: ${PRIO[t.priority].t}"></div>
      <div class="min-w-0 flex-1">
        ${multi && p ? `<div class="flex items-center gap-1.5 text-[11.5px] text-gray-500 mb-1">${projDot(p)}<span class="truncate">${esc(p.name)}</span></div>` : ''}
        <div class="font-medium text-slate-900 leading-snug ${t.status === 'done' ? 'line-through text-gray-500' : ''}">${esc(t.title)}</div>
        ${krRef(t) ? `<div class="flex mt-1.5">${krChip(t)}</div>` : ''}
        ${t.tags.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${tagChips(t.tags.slice(0, 4))}</div>` : ''}
        <div class="flex items-center justify-between gap-2 mt-2.5">
          <div class="flex items-center gap-2.5 text-[12px] text-gray-500 flex-wrap">
            ${t.startDate ? `<span class="inline-flex items-center gap-1 whitespace-nowrap" title="Ngày bắt đầu">Từ ${fmt(t.startDate)}</span>` : ''}${t.due ? dueHtml(t) : ''}${hoursChip(t)}${subProg(t)}
            ${t.commentCount ? `<span class="inline-flex items-center gap-1">${I.chat}${t.commentCount}</span>` : ''}
            ${t.attachCount ? `<span class="inline-flex items-center gap-1">${WI.clip}${t.attachCount}</span>` : ''}
            ${folBadge(t)}
            ${t.recurrence ? `<span class="text-indigo-600 inline-flex" title="${esc(recText(t.recurrence))}">${WI.repeat}</span>` : ''}
          </div>
          ${stack(t.assigneeIds)}
        </div>
        ${ed ? `<select class="m-only input !py-1.5 !px-2 mt-2.5 !w-full" title="Đổi trạng thái" onclick="event.stopPropagation()" onchange="event.stopPropagation();W.setStatus('${t.id}',this.value)">${STATUS_KEYS.map(k => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${STATUS[k].t}</option>`).join('')}</select>` : ''}
      </div>
    </div>
  </div>`;
}

/* ---------- Kéo thả ---------- */
function dragStart(e, id){
  S.drag = id; S.over = null;
  e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id);
  const el = e.currentTarget; setTimeout(() => { if(el) el.classList.add('opacity-40'); }, 0);
}
function clearMarks(){
  document.querySelectorAll('[data-status].ring-2').forEach(e => e.classList.remove('ring-2', 'ring-base-500', 'bg-base-50'));
  document.querySelectorAll('[data-id].kb-before,[data-id].kb-after').forEach(e => { e.classList.remove('kb-before', 'kb-after'); e.style.boxShadow = ''; });
}
function dragEnd(){ S.drag = null; S.over = null; clearMarks(); document.querySelectorAll('[data-id].opacity-40').forEach(e => e.classList.remove('opacity-40')); }
function colOver(e, status){
  if(!S.drag) return;
  e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  const col = e.currentTarget; col.classList.add('ring-2', 'ring-base-500');
  if(!e.target.closest('[data-id]')){ S.over = { before: '', status }; document.querySelectorAll('[data-id].kb-before,[data-id].kb-after').forEach(x => { x.classList.remove('kb-before', 'kb-after'); x.style.boxShadow = ''; }); }
}
function colLeave(e){ const col = e.currentTarget; if(!col.contains(e.relatedTarget)) col.classList.remove('ring-2', 'ring-base-500'); }
function cardOver(e, id){
  if(!S.drag || S.drag === id) return;
  e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move';
  const el = e.currentTarget, r = el.getBoundingClientRect(), upper = e.clientY < r.top + r.height / 2;
  const next = el.nextElementSibling && el.nextElementSibling.dataset.id ? el.nextElementSibling.dataset.id : '';
  S.over = { before: upper ? id : next, status: el.closest('[data-status]').dataset.status };
  document.querySelectorAll('[data-id].kb-before,[data-id].kb-after').forEach(x => { x.classList.remove('kb-before', 'kb-after'); x.style.boxShadow = ''; });
  el.classList.add(upper ? 'kb-before' : 'kb-after'); el.style.boxShadow = upper ? '0 -3px 0 0 #2f6fed' : '0 3px 0 0 #2f6fed';
  el.closest('[data-status]').classList.add('ring-2', 'ring-base-500');
}
function drop(e, status){
  e.preventDefault(); clearMarks();
  const id = S.drag, before = S.over && S.over.status === status ? S.over.before : '';
  S.drag = null; S.over = null;
  if(id) move(id, status, before);
}
/** Chuyển cột / đổi vị trí: cập nhật ngay tại máy rồi báo máy chủ (lỗi thì tải lại dữ liệu thật). */
async function move(id, status, before){
  const t = S.data.tasks.find(x => x.id === id); if(!t) return;
  if(!canEdit(t)){ toast('Bạn chỉ đổi được trạng thái việc bạn tạo, được giao hoặc của cấp dưới. Người theo dõi chỉ xem và bình luận.', 'error'); return; }
  if(t.status === status && before === id) return;
  const prevStatus = t.status;
  S.data.tasks = S.data.tasks.filter(x => x.id !== id); t.status = status;
  const i = before ? S.data.tasks.findIndex(x => x.id === before) : -1;
  if(i >= 0) S.data.tasks.splice(i, 0, t); else S.data.tasks.push(t);
  if(status === 'done' && prevStatus !== 'done') t.completedAt = new Date().toISOString();
  repaint();
  const j = await act('moveTask', { id, status, beforeId: before || '' });
  spawnNotice(j);
}
function spawnNotice(j){
  if(j && j.result && j.result.spawned) toast('Đã tạo việc lặp lại kế tiếp (hạn ' + fmt(j.result.spawned.due) + ').', 'info');
  else if(j && j.result && j.result.scheduled) toast('Việc lặp lại kế tiếp sẽ tự xuất hiện vào ngày ' + fmt(j.result.scheduled.due) + '.', 'info');
}

/* ============================================================
   DANH SÁCH
   ============================================================ */
/** Ô trạng thái ở dòng: người có quyền sửa đổi nhanh được, người chỉ theo dõi chỉ thấy huy hiệu. */
const statusCell = t => canEdit(t) ? `<select class="input !py-1 !px-2 text-[12.5px]" onchange="W.setStatus('${t.id}',this.value)">${STATUS_KEYS.map(k => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${STATUS[k].t}</option>`).join('')}</select>` : statusBadge(t.status);
function listView(){
  let ts = filtered(), multi = S.project === 'all';
  const cnt = k => scopeTasks().filter(t => k === 'overdue' ? overdue(t) : k === 'all' ? true : t.status === k).length;
  const tab = (k, label) => `<span class="chip ${S.f.st === k ? 'active' : ''}" onclick="W.setF('st','${k}')">${label} <span class="opacity-70">${cnt(k)}</span></span>`;
  const so = { status: t => STATUS_KEYS.indexOf(t.status), start: t => t.startDate || '9999', due: t => t.due || '9999', title: t => t.title.toLowerCase(), pri: t => -PRIO[t.priority].w, proj: t => (projById(t.projectId) || { name: '' }).name.toLowerCase() };
  const fn = so[S.sort.k] || so.status;
  ts = [...ts].sort((a, b) => { if(S.sort.k === 'due' && isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1; const x = fn(a), y = fn(b); return (x < y ? -1 : x > y ? 1 : 0) * S.sort.d || (a.due || '9').localeCompare(b.due || '9'); });
  const th = (k, label, cls = '') => `<th class="text-left font-medium py-2.5 px-2 cursor-pointer select-none hover:text-slate-800 ${cls}" onclick="W.sortBy('${k}')">${label}${S.sort.k === k ? (S.sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  return `
  <div class="flex items-center gap-2 mb-3 flex-wrap">${tab('all', 'Tất cả')}${STATUS_KEYS.map(k => tab(k, STATUS[k].t)).join('')}${tab('overdue', 'Quá hạn')}</div>
  <div class="card overflow-x-auto">
    <table class="w-full m-cards">
      <thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr>
        <th class="w-10 py-2.5"></th>${th('title', 'Công việc')}${multi ? th('proj', 'Dự án') : ''}<th class="text-left font-medium py-2.5 px-2">Người làm</th>${th('pri', 'Ưu tiên')}${th('start', 'Bắt đầu')}${th('due', 'Hạn')}${th('status', 'Trạng thái', 'w-36')}<th class="w-16"></th>
      </tr></thead>
      <tbody class="divide-y divide-gray-100">
        ${ts.length ? ts.slice(0, S.listLimit).map(t => { const p = projById(t.projectId), ed = canEdit(t); return `
        <tr class="hover:bg-gray-50 cursor-pointer ${t.status === 'done' ? 'opacity-70' : ''}" onclick="W.openTask('${t.id}')">
          <td class="mc-chk text-center py-3" onclick="event.stopPropagation()"><input type="checkbox" class="checkbox align-middle" ${t.status === 'done' ? 'checked' : ''} ${ed ? '' : 'disabled'} onchange="W.toggleDone('${t.id}')"></td>
          <td class="mc-title py-3 px-2"><div class="font-medium ${t.status === 'done' ? 'line-through text-gray-400' : 'text-slate-900'}">${esc(t.title)}</div>
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">${krChip(t)}${tagChips(t.tags.slice(0, 5))}${hoursChip(t) ? `<span class="text-[12px] text-gray-500">${hoursChip(t)}</span>` : ''}${subProg(t)}${t.recurrence ? `<span class="text-indigo-600 inline-flex items-center gap-1 text-[11.5px]">${WI.repeat}${esc(recText(t.recurrence))}</span>` : ''}${t.commentCount ? `<span class="inline-flex items-center gap-1 text-[12px] text-gray-500">${I.chat}${t.commentCount}</span>` : ''}${t.attachCount ? `<span class="inline-flex items-center gap-1 text-[12px] text-gray-500">${WI.clip}${t.attachCount}</span>` : ''}${folBadge(t)}</div></td>
          ${multi ? `<td class="py-3 px-2 text-[12.5px] text-slate-600"><span class="inline-flex items-center gap-1.5 whitespace-nowrap">${projDot(p)}${esc(p ? p.name : '?')}</span></td>` : ''}
          <td class="py-3 px-2">${stack(t.assigneeIds, 4)}</td>
          <td class="py-3 px-2">${prioBadge(t.priority)}</td>
          <td class="mc-hide py-3 px-2 text-[12.5px] whitespace-nowrap ${t.startDate ? 'text-slate-700' : 'text-gray-400'}">${t.startDate ? fmt(t.startDate) : '—'}</td>
          <td class="py-3 px-2 text-[12.5px]">${dueHtml(t)}</td>
          <td class="mc-st py-3 px-2" onclick="event.stopPropagation()">${statusCell(t)}</td>
          <td class="mc-act py-3 text-center whitespace-nowrap" onclick="event.stopPropagation()">${canDelete(t) ? `<button class="text-gray-400 hover:text-red-600 p-1" title="Xoá" onclick="W.deleteTask('${t.id}')">${I.trash}</button>` : ''}</td>
        </tr>`; }).join('') + (ts.length > S.listLimit ? `<tr><td colspan="9" class="p-3 text-center"><button class="btn btn-ghost btn-sm" onclick="W.moreList()">Xem thêm ${Math.min(200, ts.length - S.listLimit)} việc (còn ${ts.length - S.listLimit})</button></td></tr>` : '')
        : `<tr><td colspan="9" class="p-10 text-center text-gray-400">Không có công việc nào.</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

/* ============================================================
   TỔNG QUAN & THỐNG KÊ
   ============================================================ */
function dashboard(){
  const ts = scopeTasks(), td = today(), in7 = toISO(addDays(new Date(), 7));
  const total = ts.length, done = ts.filter(t => !isOpen(t)).length, open = total - done;
  const od = ts.filter(overdue), soon = ts.filter(t => isOpen(t) && t.due && t.due >= td && t.due <= in7);
  const rate = total ? Math.round(done / total * 100) : 0;
  const by = {}; STATUS_KEYS.forEach(k => by[k] = ts.filter(t => t.status === k).length);
  const stat = (label, value, sub, color = 'text-slate-900') => `<div class="card p-4"><div class="text-[12.5px] text-gray-500">${label}</div><div class="text-2xl font-semibold mt-1 ${color}">${value}</div><div class="text-[12px] text-gray-400 mt-0.5">${sub || '&nbsp;'}</div></div>`;
  // donut theo trạng thái
  let acc = 0; const segs = STATUS_KEYS.map(k => { const a = acc, b = acc + (total ? by[k] / total * 100 : 0); acc = b; return `${STATUS[k].dot} ${a}% ${b}%`; });
  const donut = total ? `conic-gradient(${segs.join(',')})` : '#e5e7eb';
  // tải công việc theo người
  const wl = {}; ts.filter(isOpen).forEach(t => t.assigneeIds.forEach(a => { const w = wl[a] || (wl[a] = { todo: 0, doing: 0, review: 0, od: 0, n: 0 }); w[t.status]++; w.n++; if(overdue(t)) w.od++; }));
  const people = Object.entries(wl).sort((a, b) => b[1].n - a[1].n).slice(0, 14), maxN = Math.max(1, ...people.map(p => p[1].n));
  // theo dự án
  const pj = {}; ts.forEach(t => { const w = pj[t.projectId] || (pj[t.projectId] = { n: 0, d: 0, od: 0 }); w.n++; if(!isOpen(t)) w.d++; if(overdue(t)) w.od++; });
  // hoàn thành 8 tuần gần nhất
  const weeks = []; for(let i = 7; i >= 0; i--){ const s = addDays(new Date(), -i * 7), k = isoWeek(s); weeks.push({ key: weekKey(k.week, k.year), label: 'T' + k.week, n: 0 }); }
  ts.forEach(t => { if(t.completedAt){ const k = isoWeek(new Date(t.completedAt)), w = weeks.find(x => x.key === weekKey(k.week, k.year)); if(w) w.n++; } });
  const maxW = Math.max(1, ...weeks.map(w => w.n));
  const pr = Object.keys(PRIO).map(k => ({ k, n: ts.filter(t => isOpen(t) && t.priority === k).length })), maxP = Math.max(1, ...pr.map(x => x.n));
  const name = S.project === 'all' ? 'tất cả dự án' : (projById(S.project) || { name: '' }).name;
  return `
  <div class="text-[13px] text-gray-500 mb-3">Thống kê của <b class="text-slate-700">${esc(name)}</b> — chỉ tính các công việc bạn được phép xem.</div>
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
    ${stat('Tổng công việc', total, open + ' đang mở')}${stat('Tỷ lệ hoàn thành', rate + '%', done + '/' + total + ' việc', rate >= 70 ? 'text-green-600' : 'text-slate-900')}
    ${stat('Đang thực hiện', by.doing + by.review, by.review + ' chờ duyệt', 'text-blue-600')}${stat('Quá hạn', od.length, od.length ? 'Cần xử lý ngay' : 'Không có việc trễ', od.length ? 'text-red-600' : 'text-green-600')}${stat('Hạn trong 7 ngày', soon.length, 'Sắp đến hạn', soon.length ? 'text-amber-600' : 'text-slate-900')}
  </div>
  <div class="grid lg:grid-cols-3 gap-4 mb-4">
    <div class="card p-4"><div class="section-title mb-3">Theo trạng thái</div>
      <div class="flex items-center gap-5"><div class="relative w-32 h-32 rounded-full shrink-0" style="background:${donut}"><div class="absolute inset-[22px] bg-white rounded-full flex flex-col items-center justify-center"><div class="text-xl font-semibold">${rate}%</div><div class="text-[11px] text-gray-400">hoàn thành</div></div></div>
      <div class="space-y-1.5 text-[13px] flex-1">${STATUS_KEYS.map(k => `<div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${STATUS[k].dot}"></span><span class="flex-1 text-slate-600">${STATUS[k].t}</span><b>${by[k]}</b></div>`).join('')}</div></div></div>
    <div class="card p-4"><div class="section-title mb-3">Việc đang mở theo ưu tiên</div>
      <div class="space-y-2.5">${pr.reverse().map(x => `<div><div class="flex justify-between text-[12.5px] mb-1"><span class="text-slate-600">${PRIO[x.k].t}</span><b>${x.n}</b></div><div class="h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-2 rounded-full" style="width:${x.n / maxP * 100}%;background:${PRIO[x.k].bar}"></div></div></div>`).join('')}</div></div>
    <div class="card p-4"><div class="section-title mb-3">Hoàn thành 8 tuần gần nhất</div>
      <div class="flex items-end gap-2 h-32">${weeks.map(w => `<div class="flex-1 flex flex-col items-center justify-end h-full" title="${w.label}: ${w.n} việc"><div class="text-[11px] text-gray-500 mb-0.5">${w.n || ''}</div><div class="w-full rounded-t bg-green-500/80" style="height:${w.n / maxW * 100}%;min-height:${w.n ? 4 : 1}px"></div><div class="text-[11px] text-gray-400 mt-1">${w.label}</div></div>`).join('')}</div></div>
  </div>
  <div class="grid lg:grid-cols-2 gap-4">
    <div class="card p-4"><div class="section-title mb-1">Tải công việc theo nhân sự</div><div class="text-[12px] text-gray-400 mb-3">Số việc đang mở của mỗi người <span class="inline-flex items-center gap-1 ml-2"><i class="w-2 h-2 rounded-sm inline-block" style="background:#94a3b8"></i>Chưa thực hiện <i class="w-2 h-2 rounded-sm inline-block ml-1" style="background:#2f6fed"></i>Đang làm <i class="w-2 h-2 rounded-sm inline-block ml-1" style="background:#d97706"></i>Chờ duyệt</span></div>
      ${people.length ? `<div class="space-y-2.5">${people.map(([id, w]) => `<div class="flex items-center gap-2.5">${avatar(user(id), 'w-7 h-7 text-[10px]')}<div class="w-28 truncate text-[13px] text-slate-700" title="${esc(user(id).name)}">${esc(user(id).name)}</div>
        <div class="flex-1 h-4 bg-gray-100 rounded overflow-hidden flex">${['todo', 'doing', 'review'].map(k => `<div style="width:${w[k] / maxN * 100}%;background:${STATUS[k].dot}" title="${STATUS[k].t}: ${w[k]}"></div>`).join('')}</div>
        <div class="w-16 text-right text-[12.5px]"><b>${w.n}</b>${w.od ? ` <span class="text-red-600" title="Quá hạn">· ${w.od} trễ</span>` : ''}</div></div>`).join('')}</div>` : '<div class="text-gray-400 text-[13px] py-6 text-center">Không có việc đang mở.</div>'}</div>
    <div class="space-y-4">
      <div class="card p-4"><div class="section-title mb-3">Tiến độ theo dự án</div>
        ${Object.keys(pj).length ? `<div class="space-y-3">${Object.entries(pj).sort((a, b) => b[1].n - a[1].n).map(([id, w]) => { const p = projById(id); return `<div><div class="flex items-center justify-between text-[13px] mb-1"><span class="flex items-center gap-2 text-slate-700 truncate">${projDot(p)}${esc(p ? p.name : '?')}</span><span class="text-gray-500 text-[12px] whitespace-nowrap">${w.d}/${w.n} · <b class="text-slate-700">${Math.round(w.d / w.n * 100)}%</b>${w.od ? ` <span class="text-red-600">· ${w.od} trễ</span>` : ''}</span></div>${progressBar(Math.round(w.d / w.n * 100), 'bg-green-500', 'h-2')}</div>`; }).join('')}</div>` : '<div class="text-gray-400 text-[13px] py-4 text-center">Chưa có dữ liệu.</div>'}</div>
      <div class="card p-4"><div class="section-title mb-3">Việc quá hạn</div>
        ${od.length ? `<div class="divide-y divide-gray-100">${[...od].sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8).map(t => `<div class="py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded" onclick="W.openTask('${t.id}')"><span class="flex-1 truncate text-[13px] text-slate-800">${esc(t.title)}</span>${stack(t.assigneeIds, 2)}<span class="text-[12px] text-red-600 whitespace-nowrap">${fmt(t.due)}</span></div>`).join('')}</div>${od.length > 8 ? `<div class="text-[12px] text-gray-400 pt-2">…và ${od.length - 8} việc khác</div>` : ''}` : '<div class="text-green-600 text-[13px] py-4 text-center">Không có việc quá hạn 🎉</div>'}</div>
    </div>
  </div>`;
}

/* ============================================================
   NƠI TẠO / SỬA NỘI DUNG  ↔  CHI TIẾT TRÊN BẢNG (chỉ đọc nội dung)
   - openTaskForm: form tạo việc; người TẠO sửa lại nội dung ở mục "Việc tôi tạo" cũng bằng form này.
   - openDetail: bấm vào việc trên bảng. Tên, mô tả, ưu tiên, hạn, nhãn bị khoá; chỉ đổi trạng thái, tick việc con,
     giao lại cho người khác, bình luận và đính kèm tệp.
   ============================================================ */
const ro = () => S.draft && S.draft.readOnly;
function openTask(id, status){ if(!id) openTaskForm('', status); else openDetail(id); }

function openTaskForm(id, status){
  const isNew = !id; let t;
  if(isNew){
    const ps = creatableProjects();
    if(!ps.length){ toast(canCreateProject() ? 'Hãy tạo dự án trước khi thêm công việc.' : 'Bạn chưa tham gia dự án nào để thêm công việc.', 'error'); return; }
    const pid = S.project !== 'all' && ps.some(p => p.id === S.project) ? S.project : ps[0].id;
    t = { id: newId('t'), projectId: pid, title: '', description: '', status: status || 'todo', priority: 'medium', assigneeIds: [meId()], followerIds: [], startDate: today(), due: '', estHours: null, tags: [], subtasks: [], createdBy: meId() };
  } else {
    t = S.data.tasks.find(x => x.id === id); if(!t) return;
    if(!canEditContent(t)){ toast('Chỉ người tạo công việc mới sửa được tên, mô tả và nội dung.', 'error'); return; }
  }
  S.draft = JSON.parse(JSON.stringify(t)); S.draft.isNew = isNew; S.draft.readOnly = false; S.draft.kind = 'task'; S.detail = null; S.mention = new Set(); S.draft.files = [];
  S.draft.followerIds = [...fids(t)].filter(id => !t.assigneeIds.includes(id));
  const p = projById(S.draft.projectId);
  openModal(`
    ${modalHeader(isNew ? 'Thêm công việc' : 'Sửa nội dung công việc', isNew ? 'Giao việc cho bất kỳ ai. Sau khi tạo, tên và mô tả bị khoá trên bảng; chỉ bạn (người tạo) sửa lại được ở mục "Việc tôi tạo".' : 'Bạn là người tạo nên sửa được ở đây. Trên bảng, tên và mô tả của việc này đã bị khoá.')}
    <div class="p-6 grid md:grid-cols-5 gap-6 m-form">
      <div class="md:col-span-3 space-y-5 min-w-0 m-col-main">
        <div><label class="label">Tên công việc <span class="text-red-500">*</span></label><input id="tk-title" class="input !text-[15px] !font-medium" value="${esc(S.draft.title)}" maxlength="300" placeholder="Nhập nội dung công việc..." oninput="W.d('title',this.value)"></div>
        <div><label class="label">Mô tả</label>${richEditor('tk-desc', { value: S.draft.description, placeholder: 'Mô tả chi tiết, yêu cầu, liên kết... (có thể dán ảnh bằng Ctrl+V)', minHeight: 130, images: true })}</div>
        <div class="m-last"><label class="label">Việc con / Checklist <span id="tk-subcount" class="font-normal text-gray-400"></span></label><div id="tk-subs"></div></div>
        <div class="m-last"><div class="flex items-center justify-between"><label class="label">Tệp đính kèm <span class="font-normal text-gray-400">(tối đa ${MAX_MB}MB/tệp)</span></label><label class="btn btn-ghost btn-sm cursor-pointer">${WI.clip} Chọn tệp<input type="file" multiple class="hidden" onchange="event.stopPropagation();W.pendFiles(this)" accept=".${OK_EXT.join(',.')}"></label></div><div id="tk-pfiles" class="space-y-1.5"></div></div>
      </div>
      <div class="md:col-span-2 space-y-4 min-w-0 m-col-side">
        <div><label class="label">Dự án</label>${isNew ? `<select id="tk-proj" class="input" onchange="W.d('projectId',this.value);W.paintAssignees()">${creatableProjects().map(x => `<option value="${x.id}" ${x.id === S.draft.projectId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<div class="flex items-center gap-2 text-[14px] text-slate-700 py-1.5">${projDot(p)}${esc(p ? p.name : '?')}</div>`}</div>
        <div class="grid grid-cols-2 gap-3">
          ${isNew ? `<div><label class="label">Trạng thái ban đầu</label><select class="input" onchange="W.d('status',this.value)">${STATUS_KEYS.map(k => `<option value="${k}" ${S.draft.status === k ? 'selected' : ''}>${STATUS[k].t}</option>`).join('')}</select></div>` : ''}
          <div class="${isNew ? '' : 'col-span-2'}"><label class="label">Ưu tiên</label><select class="input" onchange="W.d('priority',this.value)">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${S.draft.priority === k ? 'selected' : ''}>${v.t}</option>`).join('')}</select></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">Ngày bắt đầu <span class="text-red-500">*</span></label><input id="tk-start" type="date" class="input" value="${esc(S.draft.startDate || '')}" ${S.draft.due ? 'max="' + esc(S.draft.due) + '"' : ''} onchange="W.d('startDate',this.value);W.checkDates()"></div>
          <div><label class="label">Hạn chót</label><input id="tk-due" type="date" class="input" value="${esc(S.draft.due)}" ${S.draft.startDate ? 'min="' + esc(S.draft.startDate) + '"' : ''} onchange="W.d('due',this.value);W.checkDates()"></div>
        </div>
        <div><label class="label">Thời gian hoàn thành (giờ) <span class="font-normal text-gray-400">(tuỳ chọn)</span></label><input id="tk-hours" type="number" inputmode="decimal" min="0" max="1000" step="0.25" class="input" value="${S.draft.estHours == null ? '' : esc(S.draft.estHours)}" placeholder="VD: 2 hoặc 1.5" oninput="W.d('estHours',this.value)"></div>
        <div><label class="label">Người thực hiện</label><div id="tk-asg"></div></div>
        <div><label class="label">Người theo dõi</label><div id="tk-fol"></div></div>
        <div><label class="label">Nhãn (Tags)</label><div id="tk-tags"></div></div>
        <div class="text-[12px] text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">Cần việc lặp lại (hằng ngày / tuần / tháng)? Tạo ở mục <a class="text-base-600 underline cursor-pointer" onclick="W.gotoRec()">Việc lặp lại</a>.</div>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
      <button class="btn btn-ghost" onclick="A.cancelModal()">Huỷ</button><button class="btn btn-primary" id="tk-save" onclick="W.saveTask()">${I.check} ${isNew ? 'Thêm công việc' : 'Lưu thay đổi'}</button>
    </div>`, 'max-w-4xl');
  paintSubs(); paintAssignees(); paintFollowers(); paintTags(); paintPend();
  setTimeout(() => { const el = $('tk-title'); if(el && isNew) el.focus(); }, 50);
}
function d(k, v){ if(S.draft) S.draft[k] = v; }
/** Số giờ nhập trong form: '' / null → null (không đặt); số dương → số; còn lại không hợp lệ. */
const hoursNum = v => (v === '' || v == null) ? null : Number(String(v).replace(',', '.'));
const badHours = v => { const n = hoursNum(v); return n !== null && !(isFinite(n) && n > 0); };
const hoursVal = v => { const n = hoursNum(v); return n !== null && isFinite(n) && n > 0 ? Math.min(1000, Math.round(n * 100) / 100) : null; };
/** Ngày bắt đầu không được sau hạn chót: cập nhật giới hạn của 2 ô ngày và báo ngay khi nhập sai. */
function checkDates(){
  const t = S.draft; if(!t) return;
  const a = $('tk-start'), b = $('tk-due');
  if(a){ if(t.due) a.setAttribute('max', t.due); else a.removeAttribute('max'); }
  if(b){ if(t.startDate) b.setAttribute('min', t.startDate); else b.removeAttribute('min'); }
  if(t.startDate && t.due && t.startDate > t.due) toast('Ngày bắt đầu không được sau hạn chót.', 'error');
}

/* ----- Tệp đính kèm chọn ngay trong form tạo việc: giữ trong máy, tải lên sau khi việc được lưu ----- */
const MAX_FILES_TASK = 30;
function pendFiles(input){
  const files = [...input.files]; input.value = ''; if(!files.length || !S.draft) return;
  const q = S.draft.files = S.draft.files || [];
  for(const f of files){
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if(!OK_EXT.includes(ext)){ toast('Không hỗ trợ tệp .' + ext + ' (' + f.name + ').', 'error'); continue; }
    if(f.size > MAX_MB * 1048576){ toast(f.name + ' lớn hơn ' + MAX_MB + 'MB.', 'error'); continue; }
    if(!f.size){ toast(f.name + ' là tệp rỗng.', 'error'); continue; }
    if(q.length >= MAX_FILES_TASK){ toast('Mỗi công việc tối đa ' + MAX_FILES_TASK + ' tệp.', 'error'); break; }
    if(q.some(x => x.name === f.name && x.size === f.size)) continue;
    q.push(f); modalDirty = true;
  }
  paintPend();
}
function pendDel(i){ if(!S.draft || !S.draft.files) return; S.draft.files.splice(i, 1); paintPend(); }
function paintPend(){
  const el = $('tk-pfiles'); if(!el || !S.draft) return;
  const fs = S.draft.files || [];
  el.innerHTML = fs.length ? fs.map((f, i) => `
    <div class="flex items-center gap-2.5 border border-gray-200 rounded-lg p-2">
      <div class="w-9 h-9 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">${esc((f.name.split('.').pop() || '').slice(0, 4))}</div>
      <div class="min-w-0 flex-1"><div class="text-[13px] font-medium text-slate-800 truncate" title="${esc(f.name)}">${esc(f.name)}</div><div class="text-[11.5px] text-gray-400">${sizeText(f.size)} · sẽ tải lên khi bấm ${S.draft.isNew ? 'Thêm công việc' : 'Lưu thay đổi'}</div></div>
      <button class="text-gray-400 hover:text-red-600 p-1" title="Bỏ tệp này" onclick="W.pendDel(${i})">${I.x}</button></div>`).join('')
    : '<div class="text-[12.5px] text-gray-400">Chưa chọn tệp nào.</div>';
}
/** Tải lên lần lượt các tệp đã chọn cho việc vừa lưu (chạy nền sau khi form đã đóng). Lỗi từng tệp được báo riêng, việc vẫn được giữ. */
async function uploadQueued(taskId, files){
  const bad = []; let ok = 0;
  toast('Đang tải ' + files.length + ' tệp lên...', 'info');
  S.uploading += files.length;
  for(const f of files){
    try { await wfetch(apiUrl() + 'upload?taskId=' + enc(taskId) + '&name=' + enc(f.name), { method:'POST', headers:{ 'X-Okr-Token': token(), 'Content-Type':'application/octet-stream' }, body: f }); ok++; }
    catch(e){
      if(e.auth){ S.uploading = 0; forceLogout(e.message); return; }
      bad.push(f.name + ' (' + (e.message === 'Failed to fetch' ? 'mất kết nối' : e.message) + ')');
    }
    S.uploading--;
  }
  S.version = null; await load(true);
  if(bad.length) toast('Công việc đã lưu nhưng ' + bad.length + ' tệp chưa tải lên được: ' + bad.join('; ') + '. Mở công việc để thêm lại.', 'error');
  else toast('Đã đính kèm ' + ok + ' tệp vào công việc.');
}

/* ----- Chi tiết trên bảng: chỉ đọc nội dung ----- */
const curTask = () => (S.draft && S.data ? S.data.tasks.find(x => x.id === S.draft.id) : null) || null;
function openDetail(id){
  const t = S.data.tasks.find(x => x.id === id); if(!t) return;
  S.draft = JSON.parse(JSON.stringify(t)); S.draft.isNew = false; S.draft.readOnly = false; S.draft.kind = 'detail'; S.draft.reassign = false; S.draft.folEdit = false; S.draft.followerIds = [...fids(t)]; S.detail = null; S.mention = new Set();
  const ed = canEdit(t);
  openModal(`
    ${modalHeader('Chi tiết công việc', `Tạo bởi ${esc(user(t.createdBy || (t.assigneeIds[0] || '')).name)} · ${t.createdAt ? fmtDT(t.createdAt) : ''}${t.reportId ? ' · Từ báo cáo tuần' : ''}`)}
    <div class="p-6 grid md:grid-cols-5 gap-6 m-detail">
      <div class="md:col-span-3 space-y-5 min-w-0 m-col-main">
        <div id="tk-head"></div>
        <div class="m-last"><label class="label">Việc con / Checklist <span id="tk-subcount" class="font-normal text-gray-400"></span></label><div id="tk-subs"></div></div>
        <div><div class="flex items-center justify-between"><label class="label">Tệp đính kèm</label>${ed ? `<label class="btn btn-ghost btn-sm cursor-pointer">${WI.clip} Thêm tệp<input type="file" multiple class="hidden" id="tk-file" onchange="event.stopPropagation();W.pickFiles(this)" accept=".${OK_EXT.join(',.')}"></label>` : ''}</div><div id="tk-att" class="space-y-1.5"><div class="text-[12.5px] text-gray-400">Đang tải...</div></div></div>
        <div><label class="label">Bình luận</label><div id="tk-cm" class="space-y-3"></div>
          <div class="mt-3 relative">
            ${richEditor('tk-cmt', { placeholder: 'Viết bình luận... gõ @ để nhắc tên đồng nghiệp', minHeight: 70, nodirty: true, onInput: 'event.stopPropagation();W.cmInput(this)', onKeyDown: 'W.cmKey(event)' })}
            <div id="tk-mention" class="hidden absolute left-2 right-2 z-10 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" style="bottom:100%"></div>
            <div class="flex items-center justify-between mt-2"><span class="text-[12px] text-gray-400 desk-only">Ctrl + Enter để gửi</span><button class="btn btn-primary btn-sm" id="tk-cm-send" onclick="W.postComment()">${I.chat} Gửi</button></div>
          </div></div>
      </div>
      <div class="md:col-span-2 space-y-4 min-w-0" id="tk-side"></div>
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-2">
      <div>${canDelete(t) ? `<button class="btn btn-danger" onclick="W.deleteTask('${t.id}', true)">${I.trash} Xoá</button>` : ''}</div>
      <div class="flex gap-2">${canEditContent(t) ? `<button class="btn btn-ghost" onclick="W.gotoCreated()">${I.edit} Sửa tên / mô tả (Việc tôi tạo)</button>` : ''}<button class="btn btn-ghost" onclick="A.cancelModal()">Đóng</button></div>
    </div>`, 'max-w-4xl');
  paintHead(); paintSubsView(); paintSide();
  loadDetail(t.id);
}
function paintHead(){
  const el = $('tk-head'), t = curTask() || S.draft; if(!el || !t) return;
  const why = t.seriesId ? 'Việc sinh từ lịch lặp lại — muốn đổi tên/mô tả hãy sửa ở mục Việc lặp lại.'
    : t.createdBy ? `Chỉ ${esc(user(t.createdBy).name)} (người tạo) sửa được tên và mô tả, ở mục Việc tôi tạo.` : 'Tên và mô tả của việc đã tạo không sửa được.';
  const kr = krRef(t);
  el.innerHTML = `
    ${kr ? `<div class="mb-2.5 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-[12.5px] text-amber-900"><div><span class="font-semibold">Thuộc KR:</span> ${esc(kr.k.title)}</div><div class="text-amber-700 mt-0.5"><span class="font-medium">Mục tiêu:</span> ${esc(kr.o.title)}</div></div>` : ''}
    <div class="text-[17px] font-semibold text-slate-900 leading-snug break-words ${t.status === 'done' ? 'line-through text-gray-500' : ''}">${esc(t.title)}</div>
    <div class="mt-2 text-[14px] text-slate-700 whitespace-pre-wrap break-words">${richPlain(t.description).trim() ? richHtml(t.description) : '<span class="text-gray-400">Chưa có mô tả.</span>'}</div>
    <div class="mt-3 text-[12px] text-gray-400 flex items-start gap-1.5"><span class="mt-0.5 shrink-0">${WI.lock}</span><span>${why}</span></div>`;
}
function paintSubsView(){
  const el = $('tk-subs'), t = curTask() || S.draft; if(!el || !t) return;
  const subs = t.subtasks || [], ed = canEdit(t), dn = subs.filter(s => s.done).length;
  const cnt = $('tk-subcount'); if(cnt) cnt.textContent = subs.length ? `(${dn}/${subs.length})` : '';
  el.innerHTML = subs.length ? `<div class="mb-2">${progressBar(Math.round(dn / subs.length * 100), 'bg-green-500', 'h-1.5')}</div>
    <div class="space-y-1.5">${subs.map(s => `<label class="flex items-center gap-2 text-[13.5px] ${ed ? 'cursor-pointer' : ''}"><input type="checkbox" class="checkbox shrink-0" ${s.done ? 'checked' : ''} ${ed ? '' : 'disabled'} onchange="event.stopPropagation();W.subTick('${esc(s.id)}',this.checked)"><span class="${s.done ? 'line-through text-gray-400' : 'text-slate-700'}">${esc(s.text)}</span></label>`).join('')}</div>`
    : '<div class="text-[12.5px] text-gray-400">Không có việc con.</div>';
}
async function subTick(subId, done){
  if(!S.draft) return;
  await actQuiet('toggleSubtask', { id: S.draft.id, subId, done });
  S.version = null; await load(true); modalDirty = false; paintSubsView();
}
function paintSide(){
  const el = $('tk-side'), t = curTask(); if(!el || !t) return;
  const p = projById(t.projectId), ed = canEdit(t);
  el.innerHTML = `
    ${followerOnly(t) ? `<div class="text-[12.5px] text-slate-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-start gap-1.5"><span class="mt-0.5 shrink-0">${WI.eye}</span><span>Bạn đang theo dõi việc này (chỉ xem và bình luận).</span></div>` : ''}
    <div><label class="label">Dự án</label><div class="flex items-center gap-2 text-[14px] text-slate-700 py-1.5">${projDot(p)}${esc(p ? p.name : '?')}</div></div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="label">Trạng thái</label>${ed ? `<select class="input" onchange="W.detailStatus(this.value)">${STATUS_KEYS.map(k => `<option value="${k}" ${t.status === k ? 'selected' : ''}>${STATUS[k].t}</option>`).join('')}</select>` : `<div class="py-1.5">${statusBadge(t.status)}</div>`}</div>
      <div><label class="label">Ưu tiên</label><div class="py-1.5">${prioBadge(t.priority)}</div></div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div><label class="label">Ngày bắt đầu</label><div class="py-1.5 text-[14px] ${t.startDate ? 'text-slate-700' : 'text-gray-400'}">${t.startDate ? fmt(t.startDate) : '—'}</div></div>
      <div><label class="label">Hạn chót</label><div class="py-1.5 text-[14px]">${dueHtml(t)}</div></div>
    </div>
    <div><label class="label">Thời gian hoàn thành</label><div class="py-1.5 text-[14px] ${t.estHours ? 'text-slate-700' : 'text-gray-400'}">${t.estHours ? hoursText(t.estHours) : '—'}</div></div>
    <div><label class="label">Người thực hiện</label><div id="tk-asg"></div></div>
    <div><label class="label">Người theo dõi</label><div id="tk-fol"></div></div>
    <div><label class="label">Nhãn</label><div class="flex flex-wrap gap-1.5">${t.tags.length ? tagChips(t.tags) : '<span class="text-[12.5px] text-gray-400">Không có</span>'}</div></div>
    ${t.seriesId || t.recurrence ? `<div class="text-[12.5px] text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-2">${WI.repeat} Việc lặp lại${t.recurrence ? ': ' + esc(recText(t.recurrence)) : ''}. Lịch lặp được tạo và sửa ở mục <a class="underline cursor-pointer" onclick="W.gotoRec()">Việc lặp lại</a>.</div>` : ''}`;
  paintAsgView(); paintFollowers();
}
async function detailStatus(v){ if(!S.draft) return; await move(S.draft.id, v, ''); modalDirty = false; paintHead(); paintSide(); }

/* ----- Giao lại (người nhận / người tạo / cấp trên; giao cho bất kỳ ai) ----- */
function paintAsgView(){
  const el = $('tk-asg'), t = curTask(); if(!el || !t) return;
  if(S.draft.reassign){ paintAssignees(); return; }
  el.innerHTML = `<div class="flex flex-wrap gap-1.5">${t.assigneeIds.map(id => `<span class="inline-flex items-center gap-1.5 bg-base-50 text-base-700 rounded-full pl-1 pr-2.5 py-0.5 text-[12.5px]">${avatar(user(id), 'w-5 h-5 text-[9px]')}${esc(user(id).name)}</span>`).join('') || '<span class="text-[12.5px] text-gray-400">Chưa giao cho ai</span>'}</div>
    ${canEdit(t) ? `<button class="btn btn-ghost btn-sm mt-2" onclick="W.reassignStart()">${I.edit} Giao lại cho người khác</button>` : ''}`;
}
function reassignStart(){ const t = curTask(); if(!t || !canEdit(t)) return; S.draft.reassign = true; S.draft.assigneeIds = [...t.assigneeIds]; paintAsgView(); }
function reassignCancel(){ if(!S.draft) return; S.draft.reassign = false; modalDirty = false; paintAsgView(); }
async function reassignSave(){
  const t = curTask(); if(!t || !S.draft) return;
  const ids = S.draft.assigneeIds; if(!ids.length){ toast('Cần ít nhất 1 người thực hiện.', 'error'); return; }
  const j = await act('reassignTask', { id: t.id, assigneeIds: ids }, 'Đã giao lại công việc.');
  if(!S.draft) return;
  S.draft.reassign = false; modalDirty = false;
  if(!j){ paintAsgView(); return; }
  const now = curTask();
  if(!now){ A.closeModal(); S.draft = null; toast('Công việc đã chuyển cho người khác nên bạn không còn thấy nó.', 'info'); return; }
  S.draft.assigneeIds = [...now.assigneeIds]; paintSide(); loadDetail(now.id);
}
/* ----- Người theo dõi (chỉ xem + bình luận) -----
   Form tạo/sửa: chọn nhiều người ngay trong form. Chi tiết việc: xem, và nếu có quyền (người tạo / người nhận / Giám đốc — cờ canFollow) bấm "Sửa người theo dõi" → Lưu/Huỷ → setFollowers. */
const folChip = (id, rm) => `<span class="inline-flex items-center gap-1.5 bg-gray-100 text-slate-700 rounded-full pl-1 pr-2 py-0.5 text-[12.5px]">${avatar(user(id), 'w-5 h-5 text-[9px]')}${esc(user(id).name)}${rm ? `<button class="text-gray-400 hover:text-red-600" title="Bỏ theo dõi" onclick="W.folToggle('${id}')">${I.x}</button>` : ''}</span>`;
function paintFollowers(){
  const el = $('tk-fol'), dr = S.draft; if(!el || !dr) return;
  const detail = dr.kind === 'detail', t = detail ? curTask() : null;
  if(detail && !t) return;
  const editing = detail ? !!dr.folEdit : !ro();
  if(!editing){
    const ids = detail ? fids(t) : dr.followerIds;
    el.innerHTML = `<div class="flex flex-wrap gap-1.5">${ids.map(id => folChip(id, false)).join('') || '<span class="text-[12.5px] text-gray-400">Chưa có</span>'}</div>
      ${detail && canFollowUI(t) ? `<button class="btn btn-ghost btn-sm mt-2" onclick="W.followStart()">${I.edit} Sửa người theo dõi</button>` : ''}`;
    return;
  }
  const asg = new Set(detail ? t.assigneeIds : dr.assigneeIds), sel = new Set(dr.followerIds);
  const opts = activeUsers().filter(u => !asg.has(u.id));
  const extra = dr.followerIds.filter(id => !opts.some(u => u.id === id)).map(user);
  const list = [...opts, ...extra].sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || a.name.localeCompare(b.name, 'vi'));
  el.innerHTML = `
    <div class="flex flex-wrap gap-1.5 mb-2">${dr.followerIds.map(id => folChip(id, true)).join('') || '<span class="text-[12.5px] text-gray-400">Chưa có ai theo dõi</span>'}</div>
    ${list.length > 6 ? `<input class="input !py-1.5 text-[13px] mb-1.5" placeholder="Tìm người..." oninput="W.filterFol(this.value)">` : ''}
    <div class="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100" id="tk-fol-list">${list.map(u => `<label class="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 text-[13px]" data-n="${esc(u.name.toLowerCase())}"><input type="checkbox" class="checkbox" ${sel.has(u.id) ? 'checked' : ''} onchange="event.stopPropagation();W.folToggle('${u.id}')">${avatar(u, 'w-5 h-5 text-[9px]')}<span class="truncate flex-1">${esc(u.name)}${u.id === meId() ? ' (tôi)' : ''}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}</span></label>`).join('')}</div>
    ${detail ? `<div class="flex gap-2 mt-2"><button class="btn btn-primary btn-sm" onclick="W.followSave()">${I.check} Lưu</button><button class="btn btn-ghost btn-sm" onclick="W.followCancel()">Huỷ</button></div>` : ''}
    <div class="text-[11.5px] text-gray-400 mt-1">Chỉ xem và bình luận. Người đang thực hiện việc không cần thêm vào đây.</div>`;
}
function folToggle(id){
  const a = S.draft.followerIds, i = a.indexOf(id);
  if(i >= 0) a.splice(i, 1); else a.push(id);
  modalDirty = true; paintFollowers();
}
function filterFol(v){ v = v.trim().toLowerCase(); document.querySelectorAll('#tk-fol-list label').forEach(l => { l.style.display = !v || l.dataset.n.includes(v) ? '' : 'none'; }); }
function followStart(){ const t = curTask(); if(!t || !canFollowUI(t)) return; S.draft.folEdit = true; S.draft.followerIds = [...fids(t)]; paintFollowers(); }
function followCancel(){ const t = curTask(); if(!S.draft) return; S.draft.folEdit = false; S.draft.followerIds = [...fids(t)]; modalDirty = false; paintFollowers(); }
async function followSave(){
  const t = curTask(); if(!t || !S.draft) return;
  const ids = S.draft.followerIds.filter(id => !t.assigneeIds.includes(id));
  const j = await act('setFollowers', { id: t.id, followerIds: ids }, 'Đã cập nhật người theo dõi.');
  if(!S.draft) return;
  S.draft.folEdit = false; modalDirty = false;
  if(!j){ paintFollowers(); return; }
  const now = curTask();
  if(!now){ A.closeModal(); S.draft = null; toast('Bạn không còn theo dõi việc này nên không còn thấy nó.', 'info'); return; }
  S.draft.followerIds = [...fids(now)]; S.draft.assigneeIds = [...now.assigneeIds]; paintSide(); loadDetail(now.id);
}
function gotoCreated(){ A.closeModal(); S.draft = null; setMode('created'); }
function gotoRec(){ A.closeModal(); S.draft = null; setMode('rec'); }

/* ----- Việc con ----- */
function paintSubs(){
  const el = $('tk-subs'); if(!el) return;
  const subs = S.draft.subtasks, r = ro();
  const dn = subs.filter(s => s.done).length;
  const cnt = $('tk-subcount'); if(cnt) cnt.textContent = subs.length ? `(${dn}/${subs.length})` : '';
  el.innerHTML = `
    ${subs.length ? `<div class="mb-2">${progressBar(Math.round(dn / subs.length * 100), 'bg-green-500', 'h-1.5')}</div>` : ''}
    <div class="space-y-1.5">${subs.map((s, i) => `<div class="flex items-center gap-2 group">
      <input type="checkbox" class="checkbox shrink-0" ${s.done ? 'checked' : ''} ${r ? 'disabled' : ''} onchange="event.stopPropagation();W.subToggle(${i})">
      <input class="input !py-1 !px-2 text-[13.5px] ${s.done ? 'line-through text-gray-400' : ''}" value="${esc(s.text)}" maxlength="300" ${r ? 'disabled' : ''} oninput="W.subText(${i},this.value)">
      ${r ? '' : `<button class="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100" title="Xoá" onclick="W.subDel(${i})">${I.x}</button>`}</div>`).join('')}</div>
    ${r ? '' : `<div class="flex gap-2 mt-2"><input id="tk-newsub" class="input !py-1.5 text-[13.5px]" placeholder="Thêm việc con, nhấn Enter..." onkeydown="if(event.key==='Enter'){event.preventDefault();W.subAdd()}"><button class="btn btn-ghost btn-sm" onclick="W.subAdd()">${I.plus}</button></div>`}`;
}
function subAdd(){ const el = $('tk-newsub'), v = el.value.trim(); if(!v) return; S.draft.subtasks.push({ id: newId('s'), text: v, done: false }); modalDirty = true; paintSubs(); const n = $('tk-newsub'); if(n) n.focus(); }
function subToggle(i){ S.draft.subtasks[i].done = !S.draft.subtasks[i].done; modalDirty = true; paintSubs(); }
function subText(i, v){ S.draft.subtasks[i].text = v; }
function subDel(i){ S.draft.subtasks.splice(i, 1); modalDirty = true; paintSubs(); }

/* ----- Người thực hiện ----- */
function paintAssignees(){
  const el = $('tk-asg'); if(!el) return;
  const p = projById(S.draft.projectId), r = ro(), sel = new Set(S.draft.assigneeIds);
  const opts = assignable();
  const extra = S.draft.assigneeIds.filter(id => !opts.some(u => u.id === id)).map(user);          // đã được giao nhưng ngoài phạm vi chọn của bạn
  const list = [...opts, ...extra].sort((a, b) => (sel.has(b.id) - sel.has(a.id)) || a.name.localeCompare(b.name, 'vi'));
  el.innerHTML = `
    <div class="flex flex-wrap gap-1.5 mb-2">${S.draft.assigneeIds.map(id => `<span class="inline-flex items-center gap-1.5 bg-base-50 text-base-700 rounded-full pl-1 pr-2 py-0.5 text-[12.5px]">${avatar(user(id), 'w-5 h-5 text-[9px]')}${esc(user(id).name)}${r ? '' : `<button class="text-base-700/60 hover:text-red-600" onclick="W.asgToggle('${id}')">${I.x}</button>`}</span>`).join('') || '<span class="text-[12.5px] text-gray-400">Chưa giao cho ai</span>'}</div>
    ${r ? '' : `${list.length > 6 ? `<input class="input !py-1.5 text-[13px] mb-1.5" placeholder="Tìm người..." oninput="W.filterAsg(this.value)">` : ''}
    <div class="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-100" id="tk-asg-list">${list.map(u => `<label class="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 text-[13px]" data-n="${esc(u.name.toLowerCase())}"><input type="checkbox" class="checkbox" ${sel.has(u.id) ? 'checked' : ''} onchange="event.stopPropagation();W.asgToggle('${u.id}')">${avatar(u, 'w-5 h-5 text-[9px]')}<span class="truncate flex-1">${esc(u.name)}${u.id === meId() ? ' (tôi)' : ''}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}</span></label>`).join('')}</div>
    ${S.draft.reassign ? `<div class="flex gap-2 mt-2"><button class="btn btn-primary btn-sm" onclick="W.reassignSave()">${I.check} Lưu giao lại</button><button class="btn btn-ghost btn-sm" onclick="W.reassignCancel()">Huỷ</button></div><div class="text-[11.5px] text-gray-400 mt-1">Giao cho bất kỳ ai. Việc giao lại được ghi vào bình luận.</div>` : '<div class="text-[11.5px] text-gray-400 mt-1">Giao được cho bất kỳ ai trong công ty.</div>'}`}`;
}
function asgToggle(id){
  const a = S.draft.assigneeIds, i = a.indexOf(id);
  if(i >= 0){ if(a.length === 1){ toast('Cần ít nhất 1 người thực hiện.', 'error'); paintAssignees(); return; } a.splice(i, 1); } else a.push(id);
  modalDirty = true; paintAssignees();
  if(S.draft.kind !== 'detail'){ S.draft.followerIds = S.draft.followerIds.filter(f => !a.includes(f)); paintFollowers(); }   // người đang thực hiện không đồng thời theo dõi
}
function filterAsg(v){ v = v.trim().toLowerCase(); document.querySelectorAll('#tk-asg-list label').forEach(l => { l.style.display = !v || l.dataset.n.includes(v) ? '' : 'none'; }); }

/* ----- Nhãn ----- */
function paintTags(){
  const el = $('tk-tags'); if(!el) return; const r = ro();
  const known = [...new Set(S.data.tasks.flatMap(t => t.tags))].filter(g => !S.draft.tags.includes(g)).slice(0, 12);
  el.innerHTML = `
    <div class="flex flex-wrap gap-1.5 mb-1.5">${S.draft.tags.map((g, i) => `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[12px] font-medium">${esc(g)}${r ? '' : `<button class="text-indigo-400 hover:text-red-600" onclick="W.tagDel(${i})">${I.x}</button>`}</span>`).join('') || (r ? '<span class="text-[12.5px] text-gray-400">Không có</span>' : '')}</div>
    ${r ? '' : `<input id="tk-newtag" class="input !py-1.5 text-[13px]" placeholder="Nhập nhãn rồi Enter..." maxlength="30" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();W.tagAdd(this.value)}">
    ${known.length ? `<div class="flex flex-wrap gap-1 mt-1.5">${known.map(g => `<button class="px-1.5 py-0.5 rounded border border-dashed border-gray-300 text-gray-500 text-[11.5px] hover:border-indigo-400 hover:text-indigo-600" onclick="W.tagAdd('${esc(g).replace(/'/g, '&#39;')}')">+ ${esc(g)}</button>`).join('')}</div>` : ''}`}`;
}
function tagAdd(v){ v = String(v).trim().slice(0, 30); if(v && !S.draft.tags.includes(v) && S.draft.tags.length < 12){ S.draft.tags.push(v); modalDirty = true; } paintTags(); const n = $('tk-newtag'); if(n) n.focus(); }
function tagDel(i){ S.draft.tags.splice(i, 1); modalDirty = true; paintTags(); }

/* ----- Lặp lại ----- */
function paintRecurrence(){
  const el = $('tk-rec'); if(!el) return; const r = ro(), rule = S.draft.recurrence, type = rule ? rule.type : '';
  const nx = rule ? nextDueOf(rule, S.draft.due || today()) : null;
  el.innerHTML = `
    <select class="input" ${r ? 'disabled' : ''} onchange="W.recType(this.value)">
      ${S.draft.kind === 'recurring' ? '' : `<option value="" ${!type ? 'selected' : ''}>Không lặp lại</option>`}<option value="daily" ${type === 'daily' ? 'selected' : ''}>Theo ngày</option><option value="weekly" ${type === 'weekly' ? 'selected' : ''}>Theo tuần</option><option value="monthly" ${type === 'monthly' ? 'selected' : ''}>Theo tháng</option>
    </select>
    ${type === 'daily' ? `<div class="flex items-center gap-2 mt-2 text-[13px] text-slate-600">Cứ mỗi <input type="number" min="1" max="365" class="input !w-20 !py-1" value="${rule.interval || 1}" ${r ? 'disabled' : ''} onchange="W.recSet('interval',Math.max(1,Math.min(365,Number(this.value)||1)))"> ngày</div>` : ''}
    ${type === 'weekly' ? `<div class="flex gap-1 mt-2">${[1, 2, 3, 4, 5, 6, 7].map(n => `<button type="button" ${r ? 'disabled' : ''} class="w-9 h-8 rounded-md text-[12.5px] font-medium border ${rule.weekdays.includes(n) ? 'bg-base-500 text-white border-base-500' : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-50'}" onclick="W.recWd(${n})">${WD[n]}</button>`).join('')}</div>` : ''}
    ${type === 'monthly' ? `<div class="flex items-center gap-2 mt-2 text-[13px] text-slate-600">Vào ngày <input type="number" min="1" max="31" class="input !w-20 !py-1" value="${rule.monthDay}" ${r ? 'disabled' : ''} onchange="W.recSet('monthDay',Math.max(1,Math.min(31,Number(this.value)||1)))"> hằng tháng</div><div class="text-[11.5px] text-gray-400 mt-1">Tháng không có ngày này sẽ lấy ngày cuối tháng.</div>` : ''}
    ${rule ? `<div class="flex items-center gap-2 mt-2 text-[13px] text-slate-600">Kết thúc <input type="date" class="input !w-40 !py-1" value="${esc(rule.end || '')}" ${r ? 'disabled' : ''} onchange="W.recSet('end',this.value)"><span class="text-[11.5px] text-gray-400">(tuỳ chọn)</span></div>
      <div class="mt-2 text-[12.5px] ${nx ? 'text-indigo-700 bg-indigo-50' : 'text-amber-700 bg-amber-50'} rounded-lg px-2.5 py-2">${WI.repeat} ${nx ? `Việc mới sẽ <b>tự xuất hiện đúng lịch</b>, lần kế tiếp vào ngày <b>${fmt(nx)}</b> — dù việc trước đã hoàn thành hay chưa.` : 'Chưa có lần lặp kế tiếp (kiểm tra thứ trong tuần / ngày kết thúc).'}</div>` : ''}`;
}
function recType(v){
  if(!v) S.draft.recurrence = null;
  else if(v === 'daily') S.draft.recurrence = { type: 'daily', interval: 1, end: '' };
  else if(v === 'weekly'){ const wd = S.draft.due ? (pIso(S.draft.due).getUTCDay() || 7) : (new Date().getDay() || 7); S.draft.recurrence = { type: 'weekly', weekdays: [wd], end: '' }; }
  else S.draft.recurrence = { type: 'monthly', monthDay: S.draft.due ? Number(S.draft.due.slice(8, 10)) : new Date().getDate(), end: '' };
  if(v && !S.draft.due){ S.draft.due = today(); if(S.draft.isNew){ const di = document.querySelector('#modal input[type=date]'); if(di) di.value = S.draft.due; } }
  modalDirty = true; paintRecurrence();
}
function recSet(k, v){ S.draft.recurrence[k] = v; modalDirty = true; paintRecurrence(); }
function recWd(n){
  const w = S.draft.recurrence.weekdays, i = w.indexOf(n);
  if(i >= 0){ if(w.length === 1){ toast('Chọn ít nhất 1 ngày trong tuần.', 'error'); return; } w.splice(i, 1); } else { w.push(n); w.sort((a, b) => a - b); }
  modalDirty = true; paintRecurrence();
}

/* ----- Lưu / xoá ----- */
async function saveTask(){
  const t = S.draft; if(!t || t.readOnly || t.kind !== 'task') return;
  const title = t.title.trim(); if(!title){ toast('Nhập tên công việc.', 'error'); const el = $('tk-title'); if(el) el.focus(); return; }
  if(!t.startDate){ toast('Chọn ngày bắt đầu của công việc.', 'error'); const el = $('tk-start'); if(el) el.focus(); return; }
  if(t.due && t.startDate > t.due){ toast('Ngày bắt đầu không được sau hạn chót.', 'error'); return; }
  if(badHours(t.estHours)){ toast('Thời gian hoàn thành phải là số giờ lớn hơn 0 (VD: 2 hoặc 1.5).', 'error'); const el = $('tk-hours'); if(el) el.focus(); return; }
  const btn = $('tk-save'); if(btn){ btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  const payload = { id: t.id, projectId: t.projectId, title, description: richGet('tk-desc'), priority: t.priority, assigneeIds: t.assigneeIds, followerIds: t.followerIds.filter(id => !t.assigneeIds.includes(id)), startDate: t.startDate, due: t.due,
    estHours: hoursVal(t.estHours), tags: t.tags, subtasks: t.subtasks.filter(s => s.text.trim()), okrId: t.okrId || null };
  if(t.isNew) payload.status = t.status;
  const j = await act('saveTask', { task: payload });
  if(j){ const isNew = t.isNew, files = t.files || []; A.closeModal(); S.draft = null; toast(isNew ? 'Đã thêm công việc.' : 'Đã lưu nội dung công việc.'); spawnNotice(j); if(files.length) uploadQueued(t.id, files); }
  else if(btn){ btn.disabled = false; btn.innerHTML = I.check + ' ' + (t.isNew ? 'Thêm công việc' : 'Lưu thay đổi'); }
}
async function deleteTask(id, fromModal){
  const t = S.data.tasks.find(x => x.id === id); if(!t) return;
  if(!confirm('Xoá công việc "' + t.title + '"? Bình luận và tệp đính kèm cũng bị xoá, không khôi phục được.')) return;
  if(fromModal) A.closeModal();
  await act('deleteTask', { id }, 'Đã xoá công việc.');
}
async function setStatus(id, status){ await move(id, status, ''); }
async function toggleDone(id){ const t = S.data.tasks.find(x => x.id === id); if(t) await move(id, t.status === 'done' ? 'todo' : 'done', ''); }

/* ----- Bình luận & tệp (tải riêng khi mở chi tiết) ----- */
async function loadDetail(id){
  try {
    const j = await wfetch(qurl('workTask=' + enc(id) + '&token=' + enc(token()) + '&t=' + Date.now()));
    if(!S.draft || S.draft.id !== id) return;
    S.detail = j; paintComments(); paintAttachments(); if($('tk-side')) paintSide();   // paintSide: cập nhật nút "Sửa người theo dõi" theo cờ canFollow của máy chủ
  } catch(e){
    if(e.auth){ A.closeModal(); forceLogout(e.message); return; }
    const a = $('tk-att'); if(a) a.innerHTML = `<div class="text-[12.5px] text-red-600">${esc(e.message)}</div>`;
  }
}
/** Văn bản bình luận → HTML an toàn (thuần hoặc có định dạng): tô màu các @Tên đã biết (một lượt, tên dài ưu tiên), giữ xuống dòng. */
function fmtComment(text){
  const names = DB.users.map(u => esc(u.name)).filter(Boolean).sort((a, b) => b.length - a.length);
  if(!names.length) return richHtml(text);
  const re = new RegExp('@(?:' + names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  return richHtml(text, h => h.replace(re, m => `<span class="text-base-600 font-medium bg-base-50 rounded px-1">${m}</span>`));
}
function paintComments(){
  const el = $('tk-cm'); if(!el || !S.detail) return;
  const cs = S.detail.comments;
  el.innerHTML = cs.length ? cs.map(c => { const a = user(c.authorId), mine = c.authorId === meId(); return `
    <div class="flex gap-2.5">${avatar(a, 'w-8 h-8 text-[11px]')}
      <div class="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2">
        <div class="flex items-center gap-2 text-[12px]"><span class="font-semibold text-slate-900">${esc(a.name)}</span><span class="text-gray-400">${fmtDT(c.createdAt)}</span>${mine || isDir() ? `<button class="ml-auto text-gray-400 hover:text-red-600" title="Xoá bình luận" onclick="W.delComment('${c.id}')">${I.trash}</button>` : ''}</div>
        <div class="text-[13.5px] text-slate-700 mt-0.5 break-words">${fmtComment(c.text)}</div>
      </div></div>`; }).join('') : '<div class="text-[12.5px] text-gray-400">Chưa có bình luận nào.</div>';
}
const fileUrl = id => apiUrl() + 'file/' + enc(id) + '?token=' + enc(token());
const sizeText = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
function paintAttachments(){
  const el = $('tk-att'); if(!el || !S.detail) return;
  const as = S.detail.attachments;
  el.innerHTML = (as.length ? as.map(a => { const img = /^image\//.test(a.mime) && a.mime !== 'image/heic'; return `
    <div class="flex items-center gap-2.5 border border-gray-200 rounded-lg p-2 hover:bg-gray-50">
      ${img ? `<a href="${fileUrl(a.id)}" target="_blank" rel="noopener"><img src="${fileUrl(a.id)}" alt="" class="w-10 h-10 object-cover rounded border border-gray-200"></a>` : `<div class="w-10 h-10 rounded bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold uppercase">${esc((a.name.split('.').pop() || '').slice(0, 4))}</div>`}
      <div class="min-w-0 flex-1"><a class="text-[13px] font-medium text-base-600 hover:underline truncate block" href="${fileUrl(a.id)}" target="_blank" rel="noopener" title="${esc(a.name)}">${esc(a.name)}</a><div class="text-[11.5px] text-gray-400">${sizeText(a.size)} · ${esc(user(a.uploadedBy).name)} · ${fmtDT(a.createdAt)}</div></div>
      ${canEdit(curTask() || S.draft) && (a.uploadedBy === meId() || S.detail.canEdit) ? `<button class="text-gray-400 hover:text-red-600 p-1" title="Xoá tệp" onclick="W.delAttachment('${a.id}')">${I.trash}</button>` : ''}</div>`; }).join('') : '<div class="text-[12.5px] text-gray-400">Chưa có tệp nào.</div>')
    + (S.uploading ? `<div class="text-[12.5px] text-amber-600 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>Đang tải lên ${S.uploading} tệp...</div>` : '');
}
async function pickFiles(input){
  const files = [...input.files]; input.value = ''; if(!files.length || !S.draft) return;
  const taskId = S.draft.id;
  for(const f of files){
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if(!OK_EXT.includes(ext)){ toast('Không hỗ trợ tệp .' + ext + ' (' + f.name + ').', 'error'); continue; }
    if(f.size > MAX_MB * 1048576){ toast(f.name + ' lớn hơn ' + MAX_MB + 'MB.', 'error'); continue; }
    if(!f.size){ toast(f.name + ' là tệp rỗng.', 'error'); continue; }
    S.uploading++; paintAttachments();
    try {
      await wfetch(apiUrl() + 'upload?taskId=' + enc(taskId) + '&name=' + enc(f.name), { method:'POST', headers:{ 'X-Okr-Token': token(), 'Content-Type':'application/octet-stream' }, body: f });
    } catch(e){
      if(e.auth){ S.uploading = 0; A.closeModal(); forceLogout(e.message); return; }
      toast(f.name + ': ' + (e.message === 'Failed to fetch' ? 'tải lên thất bại, kiểm tra kết nối.' : e.message), 'error');
    }
    S.uploading--;
  }
  S.version = null;
  if(S.draft && S.draft.id === taskId){ await loadDetail(taskId); load(true); }
}
async function delAttachment(id){
  if(!confirm('Xoá tệp này?')) return;
  const j = await actQuiet('deleteAttachment', { id }); if(!j) return;
  if(S.draft) await loadDetail(S.draft.id); load(true);
}
/** Giống act() nhưng không tải lại cả bảng ngay (dùng khi khung chi tiết đang mở và tự tải phần của nó). */
async function actQuiet(action, payload){
  try { const j = await wfetch(apiUrl(), { method:'POST', body: JSON.stringify({ action, payload, token: token(), lite: true }) }); S.version = null; return j; }
  catch(e){ if(e.auth){ A.closeModal(); forceLogout(e.message); return null; } toast(e.message, 'error'); return null; }
}
function mentionable(){
  const t = S.draft, p = projById(t.projectId), ids = new Set([...t.assigneeIds, ...fids(t), t.createdBy, ...(p ? p.memberIds : []), p ? p.managerId : '']);
  DB.users.forEach(u => { if(u.role === 'director') ids.add(u.id); });
  return [...ids].filter(id => id && id !== meId()).map(findUser).filter(u => u && isActive(u)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
/** Ngữ cảnh gõ @ trong vùng soạn contenteditable: dò trong nút văn bản chứa con trỏ (văn bản trước con trỏ). */
function mentionCtx(el){
  const sel = window.getSelection(); if(!el || !sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0), n = r.startContainer;
  if(!r.collapsed || n.nodeType !== 3 || !el.contains(n)) return null;
  const before = n.data.slice(0, r.startOffset), m = before.match(/@([^@\n]{0,30})$/);
  return m ? { n, off: r.startOffset, m, before } : null;
}
function cmInput(el){
  const box = $('tk-mention'); if(!box) return;
  const c = mentionCtx(el), m = c && c.m;
  if(!m){ box.classList.add('hidden'); return; }
  const q = norm(m[1]), list = mentionable().filter(u => !q || norm(u.name).includes(q)).slice(0, 8);
  if(!list.length){ box.classList.add('hidden'); return; }
  box.innerHTML = list.map(u => `<div class="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-base-50 text-[13px]" onmousedown="event.preventDefault();W.cmPick('${u.id}')">${avatar(u, 'w-5 h-5 text-[9px]')}<span class="flex-1">${esc(u.name)}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}</span></div>`).join('');
  box.classList.remove('hidden');
}
function cmPick(id){
  const el = $('tk-cmt'), u = findUser(id), c = u && mentionCtx(el); if(!c) return;
  const pre = c.before.slice(0, c.before.length - c.m[0].length), post = c.n.data.slice(c.off), ins = pre + '@' + u.name + ' ';
  c.n.data = ins + post;
  const r = document.createRange(), sel = window.getSelection(); r.setStart(c.n, ins.length); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); el.focus();
  S.mention.add(id); $('tk-mention').classList.add('hidden');
}
function cmKey(e){ if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); postComment(); } else if(e.key === 'Escape' && !$('tk-mention').classList.contains('hidden')){ e.stopPropagation(); $('tk-mention').classList.add('hidden'); } }
async function postComment(){
  const ta = $('tk-cmt'); if(!ta || !S.draft) return; const text = richGet(ta), plain = richPlain(text); if(!plain.trim()) return;
  const mentions = DB.users.filter(u => u.id !== meId() && plain.includes('@' + u.name)).map(u => u.id);
  const btn = $('tk-cm-send'); btn.disabled = true;
  const j = await actQuiet('addTaskComment', { comment: { id: newId('c'), taskId: S.draft.id, text, mentions } });
  const b2 = $('tk-cm-send'); if(b2) b2.disabled = false; if(!j) return;
  const e2 = $('tk-cmt'); if(e2) richSet(e2, ''); const mb = $('tk-mention'); if(mb) mb.classList.add('hidden');
  S.mention = new Set(); if(S.draft) await loadDetail(S.draft.id); load(true);
}
async function delComment(id){
  if(!confirm('Xoá bình luận này?')) return;
  const j = await actQuiet('deleteTaskComment', { id }); if(!j) return;
  if(S.draft) await loadDetail(S.draft.id); load(true);
}

/* ============================================================
   VIỆC CỦA TÔI · VIỆC TÔI TẠO — chung một bảng cá nhân
   - "Việc của tôi" (mine): mọi việc TÔI là người thực hiện, xuyên mọi dự án đang xem được (kể cả tự tạo – tự nhận), không gồm việc chỉ tạo cho người khác / chỉ theo dõi.
   - "Việc tôi tạo" (created): nơi người tạo sửa tên, mô tả và nội dung.
   ============================================================ */
const TAB_LABEL = {
  mine:    { open: 'Đang làm', done: 'Đã xong', all: 'Tất cả' },
  created: { open: 'Đang mở', done: 'Đã hoàn thành', all: 'Tất cả' },
};
/** Việc của tôi: tôi là người thực hiện. */
const mineTasks = o => scopeTasks(o).filter(t => t.assigneeIds.includes(meId()));
/** Việc tôi tạo (không tính việc sinh từ lịch lặp lại). */
const createdTasks = o => scopeTasks(o).filter(t => t.createdBy === meId() && !t.seriesId);
/** Việc đang mở xếp theo hạn (không hạn xuống cuối) rồi ưu tiên; việc đã xong xếp theo thời điểm hoàn thành mới nhất. */
function byUrgency(a, b){
  const ao = isOpen(a), bo = isOpen(b);
  if(ao !== bo) return ao ? -1 : 1;
  if(!ao) return (b.completedAt || b.createdAt || '').localeCompare(a.completedAt || a.createdAt || '');
  return (a.due || '9999').localeCompare(b.due || '9999') || PRIO[b.priority].w - PRIO[a.priority].w || (b.createdAt || '').localeCompare(a.createdAt || '');
}
/** Việc của tôi: chuyển giữa dạng Kanban (mặc định) và Danh sách. Kanban chỉ gồm việc tôi là người thực hiện, theo dự án đang chọn. */
function mineBoard(){
  const v = S.mineView === 'list' ? 'list' : 'kanban';
  const btn = (k, ic, label) => `<button class="btn btn-sm ${v === k ? 'btn-primary' : 'btn-ghost'}" onclick="W.setMineView('${k}')">${ic} ${label}</button>`;
  const sw = `<div class="flex items-center gap-2 mb-3"><span class="text-[12.5px] text-gray-500">Xem dạng:</span>${btn('kanban', WI.kanban, 'Kanban')}${btn('list', WI.list, 'Danh sách')}</div>`;
  if(v === 'list') return sw + personalView('mine');
  const q = S.f.q.trim().toLowerCase();
  const ts = mineTasks().filter(t => !q || t.title.toLowerCase().includes(q) || richPlain(t.description).toLowerCase().includes(q) || t.tags.some(g => g.toLowerCase().includes(q)));
  const note = mineTasks({ time: false }).length ? '' : '<div class="card p-4 mb-3 text-[13px] text-gray-500">Bạn chưa được giao công việc nào. Bấm "Thêm công việc" để tạo việc cho chính mình.</div>';
  return sw + note + kanban(ts);
}
function setMineView(v){ S.mineView = v === 'list' ? 'list' : 'kanban'; lsSet('okr_work_mine_view', S.mineView); repaint(); }
function personalView(kind){
  const mine = kind === 'mine', q = S.f.q.trim().toLowerCase(), tab = S.tabs[kind], lb = TAB_LABEL[kind];
  const all = mine ? mineTasks() : createdTasks();
  const inTab = (t, k) => k === 'all' ? true : k === 'open' ? isOpen(t) : !isOpen(t);
  const cnt = k => all.filter(t => inTab(t, k)).length;
  const ts = all.filter(t => inTab(t, tab) && (!q || t.title.toLowerCase().includes(q) || richPlain(t.description).toLowerCase().includes(q) || t.tags.some(g => g.toLowerCase().includes(q))))
    .sort(byUrgency);
  const tabBtn = k => `<span class="chip ${tab === k ? 'active' : ''}" onclick="W.setTab('${kind}','${k}')">${lb[k]} <span class="opacity-70">${cnt(k)}</span></span>`;
  const multi = S.project === 'all', th = (label, cls = 'px-2') => `<th class="text-left font-medium py-2.5 ${cls}">${label}</th>`;
  const giver = t => !t.createdBy ? '<span class="text-gray-400">—</span>'
    : t.createdBy === meId() ? '<span class="text-[12.5px] text-slate-600 whitespace-nowrap">Tôi</span>'
    : `<span class="inline-flex items-center gap-1.5 text-[12.5px] text-slate-700 whitespace-nowrap">${avatar(user(t.createdBy), 'w-5 h-5 text-[9px]')}${esc(user(t.createdBy).name)}</span>`;
  const head = mine
    ? `<b class="text-slate-800">Việc của tôi.</b> Mọi công việc bạn là người thực hiện, ở mọi dự án — gồm việc người khác giao và việc bạn tự tạo cho mình. Việc bạn chỉ tạo cho người khác nằm ở <a class="text-base-600 underline cursor-pointer" onclick="W.setMode('created')">Việc tôi tạo</a>; việc bạn theo dõi xem bằng bộ lọc <b>Tôi theo dõi</b> ở Kanban / Danh sách.`
    : `<b class="text-slate-800">Nơi tạo và sửa công việc.</b> Chỉ bạn — người tạo — sửa được <b>tên, mô tả</b>, ưu tiên, hạn, nhãn và việc con của các việc dưới đây. Trên bảng Kanban / Danh sách các trường này đã bị khoá; ở đó chỉ đổi trạng thái, giao lại, bình luận và đính kèm tệp.`;
  const hasAny = (mine ? mineTasks({ time: false }) : createdTasks({ time: false })).length > 0;
  const empty = all.length ? 'Không có việc nào trong mục này.' : hasAny ? 'Không có việc nào trong khung thời gian đã chọn.' : mine ? 'Bạn chưa được giao công việc nào. Bấm "Thêm công việc" để tạo việc cho chính mình.' : 'Bạn chưa tạo công việc nào ở đây. Bấm "Thêm công việc" để giao việc cho mọi người.';
  return `
  <div class="card p-4 mb-3 flex items-start justify-between gap-3 flex-wrap">
    <div class="text-[13px] text-slate-600 max-w-3xl">${head}</div>
    <button class="btn btn-primary" onclick="W.openTaskForm('')">${I.plus} Thêm công việc</button>
  </div>
  <div class="flex items-center gap-2 mb-3 flex-wrap">${tabBtn('open')}${tabBtn('done')}${tabBtn('all')}</div>
  <div class="card overflow-x-auto">
    <table class="w-full m-cards">
      <thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr>
        ${th('Công việc', 'px-3')}${multi ? th('Dự án') : ''}${th(mine ? 'Người giao' : 'Người thực hiện')}${th('Ưu tiên')}${th('Hạn')}${th('Trạng thái', 'px-2 w-36')}<th class="w-44"></th>
      </tr></thead>
      <tbody class="divide-y divide-gray-100">
        ${ts.length ? ts.slice(0, S.listLimit).map(t => { const p = projById(t.projectId); return `
        <tr class="hover:bg-gray-50 cursor-pointer ${t.status === 'done' ? 'opacity-70' : ''}" onclick="W.openTask('${t.id}')">
          <td class="mc-title py-3 px-3 max-w-md"><div class="font-medium text-slate-900 ${t.status === 'done' ? 'line-through text-gray-400' : ''}">${esc(t.title)}</div>
            ${krRef(t) || subProg(t) || folBadge(t) ? `<div class="mt-1 flex items-center gap-2 flex-wrap">${krChip(t)}${subProg(t)}${folBadge(t)}</div>` : ''}
            ${richPlain(t.description).trim() ? `<div class="text-[12.5px] text-gray-500 mt-0.5 truncate">${esc(richPlain(t.description).replace(/\s+/g, ' ').trim().slice(0, 140))}</div>` : ''}</td>
          ${multi ? `<td class="py-3 px-2 text-[12.5px] text-slate-600"><span class="inline-flex items-center gap-1.5 whitespace-nowrap">${projDot(p)}${esc(p ? p.name : '?')}</span></td>` : ''}
          <td class="py-3 px-2">${mine ? giver(t) : stack(t.assigneeIds, 4)}</td><td class="py-3 px-2">${prioBadge(t.priority)}</td><td class="py-3 px-2 text-[12.5px]">${dueHtml(t)}</td>
          <td class="mc-st py-3 px-2" ${mine ? 'onclick="event.stopPropagation()"' : ''}>${mine ? statusCell(t) : statusBadge(t.status)}</td>
          <td class="mc-act py-3 px-2 text-right whitespace-nowrap" onclick="event.stopPropagation()">${canEditContent(t) ? `<button class="btn btn-ghost btn-sm" onclick="W.openTaskForm('${t.id}')">${I.edit} Sửa nội dung</button>` : ''}${canDelete(t) ? `<button class="text-gray-400 hover:text-red-600 p-1 ml-1" title="Xoá" onclick="W.deleteTask('${t.id}')">${I.trash}</button>` : ''}</td>
        </tr>`; }).join('') + (ts.length > S.listLimit ? `<tr><td colspan="7" class="p-3 text-center"><button class="btn btn-ghost btn-sm" onclick="W.moreList()">Xem thêm ${Math.min(200, ts.length - S.listLimit)} việc (còn ${ts.length - S.listLimit})</button></td></tr>` : '') : `<tr><td colspan="7" class="p-10 text-center text-gray-400">${empty}</td></tr>`}
      </tbody>
    </table>
  </div>`;
}
function setTab(kind, k){ if(S.tabs[kind]) S.tabs[kind] = k; repaint(); }

/* ============================================================
   VIỆC LẶP LẠI — MỘT nơi duy nhất để tạo / sửa lịch lặp
   ============================================================ */
const REC_TYPES = [['daily', 'Hằng ngày'], ['weekly', 'Hằng tuần'], ['monthly', 'Hằng tháng']];
function recView(){
  const q = S.f.q.trim().toLowerCase();
  // Các mẫu trong phạm vi đang xem (dự án + ô tìm kiếm) — dùng để dựng danh sách người lọc và đếm "x / y"
  const base = (S.data.recurring || []).filter(r => (S.project === 'all' ? !(projById(r.projectId) || {}).archived : r.projectId === S.project)
    && (!q || r.title.toLowerCase().includes(q) || richPlain(r.description).toLowerCase().includes(q) || r.tags.some(g => g.toLowerCase().includes(q))));
  const f = S.rf;
  const people = [...new Set(base.flatMap(r => r.assigneeIds))].map(user).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const rs = base.filter(r => (f.who === 'all' || r.assigneeIds.includes(f.who)) && (f.pri === 'all' || r.priority === f.pri) && (f.type === 'all' || (r.rule && r.rule.type === f.type)))
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const filtering = f.who !== 'all' || f.pri !== 'all' || f.type !== 'all';
  const multi = S.project === 'all';
  return `
  <div class="card p-4 mb-3 flex items-start justify-between gap-3 flex-wrap">
    <div class="text-[13px] text-slate-600 max-w-3xl"><b class="text-slate-800">Nơi tạo và sửa việc lặp lại.</b> Ai cũng tạo được và giao cho bất kỳ ai. Việc mới <b>tự xuất hiện đúng ngày theo lịch</b>, dù việc trước đã <b>Hoàn thành</b> hay chưa (việc chưa xong vẫn giữ nguyên và hiện quá hạn). Sửa lịch hay nội dung ở đây chỉ áp dụng cho các việc sinh <b>sau</b> — việc đã sinh ra giữ nguyên và bị khoá tên, mô tả như mọi việc khác. Người sửa/xoá: người tạo và cấp trên của họ.</div>
    <button class="btn btn-primary" onclick="W.openRecurring('')">${I.plus} Thêm việc lặp lại</button>
  </div>
  <div class="flex items-center gap-2 flex-wrap mb-3">
    <span class="text-[12.5px] text-gray-500 font-medium">Lọc:</span>
    <select class="input !w-auto" onchange="W.setRF('who',this.value)" title="Lọc theo người thực hiện"><option value="all">Mọi người thực hiện</option>${people.map(u => `<option value="${esc(u.id)}" ${f.who === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
    <select class="input !w-auto" onchange="W.setRF('pri',this.value)" title="Lọc theo mức độ ưu tiên"><option value="all">Mọi mức ưu tiên</option>${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${f.pri === k ? 'selected' : ''}>${v.t}</option>`).join('')}</select>
    <select class="input !w-auto" onchange="W.setRF('type',this.value)" title="Lọc theo lịch lặp"><option value="all">Mọi lịch lặp</option>${REC_TYPES.map(([k, t]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
    ${filtering ? `<span class="chip active" title="Bỏ các bộ lọc" onclick="W.clearRF()">Xoá lọc ✕</span>` : ''}
    <span class="text-[12.5px] text-gray-400 ml-1">${filtering ? `Hiện ${rs.length} / ${base.length} việc lặp lại` : `${base.length} việc lặp lại`}</span>
  </div>
  <div class="card overflow-x-auto">
    <table class="w-full m-cards">
      <thead class="bg-gray-50 text-gray-500 text-[12px] uppercase tracking-wide"><tr>
        <th class="text-left font-medium py-2.5 px-3">Việc lặp lại</th>${multi ? '<th class="text-left font-medium py-2.5 px-2">Dự án</th>' : ''}<th class="text-left font-medium py-2.5 px-2">Người thực hiện</th><th class="text-left font-medium py-2.5 px-2">Ưu tiên</th><th class="text-left font-medium py-2.5 px-2">Lịch lặp</th><th class="text-left font-medium py-2.5 px-2">Việc đang mở</th><th class="w-36"></th>
      </tr></thead>
      <tbody class="divide-y divide-gray-100">
        ${rs.length ? rs.map(r => { const p = projById(r.projectId); return `
        <tr class="hover:bg-gray-50 cursor-pointer" onclick="W.openRecurring('${r.id}')">
          <td class="mc-title py-3 px-3 max-w-md"><div class="font-medium text-slate-900">${esc(r.title)}</div>
            <div class="text-[12px] text-gray-400 mt-0.5">Tạo bởi ${esc(user(r.createdBy).name)}</div>${richPlain(r.description).trim() ? `<div class="text-[12.5px] text-gray-500 mt-0.5 truncate">${esc(richPlain(r.description).replace(/\s+/g, ' ').trim().slice(0, 140))}</div>` : ''}</td>
          ${multi ? `<td class="py-3 px-2 text-[12.5px] text-slate-600"><span class="inline-flex items-center gap-1.5 whitespace-nowrap">${projDot(p)}${esc(p ? p.name : '?')}</span></td>` : ''}
          <td class="py-3 px-2">${stack(r.assigneeIds, 4)}</td><td class="py-3 px-2">${prioBadge(r.priority)}</td>
          <td class="py-3 px-2 text-[12.5px] text-indigo-700"><span class="inline-flex items-center gap-1">${WI.repeat}${esc(recText(r.rule))}${r.rule.end ? ` · đến ${fmt(r.rule.end)}` : ''}</span></td>
          <td class="py-3 px-2 text-[12.5px]">${[r.openCount ? `<div class="text-slate-700">Đang mở ${r.openCount} việc · hạn ${r.nextDue ? fmt(r.nextDue) : '—'}</div>` : '', r.pendingDue ? `<div class="text-indigo-700">Việc mới sẽ xuất hiện ngày ${fmt(r.pendingDue)}</div>` : (r.openCount ? '' : '<div class="text-amber-600">Chưa có (lịch đã kết thúc)</div>')].join('')}</td>
          <td class="mc-act py-3 px-2 text-right whitespace-nowrap" onclick="event.stopPropagation()">${r.canEdit ? `<button class="btn btn-ghost btn-sm" onclick="W.openRecurring('${r.id}')">${I.edit} Sửa</button><button class="text-gray-400 hover:text-red-600 p-1 ml-1" title="Xoá" onclick="W.deleteRecurring('${r.id}')">${I.trash}</button>` : '<span class="text-[12px] text-gray-400">Chỉ xem</span>'}</td>
        </tr>`; }).join('') : `<tr><td colspan="7" class="p-10 text-center text-gray-400">${filtering && base.length ? 'Không có việc lặp lại nào khớp bộ lọc. <a class="text-base-600 underline cursor-pointer" onclick="W.clearRF()">Xoá lọc</a>' : 'Chưa có việc lặp lại nào. Bấm "Thêm việc lặp lại" để tạo.'}</td></tr>`}
      </tbody>
    </table>
  </div>`;
}
function openRecurring(id){
  const isNew = !id; let r;
  if(isNew){
    const ps = creatableProjects();
    if(!ps.length){ toast(canCreateProject() ? 'Hãy tạo dự án trước khi thêm việc lặp lại.' : 'Bạn chưa tham gia dự án nào để thêm việc.', 'error'); return; }
    const pid = S.project !== 'all' && ps.some(p => p.id === S.project) ? S.project : ps[0].id;
    r = { id: newId('r'), projectId: pid, title: '', description: '', priority: 'medium', assigneeIds: [meId()], followerIds: [], due: today(), estHours: null, tags: [], subtasks: [], recurrence: { type: 'weekly', weekdays: [new Date().getDay() || 7], end: '' }, createdBy: meId(), canEdit: true };
  } else {
    const x = (S.data.recurring || []).find(y => y.id === id); if(!x) return;
    r = { id: x.id, projectId: x.projectId, title: x.title, description: x.description || '', priority: x.priority, assigneeIds: [...x.assigneeIds], followerIds: [...fids(x)].filter(id => !x.assigneeIds.includes(id)), due: x.nextDue || today(), tags: [...x.tags],
      subtasks: JSON.parse(JSON.stringify(x.subtasks || [])), recurrence: JSON.parse(JSON.stringify(x.rule)), createdBy: x.createdBy, canEdit: x.canEdit, openDue: x.nextDue, pendingDue: x.pendingDue || '', estHours: x.estHours == null ? null : x.estHours };
  }
  S.draft = r; S.draft.isNew = isNew; S.draft.kind = 'recurring'; S.draft.readOnly = !isNew && !r.canEdit; S.detail = null; S.mention = new Set();
  const p = projById(r.projectId), v = ro();
  openModal(`
    ${modalHeader(isNew ? 'Thêm việc lặp lại' : (v ? 'Chi tiết việc lặp lại' : 'Sửa việc lặp lại'), isNew ? 'Tạo ngay việc đầu tiên; các lần sau tự xuất hiện đúng ngày theo lịch, không cần việc trước đã xong.' : `Tạo bởi ${esc(user(r.createdBy).name)}. Sửa ở đây chỉ áp dụng cho các việc sinh sau; việc đã sinh ra giữ nguyên.`)}
    <div class="p-6 grid md:grid-cols-5 gap-6 m-form">
      <div class="md:col-span-3 space-y-5 min-w-0 m-col-main">
        <div><label class="label">Tên công việc <span class="text-red-500">*</span></label><input id="tk-title" class="input !text-[15px] !font-medium" value="${esc(r.title)}" maxlength="300" placeholder="VD: Báo cáo doanh số cuối ngày" ${v ? 'disabled' : ''} oninput="W.d('title',this.value)"></div>
        <div><label class="label">Mô tả</label>${richEditor('tk-desc', { value: r.description, placeholder: 'Mô tả chi tiết, yêu cầu, liên kết... (có thể dán ảnh bằng Ctrl+V)', minHeight: 110, disabled: v, images: true })}</div>
        <div class="m-last"><label class="label">Việc con / Checklist <span id="tk-subcount" class="font-normal text-gray-400"></span></label><div id="tk-subs"></div></div>
      </div>
      <div class="md:col-span-2 space-y-4 min-w-0 m-col-side">
        <div><label class="label">Dự án</label>${isNew ? `<select id="tk-proj" class="input" onchange="W.d('projectId',this.value);W.paintAssignees()">${creatableProjects().map(x => `<option value="${x.id}" ${x.id === r.projectId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : `<div class="flex items-center gap-2 text-[14px] text-slate-700 py-1.5">${projDot(p)}${esc(p ? p.name : '?')}</div>`}</div>
        <div><label class="label">Ưu tiên</label><select class="input" ${v ? 'disabled' : ''} onchange="W.d('priority',this.value)">${Object.entries(PRIO).map(([k, x]) => `<option value="${k}" ${r.priority === k ? 'selected' : ''}>${x.t}</option>`).join('')}</select></div>
        ${isNew ? '' : `<div class="text-[12.5px] text-gray-500">${[r.openDue ? `Việc đang mở hiện có hạn <b>${fmt(r.openDue)}</b> (giữ nguyên).` : '', r.pendingDue ? `Việc mới sẽ tự xuất hiện vào ngày <b>${fmt(r.pendingDue)}</b>.` : (r.openDue ? '' : 'Hiện chưa có việc nào đang mở.')].filter(Boolean).join(' ')}</div>`}
        <div><label class="label">Thời gian hoàn thành (giờ) <span class="font-normal text-gray-400">(tuỳ chọn)</span></label><input id="tk-hours" type="number" inputmode="decimal" min="0" max="1000" step="0.25" class="input" value="${S.draft.estHours == null ? '' : esc(S.draft.estHours)}" placeholder="VD: 2 hoặc 1.5" ${v ? 'disabled' : ''} oninput="W.d('estHours',this.value)"></div>
        <div><label class="label">Người thực hiện</label><div id="tk-asg"></div></div>
        <div><label class="label">Người theo dõi</label><div id="tk-fol"></div></div>
        <div><label class="label">Nhãn (Tags)</label><div id="tk-tags"></div></div>
        <div><label class="label">Lịch lặp lại</label><div id="tk-rec"></div></div>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-2">
      <div>${!isNew && r.canEdit ? `<button class="btn btn-danger" onclick="W.deleteRecurring('${r.id}', true)">${I.trash} Xoá</button>` : ''}</div>
      <div class="flex gap-2"><button class="btn btn-ghost" onclick="A.cancelModal()">${v ? 'Đóng' : 'Huỷ'}</button>${v ? '' : `<button class="btn btn-primary" id="tk-save" onclick="W.saveRecurring()">${I.check} ${isNew ? 'Tạo việc lặp lại' : 'Lưu thay đổi'}</button>`}</div>
    </div>`, 'max-w-4xl');
  paintSubs(); paintAssignees(); paintFollowers(); paintTags(); paintRecurrence();
  setTimeout(() => { const el = $('tk-title'); if(el && isNew) el.focus(); }, 50);
}
async function saveRecurring(){
  const t = S.draft; if(!t || t.readOnly || t.kind !== 'recurring') return;
  const title = t.title.trim(); if(!title){ toast('Nhập tên công việc.', 'error'); const el = $('tk-title'); if(el) el.focus(); return; }
  if(!t.recurrence){ toast('Chọn lịch lặp lại.', 'error'); return; }
  if(t.isNew && t.recurrence.end && t.due && t.recurrence.end < t.due){ toast('Ngày kết thúc lặp lại phải sau hạn chót đầu tiên.', 'error'); return; }
  if(badHours(t.estHours)){ toast('Thời gian hoàn thành phải là số giờ lớn hơn 0 (VD: 2 hoặc 1.5).', 'error'); const el = $('tk-hours'); if(el) el.focus(); return; }
  const btn = $('tk-save'); if(btn){ btn.disabled = true; btn.textContent = 'Đang lưu...'; }
  const payload = { id: t.id, projectId: t.projectId, title, description: richGet('tk-desc'), priority: t.priority, assigneeIds: t.assigneeIds, followerIds: t.followerIds.filter(id => !t.assigneeIds.includes(id)), tags: t.tags,
    estHours: hoursVal(t.estHours), subtasks: t.subtasks.filter(s => s.text.trim()), rule: t.recurrence };
  if(t.isNew) payload.firstDue = t.due;
  const j = await act('saveRecurring', { recurring: payload });
  if(j){ const isNew = t.isNew; A.closeModal(); S.draft = null; toast(isNew ? 'Đã tạo việc lặp lại và việc đầu tiên.' : 'Đã lưu. Các việc đã sinh ra được giữ nguyên.'); if(j.result && j.result.scheduled) spawnNotice(j); }
  else if(btn){ btn.disabled = false; btn.innerHTML = I.check + ' ' + (t.isNew ? 'Tạo việc lặp lại' : 'Lưu thay đổi'); }
}
async function deleteRecurring(id, fromModal){
  const r = (S.data.recurring || []).find(x => x.id === id); if(!r) return;
  if(!confirm('Xoá việc lặp lại "' + r.title + '"? Các việc đã sinh ra vẫn giữ nguyên nhưng hệ thống sẽ không tạo thêm việc kế tiếp.')) return;
  if(fromModal) A.closeModal();
  await act('deleteRecurring', { id }, 'Đã xoá việc lặp lại.');
}

/* ============================================================
   WORKSPACE · PHÒNG BAN · DỰ ÁN
   ============================================================ */
const swatches = (name, cur) => `<div class="flex gap-1.5 flex-wrap" id="${name}">${COLORS.map(c => `<label class="cursor-pointer"><input type="radio" name="${name}-r" value="${c}" class="hidden peer" ${c === cur ? 'checked' : ''}><span class="block w-7 h-7 rounded-full ring-2 ring-transparent peer-checked:ring-slate-800 ring-offset-2" style="background:${c}"></span></label>`).join('')}</div>`;
const pickedColor = name => { const e = document.querySelector(`#${name} input:checked`); return e ? e.value : COLORS[0]; };
function picker(id, selected, users, note){
  const sel = new Set(selected);
  return `<div id="${id}">
    ${users.length > 7 ? `<input class="input !py-1.5 text-[13px] mb-1.5" placeholder="Tìm người..." oninput="W.filterPick('${id}',this.value)">` : ''}
    <div class="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">${users.map(u => `<label class="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-50 text-[13px]" data-n="${esc(u.name.toLowerCase())}"><input type="checkbox" class="checkbox" value="${u.id}" ${sel.has(u.id) ? 'checked' : ''}>${avatar(u, 'w-5 h-5 text-[9px]')}<span class="truncate flex-1">${esc(u.name)}${isActive(u) ? '' : ' (đã khoá)'}</span><span class="text-[11px] text-gray-400">${ROLES[u.role].t}${u.dept ? ' · ' + esc(u.dept) : ''}</span></label>`).join('')}</div>${note ? `<div class="text-[11.5px] text-gray-400 mt-1">${note}</div>` : ''}</div>`;
}
const pickedIds = id => [...document.querySelectorAll('#' + id + ' input[type=checkbox]:checked')].map(e => e.value);
function filterPick(id, v){ v = v.trim().toLowerCase(); document.querySelectorAll('#' + id + ' label').forEach(l => { l.style.display = !v || l.dataset.n.includes(v) ? '' : 'none'; }); }

function openWorkspace(id){
  if(!isDir()) return;
  const w = id ? S.data.workspaces.find(x => x.id === id) : null, isDef = !!w && w.id === 'w_default';
  openModal(`
    ${modalHeader(w ? 'Cài đặt Workspace' : 'Thêm Workspace', 'Workspace là không gian làm việc lớn nhất (ví dụ một mảng kinh doanh), chứa các phòng ban và dự án.')}
    <div class="p-6 space-y-4">
      <div><label class="label">Tên Workspace <span class="text-red-500">*</span></label><input id="ws-name" class="input" maxlength="80" value="${esc(w ? w.name : '')}" placeholder="VD: Kinh doanh, Vận hành, Marketing..."></div>
      <div><label class="label">Mô tả</label><input id="ws-desc" class="input" maxlength="500" value="${esc(w ? w.description : '')}"></div>
      <div><label class="label">Màu</label>${swatches('ws-color', w ? w.color : COLORS[0])}</div>
      <label class="flex items-start gap-2 text-[13.5px] ${isDef ? 'opacity-60' : ''}"><input type="checkbox" id="ws-open" class="checkbox mt-0.5" ${w && w.open ? 'checked' : ''} ${isDef ? 'disabled' : ''} onchange="document.getElementById('ws-members-box').style.display=this.checked?'none':''"><span><b>Mở cho toàn công ty</b><br><span class="text-gray-500 text-[12.5px]">Ai cũng thấy Workspace này. Nếu tắt, chỉ thành viên bên dưới (và người thuộc dự án trong đó) mới thấy.</span></span></label>
      <div id="ws-members-box" style="${(w && w.open) || isDef ? 'display:none' : ''}"><label class="label">Thành viên Workspace</label>${picker('ws-members', w ? (w.memberIds || []) : [], activeUsers().filter(u => u.role !== 'director'), 'Giám đốc luôn thấy mọi Workspace.')}</div>
      ${w && !isDef ? `<label class="flex items-start gap-2 text-[13.5px]"><input type="checkbox" id="ws-arch" class="checkbox mt-0.5" ${w.archived ? 'checked' : ''}><span><b>Lưu trữ Workspace</b><br><span class="text-gray-500 text-[12.5px]">Giữ lại lịch sử nhưng ẩn khỏi công việc hằng ngày.</span></span></label>` : ''}
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-2">
      <div>${w && !isDef ? `<button class="btn btn-danger" onclick="W.deleteWorkspace('${w.id}')">${I.trash} Xoá</button>` : ''}</div>
      <div class="flex gap-2"><button class="btn btn-ghost" onclick="A.cancelModal()">Huỷ</button><button class="btn btn-primary" id="ws-save" onclick="W.saveWorkspace('${w ? w.id : ''}')">${I.check} Lưu</button></div>
    </div>`, 'max-w-lg');
  setTimeout(() => { const el = $('ws-name'); if(el && !w) el.focus(); }, 50);
}
async function saveWorkspace(id){
  const name = $('ws-name').value.trim(); if(!name){ toast('Nhập tên Workspace.', 'error'); return; }
  const wid = id || newId('w'), open = $('ws-open') ? $('ws-open').checked : false;
  $('ws-save').disabled = true;
  const j = await act('saveWorkspace', { workspace: { id: wid, name, description: $('ws-desc').value, color: pickedColor('ws-color'), open, archived: $('ws-arch') ? $('ws-arch').checked : false, memberIds: open ? [] : pickedIds('ws-members') } });
  if(j){ A.closeModal(); toast('Đã lưu Workspace.'); if(!id){ S.ws = wid; S.project = 'all'; lsSet('okr_work_ws', wid); S.version = null; await load(true); } }
  else if($('ws-save')) $('ws-save').disabled = false;
}
async function deleteWorkspace(id){
  if(!confirm('Xoá Workspace này? Chỉ xoá được khi không còn dự án nào.')) return;
  const j = await act('deleteWorkspace', { id });
  if(j){ A.closeModal(); S.ws = 'w_default'; S.version = null; await load(true); toast('Đã xoá Workspace.'); }
}

function openDepartments(){
  if(!isDir()) return; const ws = S.data.workspaces.find(w => w.id === S.data.currentId);
  const heads = activeUsers().filter(u => u.role !== 'employee');
  openModal(`
    ${modalHeader('Phòng ban', 'Workspace: ' + esc(ws ? ws.name : ''))}
    <div class="p-6 space-y-3">
      <div class="divide-y divide-gray-100 border border-gray-200 rounded-lg">${S.data.departments.map(dp => `
        <div class="flex items-center gap-2 px-3 py-2">
          <input class="input !py-1 flex-1" id="dp-n-${dp.id}" value="${esc(dp.name)}" maxlength="80">
          <select class="input !py-1 !w-48" id="dp-h-${dp.id}"><option value="">— Chưa có trưởng —</option>${heads.map(u => `<option value="${u.id}" ${dp.headId === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
          <button class="btn btn-ghost btn-sm" onclick="W.saveDept('${dp.id}')">${I.check}</button>
          ${dp.id !== 'd_default' ? `<button class="text-gray-400 hover:text-red-600 p-1" onclick="W.delDept('${dp.id}')">${I.trash}</button>` : ''}
        </div>`).join('') || '<div class="p-4 text-center text-gray-400 text-[13px]">Chưa có phòng ban.</div>'}</div>
      <div class="flex items-center gap-2"><input class="input flex-1" id="dp-new-n" maxlength="80" placeholder="Tên phòng ban mới..."><select class="input !w-48" id="dp-new-h"><option value="">— Trưởng phòng ban —</option>${heads.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}</select><button class="btn btn-primary" onclick="W.saveDept('')">${I.plus} Thêm</button></div>
      <div class="text-[12px] text-gray-400">Người phụ trách phòng ban được hiển thị cạnh tên phòng ban trong danh sách dự án.</div>
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex justify-end"><button class="btn btn-ghost" onclick="A.closeModal()">Đóng</button></div>`, 'max-w-2xl');
}
async function saveDept(id){
  const nameEl = $(id ? 'dp-n-' + id : 'dp-new-n'), headEl = $(id ? 'dp-h-' + id : 'dp-new-h');
  if(!nameEl.value.trim()){ toast('Nhập tên phòng ban.', 'error'); return; }
  const j = await act('saveDepartment', { department: { id: id || newId('d'), workspaceId: S.data.currentId, name: nameEl.value.trim(), headId: headEl.value } });
  if(j){ toast('Đã lưu phòng ban.'); openDepartments(); }
}
async function delDept(id){ if(!confirm('Xoá phòng ban này?')) return; const j = await act('deleteDepartment', { id }); if(j){ toast('Đã xoá phòng ban.'); openDepartments(); } }

function openProject(id){
  const p = id ? projById(id) : null;
  if(!p && !canCreateProject()){ toast('Chỉ Giám đốc, Trưởng phòng hoặc Quản lý được tạo dự án.', 'error'); return; }
  if(p && !canEditProject(p)) return;
  const d = S.data, isDef = !!p && p.id === 'p_general', managers = activeUsers().filter(u => u.role !== 'employee');
  const dept = p ? p.departmentId : (S.project !== 'all' && projById(S.project) ? projById(S.project).departmentId : '');
  openModal(`
    ${modalHeader(p ? 'Cài đặt dự án' : 'Thêm dự án', 'Workspace: ' + esc((d.workspaces.find(w => w.id === d.currentId) || {}).name || ''))}
    <div class="p-6 space-y-4">
      <div><label class="label">Tên dự án <span class="text-red-500">*</span></label><input id="pj-name" class="input" maxlength="100" value="${esc(p ? p.name : '')}" placeholder="VD: Website mới, Chiến dịch 11.11..."></div>
      <div><label class="label">Mô tả</label><textarea id="pj-desc" class="input" style="min-height:64px" maxlength="1000">${esc(p ? p.description : '')}</textarea></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="label">Phòng ban</label><select id="pj-dept" class="input"><option value="">— Chưa xếp —</option>${d.departments.map(x => `<option value="${x.id}" ${x.id === dept ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        <div><label class="label">Quản lý dự án</label>${isDir() ? `<select id="pj-mgr" class="input"><option value="">— Chưa chọn —</option>${managers.map(u => `<option value="${u.id}" ${(p ? p.managerId : meId()) === u.id ? 'selected' : ''}>${esc(u.name)} · ${ROLES[u.role].t}</option>`).join('')}</select>` : `<div class="input bg-gray-50 text-gray-600">${esc(user(p ? p.managerId : meId()).name)}</div>`}</div>
      </div>
      <div><label class="label">Màu</label>${swatches('pj-color', p ? p.color : COLORS[d.projects.length % COLORS.length])}</div>
      <label class="flex items-start gap-2 text-[13.5px] ${isDef ? 'opacity-60' : ''}"><input type="checkbox" id="pj-open" class="checkbox mt-0.5" ${p && p.open ? 'checked' : ''} ${isDef ? 'disabled' : ''} onchange="document.getElementById('pj-members-box').style.display=this.checked?'none':''"><span><b>Mở cho mọi người trong Workspace</b><br><span class="text-gray-500 text-[12.5px]">Ai trong Workspace cũng tham gia và tạo việc được.</span></span></label>
      <div id="pj-members-box" style="${(p && p.open) || isDef ? 'display:none' : ''}"><label class="label">Thành viên dự án</label>${picker('pj-members', p ? p.memberIds : [meId()], activeUsers(), 'Người còn việc chưa xong trong dự án luôn giữ quyền truy cập. Người được giao việc sẽ tự được thêm vào.')}</div>
      ${p && !isDef ? `<label class="flex items-start gap-2 text-[13.5px]"><input type="checkbox" id="pj-arch" class="checkbox mt-0.5" ${p.archived ? 'checked' : ''}><span><b>Lưu trữ dự án</b><br><span class="text-gray-500 text-[12.5px]">Giữ lại lịch sử, không thêm việc mới được nữa.</span></span></label>` : ''}
    </div>
    <div class="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-2">
      <div>${p && !isDef ? `<button class="btn btn-danger" onclick="W.deleteProject('${p.id}')">${I.trash} Xoá</button>` : ''}</div>
      <div class="flex gap-2"><button class="btn btn-ghost" onclick="A.cancelModal()">Huỷ</button><button class="btn btn-primary" id="pj-save" onclick="W.saveProject('${p ? p.id : ''}')">${I.check} Lưu</button></div>
    </div>`, 'max-w-xl');
  setTimeout(() => { const el = $('pj-name'); if(el && !p) el.focus(); }, 50);
}
async function saveProject(id){
  const name = $('pj-name').value.trim(); if(!name){ toast('Nhập tên dự án.', 'error'); return; }
  const pid = id || newId('p'), open = $('pj-open').checked; $('pj-save').disabled = true;
  const mgr = $('pj-mgr') ? $('pj-mgr').value : '';
  const j = await act('saveProject', { project: { id: pid, workspaceId: S.data.currentId, departmentId: $('pj-dept').value, name, description: $('pj-desc').value, color: pickedColor('pj-color'),
    managerId: mgr, open, archived: $('pj-arch') ? $('pj-arch').checked : false, memberIds: open ? undefined : pickedIds('pj-members') } });
  if(j){ A.closeModal(); toast('Đã lưu dự án.'); if(!id){ S.project = pid; repaintIfActive(); } }
  else if($('pj-save')) $('pj-save').disabled = false;
}
async function deleteProject(id){
  if(!confirm('Xoá dự án này? Chỉ xoá được khi dự án không còn công việc nào (nếu còn, hãy dùng Lưu trữ).')) return;
  const j = await act('deleteProject', { id }); if(j){ A.closeModal(); if(S.project === id) S.project = 'all'; toast('Đã xoá dự án.'); }
}

/* ============================================================
   Điều khiển từ thanh công cụ
   ============================================================ */
function setWs(id){ S.ws = id; lsSet('okr_work_ws', id); S.project = 'all'; S.version = null; S.wsLoaded = null; S.f = { q: '', who: 'all', pri: 'all', st: 'all', fol: false }; S.rf = { who: 'all', pri: 'all', type: 'all' }; load(); }
function setMode(m){ S.mode = m; lsSet('okr_work_mode', m); repaint(); }
function setProject(p){ S.project = p; S.doneLimit = DONE_SHOW; S.listLimit = 200; S.f.who = 'all'; repaint(); }
function setF(k, v){ S.f[k] = v; S.listLimit = 200; repaint(); }
let qTimer = null;
function setQ(v){
  S.f.q = v; clearTimeout(qTimer);
  qTimer = setTimeout(() => { repaint(); const el = $('wk-q'); if(el){ el.focus(); el.setSelectionRange(v.length, v.length); } }, 250);
}
function toggleFol(){ S.f.fol = !S.f.fol; repaint(); }
function setRF(k, v){ if(!(k in S.rf)) return; S.rf[k] = v; repaint(); }
function clearRF(){ S.rf = { who: 'all', pri: 'all', type: 'all' }; repaint(); }
function setTm(p){ if(!TM_PRESETS.some(x => x[0] === p)) return; S.tm.p = p; S.listLimit = 200; S.doneLimit = DONE_SHOW; repaint(); }
function setTmBy(v){ if(!TM_BY.some(x => x[0] === v)) return; S.tm.by = v; S.listLimit = 200; S.doneLimit = DONE_SHOW; repaint(); }
function setTmDate(k, v){ if(k !== 'from' && k !== 'to') return; S.tm[k] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ''; S.listLimit = 200; S.doneLimit = DONE_SHOW; repaint(); }
function treeToggle(){ const el = $('wk-tree'); if(el) el.classList.toggle('tree-open'); }
function toggleArch(){ S.showArch = !S.showArch; repaint(); }
function sortBy(k){ S.sort = S.sort.k === k ? { k, d: -S.sort.d } : { k, d: 1 }; repaint(); }
function moreDone(){ S.doneLimit += DONE_SHOW; repaint(); }
function moreList(){ S.listLimit += 200; repaint(); }
function reload(){ S.version = null; load(); }
function retry(){ S.error = null; S.data = null; repaint(); }

window.W = {
  view, load, reload, reset, poll, repaint, active, dragging, setWs, setMode, setMineView, setProject, setF, setQ, toggleFol, setRF, clearRF, setTm, setTmBy, setTmDate, toggleArch, sortBy, moreDone, moreList, retry, treeToggle,
  dragStart, dragEnd, colOver, colLeave, cardOver, drop, setStatus, toggleDone, deleteTask,
  openTask, gotoTask, openTaskForm, openRecurring, saveRecurring, deleteRecurring, gotoCreated, gotoRec, setTab, subTick, detailStatus, reassignStart, reassignCancel, reassignSave,
  d, checkDates, pendFiles, pendDel, saveTask, subAdd, subToggle, subText, subDel, asgToggle, filterAsg, paintAssignees, folToggle, filterFol, followStart, followCancel, followSave, tagAdd, tagDel, paintRecurrence, recType, recSet, recWd,
  pickFiles, delAttachment, cmInput, cmPick, cmKey, postComment, delComment,
  openWorkspace, saveWorkspace, deleteWorkspace, openDepartments, saveDept, delDept, openProject, saveProject, deleteProject, filterPick,
  _test: { tmRange, inRange, scopeTasks, nextDueOf, recText, recView, S, canEdit, canDelete, filtered, mineTasks, createdTasks, personalView, scopeNote, fmtComment },
};
})();

// Lấy toàn bộ hội thoại được TẠO trong ngày báo cáo (mặc định: hôm qua, giờ VN)
// trên tất cả page của tài khoản Pancake, kèm nội dung tin nhắn.
const cfg = $('Cấu hình').first().json;
const token = String(cfg.pancake_access_token || '').trim();
if (!token || token.startsWith('DIEN_')) {
  throw new Error('Chưa điền pancake_access_token trong node "Cấu hình".');
}

const VN_OFFSET = 7 * 3600;
let day;
if (/^\d{4}-\d{2}-\d{2}$/.test(String(cfg.ngay_bao_cao || '').trim())) {
  day = String(cfg.ngay_bao_cao).trim();
} else {
  const nowVN = new Date(Date.now() + VN_OFFSET * 1000);
  const y = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate() - 1));
  day = y.toISOString().slice(0, 10);
}
const since = Math.floor(Date.parse(day + 'T00:00:00Z') / 1000) - VN_OFFSET;
const until = since + 86400;

const MAX_MSG = Number(cfg.so_tin_nhan_toi_da) || 80;
const MAX_CHARS = 8000;
const BASE = 'https://pages.fm/api';

const get = (url, qs) => this.helpers.httpRequest({ method: 'GET', url, qs, json: true, timeout: 60000 });
const post = (url, qs) => this.helpers.httpRequest({ method: 'POST', url, qs, json: true, timeout: 60000 });

const toTs = (v) => {
  if (v == null) return NaN;
  if (typeof v === 'number') return v > 1e12 ? v / 1000 : v;
  const s = String(v);
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + 'Z') / 1000;
};
const clean = (s) => String(s || '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\n{3,}/g, '\n\n')
  .trim();
const hhmm = (ts) => new Date((ts + VN_OFFSET) * 1000).toISOString().slice(11, 16);

// Các trường liên quan SĐT / báo xấu / ghi chú mà Pancake trả về (nếu có),
// để AI dùng cho bộ lọc tình trạng số điện thoại.
const pickSignals = (obj, depth = 0, out = {}) => {
  if (!obj || typeof obj !== 'object' || depth > 3) return out;
  for (const [k, v] of Object.entries(obj)) {
    if (/phone|report|bom|boom|note|return|order_count|succe|fail|tag/i.test(k) && v != null && v !== '' &&
        !(Array.isArray(v) && v.length === 0)) {
      out[k] = v;
    } else if (typeof v === 'object') {
      pickSignals(v, depth + 1, out);
    }
  }
  return out;
};

// 1. Danh sách page
const pagesRes = await get(`${BASE}/v1/pages`, { access_token: token });
let pages = pagesRes?.categorized?.activated || pagesRes?.pages || pagesRes?.data || [];
pages = (Array.isArray(pages) ? pages : []).filter((p) => p && typeof p === 'object' && p.id != null);
if (!pages.length) {
  throw new Error('Pancake không trả về page nào. Kiểm tra lại access token. Phản hồi: ' + JSON.stringify(pagesRes).slice(0, 300));
}
// Lọc page: nhận ID page hoặc tên page (không phân biệt hoa thường, khớp một phần tên)
const norm = (s) => String(s || '').normalize('NFC').toLowerCase().trim();
const onlyPages = String(cfg.chi_quet_page_ids || '').split(',').map(norm).filter(Boolean);
if (onlyPages.length) {
  const all = pages;
  pages = all.filter((p) => onlyPages.some((q) => norm(p.id) === q || norm(p.name).includes(q)));
  if (!pages.length) {
    const list = all.map((p) => `${p.name} (ID: ${p.id})`).join('; ');
    throw new Error(`Không có page nào khớp "${cfg.chi_quet_page_ids}". Các page hiện có: ${list}`.slice(0, 1500));
  }
}

const results = [];
const errors = [];

for (const page of pages) {
  const pageId = String(page.id);
  const pageName = page.name || pageId;
  let pageToken;
  try {
    const t = await post(`${BASE}/v1/pages/${pageId}/generate_page_access_token`, { page_id: pageId, access_token: token });
    pageToken = t?.page_access_token || t?.data?.page_access_token;
  } catch (e) {
    errors.push(`${pageName}: không tạo được page token (${e.message})`);
    continue;
  }
  if (!pageToken) { errors.push(`${pageName}: không có page token`); continue; }

  // 2. Hội thoại: lấy đến thời điểm hiện tại rồi lọc theo thời gian TẠO,
  // để không sót hội thoại tạo hôm qua nhưng có tin nhắn mới hôm nay.
  const convs = new Map();
  let lastId;
  for (let i = 0; i < 100; i++) {
    const qs = { page_access_token: pageToken, since, until: Math.floor(Date.now() / 1000), order_by: 'inserted_at' };
    if (lastId) qs.last_conversation_id = lastId;
    let res;
    try {
      res = await get(`${BASE}/public_api/v2/pages/${pageId}/conversations`, qs);
    } catch (e) {
      errors.push(`${pageName}: lỗi lấy hội thoại (${e.message})`);
      break;
    }
    const list = res?.conversations || res?.data || [];
    if (!list.length) break;
    for (const c of list) {
      const ts = toTs(c.inserted_at);
      if (ts >= since && ts < until) convs.set(String(c.id), c);
    }
    const newLast = String(list[list.length - 1].id);
    if (newLast === lastId) break;
    lastId = newLast;
  }

  // 3. Tin nhắn của từng hội thoại (5 luồng song song)
  const convList = [...convs.values()];
  for (let i = 0; i < convList.length; i += 5) {
    const chunk = convList.slice(i, i + 5);
    const done = await Promise.all(chunk.map(async (c) => {
      const customer = (c.customers || [])[0] || {};
      const qs = { page_access_token: pageToken };
      if (customer.id) qs.customer_id = customer.id;
      let res;
      try {
        res = await get(`${BASE}/public_api/v1/pages/${pageId}/conversations/${c.id}/messages`, qs);
      } catch (e) {
        errors.push(`${pageName}/${c.id}: lỗi lấy tin nhắn (${e.message})`);
        return null;
      }
      const msgs = (res?.messages || res?.data || [])
        .slice()
        .sort((a, b) => toTs(a.inserted_at) - toTs(b.inserted_at));
      let nKhach = 0;
      let nPage = 0;
      const lines = msgs.map((m) => {
        const fromPage = String(m.from?.id || '') === pageId || m.from?.admin_id != null || m.from?.page_id != null;
        fromPage ? nPage++ : nKhach++;
        let text = clean(m.original_message || m.message);
        const att = (m.attachments || []).map((a) => `[${a.type || 'tệp'}]`).join(' ');
        if (!text && !att && m.type) text = `[${m.type}]`;
        return `[${hhmm(toTs(m.inserted_at))}] ${fromPage ? 'PAGE' : 'KHÁCH'}: ${[text, att].filter(Boolean).join(' ')}`;
      });
      let transcript = lines.slice(-MAX_MSG).join('\n');
      if (transcript.length > MAX_CHARS) transcript = '…\n' + transcript.slice(-MAX_CHARS);
      if (lines.length > MAX_MSG) transcript = `(bỏ bớt ${lines.length - MAX_MSG} tin nhắn cũ)\n` + transcript;

      const signals = pickSignals({
        conversation: { recent_phone_numbers: c.recent_phone_numbers, tags: c.tags, has_phone: c.has_phone },
        customers: res?.customers,
        extra: { reports_by_phone: res?.reports_by_phone, notes: res?.notes, recent_orders: res?.recent_orders },
      });

      return {
        ngay: day,
        page_id: pageId,
        page_name: pageName,
        conversation_id: String(c.id),
        loai: c.type || '',
        khach_hang: customer.name || c.from?.name || '',
        so_tin_khach: nKhach,
        so_tin_page: nPage,
        link: `https://pancake.vn/${pageId}?c_id=${c.id}`,
        du_lieu_sdt: JSON.stringify(signals).slice(0, 1500),
        transcript: transcript || '(không có tin nhắn)',
      };
    }));
    for (const r of done) if (r) results.push(r);
  }
}

if (!results.length) {
  return [{ json: { _empty: true, ngay: day, so_page: pages.length, loi: errors.join(' | ') } }];
}
results[0].loi_lay_du_lieu = errors.join(' | ');
return results.map((json) => ({ json }));

// Ghép kết quả Gemini với thông tin hội thoại -> 1 dòng / lead cho tab BC_CHI_TIET.
const leads = new Map($('Lấy hội thoại Pancake').all().map((i) => [i.json.conversation_id, i.json]));
const batches = $('Chia lô gửi AI').all();
const responses = $input.all();
const label = { NGON: 'Ngon', DO: 'Dở', CHUA_RO: 'Chưa rõ', KHONG_RO: 'Không rõ' };
const updatedAt = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');

const graded = new Map();
const batchError = new Map();
const parseJson = (text) => {
  const t = String(text || '').replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(t); } catch (e) { /* thử cắt lấy mảng JSON */ }
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  return a >= 0 && b > a ? JSON.parse(t.slice(a, b + 1)) : [];
};
responses.forEach((res, idx) => {
  const r = res.json;
  const ids = batches[idx]?.json.conversation_ids || [];
  let arr = [];
  let why = '';
  if (r.error) {
    why = `Gemini báo lỗi: ${r.error.message || JSON.stringify(r.error)}`.slice(0, 400);
  } else if (!r.candidates?.length) {
    why = `Gemini không trả nội dung${r.promptFeedback?.blockReason ? ' (bị chặn: ' + r.promptFeedback.blockReason + ')' : ''}`;
  } else {
    const text = (r.candidates[0].content?.parts || []).map((p) => p.text || '').join('');
    try {
      arr = parseJson(text);
      if (!Array.isArray(arr)) arr = Object.values(arr || {}).find(Array.isArray) || (arr?.conversation_id ? [arr] : []);
    } catch (e) { why = `Không đọc được JSON từ Gemini (finishReason: ${r.candidates[0].finishReason || '?'})`; }
  }
  ids.forEach((id) => why && batchError.set(String(id), why));
  for (const g of Array.isArray(arr) ? arr : []) {
    if (g && ids.includes(String(g.conversation_id))) graded.set(String(g.conversation_id), g);
  }
});

const out = [];
for (const [id, l] of leads) {
  if (!l.conversation_id) continue;
  const g = graded.get(id);
  out.push({
    json: {
      'Mã hội thoại': id,
      'Ngày': l.ngay,
      'Page': l.page_name,
      'Khách hàng': l.khach_hang,
      'Loại': l.loai,
      'Tin khách/page': `${l.so_tin_khach}/${l.so_tin_page}`,
      'Kết luận': g ? label[g.ket_luan] || g.ket_luan : 'Lỗi AI',
      'Nhóm lý do': g?.nhom_ly_do || '',
      'Lý do': g?.ly_do || (g ? '' : batchError.get(id) || 'Gemini không trả kết quả cho hội thoại này'),
      'Chi tiết bộ lọc': g ? (g.bo_loc || []).map((b) => `${b.ten}: ${label[b.ket_qua] || b.ket_qua} - ${b.ly_do}`).join('\n') : '',
      'Nhu cầu': g?.nhu_cau || '',
      'Link Pancake': l.link,
      'Cập nhật lúc': updatedAt,
      _bo_loc: g?.bo_loc || [],
    },
  });
}
return out;

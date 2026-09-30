// Ghép kết quả Gemini với thông tin hội thoại -> 1 dòng / lead cho tab BC_CHI_TIET.
const leads = new Map($('Lấy hội thoại Pancake').all().map((i) => [i.json.conversation_id, i.json]));
const batches = $('Chia lô gửi AI').all();
const responses = $input.all();
const label = { NGON: 'Ngon', DO: 'Dở', CHUA_RO: 'Chưa rõ', KHONG_RO: 'Không rõ' };
const updatedAt = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');

const graded = new Map();
responses.forEach((res, idx) => {
  const r = res.json;
  const ids = batches[idx]?.json.conversation_ids || [];
  let arr = [];
  try {
    const text = (r.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    arr = JSON.parse(text);
  } catch (e) {
    arr = [];
  }
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
      'Lý do': g?.ly_do || (g ? '' : 'Gemini không trả kết quả cho hội thoại này'),
      'Chi tiết bộ lọc': g ? (g.bo_loc || []).map((b) => `${b.ten}: ${label[b.ket_qua] || b.ket_qua} - ${b.ly_do}`).join('\n') : '',
      'Nhu cầu': g?.nhu_cau || '',
      'Link Pancake': l.link,
      'Cập nhật lúc': updatedAt,
      _bo_loc: g?.bo_loc || [],
    },
  });
}
return out;

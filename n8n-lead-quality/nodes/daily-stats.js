// Tổng hợp 1 dòng thống kê / ngày cho tab BC_NGAY.
let rows = [];
try {
  rows = $('Tách kết quả AI').all().map((i) => i.json);
} catch (e) {
  rows = [];
}
const first = $('Lấy hội thoại Pancake').first().json;
const day = first.ngay;
const count = (arr, key) => arr.reduce((m, x) => {
  const k = key(x);
  if (k) m[k] = (m[k] || 0) + 1;
  return m;
}, {});
const top = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} (${v})`).join('; ');

const total = rows.length;
const by = count(rows, (r) => r['Kết luận']);
const ngon = by['Ngon'] || 0;
const dở = by['Dở'] || 0;

const filterDo = {};
for (const r of rows) {
  for (const b of r._bo_loc || []) {
    if (b.ket_qua === 'DO') filterDo[b.ten] = (filterDo[b.ten] || 0) + 1;
  }
}
const pages = {};
for (const r of rows) {
  const p = (pages[r['Page']] ||= { t: 0, n: 0 });
  p.t++;
  if (r['Kết luận'] === 'Ngon') p.n++;
}

return [{
  json: {
    'Ngày': day,
    'Tổng lead': total,
    'Lead ngon': ngon,
    'Lead dở': dở,
    'Chưa rõ': by['Chưa rõ'] || 0,
    'Lỗi AI': by['Lỗi AI'] || 0,
    'Tỉ lệ ngon (%)': total ? Math.round((ngon / total) * 1000) / 10 : 0,
    'Dở theo bộ lọc': Object.entries(filterDo).map(([k, v]) => `${k}: ${v}`).join('\n'),
    'Lý do dở phổ biến': top(count(rows.filter((r) => r['Kết luận'] === 'Dở'), (r) => r['Nhóm lý do']), 5),
    'Điểm cộng phổ biến': top(count(rows.filter((r) => r['Kết luận'] === 'Ngon'), (r) => r['Nhóm lý do']), 5),
    'Theo page': Object.entries(pages).map(([k, v]) => `${k}: ${v.n}/${v.t} ngon`).join('\n'),
    'Ghi chú': first._empty ? `Không có hội thoại mới. ${first.loi || ''}`.trim() : first.loi_lay_du_lieu || '',
    'Cập nhật lúc': new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' '),
  },
}];

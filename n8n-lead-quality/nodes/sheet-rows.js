// Chuẩn bị dòng ghi vào tab __TAB__ (chế độ: __MODE__).
// Khóa là cột A: dòng đã có khóa thì ghi đè đúng dòng đó, chưa có thì thêm mới.
const TAB = '__TAB__';
const MODE = '__MODE__';
const HEADERS = __HEADERS__;
let source = [];
try {
  source = $('__SOURCE__').all().map((i) => i.json);
} catch (e) {
  source = [];
}
const existing = ($('Đọc khóa __TAB__').first().json.values || []).map((r) => String((r || [])[0] ?? '').trim());
const rowOf = new Map();
existing.forEach((k, i) => { if (i > 0 && k && !rowOf.has(k)) rowOf.set(k, i + 1); });

const toRow = (o) => HEADERS.map((h) => {
  const v = o[h];
  return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v;
});

const updates = [];
const appends = [];
for (const o of source) {
  const key = String(o[HEADERS[0]] ?? '').trim();
  if (!key) continue;
  const r = rowOf.get(key);
  if (r) updates.push({ range: `${TAB}!A${r}`, values: [toRow(o)] });
  else appends.push(toRow(o));
}

if (MODE === 'update') {
  return updates.length ? [{ json: { body: { valueInputOption: 'RAW', data: updates } } }] : [];
}
return appends.length ? [{ json: { body: { values: appends } } }] : [];

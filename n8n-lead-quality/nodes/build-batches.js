// Ghép tiêu chí từ sheet "summary" + hội thoại thành các lô gửi Gemini.
const cfg = $('Cấu hình').first().json;
const leads = $input.all().map((i) => i.json);
if (leads.length === 1 && leads[0]._empty) return [];

// Bảng tiêu chí: cột A = tên bộ lọc (ô gộp, chỉ dòng đầu có giá trị), B = LEAD NGON, C = LEAD DỞ
const rows = $('Đọc tiêu chí (summary)').first().json.values || [];
const filters = [];
let cur = null;
for (const r of rows) {
  const [a, b, c] = [r[0], r[1], r[2]].map((v) => String(v || '').trim());
  if (a && (!cur || cur.name !== a)) {
    cur = { name: a, ngon: [], do: [] };
    filters.push(cur);
  }
  if (!cur) continue;
  if (b) cur.ngon.push(b);
  if (c) cur.do.push(c);
}
if (!filters.length) throw new Error('Sheet "summary" trống hoặc không đọc được.');
const criteria = filters
  .map((f) => `### ${f.name}\n${f.ngon.map((x) => '  + ' + x).join('\n')}\n${f.do.map((x) => '  - ' + x).join('\n')}`)
  .join('\n\n');
const filterNames = filters.map((f) => f.name);

const system = `Bạn là chuyên viên đánh giá chất lượng lead cho một doanh nghiệp bán NỆM qua Facebook/Pancake.
Nhiệm vụ: đọc từng hội thoại và chấm lead theo ĐÚNG bộ tiêu chí dưới đây (dòng "+" là dấu hiệu LEAD NGON, dòng "-" là dấu hiệu LEAD DỞ).

${criteria}

QUY TẮC:
- Chấm lần lượt TỪNG bộ lọc ở trên, giữ nguyên tên bộ lọc. Mỗi bộ lọc cho kết quả: "NGON", "DO" hoặc "KHONG_RO" (khi hội thoại và dữ liệu đi kèm không có thông tin để kết luận cho bộ lọc đó).
- Bộ lọc về số điện thoại: dùng mọi dấu hiệu có trong hội thoại (khách để lại SĐT, nhân viên nhắn "gọi không nghe máy", "thuê bao", "zalo chặn người lạ", "đã kết bạn zalo", "đã gọi tư vấn"...) và trường "Dữ liệu SĐT từ Pancake" (báo xấu, tỉ lệ hoàn, bom hàng...). Không có dấu hiệu nào thì ghi KHONG_RO, KHÔNG được đoán.
- Bộ lọc về hồ sơ FB/Zalo: chỉ kết luận khi có thông tin (tên nick kiểu clone, nội dung nhân viên nhắc tới...), còn lại KHONG_RO.
- Kết luận chung (ket_luan):
  * "DO" nếu bộ lọc số điện thoại (bộ lọc quyết định) là DO, hoặc có dấu hiệu "loại ngay" rõ ràng (hỏi sai sản phẩm, giá phi thực tế, chỉ 1 tin cụt lủn/sticker/tin nhắn mặc định của Facebook rồi im lặng...).
  * "NGON" nếu có nhu cầu thật và tương tác 2 chiều, không vướng dấu hiệu loại ngay.
  * "CHUA_RO" nếu quá ít thông tin để kết luận.
- nhom_ly_do: nhãn ngắn (tối đa 6 từ) cho lý do chính, dùng lại cách diễn đạt của bảng tiêu chí để các lead cùng lý do có cùng nhãn. Ví dụ: "Tin nhắn cụt, 1 chiều", "Giá không thực tế", "Hỏi sai sản phẩm", "SĐT không liên lạc được", "Có nhu cầu rõ ràng".
- ly_do: 1-2 câu tiếng Việt, dẫn chứng cụ thể từ hội thoại.
- nhu_cau: sản phẩm/kích thước/chất liệu khách hỏi (nếu có), để trống nếu không có.
- Trả về đúng MỘT phần tử cho MỖI hội thoại, giữ nguyên conversation_id.

ĐỊNH DẠNG TRẢ VỀ: chỉ một mảng JSON, không kèm chữ nào khác, không dùng \`\`\`:
[{"conversation_id":"...","ket_luan":"NGON|DO|CHUA_RO","bo_loc":[{"ten":"<tên bộ lọc>","ket_qua":"NGON|DO|KHONG_RO","ly_do":"..."}],"nhom_ly_do":"...","ly_do":"...","nhu_cau":"..."}]`;


const size = Math.max(1, Number(cfg.so_hoi_thoai_moi_lan_goi_ai) || 10);
const out = [];
for (let i = 0; i < leads.length; i += size) {
  const chunk = leads.slice(i, i + size);
  const text = chunk.map((l) => [
    `===== HỘI THOẠI conversation_id=${l.conversation_id} =====`,
    `Page: ${l.page_name} | Loại: ${l.loai || 'INBOX'} | Khách: ${l.khach_hang} | Số tin khách: ${l.so_tin_khach} | Số tin page: ${l.so_tin_page}`,
    `Dữ liệu SĐT từ Pancake: ${l.du_lieu_sdt && l.du_lieu_sdt !== '{}' ? l.du_lieu_sdt : '(không có)'}`,
    l.transcript,
  ].join('\n')).join('\n\n');

  out.push({
    json: {
      conversation_ids: chunk.map((l) => l.conversation_id),
      filter_names: filterNames,
      body: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: `Chấm ${chunk.length} hội thoại sau:\n\n${text}` }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: 16384,
          ...(/2\.5-flash/.test(cfg.gemini_model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      },
    },
  });
}
return out;

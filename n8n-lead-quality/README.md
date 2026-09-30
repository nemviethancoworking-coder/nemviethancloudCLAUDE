# Pancake → Gemini: đánh giá chất lượng lead hằng ngày (n8n)

Mỗi ngày lúc 7h sáng (giờ VN), workflow thực hiện:

1. Lấy **tất cả page** trong tài khoản Pancake, sau đó lấy các hội thoại được **tạo trong ngày hôm qua** (00:00–23:59 giờ VN) cùng toàn bộ tin nhắn.
2. Đọc tiêu chí trực tiếp từ sheet **`summary`** của file *ĐÁNH GIÁ CHẤT LƯỢNG LEAD*. Khi bạn sửa sheet, lần chạy sau sẽ dùng tiêu chí mới.
3. Gửi hội thoại cho **Gemini** theo lô 10 hội thoại mỗi lần. Gemini chấm từng bộ lọc (Ngon / Dở / Không rõ) và đưa ra kết luận chung (Ngon / Dở / Chưa rõ) kèm lý do.
4. Ghi kết quả vào 2 tab (tự tạo nếu chưa có) trong cùng file Google Sheet:
   - `BC_CHI_TIET`: mỗi lead một dòng, có link mở hội thoại trên Pancake.
   - `BC_NGAY`: mỗi ngày một dòng thống kê, gồm tỉ lệ ngon, số lead dở theo từng bộ lọc, lý do dở phổ biến và số liệu theo page.

   Nếu chạy lại cùng một ngày, dữ liệu sẽ được cập nhật chứ không bị nhân đôi.
5. Trang dashboard (Artifact) đọc 2 tab này để hiển thị.

## Cài đặt trên n8n

1. Mở node **Cấu hình**:
   - `pancake_access_token`: token tài khoản Pancake (Pancake → Cài đặt → API). Workflow tự tạo token cho từng page.
   - `ngay_bao_cao`: để trống thì tự lấy ngày hôm qua. Điền `YYYY-MM-DD` để chạy lại một ngày cụ thể.
   - `chi_quet_page_ids`: để trống thì quét tất cả page. Điền danh sách ID cách nhau bằng dấu phẩy để giới hạn.
2. Gán credential:
   - Mọi node HTTP làm việc với sheet (*Tạo tab…, Tiêu đề…, Đọc tiêu chí, Đọc khóa…, Thêm vào…, Cập nhật…*): dùng *Google Sheets OAuth2 API*.
   - Node **Gemini chấm lead**: dùng *Google Gemini (PaLM) API*, lấy key tại https://aistudio.google.com/apikey.
3. Bấm **Test workflow** (nút "Chạy thử"), kiểm tra 2 tab mới trong sheet, rồi bật **Active**.

## Giới hạn

- Các tiêu chí như *SĐT bị tô đỏ*, *bom hàng*, *gọi không nghe máy*, *Zalo* hay *FB clone* phần lớn không nằm trong nội dung tin nhắn. AI chỉ kết luận được khi:
  - nhân viên có nhắn trong hội thoại (ví dụ "em gọi mà chị không nghe máy"), hoặc
  - Pancake trả về dữ liệu báo xấu hay SĐT.

  Các trường hợp còn lại được ghi **Không rõ** chứ AI không đoán.

## Build / deploy

```bash
node build.mjs                      # sinh lại workflow.json từ ./nodes/*.js
N8N_API_KEY=... ./deploy.sh         # tạo/cập nhật workflow trên https://ttpemqkjp.tino.page
```

Nếu không dùng API: vào n8n, chọn **⋯ → Import from File** rồi chọn `workflow.json`.

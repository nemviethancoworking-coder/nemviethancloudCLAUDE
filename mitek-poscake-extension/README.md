# Mitek ghi âm cho POScake (Chrome extension)

Nghe lại ghi âm cuộc gọi tổng đài **Mitek** ngay trên **trang đơn hàng POScake** (pos.pancake.vn hoặc pos.pages.fm), không cần tải file hay mở Mitek.

## Cách hoạt động

1. Trên trang đơn hàng POScake, góc phải dưới có nút **🎧 Ghi âm**.
2. Bấm vào nút: extension tự lấy SĐT khách trong cửa sổ chi tiết đơn đang mở, gọi API Mitek và hiện danh sách cuộc gọi với số đó.
3. Bấm **▶ Nghe** để phát ghi âm ngay trong bảng.
4. Cách khác: bôi đen một số điện thoại bất kỳ trên POScake → chuột phải → **Nghe ghi âm Mitek của số "..."**.

Link ghi âm của Mitek cần đăng nhập. Extension tải file bằng phiên đăng nhập Mitek có sẵn trên Chrome, rồi phát trực tiếp. File không được lưu vào máy.

## Cài đặt (mỗi máy nhân viên)

> Khi cập nhật bản mới: vào `chrome://extensions`, bấm nút ↻ (Tải lại) trên thẻ extension, rồi F5 trang POScake.

1. Tải thư mục `mitek-poscake-extension` về máy.
2. Mở Chrome, vào `chrome://extensions`, bật **Chế độ dành cho nhà phát triển** (Developer mode).
3. Bấm **Tải tiện ích đã giải nén** (Load unpacked) và chọn thư mục `mitek-poscake-extension`.
4. Bấm vào biểu tượng extension (hoặc **Chi tiết → Tuỳ chọn tiện ích**) để mở trang cấu hình.

## Cấu hình (làm 1 lần)

Extension dùng API **Get Call Logs** của Mitek (`POST MITEK_URL/cdr/getCallsLog`, theo tài liệu *CallCenter Webhook&API v1.5.1*). Với mỗi SĐT, extension gọi 2 lần: `srcs` (khách gọi đến) và `dsts` (gọi ra cho khách), mỗi lần tối đa 100 cuộc/trang. Sau đó gộp lại và xếp mới nhất lên đầu.

1. Mở Tuỳ chọn, điền:
   - **MITEK_URL**: địa chỉ tổng đài Mitek cấp, VD `https://abc.mitek.vn` (không gồm `/cdr/getCallsLog`).
   - **Secret**: mã secret Mitek cấp.
2. Nhập SĐT một khách đã từng gọi, bấm **Thử kết nối** và chọn **Cho phép** khi Chrome hỏi quyền.
3. Nếu kết nối OK, sẽ hiện nút **Cấp quyền nghe ghi âm (https://rec...)**. Bấm vào nút và chọn **Cho phép**. Tên miền chứa file ghi âm thường khác MITEK_URL.
4. Nếu link ghi âm cần đăng nhập, giữ bật ô **Dùng phiên đăng nhập Mitek** và đăng nhập Mitek trên cùng Chrome đó.

> Cấu hình (kể cả secret) được lưu trong `chrome.storage.local` trên từng máy. Nhân viên nào có quyền mở trang Tuỳ chọn thì xem được secret. Không commit secret vào mã nguồn.

## Lỗi thường gặp

- **"Mitek từ chối truy cập" / "không đúng dạng danh sách"**: secret sai hoặc MITEK_URL sai.
- **"Chưa cấp quyền cho tên miền ghi âm"**: vào Tuỳ chọn, bấm Thử kết nối rồi bấm Cấp quyền nghe ghi âm.
- **"Mitek trả về trang đăng nhập"**: đăng nhập lại Mitek trên cùng Chrome.
- **Thiếu cuộc gọi ra**: nếu tổng đài lưu số gọi ra có tiền tố (VD `9` hay `84`), báo lại để chỉnh.
- **Không tự nhận SĐT / nhận sai số**: gõ số vào ô trong bảng, hoặc điền CSS selector vùng chứa SĐT khách ở mục 3 của Tuỳ chọn.

## Phát triển

```
npm test   # kiểm tra các hàm xử lý SĐT, ánh xạ dữ liệu
```

Các file:
- `manifest.json`: khai báo extension (Manifest V3)
- `background.js`: gọi API Mitek `cdr/getCallsLog` và tải file ghi âm (tránh bị chặn CORS)
- `content.js`, `content.css`: nút và bảng nghe ghi âm trên POScake
- `options.html`, `options.js`: trang cấu hình
- `lib/utils.js`, `lib/defaults.js`: hàm dùng chung và cấu hình mặc định

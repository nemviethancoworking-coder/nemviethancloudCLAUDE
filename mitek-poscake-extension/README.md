# Mitek ghi âm cho POScake (Chrome extension)

Nghe lại ghi âm cuộc gọi tổng đài **Mitek** ngay trên **trang đơn hàng POScake** (pos.pages.fm), không cần tải file hay mở Mitek.

## Cách hoạt động

1. Trên trang đơn hàng POScake, góc phải dưới có nút **🎧 Ghi âm**.
2. Bấm vào nút: extension tự lấy SĐT khách trong cửa sổ chi tiết đơn đang mở, gọi API Mitek và hiện danh sách cuộc gọi với số đó.
3. Bấm **▶ Nghe** để phát ghi âm ngay trong bảng.
4. Cách khác: bôi đen một số điện thoại bất kỳ trên POScake → chuột phải → **Nghe ghi âm Mitek của số "..."**.

Link ghi âm của Mitek cần đăng nhập. Extension tải file bằng API key và/hoặc phiên đăng nhập Mitek có sẵn trên Chrome, rồi phát trực tiếp. File không được lưu vào máy.

## Cài đặt (mỗi máy nhân viên)

1. Tải thư mục `mitek-poscake-extension` về máy.
2. Mở Chrome, vào `chrome://extensions`, bật **Chế độ dành cho nhà phát triển** (Developer mode).
3. Bấm **Tải tiện ích đã giải nén** (Load unpacked) và chọn thư mục `mitek-poscake-extension`.
4. Bấm vào biểu tượng extension (hoặc **Chi tiết → Tuỳ chọn tiện ích**) để mở trang cấu hình.

## Cấu hình (làm 1 lần)

Điền theo tài liệu API mà Mitek cấp:

| Ô | Ví dụ | Ghi chú |
|---|---|---|
| Địa chỉ gốc API | `https://api.mitek.vn` | |
| URL lịch sử cuộc gọi | `https://api.mitek.vn/v1/cdr?phone={phone}&from={from}&to={to}` | `{phone}`, `{from}`, `{to}` được tự điền |
| Header xác thực | `Authorization` / `Bearer xxx` | Hoặc `X-API-Key` tuỳ Mitek |
| Dùng phiên đăng nhập Mitek | ✔ | Bật nếu ghi âm chỉ nghe được khi đã đăng nhập |
| Đường dẫn danh sách | `data` | Vị trí mảng cuộc gọi trong JSON |
| Các trường | `start_time`, `duration`, `direction`, `extension`, `recording_url` | Đổi theo tên trường thật |

Sau đó nhập một SĐT đã từng gọi vào ô bên cạnh nút **Thử kết nối** rồi bấm nút. Trang sẽ hiện **JSON gốc** Mitek trả về. Bạn nhìn vào đó để sửa các ô tên trường cho đúng, rồi bấm **Lưu**. Chrome sẽ hỏi cấp quyền truy cập tên miền Mitek: chọn **Cho phép**.

Nếu Mitek chỉ trả **mã file** thay vì link ghi âm, điền ô **Mẫu URL file ghi âm**, ví dụ `https://api.mitek.vn/v1/recording/{value}`.

> Cấu hình được lưu bằng `chrome.storage.sync`, tức là đồng bộ theo tài khoản Google trên Chrome. Không commit API key vào mã nguồn.

## Lỗi thường gặp

- **"Mitek từ chối truy cập (401/403)"**: API key sai, hoặc phiên đăng nhập Mitek trên Chrome đã hết hạn.
- **"Mitek trả về trang đăng nhập"**: đăng nhập lại Mitek trên cùng Chrome.
- **Không tìm thấy danh sách cuộc gọi**: ô "Đường dẫn danh sách" chưa đúng. Xem JSON gốc khi bấm Thử kết nối.
- **Không tự nhận SĐT / nhận sai số**: gõ số vào ô trong bảng, hoặc điền CSS selector vùng chứa SĐT khách ở mục 3 của Tuỳ chọn.

## Phát triển

```
npm test   # kiểm tra các hàm xử lý SĐT, ánh xạ dữ liệu
```

Các file:
- `manifest.json`: khai báo extension (Manifest V3)
- `background.js`: gọi API Mitek và tải file ghi âm (tránh bị chặn CORS)
- `content.js`, `content.css`: nút và bảng nghe ghi âm trên POScake
- `options.html`, `options.js`: trang cấu hình
- `lib/utils.js`, `lib/defaults.js`: hàm dùng chung và cấu hình mặc định

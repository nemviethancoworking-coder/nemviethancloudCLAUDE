# OKR Weekly — máy chủ riêng (Node.js + PostgreSQL)

Thay cho Google Sheet + Apps Script. Chạy trên VPS n8n của Tino (`ttpemqkjp.tino.page`), cụm Docker riêng `okr`, không đụng vào n8n.

## Cài đặt / cập nhật (root trên VPS)
```bash
curl -fsSL https://raw.githubusercontent.com/nemviethancoworking-coder/nemviethancloudCLAUDE/claude/practical-gates-o54zqp/okr-server/install.sh | bash
```
- Lần đầu: hỏi tài khoản Giám đốc của app cũ để chuyển toàn bộ dữ liệu từ Google Sheet sang (mật khẩu Giám đốc giữ nguyên, người khác nhận mật khẩu tạm in ra màn hình).
- Chạy lại = cập nhật code, giữ nguyên dữ liệu và bí mật trong `/opt/okr/.env`.
- Nginx: thêm `include /etc/nginx/snippets/okr-api.conf;` vào khối `server_name ttpemqkjp.tino.page` → `https://ttpemqkjp.tino.page/okr-api/`. Bản cũ lưu ở `/opt/okr/backups/nginx-<thời gian>/`; nếu `nginx -t` lỗi thì tự hoàn tác.

## Thành phần
| | |
|---|---|
| `src/server.js` | API (giao thức giống Code.gs v4: GET `?token=&v=`, POST `{action,payload,token,lite}`) |
| `dist/server.js` | bản đóng gói 1 file (kèm thư viện `pg`) — máy chủ không cần `npm install`. Build: `npm run build` |
| `docker-compose.yml` | `db` (PostgreSQL 16, 512MB) + `api` (Node 22, 256MB, chỉ mở `127.0.0.1:3100`) |
| `install.sh` | cài / cập nhật |
| `backup.sh` | `pg_dump` hằng ngày 02:30 vào `/opt/okr/backups`, giữ 14 bản |

## Khác Apps Script
- Mật khẩu mã hoá scrypt; khoá đăng nhập 15 phút sau 8 lần sai (theo IP + tài khoản).
- Mỗi thao tác ghi là 1 giao dịch PostgreSQL, ghi tuần tự → không mất/trùng dữ liệu khi nhiều người gửi cùng lúc.
- `dataVersion`: app tự làm mới gửi `v=`; không có gì mới → trả 54 byte. Dữ liệu nén gzip. Thao tác ghi trả kết quả gọn (`lite`).
- CORS chỉ cho phép `https://nemviethancoworking-coder.github.io`.

## Tài khoản (v6)
- Giám đốc thêm/sửa/đặt lại mật khẩu ở màn **Nhân sự & phân quyền**.
- **Khoá** (`setUserActive`): người bị khoá không đăng nhập được, phiên đang mở bị đăng xuất ở lần gọi API kế tiếp; OKR/báo cáo/công việc cũ giữ nguyên; không giao việc/OKR mới cho họ. Không khoá được người còn cấp dưới đang hoạt động; không mở khoá khi cấp trên trực tiếp đang bị khoá.
- **Xoá hẳn** (`deleteUser`): chỉ khi tài khoản chưa có OKR, báo cáo, công việc, phản hồi và không có ai trực thuộc (tài khoản tạo nhầm).
- **Tự đổi mật khẩu** (`changePassword`): mọi người, cần mật khẩu hiện tại, tối thiểu 6 ký tự; sai 8 lần → chờ 15 phút.
- Cột `users.active` được tự thêm khi máy chủ khởi động (dữ liệu cũ: tất cả đang hoạt động).

## Đo kiểm (50 người, dữ liệu 1 năm: 2.548 báo cáo, 10.192 việc)
- 40 báo cáo + 30 cập nhật việc cùng lúc: 0 lỗi, trung vị 0,23 giây, chậm nhất 0,32 giây; không mất, không trùng.
- Tự làm mới khi không có gì mới: 43 ms. Dữ liệu một nhân viên tải về (đã nén): ~77 KB.
- Giao diện (CPU chậm ×4): mọi màn hình < 1 giây (danh sách hiển thị theo trang 100 báo cáo / 200 việc).

## Vận hành
```bash
cd /opt/okr
docker compose logs -f api                                  # xem log
docker compose exec api node /app/server.js set-password <tên> <mật khẩu>
./backup.sh                                                 # sao lưu ngay
gunzip -c backups/okr-YYYY-MM-DD.sql.gz | docker compose exec -T db psql -U okr -d okr   # khôi phục
```

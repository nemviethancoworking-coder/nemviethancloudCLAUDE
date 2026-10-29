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
| `src/work.js` | module quản lý công việc (v8): Workspace → Phòng ban → Dự án → Công việc, phân quyền, lặp lại, bình luận, tệp đính kèm |
| `test/work.test.js` | 24 kiểm thử với PostgreSQL thật (gồm nâng cấp v7 → v8 và chuyển việc lặp lại cũ sang mẫu): `PGHOST=… PGUSER=… PGPASSWORD=… npm test` |
| `backup.sh` | `pg_dump` hằng ngày 02:30 + nén thư mục `uploads/` (tệp đính kèm), giữ 14 / 7 bản trong `/opt/okr/backups` |

## Khác Apps Script
- Mật khẩu mã hoá scrypt; khoá đăng nhập 15 phút sau 8 lần sai (theo IP + tài khoản).
- Mỗi thao tác ghi là 1 giao dịch PostgreSQL, ghi tuần tự → không mất/trùng dữ liệu khi nhiều người gửi cùng lúc.
- `dataVersion`: app tự làm mới gửi `v=`; không có gì mới → trả 54 byte. Dữ liệu nén gzip. Thao tác ghi trả kết quả gọn (`lite`).
- CORS chỉ cho phép `https://nemviethancoworking-coder.github.io`.

## Quản lý công việc (v8)
Giao diện: màn **Công việc** (`docs/okr/work.js`): Kanban kéo thả, Danh sách, Tổng quan thống kê.
- **Cấp bậc**: Workspace → Phòng ban → Dự án → Công việc. Bản nâng cấp tự tạo Workspace "Công ty", phòng ban "Chung", dự án "Công việc chung"; công việc cũ (kể cả việc sinh từ báo cáo tuần) được gom vào dự án này, không mất dữ liệu.
- **Phân quyền** (ánh xạ từ 4 cấp sẵn có): Giám đốc = Admin/Owner; Trưởng phòng / Quản lý = quản lý dự án (tạo dự án, thấy toàn bộ việc dự án mình quản lý hoặc thuộc phòng mình đứng đầu); Nhân viên = thành viên. Mặc định nhân viên chỉ thấy việc của mình, cấp trên thấy việc của cấp dưới; bật "Mọi thành viên xem được tất cả" ở dự án để cả nhóm xem hết. Mọi quyền được máy chủ kiểm tra lại.
- **Công việc**: tên, mô tả, trạng thái (Cần làm / Đang làm / Chờ duyệt / Hoàn thành), ưu tiên (Thấp → Khẩn cấp), nhiều người thực hiện (một trạng thái chung), hạn, nhãn, việc con.
- **Lặp lại** (hằng ngày mỗi N ngày / hằng tuần theo thứ chọn / hằng tháng theo ngày cố định, kèm ngày kết thúc tuỳ chọn): khi chuyển sang **Hoàn thành**, máy chủ tự tạo đúng 1 việc kế tiếp, hạn tính từ hạn cũ (trễ thì nhảy tới lần gần nhất trong tương lai), nội dung lấy theo **mẫu** hiện tại, bỏ tích việc con. Từ v9 lịch lặp chỉ tạo/sửa ở mục **Việc lặp lại** (bảng `recurring_tasks`).
- **Bình luận** có `@nhắc tên` và giờ; **tệp đính kèm** (ảnh, PDF, Office, txt/csv, zip…) tối đa 20 MB/tệp, 30 tệp/việc, lưu ở `/opt/okr/uploads` (volume Docker `./uploads`), chỉ người xem được việc mới tải được.
- **API mới**: GET `?work=1&ws=<id>` (dữ liệu Workspace), GET `?workTask=<id>` (bình luận + tệp), GET `/file/<id>?token=`, POST `/upload?taskId=&name=` (header `X-Okr-Token`), hành động `saveWorkspace`, `saveDepartment`, `saveProject`, `saveTask`, `moveTask`, `deleteTask`, `deleteAttachment`, `addTaskComment`… Giao thức cũ vẫn dùng được.
- **Cập nhật**: chạy lại `install.sh` (tạo thư mục `uploads`, nới Nginx `client_max_body_size 22m`). Cập nhật máy chủ **trước**, rồi mới hợp nhất giao diện để GitHub Pages triển khai.
- **Khôi phục tệp**: `tar -xzf backups/uploads-YYYY-MM-DD.tar.gz -C /opt/okr` (cùng với khôi phục `pg_dump`).

## Tách "nơi tạo" và "bảng làm việc" (v9)
- **Việc đã tạo bị khoá nội dung**: trên Kanban / Danh sách, bấm vào việc chỉ xem tên, mô tả, ưu tiên, hạn, nhãn. Chỉ đổi được trạng thái, tick việc con (`toggleSubtask`), giao lại (`reassignTask`), bình luận, đính kèm tệp.
- **Sửa tên / mô tả / nội dung**: chỉ **người tạo**, ở mục **Việc tôi tạo** (`saveTask` từ chối mọi người khác, kể cả Giám đốc; việc sinh từ lịch lặp thì sửa ở mẫu).
- **Giao việc không giới hạn cấp bậc**: ai cũng giao cho bất kỳ người đang hoạt động; người nhận mới tự được thêm vào dự án đóng. Người nhận, người tạo hoặc cấp trên **giao lại** được cho người khác (ghi vào bình luận).
- **Xem việc**: quy tắc cũ + người tạo + người nhận. **Xoá việc**: người tạo, cấp trên của người tạo, Giám đốc.
- **Việc lặp lại** (`saveRecurring`, `deleteRecurring`): ai cũng tạo được và giao cho người khác; tạo xong sinh ngay việc đầu tiên. Sửa/xoá: người tạo, cấp trên của họ, Giám đốc. Sửa mẫu chỉ ảnh hưởng việc sinh sau; việc đã sinh giữ nguyên. Xoá mẫu: việc đã sinh còn nguyên, không sinh thêm.
- **Nâng cấp từ v8**: khi khởi động, mỗi việc lặp lại cũ còn mở được chuyển thành 1 mẫu (id `r_<mã việc>`), chạy lại an toàn. Chạy lại `install.sh` rồi mới hợp nhất giao diện.

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

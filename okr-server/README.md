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
- **Phân quyền** (ánh xạ từ 4 cấp sẵn có): Giám đốc = Admin/Owner; Trưởng phòng / Quản lý tạo dự án, giao việc. Quyền **xem / sửa / xoá việc** theo quy tắc v11 bên dưới; mọi quyền được máy chủ kiểm tra lại.
- **Công việc**: tên, mô tả, trạng thái (Cần làm / Đang làm / Chờ duyệt / Hoàn thành), ưu tiên (Thấp → Khẩn cấp), nhiều người thực hiện (một trạng thái chung), hạn, nhãn, việc con.
- **Lặp lại** (hằng ngày mỗi N ngày / hằng tuần theo thứ chọn / hằng tháng theo ngày cố định, kèm ngày kết thúc tuỳ chọn): khi chuyển sang **Hoàn thành**, máy chủ tự tạo đúng 1 việc kế tiếp, hạn tính từ hạn cũ (trễ thì nhảy tới lần gần nhất trong tương lai), nội dung lấy theo **mẫu** hiện tại, bỏ tích việc con. Từ v9 lịch lặp chỉ tạo/sửa ở mục **Việc lặp lại** (bảng `recurring_tasks`).
- **Bình luận** có `@nhắc tên` và giờ; **tệp đính kèm** (ảnh, PDF, Office, txt/csv, zip…) tối đa 10 MB/tệp (từ v12; trước là 20 MB), 30 tệp/việc, lưu ở `/opt/okr/uploads` (volume Docker `./uploads`), chỉ người xem được việc mới tải được.
- **API mới**: GET `?work=1&ws=<id>` (dữ liệu Workspace), GET `?workTask=<id>` (bình luận + tệp), GET `/file/<id>?token=`, POST `/upload?taskId=&name=` (header `X-Okr-Token`), hành động `saveWorkspace`, `saveDepartment`, `saveProject`, `saveTask`, `moveTask`, `deleteTask`, `deleteAttachment`, `addTaskComment`… Giao thức cũ vẫn dùng được.
- **Cập nhật**: chạy lại `install.sh` (tạo thư mục `uploads`, nới Nginx `client_max_body_size 12m`). Cập nhật máy chủ **trước**, rồi mới hợp nhất giao diện để GitHub Pages triển khai.
- **Khôi phục tệp**: `tar -xzf backups/uploads-YYYY-MM-DD.tar.gz -C /opt/okr` (cùng với khôi phục `pg_dump`).

## Ngày bắt đầu, đính kèm khi tạo việc, email thông báo (v12)
- Nhãn trạng thái **"Cần làm" → "Chưa thực hiện"** (chỉ đổi tên hiển thị; mã `todo` trong dữ liệu giữ nguyên).
- **Ngày bắt đầu** (`tasks.start_date`): bắt buộc khi tạo việc, không được sau hạn chót; việc cũ chưa có thì để trống, sửa lại không bị ép nhập. Việc sinh từ việc lặp lại / báo cáo tuần lấy ngày hôm nay (hoặc hạn nếu hạn đã qua).
- **Đính kèm ngay trong form tạo việc**: chọn tệp trong form, bấm Thêm công việc → việc được lưu rồi tệp tải lên lần lượt (lỗi từng tệp được báo riêng, việc vẫn giữ). Giới hạn 10 MB/tệp (`MAX_UPLOAD_MB`).
- **Email thông báo** (Gmail SMTP, `src/mail.js`) gửi khi: được giao việc mới, được giao lại việc, quản lý phản hồi báo cáo tuần, có bình luận mới trên việc (gửi người tạo, người nhận, người theo dõi và người được @nhắc, trừ người viết). Gửi ở nền sau khi lưu thành công; lỗi chỉ ghi log, không làm hỏng thao tác.
  - Cấu hình: `SMTP_USER` (mặc định `nemviethancoworking@gmail.com`), `SMTP_PASS` = **Mật khẩu ứng dụng** 16 ký tự của tài khoản Gmail đó (Tài khoản Google → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng), `APP_URL`. Không có `SMTP_PASS` thì email tắt, app vẫn chạy.
  - Địa chỉ nhận là **email trong tài khoản từng người** (Nhân sự → Sửa → "Email nhận thông báo"). Người chưa có email, hoặc đã bị khoá, sẽ không nhận. Email không nằm trong dữ liệu chung; chỉ Giám đốc xem/sửa được.
- **Cập nhật**: sao lưu (`./backup.sh`) rồi chạy lại `install.sh`; có thể truyền sẵn `SMTP_PASS='xxxx xxxx xxxx xxxx' bash install.sh` hoặc nhập khi script hỏi (Enter = bỏ qua, tắt email). Cập nhật máy chủ trước, rồi mới hợp nhất giao diện.

## Tách "nơi tạo" và "bảng làm việc" (v9)
- **Việc đã tạo bị khoá nội dung**: trên Kanban / Danh sách, bấm vào việc chỉ xem tên, mô tả, ưu tiên, hạn, nhãn. Chỉ đổi được trạng thái, tick việc con (`toggleSubtask`), giao lại (`reassignTask`), bình luận, đính kèm tệp.
- **Sửa tên / mô tả / nội dung**: chỉ **người tạo**, ở mục **Việc tôi tạo** (`saveTask` từ chối mọi người khác, kể cả Giám đốc; việc sinh từ lịch lặp thì sửa ở mẫu).
- **Giao việc không giới hạn cấp bậc**: ai cũng giao cho bất kỳ người đang hoạt động; người nhận mới tự được thêm vào dự án đóng. Người nhận, người tạo hoặc cấp trên **giao lại** được cho người khác (ghi vào bình luận).
- **Xem / xoá việc**: xem bản v11 bên dưới (quy tắc xem của v8–v10 đã được thay thế).
- **Việc lặp lại** (`saveRecurring`, `deleteRecurring`): ai cũng tạo được và giao cho người khác; tạo xong sinh ngay việc đầu tiên. Sửa/xoá: người tạo, cấp trên của họ, Giám đốc. Sửa mẫu chỉ ảnh hưởng việc sinh sau; việc đã sinh giữ nguyên. Xoá mẫu: việc đã sinh còn nguyên, không sinh thêm.
- **Nâng cấp từ v8**: khi khởi động, mỗi việc lặp lại cũ còn mở được chuyển thành 1 mẫu (id `r_<mã việc>`), chạy lại an toàn. Chạy lại `install.sh` rồi mới hợp nhất giao diện.

## Người theo dõi, quyền xem mới, rich text (v11)
- **Quyền XEM việc** (thay hẳn quy tắc cũ; tuỳ chọn dự án `share_all` và "quản lý dự án thấy hết việc trong dự án" không còn hiệu lực, cột vẫn giữ trong DB): **Giám đốc & Trưởng phòng** thấy mọi việc toàn công ty; **Quản lý** thấy việc mình tạo/nhận/theo dõi + việc có người tạo hoặc người nhận là cấp dưới trong chuỗi quản lý; **Nhân viên** chỉ thấy việc mình tạo/nhận/theo dõi. Việc cũ không rõ người tạo coi như theo người nhận. Áp dụng cho màn Công việc, `db.tasks` (đường cũ của màn báo cáo tuần), chi tiết, bình luận, tệp.
- **Quyền SỬA** (đổi trạng thái, tick việc con, giao lại, kéo thả, tải lên/xoá tệp của người khác): Giám đốc, Trưởng phòng, người tạo, người nhận, hoặc Quản lý có chuỗi quản lý trên một người nhận/người tạo. **Quyền XOÁ**: Giám đốc, người tạo, cấp trên (chuỗi quản lý) của người tạo — Trưởng phòng ngoài chuỗi chỉ xem, không xoá; việc không rõ người tạo: cấp trên của người nhận.
- **Người theo dõi** (bảng `task_followers`, cột `recurring_tasks.followers`): chỉ xem việc, đọc + viết bình luận, xem/tải tệp; không đổi trạng thái, không tick việc con, không giao lại, không tải lên/xoá tệp, không sửa nội dung. Người tạo, người nhận và Giám đốc thêm/bớt qua `setFollowers { id, followerIds }` (ghi bình luận hệ thống, nhắc tên người mới, người mới tự vào dự án đóng); `saveTask` và `saveRecurring` nhận thêm `followerIds`. Người thực hiện tự bị loại khỏi danh sách theo dõi. JSON việc có thêm `followerIds`; chi tiết việc (`?workTask=`) có thêm `followerIds`, `canFollow`.
- **Rich text**: chuỗi bắt đầu bằng `<!--rt-->` được máy chủ làm sạch lại (chỉ giữ `<b>`, `<i>`, `<br>`, `<span class="c-red|c-orange|c-blue">`; bỏ mọi thẻ/thuộc tính khác, escape lại chữ). Áp dụng cho nội dung báo cáo (work/issues/causes, kể cả trong từng KR), phản hồi báo cáo, mô tả việc (≤ 20000), mô tả mẫu lặp lại, bình luận việc (≤ 12000). Chuỗi không có tiền tố là văn bản thuần cũ, giữ nguyên.
- **Nâng cấp từ v9/v10**: chạy lại `install.sh` (migrate tự chạy, an toàn khi chạy lại). Cập nhật máy chủ **trước**, rồi mới hợp nhất giao diện.
- **Kiểm thử**: `PGHOST=… npm test` (cần PostgreSQL); `node --test test/rich.test.js` (làm sạch rich text, không cần DB).

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

## Thời gian hoàn thành, dán ảnh vào mô tả, việc lặp lại hẹn ngày (v16)
- **Thời gian hoàn thành (giờ)**: ô tuỳ chọn khi tạo/sửa việc và khi tạo mẫu việc lặp lại (`tasks.est_hours`, `recurring_tasks.est_hours`; số dương ≤ 1000, làm tròn 2 chữ số). Hiện trên thẻ Kanban, danh sách và chi tiết việc; mẫu lặp lại chép sang mọi việc sinh ra. Không gửi trường này khi sửa = giữ nguyên.
- **Dán ảnh vào ô Mô tả** (việc và việc lặp lại): Ctrl+V ảnh chụp màn hình / ảnh đã sao chép. Ảnh >1,5MB hoặc >2000px được thu nhỏ ở trình duyệt (tối đa 1600px). Ảnh tải lên qua `POST /upload-inline?name=` (header `X-Okr-Token`; PNG/JPG/GIF/WebP, tối đa 10MB, kiểm tra byte đầu của tệp), lưu ở `uploads/.inline/` + bảng `inline_images`; mô tả chỉ lưu **mã ảnh** (`<img data-f="mã">`), máy chủ bỏ mọi `src`/thuộc tính khác và giới hạn 20 ảnh mỗi nội dung. Xem ảnh qua `GET /file/<mã>?token=` (người đăng nhập nào cũng xem được khi có mã). Có chữ trong clipboard (vd. sao chép từ Excel) thì vẫn dán chữ. `backup.sh` đã nén cả thư mục `uploads/` nên gồm luôn ảnh dán.
- **Việc lặp lại chỉ xuất hiện khi đến ngày**: bấm **Hoàn thành** không còn tạo ngay việc kế tiếp. Máy chủ tính ngày kế tiếp theo lịch (từ hạn cũ; trễ thì nhảy tới lần gần nhất), nếu chưa đến ngày thì **hẹn** (`recurring_tasks.next_due`; việc cũ đánh dấu `spawned_id = 'pending'`) và tự tạo việc khi đến ngày (giờ GMT+7): kiểm tra khi khởi động và mỗi 5 phút. Ngày hẹn đã trôi qua (máy chủ tắt lâu) → nhảy tới lần gần nhất chưa qua, không tạo việc quá hạn; quá ngày kết thúc thì bỏ hẹn. Kết quả `moveTask`/`updateTask` có `result.scheduled = { due, title }` (hẹn ngày) hoặc `result.spawned` (ngày kế tiếp chính là hôm nay → tạo ngay). Mục **Việc lặp lại** hiện "Sẽ xuất hiện ngày …". Sửa mẫu khi đang hẹn ngày giữ nguyên ngày hẹn (đổi lịch thì lấy lần đầu tiên từ ngày hẹn trở đi). Việc đầu tiên khi tạo mẫu vẫn tạo ngay như cũ.
- **Cập nhật**: chạy lại `install.sh` (tự thêm cột/bảng mới, chạy lại an toàn), rồi mới hợp nhất giao diện. Giao diện v16 gọi `/upload-inline` nên cần máy chủ v16 trước.

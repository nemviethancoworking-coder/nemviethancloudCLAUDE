#!/usr/bin/env bash
# =====================================================================
#  Cài đặt / cập nhật máy chủ OKR Weekly (API Node.js + PostgreSQL)
#  Chạy bằng root trên VPS:
#    curl -fsSL https://raw.githubusercontent.com/nemviethancoworking-coder/nemviethancloudCLAUDE/claude/practical-gates-o54zqp/okr-server/install.sh | bash
#  - Cụm Docker riêng tên "okr" tại /opt/okr, KHÔNG đụng vào cụm n8n.
#  - Thêm đường dẫn https://<tên miền>/okr-api/ vào Nginx (sao lưu file cũ, tự hoàn tác nếu cấu hình lỗi).
#  - Lần đầu: chuyển dữ liệu từ Google Sheet (Apps Script) sang. Chạy lại = cập nhật code, giữ nguyên dữ liệu.
#  - Sao lưu CSDL hằng ngày 02:30, giữ 14 bản.
# =====================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-ttpemqkjp.tino.page}"
DIR=/opt/okr
BRANCH="${BRANCH:-claude/practical-gates-o54zqp}"
RAW="https://raw.githubusercontent.com/nemviethancoworking-coder/nemviethancloudCLAUDE/${BRANCH}/okr-server"
ORIGINS="${ALLOWED_ORIGINS:-https://nemviethancoworking-coder.github.io}"
GAS_URL="${GAS_URL:-https://script.google.com/macros/s/AKfycbx_BEECWvgjzcw30IuZ1JlyE2NohY7PNO_GE7q55g7bBU3USVXOrG9ujxFo5dkvMGvSZw/exec}"
SNIPPET=/etc/nginx/snippets/okr-api.conf
TS=$(date +%Y%m%d-%H%M%S)

say()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m  ✓ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m  ✗ %s\033[0m\n' "$*"; exit 1; }
ask()  { local a=""; if [ -r /dev/tty ]; then read -r -p "$1" a < /dev/tty || true; fi; printf '%s' "${a:-$2}"; }
asks() { local a=""; if [ -r /dev/tty ]; then read -r -s -p "$1" a < /dev/tty || true; echo > /dev/tty; fi; printf '%s' "$a"; }
rand() { local r; r=$(head -c 96 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' || true); printf '%s' "${r:0:$1}"; }
dc()   { docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" "$@"; }

# Toàn bộ phần chạy nằm trong main() và chỉ được gọi ở dòng cuối: khi chạy kiểu "curl | bash",
# bash phải đọc hết script trước, nên không lệnh nào (vd docker compose exec) "nuốt" mất phần còn lại.
main() {
[ "$(id -u)" = 0 ] || die "Cần chạy bằng root."
command -v docker >/dev/null || die "Chưa có Docker."
docker compose version >/dev/null 2>&1 || die "Chưa có Docker Compose."
command -v curl >/dev/null || die "Chưa có curl."

# ---------------------------------------------------------------- 1. Tải code
say "1/6 Tải code vào $DIR"
mkdir -p "$DIR/backups" "$DIR/app" "$DIR/uploads"
chown 1000:1000 "$DIR/uploads"           # container API chạy bằng uid 1000 và cần ghi tệp đính kèm vào đây
chmod 750 "$DIR/uploads"
for f in dist/server.js docker-compose.yml backup.sh; do
  curl -fsSL "$RAW/$f?t=$TS" -o "$DIR/$(basename "$f").new" || die "Không tải được $f"
done
[ -f "$DIR/app/server.js" ] && cp "$DIR/app/server.js" "$DIR/backups/server.js.$TS"
mv "$DIR/server.js.new" "$DIR/app/server.js"
for f in docker-compose.yml backup.sh; do mv "$DIR/$f.new" "$DIR/$f"; done
chmod 700 "$DIR/backup.sh"
ok "Đã tải server.js, docker-compose.yml, backup.sh"

# ---------------------------------------------------------------- 2. Cấu hình bí mật (.env)
say "2/6 Cấu hình"
touch "$DIR/.env"; chmod 600 "$DIR/.env"
setenv() { if grep -q "^$1=" "$DIR/.env"; then sed -i "s|^$1=.*|$1=$2|" "$DIR/.env"; else echo "$1=$2" >> "$DIR/.env"; fi; }
getenv() { grep "^$1=" "$DIR/.env" 2>/dev/null | head -1 | cut -d= -f2- || true; }
[ -n "$(getenv PG_PASSWORD)" ]  || setenv PG_PASSWORD "$(rand 40)"
[ -n "$(getenv TOKEN_SECRET)" ] || setenv TOKEN_SECRET "$(rand 64)"
setenv ALLOWED_ORIGINS "$ORIGINS"

pick_image() {  # 1) ảnh đã có sẵn trên máy  2) tải về (tối đa 3 phút mỗi nguồn, có hiện tiến độ)
  local img
  for img in "$@"; do docker image inspect "$img" >/dev/null 2>&1 && { echo "$img"; return; }; done
  for img in "$@"; do
    echo "  … đang tải $img (tối đa 3 phút)" >&2
    timeout 180 docker pull "$img" >&2 && { echo "$img"; return; }
    echo "  … không tải được $img, thử nguồn khác" >&2
  done
  return 1
}
echo "  Chọn ảnh PostgreSQL…"
PG_IMAGE=$(getenv PG_IMAGE); [ -n "$PG_IMAGE" ] || PG_IMAGE=$(pick_image dockerhub.tino.org/library/postgres:16 postgres:16) || die "Không tải được ảnh PostgreSQL 16"
echo "  Chọn ảnh Node.js…"
# Ảnh n8n trên máy đã có sẵn Node.js → dùng luôn, không phải tải gì thêm.
N8N_IMAGE=$(docker inspect -f '{{.Config.Image}}' n8n-n8n-1 2>/dev/null || true)
NODE_IMAGE=$(getenv NODE_IMAGE)
if [ -z "$NODE_IMAGE" ]; then
  for img in node:22-alpine dockerhub.tino.org/library/node:22-alpine "$N8N_IMAGE"; do
    [ -n "$img" ] && docker image inspect "$img" >/dev/null 2>&1 && docker run --rm --entrypoint node "$img" -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)" >/dev/null 2>&1 && { NODE_IMAGE=$img; break; }
  done
  [ -n "$NODE_IMAGE" ] || NODE_IMAGE=$(pick_image dockerhub.tino.org/library/node:22-alpine node:22-alpine) || die "Không có ảnh Node.js phù hợp"
fi
setenv PG_IMAGE "$PG_IMAGE"; setenv NODE_IMAGE "$NODE_IMAGE"

API_PORT=$(getenv API_PORT)
if [ -z "$API_PORT" ]; then
  for p in 3100 3101 3102 3103 3110 3120; do ss -tln | grep -q ":$p " || { API_PORT=$p; break; }; done
  [ -n "$API_PORT" ] || die "Không tìm được cổng trống cho API"
  setenv API_PORT "$API_PORT"
fi
ok "PostgreSQL: $PG_IMAGE · Node: $NODE_IMAGE · API ở 127.0.0.1:$API_PORT"

# ---------------------------------------------------------------- 3. Chạy cụm Docker
say "3/6 Khởi động cụm Docker 'okr'"
dc up -d --remove-orphans < /dev/null
dc restart api < /dev/null >/dev/null
for i in $(seq 1 60); do curl -fsS "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1 && break; sleep 2; done
curl -fsS "http://127.0.0.1:$API_PORT/health" >/dev/null 2>&1 || { dc logs --tail 40 api; die "API chưa chạy được (xem log ở trên)."; }
ok "API đang chạy: $(curl -fsS "http://127.0.0.1:$API_PORT/health")"

# ---------------------------------------------------------------- 4. Nginx /okr-api/
say "4/6 Cấu hình Nginx: https://$DOMAIN/okr-api/"
mkdir -p /etc/nginx/snippets
cat > "$SNIPPET.new" <<EOF
# OKR Weekly API — do /opt/okr/install.sh tạo
location /okr-api/ {
    proxy_pass http://127.0.0.1:$API_PORT/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 120s;
    client_max_body_size 22m;            # tệp đính kèm tối đa 20MB (giới hạn thật nằm trong API)
}
EOF
NGBK="$DIR/backups/nginx-$TS"; mkdir -p "$NGBK"
[ -f "$SNIPPET" ] && cp -a "$SNIPPET" "$NGBK/"
mv "$SNIPPET.new" "$SNIPPET"
DOM_RE=$(printf '%s' "$DOMAIN" | sed 's/[.]/\\./g')
# -R: đi theo lối tắt (sites-enabled/* thường là symlink tới sites-available/*)
FILES=$(grep -RlE "server_name[^;]*[[:space:]]$DOM_RE([[:space:];]|$)" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | xargs -r -n1 readlink -f | sort -u || true)
CHANGED=""
if [ -z "$FILES" ]; then
  warn "Không tìm thấy khối server_name $DOMAIN trong Nginx — bỏ qua bước này."
else
  for f in $FILES; do
    if grep -q "snippets/okr-api.conf" "$f"; then ok "Đã có sẵn trong $f"; continue; fi
    cp -a "$f" "$NGBK/$(basename "$f")"
    sed -i -E "/server_name[^;]*[[:space:]]$DOM_RE([[:space:];]|$)/a\\    include $SNIPPET;" "$f"
    CHANGED="$CHANGED $f"
  done
fi
if nginx -t >/dev/null 2>&1; then
  systemctl reload nginx 2>/dev/null || nginx -s reload
  ok "Nginx đã nạp cấu hình mới${CHANGED:+ (sửa:$CHANGED; bản cũ ở $NGBK)}"
else
  warn "Cấu hình Nginx lỗi — đang hoàn tác:"; nginx -t || true
  for f in $CHANGED; do cp -a "$NGBK/$(basename "$f")" "$f"; done
  if [ -f "$NGBK/okr-api.conf" ]; then cp -a "$NGBK/okr-api.conf" "$SNIPPET"; else rm -f "$SNIPPET"; fi
  nginx -t >/dev/null 2>&1 && (systemctl reload nginx 2>/dev/null || nginx -s reload)
  die "Đã hoàn tác Nginx về như cũ. Gửi phần lỗi ở trên cho người hỗ trợ."
fi
sleep 1
if curl -fsS "https://$DOMAIN/okr-api/health" 2>/dev/null | grep -q '"ok":true'; then ok "Truy cập được https://$DOMAIN/okr-api/health"
else warn "Chưa gọi được https://$DOMAIN/okr-api/health từ chính máy chủ (có thể do DNS nội bộ) — hãy mở thử trên trình duyệt."; fi
curl -fsS -o /dev/null "https://$DOMAIN/" 2>/dev/null && ok "n8n vẫn hoạt động bình thường" || warn "Hãy mở thử n8n trên trình duyệt để chắc chắn."

# ---------------------------------------------------------------- 5. Dữ liệu
say "5/6 Dữ liệu"
NUSERS=$(dc exec -T api node /app/server.js count-users < /dev/null 2>/dev/null | tail -1 || true); NUSERS=${NUSERS:-0}
if [ "${NUSERS:-0}" != "0" ]; then
  ok "CSDL đã có $NUSERS người dùng — giữ nguyên dữ liệu."
else
  CH=$(ask "  Chuyển dữ liệu từ Google Sheet hiện tại sang? [Y/n] " "y")
  if [[ "$CH" =~ ^[Yy] ]]; then
    echo "  Đăng nhập bằng tài khoản GIÁM ĐỐC của app cũ (để lấy toàn bộ dữ liệu):"
    if [ -n "${OKR_ADMIN_PASS:-}" ]; then GU="${OKR_ADMIN_USER:-admin}"; GP="$OKR_ADMIN_PASS"
    else GU=$(ask "  Tên đăng nhập [admin]: " "admin"); GP=$(asks "  Mật khẩu: "); fi
    [ -n "$GP" ] || die "Chưa nhập mật khẩu. Chạy lại lệnh cài để thử lại (an toàn, không mất gì)."
    dc exec -T -e GAS_URL="$GAS_URL" -e GAS_USER="$GU" -e GAS_PASS="$GP" api node /app/server.js import-gas < /dev/null \
      || die "Chuyển dữ liệu thất bại. Chạy lại lệnh cài để thử lại."
    ok "Đã chuyển dữ liệu. Tài khoản $GU giữ nguyên mật khẩu vừa nhập."
  else
    echo "  Tạo tài khoản Giám đốc đầu tiên:"
    GU=$(ask "  Tên đăng nhập [admin]: " "admin"); GP=$(asks "  Mật khẩu (>= 6 ký tự): ")
    [ ${#GP} -ge 6 ] || die "Mật khẩu quá ngắn. Chạy lại lệnh cài để thử lại."
    dc exec -T api node /app/server.js create-director "$GU" "$GP" "Giám đốc" < /dev/null
  fi
fi

# ---------------------------------------------------------------- 6. Sao lưu hằng ngày
say "6/6 Sao lưu tự động"
echo "30 2 * * * root $DIR/backup.sh >> $DIR/backups/backup.log 2>&1" > /etc/cron.d/okr-backup
chmod 644 /etc/cron.d/okr-backup
"$DIR/backup.sh" < /dev/null | sed 's/^/  /'
ok "Sao lưu mỗi ngày lúc 02:30, giữ 14 bản trong $DIR/backups"

printf '\n\033[1;32m==================== CÀI ĐẶT XONG ====================\033[0m\n'
echo "  API:        https://$DOMAIN/okr-api/"
echo "  Kiểm tra:   https://$DOMAIN/okr-api/health"
echo "  Thư mục:    $DIR   (dữ liệu: $DIR/pgdata, sao lưu: $DIR/backups)"
echo "  Xem log:    docker compose -f $DIR/docker-compose.yml logs -f api"
echo "  Cập nhật:   chạy lại đúng lệnh cài này (dữ liệu giữ nguyên)"
echo "  Đổi mật khẩu khẩn cấp: docker compose -f $DIR/docker-compose.yml exec api node /app/server.js set-password <tên> <mật khẩu mới>"
}

main "$@"

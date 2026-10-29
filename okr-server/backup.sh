#!/usr/bin/env bash
# Sao lưu CSDL OKR Weekly hằng ngày (cron 02:30). Giữ 14 bản gần nhất trong /opt/okr/backups.
# Khôi phục:  gunzip -c /opt/okr/backups/okr-YYYY-MM-DD.sql.gz | docker compose -f /opt/okr/docker-compose.yml exec -T db psql -U okr -d okr
# Khôi phục tệp đính kèm:  tar -xzf /opt/okr/backups/uploads-YYYY-MM-DD.tar.gz -C /opt/okr && chown -R 1000:1000 /opt/okr/uploads
set -euo pipefail
DIR=/opt/okr
mkdir -p "$DIR/backups"
OUT="$DIR/backups/okr-$(date +%F).sql.gz"
docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" exec -T db pg_dump -U okr --clean --if-exists okr | gzip > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
find "$DIR/backups" -name 'okr-*.sql.gz' -mtime +14 -delete
# Tệp đính kèm công việc: nén cả thư mục uploads (nếu có), giữ 7 bản gần nhất để không đầy ổ đĩa
if [ -d "$DIR/uploads" ] && [ -n "$(ls -A "$DIR/uploads" 2>/dev/null)" ]; then
  UOUT="$DIR/backups/uploads-$(date +%F).tar.gz"
  tar -czf "$UOUT.tmp" -C "$DIR" uploads && mv "$UOUT.tmp" "$UOUT"
  ls -1t "$DIR"/backups/uploads-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
  echo "Đã sao lưu tệp đính kèm: $UOUT ($(du -h "$UOUT" | cut -f1))"
fi
echo "Đã sao lưu: $OUT ($(du -h "$OUT" | cut -f1))"

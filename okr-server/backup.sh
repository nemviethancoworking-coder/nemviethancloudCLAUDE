#!/usr/bin/env bash
# Sao lưu CSDL OKR Weekly hằng ngày (cron 02:30). Giữ 14 bản gần nhất trong /opt/okr/backups.
# Khôi phục:  gunzip -c /opt/okr/backups/okr-YYYY-MM-DD.sql.gz | docker compose -f /opt/okr/docker-compose.yml exec -T db psql -U okr -d okr
set -euo pipefail
DIR=/opt/okr
mkdir -p "$DIR/backups"
OUT="$DIR/backups/okr-$(date +%F).sql.gz"
docker compose -f "$DIR/docker-compose.yml" --env-file "$DIR/.env" exec -T db pg_dump -U okr --clean --if-exists okr | gzip > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
find "$DIR/backups" -name 'okr-*.sql.gz' -mtime +14 -delete
echo "Đã sao lưu: $OUT ($(du -h "$OUT" | cut -f1))"

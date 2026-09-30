#!/usr/bin/env bash
# Tạo (hoặc cập nhật) workflow trên n8n qua Public API.
#   N8N_URL=https://ttpemqkjp.tino.page N8N_API_KEY=... ./deploy.sh
# Lần đầu sẽ tạo mới và lưu id vào .workflow-id; các lần sau cập nhật đúng workflow đó.
set -euo pipefail
cd "$(dirname "$0")"

: "${N8N_URL:=https://ttpemqkjp.tino.page}"
: "${N8N_API_KEY:?Cần biến môi trường N8N_API_KEY (n8n > Settings > n8n API)}"

node build.mjs >/dev/null
api() { curl -sS --fail-with-body -H "X-N8N-API-KEY: $N8N_API_KEY" -H 'Content-Type: application/json' "$@"; }

if [[ -s .workflow-id ]]; then
  id=$(cat .workflow-id)
  api -X PUT "$N8N_URL/api/v1/workflows/$id" --data @workflow.json >/dev/null
  echo "Đã cập nhật workflow $id"
else
  id=$(api -X POST "$N8N_URL/api/v1/workflows" --data @workflow.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')
  echo "$id" > .workflow-id
  echo "Đã tạo workflow $id"
fi
echo "$N8N_URL/workflow/$id"

#!/bin/bash

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-jxdihzqoaxtydolmltdr}"
POOLER_HOST="${SUPABASE_POOLER_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
ML_SERVICE_TOKEN_VALUE="${ML_SERVICE_TOKEN:-${MODAL_WORKER_TOKEN:-}}"

if [ -z "${ML_SERVICE_TOKEN_VALUE}" ]; then
  echo "❌ ML_SERVICE_TOKEN or MODAL_WORKER_TOKEN must be set."
  exit 1
fi

ML_RUNTIME_DSN="$(
python3 - <<'PY'
import os
from urllib.parse import urlparse, quote

runtime = os.environ.get("ML_SUPABASE_DB_URL", "").strip()
if runtime:
    print(runtime)
    raise SystemExit

direct = os.environ.get("SUPABASE_DB_URL", "").strip()
project_ref = os.environ.get("SUPABASE_PROJECT_REF", "").strip()
pooler_host = os.environ.get("SUPABASE_POOLER_HOST", "aws-1-ap-southeast-1.pooler.supabase.com").strip()

if not direct:
    raise SystemExit("Missing ML_SUPABASE_DB_URL and SUPABASE_DB_URL")
if not project_ref:
    raise SystemExit("Missing SUPABASE_PROJECT_REF")

parsed = urlparse(direct)
password = parsed.password or ""
if not password:
    raise SystemExit("SUPABASE_DB_URL is missing a password")

user = f"postgres.{project_ref}"
encoded_password = quote(password, safe="")
print(f"postgresql://{user}:{encoded_password}@{pooler_host}:5432/postgres?sslmode=require")
PY
)"

if [ -x ".venv/bin/python" ]; then
  MODAL_PYTHON=".venv/bin/python"
else
  MODAL_PYTHON="python3"
fi

echo "🔐 Syncing Modal secrets for web-only ML deployment..."
"$MODAL_PYTHON" -m modal secret create ml-service-db \
  "ML_SUPABASE_DB_URL=$ML_RUNTIME_DSN" \
  "SUPABASE_DB_URL=$ML_RUNTIME_DSN" \
  --force
"$MODAL_PYTHON" -m modal secret create ml-service-web-auth \
  "ML_SERVICE_TOKEN=$ML_SERVICE_TOKEN_VALUE" \
  --force

echo "🚀 Deploying Modal web app (no schedules)..."
"$MODAL_PYTHON" -m modal deploy ml-service/modal_worker.py --stream-logs

#!/bin/bash

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
  echo "❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env"
  exit 1
fi

ANALYSIS_RUN_ID="${1:-}"

if [ -z "$ANALYSIS_RUN_ID" ]; then
  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo "❌ analysis_run_id not provided and SUPABASE_DB_URL is not set."
    echo "Usage: bash scripts/smoke-analysis-hydrator.sh <analysis_run_id>"
    exit 1
  fi

  ANALYSIS_RUN_ID="$(psql "$SUPABASE_DB_URL" -t -A -c "select id from public.analysis_runs order by created_at desc limit 1;")"
fi

if [ -z "$ANALYSIS_RUN_ID" ]; then
  echo "❌ No analysis_run_id found."
  exit 1
fi

echo "🧪 Hydrating analysis run: $ANALYSIS_RUN_ID"
curl -sS "${VITE_SUPABASE_URL}/functions/v1/analysis-hydrator?analysis_run_id=${ANALYSIS_RUN_ID}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}"
echo

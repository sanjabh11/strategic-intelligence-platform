#!/bin/bash

set -euo pipefail

DEFAULT_PROJECT_REF="jxdihzqoaxtydolmltdr"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_PROJECT_REF}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-k6Lu8t5SNdIUEzXE}"
DB_HOST="${SUPABASE_DB_HOST:-aws-1-ap-southeast-1.pooler.supabase.com}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres.${PROJECT_REF}}"
SUPABASE_DB_URL="${SUPABASE_DB_URL:-postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require}"

echo "⏸️  Pausing ML background jobs for project $PROJECT_REF..."

psql "$SUPABASE_DB_URL" <<'SQL'
select cron.unschedule('ml-calibration-refresh');
select cron.unschedule('ml-drift-evaluate');
select jobid, jobname, schedule, active
from cron.job
order by jobname;
SQL

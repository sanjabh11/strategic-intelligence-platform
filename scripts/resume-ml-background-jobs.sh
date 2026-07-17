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

echo "▶️  Re-enabling ML background jobs for project $PROJECT_REF..."

psql "$SUPABASE_DB_URL" <<'SQL'
select cron.schedule(
  'ml-calibration-refresh',
  '0 */6 * * *',
  $$select public.enqueue_ml_job('calibration_refresh', '{"minimumSampleSize":25}'::jsonb, 'scheduled:calibration_refresh', now(), 120, 5);$$
)
where not exists (select 1 from cron.job where jobname = 'ml-calibration-refresh');

select cron.schedule(
  'ml-drift-evaluate',
  '*/15 * * * *',
  $$select public.enqueue_ml_job('drift_evaluate', '{"threshold":0.12}'::jsonb, 'scheduled:drift_evaluate', now(), 140, 5);$$
)
where not exists (select 1 from cron.job where jobname = 'ml-drift-evaluate');

select jobid, jobname, schedule, active
from cron.job
order by jobname;
SQL

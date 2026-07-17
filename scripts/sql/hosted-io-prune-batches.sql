-- Hosted IO prune batches
-- Purpose:
--   Reduce Disk IO pressure from pg_cron / pg_net history without touching
--   product tables. Run this in Supabase SQL Editor or through `supabase db query`.
--
-- Usage:
--   1. Run the preview queries.
--   2. Run the batch deletes repeatedly until `rows_to_delete` reaches 0.
--   3. Run the ANALYZE statements.
--
-- Notes:
--   - This script intentionally avoids one giant DELETE.
--   - It only targets historical operational tables:
--       cron.job_run_details
--       net._http_response

select
  'cron.job_run_details' as table_name,
  count(*) as rows_to_delete
from cron.job_run_details
where end_time < now() - interval '14 days'

union all

select
  'net._http_response' as table_name,
  count(*) as rows_to_delete
from net._http_response
where created < now() - interval '7 days';

with doomed as (
  select ctid
  from cron.job_run_details
  where end_time < now() - interval '14 days'
  order by end_time asc
  limit 10000
)
delete from cron.job_run_details
where ctid in (select ctid from doomed);

with doomed as (
  select ctid
  from net._http_response
  where created < now() - interval '7 days'
  order by created asc
  limit 500
)
delete from net._http_response
where ctid in (select ctid from doomed);

analyze cron.job_run_details;
analyze net._http_response;

select
  pg_size_pretty(pg_total_relation_size('cron.job_run_details')) as cron_job_run_details_size,
  pg_size_pretty(pg_total_relation_size('net._http_response')) as net_http_response_size,
  round(
    100.0 * (
      pg_total_relation_size('cron.job_run_details') +
      pg_total_relation_size('net._http_response')
    ) / pg_database_size(current_database()),
    1
  ) as pct_of_database_after_batch;

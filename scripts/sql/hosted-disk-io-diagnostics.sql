-- Hosted Disk IO diagnostics
-- Run in Supabase SQL Editor after schema parity to identify write-heavy and bloated tables.

select
  schemaname,
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size,
  n_live_tup,
  n_dead_tup,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  last_vacuum,
  last_autovacuum,
  vacuum_count,
  autovacuum_count
from pg_stat_user_tables
order by pg_total_relation_size(relid) desc
limit 25;

select
  table_name,
  day_bucket,
  rows_written
from (
  select
    'real_time_events' as table_name,
    date_trunc('day', timestamp) as day_bucket,
    count(*) as rows_written
  from public.real_time_events
  group by 1, 2

  union all

  select
    'analysis_runs' as table_name,
    date_trunc('day', created_at) as day_bucket,
    count(*) as rows_written
  from public.analysis_runs
  group by 1, 2
) daily_counts
order by day_bucket desc, rows_written desc;

select
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
from pg_stat_statements
order by total_exec_time desc
limit 20;

select
  relname as table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
from pg_stat_user_tables
order by seq_tup_read desc
limit 20;

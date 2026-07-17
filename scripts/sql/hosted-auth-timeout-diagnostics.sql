-- Hosted auth timeout diagnostics for Supabase SQL Editor.
-- Run these only against the hosted project after deployment/secrets are in place.

-- 0. Confirm the required entitlement tables exist in public schema.
select
  to_regclass('public.user_subscriptions') as user_subscriptions,
  to_regclass('public.whop_users') as whop_users;

-- 1. Detect repo-untracked triggers on auth.users.
select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and n.nspname = 'auth'
  and c.relname = 'users';

-- 2. Inspect active waits and connection pressure during a retry window.
select
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  query_start,
  left(query, 200) as query
from pg_stat_activity
where datname = current_database()
order by query_start asc;

-- 3. If tables exist but REST still says they are missing from schema cache,
-- refresh PostgREST metadata and then verify queue health.
notify pgrst, 'reload schema';
select pg_notification_queue_usage();

-- 4. If you identify a blocking trigger, disable it temporarily and retry auth.
-- Replace <trigger_name> with the real trigger from query #1.
-- alter table auth.users disable trigger <trigger_name>;

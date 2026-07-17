-- ML orchestration remediation
-- Replaces pg_net HTTP scheduling with enqueue-only pg_cron jobs, adds
-- internal ML queueing, upgrades calibration method constraints, and adds
-- drift refresh circuit breakers.

do $$
declare
  existing_job_id bigint;
  job_name text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    foreach job_name in array array[
      'ml-calibration-refresh',
      'ml-ontology-sync',
      'ml-drift-evaluate',
      'ml-shadow-model-refresh'
    ]
    loop
      select jobid into existing_job_id
      from cron.job
      where jobname = job_name;

      if existing_job_id is not null then
        perform cron.unschedule(existing_job_id);
      end if;
    end loop;
  end if;
end $$;

drop function if exists public.invoke_internal_ml_job(text, jsonb);
drop trigger if exists trg_internal_runtime_config_set_updated_at on public.internal_runtime_config;
drop function if exists public.internal_runtime_config_set_updated_at();
drop table if exists public.internal_runtime_config;

alter table public.calibration_models
  drop constraint if exists calibration_models_method_check;

alter table public.calibration_models
  add constraint calibration_models_method_check
  check (method in ('isotonic_regression', 'bayesian_smoothed_isotonic', 'identity'));

create table if not exists public.ml_job_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  priority integer not null default 100,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_at timestamptz not null default now(),
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  last_error text,
  worker_id text,
  result_json jsonb not null default '{}'::jsonb,
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ml_job_queue_status_schedule
  on public.ml_job_queue (status, scheduled_at asc, priority desc, created_at asc);

create index if not exists idx_ml_job_queue_lease_expiry
  on public.ml_job_queue (lease_expires_at asc)
  where status = 'processing';

create unique index if not exists idx_ml_job_queue_active_dedupe
  on public.ml_job_queue (dedupe_key)
  where dedupe_key is not null and status in ('queued', 'processing');

alter table public.ml_job_queue enable row level security;

create or replace function public.ml_job_queue_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ml_job_queue_set_updated_at on public.ml_job_queue;
create trigger trg_ml_job_queue_set_updated_at
before update on public.ml_job_queue
for each row
execute function public.ml_job_queue_set_updated_at();

create or replace function public.enqueue_ml_job(
  p_job_type text,
  p_payload jsonb default '{}'::jsonb,
  p_dedupe_key text default null,
  p_run_at timestamptz default now(),
  p_priority integer default 100,
  p_max_attempts integer default 5
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  queued_id uuid;
begin
  if p_dedupe_key is not null then
    select id
      into queued_id
    from public.ml_job_queue
    where dedupe_key = p_dedupe_key
      and status in ('queued', 'processing')
    order by created_at desc
    limit 1;

    if queued_id is not null then
      return queued_id;
    end if;
  end if;

  insert into public.ml_job_queue (
    job_type,
    payload_json,
    status,
    priority,
    attempt_count,
    max_attempts,
    scheduled_at,
    dedupe_key
  )
  values (
    p_job_type,
    coalesce(p_payload, '{}'::jsonb),
    'queued',
    greatest(coalesce(p_priority, 100), 0),
    0,
    greatest(coalesce(p_max_attempts, 5), 1),
    coalesce(p_run_at, now()),
    p_dedupe_key
  )
  returning id into queued_id;

  return queued_id;
exception
  when unique_violation then
    select id
      into queued_id
    from public.ml_job_queue
    where dedupe_key = p_dedupe_key
      and status in ('queued', 'processing')
    order by created_at desc
    limit 1;
    return queued_id;
end;
$$;

revoke all on function public.enqueue_ml_job(text, jsonb, text, timestamptz, integer, integer) from public;
grant execute on function public.enqueue_ml_job(text, jsonb, text, timestamptz, integer, integer) to service_role;

create table if not exists public.drift_refresh_cooldowns (
  id uuid primary key default gen_random_uuid(),
  user_key text not null,
  surface text not null,
  scope_key text not null,
  last_triggered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_key, surface, scope_key)
);

create index if not exists idx_drift_refresh_cooldowns_lookup
  on public.drift_refresh_cooldowns (user_key, surface, scope_key, last_triggered_at desc);

alter table public.drift_refresh_cooldowns enable row level security;

create or replace function public.drift_refresh_cooldowns_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_drift_refresh_cooldowns_set_updated_at on public.drift_refresh_cooldowns;
create trigger trg_drift_refresh_cooldowns_set_updated_at
before update on public.drift_refresh_cooldowns
for each row
execute function public.drift_refresh_cooldowns_set_updated_at();

create or replace function public.consume_rate_limit_capacity(
  service_name_param text,
  user_id_param text default null,
  max_requests integer default 100,
  window_minutes integer default 60,
  increment_by integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_record public.rate_limit_tracking%rowtype;
  bounded_increment integer := greatest(coalesce(increment_by, 0), 0);
  bounded_max integer := greatest(coalesce(max_requests, 0), 0);
  bounded_window integer := greatest(coalesce(window_minutes, 1), 1);
  granted integer := 0;
  next_count integer := 0;
  active_window_start timestamptz;
  active_window_end timestamptz;
begin
  active_window_start := date_trunc('minute', now()) - ((extract(minute from now())::integer % bounded_window) * interval '1 minute');
  active_window_end := active_window_start + make_interval(mins => bounded_window);

  select *
    into current_record
  from public.rate_limit_tracking
  where service_name = service_name_param
    and (
      (user_id_param is null and user_id is null)
      or user_id = user_id_param
    )
    and window_start <= now()
    and window_end > now()
  order by id desc
  limit 1
  for update;

  if current_record.id is null then
    granted := least(bounded_max, bounded_increment);

    insert into public.rate_limit_tracking (
      service_name,
      user_id,
      request_count,
      window_start,
      window_end
    )
    values (
      service_name_param,
      user_id_param,
      granted,
      active_window_start,
      active_window_end
    );

    return jsonb_build_object(
      'granted', granted,
      'remaining', greatest(bounded_max - granted, 0),
      'allowed', granted > 0,
      'window_end', active_window_end
    );
  end if;

  granted := least(greatest(bounded_max - current_record.request_count, 0), bounded_increment);
  next_count := current_record.request_count + granted;

  update public.rate_limit_tracking
  set request_count = next_count,
      updated_at = now()
  where id = current_record.id;

  return jsonb_build_object(
    'granted', granted,
    'remaining', greatest(bounded_max - next_count, 0),
    'allowed', granted > 0,
    'window_end', current_record.window_end
  );
end;
$$;

revoke all on function public.consume_rate_limit_capacity(text, text, integer, integer, integer) from public;
grant execute on function public.consume_rate_limit_capacity(text, text, integer, integer, integer) to service_role;

create or replace function public.claim_drift_refresh_cooldown(
  p_user_key text,
  p_surface text,
  p_scope_key text,
  p_cooldown_minutes integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_record public.drift_refresh_cooldowns%rowtype;
  cutoff_at timestamptz := now() - make_interval(mins => greatest(coalesce(p_cooldown_minutes, 1), 1));
begin
  select *
    into existing_record
  from public.drift_refresh_cooldowns
  where user_key = p_user_key
    and surface = p_surface
    and scope_key = p_scope_key
  limit 1
  for update;

  if existing_record.id is null then
    insert into public.drift_refresh_cooldowns (user_key, surface, scope_key, last_triggered_at)
    values (p_user_key, p_surface, p_scope_key, now());
    return true;
  end if;

  if existing_record.last_triggered_at > cutoff_at then
    return false;
  end if;

  update public.drift_refresh_cooldowns
  set last_triggered_at = now(),
      updated_at = now()
  where id = existing_record.id;

  return true;
end;
$$;

revoke all on function public.claim_drift_refresh_cooldown(text, text, text, integer) from public;
grant execute on function public.claim_drift_refresh_cooldown(text, text, text, integer) to service_role;

do $$
declare
  existing_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into existing_job_id from cron.job where jobname = 'ml-calibration-refresh';
    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'ml-calibration-refresh',
      '0 */6 * * *',
      $job$select public.enqueue_ml_job('calibration_refresh', '{"minimumSampleSize":25}'::jsonb, 'scheduled:calibration_refresh', now(), 120, 5);$job$
    );
  end if;
end $$;

do $$
declare
  existing_job_id bigint;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    select jobid into existing_job_id from cron.job where jobname = 'ml-drift-evaluate';
    if existing_job_id is not null then
      perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
      'ml-drift-evaluate',
      '*/15 * * * *',
      $job$select public.enqueue_ml_job('drift_evaluate', '{"threshold":0.12}'::jsonb, 'scheduled:drift_evaluate', now(), 140, 5);$job$
    );
  end if;
end $$;

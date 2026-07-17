-- Secure scheduling for ML internal jobs via pg_cron + pg_net.
-- Secrets are injected after migration through service-role writes to
-- public.internal_runtime_config, so no runtime credentials live in git.
-- Hosted project prerequisite: pg_cron and pg_net are already enabled.

create table if not exists public.internal_runtime_config (
  config_key text primary key,
  config_value text not null,
  updated_at timestamptz not null default now()
);

alter table public.internal_runtime_config enable row level security;
grant select, insert, update on public.internal_runtime_config to service_role;

create or replace function public.internal_runtime_config_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_internal_runtime_config_set_updated_at on public.internal_runtime_config;
create trigger trg_internal_runtime_config_set_updated_at
before update on public.internal_runtime_config
for each row
execute function public.internal_runtime_config_set_updated_at();

insert into public.internal_runtime_config (config_key, config_value)
values
  ('supabase_functions_base_url', ''),
  ('service_role_jwt', ''),
  ('publishable_key', '')
on conflict (config_key) do nothing;

create or replace function public.invoke_internal_ml_job(function_slug text, payload jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  base_url text;
  service_role_jwt text;
  publishable_key text;
  request_id bigint;
begin
  select config_value into base_url
  from public.internal_runtime_config
  where config_key = 'supabase_functions_base_url';

  select config_value into service_role_jwt
  from public.internal_runtime_config
  where config_key = 'service_role_jwt';

  select config_value into publishable_key
  from public.internal_runtime_config
  where config_key = 'publishable_key';

  if coalesce(base_url, '') = '' then
    raise exception 'Missing internal_runtime_config.supabase_functions_base_url';
  end if;

  if coalesce(service_role_jwt, '') = '' then
    raise exception 'Missing internal_runtime_config.service_role_jwt';
  end if;

  if coalesce(publishable_key, '') = '' then
    publishable_key := service_role_jwt;
  end if;

  select net.http_post(
    url := format('%s/%s', trim(trailing '/' from base_url), function_slug),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_jwt,
      'apikey', publishable_key
    ),
    body := coalesce(payload, '{}'::jsonb),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_internal_ml_job(text, jsonb) from public;
grant execute on function public.invoke_internal_ml_job(text, jsonb) to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'ml-calibration-refresh';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ml-calibration-refresh',
    '0 */6 * * *',
    $job$select public.invoke_internal_ml_job('calibration-refresh', '{"minimumSampleSize":25}'::jsonb);$job$
  );
end $$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'ml-ontology-sync';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ml-ontology-sync',
    '17 2 * * *',
    $job$select public.invoke_internal_ml_job('ontology-sync', '{}'::jsonb);$job$
  );
end $$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'ml-drift-evaluate';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ml-drift-evaluate',
    '*/15 * * * *',
    $job$select public.invoke_internal_ml_job('drift-evaluate', '{"threshold":0.12}'::jsonb);$job$
  );
end $$;

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id from cron.job where jobname = 'ml-shadow-model-refresh';
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'ml-shadow-model-refresh',
    '10 * * * *',
    $job$select public.invoke_internal_ml_job('shadow-model-refresh', '{}'::jsonb);$job$
  );
end $$;

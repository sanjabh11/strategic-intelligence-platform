-- Retrieval recovery: align retrieval_cache with the live hosted schema
-- and add provider-level diagnostics for retrieval observability.

create extension if not exists pgcrypto;

create table if not exists public.retrieval_provider_runs (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  query_hash text not null,
  provider text not null,
  status text not null check (status in ('success', 'empty', 'degraded', 'auth_error', 'rate_limited', 'config_error')),
  http_status integer,
  latency_ms integer,
  source_count integer not null default 0,
  query_variant text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_retrieval_provider_runs_query_hash
  on public.retrieval_provider_runs (query_hash, created_at desc);

create index if not exists idx_retrieval_provider_runs_request_id
  on public.retrieval_provider_runs (request_id, created_at desc);

alter table if exists public.retrieval_provider_runs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'retrieval_provider_runs'
      and policyname = 'read_retrieval_provider_runs'
  ) then
    create policy read_retrieval_provider_runs
      on public.retrieval_provider_runs
      for select
      using (true);
  end if;
end
$$;

alter table if exists public.retrieval_cache
  add column if not exists retrieval_id text,
  add column if not exists title text,
  add column if not exists provider text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists query_hash text;

do $$
declare
  has_id boolean;
  has_source boolean;
  has_retrieved_at boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'retrieval_cache'
      and column_name = 'id'
  ) into has_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'retrieval_cache'
      and column_name = 'source'
  ) into has_source;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'retrieval_cache'
      and column_name = 'retrieved_at'
  ) into has_retrieved_at;

  execute format(
    $sql$
      update public.retrieval_cache
      set
        retrieval_id = coalesce(retrieval_id, %s),
        title = coalesce(title, url, 'cached retrieval'),
        provider = coalesce(provider, %s, 'unknown'),
        created_at = coalesce(created_at, %s, now())
      where
        retrieval_id is null
        or title is null
        or provider is null
        or created_at is null
    $sql$,
    case when has_id then 'id::text' else 'gen_random_uuid()::text' end,
    case when has_source then 'source' else 'null' end,
    case when has_retrieved_at then 'retrieved_at' else 'null' end
  );
end
$$;

create index if not exists idx_retrieval_cache_query_hash_created_at
  on public.retrieval_cache (query_hash, created_at desc);

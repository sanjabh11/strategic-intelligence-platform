-- ML artifact storage cutover foundation
-- Adds storage-pointer metadata to analysis_runs so large reports can move
-- off inline JSONB payloads in a later implementation pass.

alter table public.analysis_runs
  add column if not exists payload_mode text not null default 'inline';

alter table public.analysis_runs
  drop constraint if exists analysis_runs_payload_mode_check;

alter table public.analysis_runs
  add constraint analysis_runs_payload_mode_check
  check (payload_mode in ('inline', 'storage_pointer'));

alter table public.analysis_runs
  add column if not exists artifact_bucket text;

alter table public.analysis_runs
  add column if not exists artifact_path text;

alter table public.analysis_runs
  add column if not exists artifact_sha256 text;

alter table public.analysis_runs
  add column if not exists artifact_bytes bigint;

create index if not exists idx_analysis_runs_payload_mode
  on public.analysis_runs (payload_mode);

create index if not exists idx_analysis_runs_artifact_path
  on public.analysis_runs (artifact_bucket, artifact_path)
  where artifact_path is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.schemata
    where schema_name = 'storage'
  ) then
    insert into storage.buckets (id, name, public)
    values ('analysis-artifacts', 'analysis-artifacts', false)
    on conflict (id) do nothing;
  end if;
end $$;

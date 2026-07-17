-- Hosted analysis-only recovery wave
-- Purpose: repair analysis_runs summary/provenance schema drift and keep
-- life_decisions aligned with the strategist surface, without mutating
-- subscription, tier, or entitlement objects.
--
-- Preconditions:
-- 1. A hosted backup/snapshot or logical dump exists.
-- 2. Hosted API/database health is stable enough for DDL.

alter table if exists public.analysis_runs
  add column if not exists audience text,
  add column if not exists retrieval_ids jsonb,
  add column if not exists evidence_backed boolean,
  add column if not exists review_reason text,
  add column if not exists external_sources_count integer,
  add column if not exists web_scraping_used boolean;

alter table if exists public.analysis_runs
  alter column evidence_backed set default false,
  alter column external_sources_count set default 0,
  alter column web_scraping_used set default false;

create or replace function public.sync_analysis_run_summary_columns()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_analysis jsonb := coalesce(new.analysis_json, '{}'::jsonb);
  v_provenance jsonb := coalesce(v_analysis->'provenance', '{}'::jsonb);
  v_retrieval_json jsonb := coalesce(v_provenance->'retrieval_ids', v_provenance->'used_retrieval_ids', '[]'::jsonb);
  v_review_reasons jsonb := coalesce(v_analysis->'review_reasons', v_analysis->'review_metadata'->'review_reasons', '[]'::jsonb);
  v_retrieval_count integer := 0;
  v_external_sources integer := 0;
begin
  if v_analysis <> '{}'::jsonb then
    new.audience := coalesce(new.audience, nullif(v_analysis->>'audience', ''));

    if new.status is null or btrim(new.status) = '' then
      new.status := coalesce(nullif(v_analysis->>'status', ''), 'completed');
    end if;

    if new.request_id is null or btrim(new.request_id) = '' then
      new.request_id := nullif(v_analysis->>'request_id', '');
    end if;

    if new.review_reason is null or btrim(new.review_reason) = '' then
      new.review_reason := nullif(
        coalesce(
          v_analysis->>'review_reason',
          v_analysis->'review_metadata'->>'review_reason',
          case
            when jsonb_typeof(v_review_reasons) = 'array'
            then array_to_string(array(select jsonb_array_elements_text(v_review_reasons)), '; ')
            else null
          end
        ),
        ''
      );
    end if;

    if jsonb_typeof(v_retrieval_json) = 'array' then
      v_retrieval_count := jsonb_array_length(v_retrieval_json);
      begin
        if new.retrieval_ids is null or new.retrieval_ids = '[]'::jsonb then
          new.retrieval_ids := v_retrieval_json;
        end if;
      exception
        when datatype_mismatch then
          if new.retrieval_ids is null then
            new.retrieval_ids := v_retrieval_json;
          end if;
      end;
    end if;

    if v_provenance ? 'retrieval_count' then
      v_retrieval_count := coalesce(nullif(v_provenance->>'retrieval_count', '')::integer, v_retrieval_count);
    end if;

    new.evidence_backed := coalesce(
      new.evidence_backed,
      case
        when v_provenance ? 'evidence_backed' then (v_provenance->>'evidence_backed')::boolean
        else null
      end,
      false
    );

    v_external_sources := coalesce(
      nullif(v_analysis->>'external_sources_count', '')::integer,
      v_retrieval_count,
      0
    );

    new.external_sources_count := coalesce(new.external_sources_count, v_external_sources, 0);
    new.web_scraping_used := coalesce(
      new.web_scraping_used,
      case
        when v_analysis ? 'web_scraping_used' then (v_analysis->>'web_scraping_used')::boolean
        else null
      end,
      false
    );
  end if;

  new.status := coalesce(nullif(new.status, ''), 'completed');
  new.retrieval_ids := coalesce(new.retrieval_ids, '[]'::jsonb);
  new.evidence_backed := coalesce(new.evidence_backed, false);
  new.external_sources_count := coalesce(new.external_sources_count, 0);
  new.web_scraping_used := coalesce(new.web_scraping_used, false);

  return new;
end;
$function$;

do $$
declare
  v_retrieval_ids_type text;
begin
  if to_regclass('public.analysis_runs') is not null then
    select udt_name
      into v_retrieval_ids_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analysis_runs'
      and column_name = 'retrieval_ids';

    if v_retrieval_ids_type = 'jsonb' then
      execute 'alter table public.analysis_runs alter column retrieval_ids set default ''[]''::jsonb';
    end if;

    execute 'drop trigger if exists trg_sync_analysis_run_summary_columns on public.analysis_runs';
    execute $sql$
      create trigger trg_sync_analysis_run_summary_columns
      before insert or update of analysis_json, audience, status, request_id, review_reason, retrieval_ids, evidence_backed, external_sources_count, web_scraping_used
      on public.analysis_runs
      for each row
      execute function public.sync_analysis_run_summary_columns()
    $sql$;

    execute 'update public.analysis_runs set analysis_json = analysis_json where analysis_json is not null';
    execute $sql$
      update public.analysis_runs
      set
        retrieval_ids = coalesce(retrieval_ids, '[]'::jsonb),
        evidence_backed = coalesce(evidence_backed, false),
        external_sources_count = coalesce(external_sources_count, 0),
        web_scraping_used = coalesce(web_scraping_used, false),
        status = coalesce(nullif(status, ''), 'completed')
    $sql$;

    execute 'create index if not exists idx_analysis_runs_evidence_backed on public.analysis_runs (evidence_backed)';
    execute 'create index if not exists idx_analysis_runs_review_reason on public.analysis_runs (review_reason) where review_reason is not null';
    execute 'create index if not exists idx_analysis_runs_retrieval_ids on public.analysis_runs using gin (retrieval_ids)';
  end if;
end
$$;

alter table if exists public.life_decisions
  drop constraint if exists life_decisions_category_check;

alter table if exists public.life_decisions
  add constraint life_decisions_category_check
  check (
    category in (
      'career',
      'financial',
      'relationship',
      'health',
      'purchase',
      'conflict',
      'business',
      'other'
    )
  );

notify pgrst, 'reload schema';

-- Monitoring metrics RPCs for Phase 2 - Phase 2 Mid-term Features
-- Created: 2025-09-05

-- Table to store metrics snapshots (if not exists)
create table if not exists public.monitoring_metrics (
    id uuid default gen_random_uuid() primary key,
    metric_type text not null, -- 'schema_failure_rate', 'evidence_backed_rate', 'avg_ev_missing_count', 'human_review_rate'
    value numeric not null,
    timestamp timestamptz default now(),
    period_start timestamptz,
    period_end timestamptz,
    created_at timestamptz default now()
);

-- Index for efficient queries
create index if not exists idx_monitoring_metrics_type_timestamp on public.monitoring_metrics(metric_type, timestamp desc);

-- RPC to record schema failures
create or replace function public.record_schema_failure()
returns void
language plpgsql
security definer
as $$
begin
    insert into public.monitoring_metrics (metric_type, value)
    values ('schema_failure_count', 1);
end;
$$;

-- RPC to calculate schema failure rate (last 24 hours)
create or replace function public.get_schema_failure_rate()
returns numeric
language plpgsql
security definer
as $$
declare
    total_analyses integer;
    schema_failures integer;
    failure_rate numeric;
begin
    -- Get total analyses in last 24 hours
    select count(*) into total_analyses
    from public.analysis_runs
    where created_at >= now() - interval '24 hours';

    -- Get schema failures in last 24 hours
    select count(*) into schema_failures
    from public.schema_failures
    where created_at >= now() - interval '24 hours';

    -- Calculate rate as percentage
    if total_analyses > 0 then
        failure_rate := (schema_failures::numeric / total_analyses::numeric) * 100;
    else
        failure_rate := 0;
    end if;

    return failure_rate;
end;
$$;

-- RPC to calculate evidence backed rate (last 24 hours)
create or replace function public.get_evidence_backed_rate()
returns numeric
language plpgsql
security definer
as $$
declare
    total_geopolitical integer;
    evidence_backed integer;
    backed_rate numeric;
begin
    -- Get total geopolitical analyses in last 24 hours
    select count(*) into total_geopolitical
    from public.analysis_runs ar
    where ar.created_at >= now() - interval '24 hours'
    and ar.scenario_description ilike '%geopolitical%';

    -- Get evidence backed geopolitical analyses
    select count(*) into evidence_backed
    from public.analysis_runs ar
    where ar.created_at >= now() - interval '24 hours'
    and ar.scenario_description ilike '%geopolitical%'
    and ar.evidence_backed = true;

    -- Calculate rate as percentage
    if total_geopolitical > 0 then
        backed_rate := (evidence_backed::numeric / total_geopolitical::numeric) * 100;
    else
        backed_rate := 100; -- No geopolitical analyses, consider as 100%
    end if;

    return backed_rate;
end;
$$;

-- RPC to calculate average EV missing count (last 24 hours)
create or replace function public.get_avg_ev_missing_count()
returns numeric
language plpgsql
security definer
as $$
declare
    total_analyses integer;
    total_missing_ev numeric;
    avg_missing numeric;
begin
    -- Get total analyses with EV data in last 24 hours
    select count(*) into total_analyses
    from public.analysis_runs ar
    where ar.created_at >= now() - interval '24 hours'
    and ar.analysis_json->>'expected_value_ranking' is not null;

    -- Sum of missing EV instances (placeholder - would need actual tracking)
    -- For now, use a simplified calculation based on analyses without EV
    select count(*)::numeric into total_missing_ev
    from public.analysis_runs ar
    where ar.created_at >= now() - interval '24 hours'
    and (ar.analysis_json->>'expected_value_ranking' is null
         or jsonb_array_length(ar.analysis_json->'expected_value_ranking') = 0);

    -- Calculate average
    if total_analyses > 0 then
        avg_missing := total_missing_ev / total_analyses::numeric;
    else
        avg_missing := 0;
    end if;

    return avg_missing;
end;
$$;

-- RPC to calculate human review rate (last 24 hours)
create or replace function public.get_human_review_rate()
returns numeric
language plpgsql
security definer
as $$
declare
    total_analyses integer;
    under_review integer;
    review_rate numeric;
begin
    -- Get total analyses in last 24 hours
    select count(*) into total_analyses
    from public.analysis_runs
    where created_at >= now() - interval '24 hours';

    -- Get analyses under human review
    select count(*) into under_review
    from public.analysis_runs
    where created_at >= now() - interval '24 hours'
    and status = 'under_review';

    -- Calculate rate as percentage
    if total_analyses > 0 then
        review_rate := (under_review::numeric / total_analyses::numeric) * 100;
    else
        review_rate := 0;
    end if;

    return review_rate;
end;
$$;

-- RPC to get all metrics at once
create or replace function public.get_monitoring_metrics()
returns json
language plpgsql
security definer
as $$
declare
    result json;
begin
    select json_build_object(
        'schema_failure_rate', public.get_schema_failure_rate(),
        'evidence_backed_rate', public.get_evidence_backed_rate(),
        'avg_ev_missing_count', public.get_avg_ev_missing_count(),
        'human_review_rate', public.get_human_review_rate(),
        'last_updated', now()
    ) into result;

    return result;
end;
$$;

-- Grant permissions
grant execute on function public.record_schema_failure() to authenticated, service_role;
grant execute on function public.get_schema_failure_rate() to authenticated, service_role;
grant execute on function public.get_evidence_backed_rate() to authenticated, service_role;
grant execute on function public.get_avg_ev_missing_count() to authenticated, service_role;
grant execute on function public.get_human_review_rate() to authenticated, service_role;
grant execute on function public.get_monitoring_metrics() to authenticated, service_role;

-- Grant table permissions if needed
grant select on public.monitoring_metrics to authenticated, service_role;
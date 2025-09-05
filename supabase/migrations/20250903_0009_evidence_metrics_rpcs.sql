-- RPCs for atomic metrics updates used by edge functions
-- Created: 2025-09-03

-- increment_external_sources(run_id uuid, delta int, web_scraping boolean)
create or replace function public.increment_external_sources(
  run_id uuid,
  delta integer,
  web_scraping boolean default true
) returns void
language plpgsql
security definer
as $$
begin
  update public.analysis_runs ar
  set
    external_sources_count = coalesce(ar.external_sources_count, 0) + coalesce(delta, 0),
    web_scraping_used = coalesce(web_scraping, ar.web_scraping_used)
  where ar.id = run_id;
end;
$$;

-- update_processing_metrics(run_id uuid, processing_ms int, stability_delta numeric)
create or replace function public.update_processing_metrics(
  run_id uuid,
  processing_ms integer,
  stability_delta numeric
) returns void
language plpgsql
security definer
as $$
begin
  update public.analysis_runs ar
  set
    processing_time_ms = coalesce(ar.processing_time_ms, 0) + coalesce(processing_ms, 0),
    stability_score = coalesce(ar.stability_score, 0)::numeric + coalesce(stability_delta, 0)::numeric
  where ar.id = run_id;
end;
$$;

-- Grant execute to anon and service roles if needed (adjust to your policy)
-- Note: In production, prefer restricting to service role and edge functions only.
grant execute on function public.increment_external_sources(uuid, integer, boolean) to authenticated, service_role; 
grant execute on function public.update_processing_metrics(uuid, integer, numeric) to authenticated, service_role; 

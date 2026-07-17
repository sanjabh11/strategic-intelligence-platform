-- Phase 1 + Phase 2 ML delivery foundation
-- Adds calibration, ontology, drift, challenger governance, shadow registry,
-- and normalized entity graph tables without altering legacy whitebox tables.

create extension if not exists vector with schema extensions;

create table if not exists public.calibration_models (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'probability_surface',
  segment_key text not null,
  method text not null check (method in ('isotonic_regression', 'identity')),
  params_json jsonb not null default '{}'::jsonb,
  metrics_json jsonb not null default '{}'::jsonb,
  minimum_sample_size integer not null default 25,
  active boolean not null default false,
  version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_key, version)
);

create index if not exists idx_calibration_models_segment_active
  on public.calibration_models (segment_key, active, created_at desc);

create table if not exists public.ontology_entities (
  id uuid primary key default gen_random_uuid(),
  entity_key text not null unique,
  entity_type text not null,
  domain text not null,
  label text not null,
  description text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ontology_entities_domain_type
  on public.ontology_entities (domain, entity_type);

create table if not exists public.ontology_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_key text not null references public.ontology_entities(entity_key) on delete cascade,
  alias text not null,
  alias_type text not null,
  weight real not null default 1,
  created_at timestamptz not null default now(),
  unique (entity_key, alias)
);

create index if not exists idx_ontology_aliases_alias_lower
  on public.ontology_aliases ((lower(alias)));

-- Remote migration history can be ahead of actual table materialization.
-- Recreate the legacy retrievals table if the hosted project drifted.
create table if not exists public.retrievals (
  id uuid primary key default gen_random_uuid(),
  query_hash text,
  retrieval_id integer,
  title text,
  url text,
  snippet text,
  score double precision,
  created_at timestamptz not null default now()
);

create index if not exists idx_retrievals_query_hash on public.retrievals (query_hash);
create index if not exists idx_retrievals_id on public.retrievals (id);

create table if not exists public.retrieval_entity_links (
  id uuid primary key default gen_random_uuid(),
  retrieval_id uuid not null references public.retrievals(id) on delete cascade,
  entity_key text not null references public.ontology_entities(entity_key) on delete cascade,
  confidence real not null,
  matched_text text not null,
  domain text not null,
  created_at timestamptz not null default now(),
  unique (retrieval_id, entity_key, matched_text)
);

create index if not exists idx_retrieval_entity_links_retrieval
  on public.retrieval_entity_links (retrieval_id, confidence desc);

create table if not exists public.drift_signals (
  id uuid primary key default gen_random_uuid(),
  surface text not null,
  scope_key text not null,
  detector text not null,
  score double precision not null,
  threshold double precision not null,
  state text not null check (state in ('stable', 'watch', 'triggered')),
  metadata jsonb not null default '{}'::jsonb,
  triggered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_drift_signals_surface_scope
  on public.drift_signals (surface, scope_key, triggered_at desc);

create table if not exists public.whitebox_experiment_state (
  id uuid primary key default gen_random_uuid(),
  track text not null unique,
  active_variant text not null,
  bootstrap_status text not null default 'pending' check (bootstrap_status in ('pending', 'running', 'completed')),
  minimum_sample_size integer not null default 12,
  promotion_margin numeric(8,4) not null default 0.015,
  metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.whitebox_experiment_evaluations (
  id uuid primary key default gen_random_uuid(),
  track text not null,
  variant_id text not null,
  forecast_id uuid references public.forecasts(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  probability double precision not null,
  outcome double precision not null,
  brier_score double precision not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (track, variant_id, forecast_id)
);

create index if not exists idx_whitebox_experiment_eval_track
  on public.whitebox_experiment_evaluations (track, created_at desc);

create table if not exists public.shadow_model_registry (
  id uuid primary key default gen_random_uuid(),
  model_type text not null,
  segment_key text not null,
  version text not null,
  status text not null check (status in ('shadow', 'active', 'retired', 'failed')),
  metrics_json jsonb not null default '{}'::jsonb,
  trained_at timestamptz not null default now(),
  unique (model_type, segment_key, version)
);

create table if not exists public.shadow_predictions (
  id uuid primary key default gen_random_uuid(),
  model_type text not null,
  subject_type text not null,
  subject_id text not null,
  version text not null,
  prediction_json jsonb not null,
  visible boolean not null default false,
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (model_type, subject_type, subject_id, version)
);

create index if not exists idx_shadow_predictions_subject
  on public.shadow_predictions (subject_type, subject_id, evaluated_at desc);

create table if not exists public.entity_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  node_key text not null unique,
  node_type text not null,
  domain text not null,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_entity_graph_nodes_domain
  on public.entity_graph_nodes (domain, node_type);

create table if not exists public.entity_graph_edges (
  id uuid primary key default gen_random_uuid(),
  edge_key text not null unique,
  from_node_key text not null references public.entity_graph_nodes(node_key) on delete cascade,
  to_node_key text not null references public.entity_graph_nodes(node_key) on delete cascade,
  relation_type text not null,
  weight real not null default 1,
  source_event_id uuid references public.real_time_events(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_entity_graph_edges_domain_time
  on public.entity_graph_edges (relation_type, observed_at desc);

alter table public.calibration_models enable row level security;
alter table public.ontology_entities enable row level security;
alter table public.ontology_aliases enable row level security;
alter table public.retrievals enable row level security;
alter table public.retrieval_entity_links enable row level security;
alter table public.drift_signals enable row level security;
alter table public.whitebox_experiment_state enable row level security;
alter table public.whitebox_experiment_evaluations enable row level security;
alter table public.shadow_model_registry enable row level security;
alter table public.shadow_predictions enable row level security;
alter table public.entity_graph_nodes enable row level security;
alter table public.entity_graph_edges enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'calibration_models' and policyname = 'read_calibration_models') then
    create policy read_calibration_models on public.calibration_models for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ontology_entities' and policyname = 'read_ontology_entities') then
    create policy read_ontology_entities on public.ontology_entities for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ontology_aliases' and policyname = 'read_ontology_aliases') then
    create policy read_ontology_aliases on public.ontology_aliases for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'retrievals' and policyname = 'read_retrievals') then
    create policy read_retrievals on public.retrievals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'retrieval_entity_links' and policyname = 'read_retrieval_entity_links') then
    create policy read_retrieval_entity_links on public.retrieval_entity_links for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'drift_signals' and policyname = 'read_drift_signals') then
    create policy read_drift_signals on public.drift_signals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'whitebox_experiment_state' and policyname = 'read_whitebox_experiment_state') then
    create policy read_whitebox_experiment_state on public.whitebox_experiment_state for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'whitebox_experiment_evaluations' and policyname = 'read_whitebox_experiment_evaluations') then
    create policy read_whitebox_experiment_evaluations on public.whitebox_experiment_evaluations for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shadow_model_registry' and policyname = 'read_shadow_model_registry') then
    create policy read_shadow_model_registry on public.shadow_model_registry for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shadow_predictions' and policyname = 'read_shadow_predictions') then
    create policy read_shadow_predictions on public.shadow_predictions for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entity_graph_nodes' and policyname = 'read_entity_graph_nodes') then
    create policy read_entity_graph_nodes on public.entity_graph_nodes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entity_graph_edges' and policyname = 'read_entity_graph_edges') then
    create policy read_entity_graph_edges on public.entity_graph_edges for select using (true);
  end if;
end $$;

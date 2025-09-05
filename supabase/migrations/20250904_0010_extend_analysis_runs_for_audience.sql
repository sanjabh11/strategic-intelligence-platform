-- Migration: Extend analysis_runs for audience-specific outputs
-- Adds fields for audience, status, and analysis_json as per User Story 1

ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS audience TEXT CHECK (audience IN ('student', 'learner', 'researcher', 'teacher'));
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'under_review', 'approved', 'rejected'));
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS analysis_json JSONB;

-- Update existing rows to have default status if null
UPDATE public.analysis_runs SET status = 'completed' WHERE status IS NULL;

-- Create schema_failures table for LLM validation errors
CREATE TABLE IF NOT EXISTS public.schema_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT,
  raw_response JSONB,
  validation_errors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add retrievals table for provenance linking
CREATE TABLE IF NOT EXISTS public.retrievals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash TEXT,
  retrieval_id INT,
  title TEXT,
  url TEXT,
  snippet TEXT,
  score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user_overrides for EV overrides
CREATE TABLE IF NOT EXISTS public.user_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES public.analysis_runs(id),
  overrides_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add simulation_runs for sensitivity analysis
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES public.analysis_runs(id),
  param_name TEXT,
  param_values JSONB,
  effects JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Additional tables for remaining user stories
-- For human review
CREATE TABLE IF NOT EXISTS public.human_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES public.analysis_runs(id),
  reviewer_id TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- For asset storage (handouts, slides)
CREATE TABLE IF NOT EXISTS public.asset_storage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES public.analysis_runs(id),
  asset_type TEXT,
  asset_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For game monitoring
CREATE TABLE IF NOT EXISTS public.game_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id UUID REFERENCES public.analysis_runs(id),
  game_type TEXT,
  canonical_games JSONB,
  runtime_metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for new tables
ALTER TABLE public.human_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS read_human_reviews ON public.human_reviews FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS read_asset_storage ON public.asset_storage FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS read_users ON public.users FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS read_game_definitions ON public.game_definitions FOR SELECT USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_human_reviews_analysis_id ON public.human_reviews (analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_asset_storage_analysis_id ON public.asset_storage (analysis_run_id);
CREATE INDEX IF NOT EXISTS idx_game_definitions_analysis_id ON public.game_definitions (analysis_run_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_runs_audience ON public.analysis_runs (audience);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status ON public.analysis_runs (status);
CREATE INDEX IF NOT EXISTS idx_retrievals_query_hash ON public.retrievals (query_hash);
CREATE INDEX IF NOT EXISTS idx_retrievals_id ON public.retrievals (id);

-- RLS policies
ALTER TABLE public.schema_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_schema_failures ON public.schema_failures FOR SELECT USING (true);

ALTER TABLE public.retrievals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_retrievals ON public.retrievals FOR SELECT USING (true);

ALTER TABLE public.user_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- Add needs_review status support
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'under_review', 'approved', 'rejected', 'needs_review'));

-- Create review queue view
CREATE VIEW IF NOT EXISTS review_queue AS
SELECT id, request_id, user_id, created_at, analysis_json->'provenance' as provenance, analysis_json->'summary'->'text' as summary_text
FROM analysis_runs
WHERE status = 'needs_review'
ORDER BY created_at DESC;
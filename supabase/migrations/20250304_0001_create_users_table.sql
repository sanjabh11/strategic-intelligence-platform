-- Backfill: create all tables required by early human review RLS policies
-- This predates 20250305_0001_human_review_rls.sql
-- Schema matches later migration 20250904_0010_extend_analysis_runs_for_audience.sql

-- Extensions (needed for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- Core analysis_runs table (needed by human_reviews FK)
CREATE TABLE IF NOT EXISTS public.analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_time_ms INTEGER,
  stability_score DOUBLE PRECISION,
  status TEXT DEFAULT 'completed',
  audience TEXT,
  analysis_json JSONB,
  user_id UUID,
  request_id TEXT
);

ALTER TABLE public.analysis_runs ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Human reviews table
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

ALTER TABLE public.human_reviews ENABLE ROW LEVEL SECURITY;

-- Basic read policies
DO $$
BEGIN
  -- analysis_runs policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='read_anon_runs') THEN
    CREATE POLICY read_anon_runs ON public.analysis_runs FOR SELECT USING (true);
  END IF;
  -- users policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='read_users_public') THEN
    CREATE POLICY read_users_public ON public.users FOR SELECT USING (true);
  END IF;
  -- human_reviews policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='human_reviews' AND policyname='read_human_reviews') THEN
    CREATE POLICY read_human_reviews ON public.human_reviews FOR SELECT USING (true);
  END IF;
END$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id_backfill ON public.users (auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role_backfill ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status_backfill ON public.analysis_runs (status);
CREATE INDEX IF NOT EXISTS idx_human_reviews_analysis_id_backfill ON public.human_reviews (analysis_run_id);

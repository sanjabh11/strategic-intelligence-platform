-- ProphetHacks P1: Forecast Learnings Table
-- Stores prediction records for calibration fitting and outcome tracking.
-- User applies this migration after fixing Supabase migration issues.

CREATE TABLE IF NOT EXISTS public.forecast_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scenario_hash TEXT NOT NULL,
  intent TEXT NOT NULL,
  skill_category TEXT NOT NULL DEFAULT 'general',
  predicted_probability DECIMAL(5,4) NOT NULL,
  market_prior DECIMAL(5,4),
  evidence_gate_decision TEXT CHECK (evidence_gate_decision IN ('move', 'no_move')),
  actual_outcome DECIMAL(5,4),
  brier_score DECIMAL(5,4),
  resolution_source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forecast_learnings_intent
  ON public.forecast_learnings (intent);

CREATE INDEX IF NOT EXISTS idx_forecast_learnings_skill_category
  ON public.forecast_learnings (skill_category);

CREATE INDEX IF NOT EXISTS idx_forecast_learnings_created_at
  ON public.forecast_learnings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forecast_learnings_resolved_at
  ON public.forecast_learnings (resolved_at)
  WHERE resolved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_forecast_learnings_user_id
  ON public.forecast_learnings (user_id);

-- RLS: Users can insert and read their own learnings
ALTER TABLE public.forecast_learnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own learnings"
  ON public.forecast_learnings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can read own learnings"
  ON public.forecast_learnings
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own learnings"
  ON public.forecast_learnings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role bypasses RLS (used by calibration-refresh edge function)

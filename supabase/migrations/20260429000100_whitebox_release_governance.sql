-- Whitebox release evaluation and governed promotion for multi-agent consensus variants
-- Created: 2026-04-29

CREATE TABLE IF NOT EXISTS public.whitebox_release_state (
  state_key text PRIMARY KEY,
  active_policy text NOT NULL CHECK (active_policy IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')) DEFAULT 'role_weighted',
  bootstrap_status text NOT NULL CHECK (bootstrap_status IN ('pending', 'running', 'completed')) DEFAULT 'pending',
  minimum_sample_size integer NOT NULL DEFAULT 12 CHECK (minimum_sample_size > 0),
  promotion_margin numeric(8,6) NOT NULL DEFAULT 0.015 CHECK (promotion_margin >= 0),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_bootstrap_started_at timestamptz,
  bootstrap_completed_at timestamptz,
  last_scheduled_run_at timestamptz,
  last_release_evaluation_at timestamptz,
  last_promotion_at timestamptz,
  last_decision text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whitebox_release_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES public.forecasts(id) ON DELETE CASCADE,
  analysis_run_id uuid REFERENCES public.analysis_runs(id) ON DELETE SET NULL,
  variant_id text NOT NULL CHECK (variant_id IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')),
  variant_label text NOT NULL,
  method text NOT NULL,
  probability numeric(8,6) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  outcome numeric(2,1) NOT NULL CHECK (outcome IN (0, 1)),
  brier_score numeric(8,6) NOT NULL CHECK (brier_score >= 0 AND brier_score <= 1),
  is_champion_variant boolean NOT NULL DEFAULT false,
  active_policy_at_evaluation text NOT NULL CHECK (active_policy_at_evaluation IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')) DEFAULT 'role_weighted',
  forecast_resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (forecast_id, variant_id)
);

CREATE TABLE IF NOT EXISTS public.whitebox_release_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_key text NOT NULL REFERENCES public.whitebox_release_state(state_key) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('bootstrap_started', 'bootstrap_completed', 'hold', 'promote')),
  previous_policy text CHECK (previous_policy IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')),
  next_policy text CHECK (next_policy IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')),
  recommended_policy text CHECK (recommended_policy IN ('role_weighted', 'equal_weight', 'trimmed_mean', 'skeptic_adjusted')),
  rationale text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.whitebox_release_state (state_key, active_policy, bootstrap_status, minimum_sample_size, promotion_margin)
VALUES ('multi_agent_consensus', 'role_weighted', 'pending', 12, 0.015)
ON CONFLICT (state_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_whitebox_release_evaluations_variant
  ON public.whitebox_release_evaluations (variant_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_whitebox_release_evaluations_forecast
  ON public.whitebox_release_evaluations (forecast_id);

CREATE INDEX IF NOT EXISTS idx_whitebox_release_decisions_state_created
  ON public.whitebox_release_decisions (state_key, created_at DESC);

CREATE OR REPLACE FUNCTION public.whitebox_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_whitebox_release_state_set_updated_at ON public.whitebox_release_state;
CREATE TRIGGER trg_whitebox_release_state_set_updated_at
BEFORE UPDATE ON public.whitebox_release_state
FOR EACH ROW
EXECUTE FUNCTION public.whitebox_set_updated_at();

CREATE OR REPLACE FUNCTION public.whitebox_pending_forecasts(p_limit integer DEFAULT 25)
RETURNS TABLE (
  id uuid,
  analysis_run_id uuid,
  resolution_outcome text,
  resolved_at timestamptz,
  game_theory_model jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.analysis_run_id,
    f.resolution_outcome,
    f.resolved_at,
    f.game_theory_model
  FROM public.forecasts f
  WHERE f.is_resolved = true
    AND f.resolution_outcome IN ('yes', 'no')
    AND f.game_theory_model IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.whitebox_release_evaluations e
      WHERE e.forecast_id = f.id
    )
  ORDER BY COALESCE(f.resolved_at, f.updated_at, f.created_at) ASC, f.id ASC
  LIMIT GREATEST(COALESCE(p_limit, 25), 1);
$$;

CREATE OR REPLACE FUNCTION public.whitebox_pending_forecast_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.forecasts f
  WHERE f.is_resolved = true
    AND f.resolution_outcome IN ('yes', 'no')
    AND f.game_theory_model IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.whitebox_release_evaluations e
      WHERE e.forecast_id = f.id
    );
$$;

ALTER TABLE public.whitebox_release_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitebox_release_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitebox_release_decisions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.whitebox_release_state TO authenticated;
GRANT EXECUTE ON FUNCTION public.whitebox_pending_forecasts(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.whitebox_pending_forecast_count() TO service_role;


-- Canonicalize analysis_runs summary columns and subscription tiers
-- Created: 2026-04-26

-- Ensure the monetization enum can represent the canonical Whop surface.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'subscription_tier'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typnamespace = 'public'::regnamespace
      AND t.typname = 'subscription_tier'
      AND e.enumlabel = 'elite'
  ) THEN
    ALTER TYPE public.subscription_tier ADD VALUE 'elite';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Add the analysis summary columns that current edge functions and UI expect.
ALTER TABLE public.analysis_runs
  ADD COLUMN IF NOT EXISTS retrieval_ids jsonb,
  ADD COLUMN IF NOT EXISTS evidence_backed boolean,
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS external_sources_count integer,
  ADD COLUMN IF NOT EXISTS web_scraping_used boolean;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'analysis_runs'
      AND column_name = 'retrieval_ids'
      AND data_type = 'ARRAY'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.analysis_runs
      ALTER COLUMN retrieval_ids
      TYPE jsonb
      USING CASE
        WHEN retrieval_ids IS NULL THEN '[]'::jsonb
        ELSE to_jsonb(retrieval_ids)
      END
    $sql$;
  END IF;
END
$$;

ALTER TABLE public.analysis_runs
  ALTER COLUMN retrieval_ids SET DEFAULT '[]'::jsonb,
  ALTER COLUMN evidence_backed SET DEFAULT false,
  ALTER COLUMN external_sources_count SET DEFAULT 0,
  ALTER COLUMN web_scraping_used SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.sync_analysis_run_summary_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_analysis jsonb := COALESCE(NEW.analysis_json, '{}'::jsonb);
  v_provenance jsonb := COALESCE(v_analysis->'provenance', '{}'::jsonb);
  v_retrieval_json jsonb := COALESCE(v_provenance->'retrieval_ids', v_provenance->'used_retrieval_ids', '[]'::jsonb);
  v_review_reasons jsonb := COALESCE(v_analysis->'review_reasons', v_analysis->'review_metadata'->'review_reasons', '[]'::jsonb);
  v_retrieval_count integer := 0;
  v_external_sources integer := 0;
BEGIN
  IF v_analysis <> '{}'::jsonb THEN
    NEW.audience := COALESCE(NEW.audience, NULLIF(v_analysis->>'audience', ''));

    IF NEW.status IS NULL OR btrim(NEW.status) = '' THEN
      NEW.status := COALESCE(NULLIF(v_analysis->>'status', ''), 'completed');
    END IF;

    IF NEW.request_id IS NULL OR btrim(NEW.request_id) = '' THEN
      NEW.request_id := NULLIF(v_analysis->>'request_id', '');
    END IF;

    IF NEW.review_reason IS NULL OR btrim(NEW.review_reason) = '' THEN
      NEW.review_reason := NULLIF(
        COALESCE(
          v_analysis->>'review_reason',
          v_analysis->'review_metadata'->>'review_reason',
          CASE
            WHEN jsonb_typeof(v_review_reasons) = 'array'
            THEN array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_review_reasons)), '; ')
            ELSE NULL
          END
        ),
        ''
      );
    END IF;

    IF jsonb_typeof(v_retrieval_json) = 'array' THEN
      v_retrieval_count := jsonb_array_length(v_retrieval_json);
      IF NEW.retrieval_ids IS NULL
        OR jsonb_typeof(NEW.retrieval_ids) <> 'array'
        OR jsonb_array_length(NEW.retrieval_ids) = 0 THEN
        NEW.retrieval_ids := v_retrieval_json;
      END IF;
    END IF;

    IF v_provenance ? 'retrieval_count' THEN
      v_retrieval_count := COALESCE(NULLIF(v_provenance->>'retrieval_count', '')::integer, v_retrieval_count);
    END IF;

    NEW.evidence_backed := COALESCE(
      NEW.evidence_backed,
      CASE
        WHEN v_provenance ? 'evidence_backed' THEN (v_provenance->>'evidence_backed')::boolean
        ELSE NULL
      END,
      false
    );

    v_external_sources := COALESCE(
      NULLIF(v_analysis->>'external_sources_count', '')::integer,
      v_retrieval_count,
      0
    );

    NEW.external_sources_count := COALESCE(NEW.external_sources_count, v_external_sources, 0);
    NEW.web_scraping_used := COALESCE(
      NEW.web_scraping_used,
      CASE
        WHEN v_analysis ? 'web_scraping_used' THEN (v_analysis->>'web_scraping_used')::boolean
        ELSE NULL
      END,
      false
    );
  END IF;

  NEW.status := COALESCE(NULLIF(NEW.status, ''), 'completed');
  NEW.retrieval_ids := COALESCE(NEW.retrieval_ids, '[]'::jsonb);
  NEW.evidence_backed := COALESCE(NEW.evidence_backed, false);
  NEW.external_sources_count := COALESCE(NEW.external_sources_count, 0);
  NEW.web_scraping_used := COALESCE(NEW.web_scraping_used, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_analysis_run_summary_columns ON public.analysis_runs;
CREATE TRIGGER trg_sync_analysis_run_summary_columns
BEFORE INSERT OR UPDATE OF analysis_json, audience, status, request_id, review_reason, retrieval_ids, evidence_backed, external_sources_count, web_scraping_used
ON public.analysis_runs
FOR EACH ROW
EXECUTE FUNCTION public.sync_analysis_run_summary_columns();

UPDATE public.analysis_runs
SET analysis_json = analysis_json
WHERE analysis_json IS NOT NULL;

UPDATE public.analysis_runs
SET
  retrieval_ids = COALESCE(retrieval_ids, '[]'::jsonb),
  evidence_backed = COALESCE(evidence_backed, false),
  external_sources_count = COALESCE(external_sources_count, 0),
  web_scraping_used = COALESCE(web_scraping_used, false),
  status = COALESCE(NULLIF(status, ''), 'completed');

CREATE INDEX IF NOT EXISTS idx_analysis_runs_evidence_backed
  ON public.analysis_runs (evidence_backed);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_review_reason
  ON public.analysis_runs (review_reason)
  WHERE review_reason IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_runs_retrieval_ids
  ON public.analysis_runs
  USING gin (retrieval_ids);

-- Canonicalize legacy subscription rows into the public Free/Pro/Elite/Enterprise/Academic model.
UPDATE public.user_subscriptions
SET tier = 'pro'
WHERE tier::text = 'analyst';

DELETE FROM public.user_subscriptions older
USING public.user_subscriptions newer
WHERE older.user_id IS NOT NULL
  AND newer.user_id = older.user_id
  AND (
    COALESCE(newer.updated_at, newer.created_at, 'epoch'::timestamptz),
    newer.id
  ) > (
    COALESCE(older.updated_at, older.created_at, 'epoch'::timestamptz),
    older.id
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_user_id_unique
  ON public.user_subscriptions (user_id)
  WHERE user_id IS NOT NULL;

DELETE FROM public.tier_limits
WHERE tier::text = 'analyst';

INSERT INTO public.tier_limits (
  tier,
  display_name,
  price_monthly_cents,
  price_yearly_cents,
  max_analyses_per_day,
  max_matrix_size,
  max_players,
  max_scenarios_saved,
  max_templates_access,
  can_export_csv,
  can_export_pdf,
  can_use_api,
  can_access_gold_module,
  can_access_sequential_games,
  can_access_monte_carlo,
  can_access_real_time_data,
  can_collaborate,
  can_create_private_rooms,
  can_white_label,
  support_level
)
VALUES
  ('free', 'Free', 0, 0, 5, 2, 2, 10, 5, false, false, false, false, false, false, false, false, false, false, 'community'),
  ('pro', 'Pro', 1900, 19000, 50, 5, 5, 25, 20, true, true, false, false, true, true, false, false, false, false, 'email'),
  ('elite', 'Elite', 4900, 49000, -1, 10, 10, 100, 100, true, true, true, true, true, true, true, true, true, false, 'priority'),
  ('enterprise', 'Enterprise', 19900, 199000, -1, -1, -1, -1, -1, true, true, true, true, true, true, true, true, true, true, 'dedicated'),
  ('academic', 'Academic', 3400, 34000, -1, 10, 10, 100, 100, true, true, false, true, true, true, true, true, true, false, 'priority')
ON CONFLICT (tier) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  price_yearly_cents = EXCLUDED.price_yearly_cents,
  max_analyses_per_day = EXCLUDED.max_analyses_per_day,
  max_matrix_size = EXCLUDED.max_matrix_size,
  max_players = EXCLUDED.max_players,
  max_scenarios_saved = EXCLUDED.max_scenarios_saved,
  max_templates_access = EXCLUDED.max_templates_access,
  can_export_csv = EXCLUDED.can_export_csv,
  can_export_pdf = EXCLUDED.can_export_pdf,
  can_use_api = EXCLUDED.can_use_api,
  can_access_gold_module = EXCLUDED.can_access_gold_module,
  can_access_sequential_games = EXCLUDED.can_access_sequential_games,
  can_access_monte_carlo = EXCLUDED.can_access_monte_carlo,
  can_access_real_time_data = EXCLUDED.can_access_real_time_data,
  can_collaborate = EXCLUDED.can_collaborate,
  can_create_private_rooms = EXCLUDED.can_create_private_rooms,
  can_white_label = EXCLUDED.can_white_label,
  support_level = EXCLUDED.support_level;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tier_limits'
      AND column_name = 'can_access_labs'
  ) THEN
    UPDATE public.tier_limits
    SET
      can_access_labs = CASE tier::text WHEN 'free' THEN false ELSE true END,
      can_access_forecasting = CASE tier::text WHEN 'free' THEN false WHEN 'pro' THEN false ELSE true END,
      can_access_intel = CASE tier::text WHEN 'free' THEN false WHEN 'pro' THEN false ELSE true END
    WHERE tier::text IN ('free', 'pro', 'elite', 'enterprise', 'academic');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tier_limits'
      AND column_name = 'monte_carlo_iterations'
  ) THEN
    UPDATE public.tier_limits
    SET monte_carlo_iterations = CASE tier::text
      WHEN 'free' THEN 100
      WHEN 'pro' THEN 1000
      ELSE 10000
    END
    WHERE tier::text IN ('free', 'pro', 'elite', 'enterprise', 'academic');
  END IF;
END
$$;

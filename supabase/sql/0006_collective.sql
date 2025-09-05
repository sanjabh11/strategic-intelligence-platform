-- Collective intelligence storage

CREATE TABLE IF NOT EXISTS shared_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES analysis_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scenario_summary TEXT,
  strategy JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS community_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  total_shares INTEGER NOT NULL DEFAULT 0,
  pattern_discovery_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  success_prediction_accuracy DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shared_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_strategies' AND policyname = 'read_anon_shared'
  ) THEN
    CREATE POLICY read_anon_shared ON shared_strategies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'community_metrics' AND policyname = 'read_anon_metrics'
  ) THEN
    CREATE POLICY read_anon_metrics ON community_metrics FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_strategies' AND policyname = 'mvp_insert_anon_shared'
  ) THEN
    CREATE POLICY mvp_insert_anon_shared ON public.shared_strategies FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;
END$$;



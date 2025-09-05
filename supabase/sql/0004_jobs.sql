-- Async job support for analysis processing

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT UNIQUE NOT NULL,
  scenario_text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','processing','completed','failed')),
  analysis_run_id UUID NULL REFERENCES analysis_runs(id) ON DELETE SET NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Read for anon
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_jobs' AND policyname = 'read_anon_jobs'
  ) THEN
    CREATE POLICY read_anon_jobs ON analysis_jobs FOR SELECT USING (true);
  END IF;

  -- Allow anon inserts in MVP (adjust for production)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_jobs' AND policyname = 'mvp_insert_anon_jobs'
  ) THEN
    CREATE POLICY mvp_insert_anon_jobs ON public.analysis_jobs
      FOR INSERT
      WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Allow anon updates when they own request_id (MVP relaxed: allow updates always for Edge anon key)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_jobs' AND policyname = 'mvp_update_anon_jobs'
  ) THEN
    CREATE POLICY mvp_update_anon_jobs ON public.analysis_jobs
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analysis_jobs_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_analysis_jobs_set_updated_at
      BEFORE UPDATE ON analysis_jobs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;



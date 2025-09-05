-- Mirror of sql/0005_recursive.sql
CREATE TABLE IF NOT EXISTS analysis_trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  step INTEGER NOT NULL,
  stability DOUBLE PRECISION,
  profile JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_beliefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  depth INTEGER NOT NULL,
  belief JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE analysis_trajectories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_beliefs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_trajectories' AND policyname = 'read_anon_trajectories'
  ) THEN
    CREATE POLICY read_anon_trajectories ON analysis_trajectories FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_beliefs' AND policyname = 'read_anon_beliefs'
  ) THEN
    CREATE POLICY read_anon_beliefs ON agent_beliefs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_trajectories' AND policyname = 'mvp_insert_anon_trajectories'
  ) THEN
    CREATE POLICY mvp_insert_anon_trajectories ON public.analysis_trajectories FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_beliefs' AND policyname = 'mvp_insert_anon_beliefs'
  ) THEN
    CREATE POLICY mvp_insert_anon_beliefs ON public.agent_beliefs FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;
END$$;



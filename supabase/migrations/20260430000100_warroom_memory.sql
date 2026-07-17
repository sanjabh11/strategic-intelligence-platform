-- War room memory objects for decision-grade collaboration

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'warroom_sessions'
      AND policyname = 'Public view warroom sessions'
  ) THEN
    DROP POLICY "Public view warroom sessions" ON public.warroom_sessions;
  END IF;
END $$;

CREATE POLICY "Authenticated or lobby viewers can read warroom sessions"
  ON public.warroom_sessions
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    OR status IN ('lobby', 'completed')
    OR auth.uid() = created_by
  );

CREATE TABLE IF NOT EXISTS public.warroom_decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.warroom_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  source_surface text NOT NULL CHECK (source_surface IN ('strategist_brief', 'forecast_detail', 'commodity_workspace')),
  strategist_brief_snapshot jsonb DEFAULT '{}'::jsonb,
  linked_forecast_id uuid,
  linked_forecast_title text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warroom_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.warroom_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assumption text NOT NULL,
  rationale text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'monitor', 'retired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warroom_scenario_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.warroom_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  scenario_text text NOT NULL,
  source_surface text NOT NULL CHECK (source_surface IN ('game_studio', 'commodity_workspace', 'console')),
  template_id text,
  studio_brief text,
  report jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warroom_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.warroom_sessions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL DEFAULT 'session' CHECK (target_type IN ('session', 'decision_log', 'assumption', 'scenario_version')),
  target_id uuid,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warroom_decision_logs_session ON public.warroom_decision_logs(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warroom_assumptions_session ON public.warroom_assumptions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warroom_scenario_versions_session ON public.warroom_scenario_versions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warroom_comments_session ON public.warroom_comments(session_id, created_at DESC);

ALTER TABLE public.warroom_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warroom_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warroom_scenario_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warroom_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read warroom decision logs"
  ON public.warroom_decision_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert warroom decision logs"
  ON public.warroom_decision_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update warroom decision logs"
  ON public.warroom_decision_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read warroom assumptions"
  ON public.warroom_assumptions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert warroom assumptions"
  ON public.warroom_assumptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update warroom assumptions"
  ON public.warroom_assumptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read warroom scenario versions"
  ON public.warroom_scenario_versions
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert warroom scenario versions"
  ON public.warroom_scenario_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update warroom scenario versions"
  ON public.warroom_scenario_versions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read warroom comments"
  ON public.warroom_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert warroom comments"
  ON public.warroom_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.warroom_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS warroom_decision_logs_updated_at ON public.warroom_decision_logs;
CREATE TRIGGER warroom_decision_logs_updated_at
  BEFORE UPDATE ON public.warroom_decision_logs
  FOR EACH ROW EXECUTE FUNCTION public.warroom_touch_updated_at();

DROP TRIGGER IF EXISTS warroom_assumptions_updated_at ON public.warroom_assumptions;
CREATE TRIGGER warroom_assumptions_updated_at
  BEFORE UPDATE ON public.warroom_assumptions
  FOR EACH ROW EXECUTE FUNCTION public.warroom_touch_updated_at();

DROP TRIGGER IF EXISTS warroom_scenario_versions_updated_at ON public.warroom_scenario_versions;
CREATE TRIGGER warroom_scenario_versions_updated_at
  BEFORE UPDATE ON public.warroom_scenario_versions
  FOR EACH ROW EXECUTE FUNCTION public.warroom_touch_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.warroom_decision_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.warroom_assumptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.warroom_scenario_versions TO authenticated;
GRANT SELECT, INSERT ON public.warroom_comments TO authenticated;

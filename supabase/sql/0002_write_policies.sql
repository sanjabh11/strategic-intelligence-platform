-- Write policies restricted to service role for persistence from Edge Functions
-- Idempotent creation

DO $$
BEGIN
  -- analysis_runs INSERT for service_role only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'insert_service_role_runs'
  ) THEN
    CREATE POLICY insert_service_role_runs ON public.analysis_runs
      FOR INSERT TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  -- analysis_features INSERT for service_role only
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_features' AND policyname = 'insert_service_role_features'
  ) THEN
    CREATE POLICY insert_service_role_features ON public.analysis_features
      FOR INSERT TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

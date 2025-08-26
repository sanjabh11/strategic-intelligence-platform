-- Migration: Service role insert policies (idempotent)
-- Source: supabase/sql/0002_write_policies.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'insert_service_role_runs'
  ) THEN
    CREATE POLICY insert_service_role_runs ON public.analysis_runs
      FOR INSERT TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_features' AND policyname = 'insert_service_role_features'
  ) THEN
    CREATE POLICY insert_service_role_features ON public.analysis_features
      FOR INSERT TO public
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

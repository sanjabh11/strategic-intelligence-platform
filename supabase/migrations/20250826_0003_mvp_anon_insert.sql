-- Migration: MVP anon insert policies (temporary)
-- Source: supabase/sql/0003_mvp_anon_insert.sql
-- Tag: MVP-MOCK. Remove before production merge.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'mvp_insert_anon_runs'
  ) THEN
    CREATE POLICY mvp_insert_anon_runs ON public.analysis_runs
      FOR INSERT
      WITH CHECK (auth.role() = 'anon');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_features' AND policyname = 'mvp_insert_anon_features'
  ) THEN
    CREATE POLICY mvp_insert_anon_features ON public.analysis_features
      FOR INSERT
      WITH CHECK (auth.role() = 'anon');
  END IF;
END $$;

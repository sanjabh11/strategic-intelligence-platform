-- Migration: Remove MVP anonymous insert/update policies for production hardening
-- Drops permissive policies created for MVP/demo to ensure writes require service_role

DO $$
BEGIN
  -- analysis_runs anon insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'mvp_insert_anon_runs'
  ) THEN
    DROP POLICY mvp_insert_anon_runs ON public.analysis_runs;
  END IF;

  -- analysis_features anon insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_features' AND policyname = 'mvp_insert_anon_features'
  ) THEN
    DROP POLICY mvp_insert_anon_features ON public.analysis_features;
  END IF;

  -- analysis_jobs anon policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_jobs' AND policyname = 'mvp_insert_anon_jobs'
  ) THEN
    DROP POLICY mvp_insert_anon_jobs ON public.analysis_jobs;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_jobs' AND policyname = 'mvp_update_anon_jobs'
  ) THEN
    DROP POLICY mvp_update_anon_jobs ON public.analysis_jobs;
  END IF;

  -- analysis_trajectories anon insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_trajectories' AND policyname = 'mvp_insert_anon_trajectories'
  ) THEN
    DROP POLICY mvp_insert_anon_trajectories ON public.analysis_trajectories;
  END IF;

  -- agent_beliefs anon insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agent_beliefs' AND policyname = 'mvp_insert_anon_beliefs'
  ) THEN
    DROP POLICY mvp_insert_anon_beliefs ON public.agent_beliefs;
  END IF;

  -- shared_strategies anon insert policy
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'shared_strategies' AND policyname = 'mvp_insert_anon_shared'
  ) THEN
    DROP POLICY mvp_insert_anon_shared ON public.shared_strategies;
  END IF;
END$$;

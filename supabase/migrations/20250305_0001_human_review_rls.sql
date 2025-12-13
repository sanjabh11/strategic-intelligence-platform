-- Migration: Row Level Security policies for human review system
-- Implements access control for reviewers, admins, and regular users
-- Supports JWT-based authentication with role checking

-- Helper function to get user role from JWT
-- This assumes auth.jwt() contains the user's auth_id as 'sub'
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT role
  FROM users
  WHERE auth_id = auth.uid()::uuid
$$;

-- Enable RLS on review_queue view (views inherit from underlying table policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'review_queue'
      AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.review_queue SET (security_barrier = true)';
  END IF;
END;
$$;

-- DROP existing open policies (need to replace with role-based access)
-- Wrap in DO block to handle missing tables gracefully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'human_reviews' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP POLICY IF EXISTS read_human_reviews ON public.human_reviews';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analysis_runs' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'DROP POLICY IF EXISTS read_anon_runs ON public.analysis_runs';
    EXECUTE 'DROP POLICY IF EXISTS read_public_runs ON public.analysis_runs';
    EXECUTE 'DROP POLICY IF EXISTS read_runs ON public.analysis_runs';
  END IF;
END$$;

-- Human Reviews Policies (wrapped for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'human_reviews' AND relnamespace = 'public'::regnamespace) THEN
    -- Reviewers can read all reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='human_reviews' AND policyname='reviewer_read_human_reviews') THEN
      CREATE POLICY reviewer_read_human_reviews ON public.human_reviews FOR SELECT USING (get_user_role() = 'reviewer');
    END IF;
    -- Reviewers can write their own reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='human_reviews' AND policyname='reviewer_write_human_reviews') THEN
      CREATE POLICY reviewer_write_human_reviews ON public.human_reviews FOR ALL USING (get_user_role() = 'reviewer' AND reviewer_id::uuid = auth.uid()) WITH CHECK (get_user_role() = 'reviewer');
    END IF;
    -- Admins have full access
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='human_reviews' AND policyname='admin_access_human_reviews') THEN
      CREATE POLICY admin_access_human_reviews ON public.human_reviews FOR ALL USING (get_user_role() = 'admin');
    END IF;
  END IF;
END$$;

-- Analysis Runs Policies (wrapped for idempotency)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analysis_runs' AND relnamespace = 'public'::regnamespace) THEN
    -- Reviewers can read analysis runs that need review
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='reviewer_read_analysis_runs') THEN
      CREATE POLICY reviewer_read_analysis_runs ON public.analysis_runs FOR SELECT USING (get_user_role() = 'reviewer' AND status IN ('needs_review', 'under_review'));
    END IF;
    -- Reviewers can update analysis runs for status changes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='reviewer_update_analysis_runs') THEN
      CREATE POLICY reviewer_update_analysis_runs ON public.analysis_runs FOR UPDATE USING (get_user_role() = 'reviewer' AND status IN ('needs_review', 'under_review')) WITH CHECK (get_user_role() = 'reviewer');
    END IF;
    -- Admins have full access to analysis runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='admin_access_analysis_runs') THEN
      CREATE POLICY admin_access_analysis_runs ON public.analysis_runs FOR ALL USING (get_user_role() = 'admin');
    END IF;
    -- Public read for completed runs
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='analysis_runs' AND policyname='public_read_completed_runs') THEN
      CREATE POLICY public_read_completed_runs ON public.analysis_runs FOR SELECT USING (status NOT IN ('needs_review', 'under_review') AND get_user_role() IS NULL);
    END IF;
  END IF;
END$$;

-- Review Queue Policies (inherits from analysis_runs, but explicit for clarity)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'review_queue'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS reviewer_read_review_queue ON public.review_queue';
    EXECUTE 'CREATE POLICY reviewer_read_review_queue ON public.review_queue FOR SELECT USING (get_user_role() = ''reviewer'')';

    EXECUTE 'DROP POLICY IF EXISTS admin_read_review_queue ON public.review_queue';
    EXECUTE 'CREATE POLICY admin_read_review_queue ON public.review_queue FOR SELECT USING (get_user_role() = ''admin'')';
  END IF;
END;
$$;

-- Performance indexes for role-based queries (wrapped for safety)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'users' AND relnamespace = 'public'::regnamespace) THEN
    CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
    CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users (auth_id);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analysis_runs' AND relnamespace = 'public'::regnamespace) THEN
    CREATE INDEX IF NOT EXISTS idx_analysis_runs_status_role_filter ON public.analysis_runs (status) WHERE status IN ('needs_review', 'under_review');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'human_reviews' AND relnamespace = 'public'::regnamespace) THEN
    CREATE INDEX IF NOT EXISTS idx_human_reviews_reviewer_role_auth ON public.human_reviews (reviewer_id) WHERE reviewer_id IS NOT NULL;
  END IF;
END$$;

-- Comments for testing guidance (wrapped for safety)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role') THEN
    EXECUTE 'COMMENT ON FUNCTION get_user_role() IS ''Returns user role from JWT for RLS policies. Assumes JWT sub claim matches users.auth_id''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'human_reviews' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'COMMENT ON TABLE public.human_reviews IS ''RLS enabled: reviewers see all reviews, admins full access, regular users none''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'analysis_runs' AND relnamespace = 'public'::regnamespace) THEN
    EXECUTE 'COMMENT ON TABLE public.analysis_runs IS ''RLS enabled: reviewers see review-queue runs, admins full access, regular users none for review data''';
  END IF;
END$$;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'review_queue'
      AND c.relkind = 'v'
  ) THEN
    EXECUTE 'COMMENT ON VIEW public.review_queue IS ''RLS enabled: reviewers and admins can access review queue, regular users none''';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'review_queue'
      AND c.relkind IN ('r', 'p')
  ) THEN
    EXECUTE 'COMMENT ON TABLE public.review_queue IS ''RLS enabled: reviewers and admins can access review queue, regular users none''';
  END IF;
END;
$$;

-- Test cases for policy verification:
-- - Reviewer user: can SELECT human_reviews, SELECT analysis_runs WHERE status IN ('needs_review', 'under_review'), ALL on their human_reviews
-- - Admin user: ALL operations on human_reviews and analysis_runs
-- - Regular user: no access to review data, only public completed analysis_runs
-- - Anonymous user: only public completed analysis_runs
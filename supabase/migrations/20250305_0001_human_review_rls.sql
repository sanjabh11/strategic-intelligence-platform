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
ALTER VIEW review_queue SET (security_barrier = true);

-- DROP existing open policies (need to replace with role-based access)
DROP POLICY IF EXISTS read_human_reviews ON human_reviews;
DROP POLICY IF EXISTS read_anon_runs ON analysis_runs;
DROP POLICY IF EXISTS read_public_runs ON analysis_runs;
DROP POLICY IF EXISTS read_runs ON analysis_runs;

-- Human Reviews Policies
-- Reviewers can read all reviews for audit trail and history
CREATE POLICY reviewer_read_human_reviews ON human_reviews
  FOR SELECT
  USING (get_user_role() = 'reviewer');

-- Reviewers can create and update their own reviews
CREATE POLICY reviewer_write_human_reviews ON human_reviews
  FOR ALL
  USING (get_user_role() = 'reviewer' AND reviewer_id::uuid = auth.uid())
  WITH CHECK (get_user_role() = 'reviewer');

-- Admins have full access to all reviews
CREATE POLICY admin_access_human_reviews ON human_reviews
  FOR ALL
  USING (get_user_role() = 'admin');

-- Analysis Runs Policies
-- Reviewers can read analysis runs that need review
CREATE POLICY reviewer_read_analysis_runs ON analysis_runs
  FOR SELECT
  USING (
    get_user_role() = 'reviewer' AND
    status IN ('needs_review', 'under_review')
  );

-- Reviewers can update analysis runs for status changes
CREATE POLICY reviewer_update_analysis_runs ON analysis_runs
  FOR UPDATE
  USING (get_user_role() = 'reviewer' AND status IN ('needs_review', 'under_review'))
  WITH CHECK (get_user_role() = 'reviewer');

-- Admins have full access to analysis runs
CREATE POLICY admin_access_analysis_runs ON analysis_runs
  FOR ALL
  USING (get_user_role() = 'admin');

-- Regular users have no access to review-related data (as per requirements)
-- Allow public read for completed analyses not under review (optional enhancement)
-- This preserves existing anonymous read for non-sensitive data
CREATE POLICY public_read_completed_runs ON analysis_runs
  FOR SELECT
  USING (
    status NOT IN ('needs_review', 'under_review') AND
    get_user_role() IS NULL  -- anonymous/public access only for completed runs
  );

-- Review Queue Policies (inherits from analysis_runs, but explicit for clarity)
CREATE POLICY reviewer_read_review_queue ON review_queue
  FOR SELECT
  USING (get_user_role() = 'reviewer');

CREATE POLICY admin_read_review_queue ON review_queue
  FOR SELECT
  USING (get_user_role() = 'admin');

-- Performance indexes for role-based queries
-- Index on user roles for policy checks
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);

-- Index on analysis_runs status for reviewer queries
CREATE INDEX IF NOT EXISTS idx_analysis_runs_status_role_filter ON analysis_runs (status) WHERE status IN ('needs_review', 'under_review');

-- Index on human_reviews for role-based access
CREATE INDEX IF NOT EXISTS idx_human_reviews_reviewer_role_auth ON human_reviews (reviewer_id) WHERE reviewer_id IS NOT NULL;

-- Comment for testing guidance
COMMENT ON FUNCTION get_user_role() IS 'Returns user role from JWT for RLS policies. Assumes JWT sub claim matches users.auth_id';
COMMENT ON TABLE human_reviews IS 'RLS enabled: reviewers see all reviews, admins full access, regular users none';
COMMENT ON TABLE analysis_runs IS 'RLS enabled: reviewers see review-queue runs, admins full access, regular users none for review data';
COMMENT ON VIEW review_queue IS 'RLS enabled: reviewers and admins can access review queue, regular users none';

-- Test cases for policy verification:
-- - Reviewer user: can SELECT human_reviews, SELECT analysis_runs WHERE status IN ('needs_review', 'under_review'), ALL on their human_reviews
-- - Admin user: ALL operations on human_reviews and analysis_runs
-- - Regular user: no access to review data, only public completed analysis_runs
-- - Anonymous user: only public completed analysis_runs
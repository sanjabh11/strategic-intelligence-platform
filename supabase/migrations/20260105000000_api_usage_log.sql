-- M3-T4: API usage tracking table for tier-based rate limiting
-- Supports the rate-limiter shared module in supabase/functions/_shared/rate-limiter.ts

CREATE TABLE IF NOT EXISTS api_usage_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for rate-limit queries (user_id + action + time window)
CREATE INDEX IF NOT EXISTS idx_api_usage_log_rate_limit
  ON api_usage_log (user_id, action, created_at DESC);

-- RLS policies
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY api_usage_log_select_own
  ON api_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert (edge functions use service role key)
CREATE POLICY api_usage_log_insert_service
  ON api_usage_log FOR INSERT
  WITH CHECK (true);

-- Users cannot delete their own logs (only service role can)
CREATE POLICY api_usage_log_delete_service
  ON api_usage_log FOR DELETE
  USING (false);

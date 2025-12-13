-- Whop Integration Database Schema
-- Migration for whop_users table and updated tier_limits
-- Supports both Whop and Stripe (academic) subscriptions

-- Whop users mapping table
CREATE TABLE IF NOT EXISTS whop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  whop_user_id TEXT UNIQUE NOT NULL,
  whop_membership_id TEXT,
  whop_email TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'elite', 'enterprise', 'academic')),
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing')),
  plan_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_provider TEXT DEFAULT 'whop' CHECK (payment_provider IN ('whop', 'stripe')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whop_users_user_id ON whop_users(user_id);
CREATE INDEX IF NOT EXISTS idx_whop_users_whop_user_id ON whop_users(whop_user_id);
CREATE INDEX IF NOT EXISTS idx_whop_users_email ON whop_users(whop_email);

-- Enable RLS
ALTER TABLE whop_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own whop data"
  ON whop_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage whop data"
  ON whop_users FOR ALL
  USING (auth.role() = 'service_role');

-- Update tier_limits with new pricing: $0 / $19 / $49 / $199
DELETE FROM tier_limits WHERE tier IN ('free', 'analyst', 'pro', 'elite', 'enterprise', 'academic');

INSERT INTO tier_limits (
  tier, 
  display_name, 
  price_monthly_cents, 
  price_yearly_cents,
  max_analyses_per_day,
  max_matrix_size,
  max_players,
  max_scenarios_saved,
  max_templates_access,
  can_export_csv,
  can_export_pdf,
  can_use_api,
  can_access_gold_module,
  can_access_sequential_games,
  can_access_monte_carlo,
  can_access_real_time_data,
  can_collaborate,
  can_create_private_rooms,
  can_white_label,
  support_level,
  can_access_labs,
  can_access_forecasting,
  can_access_intel,
  monte_carlo_iterations,
  has_signal_access,
  has_marketplace_access
) VALUES
-- Free Tier: $0/month
('free', 'Free', 0, 0, 5, 2, 2, 3, 5, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, 'community', FALSE, FALSE, FALSE, 100, FALSE, FALSE),

-- Pro Tier: $19/month
('pro', 'Pro', 1900, 19000, 50, 5, 5, 25, 50, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, 'email', TRUE, FALSE, FALSE, 1000, FALSE, TRUE),

-- Elite Tier: $49/month
('elite', 'Elite', 4900, 49000, -1, 10, 10, 100, -1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'priority', TRUE, TRUE, TRUE, 10000, TRUE, TRUE),

-- Enterprise Tier: $199/month
('enterprise', 'Enterprise', 19900, 199000, -1, -1, -1, -1, -1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'dedicated', TRUE, TRUE, TRUE, 10000, TRUE, TRUE),

-- Academic Tier: $34/month (30% off Elite, Stripe only)
('academic', 'Academic', 3400, 34000, -1, 10, 10, 100, -1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, 'priority', TRUE, TRUE, TRUE, 10000, TRUE, TRUE);

-- Feature usage tracking table (for metered features)
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  period_start DATE DEFAULT CURRENT_DATE,
  period_end DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, feature_name, period_start)
);

-- Index for usage queries
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_period ON feature_usage(user_id, period_start);

-- RLS for feature_usage
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage"
  ON feature_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage"
  ON feature_usage FOR ALL
  USING (auth.role() = 'service_role');

-- Function to check and increment feature usage
CREATE OR REPLACE FUNCTION check_feature_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
  v_current INTEGER;
  v_period_start DATE;
BEGIN
  -- Get current period start (1st of month)
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Get user tier
  SELECT COALESCE(
    (SELECT subscription_tier FROM whop_users WHERE user_id = p_user_id LIMIT 1),
    (SELECT tier FROM user_subscriptions WHERE user_id = p_user_id AND status = 'active' LIMIT 1),
    'free'
  ) INTO v_tier;
  
  -- Get limit for this tier
  SELECT CASE p_feature
    WHEN 'daily_analyses' THEN max_analyses_per_day
    WHEN 'monte_carlo' THEN monte_carlo_iterations
    ELSE -1
  END INTO v_limit
  FROM tier_limits WHERE tier = v_tier;
  
  -- If unlimited (-1), allow
  IF v_limit = -1 THEN
    RETURN json_build_object(
      'allowed', TRUE,
      'tier', v_tier,
      'unlimited', TRUE
    );
  END IF;
  
  -- Get or create usage record
  INSERT INTO feature_usage (user_id, feature_name, period_start, usage_count)
  VALUES (p_user_id, p_feature, v_period_start, 0)
  ON CONFLICT (user_id, feature_name, period_start) DO NOTHING;
  
  -- Get current usage
  SELECT usage_count INTO v_current
  FROM feature_usage
  WHERE user_id = p_user_id AND feature_name = p_feature AND period_start = v_period_start;
  
  -- Check if allowed
  IF v_current + p_increment > v_limit THEN
    RETURN json_build_object(
      'allowed', FALSE,
      'tier', v_tier,
      'current_usage', v_current,
      'max_allowed', v_limit,
      'remaining', GREATEST(0, v_limit - v_current)
    );
  END IF;
  
  -- Increment if requested
  IF p_increment > 0 THEN
    UPDATE feature_usage
    SET usage_count = usage_count + p_increment, updated_at = now()
    WHERE user_id = p_user_id AND feature_name = p_feature AND period_start = v_period_start;
    
    v_current := v_current + p_increment;
  END IF;
  
  RETURN json_build_object(
    'allowed', TRUE,
    'tier', v_tier,
    'current_usage', v_current,
    'max_allowed', v_limit,
    'remaining', v_limit - v_current
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_feature_usage TO authenticated;

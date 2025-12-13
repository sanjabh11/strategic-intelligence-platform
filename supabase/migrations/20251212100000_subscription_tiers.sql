-- Migration: Subscription Tiers System for Monetization
-- Implements tiered access control per Monetization Strategy
-- Created: December 12, 2025

-- Subscription tiers enum
CREATE TYPE subscription_tier AS ENUM ('free', 'analyst', 'pro', 'enterprise', 'academic');

-- User subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tier subscription_tier DEFAULT 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tier limits configuration
CREATE TABLE IF NOT EXISTS public.tier_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier UNIQUE NOT NULL,
  display_name text NOT NULL,
  price_monthly_cents int DEFAULT 0,
  price_yearly_cents int DEFAULT 0,
  -- Feature limits
  max_analyses_per_day int DEFAULT 5,
  max_matrix_size int DEFAULT 2, -- NxN matrix limit
  max_players int DEFAULT 2,
  max_scenarios_saved int DEFAULT 10,
  max_templates_access int DEFAULT 5,
  -- Feature flags
  can_export_csv boolean DEFAULT false,
  can_export_pdf boolean DEFAULT false,
  can_use_api boolean DEFAULT false,
  can_access_gold_module boolean DEFAULT false,
  can_access_sequential_games boolean DEFAULT false,
  can_access_monte_carlo boolean DEFAULT false,
  can_access_real_time_data boolean DEFAULT false,
  can_collaborate boolean DEFAULT false,
  can_create_private_rooms boolean DEFAULT false,
  can_white_label boolean DEFAULT false,
  -- Support
  support_level text DEFAULT 'community',
  created_at timestamptz DEFAULT now()
);

-- Usage tracking for rate limiting
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type text NOT NULL, -- 'analysis', 'export', 'api_call'
  count int DEFAULT 0,
  period_start timestamptz DEFAULT date_trunc('day', now()),
  period_end timestamptz DEFAULT date_trunc('day', now()) + interval '1 day',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, usage_type, period_start)
);

-- Insert default tier configurations
INSERT INTO public.tier_limits (tier, display_name, price_monthly_cents, price_yearly_cents, 
  max_analyses_per_day, max_matrix_size, max_players, max_scenarios_saved, max_templates_access,
  can_export_csv, can_export_pdf, can_use_api, can_access_gold_module, can_access_sequential_games,
  can_access_monte_carlo, can_access_real_time_data, can_collaborate, can_create_private_rooms,
  can_white_label, support_level)
VALUES 
  ('free', 'Free Tier', 0, 0, 
   5, 2, 2, 10, 5,
   false, false, false, false, false, 
   false, false, false, false, 
   false, 'community'),
  
  ('analyst', 'Analyst', 2900, 29000, 
   50, 4, 4, 100, 20,
   true, false, false, true, false, 
   true, true, false, false, 
   false, 'email'),
  
  ('pro', 'Professional', 7900, 79000, 
   200, 10, 10, 500, 100,
   true, true, true, true, true, 
   true, true, true, false, 
   false, 'priority'),
  
  ('enterprise', 'Enterprise', 50000, 500000, 
   -1, -1, -1, -1, -1, -- -1 = unlimited
   true, true, true, true, true, 
   true, true, true, true, 
   true, 'dedicated'),
  
  ('academic', 'Academic', 0, 0, 
   100, 6, 6, 200, 50,
   true, true, false, true, true, 
   true, false, true, false, 
   false, 'email')
ON CONFLICT (tier) DO NOTHING;

-- Function to get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS subscription_tier
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier subscription_tier;
BEGIN
  SELECT tier INTO v_tier
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > now())
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_tier, 'free');
END;
$$;

-- Function to check if user can perform action
CREATE OR REPLACE FUNCTION public.check_tier_limit(
  p_user_id uuid,
  p_action text,
  p_increment int DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tier subscription_tier;
  v_limits record;
  v_current_usage int;
  v_max_allowed int;
  v_allowed boolean;
BEGIN
  -- Get user tier
  v_tier := public.get_user_tier(p_user_id);
  
  -- Get tier limits
  SELECT * INTO v_limits FROM public.tier_limits WHERE tier = v_tier;
  
  -- Determine limit based on action
  CASE p_action
    WHEN 'analysis' THEN v_max_allowed := v_limits.max_analyses_per_day;
    WHEN 'export_csv' THEN v_allowed := v_limits.can_export_csv; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'export_pdf' THEN v_allowed := v_limits.can_export_pdf; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'api_call' THEN v_allowed := v_limits.can_use_api; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'gold_module' THEN v_allowed := v_limits.can_access_gold_module; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'sequential_games' THEN v_allowed := v_limits.can_access_sequential_games; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'monte_carlo' THEN v_allowed := v_limits.can_access_monte_carlo; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'real_time_data' THEN v_allowed := v_limits.can_access_real_time_data; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    ELSE v_max_allowed := 0;
  END CASE;
  
  -- Unlimited access (-1)
  IF v_max_allowed = -1 THEN
    RETURN jsonb_build_object('allowed', true, 'tier', v_tier, 'unlimited', true);
  END IF;
  
  -- Get current usage
  SELECT COALESCE(count, 0) INTO v_current_usage
  FROM public.usage_tracking
  WHERE user_id = p_user_id
    AND usage_type = p_action
    AND period_start = date_trunc('day', now());
  
  v_allowed := (v_current_usage + p_increment) <= v_max_allowed;
  
  -- Increment usage if allowed
  IF v_allowed THEN
    INSERT INTO public.usage_tracking (user_id, usage_type, count, period_start, period_end)
    VALUES (p_user_id, p_action, p_increment, date_trunc('day', now()), date_trunc('day', now()) + interval '1 day')
    ON CONFLICT (user_id, usage_type, period_start) 
    DO UPDATE SET count = usage_tracking.count + p_increment;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'tier', v_tier,
    'current_usage', v_current_usage,
    'max_allowed', v_max_allowed,
    'remaining', GREATEST(0, v_max_allowed - v_current_usage - p_increment)
  );
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_period ON public.usage_tracking(user_id, period_start);

-- RLS Policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
CREATE POLICY read_own_subscription ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Everyone can read tier limits
CREATE POLICY read_tier_limits ON public.tier_limits
  FOR SELECT USING (true);

-- Users can read their own usage
CREATE POLICY read_own_usage ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY service_manage_subscriptions ON public.user_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_manage_usage ON public.usage_tracking
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_tier(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_tier_limit(uuid, text, int) TO authenticated, service_role;
GRANT SELECT ON public.tier_limits TO authenticated, anon;
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT SELECT ON public.usage_tracking TO authenticated;

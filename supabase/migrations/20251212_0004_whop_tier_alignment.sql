-- Migration: Whop Tier Alignment
-- Adds Labs and Forecasting access flags per Whop monetization strategy
-- Created: December 12, 2025

-- Add new columns for Labs and Forecasting access
ALTER TABLE public.tier_limits 
ADD COLUMN IF NOT EXISTS can_access_labs boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_forecasting boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_intel boolean DEFAULT false;

-- Update tier configurations to match Whop Basic/Pro/Elite model
-- Free tier = Basic (limited)
UPDATE public.tier_limits 
SET 
  can_access_labs = false,
  can_access_forecasting = false,
  can_access_intel = false,
  max_analyses_per_day = 10
WHERE tier = 'free';

-- Analyst tier = Basic+ (slightly more)
UPDATE public.tier_limits 
SET 
  can_access_labs = false,
  can_access_forecasting = false,
  can_access_intel = false,
  max_analyses_per_day = 20
WHERE tier = 'analyst';

-- Pro tier = Pro (full engines, partial labs)
UPDATE public.tier_limits 
SET 
  can_access_labs = true,
  can_access_forecasting = false,
  can_access_intel = false,
  max_analyses_per_day = 50
WHERE tier = 'pro';

-- Academic tier = Pro equivalent
UPDATE public.tier_limits 
SET 
  can_access_labs = true,
  can_access_forecasting = false,
  can_access_intel = false,
  max_analyses_per_day = 50
WHERE tier = 'academic';

-- Enterprise tier = Elite (everything)
UPDATE public.tier_limits 
SET 
  can_access_labs = true,
  can_access_forecasting = true,
  can_access_intel = true,
  max_analyses_per_day = -1  -- unlimited
WHERE tier = 'enterprise';

-- Update check_tier_limit function to handle new features
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
    -- New Whop-aligned features
    WHEN 'labs' THEN v_allowed := v_limits.can_access_labs; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'forecasting' THEN v_allowed := v_limits.can_access_forecasting; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
    WHEN 'intel' THEN v_allowed := v_limits.can_access_intel; RETURN jsonb_build_object('allowed', v_allowed, 'tier', v_tier);
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
  IF v_allowed AND p_increment > 0 THEN
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

-- Add comment for documentation
COMMENT ON TABLE public.tier_limits IS 'Subscription tier feature limits aligned with Whop Basic/Pro/Elite model';

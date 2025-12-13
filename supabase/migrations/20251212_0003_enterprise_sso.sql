-- Migration: Enterprise SSO & Public Forecast Registry
-- Supports SAML 2.0, OAuth 2.0/OIDC for enterprise customers
-- Part of Monetization Strategy Phase 2

-- ============================================================================
-- ENTERPRISE SSO TABLES
-- ============================================================================

-- Organization/Tenant management
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  domain text UNIQUE, -- For domain-based SSO routing
  logo_url text,
  subscription_tier text DEFAULT 'enterprise',
  settings jsonb DEFAULT '{
    "enforce_sso": false,
    "allow_email_login": true,
    "require_mfa": false,
    "session_timeout_hours": 24,
    "ip_whitelist": [],
    "allowed_email_domains": []
  }'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SSO Provider configurations
CREATE TABLE IF NOT EXISTS public.sso_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('saml', 'oidc', 'oauth2')),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  
  -- SAML Configuration
  saml_entity_id text,
  saml_sso_url text,
  saml_slo_url text,
  saml_certificate text,
  saml_name_id_format text DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  
  -- OIDC/OAuth2 Configuration
  oidc_issuer text,
  oidc_client_id text,
  oidc_client_secret text, -- Encrypted
  oidc_authorization_url text,
  oidc_token_url text,
  oidc_userinfo_url text,
  oidc_jwks_url text,
  oidc_scopes text[] DEFAULT ARRAY['openid', 'email', 'profile'],
  
  -- Attribute mapping
  attribute_mapping jsonb DEFAULT '{
    "email": "email",
    "name": "name",
    "given_name": "given_name",
    "family_name": "family_name",
    "groups": "groups"
  }'::jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Organization members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  sso_provider_id uuid REFERENCES public.sso_providers(id),
  external_id text, -- ID from SSO provider
  groups text[], -- Groups from SSO provider
  joined_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  UNIQUE(organization_id, user_id)
);

-- SSO Sessions for tracking
CREATE TABLE IF NOT EXISTS public.sso_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.sso_providers(id),
  user_id uuid REFERENCES auth.users(id),
  session_index text, -- SAML SessionIndex
  state text UNIQUE,
  nonce text,
  relay_state text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PUBLIC FORECAST REGISTRY TABLES
-- ============================================================================

-- Public forecasts (predictions shared publicly)
CREATE TABLE IF NOT EXISTS public.forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('geopolitical', 'financial', 'technology', 'economic', 'social', 'other')),
  
  -- Forecast details
  question text NOT NULL, -- The specific prediction question
  resolution_criteria text NOT NULL, -- How will this be resolved?
  resolution_date timestamptz, -- When will we know the answer?
  current_probability decimal(5,4) CHECK (current_probability >= 0 AND current_probability <= 1),
  
  -- Analysis link
  analysis_run_id uuid, -- Link to analysis_runs if from platform
  game_theory_model jsonb, -- Simplified model for public viewing
  
  -- Metadata
  tags text[],
  is_public boolean DEFAULT true,
  is_resolved boolean DEFAULT false,
  resolution_outcome text CHECK (resolution_outcome IN ('yes', 'no', 'ambiguous', 'canceled')),
  resolved_at timestamptz,
  resolution_notes text,
  
  -- Engagement
  view_count int DEFAULT 0,
  prediction_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User predictions on forecasts
CREATE TABLE IF NOT EXISTS public.forecast_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid REFERENCES public.forecasts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  probability decimal(5,4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
  confidence decimal(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  reasoning text,
  is_public boolean DEFAULT false, -- Whether to show username
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(forecast_id, user_id)
);

-- Forecast updates (probability changes over time)
CREATE TABLE IF NOT EXISTS public.forecast_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid REFERENCES public.forecasts(id) ON DELETE CASCADE,
  probability decimal(5,4) NOT NULL,
  prediction_count int,
  notes text,
  recorded_at timestamptz DEFAULT now()
);

-- Leaderboard for forecast accuracy
CREATE TABLE IF NOT EXISTS public.forecast_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_predictions int DEFAULT 0,
  resolved_predictions int DEFAULT 0,
  brier_score decimal(6,4), -- Lower is better
  accuracy_rate decimal(5,4),
  calibration_score decimal(5,4),
  rank int,
  badges text[],
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get organization by domain
CREATE OR REPLACE FUNCTION public.get_org_by_domain(p_domain text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE domain = p_domain AND is_active = true;
  
  RETURN v_org_id;
END;
$$;

-- Function to calculate Brier score after forecast resolution
CREATE OR REPLACE FUNCTION public.update_forecast_scores()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actual decimal;
  v_prediction record;
  v_brier decimal;
BEGIN
  IF NEW.is_resolved = true AND OLD.is_resolved = false THEN
    -- Determine actual outcome (1 for yes, 0 for no)
    v_actual := CASE WHEN NEW.resolution_outcome = 'yes' THEN 1.0 ELSE 0.0 END;
    
    -- Update scores for all predictions
    FOR v_prediction IN 
      SELECT user_id, probability 
      FROM public.forecast_predictions 
      WHERE forecast_id = NEW.id
    LOOP
      -- Calculate Brier score component: (prediction - actual)^2
      v_brier := POWER(v_prediction.probability - v_actual, 2);
      
      -- Update user's score
      INSERT INTO public.forecast_scores (user_id, total_predictions, resolved_predictions, brier_score)
      VALUES (v_prediction.user_id, 1, 1, v_brier)
      ON CONFLICT (user_id) DO UPDATE SET
        resolved_predictions = forecast_scores.resolved_predictions + 1,
        brier_score = (COALESCE(forecast_scores.brier_score, 0) * forecast_scores.resolved_predictions + v_brier) / (forecast_scores.resolved_predictions + 1),
        accuracy_rate = CASE 
          WHEN (v_prediction.probability >= 0.5 AND v_actual = 1) OR (v_prediction.probability < 0.5 AND v_actual = 0)
          THEN (COALESCE(forecast_scores.accuracy_rate, 0) * forecast_scores.resolved_predictions + 1) / (forecast_scores.resolved_predictions + 1)
          ELSE (COALESCE(forecast_scores.accuracy_rate, 0) * forecast_scores.resolved_predictions) / (forecast_scores.resolved_predictions + 1)
        END,
        updated_at = now();
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER forecast_resolution_trigger
  AFTER UPDATE ON public.forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_forecast_scores();

-- Function to aggregate forecast probability from predictions
CREATE OR REPLACE FUNCTION public.update_forecast_probability(p_forecast_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_prob decimal;
  v_count int;
BEGIN
  SELECT AVG(probability), COUNT(*) INTO v_avg_prob, v_count
  FROM public.forecast_predictions
  WHERE forecast_id = p_forecast_id;
  
  UPDATE public.forecasts
  SET 
    current_probability = v_avg_prob,
    prediction_count = v_count,
    updated_at = now()
  WHERE id = p_forecast_id;
  
  -- Record history
  INSERT INTO public.forecast_history (forecast_id, probability, prediction_count)
  VALUES (p_forecast_id, v_avg_prob, v_count);
END;
$$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_domain ON public.organizations(domain);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_sso_providers_org ON public.sso_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_sessions_state ON public.sso_sessions(state);
CREATE INDEX IF NOT EXISTS idx_forecasts_category ON public.forecasts(category);
CREATE INDEX IF NOT EXISTS idx_forecasts_public ON public.forecasts(is_public, is_resolved);
CREATE INDEX IF NOT EXISTS idx_forecasts_creator ON public.forecasts(creator_id);
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_forecast ON public.forecast_predictions(forecast_id);
CREATE INDEX IF NOT EXISTS idx_forecast_predictions_user ON public.forecast_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_forecast_scores_rank ON public.forecast_scores(rank);
CREATE INDEX IF NOT EXISTS idx_forecast_scores_brier ON public.forecast_scores(brier_score);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_scores ENABLE ROW LEVEL SECURITY;

-- Organizations: members can view their org
CREATE POLICY org_select ON public.organizations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = id AND user_id = auth.uid())
    OR is_active = true -- Allow viewing active orgs for SSO routing
  );

-- SSO Providers: only org admins can view
CREATE POLICY sso_providers_select ON public.sso_providers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE organization_id = sso_providers.organization_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- Org Members: members can see other members
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id 
      AND om.user_id = auth.uid()
    )
  );

-- Forecasts: public forecasts visible to all, private only to creator
CREATE POLICY forecasts_select ON public.forecasts
  FOR SELECT USING (is_public = true OR creator_id = auth.uid());

-- Forecasts: only creator can modify
CREATE POLICY forecasts_modify ON public.forecasts
  FOR ALL USING (creator_id = auth.uid());

-- Predictions: users see their own, public predictions visible
CREATE POLICY predictions_select ON public.forecast_predictions
  FOR SELECT USING (user_id = auth.uid() OR is_public = true);

-- Predictions: users can manage their own
CREATE POLICY predictions_modify ON public.forecast_predictions
  FOR ALL USING (user_id = auth.uid());

-- Scores: public leaderboard
CREATE POLICY scores_select ON public.forecast_scores
  FOR SELECT USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_org_by_domain(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_forecast_probability(uuid) TO authenticated;
GRANT SELECT ON public.organizations TO authenticated;
GRANT SELECT ON public.forecasts TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forecast_predictions TO authenticated;
GRANT SELECT ON public.forecast_scores TO authenticated, anon;

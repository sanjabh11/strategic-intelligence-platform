-- Migration: Competition-Winning Innovations
-- Adds tables for Personal Life Coach, AI Mediator, Matching Markets, Cooperation Engine, Strategic DNA

-- ===========================================
-- INNOVATION #1: Personal Life Coach
-- ===========================================

CREATE TABLE IF NOT EXISTS life_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Decision details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('career', 'financial', 'relationship', 'health', 'purchase', 'conflict', 'other')),
  
  -- Game theory decomposition
  players JSONB NOT NULL DEFAULT '[]'::JSONB,
  strategies JSONB NOT NULL DEFAULT '{}'::JSONB,
  payoffs JSONB,
  information_structure TEXT,
  
  -- Bias detection
  detected_biases JSONB DEFAULT '[]'::JSONB, -- [{type, confidence, description}]
  debiasing_interventions JSONB DEFAULT '[]'::JSONB,
  
  -- Recommendations
  recommended_strategy JSONB,
  equilibria JSONB,
  expected_outcomes JSONB,
  confidence_score NUMERIC(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  
  -- Follow-up
  chosen_action TEXT,
  actual_outcome TEXT,
  outcome_quality_rating INTEGER CHECK (outcome_quality_rating BETWEEN 1 AND 5),
  
  -- Privacy
  anonymized BOOLEAN DEFAULT TRUE,
  shared_for_research BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_life_decisions_user ON life_decisions(user_id);
CREATE INDEX idx_life_decisions_category ON life_decisions(category);
CREATE INDEX idx_life_decisions_created ON life_decisions(created_at DESC);

-- ===========================================
-- INNOVATION #3: AI Conflict Mediator
-- ===========================================

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Parties (anonymous IDs)
  party_a_id TEXT NOT NULL, -- Can be anonymous hash
  party_b_id TEXT NOT NULL,
  
  -- Dispute details
  category TEXT CHECK (category IN ('landlord_tenant', 'workplace', 'family', 'neighbor', 'business', 'other')),
  description_a TEXT NOT NULL, -- Party A's perspective
  description_b TEXT NOT NULL, -- Party B's perspective
  
  -- Stakes
  monetary_value NUMERIC(12,2),
  non_monetary_issues JSONB DEFAULT '[]'::JSONB,
  
  -- Analysis
  identified_interests JSONB, -- Underlying interests for each party
  zopa JSONB, -- Zone of Possible Agreement
  batna_a JSONB, -- Best Alternative To Negotiated Agreement
  batna_b JSONB,
  
  -- Fair division mechanisms
  nash_bargaining_solution JSONB,
  vickrey_allocation JSONB,
  envy_free_division JSONB,
  
  -- Resolution
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_mediation', 'resolved', 'abandoned')),
  proposed_solutions JSONB DEFAULT '[]'::JSONB,
  accepted_solution JSONB,
  resolution_timestamp TIMESTAMPTZ,
  satisfaction_a INTEGER CHECK (satisfaction_a BETWEEN 1 AND 5),
  satisfaction_b INTEGER CHECK (satisfaction_b BETWEEN 1 AND 5),
  
  -- Metadata
  estimated_cost_without_mediation NUMERIC(10,2),
  actual_resolution_cost NUMERIC(10,2),
  time_to_resolution_hours INTEGER
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_category ON disputes(category);
CREATE INDEX idx_disputes_created ON disputes(created_at DESC);

-- ===========================================
-- INNOVATION #4: Matching Markets
-- ===========================================

CREATE TABLE IF NOT EXISTS matching_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Market type
  market_type TEXT CHECK (market_type IN ('skill_exchange', 'housing_swap', 'carpool', 'tool_sharing', 'mentorship', 'time_bank')),
  
  -- Offerings and needs
  offering JSONB NOT NULL, -- What they provide
  seeking JSONB NOT NULL, -- What they need
  
  -- Preferences
  preferences JSONB DEFAULT '{}'::JSONB, -- Ranking of acceptable matches
  constraints JSONB DEFAULT '{}'::JSONB, -- Hard constraints (location, time, etc.)
  
  -- Matching status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matched', 'inactive')),
  matched_with UUID[] DEFAULT ARRAY[]::UUID[],
  match_quality_score NUMERIC(3,2),
  
  -- Reputation
  reputation_score NUMERIC(3,2) DEFAULT 0.50,
  num_successful_matches INTEGER DEFAULT 0,
  num_failed_matches INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  market_type TEXT NOT NULL,
  participants UUID[] NOT NULL, -- Array of participant IDs in the match cycle
  
  -- Match details
  match_algorithm TEXT CHECK (match_algorithm IN ('gale_shapley', 'top_trading_cycles', 'serial_dictatorship', 'core_matching')),
  stability_score NUMERIC(3,2), -- How stable is this match
  is_pareto_efficient BOOLEAN,
  
  -- Execution
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'active', 'completed', 'failed')),
  completion_timestamp TIMESTAMPTZ,
  
  -- Value created
  estimated_value_created NUMERIC(10,2),
  participant_ratings JSONB, -- Each participant rates the match
  
  -- Metadata
  match_details JSONB -- Specific details per market type
);

CREATE INDEX idx_matching_participants_market ON matching_participants(market_type);
CREATE INDEX idx_matching_participants_status ON matching_participants(status);
CREATE INDEX idx_matches_market ON matches(market_type);
CREATE INDEX idx_matches_status ON matches(status);

-- ===========================================
-- INNOVATION #2: Cooperation Engine
-- ===========================================

CREATE TABLE IF NOT EXISTS cooperation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Campaign details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('climate', 'health', 'resource_conservation', 'public_goods', 'community')),
  
  -- Game structure
  game_type TEXT CHECK (game_type IN ('public_goods', 'commons', 'coordination', 'threshold')),
  target_participants INTEGER, -- How many needed for success
  current_participants INTEGER DEFAULT 0,
  
  -- Payoffs and impact
  individual_contribution_required JSONB, -- What each person must do
  individual_benefit JSONB, -- What each person gets
  collective_benefit JSONB, -- What everyone gets if threshold reached
  
  -- Mechanism design
  uses_conditional_commitment BOOLEAN DEFAULT FALSE,
  commitment_threshold INTEGER, -- "I'll do X if Y others commit"
  uses_reputation_system BOOLEAN DEFAULT FALSE,
  has_incentives JSONB,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'active', 'successful', 'failed')),
  deadline TIMESTAMPTZ,
  success_timestamp TIMESTAMPTZ,
  
  -- Impact measurement
  actual_impact_achieved JSONB,
  success_rate NUMERIC(3,2),
  
  -- Metadata
  shapley_values JSONB, -- Individual contributions to collective outcome
  tipping_point_analysis JSONB
);

CREATE TABLE IF NOT EXISTS campaign_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES cooperation_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  commitment_type TEXT CHECK (commitment_type IN ('unconditional', 'conditional')),
  conditional_threshold INTEGER, -- "I'll join if X others join"
  contribution_made JSONB,
  contribution_verified BOOLEAN DEFAULT FALSE,
  
  shapley_value NUMERIC(10,4), -- Individual's contribution to campaign success
  reputation_change NUMERIC(4,2),
  
  UNIQUE(campaign_id, user_id)
);

CREATE INDEX idx_cooperation_campaigns_category ON cooperation_campaigns(category);
CREATE INDEX idx_cooperation_campaigns_status ON cooperation_campaigns(status);
CREATE INDEX idx_campaign_participants_campaign ON campaign_participants(campaign_id);

-- ===========================================
-- INNOVATION #5: Strategic DNA
-- ===========================================

CREATE TABLE IF NOT EXISTS strategic_dna_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Assessment completion
  assessment_completed BOOLEAN DEFAULT FALSE,
  assessment_version TEXT DEFAULT 'v1.0',
  
  -- Bias scores (0-1, where 1 = highly biased)
  anchoring_bias NUMERIC(3,2),
  confirmation_bias NUMERIC(3,2),
  sunk_cost_fallacy NUMERIC(3,2),
  overconfidence NUMERIC(3,2),
  loss_aversion NUMERIC(3,2),
  status_quo_bias NUMERIC(3,2),
  availability_heuristic NUMERIC(3,2),
  hindsight_bias NUMERIC(3,2),
  planning_fallacy NUMERIC(3,2),
  fundamental_attribution_error NUMERIC(3,2),
  
  -- Additional biases (can add 15 more)
  additional_biases JSONB DEFAULT '{}'::JSONB,
  
  -- Strategic strengths
  negotiation_skill NUMERIC(3,2),
  probabilistic_thinking NUMERIC(3,2),
  long_term_planning NUMERIC(3,2),
  emotional_regulation NUMERIC(3,2),
  risk_calibration NUMERIC(3,2),
  
  -- Overall profile
  strategic_dna_signature TEXT, -- Unique fingerprint
  archetype TEXT, -- e.g., "Cautious Analyzer", "Bold Risk-Taker", etc.
  
  -- Improvement tracking
  bias_reduction_over_time JSONB DEFAULT '{}'::JSONB,
  decision_quality_trend JSONB DEFAULT '{}'::JSONB,
  
  -- Benchmarking
  percentile_ranking NUMERIC(3,2), -- vs other users
  num_decisions_tracked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS debiasing_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  decision_id UUID REFERENCES life_decisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Intervention details
  bias_detected TEXT NOT NULL,
  intervention_type TEXT CHECK (intervention_type IN ('warning', 'alternative_frame', 'base_rate', 'consider_opposite', 'checklist')),
  intervention_text TEXT NOT NULL,
  
  -- Effectiveness
  user_acknowledged BOOLEAN DEFAULT FALSE,
  user_changed_decision BOOLEAN,
  effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_strategic_dna_user ON strategic_dna_profiles(user_id);
CREATE INDEX idx_debiasing_interventions_user ON debiasing_interventions(user_id);
CREATE INDEX idx_debiasing_interventions_decision ON debiasing_interventions(decision_id);

-- ===========================================
-- Helper Functions
-- ===========================================

-- Calculate match quality between two participants
CREATE OR REPLACE FUNCTION calculate_match_quality(
  offering_a JSONB,
  seeking_a JSONB,
  offering_b JSONB,
  seeking_b JSONB
) RETURNS NUMERIC AS $$
DECLARE
  score NUMERIC := 0.0;
BEGIN
  -- Simple Jaccard similarity for now
  -- In production, use more sophisticated matching algorithm
  
  -- Check if A's offering matches B's seeking
  IF offering_a ? ANY(ARRAY(SELECT jsonb_array_elements_text(seeking_b))) THEN
    score := score + 0.5;
  END IF;
  
  -- Check if B's offering matches A's seeking
  IF offering_b ? ANY(ARRAY(SELECT jsonb_array_elements_text(seeking_a))) THEN
    score := score + 0.5;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Track decision outcome for learning
CREATE OR REPLACE FUNCTION log_decision_outcome(
  decision_id_param UUID,
  outcome_quality INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE life_decisions
  SET outcome_quality_rating = outcome_quality
  WHERE id = decision_id_param;
  
  -- Update user's Strategic DNA based on outcome
  -- (Simplified - in production, more sophisticated learning)
  UPDATE strategic_dna_profiles
  SET num_decisions_tracked = num_decisions_tracked + 1,
      last_updated = NOW()
  WHERE user_id = (SELECT user_id FROM life_decisions WHERE id = decision_id_param);
END;
$$ LANGUAGE plpgsql;

-- Calculate Shapley value for cooperation campaign participant
CREATE OR REPLACE FUNCTION calculate_shapley_value(
  campaign_id_param UUID,
  participant_id_param UUID
) RETURNS NUMERIC AS $$
DECLARE
  total_participants INTEGER;
  shapley_val NUMERIC := 0.0;
BEGIN
  SELECT current_participants INTO total_participants
  FROM cooperation_campaigns
  WHERE id = campaign_id_param;
  
  -- Simplified Shapley value calculation
  -- In production, use proper marginal contribution calculation
  IF total_participants > 0 THEN
    shapley_val := 1.0 / total_participants;
  END IF;
  
  RETURN shapley_val;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Row-Level Security (RLS)
-- ===========================================

ALTER TABLE life_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooperation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_dna_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE debiasing_interventions ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY "Users can view own life decisions"
  ON life_decisions FOR SELECT
  USING (user_id = auth.uid() OR anonymized = TRUE);

CREATE POLICY "Users can insert own life decisions"
  ON life_decisions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own life decisions"
  ON life_decisions FOR UPDATE
  USING (user_id = auth.uid());

-- Strategic DNA policies
CREATE POLICY "Users can view own DNA profile"
  ON strategic_dna_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own DNA profile"
  ON strategic_dna_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own DNA profile"
  ON strategic_dna_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Disputes are visible to parties involved (using anonymous IDs)
-- In production, implement proper authentication for anonymous parties

-- Matching participants can see others in same market
CREATE POLICY "Users can view matching participants in same market"
  ON matching_participants FOR SELECT
  USING (market_type IS NOT NULL);

CREATE POLICY "Users can insert own matching profile"
  ON matching_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own matching profile"
  ON matching_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Cooperation campaigns are public
CREATE POLICY "Anyone can view cooperation campaigns"
  ON cooperation_campaigns FOR SELECT
  USING (true);

CREATE POLICY "Anyone can join campaigns"
  ON campaign_participants FOR INSERT
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON life_decisions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON disputes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON matching_participants TO anon, authenticated;
GRANT SELECT ON matches TO anon, authenticated;
GRANT SELECT ON cooperation_campaigns TO anon, authenticated;
GRANT SELECT, INSERT ON campaign_participants TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON strategic_dna_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON debiasing_interventions TO anon, authenticated;

-- Create views for analytics (anonymized)
CREATE OR REPLACE VIEW decision_analytics AS
SELECT 
  category,
  COUNT(*) as total_decisions,
  AVG(confidence_score) as avg_confidence,
  AVG(outcome_quality_rating) as avg_outcome_quality,
  jsonb_agg(DISTINCT detected_biases) as common_biases
FROM life_decisions
WHERE anonymized = TRUE
GROUP BY category;

CREATE OR REPLACE VIEW dispute_resolution_stats AS
SELECT
  category,
  COUNT(*) as total_disputes,
  AVG(time_to_resolution_hours) as avg_resolution_time,
  AVG((satisfaction_a + satisfaction_b) / 2.0) as avg_satisfaction,
  AVG(estimated_cost_without_mediation - COALESCE(actual_resolution_cost, 0)) as avg_cost_savings
FROM disputes
WHERE status = 'resolved'
GROUP BY category;

GRANT SELECT ON decision_analytics TO anon, authenticated;
GRANT SELECT ON dispute_resolution_stats TO anon, authenticated;

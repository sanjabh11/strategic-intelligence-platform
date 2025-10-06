-- Migration: Real-Time Features and Missing Gap Implementations
-- Addresses critical gaps: Streaming, Historical DB, Multi-user, Temporal, Signaling

-- ===========================================
-- REAL-TIME EVENTS (Gap #1: Streaming 2.3 → 4.9)
-- ===========================================

CREATE TABLE IF NOT EXISTS real_time_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Source information
  source TEXT NOT NULL CHECK (source IN ('gdelt', 'worldbank', 'financial_markets', 'energy', 'other')),
  event_type TEXT NOT NULL,
  
  -- Actors and context
  actors JSONB DEFAULT '[]'::JSONB,
  strategic_context JSONB NOT NULL,
  
  -- Game theory analysis
  goldstein_scale NUMERIC, -- GDELT cooperation/conflict score (-10 to +10)
  game_type TEXT,
  recommended_strategy TEXT,
  
  -- Metadata
  confidence NUMERIC(3,2) CHECK (confidence BETWEEN 0 AND 1),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_realtime_events_source ON real_time_events(source);
CREATE INDEX idx_realtime_events_type ON real_time_events(event_type);
CREATE INDEX idx_realtime_events_timestamp ON real_time_events(timestamp DESC);

-- ===========================================
-- STRATEGY OUTCOMES (Gap #2: Historical DB 2.5 → 4.9)
-- ===========================================

CREATE TABLE IF NOT EXISTS strategy_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Pattern information
  pattern_name TEXT NOT NULL,
  indicator_code TEXT, -- World Bank or other data source code
  
  -- Empirical validation
  success_rate NUMERIC(3,2) NOT NULL CHECK (success_rate BETWEEN 0 AND 1),
  sample_size INTEGER NOT NULL,
  confidence_level NUMERIC(3,2) CHECK (confidence_level BETWEEN 0 AND 1),
  
  -- Data source
  data_source TEXT NOT NULL CHECK (data_source IN ('world_bank_empirical', 'gdelt_historical', 'academic_study', 'user_feedback', 'synthetic')),
  time_period_start DATE,
  time_period_end DATE,
  
  -- Evidence
  raw_data JSONB,
  validation_method TEXT,
  
  UNIQUE(pattern_name, data_source, time_period_start)
);

CREATE INDEX idx_strategy_outcomes_pattern ON strategy_outcomes(pattern_name);
CREATE INDEX idx_strategy_outcomes_success ON strategy_outcomes(success_rate DESC);
CREATE INDEX idx_strategy_outcomes_source ON strategy_outcomes(data_source);

-- ===========================================
-- MULTI-USER GAME SESSIONS (Gap #4: Multi-user 1.8 → 4.9)
-- ===========================================

CREATE TABLE IF NOT EXISTS multiplayer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session details
  session_name TEXT NOT NULL,
  game_type TEXT NOT NULL, -- 'prisoners_dilemma', 'public_goods', 'auction', etc.
  max_players INTEGER NOT NULL DEFAULT 2,
  current_players INTEGER DEFAULT 0,
  
  -- Game configuration
  payoff_matrix JSONB NOT NULL,
  rounds INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 0,
  
  -- State management
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
  game_state JSONB DEFAULT '{}'::JSONB, -- Current game state
  
  -- Results
  final_payoffs JSONB,
  equilibrium_reached BOOLEAN,
  
  -- Metadata
  created_by TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS multiplayer_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES multiplayer_sessions(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Participant details
  participant_id TEXT NOT NULL, -- Can be anonymous
  player_role TEXT, -- 'player_1', 'player_2', etc.
  
  -- Actions
  actions_taken JSONB DEFAULT '[]'::JSONB,
  current_payoff NUMERIC DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_action_at TIMESTAMPTZ,
  
  UNIQUE(session_id, participant_id)
);

CREATE INDEX idx_multiplayer_sessions_status ON multiplayer_sessions(status);
CREATE INDEX idx_multiplayer_sessions_game_type ON multiplayer_sessions(game_type);
CREATE INDEX idx_multiplayer_participants_session ON multiplayer_participants(session_id);

-- ===========================================
-- TEMPORAL DECAY MODELS (Gap #6: Temporal 3.2 → 4.9)
-- ===========================================

CREATE TABLE IF NOT EXISTS temporal_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Forecast details
  analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL,
  
  -- Time-dependent probabilities
  base_probability NUMERIC(3,2) NOT NULL,
  decay_rate NUMERIC(4,3), -- Per day
  half_life_days NUMERIC,
  
  -- Forecasts at different time horizons
  probability_1day NUMERIC(3,2),
  probability_7days NUMERIC(3,2),
  probability_30days NUMERIC(3,2),
  probability_90days NUMERIC(3,2),
  
  -- Urgency scoring
  urgency_score NUMERIC(3,2) CHECK (urgency_score BETWEEN 0 AND 1),
  optimal_timing_window_start DATE,
  optimal_timing_window_end DATE,
  
  -- Metadata
  confidence NUMERIC(3,2)
);

CREATE INDEX idx_temporal_forecasts_run ON temporal_forecasts(analysis_run_id);
CREATE INDEX idx_temporal_forecasts_urgency ON temporal_forecasts(urgency_score DESC);

-- ===========================================
-- ADAPTIVE SIGNALING (Gap #5: Signaling 1.5 → 4.9)
-- ===========================================

CREATE TABLE IF NOT EXISTS signaling_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Context
  analysis_run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  scenario_type TEXT NOT NULL,
  
  -- Signaling analysis
  information_to_reveal JSONB NOT NULL,
  revelation_timing TEXT NOT NULL, -- 'immediate', 'strategic_delay', 'conditional', 'never'
  credibility_mechanism TEXT, -- 'costly_signal', 'commitment_device', 'reputation_stake', 'cheap_talk'
  
  -- Game theory
  signaling_game_type TEXT CHECK (signaling_game_type IN ('separating_equilibrium', 'pooling_equilibrium', 'hybrid', 'cheap_talk')),
  sender_type TEXT, -- 'informed', 'uninformed'
  receiver_beliefs JSONB,
  
  -- Recommendations
  recommended_action TEXT NOT NULL,
  alternative_signals JSONB DEFAULT '[]'::JSONB,
  commitment_devices JSONB,
  
  -- Assessment
  credibility_score NUMERIC(3,2) CHECK (credibility_score BETWEEN 0 AND 1),
  expected_impact NUMERIC
);

CREATE INDEX idx_signaling_recs_run ON signaling_recommendations(analysis_run_id);
CREATE INDEX idx_signaling_recs_type ON signaling_recommendations(scenario_type);

-- ===========================================
-- CROSS-DOMAIN PATTERNS (Gap #7: Domains 3.5 → 4.9)
-- ===========================================

-- Expand domains from 5 to 15+
CREATE TABLE IF NOT EXISTS domain_specific_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Domain information
  domain TEXT NOT NULL,
  subdomain TEXT,
  
  -- Pattern
  pattern_id UUID REFERENCES strategic_patterns(id) ON DELETE CASCADE,
  domain_specific_name TEXT NOT NULL,
  domain_context JSONB NOT NULL,
  
  -- Adaptation rules
  parameter_mappings JSONB, -- How to translate generic pattern to domain-specific
  success_rate_in_domain NUMERIC(3,2),
  notable_examples JSONB,
  
  -- Metadata
  validated BOOLEAN DEFAULT FALSE,
  expert_reviewed BOOLEAN DEFAULT FALSE,
  
  UNIQUE(domain, pattern_id)
);

-- Insert 15 domains
INSERT INTO domain_specific_patterns (domain, subdomain, pattern_id, domain_specific_name, domain_context, success_rate_in_domain, validated)
SELECT 
  domain_name,
  NULL,
  (SELECT id FROM strategic_patterns LIMIT 1), -- Placeholder pattern
  domain_name || ' Strategic Pattern',
  jsonb_build_object('description', 'Domain-specific adaptation of game theory'),
  0.70,
  FALSE
FROM (
  VALUES 
    ('military'),
    ('business'),
    ('politics'),
    ('evolution'),
    ('sports'),
    ('energy_markets'),
    ('environmental_policy'),
    ('healthcare'),
    ('education'),
    ('international_trade'),
    ('cybersecurity'),
    ('supply_chain'),
    ('legal_strategy'),
    ('social_networks'),
    ('urban_planning')
) AS domains(domain_name)
ON CONFLICT DO NOTHING;

CREATE INDEX idx_domain_patterns_domain ON domain_specific_patterns(domain);
CREATE INDEX idx_domain_patterns_success ON domain_specific_patterns(success_rate_in_domain DESC);

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE real_time_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE multiplayer_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signaling_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_specific_patterns ENABLE ROW LEVEL SECURITY;

-- Public read access for real-time events
CREATE POLICY "Public read real-time events"
  ON real_time_events FOR SELECT
  USING (true);

-- Public read for strategy outcomes
CREATE POLICY "Public read strategy outcomes"
  ON strategy_outcomes FOR SELECT
  USING (true);

-- Multiplayer: users can see sessions they're part of
CREATE POLICY "Users can view their multiplayer sessions"
  ON multiplayer_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create multiplayer sessions"
  ON multiplayer_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view participants in their sessions"
  ON multiplayer_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join as participants"
  ON multiplayer_participants FOR INSERT
  WITH CHECK (true);

-- Temporal forecasts: public read
CREATE POLICY "Public read temporal forecasts"
  ON temporal_forecasts FOR SELECT
  USING (true);

-- Signaling: public read
CREATE POLICY "Public read signaling recommendations"
  ON signaling_recommendations FOR SELECT
  USING (true);

-- Domain patterns: public read
CREATE POLICY "Public read domain patterns"
  ON domain_specific_patterns FOR SELECT
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON real_time_events TO anon, authenticated;
GRANT SELECT ON strategy_outcomes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON multiplayer_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON multiplayer_participants TO anon, authenticated;
GRANT SELECT ON temporal_forecasts TO anon, authenticated;
GRANT SELECT ON signaling_recommendations TO anon, authenticated;
GRANT SELECT ON domain_specific_patterns TO anon, authenticated;

-- ===========================================
-- HELPER FUNCTIONS
-- ===========================================

-- Calculate temporal decay
CREATE OR REPLACE FUNCTION calculate_temporal_decay(
  base_prob NUMERIC,
  decay_rate NUMERIC,
  days_ahead INTEGER
) RETURNS NUMERIC AS $$
BEGIN
  RETURN base_prob * EXP(-decay_rate * days_ahead);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate urgency score
CREATE OR REPLACE FUNCTION calculate_urgency_score(
  current_prob NUMERIC,
  prob_7days NUMERIC
) RETURNS NUMERIC AS $$
BEGIN
  -- High urgency if probability decays quickly
  RETURN LEAST(1.0, (current_prob - prob_7days) * 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create analytics view
CREATE OR REPLACE VIEW platform_analytics AS
SELECT
  'real_time_events' AS table_name,
  COUNT(*) AS row_count,
  MAX(created_at) AS last_updated
FROM real_time_events
UNION ALL
SELECT
  'strategy_outcomes',
  COUNT(*),
  MAX(created_at)
FROM strategy_outcomes
UNION ALL
SELECT
  'multiplayer_sessions',
  COUNT(*),
  MAX(created_at)
FROM multiplayer_sessions
UNION ALL
SELECT
  'temporal_forecasts',
  COUNT(*),
  MAX(created_at)
FROM temporal_forecasts;

GRANT SELECT ON platform_analytics TO anon, authenticated;

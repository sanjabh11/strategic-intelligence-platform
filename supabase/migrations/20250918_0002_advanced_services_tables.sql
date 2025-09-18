-- Migration: Advanced Strategic Services Tables
-- Creates tables for all new PRD-compliant services

-- Strategy Success Analysis Table
CREATE TABLE IF NOT EXISTS strategy_success_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    strategy_pattern TEXT NOT NULL,
    analysis_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strategy Outcomes Table (for historical tracking)
CREATE TABLE IF NOT EXISTS strategy_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    strategy_pattern TEXT NOT NULL,
    scenario_context JSONB NOT NULL DEFAULT '{}',
    implementation_details JSONB NOT NULL DEFAULT '{}',
    measured_outcome JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scale Invariant Adaptations Table
CREATE TABLE IF NOT EXISTS scale_invariant_adaptations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    source_template TEXT NOT NULL,
    target_domain TEXT NOT NULL,
    source_scale INTEGER NOT NULL,
    target_scale INTEGER NOT NULL,
    adaptation_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Temporal Optimization Results Table
CREATE TABLE IF NOT EXISTS temporal_optimization_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    optimization_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outcome Forecasting Results Table
CREATE TABLE IF NOT EXISTS outcome_forecasting_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    forecasting_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dynamic Recalibration Results Table
CREATE TABLE IF NOT EXISTS dynamic_recalibration_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    recalibration_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cross Domain Transfer Results Table
CREATE TABLE IF NOT EXISTS cross_domain_transfer_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    source_domain TEXT NOT NULL,
    target_domain TEXT NOT NULL,
    transfer_results JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Third Party Noise Detection Table (for monitoring)
CREATE TABLE IF NOT EXISTS third_party_noise (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT,
    detected_patterns TEXT NOT NULL,
    raw_sample TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monitoring Alerts Table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for all new tables
ALTER TABLE strategy_success_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategy_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scale_invariant_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporal_optimization_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_forecasting_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_recalibration_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_domain_transfer_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_party_noise ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- Create read policies for anonymous users
DO $$
BEGIN
  -- Strategy Success Analysis
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_success_analysis' AND policyname = 'read_anon_success_analysis') THEN
    CREATE POLICY read_anon_success_analysis ON strategy_success_analysis FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_success_analysis' AND policyname = 'insert_anon_success_analysis') THEN
    CREATE POLICY insert_anon_success_analysis ON strategy_success_analysis FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Strategy Outcomes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_outcomes' AND policyname = 'read_anon_outcomes') THEN
    CREATE POLICY read_anon_outcomes ON strategy_outcomes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'strategy_outcomes' AND policyname = 'insert_anon_outcomes') THEN
    CREATE POLICY insert_anon_outcomes ON strategy_outcomes FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Scale Invariant Adaptations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scale_invariant_adaptations' AND policyname = 'read_anon_adaptations') THEN
    CREATE POLICY read_anon_adaptations ON scale_invariant_adaptations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scale_invariant_adaptations' AND policyname = 'insert_anon_adaptations') THEN
    CREATE POLICY insert_anon_adaptations ON scale_invariant_adaptations FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Temporal Optimization Results
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'temporal_optimization_results' AND policyname = 'read_anon_temporal') THEN
    CREATE POLICY read_anon_temporal ON temporal_optimization_results FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'temporal_optimization_results' AND policyname = 'insert_anon_temporal') THEN
    CREATE POLICY insert_anon_temporal ON temporal_optimization_results FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Outcome Forecasting Results
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outcome_forecasting_results' AND policyname = 'read_anon_forecasting') THEN
    CREATE POLICY read_anon_forecasting ON outcome_forecasting_results FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outcome_forecasting_results' AND policyname = 'insert_anon_forecasting') THEN
    CREATE POLICY insert_anon_forecasting ON outcome_forecasting_results FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Dynamic Recalibration Results
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dynamic_recalibration_results' AND policyname = 'read_anon_recalibration') THEN
    CREATE POLICY read_anon_recalibration ON dynamic_recalibration_results FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dynamic_recalibration_results' AND policyname = 'insert_anon_recalibration') THEN
    CREATE POLICY insert_anon_recalibration ON dynamic_recalibration_results FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Cross Domain Transfer Results
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cross_domain_transfer_results' AND policyname = 'read_anon_transfer') THEN
    CREATE POLICY read_anon_transfer ON cross_domain_transfer_results FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cross_domain_transfer_results' AND policyname = 'insert_anon_transfer') THEN
    CREATE POLICY insert_anon_transfer ON cross_domain_transfer_results FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Third Party Noise (monitoring only)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'third_party_noise' AND policyname = 'read_anon_noise') THEN
    CREATE POLICY read_anon_noise ON third_party_noise FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'third_party_noise' AND policyname = 'insert_anon_noise') THEN
    CREATE POLICY insert_anon_noise ON third_party_noise FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;

  -- Monitoring Alerts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monitoring_alerts' AND policyname = 'read_anon_alerts') THEN
    CREATE POLICY read_anon_alerts ON monitoring_alerts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'monitoring_alerts' AND policyname = 'insert_anon_alerts') THEN
    CREATE POLICY insert_anon_alerts ON monitoring_alerts FOR INSERT WITH CHECK (auth.role() = 'anon');
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategy_success_run_id ON strategy_success_analysis(run_id);
CREATE INDEX IF NOT EXISTS idx_strategy_success_pattern ON strategy_success_analysis(strategy_pattern);
CREATE INDEX IF NOT EXISTS idx_strategy_success_created ON strategy_success_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_strategy_outcomes_pattern ON strategy_outcomes(strategy_pattern);
CREATE INDEX IF NOT EXISTS idx_strategy_outcomes_created ON strategy_outcomes(created_at);

CREATE INDEX IF NOT EXISTS idx_scale_adaptations_run_id ON scale_invariant_adaptations(run_id);
CREATE INDEX IF NOT EXISTS idx_scale_adaptations_template ON scale_invariant_adaptations(source_template);
CREATE INDEX IF NOT EXISTS idx_scale_adaptations_domains ON scale_invariant_adaptations(source_scale, target_scale);

CREATE INDEX IF NOT EXISTS idx_temporal_optimization_run_id ON temporal_optimization_results(run_id);
CREATE INDEX IF NOT EXISTS idx_temporal_optimization_created ON temporal_optimization_results(created_at);

CREATE INDEX IF NOT EXISTS idx_outcome_forecasting_run_id ON outcome_forecasting_results(run_id);
CREATE INDEX IF NOT EXISTS idx_outcome_forecasting_created ON outcome_forecasting_results(created_at);

CREATE INDEX IF NOT EXISTS idx_dynamic_recalibration_run_id ON dynamic_recalibration_results(run_id);
CREATE INDEX IF NOT EXISTS idx_dynamic_recalibration_created ON dynamic_recalibration_results(created_at);

CREATE INDEX IF NOT EXISTS idx_cross_domain_transfer_run_id ON cross_domain_transfer_results(run_id);
CREATE INDEX IF NOT EXISTS idx_cross_domain_transfer_domains ON cross_domain_transfer_results(source_domain, target_domain);
CREATE INDEX IF NOT EXISTS idx_cross_domain_transfer_created ON cross_domain_transfer_results(created_at);

CREATE INDEX IF NOT EXISTS idx_third_party_noise_timestamp ON third_party_noise(timestamp);
CREATE INDEX IF NOT EXISTS idx_third_party_noise_patterns ON third_party_noise USING gin(to_tsvector('english', detected_patterns));

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON monitoring_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created ON monitoring_alerts(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_strategy_outcomes_pattern_created ON strategy_outcomes(strategy_pattern, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status_severity ON monitoring_alerts(status, severity) WHERE status = 'active';

-- Add JSONB indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_strategy_success_results_gin ON strategy_success_analysis USING gin(analysis_results);
CREATE INDEX IF NOT EXISTS idx_scale_adaptations_results_gin ON scale_invariant_adaptations USING gin(adaptation_results);
CREATE INDEX IF NOT EXISTS idx_temporal_optimization_results_gin ON temporal_optimization_results USING gin(optimization_results);
CREATE INDEX IF NOT EXISTS idx_outcome_forecasting_results_gin ON outcome_forecasting_results USING gin(forecasting_results);
CREATE INDEX IF NOT EXISTS idx_dynamic_recalibration_results_gin ON dynamic_recalibration_results USING gin(recalibration_results);
CREATE INDEX IF NOT EXISTS idx_cross_domain_transfer_results_gin ON cross_domain_transfer_results USING gin(transfer_results);

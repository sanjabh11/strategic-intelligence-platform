-- Migration: Information Value Analysis Table
-- Supports EVPI calculations and information optimization

CREATE TABLE IF NOT EXISTS information_value_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
    ev_prior NUMERIC NOT NULL,
    evpi_value NUMERIC NOT NULL,
    optimal_strategy JSONB NOT NULL DEFAULT '{}',
    sensitivity_metrics JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE information_value_analysis ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY read_anon_info_value ON information_value_analysis FOR SELECT USING (true);
CREATE POLICY insert_anon_info_value ON information_value_analysis FOR INSERT WITH CHECK (auth.role() = 'anon');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_info_value_run_id ON information_value_analysis(run_id);
CREATE INDEX IF NOT EXISTS idx_info_value_evpi ON information_value_analysis(evpi_value);
CREATE INDEX IF NOT EXISTS idx_info_value_created ON information_value_analysis(created_at);

-- Monetization Features Database Support
-- Adds tables for Monte Carlo simulations, trading signals, and weighted consensus

-- Monte Carlo Simulation Results
CREATE TABLE IF NOT EXISTS monte_carlo_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES analysis_runs(id) ON DELETE CASCADE,
  iterations INTEGER NOT NULL,
  time_horizon INTEGER NOT NULL,
  initial_price DECIMAL(12, 2) NOT NULL,
  price_distribution JSONB NOT NULL,
  aggregate_metrics JSONB NOT NULL,
  dominant_strategy TEXT,
  stability_score DECIMAL(4, 3),
  confidence_interval JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trading Signals Log
CREATE TABLE IF NOT EXISTS trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset TEXT NOT NULL,
  signal TEXT NOT NULL CHECK (signal IN ('BUY', 'SELL', 'HOLD')),
  strength TEXT NOT NULL CHECK (strength IN ('STRONG', 'MODERATE', 'WEAK')),
  confidence DECIMAL(4, 3),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'EXTREME')),
  game_type TEXT,
  rationale JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monte_carlo_run_id ON monte_carlo_simulations(run_id);
CREATE INDEX IF NOT EXISTS idx_monte_carlo_created ON monte_carlo_simulations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trading_signals_asset ON trading_signals(asset);
CREATE INDEX IF NOT EXISTS idx_trading_signals_created ON trading_signals(created_at DESC);

-- Enable RLS
ALTER TABLE monte_carlo_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access, authenticated users read own)
CREATE POLICY "Service role full access to monte_carlo" ON monte_carlo_simulations
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to trading_signals" ON trading_signals
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add subscription tier columns for Whop alignment if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_limits' AND column_name = 'monte_carlo_iterations'
  ) THEN
    ALTER TABLE tier_limits ADD COLUMN monte_carlo_iterations INTEGER DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_limits' AND column_name = 'has_signal_access'
  ) THEN
    ALTER TABLE tier_limits ADD COLUMN has_signal_access BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tier_limits' AND column_name = 'has_marketplace_access'
  ) THEN
    ALTER TABLE tier_limits ADD COLUMN has_marketplace_access BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

-- Update tier limits with monetization feature access
UPDATE tier_limits SET 
  monte_carlo_iterations = 100,
  has_signal_access = FALSE,
  has_marketplace_access = FALSE
WHERE tier_name = 'free' OR tier_name = 'basic';

UPDATE tier_limits SET 
  monte_carlo_iterations = 1000,
  has_signal_access = FALSE,
  has_marketplace_access = TRUE
WHERE tier_name = 'analyst' OR tier_name = 'pro';

UPDATE tier_limits SET 
  monte_carlo_iterations = 10000,
  has_signal_access = TRUE,
  has_marketplace_access = TRUE
WHERE tier_name = 'enterprise' OR tier_name = 'elite';

-- Grant necessary permissions
GRANT SELECT, INSERT ON monte_carlo_simulations TO authenticated;
GRANT SELECT, INSERT ON trading_signals TO authenticated;

-- Migration: Observability and Error Logging Tables
-- Creates tables referenced by analyze-engine for noise logging, alerts, and RPC errors

-- third_party_noise: logs external/browser/extension noise patterns detected in LLM responses
CREATE TABLE IF NOT EXISTS public.third_party_noise (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  detected_patterns text,       -- serialized list of patterns
  raw_sample text,              -- excerpt from raw payload (<=500 chars expected)
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE public.third_party_noise ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_third_party_noise ON public.third_party_noise FOR SELECT USING (true);

-- monitoring_alerts: persistent dashboard alerts raised by edge functions
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved'))
);

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_monitoring_alerts ON public.monitoring_alerts FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status ON public.monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON public.monitoring_alerts(alert_type);

-- rpc_errors: captures structured errors from edge functions and RPCs
CREATE TABLE IF NOT EXISTS public.rpc_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text,
  error_id text,
  error_message text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.rpc_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS read_rpc_errors ON public.rpc_errors FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_rpc_errors_created ON public.rpc_errors(created_at DESC);

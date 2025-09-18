-- Migration: Add collective_aggregates table for User Story 9
-- As per Ph2.md specifications

CREATE TABLE IF NOT EXISTS public.collective_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  bucket_key TEXT NOT NULL,
  noisy_value NUMERIC,
  dp_epsilon NUMERIC,
  user_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collective_aggregates_metric ON public.collective_aggregates (metric_key);
CREATE INDEX IF NOT EXISTS idx_collective_aggregates_bucket ON public.collective_aggregates (bucket_key);

-- RLS
ALTER TABLE public.collective_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY read_anon_aggregates ON public.collective_aggregates FOR SELECT USING (true);
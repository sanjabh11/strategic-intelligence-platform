-- Migration: Add retrieval_cache table as specified in Ph4.md
-- Creates the exact table structure from the implementation plan

CREATE TABLE IF NOT EXISTS public.retrieval_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  source text NOT NULL,
  url text,
  snippet text,
  score numeric,
  retrieved_at timestamptz DEFAULT now(),
  ttl timestamptz DEFAULT now() + INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_retrieval_cache_query_hash ON public.retrieval_cache (query_hash);

-- Add circuit_breaker table for API failure handling
CREATE TABLE IF NOT EXISTS public.circuit_breaker (
  id serial PRIMARY KEY,
  service_name text UNIQUE,
  state text CHECK (state IN ('closed', 'open', 'half')),
  fail_count int DEFAULT 0,
  last_failure timestamptz
);

-- RLS policies
ALTER TABLE public.retrieval_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY read_retrieval_cache ON public.retrieval_cache FOR SELECT USING (true);
CREATE POLICY read_circuit_breaker ON public.circuit_breaker FOR SELECT USING (true);
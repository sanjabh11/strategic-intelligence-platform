-- Initial schema for Strategic Intelligence Platform
-- Enables pgvector and creates core tables for analysis indexing

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Analysis runs
CREATE TABLE IF NOT EXISTS analysis_runs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_text      TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_time_ms INTEGER,
  stability_score    DOUBLE PRECISION
);

-- Feature vectors for similarity search (dimension 128)
CREATE TABLE IF NOT EXISTS analysis_features (
  run_id   UUID PRIMARY KEY REFERENCES analysis_runs(id) ON DELETE CASCADE,
  features VECTOR(128)
);

-- Patterns catalog
CREATE TABLE IF NOT EXISTS patterns (
  id          TEXT PRIMARY KEY,
  description TEXT
);

-- Vector index (adjust lists based on data volume)
CREATE INDEX IF NOT EXISTS idx_analysis_features_ivfflat ON analysis_features USING ivfflat (features vector_l2_ops) WITH (lists = 100);

-- RLS policies (public read, restrict writes)
ALTER TABLE analysis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (adjust for your env)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_runs' AND policyname = 'read_anon_runs'
  ) THEN
    CREATE POLICY read_anon_runs ON analysis_runs FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_features' AND policyname = 'read_anon_features'
  ) THEN
    CREATE POLICY read_anon_features ON analysis_features FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'patterns' AND policyname = 'read_anon_patterns'
  ) THEN
    CREATE POLICY read_anon_patterns ON patterns FOR SELECT USING (true);
  END IF;
END$$;

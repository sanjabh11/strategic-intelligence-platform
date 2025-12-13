-- Migration: Add provenance binding columns to analysis_runs
-- Adds reviewer_id, review_notes, approved_at for human review workflow

ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.analysis_runs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add index for reviewer_id for performance on human reviews
CREATE INDEX IF NOT EXISTS idx_analysis_runs_reviewer_id ON public.analysis_runs (reviewer_id);
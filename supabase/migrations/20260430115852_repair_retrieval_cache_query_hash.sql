-- Repair remote drift where retrieval_cache existed without query_hash.
-- This keeps local and remote migration history aligned after management-API repair.

ALTER TABLE IF EXISTS public.retrieval_cache
  ADD COLUMN IF NOT EXISTS query_hash text;

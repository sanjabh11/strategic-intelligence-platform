-- Repair remote drift where strategy_outcomes exists in an older shape.
-- Add the later strategy_pattern column and backfill from pattern_name.

ALTER TABLE IF EXISTS public.strategy_outcomes
  ADD COLUMN IF NOT EXISTS strategy_pattern text;

UPDATE public.strategy_outcomes
SET strategy_pattern = COALESCE(strategy_pattern, pattern_name)
WHERE strategy_pattern IS NULL;

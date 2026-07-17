-- Allow business decisions in the personal life coach decision journal.
-- The strategist surface already uses business negotiations as a primary
-- scenario class, so the storage constraint must admit that category.

alter table if exists public.life_decisions
  drop constraint if exists life_decisions_category_check;

alter table if exists public.life_decisions
  add constraint life_decisions_category_check
  check (
    category in (
      'career',
      'financial',
      'relationship',
      'health',
      'purchase',
      'conflict',
      'business',
      'other'
    )
  );

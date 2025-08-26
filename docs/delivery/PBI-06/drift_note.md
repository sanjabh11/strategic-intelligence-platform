# PBI-06: Schema Drift Note (MVP Freeze)

- Timestamp: 2025-08-26T19:43:30+05:30
- Project ref: jxdihzqoaxtydolmltdr
- Environment: Supabase (hosted), Edge Functions (Deno), supabase-js v2

## Summary
Remote database schema differs from local migration files under `supabase/migrations/`. Earlier attempts to `supabase db push` encountered drift and were paused to prevent breaking a live environment. For MVP, we have frozen migrations and enabled persistence via Edge Functions using the server-side Service Role secret.

## Observations
- Remote table `public.analysis_runs` contains at least: `id`, `request_id`, `schema_version`, `status`, `model`, `analysis_json`, timestamps and other optional fields (evidence from REST select).
- Local migrations define overlapping but not identical structures. Pushing would risk conflicts.
- RLS: anon read-only is in effect; writes use Service Role key set as an Edge Functions secret (`EDGE_SUPABASE_SERVICE_ROLE_KEY`).

## Decision
- Freeze further DB migrations during MVP. Avoid `supabase db push` until a planned alignment.
- Edge Functions persist with the Service Role key only (no client exposure).
- MVP anon INSERT policies are available in `supabase/sql/0003_mvp_anon_insert.sql` but are not applied because Service Role writes are working.

## Temporary Implementation Notes
- `supabase/functions/analyze-engine/index.ts` inserts a payload compatible with the remote schema:
  - `request_id`, `schema_version`, `status`, `model`, `analysis_json` (with minimal retry using only `analysis_json`).
- `supabase/functions/system-status/index.ts` verifies read access and exposes counts.

## Remediation Plan (Post-MVP)
1) Export authoritative remote schema (tables, types, RLS) from Supabase.
2) Author a new baseline migration or a repair migration set to bring local files in sync.
3) Validate on a staging project; then apply to production during a maintenance window.
4) Remove any MVP-only policies if applied and tighten RLS for production.

## Risks
- Continuing to modify schema without alignment can create additional drift.
- Production RLS must be re-validated after repair to prevent privilege creep.

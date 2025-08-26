# PBI-06: Decision Log

- Timestamp: 2025-08-26T19:51:00+05:30
- Project ref: jxdihzqoaxtydolmltdr

## Decision: Do not apply MVP anon INSERT RLS policy

- Context: Service Role writes from Edge Functions are working. `system-status` runs_count increased (175 → 176).
- Option considered: Apply temporary anon INSERT policies from `supabase/sql/0003_mvp_anon_insert.sql`.
- Decision: Not applied for MVP to reduce security surface area. Persistence uses Service Role via server-side secret `EDGE_SUPABASE_SERVICE_ROLE_KEY`.
- Evidence: See `test_evidence.md` for successful write verification.
- Impact: No schema/policy change required for MVP; migrations remain frozen per `drift_note.md`.

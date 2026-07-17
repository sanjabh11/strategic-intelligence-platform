# RLS Acceptance Test Plan - identity_and_review - 2026-06-06

## Decision

Commercial security status: `acceptance_tests_planned_not_executed`.

This is a static acceptance-test plan and pgTAP template for the first RLS approval batch. It does not apply policy changes, start Supabase, connect to hosted Supabase, or prove deployed RLS behavior.

## Summary

| Metric | Count |
|---|---:|
| Tables in batch | 5 |
| P1 tables | 5 |
| Personas | 6 |
| Planned test cases | 27 |
| Open schema gaps | 1 |

Expected initial result: `fail_or_incomplete_before_owner_approved_rls_remediation`.

## Personas

| Persona | Role | Purpose |
|---|---|---|
| `anon` | `anon` | Prove anonymous users cannot read or write private identity/review rows. |
| `owner_user` | `authenticated` | Prove the row owner can read and write only their own permitted rows. |
| `unrelated_user` | `authenticated` | Prove a different authenticated user cannot read or mutate private rows. |
| `assigned_reviewer` | `authenticated` | Prove reviewer access is limited to review-queue or explicitly assigned review rows. |
| `admin` | `authenticated` | Prove admin/reviewer override paths are explicit and role-bound. |
| `service_role` | `service_role` | Prove trusted edge functions and jobs can seed/manage rows without granting public policies. |

## Table Acceptance Matrix

| Table | Priority | Cases | Owner Path | Reviewer Path | Public Exception | Schema Gap |
|---|---|---:|---|---|---|---|
| `analysis_runs` | P1 | 7 | public.analysis_runs.user_id = auth.uid() | status in ('needs_review', 'under_review') and get_user_role() in ('reviewer', 'admin') | only if an owner-approved published/redacted status is introduced; completed alone is not enough for enterprise-private rows | no |
| `human_reviews` | P1 | 5 | review owner through analysis_runs.user_id, plus reviewer_id when the actor is the assigned reviewer | get_user_role() in ('reviewer', 'admin') and reviewer_id::uuid = auth.uid() for writes | none by default | no |
| `users` | P1 | 5 | public.users.auth_id = auth.uid() | security-definer role lookup only; direct reviewer reads need owner approval and column minimization | none by default | no |
| `asset_storage` | P1 | 5 | asset owner through analysis_runs.user_id | reviewer/admin only for assets linked to review-queue runs if owner-approved | only via explicit published/redacted asset workflow | no |
| `schema_failures` | P1 | 5 | no durable owner column in current migration; add analysis_run_id/user_id or restrict to admin/service-role only | admin/reviewer read only if failure metadata is redacted and owner-approved | none by default | yes |

## Open Schema Gaps

- `schema_failures`: no durable owner column in current migration; add analysis_run_id/user_id or restrict to admin/service-role only

## Commands After Approval

```bash
supabase test new identity_and_review_rls --template pgtap
supabase test db supabase/tests/identity_and_review_rls.test.sql --local
supabase test db supabase/tests/identity_and_review_rls.test.sql --linked
```

## Required Approval Gates

1. Owner approves the classification register for these tables.
2. Current local and hosted policy state is inspected.
3. A narrow `identity_and_review` RLS migration is drafted.
4. Test seed helpers are created or Supabase docs-compatible test helpers are installed.
5. Local pgTAP output is attached, then linked-project output is attached only after approval.

## Generated SQL Template

`docs/launch-readiness/rls-identity-and-review-pgtap-template-2026-06-06.sql`

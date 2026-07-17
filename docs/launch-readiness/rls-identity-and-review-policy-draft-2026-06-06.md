# RLS Policy Draft - identity_and_review - 2026-06-06

## Decision

Commercial security status: `policy_draft_not_applied`.

This is a non-applied policy draft. It must not be placed under `supabase/migrations` or applied to hosted Supabase until owner approval, hosted policy inspection, local pgTAP tests, and linked-project approval gates are complete.

## Summary

| Metric | Count |
|---|---:|
| Tables covered | 5 |
| Broad policies to drop | 14 |
| Least-privilege policies to create | 15 |
| Open owner decisions | 3 |
| Planned pgTAP cases from source plan | 27 |

## Table Policy Decisions

| Table | Decision | Drop Count | Create Count | Public Exception |
|---|---|---:|---:|---|
| `analysis_runs` | owner/reviewer/admin access; no anonymous read or insert by default | 6 | 5 | not approved in this draft; requires explicit published/redacted workflow |
| `human_reviews` | owner, assigned reviewer, queue reviewer, or admin access only | 4 | 4 | none by default |
| `users` | own profile row plus admin access; direct reviewer reads require a separate approved minimization path | 2 | 2 | none by default |
| `asset_storage` | owner or approved reviewer/admin access through linked analysis_runs | 1 | 3 | only via explicit published/redacted asset workflow, not included in this draft |
| `schema_failures` | admin-only direct reads until owner chooses an analysis_run_id/user_id schema link | 1 | 1 | none by default |

## Open Owner Decisions

| Decision | Recommended Default | Alternative | Reason |
|---|---|---|---|
| `schema_failures_owner_path` | admin_service_role_only | add analysis_run_id uuid references public.analysis_runs(id) and owner/reviewer policies through analysis_runs | Current migrations define schema_failures with request_id/raw_response/validation_errors but no durable owner column. |
| `public_completed_analysis_runs` | no_public_completed_read_in_enterprise_default | create a separate redacted/published summary table or explicit published_at flag before public reads | status=completed alone is not enough to prove a row is safe for anonymous or public reads. |
| `reviewer_direct_user_reads` | no_direct_reviewer_user_table_reads | create a least-privilege reviewer profile view with only role/name fields needed for queue work | The users table powers role checks and should not become a broad reviewer directory without minimization. |

## Approval Gates

1. Owner approves identity_and_review table classifications and public exceptions.
2. Owner chooses schema_failures owner path: admin/service-role only or add analysis_run_id/user_id.
3. Current hosted Supabase policies are inspected before migration text is finalized.
4. SQL draft is converted into one timestamped migration only after approval.
5. Generated pgTAP template is converted into supabase/tests with helpers and run locally.
6. Linked-project pgTAP and hosted smoke are run only after explicit production approval.

## SQL Draft

`docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.sql`

# RLS Proof Evidence Validation - 2026-06-06

## Decision Boundary

Status: `rls_proof_evidence_validation_ready_no_executed_tests`.

This artifact validates RLS pgTAP/linked Supabase evidence rows for tenant-isolation claims. It is not an executed migration, not hosted smoke proof, not legal/privacy proof, not buyer validation, and not enterprise-ready proof.

Local proof ready: **false**. Linked proof ready: **false**. Tenant-isolation proof ready: **false**.

Executed rows: **0/54**. Local ready rows: **0**. Linked ready rows: **0**. pgTAP failed assertions recorded: **0**.

Tenant isolation claim allowed: **false**. Enterprise-ready claim allowed: **false**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
| register_schema_present | passed | Register schema includes 22 required columns. | repo_artifact |
| all_required_case_environment_rows_present | passed | 54 register case/environment rows loaded for 54 expected rows from docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json. | repo_artifact |
| local_pgtap_execution_present | open_no_executed_tests | 0/27 local rows executed. | local |
| linked_pgtap_execution_present | open_no_executed_tests | 0/27 linked-project rows executed. | hosted_live |
| all_local_cases_passed_owner_approved | open_no_executed_tests | 0/27 local rows are passed, redacted, owner-approved, and artifact-backed. | local |
| all_linked_cases_passed_owner_approved | open_no_executed_tests | 0/27 linked rows are passed, redacted, owner-approved, and artifact-backed. | hosted_live |
| owner_approval_and_redaction | open_no_executed_tests | 0/54 rows owner-approved and 0/54 rows redaction-verified. | owner_input |
| migration_applied_marker | failed | docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json source.migration_applied=false; policy draft test_execution_verified=false. | repo_artifact |
| row_quality_validation | open_no_executed_tests | 0 row-level errors and 0 warnings across RLS proof evidence register. | owner_input |
| claim_boundary_preserved | passed | Rows are checked for unsupported tenant-isolation, enterprise-ready, production-ready, commercial-ready, and zero-risk claim language. | repo_artifact |

## Proof Rows

| Test Case | Env | Run Status | Owner Approval | Ready | Row Errors |
|---|---|---|---|---|---:|
| analysis_runs.anon_select_denied | local | not_run | missing | no | 0 |
| analysis_runs.anon_select_denied | linked | not_run | missing | no | 0 |
| analysis_runs.unrelated_authenticated_select_denied | local | not_run | missing | no | 0 |
| analysis_runs.unrelated_authenticated_select_denied | linked | not_run | missing | no | 0 |
| analysis_runs.owner_path_allowed | local | not_run | missing | no | 0 |
| analysis_runs.owner_path_allowed | linked | not_run | missing | no | 0 |
| analysis_runs.reviewer_path_limited | local | not_run | missing | no | 0 |
| analysis_runs.reviewer_path_limited | linked | not_run | missing | no | 0 |
| analysis_runs.service_role_path_allowed | local | not_run | missing | no | 0 |
| analysis_runs.service_role_path_allowed | linked | not_run | missing | no | 0 |
| analysis_runs.anon_insert_denied | local | not_run | missing | no | 0 |
| analysis_runs.anon_insert_denied | linked | not_run | missing | no | 0 |
| analysis_runs.unrelated_authenticated_write_denied | local | not_run | missing | no | 0 |
| analysis_runs.unrelated_authenticated_write_denied | linked | not_run | missing | no | 0 |
| human_reviews.anon_select_denied | local | not_run | missing | no | 0 |
| human_reviews.anon_select_denied | linked | not_run | missing | no | 0 |
| human_reviews.unrelated_authenticated_select_denied | local | not_run | missing | no | 0 |
| human_reviews.unrelated_authenticated_select_denied | linked | not_run | missing | no | 0 |
| human_reviews.owner_path_allowed | local | not_run | missing | no | 0 |
| human_reviews.owner_path_allowed | linked | not_run | missing | no | 0 |
| human_reviews.reviewer_path_limited | local | not_run | missing | no | 0 |
| human_reviews.reviewer_path_limited | linked | not_run | missing | no | 0 |
| human_reviews.service_role_path_allowed | local | not_run | missing | no | 0 |
| human_reviews.service_role_path_allowed | linked | not_run | missing | no | 0 |
| users.anon_select_denied | local | not_run | missing | no | 0 |
| users.anon_select_denied | linked | not_run | missing | no | 0 |
| users.unrelated_authenticated_select_denied | local | not_run | missing | no | 0 |
| users.unrelated_authenticated_select_denied | linked | not_run | missing | no | 0 |
| users.owner_path_allowed | local | not_run | missing | no | 0 |
| users.owner_path_allowed | linked | not_run | missing | no | 0 |
| users.reviewer_path_limited | local | not_run | missing | no | 0 |
| users.reviewer_path_limited | linked | not_run | missing | no | 0 |
| users.service_role_path_allowed | local | not_run | missing | no | 0 |
| users.service_role_path_allowed | linked | not_run | missing | no | 0 |
| asset_storage.anon_select_denied | local | not_run | missing | no | 0 |
| asset_storage.anon_select_denied | linked | not_run | missing | no | 0 |
| asset_storage.unrelated_authenticated_select_denied | local | not_run | missing | no | 0 |
| asset_storage.unrelated_authenticated_select_denied | linked | not_run | missing | no | 0 |
| asset_storage.owner_path_allowed | local | not_run | missing | no | 0 |
| asset_storage.owner_path_allowed | linked | not_run | missing | no | 0 |
| asset_storage.reviewer_path_limited | local | not_run | missing | no | 0 |
| asset_storage.reviewer_path_limited | linked | not_run | missing | no | 0 |
| asset_storage.service_role_path_allowed | local | not_run | missing | no | 0 |
| asset_storage.service_role_path_allowed | linked | not_run | missing | no | 0 |
| schema_failures.anon_select_denied | local | not_run | missing | no | 0 |
| schema_failures.anon_select_denied | linked | not_run | missing | no | 0 |
| schema_failures.unrelated_authenticated_select_denied | local | not_run | missing | no | 0 |
| schema_failures.unrelated_authenticated_select_denied | linked | not_run | missing | no | 0 |
| schema_failures.owner_path_allowed | local | not_run | missing | no | 0 |
| schema_failures.owner_path_allowed | linked | not_run | missing | no | 0 |
| schema_failures.reviewer_path_limited | local | not_run | missing | no | 0 |
| schema_failures.reviewer_path_limited | linked | not_run | missing | no | 0 |
| schema_failures.service_role_path_allowed | local | not_run | missing | no | 0 |
| schema_failures.service_role_path_allowed | linked | not_run | missing | no | 0 |

## Row Issues

| Row | Field | Severity | Problem |
|---:|---|---|---|
| - | - | - | none |

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
| Supabase Row Level Security docs | https://supabase.com/docs/guides/database/postgres/row-level-security | Policies should constrain anon/authenticated/service-role behavior by row and operation rather than broad public grants. |
| Supabase Testing overview | https://supabase.com/docs/guides/local-development/testing/overview | Database tests, especially RLS policy tests, should be run and evidenced before release claims. |
| Supabase pgTAP docs | https://supabase.com/docs/guides/database/extensions/pgtap | pgTAP provides database-level assertions for policies, functions, and security behavior. |
| PostgreSQL Row Security Policies | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | When row security is enabled, row access must be allowed by policy; absent policies default to deny for normal users. |
| OWASP ASVS | https://owasp.org/www-project-application-security-verification-standard/ | Tenant and object-level access control claims require verification evidence, including negative tests. |

## Next Commands After Owner Approval

1. `supabase test new identity_and_review_rls --template pgtap`
2. `supabase test db supabase/tests/identity_and_review_rls.test.sql --local`
3. `supabase test db supabase/tests/identity_and_review_rls.test.sql --linked`
4. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:rls:validate-proof -- --register docs/launch-readiness/rls-proof-evidence-register-2026-06-06.csv --test-plan docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json --policy-draft docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json --json-output docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/rls-proof-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/rls-proof-evidence-validation-checklist-2026-06-06.csv --update-evidence`
5. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:procurement-gate`
6. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence`

## Proof Boundary

Passing this validator only means RLS pgTAP evidence rows are complete for the checked identity/review batch. It still does not prove hosted app behavior, legal/privacy readiness, support/SLA readiness, AI runtime safety, buyer acceptance, or prediction accuracy.

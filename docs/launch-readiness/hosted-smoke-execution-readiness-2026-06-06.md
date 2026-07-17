# Hosted Smoke Execution Readiness - 2026-06-06

## Decision

Status: `hosted_smoke_execution_blocked_project_privileges_owner_unblock_ready`.

Owner unblock ready: **true**.

Hosted smoke execution ready: **false**.

Hosted proof complete: **false**.

Hosted claim allowed: **false**.

This proves only that the hosted smoke path is structurally ready and the remaining hosted blockers are identified. It does not prove hosted runtime health or buyer-safe hosted claims.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
| current_hosted_proof_sources_attached | passed | repo_artifact | 6 current hosted proof source anchors attached. | Refresh hosted proof anchors when browser, deployment, or Supabase smoke methodology changes. |
| hosted_smoke_scripts_ready | passed | repo_artifact | 12/12 hosted smoke scripts are present. | No script creation needed before owner unblock. |
| hosted_evidence_register_ready | passed | repo_artifact | register rows=12/12; row_errors=0. | Use the register to record hosted URL, deploy id, logs, screenshots, and redaction status. |
| local_browser_route_baseline_ready | passed | local | local route status=local_route_proof_ready_not_hosted_proof; ready routes=7; runtime errors=0. | Use this only as local baseline; do not claim hosted proof. |
| hosted_access_preflight_ready | open_hosted_access_blocked | hosted_live_access_check | access_status=hosted_access_preflight_blocked_project_privileges; cli=true; core_env=true; provider_key=true; target_project_visible=false; functions_access=access_denied_403; secrets_access=access_denied_403; management_access_ready=false; stripe_proof_ready=false. | Owner confirms project ref, grants function/secret management access, provides deploy URL/binding, and supplies Stripe proof values before smoke. |
| hosted_smoke_evidence_present | open_no_hosted_smoke_runs | hosted_live | executed=0; passed=0; redaction_verified=0; logs=0; screenshots=0; core_coverage=0/7. | Run hosted access, auth, schema, strategist, insights, retrieval/analyze, pricing, and entitlement smoke after access unblocks. |
| hosted_claim_boundaries_preserved | passed | repo_artifact | claim_consistency_ready=true; hosted_claim_allowed=false; buyer_claim_allowed_count=0. | Keep hosted-live and commercial-ready language blocked until evidence validator passes. |
| hosted_owner_unblock_ready | passed | repo_artifact | owner_unblock_ready=true; hosted_smoke_execution_ready=false; hosted_proof_complete=false. | Owner can unblock project access/deploy binding and then rerun hosted preflight. |

## Current Hosted Proof Sources

| Source | URL | Requirement |
|---|---|---|
| Playwright configuration | https://playwright.dev/docs/test-use-options | Use explicit base URLs, browser context options, and trace/screenshot/video capture for repeatable browser smoke proof. |
| Playwright trace viewer | https://playwright.dev/docs/trace-viewer | Retain trace or screenshot evidence when a hosted smoke fails or needs review. |
| Supabase Edge Functions | https://supabase.com/docs/guides/functions | Treat deployed edge functions as a managed runtime surface that must be checked separately from repo-local code. |
| Supabase local development and CLI | https://supabase.com/docs/guides/local-development | Use the CLI for local development and project-scoped checks, but require actual project visibility before hosted proof claims. |
| Netlify Deploy Previews | https://docs.netlify.com/site-deploys/deploy-previews/ | Bind browser proof to a concrete deployed URL, branch/deploy context, and environment-variable context before external review. |
| Netlify deploy overview | https://docs.netlify.com/deploy/deploy-overview/ | Keep deploy identifiers and production/preview context explicit so smoke evidence can be tied to a specific release surface. |

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| target_project_visibility_missing | P1 | active | Intended Supabase project ref is visible to the authenticated CLI/account or corrected in the preflight. |
| function_and_secret_management_access_missing | P1 | active | Project-scoped function and secret list commands succeed without exposing secret values. |
| stripe_payment_proof_values_missing | P1 | active | Stripe proof keys are present by name for owner-approved test/payment proof. |
| hosted_deploy_binding_missing | P1 | active | Owner-approved hosted URL plus deploy id or commit binding for the smoke run. |
| hosted_smoke_runs_missing | P1 | active | Executed hosted smoke rows with run timestamp, operator, logs, screenshots where relevant, failure class, and redaction verification. |
| core_hosted_coverage_missing | P1 | active | Hosted access, auth/entitlements, schema, strategist, geopolitical insights, retrieval/analyze, and pricing/payment coverage groups pass. |
| owner_approved_hosted_claim_language_missing | P2 | active | Owner-approved external wording after hosted evidence validation passes. |

## Owner Action Order

1. Confirm or correct the intended Supabase project ref.
2. Grant project-scoped function and secret management visibility or provide an owner-generated redacted manifest.
3. Provide an owner-approved hosted URL and deploy id or commit binding.
4. Provide Stripe proof values for payment/pricing smoke in test mode.
5. Rerun hosted access preflight, then run the hosted smoke plan and record logs/screenshots in the evidence register.
6. Rerun hosted operational proof validation, hosted smoke execution readiness, claim consistency, and commercial confidence before changing hosted-live language.

## Proof Boundary

This is repo/local readiness proof for hosted smoke execution. It cannot support hosted-live, production-ready, commercial-ready, or buyer-safe hosted claims until an owner-approved hosted URL/deploy binding is verified with redacted logs/screenshots and the hosted proof validator passes.

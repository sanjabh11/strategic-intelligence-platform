# Hosted Access Preflight Validation - 2026-06-06

## Decision

Status: `hosted_access_preflight_blocked_project_privileges`.

Hosted access ready for smoke: **false**.

Supabase CLI source: **npm_exec_supabase@2.105.0**. Supabase CLI version: **2.105.0**.

Core hosted env present: **true**. Strategist provider key present: **true**. Stripe proof ready: **false**.

Project list access: **visible**. Target project visible: **false**. Function access: **access_denied_403**. Secret access: **access_denied_403**.

Hosted claim allowed: **false**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
| supabase_cli_available | passed | local | Supabase CLI source npm_exec_supabase@2.105.0; version 2.105.0. | No CLI install action needed for access preflight. |
| core_hosted_env_present | passed | local | All required core hosted env keys are present by name. | Keep values redacted; do not store secrets in artifacts. |
| strategist_provider_key_present | passed | local | At least one strategist provider key is present by name. | Run hosted strategist smoke only after owner approval. |
| project_visibility_checked | passed | hosted_live_access_check | projects list access=visible; listed_project_count=7; target_project_visible=false. | Confirm project ref or grant access to the intended Supabase project. |
| function_management_access | blocked | hosted_live_access_check | functions list access=access_denied_403. | Grant Supabase function-management visibility for the target project or correct the project ref. |
| secret_management_access | blocked | hosted_live_access_check | secrets list access=access_denied_403. | Grant secret-management visibility for the target project or use an owner-generated redacted manifest. |
| payment_proof_values_present | blocked | local | Missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_ACADEMIC_PRICE_ID. | Provide Stripe proof values before pricing/payment hosted proof. |

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| target_project_management_access_missing | P1 | active | Supabase functions and secrets list commands succeed for the intended project ref without exposing values. |
| hosted_url_and_deploy_binding_missing | P1 | active | Owner-approved hosted URL plus deploy id, release id, or commit SHA for browser and smoke evidence. |
| stripe_payment_proof_values_missing | P2 | active | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_ACADEMIC_PRICE_ID, and APP_URL are present for owner-approved payment proof. |
| hosted_browser_screenshots_missing | P2 | active | Browser screenshots or externally supplied evidence for buyer-visible hosted routes after deploy binding. |

## Proof Boundary

This artifact validates local/management access readiness only. It does not prove hosted route behavior, browser rendering, buyer-safe hosted claims, payment readiness, enterprise readiness, or prediction accuracy.

No secret values, tokens, emails, project names, raw CLI output, or payment identifiers are stored in this artifact.

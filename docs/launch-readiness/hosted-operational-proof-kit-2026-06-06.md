# Hosted Operational Proof Kit - 2026-06-06

## Status

Status: `hosted_proof_kit_ready_not_hosted_proof`.

This kit is not hosted/live proof. It defines the smoke plan, owner inputs, acceptance criteria, and evidence template needed before hosted claims can be made.

Current hosted/live entries in `docs/launch-readiness/launch-evidence-2026-06-06.json`: **0**.

## Required Owner Inputs

| Input | Reason |
|---|---|
| owner_approved_hosted_url | Proves which deployed web surface is in scope for screenshots and browser smoke. |
| deployed_commit_or_release_id | Binds hosted proof to a repo commit or release rather than an unknown live state. |
| redacted_env_manifest | Shows required variables are present without exposing secret values. |
| smoke_user_policy | Defines whether scripts can create disposable users or must use owner-provided test accounts. |
| log_and_screenshot_paths | Ensures evidence is attachable without credentials or private data. |

## Smoke Plan

| Smoke ID | NPM Script | Script Exists | Current Status | Claim Checked |
|---|---|---|---|---|
| hosted_access_preflight | diag:hosted:access | yes | not_run_in_this_evidence_set | Hosted Supabase and function-management access is observable for proof capture. |
| hosted_function_drift | diag:functions:hosted | yes | not_run_in_this_evidence_set | Hosted edge-function surface matches the repo-backed launch surface. |
| hosted_auth_and_entitlements | diag:auth:hosted | yes | not_run_in_this_evidence_set | Hosted auth, entitlement tables, and webhook rejection behavior are proof-captured. |
| hosted_schema_preflight | smoke:schema:hosted | yes | not_run_in_this_evidence_set | Hosted database schema contains the tables required by the premium workflow. |
| hosted_strategist_console | smoke:strategist:hosted | yes | not_run_in_this_evidence_set | Hosted strategist route can produce governed, evidence-aware analysis with provider diagnostics. |
| hosted_researcher_advanced | smoke:researcher:advanced:hosted | yes | not_run_in_this_evidence_set | Hosted researcher workflow can run advanced frameworks with hydrator/export/notebook proof. |
| hosted_insights_gdelt | smoke:insights:hosted | yes | not_run_in_this_evidence_set | Hosted geopolitical radar can use non-simulated GDELT/provider diagnostics. |
| hosted_warroom_collaboration | smoke:warroom:hosted | yes | not_run_in_this_evidence_set | Hosted war-room collaboration can create and verify decision, assumption, scenario, and comment rows. |
| hosted_classroom_training | smoke:classroom:hosted | yes | not_run_in_this_evidence_set | Hosted classroom/training lane can create instructor/student flow and assignment evidence. |
| hosted_payment_and_pricing | proof:stripe:hosted | yes | not_run_in_this_evidence_set | Hosted pricing, Stripe webhook, and entitlement proof are captured without live payment mutation. |
| hosted_retrieval_and_evidence | smoke:retrieval:hosted | yes | not_run_in_this_evidence_set | Hosted evidence retrieval grows retrieval artifacts and avoids low-source fallback. |
| hosted_analyze_evidence_canaries | smoke:analyze:evidence:hosted | yes | not_run_in_this_evidence_set | Hosted analyze-engine produces evidence-backed analysis across geopolitical and commodity canaries. |

## Acceptance Gates

| Gate | Required | Pass Condition |
|---|---|---|
| deploy_binding | yes | Each evidence row records hosted URL, deploy id or commit, timestamp, command, and operator. |
| secret_redaction | yes | Logs and screenshots contain no API keys, bearer tokens, session cookies, passwords, or direct personal contact/payment identifiers. |
| route_and_api_coverage | yes | At least access, auth, schema, strategist, insights, retrieval/analyze, and pricing/entitlement checks are attached before buyer-safe hosted claims. |
| failure_classification | yes | Every failed smoke row records whether the blocker is secret/config, deploy drift, schema/RLS, provider reliability, payment, or product behavior. |
| claim_boundary | yes | Hosted proof upgrades only the specific checked workflow; it does not upgrade prediction-accuracy or commercial-ready claims by itself. |

## Evidence Template

Use `docs/launch-readiness/hosted-operational-proof-evidence-template-2026-06-06.csv` to capture command output, deploy binding, logs, screenshots, failure class, and redaction status. Rows stay `buyer_claim_allowed=no` until the command passes and evidence is attached.

## Proof Boundary

Passing this kit can support only the specific hosted workflow checked. It does not prove commercial-ready status, enterprise RLS safety, buyer willingness to pay, or world-class prediction accuracy.

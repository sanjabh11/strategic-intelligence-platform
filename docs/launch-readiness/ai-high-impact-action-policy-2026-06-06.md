# AI High-Impact Action Policy - 2026-06-06

## Decision

Status: `draft_high_impact_action_policy_ready_not_owner_approved_or_hosted_tested`.

This artifact converts the AI action inventory into a draft high-impact action policy and boundary-test matrix. It does not execute hosted tests, payment flows, outreach, production jobs, or migrations.

Buyer-safe position:

> A draft high-impact action policy and boundary-test matrix exist; hosted no-autonomous-action proof is still missing.

## Summary

| Metric | Count |
|---|---:|
| Policy surfaces | 10 |
| High-impact product action surfaces | 7 |
| Approval-required surfaces | 9 |
| Hosted boundary tests specified | 9 |
| Static boundary tests specified | 4 |
| Direct LLM-to-irreversible-action surfaces | 0 |
| Hosted-verified tests | 0 |

## Source Alignment

| Framework | Source | Policy Implication |
|---|---|---|
| OWASP LLM06:2025 Excessive Agency | https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ | Keep LLM tools minimal, avoid open-ended tools, apply least privilege, execute in user context, require human approval for high-impact actions, and mediate authorization outside the model. |
| NIST AI RMF Generative AI Profile | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | Make action risk part of govern, map, measure, and manage controls before public-sector AI trust claims. |
| CISA Secure by Design and Secure by Demand | https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf | Convert action safety into purchaser-reviewable questions, owner decisions, transparent boundaries, and repeatable verification evidence. |
| NIST SSDF SP 800-218 | https://csrc.nist.gov/pubs/sp/800/218/final | Treat action-boundary tests as secure-development verification evidence for buyers and software consumers. |

## Policy Principles

- No model-selected irreversible action: LLM output may recommend, draft, or classify, but downstream systems must enforce authorization and approval.
- High-impact actions require a named authority context: authenticated user, reviewer role, verified webhook signature, or owner-approved operator context.
- Open-ended tools and model-selected destinations are prohibited for post-analysis fanout.
- Payment and entitlement actions require test-policy approval before proof execution and signed webhooks before mutation.
- Outreach artifacts are copy-only until owner approval; no app or script should send external messages as part of this evidence phase.
- Service-role scripts are operator proof tools, not autonomous product runtime tools.

## Policy Surfaces

| Surface | Impact | Approval Required | Direct LLM-to-Irreversible | Required Context | Forbidden Context | Hosted Test Status |
|---|---|---|---|---|---|---|
| Analyze-engine service-role persistence | high | yes | no | server_route_context, service_role_key_operator_boundary, request_id_or_analysis_run_id, audit_log | model_selected_database_write, anonymous_direct_write, unbounded_table_mutation | not_tested |
| Analyze-engine adjacent function and ML fanout | high | yes | no | fixed_function_allowlist, server_route_context, request_id_or_analysis_run_id, timeout_and_error_logging | model_supplied_function_url, open_ended_fetch_tool, unapproved_post_synthesis_fanout | not_tested |
| Forecast publication | high | yes | no | authenticated_user, analysis_owner_match, publish_governance_can_publish, forecast_row_auditability | anonymous_publication, unowned_linked_analysis, rejected_or_unreviewed_publication | not_tested |
| Human review request | medium | no | no | authenticated_user, analysis_owner_or_reviewer, review_state_auditability | anonymous_review_request, unrelated_user_review_request | not_tested |
| Human review approve/reject | high | yes | no | authenticated_reviewer, analysis_status_under_review, review_record_insert, reviewer_audit_trail | ai_reviewer_decision, non_reviewer_decision, decision_on_non_pending_analysis | not_tested |
| Stripe checkout session creation | high | yes | no | authenticated_user, email_match, allowed_tier, same_origin_redirect, stripe_test_policy_for_proof | model_initiated_checkout, email_mismatch_checkout, unsupported_tier_checkout, unapproved_live_payment_test | not_tested |
| Stripe webhook entitlement sync | high | yes | no | stripe_signature_verified, event_type_allowlist, entitlement_audit_log, invalid_signature_rejection | unsigned_entitlement_mutation, model_mutated_subscription, unapproved_live_webhook_test | not_tested |
| Whop webhook entitlement sync | high | yes | no | whop_signature_verified, event_type_allowlist, entitlement_audit_log, invalid_signature_rejection | unsigned_entitlement_mutation, model_mutated_membership, unapproved_live_webhook_test | not_tested |
| Buyer discovery outreach copy | low | yes | no | copy_generation_only, owner_approval_before_send, no_send_capability_in_script | app_sends_outreach, model_sends_email_or_linkedin, unapproved_external_contact | not_applicable_copy_only |
| Hosted service-role smoke scripts | operator_high | yes | no | operator_run_only, owner_approved_secrets_policy, redacted_logs, no_secret_persistence | autonomous_service_role_test, service_role_key_in_artifact, unapproved_production_mutation | not_tested |

## Boundary Tests

| Test | Surface | Scope | Expected Result |
|---|---|---|---|
| forecast_unowned_analysis_denied | forecast_publication | hosted_after_owner_approval | HTTP 403 with code analysis_not_owned; no forecast row created |
| forecast_governance_blocks_unready_publication | forecast_publication | hosted_after_owner_approval | HTTP 400 with governance status; no forecast row created |
| human_review_non_reviewer_denied | human_review_approve_reject | hosted_after_owner_approval | HTTP 403 with reviewer role required; analysis status unchanged |
| human_review_requires_under_review | human_review_approve_reject | hosted_after_owner_approval | HTTP 400 Analysis is not pending review; analysis status unchanged |
| stripe_checkout_email_mismatch_denied | stripe_checkout_session | hosted_after_owner_approval_test_keys_only | HTTP 403 Authenticated user email does not match checkout email; no Stripe session created |
| stripe_checkout_academic_non_edu_denied | stripe_checkout_session | hosted_after_owner_approval_test_keys_only | HTTP 400 academic pricing requires .edu email; no Stripe session created |
| stripe_webhook_invalid_signature_denied | stripe_webhook_entitlement_sync | hosted_after_owner_approval_test_keys_only | HTTP 401 Invalid Stripe signature; no payment_logs or subscription mutation |
| whop_webhook_invalid_signature_denied | whop_webhook_entitlement_sync | hosted_after_owner_approval_test_policy_only | HTTP 401 Invalid signature; no whop_users or subscription mutation |
| analyze_engine_fanout_allowlist_review | analyze_engine_function_fanout | static_local_then_hosted_after_owner_approval | known allowlist only; no model-supplied arbitrary endpoint |
| service_role_scripts_operator_only | hosted_service_role_smoke_scripts | static_local | operator-only scripts with owner-approved secret policy and no secret persistence in artifacts |
| buyer_outreach_copy_no_send | buyer_discovery_outreach_copy | static_local | no send action and visible owner-approval warning |
| direct_llm_irreversible_action_count_zero | all | static_local | count is 0; any future nonzero count blocks public-sector AI claims |

## Owner Approval Checklist

- Approve or edit the high-impact action classification for every policy surface.
- Approve whether analyze-engine service-role persistence and fanout require a centralized allowlist before hosted pilots.
- Approve hosted negative tests for forecast publication and human review role boundaries.
- Approve Stripe and Whop test-key/test-webhook policy before payment or entitlement proof.
- Approve hosted URL, deployed release, smoke users, redacted evidence paths, and no-secret logging rules.
- Mark this policy externally shareable only after hosted boundary tests, RLS tests, and privacy/support terms are attached.

## Proof Boundary

Allowed use: Internal owner-review packet and hosted-test specification for excessive-agency and high-impact action controls.

Not proof of:

- owner-approved policy
- hosted runtime behavior
- production RLS or object authorization
- payment/webhook correctness
- buyer acceptance
- world-class prediction accuracy

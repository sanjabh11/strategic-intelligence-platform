# Enterprise Trust Pack - 2026-06-06

## Decision

Status: `enterprise_trust_pack_ready_not_security_proof`.

This packet converts the current commercial-readiness evidence into an enterprise/public-sector procurement and AI-governance questionnaire. It is a readiness artifact, not security certification, hosted proof, buyer validation, or prediction-accuracy proof.

Buyer-safe position:

> Security and AI-governance proof path is explicit, but enterprise security proof remains pending owner approvals and hosted/testing evidence.

## Proof Boundary

Allowed use: Internal and buyer-prep procurement readiness map for a guided pilot.

Not proof of:

- SOC 2, ISO/IEC 42001, ISO/IEC 27001, FedRAMP, or formal security certification
- production Supabase policy state
- completed RLS remediation
- hosted runtime behavior
- buyer approval or willingness to pay
- world-class prediction accuracy

## Current Source Alignment

| Framework | Source | Procurement Implication |
|---|---|---|
| NIST AI RMF | https://www.nist.gov/itl/ai-risk-management-framework | Treat governance, measurement, lifecycle risk, and critical-infrastructure trust as procurement evidence gates. |
| NIST AI RMF Core | https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ | Map the app to govern/map/measure/manage evidence instead of relying on generic responsible-AI copy. |
| NIST SSDF SP 800-218 | https://csrc.nist.gov/pubs/sp/800/218/final | Use repeatable tests, dependency scans, least-privilege RLS, and release evidence as buyer-facing proof. |
| CISA Secure by Design | https://www.cisa.gov/resources-tools/resources/secure-by-design | Do not transfer verification burden to buyers; show explicit owner gates and redacted proof paths. |
| CISA Secure by Demand Guide | https://www.cisa.gov/resources-tools/resources/secure-demand-guide | Provide a procurement questionnaire that separates current proof, missing proof, and allowed claims. |
| OWASP GenAI/LLM Top 10 2025 | https://genai.owasp.org/llm-top-10/ | Add LLM threat questions before any enterprise or public-sector AI claim is upgraded. |
| ISO/IEC 42001:2023 | https://www.iso.org/standard/42001 | Position this pack as pre-certification evidence mapping, not ISO certification or an audited AI management system. |

## Trust Domains

| Domain | Proof Status | Buyer Risk | Next Gate |
|---|---|---|---|
| Authentication, accounts, and entitlements | proof_kit_ready_not_hosted_proof | Paid pilots can stall if account creation, gated access, and entitlement behavior are not demonstrated on the hosted environment. | Run hosted auth and entitlement smoke after owner-approved hosted URL, deployed release, secrets, and smoke-user policy. |
| RLS, tenant isolation, and object authorization | policy_draft_not_applied | Enterprise and public-sector procurement will block if public, anonymous, tenant, and reviewer boundaries are not tested. | Owner approves classifications and draft, then one narrow migration plus pgTAP and hosted smoke proof. |
| Hosted deployment and runtime binding | hosted_proof_absent | Local proof and generated kits do not prove the buyer-visible hosted app. | Attach deploy id, hosted URL, redacted logs, screenshots, and smoke outputs. |
| LLM and GenAI application security | local_redteam_passed_hosted_redteam_missing | LLM prompt injection, sensitive-data disclosure, output handling, and excessive agency risks can undermine public-sector trust. | Run the same non-secret fixture set against owner-approved hosted LLM flows with redacted logs and screenshots. |
| Forecast evaluation and claim governance | evaluation_protocol_ready_not_accuracy_proof | Accuracy and world-class language will create reputational and legal risk unless it is backed by resolved outcomes and comparable baselines. | Score owner-approved resolved forecasts with Brier/reliability metrics and real human/community/pro/external baselines. |
| Data source provenance, freshness, and reliability | provenance_controls_partial_feed_sla_missing | Strategic-intelligence buyers need source labels, recency, degraded-feed warnings, and explicit non-simulation proof. | Run hosted data-provider smoke and add source freshness/SLA labels before operational monitoring claims. |
| Dependency and software supply chain | local_audit_clean | Buyers may ask for dependency audit, update policy, SBOM, and release provenance. | Keep npm audit clean, add SBOM/release provenance if procurement asks, and avoid new dependencies without evidence. |
| Monitoring, incident evidence, and log redaction | redaction_plan_ready_monitoring_proof_missing | Public-sector and enterprise buyers will ask how issues are detected, triaged, and communicated without leaking sensitive data. | Attach owner-approved monitoring, alerting, incident-response, and log-redaction evidence. |
| Privacy, retention, DPA, support, and SLA | owner_documents_missing | Procurement can block even when the app is technically strong if privacy, retention, and support terms are missing. | Owner supplies or approves DPA/privacy/retention/support/SLA terms before enterprise procurement claims. |
| AI governance management system | framework_mapping_ready_not_certification | Governance buyers may require policy owners, risk register, model/system inventory, periodic review, and audit trail. | Create owner-approved AI system inventory, risk register, review cadence, and certification/audit stance if selling to regulated buyers. |

## Procurement Questionnaire

| Domain | Buyer Question | Proof Status | Allowed Claim |
|---|---|---|---|
| Commercial claim boundary | Can this be represented as enterprise-ready or world-class accurate today? | not_95_confident | Governed strategic-intelligence pilot with calibration-aware decision support. |
| RLS and object authorization | Are tenant, user, reviewer, and public/private boundaries enforced and tested? | policy_draft_not_applied | RLS remediation path is drafted; enterprise isolation proof is not complete. |
| Public and anonymous exceptions | Which tables are intentionally public or anonymous, and why? | owner_classification_pending | Public/anonymous access is under review. |
| Hosted runtime proof | Does the hosted app match the repo-backed launch surface? | hosted_proof_absent | Hosted proof plan exists; hosted behavior is not proven in this artifact. |
| Auth and entitlement controls | Can paid/premium access and account boundaries be demonstrated? | proof_kit_ready_not_hosted_proof | Auth and entitlement proof path is defined. |
| LLM prompt injection | Has the app been tested against prompt injection and instruction override attacks? | local_redteam_passed_hosted_missing | Local prompt-injection regression coverage exists; hosted resistance is not proven. |
| Sensitive information disclosure | Can the app prevent or flag sensitive data leakage through LLM output or logs? | local_redaction_fixture_passed_hosted_missing | Local sensitive-disclosure fixture coverage exists; hosted redaction proof is pending. |
| LLM output handling | Are LLM outputs validated before downstream use? | local_output_handling_fixtures_passed_hosted_missing | Local output-handling red-team fixtures passed; hosted model-path coverage is pending. |
| Excessive agency and tool use | Can the AI take irreversible or high-impact actions automatically? | draft_action_policy_ready_owner_approval_and_hosted_tests_missing | Decision support, not autonomous execution. |
| Forecast accuracy and calibration | What evidence supports prediction accuracy? | evaluation_protocol_ready_not_accuracy_proof | Calibration-aware workflow only. |
| Source provenance and data freshness | Are external data sources fresh, non-simulated, and labeled? | feed_proof_missing | Evidence-aware workflow with source caveats. |
| Dependency and supply chain | Is there current vulnerability and supply-chain evidence? | local_audit_clean | Local dependency audit was clean when last run; release provenance is separate. |
| Secure development lifecycle | Which secure-development controls are repeatable? | local_checks_present | Repeatable local verification exists. |
| Monitoring and incident response | How are incidents detected, triaged, and communicated? | owner_documents_missing | Not ready for incident-response claims. |
| Privacy and retention | What data is stored, retained, deleted, and shared? | owner_documents_missing | Pilot data terms must be negotiated or explicitly scoped. |
| AI governance management system | Does the organization have ISO/IEC 42001 certification or equivalent AI governance system? | framework_mapping_ready_not_certification | NIST/ISO-aligned pre-certification evidence mapping. |
| Buyer proof and willingness to pay | Has a buyer accepted the trust posture for a paid pilot? | pilot_offer_pack_ready_not_buyer_proof | Pilot offer is packaged, not buyer validated. |
| Support and SLA | What uptime, support, escalation, and response commitments are available? | owner_documents_missing | Support/SLA terms are pending owner approval. |
| Procurement evidence packet | What can be shared with a security/procurement reviewer today? | enterprise_trust_pack_ready_not_security_proof | Procurement-readiness questionnaire draft. |

## Acceptance Gates

| Gate | Current Status | Required Evidence | Unlocks |
|---|---|---|---|
| owner_table_classification | blocked_owner_approval | docs/launch-readiness/rls-table-classification-register-2026-06-06.json | narrow RLS migration drafting |
| rls_migration_and_pgtap | blocked_not_applied_or_tested | docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json; docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json | enterprise isolation proof |
| hosted_smoke_and_deploy_binding | blocked_no_hosted_proof | docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json | buyer-safe hosted demo claims |
| llm_security_regression | local_tests_passed_hosted_tests_missing | docs/launch-readiness/llm-security-readiness-audit-2026-06-06.json | public-sector AI trust claims |
| ai_action_inventory_and_high_impact_policy | draft_policy_ready_owner_approval_and_hosted_tests_missing | docs/launch-readiness/ai-high-impact-action-policy-2026-06-06.json; docs/launch-readiness/ai-action-inventory-2026-06-06.json | excessive-agency and no-autonomous-action procurement answers |
| forecast_claim_tier | blocked_real_data_missing | docs/launch-readiness/forecast-evaluation-protocol-2026-06-06.json; docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json | accuracy claim upgrade, if results support it |
| privacy_retention_dpa | blocked_owner_documents_missing | owner-supplied legal/privacy packet | enterprise procurement packet |
| secure_sdlc_packet | partial_local_checks_present | docs/launch-readiness/launch-evidence-2026-06-06.json | secure-development questionnaire answers |

## External Sharing Gate

1. Owner reviews every questionnaire answer and marks rows approved for external sharing.
2. Remove internal script names, logs, or sensitive architecture details for public-sector procurement where needed.
3. Attach only redacted hosted smoke evidence and never include secrets.
4. Keep the prohibited claims list visible in any buyer-facing security packet.

## Next Commands After Owner Approval

- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:enterprise:trust-pack`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:ai:actions`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:ai:action-policy`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:llm:security`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:rls:policy-draft`
- `supabase test db`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:hosted:access`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run smoke:strategist:hosted`
- `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence`

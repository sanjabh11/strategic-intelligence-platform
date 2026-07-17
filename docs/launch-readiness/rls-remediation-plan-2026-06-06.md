# RLS Remediation Plan - 2026-06-06

## Decision

Current commercial security posture: `not_enterprise_ready`.

This is a remediation and procurement-evidence plan, not a live policy fix. It does not claim deployed Supabase policies are safe. It converts `docs/launch-readiness/rls-policy-audit-2026-06-06.json` into an ordered plan for owner-approved RLS hardening and hosted proof.

## Source Audit

| Metric | Count |
|---|---:|
| Migration files scanned | 57 |
| Policies parsed | 186 |
| Static findings | 162 |
| P1 findings | 78 |
| Affected tables in remediation plan | 70 |
| Source-P1 affected tables | 44 |
| Remediation batches | 10 |

## Best-Practice Boundary

| Framework | Requirement Applied Here |
|---|---|
| OWASP API1:2023 Broken Object Level Authorization | Every record-access path needs object-level authorization tied to the requester and requested record. |
| Supabase RLS and database testing guidance | RLS fixes need automated tests for anon, unrelated authenticated, owner/member, reviewer, and service-role behavior. |
| NIST SSDF SP 800-218 | Security work should produce acquisition-ready communication and evidence for customers. |
| CISA Secure by Design | Enterprise pilots should wait for secure defaults, clear exceptions, and proof that product security outcomes are owned. |

## Remediation Batches

| Batch | Priority | Tables | P1 Tables | Buyer Impact |
|---|---|---:|---:|---|
| `advanced_services` | P1 | 10 | 10 | Advanced outputs can contain customer scenario data and should not be anonymously writable or broadly readable. |
| `forecasting_and_ml_evaluation` | P1 | 15 | 8 | Prediction-science claims require protected evaluation data, shadow runs, and resolved-outcome ledgers. |
| `collaboration_and_warroom` | P1 | 7 | 7 | Collaboration memory and war-room records are enterprise-sensitive and need team/member scoped access. |
| `retrieval_and_evidence` | P1 | 6 | 6 | Evidence, retrieval cache, and provider runs can expose query intent, sources, and analysis context. |
| `identity_and_review` | P1 | 5 | 5 | Directly affects user privacy, review confidentiality, and buyer trust in analysis ownership. |
| `classroom` | P1 | 4 | 3 | Academic pilots need teacher/student membership boundaries and privacy-safe activity logs. |
| `observability` | P1 | 3 | 3 | Operational logs can expose system internals, provider failures, and customer activity. |
| `analysis_execution` | P1 | 7 | 2 | Analysis execution and public-beta intake tables can expose job state, feature outputs, abuse controls, and user workflow metadata. |
| `public_catalog_candidates` | P2 | 9 | 0 | Some catalog rows may be intentionally public, but enterprise buyers need an exception register. |
| `ontology_and_graph` | P2 | 4 | 0 | Ontology and graph data can reveal strategic context, source linkage, and inferred entities across customer analyses. |

## First Three Fix Batches

1. `identity_and_review`
   - Tables: `analysis_runs`, `human_reviews`, `users`, `asset_storage`, `schema_failures`
   - Policy direction: require authenticated owner, reviewer, or service-role access; remove unconditional public reads and direct anonymous writes except through audited edge functions.
   - Tests: anon denied, unrelated authenticated denied, owner/reviewer allowed, service role allowed.

2. `collaboration_and_warroom`
   - Tables: `collaborative_messages`, `collaborative_sessions`, `session_participants`, `warroom_assumptions`, `warroom_comments`, `warroom_decision_logs`, `warroom_scenario_versions`
   - Policy direction: scope reads and writes to room/session membership, creator ownership, explicit reviewer roles, or service-role jobs.
   - Tests: non-member denied, member allowed, creator allowed, service role allowed, published summary exception documented if retained.

3. `forecasting_and_ml_evaluation`
   - Tables include `whitebox_experiment_state`, `whitebox_experiment_evaluations`, `strategy_outcomes`, `dynamic_recalibration_results`, `outcome_forecasting_results`, and shadow/calibration tables.
   - Policy direction: restrict evaluation, shadow, and calibration tables to service-role jobs, owners, reviewers, and explicitly public published summaries.
   - Tests: private evaluation rows hidden from anon and unrelated users; approved public summary remains readable only when explicitly classified.

## Approval Gates

- Do not apply broad RLS migrations without owner approval and current hosted policy inspection.
- Classify each affected table as public catalog, authenticated user data, team/collaboration data, service-job data, evaluation/shadow data, or observability data.
- Draft one narrow migration per domain batch.
- Run Supabase database tests for anon, unrelated authenticated, owner/member, reviewer, and service-role paths.
- Run hosted smoke scripts after deployment and attach logs/screenshots to launch evidence.
- Keep launch decision at `pilot-only` until P1 policy findings are fixed or intentionally accepted with written buyer-facing caveats.

## Procurement Evidence Needed

- Table classification register with owner and sensitivity for each P1 table.
- Policy diff showing broad public/anon predicates removed or explicitly justified.
- Supabase test output proving negative and positive access cases.
- Hosted smoke output for console, forecast, review, classroom/war-room where relevant, pricing/auth, and schema preflight.
- Exception register for any public or anonymous policy retained for public beta intake.

## Generated Report

Structured JSON: `docs/launch-readiness/rls-remediation-plan-2026-06-06.json`


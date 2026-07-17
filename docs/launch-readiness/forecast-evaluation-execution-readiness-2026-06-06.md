# Forecast Evaluation Execution Readiness - 2026-06-07

## Decision

Status: `forecast_evaluation_execution_ready_for_owner_export_no_real_outcomes`.

Execution ready for owner resolved export: **true**.

Scoring chain ready for owner claim review: **false**.

Accuracy claim allowed: **false**.

World-class prediction claim allowed: **false**.

This proves execution readiness for owner data collection only. It does not prove forecast accuracy or benchmark superiority.

Pre-resolution capture kit ready: **true**.

Pre-resolution capture validator ready: **true**.

Pre-resolution owner rows present: **false**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
| current_execution_sources_attached | passed | repo_artifact | 7 current forecasting execution source anchors attached. | Refresh source anchors when forecasting benchmark methodology changes. |
| forecast_protocol_complete | passed | repo_artifact | 8 protocol stages present; missing=none. | No protocol action needed before owner export. |
| repo_evaluation_surface_present | passed | repo_artifact | 10/10 required UI/schema/function surfaces contain expected evaluation markers. | No repo-surface repair needed before owner export. |
| owner_input_templates_ready | passed | repo_artifact | 2/2 owner export templates are present with required columns. | Use these templates for owner-approved forecast and baseline exports. |
| pre_resolution_capture_kit_ready | passed | repo_artifact | 3/3 pre-resolution templates ready; kit status=forecast_pre_resolution_capture_kit_ready_not_accuracy_proof; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false. | Owner can start timestamped pre-resolution capture before outcomes resolve. |
| pre_resolution_capture_validator_ready | passed | repo_artifact | validator_status=forecast_pre_resolution_capture_validation_ready_no_owner_rows; schema_ready=true; owner_rows_present=false; ready_for_pre_resolution_freeze=false; accuracy_claim_allowed=false. | Run the validator again after owner fills the pre-resolution packet; empty templates remain owner-blocked, not accuracy proof. |
| owner_approved_resolved_export_present | open_no_real_resolved_forecast_export | owner_input | 0 valid resolved forecasts and 0 real resolved outcomes currently validated. | Owner exports pre-resolution forecasts with resolved outcomes, sources, criteria, and exclusion review. |
| real_comparable_baseline_export_present | open_no_real_comparable_baseline_export | owner_input | 0 valid baselines and 0 real baseline comparisons currently validated. | Owner supplies comparable human, community, pro, model, or market baselines with timestamps, source URLs, and sample sizes. |
| leakage_review_ready_for_claim_scoring | open_leakage_review_not_ready | owner_input | 0/8 leakage controls ready; leakage_review_passed=false. | Run leakage review on owner-approved forecast and baseline rows before scoring claims. |
| scoring_output_ready_for_claim_review | open_scoring_sample_only_or_not_ready | owner_input | scoring_ready=false; sample_only=true; included_points=30; max_source_sample_size=6; comparisons=15. | Run calibration ledger and scoring validation on owner-approved rows only. |
| hosted_and_rls_boundaries_ready | open_hosted_or_rls_boundary_not_ready | hosted_live | hosted_access_ready_for_smoke=false; hosted_ready_for_buyer_safe_claims=false; rls_tenant_isolation_ready=false. | Clear hosted preflight, hosted evidence validation, and RLS proof before using scoring in external claims. |
| execution_ready_for_owner_resolved_export | passed | repo_artifact | protocol=true; repo_surfaces=true; resolved_templates=true; pre_resolution_kit=true; pre_resolution_validator=true; science_alignment=true; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false. | Owner can now create the resolved forecast and baseline export; claims remain blocked. |

## Repo Surface Checks

| Surface | Status | Path | Missing Markers |
|---|---|---|---|
| forecast_registry_capture_ui | present | src/components/ForecastRegistry.tsx | none |
| resolved_forecast_schema | present | supabase/migrations/20251212120000_enterprise_sso.sql | none |
| whitebox_release_scoring_schema | present | supabase/migrations/20260429000100_whitebox_release_governance.sql | none |
| ml_calibration_drift_shadow_schema | present | supabase/migrations/20260501000100_ml_phase1_phase2_foundation.sql | none |
| whitebox_release_scoring_code | present | supabase/functions/_shared/whitebox-release.ts | none |
| release_evaluation_function | present | supabase/functions/release-evaluation/index.ts | none |
| whitebox_scheduled_function | present | supabase/functions/whitebox-scheduled/index.ts | none |
| calibration_refresh_function | present | supabase/functions/calibration-refresh/index.ts | none |
| drift_evaluate_function | present | supabase/functions/drift-evaluate/index.ts | none |
| shadow_model_refresh_function | present | supabase/functions/shadow-model-refresh/index.ts | none |

## Pre-Resolution Templates

| Template | Status | Path | Missing Columns |
|---|---|---|---|
| question_register_template | ready | docs/launch-readiness/forecast-question-register-template-2026-06-06.csv | none |
| pre_resolution_snapshot_template | ready | docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv | none |
| baseline_snapshot_template | ready | docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv | none |

## Current Execution Sources

| Source | URL | Requirement |
|---|---|---|
| ForecastBench - Forecasting Research Institute | https://forecastingresearch.org/research/forecastbench | Use dynamic, continuously updated questions and human comparison groups before forecasting accuracy claims. |
| ForecastBench documentation | https://www.forecastbench.org/docs/ | Evaluate on generated question sets, resolved forecasts, and difficulty-adjusted Brier-style scoring rather than static demos. |
| ForecastBench paper | https://arxiv.org/abs/2409.19839 | Avoid data leakage by forecasting questions whose answers are unknown at submission time and compare ML systems with expert and public human forecasts. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Score probabilistic forecasts as questions resolve and compare model results with community and pro forecaster baselines. |
| Metaculus scoring FAQ | https://www.metaculus.com/help/scores-faq/ | Use proper scoring rules and aggregate over many timestamped predictions rather than single-question anecdotes. |
| NIST AI RMF | https://www.nist.gov/itl/ai-risk-management-framework | Treat AI trust claims as documented governance, measurement, evaluation, monitoring, and risk-management evidence. |
| NIST AI RMF Generative AI Profile | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | Measure claims with empirically validated methods, deployment-like conditions, regular evaluation, and documented release decisions. |

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| owner_approved_resolved_forecast_export_missing | P1 | active | Owner-approved pre-resolution forecast export with resolved outcomes, resolution source URLs, criteria, and exclusion review. |
| real_comparable_baseline_export_missing | P1 | active | Comparable human, community, pro, model, or market baselines with timestamp policy, source URL, and sample size. |
| leakage_review_on_real_rows_missing | P1 | active | Leakage and contamination review against the owner-approved forecast and baseline rows. |
| scoring_run_on_real_rows_missing | P1 | active | Calibration, Brier, reliability, and baseline comparison outputs generated from real owner-approved rows. |
| hosted_access_and_operational_proof_missing | P1 | active | Hosted preflight access, deploy binding, redacted logs/screenshots, and validated hosted smoke evidence. |
| rls_tenant_isolation_proof_missing | P1 | active | Executed local and linked RLS/evaluation-table proof accepted by the RLS validator. |
| owner_approved_accuracy_claim_language_missing | P2 | active | Owner-approved external wording after real scoring, leakage review, hosted/RLS proof, and buyer-safe claim consistency checks. |

## Owner Action Order

1. Start the timestamped pre-resolution capture packet: question register, app/model/team forecast snapshots, and comparable baseline snapshots.
2. After outcomes resolve, export owner-approved forecast rows with resolved outcomes using the resolved forecast template.
3. Export comparable human, community, pro, model, or market baselines using the baseline template.
4. Run accuracy input validation and leakage review against those owner-approved rows.
5. Run calibration ledger, benchmark comparison, and forecast scoring validation on the validated real rows.
6. Clear hosted access, hosted operational proof, and RLS tenant-isolation proof before any external accuracy claim review.
7. Rerun prediction science validation, this execution-readiness gate, claim consistency, and commercial confidence before changing market language.

## Proof Boundary

This is repo/local execution-readiness proof. It cannot support external prediction-accuracy language until real owner-approved resolved outcomes, real comparable baselines, leakage review, scoring, hosted proof, RLS proof, and owner-approved claim wording are all revalidated.

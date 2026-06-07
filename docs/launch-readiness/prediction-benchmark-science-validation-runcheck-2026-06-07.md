# Prediction Science Evidence Validation - 2026-06-06

## Decision

Status: `prediction_science_evidence_validation_ready_no_real_outcomes`.

Scientific framework alignment ready: **true**.

Prediction-science claim review ready: **false**.

Mechanics-only claim allowed: **true**.

Accuracy claim allowed: **false**.

World-class prediction claim allowed: **false**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
| current_scientific_framework_sources_attached | passed | repo_artifact | 5 current forecasting/evaluation source anchors attached. |
| forecast_protocol_complete | passed | repo_artifact | 8 protocol stages present; missing=none. |
| proper_scoring_metric_suite_present | passed | repo_artifact | 6 metrics present; missing=none. |
| claim_tiers_and_governance_thresholds_present | passed | repo_artifact | 4 claim tiers and 5 governance thresholds present. |
| owner_approved_resolved_outcomes_present | open_no_real_resolved_outcomes | owner_input | 0 valid resolved forecasts from input validation; 0 real resolved outcomes in claim governance. |
| real_comparable_baselines_present | open_no_real_comparable_baselines | owner_input | 0 valid baselines; 0 real baseline comparisons; 0/3 benchmark baselines have source URLs and sample sizes. |
| sample_size_and_reliability_bins_ready | open_sample_only_or_underpowered | owner_input | ledger mode=sample_fixture; ledger status=not_launch_proof; max source sample size=6/25; reliability-ready sources=0; sample_only=true. |
| leakage_and_contamination_review_passed | open_leakage_review_not_ready | owner_input | 0/8 leakage controls ready; leakage_review_passed=false. |
| benchmark_comparison_usable | open_benchmark_not_claim_proof | owner_input | scoring_ready=false; benchmark_status=sample_only_not_launch_proof; comparisons=15; source-backed baselines=0/3. |
| hosted_and_rls_evaluation_boundary_ready | open_hosted_or_security_boundary_not_ready | hosted_live | hosted_ready=false; rls_tenant_isolation_proof_ready=false. |
| accuracy_claim_language_still_blocked | passed | repo_artifact | accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false. |

## Current Forecasting Science Sources

| Source | URL | Requirement |
|---|---|---|
| ForecastBench | https://www.forecastbench.org/about/ | Dynamic, continuously updated, contamination-resistant forecasting benchmark with human comparison groups. |
| ForecastBench paper | https://arxiv.org/abs/2409.19839 | Compare ML systems with expert forecasters, the public, and other LLMs on forecast questions. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Evaluate on open/resolved forecasting questions and compare with pro/community human baselines where humans and bots both forecast. |
| NIST AI Risk Management Framework | https://www.nist.gov/itl/ai-risk-management-framework | Use documented test, evaluation, verification, validation, monitoring, and risk-management evidence before trust claims. |
| NIST GenAI evaluation program | https://ai-challenges.nist.gov/genai | Treat evolving benchmark construction and measurement science as part of generative-AI evaluation rather than static demo proof. |

## Active Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| owner_approved_resolved_outcomes_missing | P1 | active | Owner-approved pre-resolution forecast export with resolved outcomes and explicit inclusion/exclusion rules. |
| real_human_model_or_market_baselines_missing | P1 | active | Comparable human/community/pro/model/market baselines with source URLs, timestamps, and sample sizes. |
| sample_size_and_reliability_underpowered | P1 | active | At least the protocol minimum sample size and non-empty reliability bins for each scored source used in a claim. |
| leakage_and_contamination_review_not_passed | P1 | active | Adversarial leakage review covering pre-resolution timestamps, retrieval cutoffs, benchmark contamination, and baseline comparability. |
| benchmark_comparison_not_claim_proof | P1 | active | Scoring validator passes on approved export with real comparable baselines and usable benchmark status. |
| hosted_and_security_evaluation_boundary_missing | P1 | active | Hosted calibration/release proof and RLS/evaluation-table boundary proof. |
| owner_approved_accuracy_claim_language_missing | P2 | active | Owner-approved claim tier and buyer-safe language before any external use. |

## Proof Boundary

This validator maps the repo forecast evidence to current forecasting evaluation practice. It proves framework alignment and mechanics only; it does not prove prediction accuracy, benchmark superiority, or world-class forecasting.

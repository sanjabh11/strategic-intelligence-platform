# Forecast Claim Governance - 2026-06-06

## Decision

Status: `forecast_claim_governance_ready_not_accuracy_proof`.

This artifact makes prediction-accuracy claim rules explicit. It does not prove prediction accuracy, hosted calibration, external benchmark superiority, buyer acceptance, or world-class forecasting performance.

Current accuracy proof score remains **35%**. Real resolved outcomes attached here: **0**. Real baseline comparisons attached here: **0**.

Input validation status: **accuracy_input_validation_ready_no_real_rows** with **0** valid resolved forecast rows, **0** valid baseline rows, and ready-for-scoring **false**.

Leakage review status: **forecast_leakage_review_validation_ready_no_real_forecast_rows** with **0/8** controls ready, **0** unresolved issues, **0** high/critical risk rows, and ready-for-accuracy-claim-review **false**.

Allowed current claim: **Forecast scoring and benchmark-comparison mechanics exist locally, with sample fixtures only.**

Prohibited current claim: **World-class accurate predictions.**

## Acceptance Thresholds

| Gate | Current Status | Allowed Claim | Prohibited Claim |
|---|---|---|---|
| engineering_fixture_mechanics | pass_mechanics_only | Forecast scoring and benchmark-comparison mechanics exist locally. | The app is accurate, superior, calibrated in production, or world-class. |
| scoring_output_validation | blocked_scoring_validation_not_ready | Scoring outputs are ready for owner claim review. | Sample scoring outputs prove prediction accuracy or benchmark superiority. |
| pilot_internal_accuracy_claim | blocked_real_data_missing | Internal pilot accuracy has been measured on the named sample. | External superiority or world-class prediction accuracy. |
| external_benchmark_aware_claim | blocked_real_benchmark_missing | Compares against named external baselines on the documented sample. | Generalized best-in-world prediction claims. |
| world_class_prediction_claim | blocked_multiple_independent_proofs_missing | No world-class claim is currently allowed. | World-class accurate predictions. |

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| accuracy_input_validation_not_passed | P1 | active | Validated owner-approved forecast and baseline inputs with pre-resolution timestamps, resolution criteria, exclusion review, source URLs, and comparable baseline metadata. |
| real_resolved_outcomes_missing | P1 | active | Owner-approved export of pre-resolution forecasts and resolved outcomes. |
| real_baselines_missing | P1 | active | Comparable human/community/pro/market or external baselines with source URLs and timestamps. |
| leakage_review_missing | P1 | active | Adversarial leakage/contamination review for scored forecasts and baseline mapping is not ready; docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json status is forecast_leakage_review_validation_ready_no_real_forecast_rows with 0/8 controls ready and 5 active validation holds. |
| forecast_scoring_validation_not_passed | P1 | active | Forecast scoring evidence validation is not ready; docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json status is forecast_scoring_evidence_validation_sample_only_not_claim_proof with 7 active holds. |
| hosted_calibration_and_security_missing | P1 | active | Hosted calibration smoke, RLS/evaluation-table proof, and redacted hosted evidence. |
| claim_language_not_owner_approved | P2 | active | Owner-approved claim tier and copy review before external use. |

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
| ForecastBench | https://www.forecastbench.org/about/ | Use future-event, contamination-resistant forecast capture and human comparison groups before any world-class AI forecasting claim. |
| ForecastBench research paper | https://arxiv.org/abs/2409.19839 | Treat leakage avoidance and expert/human benchmark comparison as scientific evaluation requirements. |
| Metaculus FutureEval | https://www.metaculus.com/futureeval/ | Continuously updated AI forecasting benchmarks compare AI forecasts with human and bot baselines over resolved real-world questions. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Use high-quality decision-relevant questions, scoring rules, and temporal controls before market-facing AI accuracy claims. |
| NIST AI Risk Management Framework | https://www.nist.gov/itl/ai-risk-management-framework | Map forecast claims to governed measurement and managed-risk evidence, not unqualified promotional language. |

## Required Owner Inputs

1. Approve or edit the minimum sample size and pilot caveat threshold.
2. Provide an owner-approved resolved forecast export made before resolution.
3. Provide real comparable baseline rows or approve a documented comparable mapping.
4. Run accuracy input validation and clear row-level schema, timestamp, source, sample-size, placeholder, and comparability issues before scoring.
5. Fill and pass the leakage/contamination review register for pre-resolution timestamps, source cutoffs, retrieval cutoffs, baseline comparability, benchmark contamination, training/evaluation overlap, ambiguous outcomes, and claim-tier copy boundaries.
6. Run forecast scoring evidence validation after calibration ledger and benchmark comparison outputs are generated.
7. Identify resolution-source URLs and exclusion rules for every scored question.
8. Approve hosted calibration/security smoke scope before operational buyer claims.
9. Approve the exact market language tier before outreach or buyer decks.

## Next Commands After Owner Data

1. `npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-export.csv> --baseline-csv <owner-approved-baseline.csv> --json-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.json --md-output docs/launch-readiness/accuracy-evidence-input-validation-approved-<date>.md --csv-output docs/launch-readiness/accuracy-evidence-input-validation-checklist-approved-<date>.csv --min-sample-size 50`
2. `npm run audit:forecast:leakage-review -- --register docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv --accuracy-input-validation docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json --json-output docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json --md-output docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.md --csv-output docs/launch-readiness/forecast-leakage-review-validation-checklist-2026-06-06.csv --update-evidence`
3. `npm run audit:calibration:ledger -- --input <owner-approved-resolved-export.json-or-csv> --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --min-sample-size 50 --bins 5`
4. `npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --baseline <owner-approved-baseline.json> --output docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json`
5. `npm run audit:forecast:validate-scoring -- --calibration-ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --benchmark-comparison docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json --accuracy-input-validation docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json --leakage-review-validation docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json --json-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv --update-evidence`
6. `npm run audit:forecast:claim-governance -- --json-output docs/launch-readiness/forecast-claim-governance-2026-06-06.json --md-output docs/launch-readiness/forecast-claim-governance-2026-06-06.md --csv-output docs/launch-readiness/forecast-claim-governance-checklist-2026-06-06.csv`
7. `npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md`

## Proof Boundary

This is an internal governance and release-hold artifact. It is buyer-useful for showing discipline, but it is not buyer-facing proof of accuracy until real resolved outcomes, real baselines, leakage review, hosted proof, and owner-approved claim language are attached.

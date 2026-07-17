# Accuracy Evidence Input Validation - 2026-06-06

## Decision Boundary

Status: `accuracy_input_validation_ready_no_real_rows`.

This artifact validates owner-supplied resolved-forecast and baseline inputs before scoring. It is not prediction-accuracy proof, benchmark superiority proof, hosted proof, or buyer proof.

Forecast rows loaded: **0**. Valid resolved forecast rows: **0**. Baseline rows loaded: **0**. Valid baselines: **0**.

Accuracy claim allowed: **false**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
| forecast_schema_present | passed | Forecast schema includes 13 required columns. | repo_artifact |
| baseline_schema_present | passed | Baseline schema includes 10 required columns. | repo_artifact |
| owner_rows_present | open_no_real_rows | 0 forecast rows and 0 baseline rows loaded. | owner_input |
| minimum_resolved_forecast_rows | open_no_real_rows | 0 valid resolved forecast rows; required 25. | owner_input |
| binary_resolution_probability_and_timestamp_quality | open_no_real_rows | 0/0 forecast rows pass binary outcome, 0-1 probability, pre-resolution timestamp, resolution-source, criteria, and exclusion-review checks. | owner_input |
| comparable_baseline_present | open_no_real_rows | 0/0 baseline rows pass Brier, sample-size, source, scope, timestamp, and comparability checks. | owner_input |
| placeholder_or_sample_rows_absent | open_no_real_rows | 0 forecast placeholder rows and 0 baseline placeholder rows detected. | owner_input |
| ready_for_scoring_not_accuracy_proof | open_no_real_rows | Inputs are only ready for calibration and benchmark scoring after all prior gates pass; scoring still remains a separate artifact and hosted/security proof remains separate. | repo_artifact |

## Row Issues

| Type | Row | Field | Severity | Problem |
|---|---:|---|---|---|
| none | - | - | - | - |

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
| NIST AI RMF | https://www.nist.gov/itl/ai-risk-management-framework | Use governed measurement and risk management before relying on AI prediction claims. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Pre-resolution forecasts, proper scoring rules, and human/community baselines are required for credible forecasting evaluation. |
| ForecastBench | https://www.forecastbench.org/about/ | Dynamic, contamination-resistant, continuously updated forecasting benchmarks keep accuracy claims tied to unresolved-when-forecast questions. |

## Next Commands After Validation Pass

1. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input docs/launch-readiness/approved-resolved-forecast-export-template-2026-06-06.csv --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --min-sample-size 25 --bins 5`
2. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --baseline docs/launch-readiness/forecast-baseline-template-2026-06-06.csv --output docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json`
3. `Re-run audit:forecast:claim-governance and audit:commercial:confidence after scored approved artifacts exist.`

## Proof Boundary

Passing this validator only means the inputs are ready to score. It still does not prove accuracy until calibration, benchmark comparison, leakage review, hosted/security proof, and owner-approved claim language are attached.

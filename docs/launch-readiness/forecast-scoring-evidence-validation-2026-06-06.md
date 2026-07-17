# Forecast Scoring Evidence Validation - 2026-06-06

## Decision Boundary

Status: `forecast_scoring_evidence_validation_sample_only_not_claim_proof`.

This artifact validates calibration-ledger and benchmark-comparison outputs before prediction-accuracy claims can be reviewed. It is not buyer validation, hosted proof, security proof, independent benchmark certification, or world-class prediction proof.

Scoring output ready for claim review: **false**. Accuracy claim allowed: **false**. World-class prediction claim allowed: **false**.

Ledger mode: **sample_fixture**. Ledger status: **not_launch_proof**. Benchmark status: **sample_only_not_launch_proof**.

Included points: **30**. Max source sample size: **6**. Baselines loaded: **3**. Comparisons made: **15**.

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
| scoring_artifacts_present | passed | Calibration ledger exists=true; benchmark comparison exists=true. | repo_artifact |
| approved_export_used | open_sample_or_no_real_scoring | Calibration ledger mode is sample_fixture; approved_export or approved_owner_export is required for claim review. | owner_input |
| ledger_commercial_status_usable | open_sample_or_no_real_scoring | Calibration ledger commercial_claim_status=not_launch_proof; max source sample size 6/25. | repo_artifact |
| scoring_sample_size_and_reliability_bins | open_sample_or_no_real_scoring | 0/5 sources meet sample-size and reliability-bin requirements; included points=30. | repo_artifact |
| benchmark_comparison_usable | open_sample_or_no_real_scoring | Benchmark status=sample_only_not_launch_proof; baselines=3; comparisons=15. | repo_artifact |
| baseline_source_and_comparability_present | open_sample_or_no_real_scoring | 0/3 baselines have source URLs and positive sample sizes. | owner_input |
| accuracy_inputs_validated_before_scoring | open_sample_or_no_real_scoring | Accuracy input validation status=accuracy_input_validation_ready_no_real_rows with 0 valid forecasts, 0 valid baselines, and 6 active holds. | owner_input |
| leakage_review_passed_before_claim_review | open_sample_or_no_real_scoring | Leakage review status=forecast_leakage_review_validation_ready_no_real_forecast_rows; ready controls 0/8; active holds 5. | owner_input |
| claim_language_still_blocked | passed | Forecast claim governance approved_world_class_claim=false. | repo_artifact |

## Current Source Alignment

| Source | URL | Alignment |
|---|---|---|
| ForecastBench | https://forecastingresearch.org/research/forecastbench | Use dynamic, future-event forecasting questions and baseline comparison before any AI forecasting accuracy claim. |
| ForecastBench docs | https://www.forecastbench.org/docs/ | Use Brier-style scoring, question-set methodology, resolved forecasts, and ranking caveats for fair benchmark comparisons. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Compare AI forecasts with human/community/pro baselines on questions forecast before the answers are known. |
| NIST AI RMF Core Measure | https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ | Performance measurement needs documented uncertainty, benchmark comparison, and reporting before system claims are relied upon. |

## Next Commands After Owner Data

1. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-export.csv> --baseline-csv <owner-approved-baseline.csv> --min-sample-size 25`
2. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --update-evidence`
3. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-export.json-or-csv> --source-mode approved_export --min-sample-size 25`
4. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --baseline <owner-approved-baseline.json-or-csv>`
5. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring -- --calibration-ledger docs/launch-readiness/resolved-forecast-calibration-ledger-2026-06-06.json --benchmark-comparison docs/launch-readiness/forecast-benchmark-comparison-2026-06-06.json --accuracy-input-validation docs/launch-readiness/accuracy-evidence-input-validation-2026-06-06.json --leakage-review-validation docs/launch-readiness/forecast-leakage-review-validation-2026-06-06.json --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json --json-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json --md-output docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.md --csv-output docs/launch-readiness/forecast-scoring-evidence-validation-checklist-2026-06-06.csv --update-evidence`
6. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:claim-governance`
7. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence`

## Proof Boundary

Passing this validator means scoring outputs are ready for owner claim review. It still does not prove world-class forecasting, hosted operational behavior, security, buyer validation, or independent benchmark certification.

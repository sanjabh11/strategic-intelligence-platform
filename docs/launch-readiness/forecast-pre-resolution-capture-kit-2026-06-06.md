# Forecast Pre-Resolution Capture Kit - 2026-06-06

## Decision Boundary

Status: `forecast_pre_resolution_capture_kit_ready_not_accuracy_proof`.

This kit starts the evidence clock for future prediction-accuracy proof. It is not accuracy proof, benchmark proof, hosted proof, buyer validation, or world-class forecasting evidence.

## Owner Inputs

| Artifact | Minimum Rows | Purpose | Owner Rule |
|---|---:|---|---|
| docs/launch-readiness/forecast-question-register-template-2026-06-06.csv | 25 | Register forecast questions before outcomes are known. | Every question needs resolution criteria, expected resolution source, ambiguity policy, exclusion rule, and decision relevance before the first app forecast snapshot is captured. |
| docs/launch-readiness/forecast-pre-resolution-snapshot-template-2026-06-06.csv | 25 | Capture app/model/team probabilities before resolution. | Every probability needs prediction_timestamp, evidence_bundle_ref, prompt_or_policy_version, retrieval_cutoff, and source_cutoff. Post-resolution or timestamp-missing rows cannot support accuracy claims. |
| docs/launch-readiness/forecast-baseline-snapshot-template-2026-06-06.csv | 1 | Capture comparable baseline probabilities before resolution. | Every baseline probability needs source URL or documented source, timestamp policy, and comparability notes before benchmark comparison. |

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
| pre_resolution_question_register_template_ready | passed | repo_artifact | 17 required question-register columns generated. | Owner fills at least 25 planned forecast questions before relying on pilot accuracy claims. |
| pre_resolution_forecast_snapshot_template_ready | passed | repo_artifact | 14 required pre-resolution snapshot columns generated. | Capture each probability before scheduled close/resolution with retrieval and source cutoff timestamps. |
| pre_resolution_baseline_snapshot_template_ready | passed | repo_artifact | 11 baseline-snapshot columns generated. | Capture comparable human, community, pro, market, or model baseline probabilities before resolution. |
| resolved_scoring_boundary_preserved | passed | repo_artifact | The kit starts admissible evidence collection but does not mark any row resolved or score any claim. | After outcomes resolve, convert owner-approved rows to the resolved export and run validation/scoring gates. |
| forecast_execution_readiness_linked | passed | repo_artifact | docs/launch-readiness/forecast-evaluation-execution-readiness-2026-06-06.json status=forecast_evaluation_execution_ready_for_owner_export_no_real_outcomes; execution_ready_for_owner_resolved_export=true. | Use this kit as the starting evidence register for the forecast execution-readiness lane. |

## Owner Action Order

1. Choose at least 25 binary questions across the five commercial niches before outcomes are known.
2. Fill the question register with resolution criteria, expected resolution source, ambiguity policy, exclusion rule, and decision relevance.
3. Capture app/model/team probabilities in the pre-resolution snapshot template before each scheduled close/resolution.
4. Capture comparable human/community/pro/model/market baseline probabilities before resolution where available.
5. Freeze or archive the completed pre-resolution packet so later resolved exports can prove timestamp order and leakage boundaries.
6. After outcomes resolve, convert eligible rows into the approved resolved forecast export and run accuracy input, leakage, calibration, benchmark, science, claim consistency, and commercial confidence validators.

## Next Commands After Resolution

1. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:accuracy:validate-inputs -- --forecast-csv <owner-approved-resolved-forecast-export.csv> --baseline-csv <real-human-community-pro-baseline.csv> --min-sample-size 25`
2. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:leakage-review -- --register docs/launch-readiness/forecast-leakage-review-register-2026-06-06.csv --accuracy-input-validation <approved-accuracy-input-validation.json> --forecast-claim-governance docs/launch-readiness/forecast-claim-governance-2026-06-06.json`
3. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-forecast-export.json-or-csv> --source-mode approved_export --min-sample-size 25 --bins 5`
4. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger <approved-calibration-ledger.json> --baseline <real-human-community-pro-baseline.json-or-csv>`
5. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:validate-scoring && npm run audit:forecast:validate-science && npm run audit:commercial:confidence`

## Proof Boundary

Proves: `The repo now has a pre-resolution evidence packet for starting admissible forecast collection before outcomes are known.`; `The packet preserves timestamp, retrieval cutoff, source cutoff, resolution criteria, ambiguity, exclusion, and baseline comparability requirements.`.

Does not prove: `Any forecast outcome, calibration score, Brier score, baseline superiority, hosted runtime proof, enterprise trust proof, buyer validation, or world-class prediction claim.`; `That any owner-filled pre-resolution rows currently exist.`.

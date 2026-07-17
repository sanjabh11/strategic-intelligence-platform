# Forecast Evaluation Protocol - 2026-06-06

## Status

Status: `evaluation_protocol_ready_not_accuracy_proof`.

This protocol is not prediction-accuracy proof. It defines the evidence path required before the app can move beyond calibration-aware decision support.

Current accuracy gate score: **35%**.

## Protocol Stages

| Stage | Owner | Required Artifact | Pass Condition | Claim Boundary |
|---|---|---|---|---|
| question_registration | Product owner plus evaluation reviewer | forecast question register with resolution criteria | Each question has binary or explicitly typed outcome, close time, resolution source, ambiguity handling, and exclusion rule before forecasts are scored. | No question without pre-registered resolution criteria can support accuracy claims. |
| pre_resolution_forecast_capture | Forecast system operator | immutable forecast snapshot or approved export | Every scored probability has a timestamp strictly before resolution and records source_id, model/policy, prompt or workflow version, and evidence bundle reference. | Post-resolution, edited, or timestamp-missing probabilities are excluded. |
| owner_approved_export | Repo owner or data steward | approved resolved forecast export | At least 25 binary resolved rows exist for one scored source before first pilot accuracy reporting. | Below the sample threshold, reports are mechanics proof only. |
| calibration_and_brier_scoring | Evaluation reviewer | calibration ledger with source summaries and reliability bins | Brier score, sample size, reliability bins, excluded rows, and calibration caveats are reported with 5 planned bins unless owner changes the protocol. | Brier/reliability metrics support calibration-aware reporting, not superiority by themselves. |
| baseline_comparison | Evaluation reviewer | benchmark comparison report | App forecasts are compared with explicit trivial, human/community/pro, market, or external baselines on same or documented comparable questions. | No world-class language without real comparable baselines and source URLs. |
| leakage_and_contamination_review | Adversarial reviewer | leakage review notes | Review confirms forecasts were made before outcomes, retrieval sources were not post-resolution-only, and benchmark questions were not trained/evaluated with known answers. | Any unresolved leakage concern downgrades the result to internal diagnostic only. |
| hosted_and_security_boundary | Security and runtime owner | hosted smoke and RLS/evaluation-table proof | Hosted calibration/release jobs and evaluation-table access boundaries are verified before public buyer claims. | Local scoring can support internal readiness, not hosted/commercial claims. |
| claim_language_review | Commercial owner | approved copy review | Market copy maps to the achieved evidence tier and keeps uncertainty, sample size, and baseline scope visible. | The default allowed phrase remains calibration-aware decision support. |

## Metric Suite

| Metric | Purpose | Required For Claim | Interpretation |
|---|---|---|---|
| brier_score | Primary binary probability accuracy score. | yes | Lower is better; report sample size and source_id with every score. |
| reliability_bins | Calibration check across probability buckets. | yes | Report observed frequency, count, and calibration error for non-empty bins. |
| brier_skill_vs_baseline | Shows whether the app beats a specific baseline. | yes | Only meaningful when baseline questions and sample scope are comparable. |
| coverage_and_abstention | Prevents cherry-picking only easy questions. | yes | Report how many eligible questions were scored, excluded, unresolved, ambiguous, or abstained. |
| time_to_update_or_forecast_age | Shows whether forecasts were made early enough to matter. | no | Older standing forecasts and late forecasts should be separated when buyer decisions depend on lead time. |
| decision_relevance | Connects accuracy to the strategic decision workflow. | no | Track whether a question informed a buyer action, review decision, or forecast registry handoff. |

## Baseline Policy

| Baseline Type | Examples | Minimum Evidence | Allowed Claim |
|---|---|---|---|
| trivial | 0.5 binary prior, historical base rate when well-defined | baseline formula and sample scope | beats a trivial baseline only |
| internal_human_or_team | analyst estimate, team mean, community prediction mean from approved export | same question set, timestamp before resolution, sample size, and role labels | compares favorably to internal baseline on this sample |
| external_human_community_or_pro | Metaculus community/pro baseline, Good Judgment/custom forecaster baseline where available | source URL, same or explicitly comparable question mapping, sample size, and scoring method | compared with an external forecasting baseline on a documented question set |
| market_or_benchmark | prediction-market implied probability, ForecastBench-style dynamic benchmark where comparable | de-vig or conversion method when applicable, timestamp, source URL, and benchmark protocol notes | benchmark-aware comparison; no broad superiority unless independently reviewed |

## Claim Tiers

| Tier | Minimum Conditions | Allowed Language | Prohibited Language |
|---|---|---|---|
| mechanics_only | sample fixture or incomplete approved export; no real comparable baseline; hosted/security proof absent | calibration and benchmark mechanics are implemented | accurate predictions, best-in-class forecasting, world-class forecasting |
| pilot_internal_accuracy | owner-approved export has at least 25 binary resolved rows for one scored source; Brier score and reliability bins reported; exclusions and ambiguity rules attached | internal pilot calibration report on an approved sample | generalizable or world-class accuracy |
| buyer_safe_calibration_claim | approved export scored; real comparable human/community/pro/external baseline attached; leakage review passed; sample size and caveats visible in buyer packet | calibration-aware forecasting workflow with measured performance on a documented sample | unqualified prediction superiority |
| world_class_review_candidate | multi-domain resolved sample is large enough for stable buyer review; human/pro/community or benchmark baselines are independently comparable; hosted run, RLS/evaluation-table boundary, and adversarial review pass; claim language is reviewed against current benchmark context | candidate for world-class forecasting review | world-class accurate predictions without independent review and repeatability |

## Leakage Controls

- Forecast timestamp must be before resolution timestamp.
- Resolution source URL or notes must be attached for every included row.
- Post-resolution retrieval, rationale, or analyst notes cannot be used to generate the scored probability.
- Synthetic/sample fixtures must remain tagged source-mode sample_fixture.
- Question edits after forecast close must be versioned or excluded.
- Comparable baselines must use the same questions or a documented mapping.
- Any confidential buyer, user, credential, or direct personal contact/payment data must be redacted before artifacts are committed.

## Current Source Alignment

| Framework | Source | Protocol Implication |
|---|---|---|
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology | Use real future-outcome questions and compare with community/pro/human baselines where both humans and bots made forecasts. |
| ForecastBench | https://www.forecastbench.org/about/ | Prefer dynamic, contamination-resistant questions whose answers were unknown at forecast time, with human comparison groups where available. |
| ForecastBench documentation | https://www.forecastbench.org/docs/ | Track difficulty-adjusted Brier or comparable Brier-style scoring and ranking stability rather than one-off anecdotes. |
| Metaculus scores FAQ | https://www.metaculus.com/help/scores-faq/ | Use proper scoring rules so incentives reward sincere probabilities rather than overconfident predictions. |
| NIST AI RMF Measure/Manage | https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ | Document measurable performance changes, field data, monitoring, and risk-response decisions before relying on AI-system claims. |

## Next Commands After Owner Inputs

1. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:calibration:ledger -- --input <owner-approved-resolved-forecast-export.json-or-csv> --source-mode approved_export --output docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --min-sample-size 25 --bins 5`
2. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:benchmark -- --ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --baseline <real-comparable-baseline.json-or-csv> --output docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json`
3. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:forecast:protocol -- --calibration-ledger docs/launch-readiness/resolved-forecast-calibration-ledger-approved-<date>.json --benchmark-comparison docs/launch-readiness/forecast-benchmark-comparison-approved-<date>.json --accuracy-intake-kit docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json`
4. `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:commercial:confidence -- --json-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.json --md-output docs/launch-readiness/commercial-confidence-gate-2026-06-06.md`

## Proof Boundary

This protocol defines how to produce prediction-accuracy evidence. It is not accuracy proof, benchmark proof, hosted proof, or world-class forecasting evidence until owner-approved resolved forecasts and real comparable baselines are scored under the protocol.

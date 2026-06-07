# Prediction Benchmark Public Baseline Mapping - 2026-06-07

Status: `public_baseline_mapping_completed_not_accuracy_proof`

This read-only scan compares app probabilities with public prediction-market candidates where available. It does not prove accuracy, benchmark superiority, top-three status, or hosted app behavior.

## Summary

| Metric | Value |
|---|---:|
| Questions checked | 10 |
| Public candidate rows | 1653 |
| Same-question candidates | 0 |
| Close public proxies | 0 |
| Diagnostic-only rows | 1653 |
| Accuracy claim allowed | false |
| Top-three claim allowed | false |

## App Vs Public Candidate Snapshot

| # | Question ID | App Probability | Best Public Candidate | Candidate Probability | Mapping Tier | App Gap | Claim Status |
|---:|---|---:|---|---:|---|---:|---|
| 1 | pbq-geo-escalation-001 | 0.524696 | forecastbench | 0.495 | not_comparable | 0.029696 | no_same_question_public_baseline_found |
| 2 | pbq-election-policy-002 | 0.552632 | forecastbench | 0.595 | weak_public_proxy | -0.042368 | no_same_question_public_baseline_found |
| 3 | pbq-fed-rates-003 | 0.54572 | polymarket | 0.0005 | weak_public_proxy | 0.54522 | no_same_question_public_baseline_found |
| 4 | pbq-energy-brent-004 | 0.577328 | manifold | 0.9549064276674347 | weak_public_proxy | -0.377578 | no_same_question_public_baseline_found |
| 5 | pbq-gold-safe-haven-005 | 0.537872 | forecastbench | 0.0855 | not_comparable | 0.452372 | no_same_question_public_baseline_found |
| 6 | pbq-equity-drawdown-006 | 0.58352 | polymarket | 1 | weak_public_proxy | -0.41648 | no_same_question_public_baseline_found |
| 7 | pbq-fx-sovereign-007 | 0.570056 | forecastbench | 0.495 | weak_public_proxy | 0.075056 | no_same_question_public_baseline_found |
| 8 | pbq-trade-dispute-008 | 0.606416 | forecastbench | 0.8169350142935761 | not_comparable | -0.210519 | no_same_question_public_baseline_found |
| 9 | pbq-climate-disaster-009 | 0.575456 | forecastbench | 0.8250000000000001 | not_comparable | -0.249544 | no_same_question_public_baseline_found |
| 10 | pbq-ai-regulation-010 | 0.575384 | forecastbench | 0.495 | not_comparable | 0.080384 | no_same_question_public_baseline_found |

## Provider Status

| Provider | Status | Queries | Candidates | Error |
|---|---:|---:|---:|---|
| polymarket | queried | 30 | 1559 |  |
| manifold | queried | 40 | 14 |  |
| kalshi | queried | 18 | 0 |  |
| forecastbench | queried | 2 | 80 |  |

## ForecastBench Leaderboard Reference

These rows are method-level benchmark standings, not same-question results for this app's top-10 questions.

| Rank | Organization | Model | Overall | N | Brier Overall |
|---:|---|---|---:|---:|---:|
| 1 | ForecastBench | Superforecaster median forecast | 70.0 | 577 | 0.09 |
| 2 | xAI | Grok 4.20 (Beta, D) | 68.1 | 518 | 0.102 |
| 3 | xAI | Grok 4.20 (Beta, C) | 68.0 | 518 | 0.102 |
| 4 | Google DeepMind | green tree | 67.8 | 604 | 0.103 |
| 5 | Google DeepMind | yellow mouse | 67.4 | 604 | 0.106 |
| 6 | xAI | Grok 4.20 (Preview) | 67.3 | 1073 | 0.107 |
| 7 | Cassi-AI | Cassi ensemble_2_crowdadj | 67.2 | 2105 | 0.108 |
| 8 | OpenAI | GPT-5-2025-08-07 (zero shot with crowd forecast) | 66.6 | 3318 | 0.112 |
| 8 | Lightning Rod Labs | Foresight-32B | 66.6 | 1032 | 0.112 |
| 10 | xAI | Grok 4.20 (Beta, B) | 66.5 | 591 | 0.112 |

## Claim Boundary

Diagnostic probability gaps are not Brier scores and not accuracy evidence. Same-question scoring still requires resolved outcomes, leakage review, and verified baseline comparability.

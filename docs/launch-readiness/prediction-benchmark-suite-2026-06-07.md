# Prediction Benchmark Suite - 2026-06-07

Status: `benchmark_suite_ready_for_pre_resolution_capture_not_accuracy_proof`

This suite creates a top-10 benchmark register, abstained app snapshot placeholders, trivial prior controls, public baseline provider map, and scorecard scaffold. It does not prove prediction accuracy, top-three status, hosted behavior, buyer validation, or benchmark superiority.

## Summary

| Metric | Value |
|---|---:|
| Top-10 questions | 10 |
| App probabilities captured | 0 |
| Abstained app rows | 10 |
| Public/open providers mapped | 5 |
| Accuracy claim allowed | false |
| Top-three claim allowed | false |

## Top-10 Situations

| # | Category | Title | Question | Resolution Source |
|---:|---|---|---|---|
| 1 | geopolitical_escalation | Major conflict escalation monitor | Will the CFR Global Conflict Tracker classify at least one monitored conflict as worsening by 2026-09-30? | https://www.cfr.org/global-conflict-tracker |
| 2 | election_policy | G7 leadership change outcome | Will any G7 country install a new head of government through a national election or parliamentary confidence process by 2026-12-31? | https://www.idea.int/data-tools/data/election-database |
| 3 | central_bank_macro | Federal Reserve easing surprise | Will the FOMC target range upper bound be at least 50 basis points lower on 2026-09-30 than the range in force on 2026-06-07? | https://www.federalreserve.gov/monetarypolicy/openmarket.htm |
| 4 | energy_supply_shock | Brent crude upside shock | Will front-month Brent crude settle above USD 95 on any trading day by 2026-12-31? | https://www.ice.com/products/219/Brent-Crude-Futures/data |
| 5 | safe_haven_commodity | Gold safe-haven breakout | Will the LBMA PM gold price exceed USD 3800 per troy ounce on any fixing day by 2026-12-31? | https://www.lbma.org.uk/prices-and-data/precious-metal-prices |
| 6 | equity_volatility | S&P 500 drawdown risk | Will the S&P 500 close at least 10 percent below its 2026-06-07 reference close on any trading day by 2026-12-31? | https://www.spglobal.com/spdji/en/indices/equity/sp-500/ |
| 7 | fx_sovereign_risk | US dollar index upside risk | Will the US Dollar Index close above 110 on any trading day by 2026-12-31? | https://www.ice.com/products/194/US-Dollar-Index-Futures/data |
| 8 | trade_supply_chain | Major trade-dispute initiation | Will the WTO publish a new dispute involving the United States, European Union, or China as a complainant or respondent by 2026-12-31? | https://www.wto.org/english/tratop_e/dispu_e/dispu_status_e.htm |
| 9 | climate_disaster | Atlantic major hurricane occurrence | Will NOAA report at least one Atlantic named storm reaching Category 4 or 5 intensity by 2026-11-30? | https://www.nhc.noaa.gov/data/ |
| 10 | ai_cyber_regulation | EU AI Act high-risk timing change | Will the EU publish binding law by 2026-12-31 that delays the first application date for EU AI Act high-risk AI obligations? | https://eur-lex.europa.eu/eli/reg/2024/1689/oj |

## Public/Open Baselines

| Provider | Type | Access | Claim Boundary |
|---|---|---|---|
| ForecastBench | ai_forecasting_benchmark | public_methodology_external_submission | Methodology and ranking anchor, not automatic same-question baseline. |
| Metaculus FutureEval | ai_and_human_forecasting_benchmark | public_leaderboard_and_methodology | Compare only on shared or documented comparable resolved questions. |
| Polymarket | prediction_market | public_market_data_apis | Market-implied probability, not human/pro forecaster proof. |
| Manifold | social_prediction_market | public_api_and_data_dumps | Community-market baseline with social-market liquidity caveats. |
| Kalshi | regulated_event_market | public_market_data_api | Regulated market baseline where matching markets exist. |

## Challenger Lanes

| Lane | Mechanism | Promotion Gate |
|---|---|---|
| Current app registry and multi-agent role-weighted forecast | Use existing forecast registry, consensus, and calibration governance. | Default lane until a challenger wins on resolved same-question rows. |
| AIA-style LLM forecaster | Retrieval, base rates, decomposition, premortem, supervisor reconciliation, and statistical calibration. | Shadow-only until leakage review passes and holdout Brier/log loss beats current app lane. |
| Public market consensus | Use Polymarket, Manifold, and Kalshi implied probabilities when liquid and comparable. | Eligible as ensemble feature only; never a standalone world-class proof. |
| Macro, market, energy, and commodity time-series forecaster | Use Nixtla/StatsForecast-style probabilistic horizons for structured time-series questions. | Only for source-backed numeric or threshold questions with clean historical series. |
| Calibration and meta-ensemble | Use sigmoid/isotonic calibration, then stacking only after enough resolved rows. | No stacking before minimum resolved samples; per-domain calibration must be reported. |
| Online drift monitoring | Track changing evidence distributions and forecast-age risk. | Alerting lane, not direct probability source. |

## Next Commands

1. `npm run audit:forecast:benchmark-suite:validate -- --suite docs/launch-readiness/prediction-benchmark-suite-2026-06-07.json`
2. `npm run audit:forecast:validate-pre-resolution -- --question-register docs/launch-readiness/prediction-benchmark-questions-2026-06-07.csv --forecast-snapshot docs/launch-readiness/prediction-benchmark-app-snapshots-2026-06-07.csv --baseline-snapshot docs/launch-readiness/prediction-benchmark-baseline-snapshots-2026-06-07.csv --min-planned-questions 10`
3. `After real probabilities and outcomes exist, convert the approved rows to the resolved forecast export and run audit:calibration:ledger plus audit:forecast:benchmark.`

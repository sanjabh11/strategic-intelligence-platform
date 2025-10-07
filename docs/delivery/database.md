# Strategic Intelligence Data Sources

## Overview
This document catalogs all datasets feeding the strategic intelligence platform, including current implementation status, streaming cadence, and how each source improves prediction accuracy. References point to the code modules or functions that integrate each dataset.

## Active Dataset Integrations

| Dataset | Integration Location | Streaming / Sync | Primary Usage | Value Added to Predictions |
| --- | --- | --- | --- | --- |
| **GDELT (Global Database of Events, Language, and Tone)** | `supabase/functions/gdelt-stream/index.ts` | Live fetch every 15 minutes (JSON + SSE) | Generates real-time multi-actor strategic scenarios stored in `real_time_events` and fed into analysis via `parseEventToGameTheory()` | Keeps simulations aligned with emerging geopolitical actions, avoiding stale scenarios and improving responsiveness |
| **World Bank Indicators** | `supabase/functions/worldbank-sync/index.ts` | Manual + scheduled backfill (latest run `2025-10-07T07:26:24Z`) | Updates `strategic_patterns` and `strategy_outcomes` with `success_rate`, `empirical_confidence`, and `validation_metadata` | Grounds recommendations in 10-year historical performance to calibrate equilibrium payoffs accurately |
| **UN Comtrade** | `supabase/functions/analyze-engine/retrievalClient.ts` (`fetchUNComtrade`) | On-demand REST calls per analysis | Supplies bilateral trade totals and contextual snippets within provenance | Quantifies economic interdependence that influences payoff matrices and EVPI calculations |
| **IMF Macroeconomic Indicators** | `supabase/functions/analyze-engine/retrievalClient.ts` (`fetchIMFData`) | On-demand | Provides GDP/inflation metrics used in sensitivity analysis | Enhances EVPI and scenario risk scoring by incorporating macro stability signals |
| **Google Programmable Search (CSE)** | `supabase/functions/analyze-engine/retrievalClient.ts` (`fetchGoogleCSE`) | On-demand | Adds authoritative articles to evidence set | Raises citation diversity and credibility, supporting “Evidence backed” determinations |
| **Perplexity AI** | `supabase/functions/analyze-engine/retrievalClient.ts` (`fetchPerplexity`) | On-demand | Generates multi-source synthesized evidence for provenance | Ensures 4+ source threshold is met even in sparse domains, sustaining confidence scores |
| **Firecrawl Web Scraper** | `supabase/functions/firecrawl-research/index.ts` | On-demand | Captures web snapshots when APIs lack coverage | Provides fallback evidence so analyses remain verifiable |
| **Outcome Forecasting (Temporal)** | `supabase/functions/outcome-forecasting/index.ts` | On-demand | Produces `outcome_forecasts` time series returned to the client | Adds dynamic probability evolution, improving strategic timing recommendations |
| **Internal Real-Time Events Store** | `real_time_events` table (populated by `gdelt-stream`) | Continuous inserts | Persists structured scenarios (actors, pattern, strategy, timestamp) | Enables retrospective pattern learning to refine similarity scores |

## Partially Implemented / Planned Streams

| Dataset | Current State | Streaming Plan | Notes |
| --- | --- | --- | --- |
| **Financial Markets (Gold/Oil/Bitcoin)** | Function ready (`supabase/functions/market-stream/index.ts`) using free endpoints + mock fallback | SSE endpoint designed for 60-second updates once production API keys (e.g., Alpha Vantage) are provided | Supports Nash bargaining scenarios for commodity pricing; replace mock oil data with authenticated feed |
| **GDELT via BigQuery** | Stubbed in `fetchGDELTEvents()` | Swap mock array with direct BigQuery SQL query once `GDELT_GCP_PROJECT` credentials are configured | Current implementation simulates recent events for development |
| **Additional Sector Streams (Energy grids, cyber alerts)** | Not yet implemented | Future enhancement noted in `docs/Ph4.md` | Add after core streaming reaches production readiness |

## Accuracy Impact Summary

- **Historical baselines** (`worldbank-sync`, `fetchIMFData`) calibrate pattern success rates with empirical evidence, improving payoff reliability.
- **Real-time signals** (`gdelt-stream`, `market-stream`) inject current events, keeping scenario analysis aligned with live geopolitical and market conditions.
- **Economic context** (`fetchUNComtrade`, `fetchIMFData`) incorporates trade intensity and macro indicators, tightening EVPI and sensitivity outputs.
- **Evidence integrity** (`fetchGoogleCSE`, `fetchPerplexity`, `firecrawl-research`) maintains the 4+ source provenance requirement to sustain the "Evidence backed" badge.
- **Temporal modeling** (`outcome-forecasting`) enriches predictions with probability trajectories, informing timing and escalation strategies.

## References
- `docs/delivery/DEPLOYMENT_SUCCESS.md` – Deployment recap and dataset impact
- `docs/delivery/IMPLEMENTATION_COMPLETE_4_9.md` – Gap closures involving data integration
- `TOP_3_DATASETS_QUICKSTART.md` – Quick-start playbook for streaming datasets

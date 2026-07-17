# PBI-09: Game Theory Prediction Enhancement — Axelrod + LSTM Bias + Adversarial Counterfactual

## Objective
Integrate three game-theory-based prediction enhancements identified from X article research:
1. **Axelrod IPD Strategy Tournaments** — new capability (direct integration)
2. **LSTM + Game Theory Bias + Sentiment** — methodology borrow from StockSage pattern
3. **Adversarial Counterfactual Forecasting** — concept borrow from Cornell GT Forecasting

## Scope

### In Scope
- New `ipd_tournament` solver in `ml-service/solvers.py` using Axelrod library
- New `StrategyArena.tsx` frontend component with Labs routing
- New `forecast_bias.py` module in ML service for learned time-series + GT bias + sentiment
- Enhanced adversarial review in `multi-agent-forecast/index.ts` with explicit counterfactual generation
- Unit tests for all new solvers and endpoints
- Shadow-mode evaluation for LSTM bias layer

### Out of Scope
- Nashpy integration (already covered by existing solvers)
- GameFormer integration (autonomous driving domain mismatch)
- Stock price prediction (platform deprioritizes equities)
- New database migrations (frozen during MVP per PBI-06 drift note)
- PyTorch/TensorFlow dependency (use numpy/scikit-learn instead)

## Acceptance Criteria

| ID | Criterion | Verification |
|----|-----------|-------------|
| AC-1 | `solve_game_theory_framework("ipd_tournament", payload)` returns ranked strategies + evolutionary trajectory | `pytest test_game_theory.py::test_ipd_tournament` |
| AC-2 | `/labs/strategy-arena` route renders StrategyArena component with tournament UI | Manual browser verification |
| AC-3 | `multi-agent-forecast` response includes `adversarialReview.worstCaseCounterfactual` with probability, scenario, and triggers | curl edge function, verify JSON shape |
| AC-4 | `MultiAgentForecastPanel.tsx` displays worst-case counterfactual section | Manual browser verification |
| AC-5 | `/forecast/bias-adjusted` endpoint returns bias-adjusted probability curve | curl ML service |
| AC-6 | Shadow-mode Brier score for bias-adjusted forecasts ≤ heuristic baseline | Compare via shadow-model-refresh |
| AC-7 | No existing tests broken | `pytest ml-service/tests/` |
| AC-8 | No new database migrations required | Verify no schema changes |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Axelrod import latency | Medium | Curated 20-strategy subset, lazy import |
| LSTM overfitting on small geopolitical data | Medium | Strong regularization, Bayesian prior, min sample gate |
| Breaking multi-agent-forecast response shape | Low | Additive fields only, backward compatible |
| scikit-learn MLPRegressor insufficient vs LSTM | Low | Acceptable for shadow mode; upgrade to PyTorch later if needed |
| Frontend Labs tier gating | Low | Set minTier='pro' matching existing modules |

## Dependencies

- `axelrod` Python package (MIT license, pure Python + NumPy)
- No new npm packages needed
- No new database tables or migrations
- Existing `real_time_events` table for LSTM training data
- Existing `shadow-model-refresh` infrastructure for evaluation

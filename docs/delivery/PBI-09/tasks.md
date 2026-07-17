# PBI-09: Execution Tasks

## Phase 1: Adversarial Counterfactual Enhancement (Cornell concept borrow)

### Task 1.1: Add counterfactual generation to multi-agent-forecast
- **File**: `supabase/functions/multi-agent-forecast/index.ts`
- **Change**: Add `generateAdversarialCounterfactual()` function
- **Logic**: 
  - Extract risk agent's forecast (lowest probability among 4 agents)
  - Apply tail-risk multiplier: `worstCaseProb = riskAgent.probability - disagreementIndex * 0.15`
  - Generate counterfactual scenario description from contradiction points
  - Identify guarding triggers (what evidence assumption could fail)
- **Output fields**: `worstCaseScenario` (string), `worstCaseProbability` (number), `guardingTriggers` (string[])
- **Status**: PENDING

### Task 1.2: Extend adversarialReview response shape
- **File**: `supabase/functions/multi-agent-forecast/index.ts`
- **Change**: Add `worstCaseCounterfactual` object to `adversarialReview` in response
- **Constraint**: Additive only — do not modify existing `skepticProbability`, `contradictionPoints`, `missingEvidence`, `overconfidenceRisk`, `recommendation`
- **Status**: PENDING

### Task 1.3: Update frontend to display counterfactual
- **File**: `src/components/MultiAgentForecastPanel.tsx`
- **Change**: Add "Worst-Case Counterfactual" section rendering `worstCaseCounterfactual` fields
- **Status**: PENDING

### Task 1.4: Verify backward compatibility
- **Verification**: curl existing multi-agent-forecast endpoint, confirm all existing fields unchanged
- **Status**: PENDING

---

## Phase 2: Axelrod IPD Strategy Tournament (direct integration)

### Task 2.1: Add axelrod dependency
- **File**: `ml-service/requirements.txt`
- **Change**: Add `axelrod>=4.14,<5.0`
- **Status**: PENDING

### Task 2.2: Create IPD tournament solver
- **File**: `ml-service/solvers.py`
- **Change**: Add `solve_ipd_tournament(payload)` function
- **Logic**:
  - Accept: strategy_names (list), payoff_matrix (R, S, T, P values), turns, repetitions, seed
  - Map strategy names to Axelrod strategy classes (curated subset of ~20)
  - Run `axl.Tournament(players, turns=turns, repetitions=repetitions, seed=seed)`
  - Run `axl.Ecosystem(results).reproduce(100)` for evolutionary trajectory
  - Return: ranked_strategies, payoff_matrix, evolutionary_trajectory, summary_stats
- **Circuit breakers**: MAX_TURNS=500, MAX_STRATEGIES=16, MAX_REPETITIONS=50
- **Status**: PENDING

### Task 2.3: Register in dispatcher
- **File**: `ml-service/solvers.py`
- **Change**: Add `if normalized_framework == "ipd_tournament": return solve_ipd_tournament(payload)` to `solve_game_theory_framework()`
- **Status**: PENDING

### Task 2.4: Add unit test
- **File**: `ml-service/tests/test_game_theory.py`
- **Change**: Add `test_ipd_tournament_returns_ranked_strategies()` and `test_ipd_tournament_circuit_breaker()`
- **Status**: PENDING

### Task 2.5: Create StrategyArena frontend component
- **File**: `src/components/StrategyArena.tsx`
- **Logic**:
  - Strategy picker (multi-select from curated list)
  - Payoff matrix editor (R, S, T, P sliders)
  - Tournament config (turns, repetitions, seed)
  - Results visualization: ranked strategies bar chart, evolutionary trajectory line chart
  - Call ML service `/game-theory/solve` with framework="ipd_tournament"
- **Status**: PENDING

### Task 2.6: Extend labs catalog
- **File**: `src/lib/labsCatalog.ts`
- **Change**: 
  - Extend `SurfacedLabModule['id']` union to include `'strategy-arena'`
  - Add new module entry with minTier='pro', icon=Swords, href='/labs/strategy-arena'
- **Status**: PENDING

### Task 2.7: Add route in App.tsx
- **File**: `src/App.tsx`
- **Change**: Add `/labs/strategy-arena` route with LabAccessGate, mirroring existing `/labs/game-tree` pattern
- **Status**: PENDING

### Task 2.8: End-to-end verification
- **Verification**: Run pytest, start frontend, navigate to /labs/strategy-arena, run tournament
- **Status**: PENDING

---

## Phase 3: LSTM + Game Theory Bias + Sentiment (StockSage methodology borrow)

### Task 3.1: Create forecast_bias module
- **File**: `ml-service/forecast_bias.py`
- **Logic**:
  - `train_lstm_baseline(historical_data, lookback_window)` — numpy/scikit-learn MLPRegressor based time-series forecaster
  - `compute_game_theory_bias(actors, payoff_structure)` — calls existing solvers to compute strategic bias delta
  - `compute_sentiment_overlay(events_data)` — aggregates GDELT tone/sentiment from real_time_events
  - `ensemble_forecast(lstm_baseline, gt_bias, sentiment)` — weighted combination
  - Min sample gate: 100 data points required, fallback to heuristic if insufficient
- **Status**: PENDING

### Task 3.2: Add ML service endpoint
- **File**: `ml-service/main.py`
- **Change**: Add `/forecast/bias-adjusted` endpoint with `BiasAdjustedForecastRequest` model
- **Logic**: Accept scenario + historical data query, return bias-adjusted probability curve
- **Status**: PENDING

### Task 3.3: Wire into outcome-forecasting
- **File**: `supabase/functions/outcome-forecasting/index.ts`
- **Change**: Accept optional `biasAdjustedBaseline` in request, use as enhanced baseForecast when available
- **Status**: PENDING

### Task 3.4: Shadow-mode evaluation
- **File**: `ml-service/main.py`
- **Change**: Register bias-adjusted forecast as shadow model via existing `shadow-model-refresh` infrastructure
- **Logic**: Compare Brier scores of bias-adjusted vs. heuristic baseline over evaluation window
- **Status**: PENDING

### Task 3.5: Add unit tests
- **File**: `ml-service/tests/test_forecast_bias.py`
- **Change**: Test LSTM baseline, GT bias computation, sentiment overlay, ensemble, min sample gate
- **Status**: PENDING

### Task 3.6: Frontend display
- **File**: `src/components/StrategySimulator.tsx`
- **Change**: Add toggle to show bias-adjusted curve alongside heuristic baseline
- **Status**: PENDING

### Task 3.7: Shadow-mode verification
- **Verification**: Run shadow evaluation, compare Brier scores, confirm no regression
- **Status**: PENDING

---

## Phase 4: Documentation & Governance

### Task 4.1: Create PBI-09 delivery docs
- **Files**: `docs/delivery/PBI-09/prd.md` (DONE), `docs/delivery/PBI-09/tasks.md` (this file)
- **Status**: DONE

### Task 4.2: Update backlog
- **File**: `docs/delivery/backlog.md`
- **Change**: Add PBI-09 row
- **Status**: PENDING

### Task 4.3: Summary report
- **Status**: PENDING (after all phases complete)

# Geopolitical Predictions Goal

## Objective
Build a forecasting-grade multi-agent prediction engine inside the Strategic Intelligence Platform that turns evidence-backed strategic scenarios into explicit, adversarially reviewed probabilistic forecasts.

Target characteristics:
- structured forecast questions with explicit resolution criteria
- specialist-agent forecasts over a shared evidence bundle
- skeptic and adversarial review before consensus
- transparent champion/challenger aggregation
- eventual calibration against resolved outcomes using Brier score and directional accuracy

## Current Repo-Aligned Direction
The implementation path for this repository is not an external `geoforcecast_engine.py` harness. It is a native extension of the existing stack:
- React + TypeScript + Vite frontend
- Supabase edge functions for orchestration and strategic engines
- existing forecast registry and Brier-score tables
- existing retrieval-backed analysis flow in `analyze-engine`

The canonical blueprint now lives in:
- `docs/multi_agent_prediction_engine_blueprint.md`
- `docs/delivery/PBI-08/prd.md`

## First Production-Shaped Slice
The first justified slice is:
- a new `multi-agent-forecast` edge function
- integration into `useStrategyAnalysis`
- display of question package, specialist panel, adversarial review, challenger variants, and consensus in the live console UI
- no new schema migrations during the current MVP drift window

## Initial Specialist Roles
Baseline role set for the first slice:
- `geopolitics`
- `commodities`
- `macro`
- `risk`

Each role should emit:
- probability
- confidence
- thesis
- key drivers
- linked evidence ids
- objections / caveats

## Execution Checkpoints

### Checkpoint 1: Question Discipline
Every forecast must include:
- title
- explicit question
- time horizon
- primary resolution source
- fallback resolution rule
- question-quality assessment

### Checkpoint 2: Evidence Discipline
Every agent forecast must either:
- cite evidence ids from the shared retrieval bundle

or

- explicitly state that evidence is insufficient

### Checkpoint 3: Adversarial Discipline
Every forecast run must expose:
- contradiction points
- missing evidence
- overconfidence risk
- skeptic recommendation

### Checkpoint 4: Consensus Discipline
Every completed run must expose:
- champion consensus
- challenger variants
- disagreement index
- confidence band

### Checkpoint 5: Operational Discipline
This phase must:
- avoid new database migrations
- degrade gracefully when the new engine fails
- preserve the current analysis UX

## Adversarial Analysis
Primary failure modes to guard against:
- ambiguous questions that cannot be resolved fairly
- weak or low-diversity evidence bundles
- cosmetic role separation with little true disagreement
- overconfident consensus from heuristic weighting
- polished UI masking partial live-data coverage

## Metrics
Short-term success metrics:
- question quality score
- disagreement visibility
- evidence coverage
- analyst usefulness of adversarial review

Later scoring metrics:
- Brier score
- directional accuracy
- calibration by specialist role
- champion/challenger comparison on resolved forecasts

## Hard Constraints
- Do not edit `prepare.py`.
- Do not introduce schema churn in the current MVP slice unless explicitly re-scoped.
- Keep implemented reality separate from aspirational claims.

## Near-Term Plan
1. Finish the canonical orchestration slice in the current app.
2. Connect forecast outputs more directly to the forecast registry lifecycle.
3. Add calibration learning from resolved outcomes.
4. Replace remaining live-data mocks and partial stubs where they materially affect forecast quality.
5. Only then move toward self-improving swarm behavior and agent evolution.

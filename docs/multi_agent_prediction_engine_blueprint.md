# Multi-Agent Prediction Engine Blueprint

## Executive Summary
The current Strategic Intelligence Platform already contains many of the ingredients needed for a serious forecasting product, but they are distributed across separate services rather than assembled into a single forecasting-grade execution loop.

What is already real in the codebase:
- Retrieval-backed scenario analysis in `supabase/functions/analyze-engine`.
- Recursive equilibrium, symmetry mining, quantum, EVPI, temporal optimization, and outcome forecasting services.
- A public forecast registry with forecast creation, user predictions, history, and Brier-style score tracking.
- Forecast-related UI surfaces in `StrategyConsole`, `StrategySimulator`, and `ForecastRegistry`.

What is still missing:
- A canonical forecast question specification layer.
- Explicit question quality / resolution quality checks.
- A specialist-agent debate panel over the same evidence bundle.
- Built-in adversarial review before consensus.
- Champion/challenger comparison over consensus variants.
- A clean bridge from analysis output to future scoring against resolved outcomes.

The recommended path is not to replace the current platform. It is to add a canonical orchestration layer that sits on top of the existing analysis and forecasting primitives.

## Current Codebase Review

### Frontend Reality
The frontend is a React + TypeScript + Vite application with several meaningful surfaces already in place:
- `StrategyConsole.tsx` exposes analysis-engine selection and positions forecasting as an elite capability.
- `StrategySimulator.tsx` renders equilibrium, forecast, pattern matches, EVPI, and advanced strategic insights.
- `ForecastRegistry.tsx` already supports public forecasts, user predictions, and leaderboard display.
- `GeopoliticalDashboard.tsx`, `WhatIfSimulator.tsx`, and `HistoricalComparison.tsx` provide narrative and exploratory intelligence views.

Frontend shortcomings discovered during audit:
- Several advanced outputs are displayed as optional extras rather than being orchestrated as one coherent prediction workflow.
- Some forecast-adjacent UI blocks depend on heuristic or synthesized data.
- `WhatIfSimulator.tsx` remains a local heuristic simulation rather than a calibrated forecasting tool.
- `get-analysis-status` reconstructs only a minimal analysis shape, so the polling path is much weaker than the immediate response path.

### Backend / Edge Function Reality
The backend already includes a rich set of edge functions:
- `analyze-engine` for retrieval-backed scenario analysis and LLM synthesis.
- `outcome-forecasting` for probability curves over time.
- `recursive-equilibrium`, `quantum-strategy-service`, `symmetry-mining`, `information-value-assessment`, `temporal-strategy-optimization`, and `dynamic-recalibration` for specialized analysis.
- `brier-weighted-consensus` for weighted forecast aggregation over community predictions.
- `market-stream` and `gdelt-stream` for live-data oriented surfaces.

Backend shortcomings discovered during audit:
- The advanced services are chained from the frontend hook rather than orchestrated by a canonical backend forecasting workflow.
- `gdelt-stream` still simulates events rather than using a fully authoritative live feed.
- `market-stream` still includes partial mock/fallback behavior for some instruments.
- Several advanced services use heuristic or random components where production-grade calibration would eventually be required.
- `get-analysis-status` does not reconstruct the same richness as the direct analysis response.

### Data / Schema Reality
The schema already includes useful forecast-related structures:
- `forecasts`
- `forecast_predictions`
- `forecast_history`
- `forecast_scores`
- `outcome_forecasting_results`

Important constraint:
- `docs/delivery/PBI-06/drift_note.md` explicitly records database schema drift and a migration freeze during MVP.
- Therefore the first forecasting-engine slice should avoid new migrations.

## Capabilities vs Shortcomings

### Present Capabilities
- The platform can ingest a scenario, retrieve evidence, generate a structured strategic analysis, and augment it with multiple specialized engines.
- The platform can already display probability-oriented outputs in the UI.
- The platform already has the foundations for community forecasting and score tracking.
- The platform already has a pricing and access-control layer that can gate premium forecasting features.

### Present Shortcomings
- Forecasting is not yet a first-class workflow.
- The system does not force explicit forecast question design.
- Resolution criteria are not made explicit inside the analysis flow.
- Adversarial review is not a standard step.
- Consensus is not computed as a transparent panel-of-agents output inside the current analysis experience.
- Some data feeds and some engine internals still rely on stubs, mock data, or heuristic fallbacks.

## External Research Distillation
The external references point to four consistent principles.

### 1. Forecasts must be explicit and scoreable
The Good Judgment / superforecasting literature emphasizes precise probabilities, repeated updating, decomposition into sub-questions, and actual scoring rather than vague language.

Design implication for this repo:
- Every forecast should be turned into a structured question package with a measurable target, time horizon, stated resolution source, fallback resolution rule, and confidence bounds.

### 2. Forecast questions need resolution discipline
Forecast-question guidance emphasizes clarity, concision, unambiguous wording, alignment between title and resolution criteria, and fallback criteria if the primary source disappears.

Design implication for this repo:
- The forecasting engine needs a question-quality gate before agent debate.

### 3. Multi-agent debate improves reasoning and factual robustness
The multi-agent debate literature shows that multiple model instances critiquing and revising one another can improve reasoning and factuality over a single-pass answer.

Design implication for this repo:
- The forecasting layer should not be a single model answer. It should use specialist roles plus a skeptic/reviewer pass.

### 4. Production systems need champion/challenger governance
Champion/challenger guidance emphasizes shadow comparison, governed promotion, and continuous monitoring because lab behavior does not fully predict production behavior.

Design implication for this repo:
- The platform should compare consensus variants in shadow mode and later promote the best-calibrated one rather than trusting one aggregation rule forever.

## Target Architecture

### Layer 1: Forecast Question Specification
Input:
- scenario text
- retrieval bundle
- optional current forecast curve
- optional player/action structure

Output:
- canonical binary or directional question
- horizon
- resolution source
- primary and fallback resolution criteria
- question-quality score

This layer prevents the rest of the system from debating an ambiguous target.

### Layer 2: Evidence Normalization
Normalize retrievals into:
- source ids
- source classes
- snippet coverage
- evidence freshness
- evidence gaps

This becomes the shared evidence bundle for every specialist agent.

### Layer 3: Specialist Forecast Panel
Initial production-shaped role set:
- Geopolitics Agent
- Commodities Agent
- Macro Agent
- Risk Agent

Each agent should emit:
- probability
- confidence
- short thesis
- key drivers
- cited evidence ids
- missing information

This directly aligns with `docs/geopolical_predictions.md` while fitting the current codebase.

### Layer 4: Adversarial Review
A skeptic/reviewer pass should inspect:
- major disagreement between agents
- weak evidence coverage
- resolution ambiguity
- unmodeled failure modes
- overconfidence risk

Output:
- contradiction points
- failure modes
- missing evidence
- guardrails
- challenge score

### Layer 5: Consensus + Challenger Variants
The system should calculate:
- weighted specialist consensus
- equal-weight challenger
- trimmed-mean challenger
- skeptic-adjusted challenger

This enables shadow comparison before the system commits to one aggregation policy.

### Layer 6: Temporal Forecast Integration
The current `outcome-forecasting` service already generates a time series. The multi-agent layer should consume that output as one input, not replace it.

Recommended relationship:
- temporal model gives baseline curve
- specialist panel adjusts interpretation of the curve
- consensus summarizes the current decision-grade forecast

### Layer 7: Resolution and Scoring Loop
Short term:
- reuse existing `forecasts`, `forecast_predictions`, `forecast_history`, and `forecast_scores` structures later when moving from private engine outputs to public forecast questions.

Later phase:
- persist agent-level predictions per forecast question so the platform can learn which specialist or aggregation rule calibrates best.

## Recommended Execution Plan

### Phase 0: Audit and Blueprint
Deliverables:
- codebase review
- architecture blueprint
- PBI/task definition

Checkpoint:
- implemented reality and architecture target documented in `docs`

### Phase 1: Initial Orchestration Slice
Deliverables:
- new `multi-agent-forecast` edge function
- frontend integration in `useStrategyAnalysis`
- UI panel in `StrategySimulator`
- no new database migrations

Checkpoint:
- one analysis run can produce structured multi-agent output end-to-end

### Phase 2: Forecast Lifecycle Integration
Deliverables:
- optional linkage from analysis result to forecast registry question creation
- explicit resolution-quality workflows
- richer evidence freshness tracking

Checkpoint:
- forecast questions generated by the engine are directly scoreable later

### Phase 3: Calibration and Learning
Deliverables:
- agent-level score tracking
- consensus challenger monitoring
- champion promotion workflow

Checkpoint:
- aggregation logic is selected based on measured calibration, not intuition

### Phase 4: Production Data Hardening
Deliverables:
- replace remaining live-data mocks/stubs with authoritative feeds where justified
- freshness SLAs
- drift and coverage monitoring

Checkpoint:
- forecasts can be trusted operationally, not just demonstratively

### Phase 5: Self-Improving Swarm
Deliverables:
- agent prompt evolution
- role specialization refinement
- Darwinian rewrite loop for underperforming agents

Checkpoint:
- the system improves from resolved outcomes rather than static heuristics

## Critical Checkpoints and Exit Criteria

### Checkpoint A: Question Discipline
Exit criteria:
- every forecast has a clear target
- every forecast has a time horizon
- every forecast has primary and fallback resolution criteria

### Checkpoint B: Evidence Discipline
Exit criteria:
- every specialist output includes evidence ids or explicitly says evidence is insufficient
- evidence gaps are surfaced, not hidden

### Checkpoint C: Adversarial Discipline
Exit criteria:
- disagreement is quantified
- contradiction points are visible in the UI
- missing-evidence warnings are carried forward

### Checkpoint D: Consensus Discipline
Exit criteria:
- consensus is transparent
- challenger variants are computed
- confidence bands widen when disagreement is high

### Checkpoint E: Operational Discipline
Exit criteria:
- first slice introduces no new schema migrations
- failure of the new engine does not break base analysis UX

## Adversarial Analysis

### Failure Mode 1: Ambiguous questions create fake precision
Risk:
- The system returns a clean probability for a question that cannot later be resolved fairly.

Mitigation:
- force question-quality scoring
- require stated resolution source and fallback source
- surface ambiguity issues before consensus

### Failure Mode 2: Single weak source dominates the panel
Risk:
- All agents inherit a bad evidence bundle and produce correlated errors.

Mitigation:
- show evidence coverage score
- list missing evidence explicitly
- mark low-support cases as lower confidence

### Failure Mode 3: Specialist roles become cosmetic
Risk:
- Four agents output nearly the same answer with different wording.

Mitigation:
- role-specific priors, role-specific key-driver extraction, and disagreement measurement
- future phase: separate prompts and score-based weighting

### Failure Mode 4: Consensus overfits intuition
Risk:
- A hand-tuned weighting scheme looks sensible but is poorly calibrated.

Mitigation:
- compute challenger variants now
- later measure which rule wins on resolved forecasts

### Failure Mode 5: UI richness hides backend weakness
Risk:
- The product appears forecasting-grade while live-data surfaces remain partially stubbed.

Mitigation:
- document implemented reality clearly
- keep warnings visible when evidence is thin or feeds are partial
- prioritize data hardening in later phases

## First Slice Chosen for Immediate Implementation
The first justified slice is:
- a canonical multi-agent forecast orchestrator implemented as a new edge function
- integration into the existing enhancement chain
- a simulator UI panel showing question package, specialist outputs, adversarial review, and consensus
- no new schema migrations

Why this slice is correct:
- it gives the product a true prediction-engine identity immediately
- it reuses the existing stack rather than fighting it
- it respects the current schema drift constraint
- it creates a bridge toward later calibration, resolution, and learning

## Files Mapped to the First Slice
- `docs/delivery/PBI-08/*`
- `docs/geopolical_predictions.md`
- `docs/multi_agent_prediction_engine_blueprint.md`
- `supabase/functions/multi-agent-forecast/index.ts`
- `src/lib/supabase.ts`
- `src/types/strategic-analysis.ts`
- `src/hooks/useStrategyAnalysis.ts`
- `src/components/StrategySimulator.tsx`

## What This Slice Does Not Yet Solve
- It does not make all live data authoritative.
- It does not yet persist agent-level forecasts for long-term calibration learning.
- It does not yet automate question resolution.
- It does not yet implement Darwinian agent rewriting.

## Recommendation
Proceed with the initial orchestration slice now, then harden the scoring loop and live-data quality before attempting self-improving swarm behavior. That sequence gives the platform a real forecasting backbone without overextending into premature autonomy.

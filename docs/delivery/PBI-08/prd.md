# PBI-08: Multi-Agent Prediction Engine

## Overview
Add a canonical multi-agent prediction layer on top of the existing analysis pipeline so the platform can turn a scenario plus evidence bundle into a structured forecast question, specialist agent forecasts, adversarial review, and a transparent consensus output without introducing new database schema drift.

## Problem Statement
The current platform has several strong forecasting-adjacent primitives, but no single orchestration layer that behaves like a true multi-agent prediction engine.

Implemented strengths already present in the codebase:
- `analyze-engine` produces retrieval-backed scenario analyses.
- `outcome-forecasting` generates temporal probability curves.
- `brier-weighted-consensus` and the public forecast registry provide a scoring and aggregation foundation.
- `ForecastRegistry.tsx` and forecast-related tables already support community predictions and resolution workflows.

Current gaps blocking a forecasting-grade engine:
- No canonical forecast question specification step with explicit resolution quality checks.
- No specialist-agent orchestration over a shared evidence bundle.
- No built-in skeptic or adversarial reviewer in the current analysis flow.
- No champion/challenger consensus logic exposed in the analysis UI.
- Several adjacent surfaces still rely on heuristic or mock-backed behavior, especially around live data and fallback synthesis.

## User Stories
- As an analyst, I want a structured multi-agent forecast so I can see specialist disagreement instead of a single opaque answer.
- As a researcher, I want the forecast question and resolution criteria made explicit so I can score the prediction later with Brier-style evaluation.
- As an operator, I want the first implementation slice to avoid new schema drift and remain compatible with the current Supabase deployment.

## Technical Approach
- Add a new edge function `multi-agent-forecast` that accepts scenario text plus retrieval evidence.
- Derive a forecast question, resolution guidance, and question-quality assessment from the scenario.
- Run a baseline four-agent panel aligned with the target concept in `docs/geopolical_predictions.md`: geopolitics, commodities, macro, and risk.
- Add an adversarial skeptic/reviewer layer that highlights disagreement drivers and missing evidence.
- Compute a transparent weighted consensus plus challenger variants for shadow comparison.
- Integrate the result into `useStrategyAnalysis` and surface it in `StrategySimulator`.
- Reuse existing UI and analysis state rather than creating new tables or migrations.

## Acceptance Criteria
- A completed analysis can invoke `multi-agent-forecast` and receive:
  - question specification
  - question / resolution quality assessment
  - per-agent horizon probabilities
  - adversarial review
  - weighted consensus and challenger comparisons
  - execution checkpoints
- The new forecast result is visible in the current simulator UI.
- The implementation does not require new database migrations.
- The implementation fits the existing `useStrategyAnalysis` enhancement chain and gracefully degrades on failure.

## Dependencies
- Existing `analyze-engine` retrieval outputs.
- Existing Supabase Edge Function infrastructure.
- Existing frontend analysis flow in `src/hooks/useStrategyAnalysis.ts` and `src/components/StrategySimulator.tsx`.

## Open Questions
- When historical resolved forecasts are sufficiently available, should agent weights be learned from actual calibration instead of role priors?
- Should future phases store agent-level forecasts alongside public forecast questions for direct Brier evaluation?
- Which live data feeds should graduate from mock/fallback to authoritative production sources first?

## Related Tasks
- See tasks index: [Tasks for PBI PBI-08](./tasks.md)

## History
- 2026-03-20T00:00:00Z | user_scope_confirmed | Proposed -> Agreed | User requested a detailed codebase review, architecture blueprint, and initial implementation for a multi-agent prediction engine. | User
- 2026-03-20T00:00:00Z | start_work | Agreed -> InProgress | Started delivery documentation and the first implementation slice with no new schema migrations. | AI_Agent

# PBI-02: Recursive Nash Equilibrium Computation with Belief Depth

## Overview
Implement a backend analysis engine capable of computing (approximate) recursive Nash equilibria with belief depth and returning a robust `AnalysisResult` for the UI.

## Problem Statement
Researchers require repeatable, deterministic equilibrium analysis with convergence/stability indicators to reason about multi-party strategic scenarios.

## User Stories
- As a researcher, I want recursive Nash equilibrium computation with belief depth so I can analyze multi-party scenarios.

## Technical Approach
- Supabase Edge Function (Deno) `analyze-engine` accepts `AnalysisRequest` and returns `AnalysisResult`.
- MVP: seeded softmax best-response dynamics, quantum collapsed distribution, influence matrix.
- Future: persist runs and features to Postgres + pgvector for symmetric pattern mining.

## UX/UI Considerations
- Frontend shows convergence iteration and stability.
- Errors must be safe-parsed; UI should not crash on malformed responses.

## Acceptance Criteria
- Returns mixed strategies per player with probabilities normalized.
- Includes stability score, `method`, and optional `convergenceIteration`.
- Deterministic seed supported via `options.deterministicSeed`.

## Dependencies
- Supabase Edge Functions runtime (Deno).
- Postgres with `pgvector` (later tasks).

## Open Questions
- Belief depth parameterization and payoff modeling.

## Related Tasks
- See tasks index: [Tasks for PBI PBI-02](./tasks.md)

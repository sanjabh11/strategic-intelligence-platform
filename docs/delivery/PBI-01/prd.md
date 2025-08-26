# PBI-01: Local Analysis Fallback

## Overview
Provide a local analysis engine fallback so the app works in `education_quick` mode without any backend. Useful for demos, education, and offline usage.

## Problem Statement
Currently, the frontend depends on Supabase edge functions that are not present. This blocks end-to-end verification and learning mode. A local fallback enables immediate functionality.

## User Stories
- As a platform owner, I want a local engine so the app can run in quick/education mode without backend.

## Technical Approach
- Implement a deterministic local analysis engine returning `AnalysisResult`.
- Integrate into `useStrategyAnalysis` so that when `mode === 'education_quick'` or `VITE_LOCAL_ANALYZE=true`, it bypasses network and uses the local engine.

## Acceptance Criteria
- When `mode === 'education_quick'`, the app returns results locally without calling backend.
- Results conform to `AnalysisResult` and render across charts without crashes.
- Optional env `VITE_LOCAL_ANALYZE=true` forces local fallback for any mode.

## Dependencies
- None external.

## Open Questions
- Whether to allow user-supplied players/actions or always auto-generate. Initial version: use `players_def` if provided; else sensible defaults.

## Related Tasks
- See `docs/delivery/PBI-01/tasks.md`.

## History
- 2025-08-26T12:50:12+05:30 | PBI-01 | Proposed -> Agreed | User approved proceeding. | User
- 2025-08-26T12:50:12+05:30 | PBI-01 | Agreed -> InProgress | Implementing local fallback engine. | AI_Agent

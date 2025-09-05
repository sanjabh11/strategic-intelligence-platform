# PBI-05: Evidence Retrieval & Web Research Integration

## Overview
Implement robust evidence retrieval with Perplexity as the primary source and Firecrawl as the secondary fallback when Perplexity is unavailable or times out. Ensure resilient networking (timeouts/retries), proper CORS for browser-invoked functions when applicable, and correct persistence without unsafe SQL fragments.

## Problem Statement
Long-running or stuck retrieval steps and fragile integrations cause poor UX and unreliable analysis pipelines. We need a deterministic, fault-tolerant retrieval path that prioritizes Perplexity and falls back to Firecrawl seamlessly.

## User Stories
- As an analyst, I want reliable evidence retrieval so my analysis is backed by citations even if one provider is down.
- As an operator, I want network calls to fail fast with retries so the system doesn’t hang.
- As a developer, I want DB updates to be atomic and safe without inline SQL fragments in supabase-js.

## Technical Approach
- Edge function `evidence-retrieval`:
  - Perplexity (primary): attempt first; on timeout/error/missing key, fall back to Firecrawl if enabled.
  - Fix temporal filter bug and apply correct date logic using `temporal_distance` when publish date is absent.
  - Add fetch timeouts and 2–3 retries for cross-calls to `firecrawl-research`.
  - Add CORS (OPTIONS + headers) if invoked from browser.
  - Replace `supabase.sql` fragments with RPC functions.
- Edge function `firecrawl-research`:
  - Add fetch timeouts and 2–3 retries to Firecrawl API requests.
  - Keep 1 req/sec pacing; optional small concurrency later.
  - Replace `supabase.sql` with RPC.
- SQL migrations:
  - RPC functions to safely increment counters and processing metrics on `analysis_runs`.

## Acceptance Criteria
- Perplexity attempted first; if it fails (timeout/no key/error), Firecrawl is used automatically (when enabled).
- Evidence filtering uses correct temporal logic; no reference errors.
- Network calls have timeouts and retries; no “step stuck” states attributable to hanging fetches.
- DB updates succeed without using `supabase.sql` fragments (use RPC); errors are logged but don’t break responses.
- Minimal curl test plan executes successfully and returns plausible payloads.

## Dependencies
- Environment variables: `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Open Questions
- Perplexity output parsing schema for production (initial version may rely on simplified mapping; robust struct extraction can be added later).

## History
- 2025-09-03 | PBI-05 | Proposed -> Agreed | User approved proceeding. | User
- 2025-09-03 | PBI-05 | Agreed -> InProgress | Started evidence retrieval hardening. | AI_Agent



I’ll do a structured “codebase tour”: first identify the framework/entry points and build/deploy setup, then map major modules (pages/routes/APIs/data), then cross‑cutting concerns (auth, security, observability), and finally synthesize the **top 20 highlights** with a step‑by‑step mental model of how the app works end‑to‑end. I’m going to scan the repo now.

I’m going to inventory the repo structure and read the key “entry point” files (build config, `package.json`, app bootstrap, router/pages, and Supabase edge functions + DB schema). Then I’ll synthesize **20 concrete highlights** backed by what’s actually in the code.









I’m going to dig deeper into the repo’s “operational” pieces (CI/CD workflows, tests, deploy config) and then the major feature modules + Supabase edge functions so the final **top 20 highlights** are grounded in actual code (not just README claims).























# High-level snapshot (from codebase)
This is a **Vite + React 18 + TypeScript** single-page app (SPA) with **TailwindCSS + Radix/shadcn-style UI components**, backed by **Supabase Postgres + Supabase Edge Functions (Deno)**. The frontend is static-hostable (Netlify config present) and most “backend logic” lives in **Edge Functions** and **DB migrations**.

# Step-by-step “how it works” (end-to-end visualization)

```text
1) User opens SPA (Vite build) ──> <App> (tabs) + <ErrorBoundary> + LearningModeProvider
2) User chooses a module tab:
   - Analysis (StrategySimulator)
   - Live Intel (GeopoliticalDashboard)
   - Multiplayer (MultiplayerLobby)
   - Bias Training (BiasSimulator)
   - Life Coach (PersonalLifeCoach)
   - Mediator (AIMediator)
   - System (SystemStatus)

3) Analysis tab flow (core):
   StrategySimulator -> useStrategyAnalysis.runAnalysis()
     -> POST /functions/v1/analyze-engine (Edge Function)
        -> retrieves evidence (Perplexity/Google CSE/Crossref/GDELT + optional Firecrawl)
        -> validates/normalizes JSON (Ajv), persists to analysis tables
        -> returns { request_id, analysis_run_id } and/or immediate analysis payload
     -> frontend polls GET /functions/v1/get-analysis-status?request_id=...
     -> on completion: fetches analysis_runs.analysis_json (audience-specific payload)
     -> renders AudienceViewRouter (student/learner/researcher/teacher/reviewer views)
     -> ALSO calls “enhancement” engines (multiple Edge Functions) and merges results

4) Ops & governance:
   - system-status + health Edge Functions power dashboards + checks
   - schema_failures table + admin UI for validation triage
   - human-review Edge Function + HumanReview UI for approve/reject + recompute EV + sensitivity run
```

# Top 20 highlights of this web app (code-backed)

1. **Modern frontend foundation (React 18 + Vite + TS)**: Fast dev/build (`vite.config.ts`, `package.json`) with a clean SPA bootstrap and global error containment (`src/main.tsx`, `src/components/ErrorBoundary.tsx`).

2. **Tab-based product surface with multiple “apps” inside one UI**: The main app exposes **7+ major modules** via a consistent nav (Analysis, Live Intel, Multiplayer, Bias, Life Coach, Mediator, System) (`src/App.tsx`).

3. **Learning Mode as a first-class UX concept**: A persistent “Learning Mode” toggle plus first-visit onboarding (“WelcomeMessage”) to make advanced game-theory outputs understandable (`src/components/explanations/*`).

4. **Supabase-first architecture (DB + Functions + Realtime)**: Frontend uses `@supabase/supabase-js` for DB queries, function invocation, and realtime channels (`src/lib/supabase.ts`, multiple components/hooks).

5. **Explicit API contract + validation on the frontend**: [useStrategyAnalysis](cci:1://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:163:0-515:1) uses **Zod** schemas to safely parse and normalize backend responses (protects UI from LLM-shaped data surprises) ([src/hooks/useStrategyAnalysis.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:0:0-0:0)).

6. **Resilient analysis execution model (queued/polling + timeouts)**: `runAnalysis()` supports async job flow with polling (`get-analysis-status`) and a 2-minute timeout guard to prevent infinite spinner UX ([src/hooks/useStrategyAnalysis.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:0:0-0:0), `supabase/functions/get-analysis-status`).

7. **Local deterministic analysis engine for demos/dev**: `localEngine.ts` generates stable outputs (seeded RNG), enabling offline-ish demonstrations while blocking local mode in production builds (`src/lib/localEngine.ts`, [src/hooks/useStrategyAnalysis.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:0:0-0:0)).

8. **Post-processing “multi-engine enrichment” pipeline**: After base analysis completes, the client orchestrates **multiple advanced strategic engines** (recursive equilibrium, symmetry mining, quantum strategy, VOI, forecasting, etc.) and merges results into one unified UI model ([enhanceAnalysisWithStrategicEngines](cci:1://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:517:0-809:1) in [src/hooks/useStrategyAnalysis.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/hooks/useStrategyAnalysis.ts:0:0-0:0)).

9. **Audience-specific analysis representations stored server-side**: The app fetches `analysis_runs.analysis_json` and renders it via `AudienceViewRouter` into Student/Learner/Researcher/Teacher/Reviewer views (`src/components/audience-views/*`, [src/types/audience-views.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/types/audience-views.ts:0:0-0:0), `src/components/StrategySimulator.tsx`).

10. **Human-in-the-loop governance workflow**: A full review queue UI + backend with role checks (`reviewer` role), approve/reject operations, reviewer guidance, and edit + recompute flows (`src/components/HumanReview.tsx`, [supabase/functions/human-review/index.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/human-review/index.ts:0:0-0:0), DB migration adds `human_reviews`, `analysis_runs.status`).

11. **Evidence & provenance is central (not an afterthought)**: The codebase has dedicated “Evidence & Retrievals” UX and multiple evidence pipelines (Perplexity, Google CSE fallback, Crossref, GDELT, optional Firecrawl) (`src/components/PerplexityDashboard.tsx`, [supabase/functions/evidence-retrieval/index.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/evidence-retrieval/index.ts:0:0-0:0)).

12. **Anti-fabrication posture in several fallbacks**: Some retrieval fallbacks deliberately return **empty** rather than invent sources (e.g., [fallbackFirecrawlRetrieval](cci:1://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/evidence-retrieval/index.ts:453:0-457:1), [fallbackPerplexityRetrieval](cci:1://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/evidence-retrieval/index.ts:296:0-300:1)) to avoid fake citations ([supabase/functions/evidence-retrieval/index.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/evidence-retrieval/index.ts:0:0-0:0)).

13. **Firecrawl integration with caching + per-host pacing**: Firecrawl Edge Function has retries/timeouts, 24h cache, and per-host request pacing to avoid hammering hosts ([supabase/functions/firecrawl-research/index.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/firecrawl-research/index.ts:0:0-0:0), `src/components/FirecrawlDashboard.tsx`).

14. **Operational visibility built into the product**: There’s a system status page with component breakdown + health checks, plus a monitoring dashboard driven by DB RPC metrics (`src/components/SystemStatus.tsx`, `src/components/MonitoringDashboard.tsx`, `src/hooks/useMonitoringMetrics.ts`, `supabase/functions/system-status`, `supabase/functions/health`).

15. **Schema failure triage tooling**: `schema_failures` gets enhanced columns (preview, status, first_seen) and has a dedicated admin UI to classify resolved/ignored/active ([supabase/migrations/20250906_0002_enhance_schema_failures.sql](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/migrations/20250906_0002_enhance_schema_failures.sql:0:0-0:0), [src/components/SchemaFailuresAdmin.tsx](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/src/components/SchemaFailuresAdmin.tsx:0:0-0:0)).

16. **Reliability patterns in the DB layer**: Migrations include **retrieval_cache**, **circuit_breaker** (+ cooldown), and **rate_limit_tracking** with an RPC `check_rate_limit()` to guard expensive external calls ([supabase/migrations/20250906_0001_add_retrieval_cache_ph4.sql](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/migrations/20250906_0001_add_retrieval_cache_ph4.sql:0:0-0:0), [20250906_0003_add_circuit_breaker_cooldown.sql](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/migrations/20250906_0003_add_circuit_breaker_cooldown.sql:0:0-0:0), [20250906_0004_add_rate_limits.sql](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/migrations/20250906_0004_add_rate_limits.sql:0:0-0:0)).

17. **Queue cleanup / stuck-job handling**: `process-queue` Edge Function scans for stuck jobs and marks them failed (simple but practical operational safety net) (`supabase/functions/process-queue/index.ts`).

18. **Real-time features beyond “analysis”**: Geopolitical dashboard uses a GDELT stream endpoint (supports SSE) + interactive simulation UI ([supabase/functions/gdelt-stream/index.ts](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/gdelt-stream/index.ts:0:0-0:0), `src/components/GeopoliticalDashboard.tsx`, `src/components/WhatIfSimulator.tsx`, `src/components/HistoricalComparison.tsx`).

19. **Multiplayer game-theory mode**: The app includes multiplayer session creation/joining and a playable game interface backed by Supabase tables (`src/components/MultiplayerLobby.tsx`, `src/components/GameInterface.tsx`, `src/types/multiplayer.ts`).

20. **Strong CI/CD posture for a hackathon-style codebase**: GitHub Actions cover:
    - edge deployment on relevant changes (`.github/workflows/deploy.yml`)
    - e2e tests hitting a real endpoint (`e2e-tests.yml`)
    - a larger game-theory CI with Deno tests, performance regression (hyperfine), coverage upload, and gated deploy (`game-theory-ci.yml`).

# Critical “industry practice” observations (quick, because you asked for best practices)
- **Security posture is mixed**: Netlify security headers are good (`netlify.toml`), but several Edge Functions use permissive CORS (`Access-Control-Allow-Origin: *`) and some deploy scripts use `--no-verify-jwt` for functions (good for public endpoints, risky for sensitive ones).
- **Some features are “production-structured but stubbed”**: e.g., `gdelt-stream` currently returns simulated events; `personal-life-coach` contains TODO/placeholder LLM extraction logic. Architecturally solid, but worth validating for “real data” readiness.
- **Secrets & config hygiene**: [.gitignore](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/.gitignore:0:0-0:0) correctly ignores `.env`, and there are scripts to set Supabase secrets; however [.env.example](cci:7://file:///Users/sanjayb/minimax/strategic-intelligence-platform/.env.example:0:0-0:0) contains a suspicious placeholder value for `SUPABASE_SERVICE_ROLE_KEY` that ideally should be blank.

# Status
- **Completed**: Repo-wide architecture scan + backend/DB/CI review.
- **Delivered**: A step-by-step operational mental model and the **top 20 highlights** grounded in specific modules and files.
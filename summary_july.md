# Complete Conversation Thread — Capability Summary (July 2026)

> **Scope**: This document covers ALL work done across the complete conversation thread, including:
> - **P1 ProphetHacks** (market priors, semantic routing, calibration, evidence gate wiring, learnings persistence)
> - **Phases A–E AgentHarness-inspired** (LLM-as-judge, evidence graph, parallel orchestration, benchmark registry, progress tracking)
>
> **Commits**: `58b7292` (P1) → `a159df0` (Phases A-E) → `02a9382` (pre-Phase A shared modules)

## 1. What Is Now Possible That Was Not Before

| # | Capability | Before This Thread | After This Thread |
|---|-----------|-------------------|------------------|
| 1 | **Market Prior Integration** | Model probabilities were purely LLM-agent-derived with no external market anchor. No Polymarket/Kalshi data fetched. | `shared/marketPriors.ts` fetches live market-implied probabilities from Polymarket (primary) and Kalshi (fallback). `blendMarketPrior()` anchors model output to market consensus at 30% weight. Edge function `market-prior` exposes this as an API. |
| 2 | **Semantic Skill Routing** | `publicForecasting.ts` had keyword-based `inferIntent()` and `routeCitizenQuestion()` for question routing, but no skill-file injection into LLM agent prompts. Agents received generic system prompts regardless of domain. | `shared/semanticRouter.ts` maps citizen intents to 8 forecast skill categories and injects evidence hierarchy, domain traps, calibration warnings, and probability validation rules into each agent's LLM system prompt via `buildSkillEnhancedSystemPrompt()`. |
| 3 | **Learnings-Based Calibration** | Calibration used `fitIsotonicCalibration()` from `mlAdvisory.ts` with `calibration_models` table data (static, refreshed via `calibration-refresh` edge function). No per-forecast learning storage or retrieval. | `shared/confidenceCalibration.ts` fits isotonic calibration from `forecast_learnings` records, computes Brier scores, and blends calibrated probability with market prior. `assessCalibrationConfidence()` reports sample size, Brier score, and reliability level. |
| 4 | **Forecast Learnings Persistence** | No table existed to store individual forecast predictions for later outcome tracking and calibration fitting. | `supabase/migrations/20260706000001_prophethacks_learnings.sql` creates `forecast_learnings` table with RLS, indexes, and Brier score computation on resolution. Edge function `learnings-query` provides POST/GET/PATCH CRUD. |
| 5 | **Evidence Gate in Forecast Pipeline** | `shared/evidenceGate.ts` existed (P0) with `assessEvidenceGate()` and `applyBoundedNudge()`, but was NOT wired into the `multi-agent-forecast` edge function. | Evidence gate is now called in `multi-agent-forecast/index.ts` with `disagreementIndex`, evidence count, provider diversity, freshness, and market-prior awareness. "No move" is a valid output that preserves the prior. |
| 6 | **Skill-Enhanced Agent Deliberation** | LLM agents in `multi-agent-forecast` used static `ROLE_SYSTEM_PROMPTS` with no domain-specific guidance. | `callAgentForecast()` now accepts an optional `skillFile` parameter. When provided, `buildSkillEnhancedSystemPrompt()` injects evidence priority, domain traps, calibration warnings, no-move guidance, and probability validation rules into the system prompt for both Round 1 and Round 2 deliberation. |
| 7 | **Market-Blended Final Probability** | Final probability was `calibratedChampion.probability` from `annotateCalibration()` only. | Final probability now goes through: (1) existing calibration → (2) learnings-based calibration → (3) market prior blend (30% weight) → (4) evidence gate check. If gate says "no_move", prior is preserved. |
| 8 | **Learning Record Auto-Persistence** | No automatic storage of forecast predictions for later calibration. | Each `multi-agent-forecast` call now inserts a `forecast_learnings` record with `run_id`, `user_id`, `intent`, `skill_category`, `predicted_probability`, `market_prior`, and `evidence_gate_decision`. Fire-and-forget with graceful fallback if table doesn't exist. |
| 9 | **P1 UI Indicators** | `MultiAgentForecastPanel.tsx` showed evidence gate and no-move state (P0) but no market prior, skill file, or calibration source. | Three new badges: (1) Market Prior badge (source + probability + question), (2) Skill File badge (label + category + routing confidence), (3) Calibration badge (method + sample size + Brier score). |
| 10 | **Type-Safe P1 Fields** | `MultiAgentForecast` type had `evidenceGate` and `noMoveReason` (P0) only. | Added `marketPrior`, `semanticRoute`, and `calibrationWithLearnings` to the type, enabling downstream consumers to access P1 data safely. |
| 11 | **LLM-as-Judge Verification** (Phase A) | Forecasts had no independent LLM judge. Consensus probability was the final answer. | `shared/forecastJudge.ts` — 6 family-specific judge configs (geopolitical, economic, conflict, trade, technology, general). Judge reviews champion forecast and produces structured verdict: `confirmed`, `adjusted_up`, `adjusted_down`, or `rejected`. Judge can adjust probability with weighted blending. Severity classified as none/minor/major/critical. |
| 12 | **Judge Adjustment Application** (Phase A) | No mechanism to correct consensus probability based on independent review. | Judge's verified probability is blended with consensus using family-specific weights. Judge delta and severity are surfaced in response and UI. `applyJudgeAdjustment()` and `assessJudgeVerdict()` handle the math and classification. |
| 13 | **Structured Evidence Graph** (Phase B) | Evidence was a flat list of retrievals with no relationships between items. | `shared/evidenceGraph.ts` — transforms retrievals into typed graph with 6 node types (claim, data, official_source, media_report, expert_opinion, market_signal) and 4 edge types (supports, contradicts, refines, contextualizes). Each node has credibility, freshness, and relevance scores. |
| 14 | **Global Verifier** (Phase B) | No holistic evidence quality assessment. | LLM-based global verifier reasons over the entire evidence graph to produce verification score, evidence strength, coverage assessment, key concerns, strongest evidence, weakest link, and recommendation (high/moderate/low confidence or insufficient evidence). Heuristic fallback if LLM unavailable. |
| 15 | **Orchestrator Pre-Dispatch** (Phase C) | All 4 agents were always dispatched regardless of question relevance. | `shared/agentOrchestrator.ts` — orchestrator analyzes question text for keyword signals and activates only relevant agents. Irrelevant agents are skipped. Complexity estimated (low/medium/high), recommended rounds computed. |
| 16 | **Fault-Tolerant Agent Dispatch** (Phase C) | `Promise.all` — if one agent failed, entire deliberation was lost. System fell back to deterministic hash-based generation. | `dispatchAgentsParallel<T>()` using `Promise.allSettled` — if some agents fail, system uses available results and fills gaps with base forecast fallbacks. Partial success handled gracefully. |
| 17 | **Benchmark Accuracy Tracking** (Phase D) | No aggregate accuracy metrics were computed from historical learnings. | `shared/benchmarkRegistry.ts` — computes total/resolved counts, average and median Brier scores, calibration error via binned analysis, judge accuracy (how often judge adjustments improved Brier), judge adjustment impact, evidence strength–Brier correlation, trend (improving/stable/degrading), per-intent breakdowns. |
| 18 | **Benchmark Display Metrics** (Phase D) | No accuracy dashboard in the forecast UI. | 6 color-coded display metrics (total, resolved, avg Brier, calibration, judge accuracy, trend) with status coloring (good/warning/bad) and tooltips. Trend badge shows improving/stable/degrading. |
| 19 | **Pipeline Progress Tracking** (Phase E) | No visibility into which verification phases ran or their status. | `progressTracking` object reports 8 pipeline phases (semantic_routing, agent_dispatch, consensus_calibration, evidence_gate, judge_verification, evidence_graph, global_verifier, benchmark_registry) with status, detail, and pipeline version. |
| 20 | **Pipeline Status UI** (Phase E) | No visual indicator of verification pipeline state. | Pipeline status bar at bottom of forecast panel shows all 8 phases as color-coded chips: green=completed, gray=skipped, amber=heuristic/fallback, red=critical, cyan=other. Hover for detail tooltips. |

---

## 2. Per-Functionality Analysis

### 2a. Market Prior API

| Attribute | Details |
|-----------|---------|
| **Name** | Market Prior API (`shared/marketPriors.ts` + `supabase/functions/market-prior/index.ts`) |
| **Global applicability** | **Yes** — TypeScript shared module is platform-agnostic. Any AI assistant (Devin/Windsurf/Codex) or developer can import and call `searchPolymarket()`, `searchKalshi()`, `extractMarketPrior()`, `blendMarketPrior()`. The edge function is Supabase-specific but the shared module is not. No changes needed for global use. |
| **Activation** | (1) Automatically during `multi-agent-forecast` edge function calls — market prior is fetched and blended. (2) Direct API call to `market-prior` edge function with `{ scenario: { description }, questionContext: { intent } }`. (3) Programmatic import of `shared/marketPriors.ts` in any TypeScript code. |
| **Top 3 use cases** | 1. Anchor a forecast probability to Polymarket/Kalshi market consensus before LLM deliberation. 2. Detect divergence between model and market (>10pp triggers evidence requirement). 3. Provide users with "the market thinks X%" context alongside the model's forecast. |
| **Relationship** | **Complementary** to `shared/mlAdvisory.ts` calibration — market prior is blended *after* calibration. **Supplementary** to `shared/evidenceGate.ts` — evidence gate checks `priorIncorporatesMarket` to adjust its move/no-move decision. **Not redundant** — no prior module fetched external market data. |

### 2b. Semantic Router

| Attribute | Details |
|-----------|---------|
| **Name** | Semantic Router (`shared/semanticRouter.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module with no platform dependencies. Imports from `shared/forecastSkills.ts` and `shared/publicForecasting.ts`, both of which are also pure TypeScript. Works in any Node/Deno/browser context. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — `routeForecastSkill()` is called with the citizen intent, and the resulting skill file is injected into agent system prompts. (2) Programmatic import for any forecasting pipeline. (3) `getSkillFile(category)` for direct skill file lookup by category. |
| **Top 3 use cases** | 1. Inject domain-specific evidence hierarchy (e.g., "consult diplomatic cables before news reports" for geopolitical forecasts) into LLM agent prompts. 2. Apply category-specific calibration warnings (e.g., "Fed decision forecasts should be anchored to fed funds futures") as system prompt guidance. 3. Enforce probability validation rules per category (e.g., "if probability >85%, verify a named mechanism exists"). |
| **Relationship** | **Complementary** to `shared/forecastSkills.ts` — wraps its `routeForecastSkill(intent)` with richer `SemanticRouteResult` metadata. **Supplementary** to `shared/publicForecasting.ts` `routeCitizenQuestion()` — adds skill file layer on top of existing intent routing. **Not redundant** — `publicForecasting.ts` routes questions; `semanticRouter.ts` routes *skills* to LLM agents. |

### 2c. Confidence Calibration with Learnings

| Attribute | Details |
|-----------|---------|
| **Name** | Confidence Calibration with Learnings (`shared/confidenceCalibration.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module. Imports `fitIsotonicCalibration` and `applyCalibrationModel` from `shared/mlAdvisory.ts` (also pure TypeScript). Works in any JS runtime. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — `calibrateWithLearnings()` is called with learnings queried from `forecast_learnings` table. (2) `blendCalibratedWithMarket()` to merge calibrated probability with market prior. (3) `assessCalibrationConfidence()` for reliability reporting. |
| **Top 3 use cases** | 1. Fit isotonic regression from past forecast outcomes to correct systematic over/underconfidence per intent category. 2. Blend calibrated probability with market prior (25% market weight when empirical, 15% when prior-smoothed). 3. Report calibration reliability (high/moderate/low) based on sample size and Brier score to users. |
| **Relationship** | **Complementary** to `shared/mlAdvisory.ts` — reuses `fitIsotonicCalibration()` and `applyCalibrationModel()` but adds learnings data source and market blend. **Supplementary** to `supabase/functions/calibration-refresh/` — calibration-refresh refreshes the `calibration_models` table; `confidenceCalibration.ts` fits from `forecast_learnings` at runtime. **Not redundant** — existing calibration used static models; this adds dynamic per-forecast learnings. |

### 2d. Forecast Learnings Table + Query API

| Attribute | Details |
|-----------|---------|
| **Name** | Forecast Learnings Table (`supabase/migrations/20260706000001_prophethacks_learnings.sql` + `supabase/functions/learnings-query/index.ts`) |
| **Global applicability** | **Partially** — The SQL migration is Supabase/Postgres-specific. The edge function uses Deno + Supabase JS SDK. However, the `LearningRecord` type in `shared/confidenceCalibration.ts` is platform-agnostic. **To make globally usable**: The shared types and `computeBrierScore()` logic are already portable. The edge function pattern (auth, rate-limit, CRUD) follows existing repo conventions and is not portable to non-Supabase platforms without adaptation. No changes needed for this repo's context. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — a learning record is inserted after each forecast. (2) GET `learnings-query?intent=global_geopolitics&limit=100` to fetch learnings for calibration. (3) PATCH `learnings-query?id={uuid}` with `{ actual_outcome, resolution_source }` to resolve a prediction and compute Brier score. |
| **Top 3 use cases** | 1. Track every forecast prediction with its intent, skill category, market prior, and evidence gate decision for later calibration. 2. Resolve predictions with actual outcomes to compute Brier scores and feed isotonic calibration fitting. 3. Query historical learnings by intent to assess calibration confidence before releasing a new forecast. |
| **Relationship** | **Complementary** to `calibration_models` table — learnings table is the *source data*; calibration_models is the *fitted model*. **Supplementary** to `calibration-refresh` edge function — calibration-refresh could be extended to pull from learnings table. **Not redundant** — no prior table stored per-forecast predictions. |

### 2e. Evidence Gate Integration

| Attribute | Details |
|-----------|---------|
| **Name** | Evidence Gate Integration (wiring `shared/evidenceGate.ts` into `multi-agent-forecast`) |
| **Global applicability** | **Yes** — `shared/evidenceGate.ts` is pure TypeScript. The wiring in `multi-agent-forecast/index.ts` is Supabase-specific but the gate logic itself is portable. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — `assessEvidenceGate()` is called with evidence count, provider diversity, primary source presence, freshness, market awareness, and disagreement index. (2) Programmatic import for any forecast pipeline. (3) `applyBoundedNudge()` for manual probability adjustment with ±10pp cap. |
| **Top 3 use cases** | 1. Block probability adjustment when evidence is irrelevant (<2 sources or <1 provider). 2. Block adjustment when evidence is not credible (no primary/official source). 3. Block adjustment when evidence is likely already priced into the market prior. |
| **Relationship** | **Complementary** to market prior — evidence gate checks `priorIncorporatesMarket` to decide if model adjustment is justified. **Supplementary** to skill files — skill file `noMoveGuidance` provides domain-specific "when to hold" criteria. **Not redundant** — `evidenceGate.ts` existed (P0) but was NOT wired into the forecast pipeline before this thread. |

### 2f. Skill-Enhanced Agent Deliberation

| Attribute | Details |
|-----------|---------|
| **Name** | Skill-Enhanced Agent Deliberation (wiring `buildSkillEnhancedSystemPrompt()` into `callAgentForecast()`) |
| **Global applicability** | **Yes** — The `buildSkillEnhancedSystemPrompt()` function is pure TypeScript string composition. Works with any LLM API (OpenAI, Gemini, Anthropic). No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` LLM deliberation rounds 1 and 2 — skill file is passed to `callAgentForecast()` and injected into the system prompt. (2) Programmatic import for any multi-agent LLM pipeline. |
| **Top 3 use cases** | 1. Tell the geopolitics agent to consult diplomatic cables before news reports. 2. Tell the macro agent to anchor to fed funds futures pricing. 3. Tell all agents to apply bounded nudges (max ±10pp) and only move when evidence is relevant, credible, and not priced in. |
| **Relationship** | **Complementary** to `shared/forecastSkills.ts` — uses its skill file data to construct enhanced prompts. **Supplementary** to `ROLE_SYSTEM_PROMPTS` in `multi-agent-forecast` — enhances rather than replaces the base prompts. **Not redundant** — no prior mechanism injected domain-specific guidance into agent prompts. |

### 2g. P1 UI Indicators

| Attribute | Details |
|-----------|---------|
| **Name** | P1 UI Indicators (`MultiAgentForecastPanel.tsx` badges) |
| **Global applicability** | **No** — React component, specific to this platform's frontend. Not portable to Devin/Codex CLI contexts. This is expected — UI is inherently platform-specific. No changes needed. |
| **Activation** | Automatically rendered when `multiAgentForecast.marketPrior`, `multiAgentForecast.semanticRoute`, or `multiAgentForecast.calibrationWithLearnings` are present in the forecast response. |
| **Top 3 use cases** | 1. Show users the market-implied probability alongside the model's forecast. 2. Display which skill file was used for routing (transparency). 3. Show calibration sample size and Brier score (trust signal). |
| **Relationship** | **Complementary** to existing evidence gate UI (P0). **Supplementary** to the forecast panel's existing metadata display. **Not redundant** — no prior UI showed market prior, skill file, or calibration source. |

### 2h. LLM-as-Judge Verification (Phase A)

| Attribute | Details |
|-----------|---------|
| **Name** | Forecast Judge (`shared/forecastJudge.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module. No platform dependencies. Works in any JS runtime (Node/Deno/browser). Any AI assistant (Devin/Windsurf/Codex) can import and use `getJudgeConfig()`, `mapIntentToJudgeFamily()`, `buildJudgePrompt()`, `parseJudgeResponse()`, `applyJudgeAdjustment()`, `assessJudgeVerdict()`. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — judge call inserted after evidence gate + calibration, before response assembly. Best-effort with try/catch. (2) Programmatic import — `buildJudgePrompt(input)` produces the LLM prompt, caller handles the LLM call, then `parseJudgeResponse(raw)` parses the JSON. (3) `mapIntentToJudgeFamily(intent)` for standalone family classification. |
| **Top 3 use cases** | 1. Independent LLM judge reviews the champion forecast probability and produces a verdict (confirmed/adjusted_up/adjusted_down/rejected) with structured reasoning. 2. Detect overconfident forecasts — judge can adjust probability down when evidence is thin or agent disagreement is high. 3. Surface concerns to users — judge's structured concerns list provides transparency about forecast weaknesses. |
| **Relationship** | **Complementary** to `shared/evidenceGate.ts` — evidence gate decides if adjustment is justified; judge provides an independent second opinion. **Supplementary** to consensus calibration — judge runs *after* calibration and can override. **Not redundant** — no prior module provided independent LLM-based forecast verification. |

### 2i. Evidence Graph Assembly (Phase B)

| Attribute | Details |
|-----------|---------|
| **Name** | Evidence Graph (`shared/evidenceGraph.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module. No platform dependencies. `buildEvidenceGraph()`, `computeGraphSummary()`, `buildGlobalVerifierPrompt()`, `parseGlobalVerifierResponse()`, `computeHeuristicVerifierScore()` all work in any JS runtime. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — evidence graph built from retrievals after judge verification. LLM global verifier called with heuristic fallback. (2) Programmatic import — `buildEvidenceGraph(retrievals, agentTheses)` produces the graph, caller can inspect nodes/edges or call the verifier. (3) `computeHeuristicVerifierScore(graph)` for pure heuristic scoring without LLM. |
| **Top 3 use cases** | 1. Transform flat retrieval lists into a structured graph showing which evidence supports vs contradicts the forecast. 2. Global verifier produces a holistic evidence quality score (0–1) with coverage assessment and recommendation level. 3. Identify the strongest evidence piece and weakest link in the evidence chain for user transparency. |
| **Relationship** | **Complementary** to `shared/evidenceGate.ts` — evidence gate is a binary go/no-go; evidence graph provides nuanced structural analysis. **Supplementary** to judge verification — judge reviews the probability; graph verifier reviews the evidence. **Not redundant** — no prior module structured evidence relationships. |

### 2j. Parallel Multi-Agent Orchestration (Phase C)

| Attribute | Details |
|-----------|---------|
| **Name** | Agent Orchestrator (`shared/agentOrchestrator.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module. `orchestrateAgents()` is pure keyword-based logic. `dispatchAgentsParallel<T,A>()` uses standard `Promise.allSettled` — works in any JS runtime (Node 12+, Deno, browser). Any AI assistant can import and use. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — `orchestrateAgents()` called before agent dispatch to select relevant agents. `dispatchAgentsParallel()` replaces `Promise.all` for both rounds. (2) Programmatic import — `orchestrateAgents(question, description, evidenceCount)` returns `OrchestratorDecision` with active/skipped agents. (3) `dispatchAgentsParallel(agents, fn)` as a generic utility for any parallel task with fault tolerance. |
| **Top 3 use cases** | 1. Skip irrelevant agents (e.g., commodities agent for a pure monetary policy question) to save LLM API calls and reduce noise. 2. Survive individual agent failures — `Promise.allSettled` ensures one failed agent doesn't kill the entire deliberation. 3. Estimate question complexity (low/medium/high) based on active agent count and evidence volume to inform round count. |
| **Relationship** | **Complementary** to `shared/semanticRouter.ts` — semantic router routes the *skill file*; orchestrator routes the *agents*. **Supplementary** to existing `callAgentForecast()` — wraps the dispatch, doesn't replace the agent logic. **Not redundant** — no prior module provided agent selection or fault-tolerant dispatch. |

### 2k. Benchmark Registry & Accuracy Tracking (Phase D)

| Attribute | Details |
|-----------|---------|
| **Name** | Benchmark Registry (`shared/benchmarkRegistry.ts`) |
| **Global applicability** | **Yes** — Pure TypeScript module. All functions (`computeBenchmarkSummary()`, `buildDisplayMetrics()`, `computeCalibrationError()`, `computeJudgeAccuracy()`, etc.) are pure and work in any JS runtime. No changes needed. |
| **Activation** | (1) Automatically during `multi-agent-forecast` — computes benchmark summary from `forecast_learnings` table data queried for the same intent. (2) Programmatic import — `computeBenchmarkSummary(entries)` takes an array of `BenchmarkEntry` and returns full summary. (3) `buildDisplayMetrics(summary)` for UI-ready metric objects. |
| **Top 3 use cases** | 1. Track aggregate forecast accuracy (Brier scores, calibration error) over time per intent category. 2. Measure whether the LLM judge's adjustments actually improve accuracy (judge accuracy %). 3. Detect calibration drift — trend assessment shows if forecasts are improving or degrading over time. |
| **Relationship** | **Complementary** to `shared/confidenceCalibration.ts` — calibration uses learnings for fitting; benchmark tracks accuracy of those calibrations. **Supplementary** to `forecast_learnings` table — benchmark consumes the same data. **Not redundant** — no prior module computed aggregate accuracy metrics. |

### 2l. Progress Tracking (Phase E)

| Attribute | Details |
|-----------|---------|
| **Name** | Pipeline Progress Tracking (edge function response field + UI) |
| **Global applicability** | **Partially** — The `progressTracking` object in the edge function response is platform-agnostic JSON. The UI rendering in `MultiAgentForecastPanel.tsx` is React-specific. The JSON structure is consumable by any client (Devin/Codex could parse it). No changes needed for the data layer. |
| **Activation** | (1) Automatically included in every `multi-agent-forecast` response — `progressTracking` object with 8 phase statuses. (2) UI renders automatically when `multiAgentForecast.progressTracking` is present. (3) Programmatic consumption — any client can parse the JSON to inspect which verification phases ran. |
| **Top 3 use cases** | 1. Debug pipeline failures — see exactly which phase failed or fell back to heuristic. 2. Transparency for users — show the full verification chain that produced their forecast. 3. Monitor pipeline health — track which phases frequently skip or fall back across many forecasts. |
| **Relationship** | **Complementary** to all other phases — wraps them into a single status report. **Supplementary** to the response object — adds metadata without changing existing fields. **Not redundant** — no prior mechanism reported pipeline phase status. |

---

## 3. Remaining Items & Next Steps

| Item | Status | Action Needed |
|------|--------|--------------|
| **Apply `forecast_learnings` migration** | Pending user action | User will apply `20260706000001_prophethacks_learnings.sql` after fixing Supabase migration issues. All code paths degrade gracefully until then. |
| **Deploy `market-prior` edge function** | Code ready, not deployed | `supabase/functions/market-prior/index.ts` is complete. Deploy via `supabase functions deploy market-prior` once Supabase CLI is available. |
| **Deploy `learnings-query` edge function** | Code ready, not deployed | `supabase/functions/learnings-query/index.ts` is complete. Deploy via `supabase functions deploy learnings-query`. |
| **Deploy updated `multi-agent-forecast`** | Code ready, not deployed | The edge function has been modified with P1 wiring. Redeploy via `supabase functions deploy multi-agent-forecast`. |
| **Polymarket API rate limits** | Not yet tested under load | Polymarket public API has no documented rate limit but may throttle. Consider caching results for 5-10 minutes per query. |
| **Kalshi API authentication** | Public endpoints only | Kalshi's public market data endpoints work without auth. For deeper data (order book, trades), an API key would be needed. |
| **Learnings table backfill** | No historical data | Once the table is created, existing `analysis_runs` could be backfilled into `forecast_learnings` to bootstrap calibration. |
| **Calibration-refresh integration** | Not yet wired | `calibration-refresh` edge function could be extended to pull from `forecast_learnings` instead of (or in addition to) `calibration_models`. |
| **`useStrategyAnalysis` hook wiring** | Endpoints added, hook not yet calling them | `MARKET_PRIOR` and `LEARNINGS_QUERY` endpoints are defined in `src/lib/supabase.ts` but `useStrategyAnalysis.ts` does not yet call them independently. The `multi-agent-forecast` edge function handles P1 internally, so this is optional for the current flow. |
| **Test coverage for P1 modules** | No unit tests yet | `shared/marketPriors.ts`, `shared/semanticRouter.ts`, and `shared/confidenceCalibration.ts` have no dedicated test files. Should add tests for: probability extraction, blending math, routing correctness, calibration fitting with mock learnings. |
| **Judge integration tests** | Test file exists, not run | `shared/tests/forecastJudge.test.ts` has 20+ test cases. Run with `npx vitest run shared/tests/forecastJudge.test.ts` from project root. Test runner types not configured in `shared/` — resolves at runtime with vitest. |
| **Evidence graph unit tests** | Not created | `shared/evidenceGraph.ts` has no dedicated test file. Functions are pure and testable. Should add tests for: node classification, edge type detection, credibility scoring, graph summary computation, heuristic verifier. |
| **Agent orchestrator tests** | Not created | `shared/agentOrchestrator.ts` has no test file. `orchestrateAgents()` and `dispatchAgentsParallel()` are pure/easily testable. Should add tests for: keyword relevance scoring, agent selection, partial failure handling. |
| **Benchmark registry tests** | Not created | `shared/benchmarkRegistry.ts` has no test file. All functions are pure. Should add tests for: Brier computation, calibration error, judge accuracy, trend assessment. |
| **End-to-end edge function smoke test** | Not run | The edge function requires Deno runtime + Supabase env vars. Smoke test via `supabase functions serve multi-agent-forecast` + curl with a test question. |
| **Judge + evidence graph DB persistence** | Not implemented | Judge verdicts and evidence graph results are returned in the response but not persisted to a table. Would need schema extension to `forecast_learnings` or a new table. |
| **Benchmark judge accuracy tracking** | Partial | Benchmark tracks judge accuracy from `judgeVerdict`/`judgeDelta` fields, but the edge function doesn't persist these to `forecast_learnings` yet. Would need schema extension. |
| **Orchestrator LLM-based routing** | Heuristic only | Current orchestrator uses keyword matching. Could be upgraded to LLM-based intent classification for more nuanced agent selection. |
| **UI: Evidence graph visualization** | List only | Evidence graph is displayed as a summary + top nodes list. A visual graph (D3.js, react-flow) would be a future enhancement. |

---

## 4. Architecture Flow (Complete — P1 + Phases A-E)

```
User submits forecast question
         │
         ▼
┌──────────────────────────────────────────────────┐
│ multi-agent-forecast (edge fn) — 1470 lines      │
│                                                  │
│ 1. routeCitizenQuestion()           ← P0         │
│ 2. routeForecastSkill()             ← P1: semantic routing
│ 3. searchPolymarket/Kalshi()        ← P1: market prior    │
│ 4. Query forecast_learnings         ← P1: learnings       │
│ 5. orchestrateAgents()              ← Phase C: pre-dispatch│
│    └─ selects relevant agents, skips irrelevant   │
│ 6. dispatchAgentsParallel()         ← Phase C: allSettled  │
│    └─ callAgentForecast() with skill file         │
│       └─ buildSkillEnhanced        ← P1: skill in prompt  │
│       SystemPrompt()                              │
│ 7. buildConsensusPresentation()     ← existing   │
│ 8. annotateCalibration()            ← existing   │
│ 9. calibrateWithLearnings()         ← P1         │
│ 10. blendCalibratedWithMarket()     ← P1         │
│ 11. assessEvidenceGate()            ← P1: wired   │
│ 12. LLM-as-Judge verification       ← Phase A    │
│    └─ getJudgeConfig() + buildJudgePrompt()       │
│    └─ parseJudgeResponse() + applyJudgeAdjustment │
│ 13. buildEvidenceGraph()            ← Phase B    │
│    └─ computeGraphSummary()                       │
│ 14. Global verifier (LLM/heuristic)← Phase B    │
│    └─ buildGlobalVerifierPrompt()                 │
│    └─ computeHeuristicVerifierScore() fallback    │
│ 15. computeBenchmarkSummary()       ← Phase D    │
│    └─ buildDisplayMetrics()                       │
│ 16. Insert forecast_learnings       ← P1         │
│ 17. progressTracking object         ← Phase E    │
│ 18. Return response with all fields             │
└──────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│ MultiAgentForecastPanel.tsx — 814 lines          │
│                                                  │
│ • Evidence Gate badge (P0)                       │
│ • Market Prior badge (P1)                        │
│ • Skill File badge (P1)                          │
│ • Calibration badge (P1)                         │
│ • Orchestrator badge (Phase C)                   │
│ • Benchmark metrics grid (Phase D)               │
│ • LLM-as-Judge panel (Phase A)                   │
│   └─ verdict, severity, verified prob, concerns  │
│ • Evidence Graph panel (Phase B)                 │
│   └─ nodes, edges, verified ratio, top evidence  │
│ • Global Verifier panel (Phase B)                │
│   └─ score, recommendation, strongest/weakest    │
│ • Pipeline status bar (Phase E)                  │
│   └─ 8 color-coded phase chips                   │
└──────────────────────────────────────────────────┘
```

---

## 5. Quantitative Summary

| Metric | Value |
|--------|-------|
| **Total new shared modules** | 8 (`marketPriors`, `semanticRouter`, `confidenceCalibration`, `forecastJudge`, `evidenceGraph`, `agentOrchestrator`, `benchmarkRegistry`, + `forecastJudge.test.ts`) |
| **Edge function growth** | 396 lines → 1,470 lines (+1,074 lines, 3.7x) |
| **UI panel growth** | 424 lines → 814 lines (+390 lines, 1.9x) |
| **Type definitions growth** | 311 lines → 414 lines (+103 lines) |
| **Total lines added across all files** | ~3,583 lines |
| **New TypeScript exports** | 40+ functions, 20+ interfaces, 10+ types |
| **Commits** | 3 (`58b7292`, `a159df0`, `02a9382`) |
| **Verification pipeline phases** | 8 (semantic_routing → agent_dispatch → consensus_calibration → evidence_gate → judge_verification → evidence_graph → global_verifier → benchmark_registry) |
| **LLM API calls per forecast** | 4-8 agents × 2 rounds + 1 judge + 1 global verifier = 10-18 calls |
| **Fault tolerance** | `Promise.allSettled` on agent dispatch, try/catch on judge + verifier + benchmark, heuristic fallback on verifier |
| **Platform portability** | 7/8 shared modules are pure TypeScript (globally usable). 1 module (UI) is React-specific. |

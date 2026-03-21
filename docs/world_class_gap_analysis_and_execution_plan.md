# Strategic Intelligence Platform: World-Class Gap Analysis and Execution Plan

## Purpose
This document translates the current codebase audit into a concrete plan for making the website world-class across product quality, forecasting rigor, user experience, operational reliability, and commercial readiness.

It is grounded in:
- the current React + TypeScript + Vite frontend
- the current Supabase/Postgres + edge-function backend
- the existing forecasting registry tables and score-tracking primitives
- the newly added `multi-agent-forecast` orchestration slice
- external forecasting and production-operations guidance

## Executive Summary
The product already has unusual breadth: strategy analysis, retrieval-backed reasoning, multiple specialized engines, community forecasting, and monetization scaffolding. What it lacks is a single disciplined forecast lifecycle that is explicit, scoreable, reliable, and operationally efficient.

The main strategic conclusion is:
- the platform should become a **forecast operating system**, not just a collection of analysis widgets

That requires five top-level upgrades:
- turn forecasting into a first-class workflow rather than a side panel
- bridge analysis outputs directly into the Forecast Registry lifecycle
- enforce question quality and resolution discipline
- harden data, scoring, and calibration loops
- reduce avoidable backend load before scaling traffic

## World-Class Gap Analysis

| Domain | Current Reality | Gap / Risk | World-Class Target | Priority | First Concrete Step |
| --- | --- | --- | --- | --- | --- |
| Product positioning | Multiple useful surfaces exist (`/console`, `/insights`, `/forecasts`, `/labs`) but they feel partly separate | Users may not see one coherent value chain from analysis -> forecast -> score -> learning | A unified strategic forecasting workflow with clear transitions and outcomes | High | Add guided handoff from analysis results into Forecast Registry |
| Forecast question quality | New multi-agent layer now creates question packages, but registry creation is still mostly manual | Ambiguous questions reduce scoreability and trust | All public forecasts use explicit, scoreable, source-backed resolution specs | High | Prefill registry drafts from structured analysis outputs |
| Evidence discipline | Evidence-backed analysis exists, but registry forecasts do not yet clearly preserve evidence lineage | Forecasts can lose provenance when entering the public lifecycle | Forecasts retain evidence lineage, source freshness, and evidence-gap warnings | High | Pass `analysis_run_id` and compact model payload into registry drafts |
| Adversarial reasoning | Multi-agent panel + skeptic review now exist in console output | Adversarial review is not yet part of public forecast lifecycle | Public-facing forecast creation preserves challenge notes and uncertainty warnings | High | Include skeptic/review notes in forecast draft metadata |
| Consensus governance | Existing `brier-weighted-consensus` function exists, but current registry mostly uses average probability | Public consensus quality may lag available scoring infrastructure | Champion/challenger consensus shown and governed in shadow mode | High | Surface weighted consensus alongside community mean |
| Calibration loop | Forecast tables and Brier score logic exist, but agent-level learning is not closed | Engine improvement is mostly heuristic rather than measured | Resolved outcomes feed back into agent, aggregator, and question-quality tuning | High | Link analysis-generated forecasts to later resolution and scoring |
| UX workflow | Console and Forecast Registry are separate routes; transitions are manual | Users lose momentum and context after analysis | One-click progression from analysis to publishable forecast draft | High | Add registry prefill CTA in `StrategyConsole` |
| Trust & explainability | Platform shows rich outputs, but some live-data and advanced engines still rely on heuristics/stubs | Polished UI can overstate maturity | Clear trust labels, freshness indicators, and quality gates on every forecast | High | Add implemented-vs-aspirational trust labels in docs and UI later |
| Live data quality | Some feeds remain simulated or partially mocked | Forecasts may appear live while depending on non-authoritative inputs | All premium forecast flows are backed by authoritative feeds or clearly labeled fallbacks | High | Inventory and replace remaining forecast-critical mocks by impact |
| Operational load | Analysis hook polls every 2.5s and then chains several edge functions client-side | Avoidable repeated requests and bursty compute can drive CPU usage | Server-side orchestration, fewer client round trips, bounded polling, smarter caching | High | Reduce frontend polling/query pressure and consolidate orchestration phases |
| Supabase query efficiency | Registry reads use direct list/detail queries; some tables are indexed, but frontend refresh patterns are eager | Load can scale poorly as traffic grows | Query profiles, indexes, pagination, and cache strategy tuned for real traffic | High | Profile high-volume queries and remove unnecessary refreshes |
| Auth integration | `/forecasts` was still wired with a demo user id before this phase | Real-user forecast lifecycle was partially blocked | Real authenticated identity is used across forecast creation and prediction flows | High | Use authenticated session user id in Forecast Registry route |
| Monetization | Tiering and forecast gating exist | Premium value is not yet tightly tied to differentiated forecast quality | Forecasting tiers unlock quality improvements, governance, and collaboration features | Medium | Tie elite features to challenger views, evidence depth, and audit trail |
| Collaboration | Community predictions exist, but team workflows are light | Limited moat for expert teams or enterprises | Team forecast rooms, dissent capture, review queues, and enterprise auditability | Medium | Add forecast review workflow after registry integration |
| Observability | System status exists, but forecast/analysis SLIs are not yet first-class | Hard to govern reliability and cost | Clear SLIs: latency, completion rate, evidence freshness, disagreement, CPU/query pressure | High | Add forecast-engine metrics to monitoring dashboard |

## Operational Gap Analysis: Supabase CPU Warning
Supabase’s high CPU guidance highlights three common causes relevant here:
- long-running or excessive queries
- missing indexes / poor query plans
- compute sizing that no longer matches workload

Supabase connection-management guidance also warns that transient compute and frequent short-lived callers can waste resources if connection usage and query patterns are not managed carefully.

### Most likely contributors in this codebase

| Suspected Contributor | Why it matters here | Evidence in codebase | Severity | Recommended response |
| --- | --- | --- | --- | --- |
| Frequent analysis polling | Repeated `get-analysis-status` requests can stack across active users | `useStrategyAnalysis.ts` polls every 2.5s for up to 2 minutes | High | Move to adaptive/backoff polling and stop immediately on completion/failure |
| Client-side orchestration fan-out | One completed run triggers multiple sequential edge-function calls from the browser | `useStrategyAnalysis.ts` chains recursive, symmetry, quantum, info-value, forecast, multi-agent, strategy-success, etc. | High | Move more orchestration server-side in later phase; short-term reduce unnecessary follow-up calls |
| Eager post-write refreshes in registry | Writes are followed by full list refreshes and detail refetches | `ForecastRegistry.tsx` refreshes list + user prediction after submission | Medium | Optimistically update local state where safe and batch refreshes |
| Full-row list queries | `forecasts.select('*')` fetches everything for list view | `ForecastRegistry.tsx` list query uses `select('*')` | Medium | Select only list-view columns, use pagination, and defer heavy detail fields |
| Aggregate RPC on every prediction | Probability recompute/history insert happens on each prediction submit | `update_forecast_probability` RPC + history insert | Medium | Keep for now, but batch or debounce in later higher-volume phase |
| Status path reconstructs minimal analysis | Poll completion path may require extra client-side fetch/work to regain rich output | `get-analysis-status` returns a thinner shape than immediate path | Medium | Enrich server-side status response or persist a canonical completed payload |
| Connection churn across many edge calls | Short-lived edge invocations can amplify connection pressure | Many independent edge endpoints are called per analysis | Medium | Consolidate edge workflows and verify connection-pooling/Supavisor usage |
| Compute mismatch | Even well-indexed systems can saturate if workload outgrows compute tier | Supabase warning explicitly cites >80% CPU | High | Optimize first, then upgrade compute if headroom remains insufficient |

## Immediate CPU Mitigation Plan

| Time Horizon | Action | Owner Surface | Expected Impact | Checkpoint |
| --- | --- | --- | --- | --- |
| Immediate | Reduce avoidable polling and ensure all status loops terminate cleanly | `src/hooks/useStrategyAnalysis.ts` | Lower repeated status-query volume | Poll interval/backoff reviewed and verified |
| Immediate | Trim forecast list query payloads and avoid unnecessary full reloads | `src/components/ForecastRegistry.tsx` | Lower read CPU and bandwidth | List view uses only required columns |
| Immediate | Audit slow queries and top SQL in Supabase Observability | Supabase dashboard | Identify true CPU offenders instead of guessing | Top 5 slowest query families documented |
| Immediate | Verify indexes on highest-volume filters (`forecasts`, `forecast_predictions`, `analysis_runs`) | DB / migrations history | Reduce scan-heavy reads | Explain plans show index usage |
| Immediate | Confirm Supavisor / connection pooling posture for edge-heavy workload | Supabase config | Reduce connection churn | Pooling settings reviewed |
| Near-term | Collapse browser-side multi-call orchestration into fewer server-side workflows | edge functions | Reduce burst fan-out per analysis | One canonical orchestration endpoint designed |
| Near-term | Add cache and TTL strategy for repeatable status/registry reads | frontend + edge | Reduce repeated compute for similar reads | Cache policy documented |
| Near-term | Add alerting on CPU, query latency, and active polling count | observability | Earlier detection before incidents | Alert thresholds defined |
| Long-term | Upgrade compute tier if optimized workload still runs above safe headroom | Supabase project | Capacity margin for growth | Sustained CPU target achieved |

## Detailed Implementation Plan

### Phase 1: Complete forecast lifecycle integration
Goal:
- connect analysis-derived forecasts to public forecast creation without schema changes

Build steps:
1. Use real authenticated identity in the Forecast Registry route.
2. Add a one-click CTA from `StrategyConsole` to create a forecast from the multi-agent result.
3. Prefill the registry create form with:
   - title
   - question
   - resolution criteria
   - resolution date
   - category
   - tags
   - `analysis_run_id`
   - compact `game_theory_model` payload
4. Preserve skeptic/adversarial notes in the carried draft payload.
5. Keep forecast creation editable before submission.

Checkpoint:
- a user can run analysis in `/console`, open `/forecasts`, and see a populated, scoreable draft

Adversarial checks:
- does the draft remain editable?
- does it degrade gracefully if the analysis object is incomplete?
- are we storing only fields supported by the current schema?

### Phase 2: Make forecasts first-class and scoreable
Goal:
- ensure every forecast entering the registry is genuinely resolvable later

Build steps:
1. Add question-quality validation before publish.
2. Require explicit resolution source/fallback for engine-generated drafts.
3. Introduce trust labels for evidence density, freshness, and ambiguity.
4. Add a resolution-readiness checklist in the creation flow.

Checkpoint:
- engine-generated forecasts can be scored later without ambiguous manual cleanup

Adversarial checks:
- does the UI block vague questions but still allow expert override where justified?
- are binary vs directional questions handled consistently?

### Phase 3: Improve consensus and scoring quality
Goal:
- move from naive community averaging toward quality-aware aggregation

Build steps:
1. Surface `brier-weighted-consensus` in the registry detail view.
2. Show community mean, superforecaster consensus, and consensus gap together.
3. Compare engine consensus vs community consensus in shadow mode.
4. Track which consensus family is best calibrated over resolved questions.

Checkpoint:
- users can distinguish crowd average from quality-weighted consensus

Adversarial checks:
- are new users unfairly suppressed?
- are low-sample superforecaster signals over-trusted?
- is weighting transparent enough for users to trust it?

### Phase 4: Reduce avoidable backend load
Goal:
- shrink CPU usage before scaling traffic and premium features

Build steps:
1. Replace fixed 2.5s polling with adaptive/backoff polling.
2. Stop polling as soon as terminal state is observed.
3. Reduce list-view payload size and unnecessary refreshes.
4. Batch or defer non-critical post-analysis enrichments.
5. Move multi-engine orchestration behind fewer backend entrypoints.

Checkpoint:
- active analysis sessions generate materially fewer DB/API round trips

Adversarial checks:
- do users still perceive the app as responsive?
- did reduced polling create stale or confusing status UX?

### Phase 5: Data and model hardening
Goal:
- raise trust from “impressive demo” to “decision-grade platform”

Build steps:
1. Replace forecast-critical mocks and simulated feeds with authoritative sources.
2. Add freshness SLAs and fallback labeling.
3. Store compact provenance summaries in user-visible views.
4. Add incident review for forecast-quality regressions.

Checkpoint:
- the system clearly signals what is live, stale, heuristic, or fallback

Adversarial checks:
- are premium claims stronger than the underlying data reality?
- do fallback paths stay visible to the user?

### Phase 6: Learning and moat
Goal:
- build a compounding advantage from resolved forecasts and user participation

Build steps:
1. Score engine-generated forecasts against reality.
2. Add agent-level and challenger-level calibration tracking.
3. Introduce promotion logic for champion/challenger consensus.
4. Add collaborative review and dissent capture for teams.
5. Use resolved history to tune question-quality and aggregation policies.

Checkpoint:
- the product improves through measured feedback loops, not just new prompts

Adversarial checks:
- are we optimizing for leaderboard vanity instead of calibration?
- are we overfitting to a narrow question class?

## World-Class Checkpoint Framework

| Checkpoint | Exit Criteria | Failure Signal | Recovery Action |
| --- | --- | --- | --- |
| Question Discipline | Every forecast has explicit question, horizon, source, fallback, and resolution criteria | Forecasts require manual interpretation to resolve | Block publish or require analyst override |
| Evidence Discipline | Every forecast exposes evidence lineage or explicit insufficiency | Forecast looks precise but provenance is weak | Downgrade trust label and keep skeptic warning visible |
| Adversarial Discipline | Every engine forecast includes contradiction points and missing evidence | Consensus appears authoritative without challenge | Force skeptic block into draft and detail views |
| Consensus Discipline | Champion and challenger variants are both visible | One aggregation rule is treated as gospel | Keep challengers in shadow and track calibration |
| Operational Discipline | Request volume and compute cost stay bounded as usage grows | CPU/latency rise faster than traffic | Consolidate orchestration and reduce polling |
| Scoring Discipline | Forecasts can be resolved and scored with low ambiguity | Resolutions require ad hoc judgment | Tighten creation constraints and resolution workflow |

## Adversarial Analysis

| Risk | Why it is dangerous | Likely current trigger | Mitigation |
| --- | --- | --- | --- |
| Beautiful but unscoreable forecasts | Users trust outputs that cannot be evaluated later | Manual registry creation without enforced structure | Prefill from structured question package + publish checks |
| UI coherence masking backend fragmentation | Product seems unified but behavior is actually brittle | Browser-side chaining of many services | Move toward server-side canonical orchestration |
| Overconfidence from heuristic agent weighting | Consensus may look scientific without sufficient calibration | Current initial multi-agent slice uses heuristic weighting | Keep visible challenger variants and avoid overclaiming |
| CPU saturation from growth | Product success itself can destabilize infra | Polling + fan-out + eager refreshes | Optimize workload before expanding traffic |
| Mock-data contamination | One weak feed can poison perceived product trust | Some live-data modules still have simulated/fallback logic | Label and replace forecast-critical mocks by priority |
| Community consensus quality drift | Crowds can be noisy, stale, or gamed | Naive mean dominates current registry | Introduce weighted consensus and reliability indicators |

## Recommended Next 3 Engineering Moves
1. Finish the console -> registry draft handoff.
2. Reduce polling/query pressure in the current frontend paths.
3. Surface weighted consensus in the registry detail flow.

## Status
- Gap analysis: documented
- World-class execution roadmap: documented
- Supabase CPU mitigation plan: documented
- Option 1 implementation: in progress

# ProphetHacks Feasibility Analysis — Strategic Intelligence Platform Integration

> **Source**: [ProphetHacks Research Article](https://www.prophetarena.co/research/prophethacks)
> **Event**: 32-hour AI forecasting hackathon (May 16-17, 2026), UChicago Sigma Lab + Fleet AI + Kalshi
> **Analysis date**: 2026-07-06
> **Scale**: 1 (low) to 5 (high) for feasibility, value-add, and effort

---

## 1. Article Summary — What ProphetHacks Demonstrated

**Key finding**: AI agents using disciplined harnesses and the best available models already beat prediction markets on Brier score. No trading agent beat the market — turning good probabilities into profit is a separate problem.

### Winner: CodexProphet (Hanson Wen, UC Berkeley; James Gui, USC)
- **+0.0369 Brier improvement** over market prices
- Used Codex as agent harness (didn't build custom agent loop)
- Hosted on dedicated Mac Mini for persistent environment
- **Per-category skill files** as "procedural priors" (procedures, not answers)
- **Calibration from historical Kalshi market analysis** (Learnings.md)
- Core approach: **extract market baseline, nudge up/down by small amounts**
- Category-specific insights: entertainment (timestamped signals), sports (evidence hierarchy), crypto (probability geometry), macro/weather (source fidelity), politics (hardest — evidence abundance without resolution clarity)

### Runner-up: Conservative Hybrid Agent (Shirish Chinchanikar, UChicago)
- Core idea: **prediction market is a strong prior, not an answer to overwrite**
- **Hierarchical calibration table** by sector, subtype, time-to-close, probability bucket
- **Ridge regression residual model** (capped at 5 percentage points)
- **LLM for semantic routing** and **evidence gating** (3 questions: relevant? credible? not already priced in?)
- **"No move" was a valid output**, not a failure
- Key insight: conservatism is why it worked — rarely gave anything back

---

## 2. Feasibility & Value-Add Analysis — Technique by Technique

| # | ProphetHacks Technique | What It Does | Platform Already Has? | Feasibility (1-5) | Value-Add (1-5) | Effort (1-5) | Net Score | How to Integrate |
|---|----------------------|-------------|----------------------|-------------------|-----------------|-------------|-----------|-------------------|
| 1 | **Per-category skill files as procedural priors** | Domain-specific playbooks with evidence hierarchies, calibration warnings, domain traps. Not answers — procedures. | Partial. `conceptSystem.ts` has game theory concepts but not forecasting-specific skill files with evidence hierarchies. | **5** — Very feasible. Skill files are just structured markdown/JSON. Platform already has `conceptSystem.ts` pattern to extend. | **5** — Very high. Would dramatically improve forecast quality by giving the AI agent domain-specific procedures instead of generic prompts. Directly addresses the platform's core value proposition of evidence-backed analysis. | **2** — Low effort. Create 8-10 skill files (geopolitical, financial, macro, technology, social, commodity, negotiation, competitive strategy). Each is ~200 lines of structured guidance. | **+8** | Create `src/lib/forecastSkills/` directory with per-category skill files. Each file contains: evidence hierarchy, calibration warnings, domain-specific traps, source recommendations, probability validation rules. Wire into `multi-agent-forecast/` edge function as a skill router. |
| 2 | **Market baseline + small nudges approach** | Use prediction market prices (Kalshi, Polymarket) as the starting prior. Only nudge up/down by small amounts when evidence justifies it. | No. Platform generates forecasts from game-theoretic models and evidence retrieval, not from market prices. | **4** — Feasible. Requires adding a prediction market data source (Kalshi/Polymarket API). Platform already has `market-stream/` edge function for market data. | **5** — Very high. Market-anchored forecasting is empirically proven to beat standalone model forecasts (ProphetHacks result). Would add a strong prior to the platform's existing game-theoretic approach, creating a hybrid that's better than either alone. | **3** — Medium effort. Add Kalshi/Polymarket API integration to `market-stream/` edge function. Create a `marketPriorResolver` that fetches relevant market prices and feeds them as the baseline to the forecasting engine. | **+6** | Add `supabase/functions/market-prior/` edge function. Integrate with `outcome-forecasting/` to use market price as prior. Show market baseline alongside model forecast in `MultiAgentForecastPanel.tsx` with a "nudge delta" indicator. |
| 3 | **Hierarchical calibration tables** | Group historical forecasts by sector, subtype, time-to-close, and probability bucket. Compute residual adjustments per bucket. | Partial. Platform has `fitIsotonicCalibration()` in `shared/mlAdvisory.ts` with isotonic regression and Bayesian-smoothed calibration. But it's a single-segment calibration, not hierarchical by sector/subtype/time-to-close/bucket. | **4** — Feasible. Calibration infrastructure already exists. Extending to hierarchical buckets is a data modeling change, not a new system. | **4** — High. Hierarchical calibration would improve forecast accuracy by accounting for the fact that a 40% geopolitical forecast and a 40% sports forecast have different calibration curves. | **3** — Medium effort. Extend `CalibrationSegmentKey` type to include sector, subtype, time-to-close, and probability bucket. Update `calibration-refresh/` edge function to compute per-bucket calibration. Requires historical forecast data (which the platform accumulates via `ForecastRegistry`). | **+5** | Extend `CalibrationSegmentKey` in `shared/mlAdvisory.ts` from 3 segments to hierarchical segments. Update `calibration-refresh/` to compute per-bucket models. Show calibration bucket in `MultiAgentForecastPanel.tsx`. |
| 4 | **Ridge regression residual model** | Fast model that predicts `outcome - market_prior` from features like bid-ask spread, price movement, volume, volatility. Output capped at ±5 percentage points. | No. Platform doesn't have a residual model layer. | **3** — Moderate. Requires feature engineering, historical data, and a regression model. Platform uses edge functions (Deno) which can run simple regression but not full ML training. Would need a Python ML service. | **3** — Medium. Adds a structured-signal correction layer on top of the market prior. Useful but the platform's game-theoretic engines already provide structural signal that a ridge model can't capture. | **4** — High effort. Requires Python ML service (platform has `ml-service/` directory), feature pipeline, historical data accumulation, model training, and inference endpoint. | **+2** | Add to `ml-service/` as a residual model module. Train on historical forecast vs. outcome data. Deploy as inference endpoint. Call from `outcome-forecasting/` edge function. |
| 5 | **Evidence gating (3-question gate)** | Before adjusting a forecast, ask: (1) Is the information relevant and directionally useful? (2) Is it credible? (3) Is it probably not already priced in? If any answer is no, don't move. | Partial. Platform has provenance badges (`ProvenanceBadge.tsx`) that classify claims as evidence-backed, LLM-unverified, or heuristic fallback. But there's no formal "should we move the forecast?" gate. | **5** — Very feasible. It's a decision logic layer, not a new infrastructure. Can be implemented as a TypeScript function in the existing forecasting pipeline. | **5** — Very high. Prevents the platform from making unnecessary or harmful forecast adjustments. Aligns perfectly with the platform's governance-first philosophy (human review, publish-readiness gating, claim registry). "No move" as a valid output is a governance principle, not just a technique. | **1** — Very low effort. A pure function that takes evidence metadata and returns a gate decision. ~100 lines of TypeScript. | **+9** | Create `src/lib/evidenceGate.ts` with `assessEvidenceGate(evidence: EvidenceItem[]): GateDecision`. Wire into `outcome-forecasting/` edge function before probability adjustment. Show gate status in `MultiAgentForecastPanel.tsx`. |
| 6 | **"No move" as valid output** | When evidence is weak, mixed, or already priced in, the system returns the prior without adjustment. This is a valid outcome, not a failure. | No. Platform's forecasting engine always generates a probability — it doesn't have a "no change" state. | **5** — Very feasible. It's a UI and logic pattern, not infrastructure. | **5** — Very high. Aligns with platform's honesty-first philosophy (claim registry, provenance badges, pilot preview positioning). Showing "no move — evidence insufficient" builds trust. | **1** — Very low effort. Add a `noMove: boolean` field to forecast results. Display it in the UI as a distinct state. | **+9** | Add `noMoveReason` to `MultiAgentForecast` type. When evidence gate returns "blocked", set `noMoveReason` instead of adjusting probability. Display in `MultiAgentForecastPanel.tsx` as "No adjustment — evidence insufficient or already reflected in prior." |
| 7 | **LLM-based semantic routing** | Use LLM to classify events into categories when keyword logic is too brittle (e.g., "bill" in "Billie Eilish", "Will NYC exceed 80?" — temperature or price?). | Partial. Platform has `routeCitizenQuestion()` in `shared/publicForecasting.ts` which routes questions by intent. But it uses keyword/pattern matching, not LLM-based semantic routing. | **4** — Feasible. Platform already has `ai-mediator/` and `question-intake-v2/` edge functions that use LLMs. Adding semantic routing is extending an existing pattern. | **4** — High. Would improve routing accuracy for ambiguous questions, especially as the platform scales to more diverse use cases. | **2** — Low effort. Add a semantic routing prompt to `question-intake-v2/` edge function. ~50 lines of prompt engineering + response parsing. | **+6** | Extend `question-intake-v2/` edge function with an LLM-based semantic classification step. Fall back to keyword routing if LLM is unavailable. Update `routeCitizenQuestion()` to call the LLM router first. |
| 8 | **Learnings.md — persistent agent learnings** | A structured file the agent consults at decision time, containing statistically meaningful trends distilled from historical analysis. | No. Platform doesn't have a persistent learnings file for the forecasting agent. | **5** — Very feasible. It's a markdown file stored in the database or edge function storage. | **4** — High. Would allow the platform to accumulate forecasting wisdom over time — which categories the platform is overconfident in, which sources are most reliable, which scenarios are hardest. | **2** — Low effort. Create a `forecastLearnings` table in Supabase. Edge function reads it at decision time. Analyst can update it through the Human Review workflow. | **+7** | Create `forecast_learnings` table in Supabase. `outcome-forecasting/` edge function reads learnings before generating forecast. Human Review workflow includes "update learnings" action when a pattern is identified. |
| 9 | **Persistent agent environment** | Host the agent on a dedicated machine with persistent state (files on disk, local tools, skill files) rather than stateless API calls. | No. Platform uses stateless Supabase Edge Functions (Deno). | **2** — Low feasibility. Platform architecture is serverless edge functions. Moving to a persistent agent environment would be a fundamental architecture change. | **3** — Medium. Persistent environment improved CodexProphet's consistency, but the platform's serverless architecture is actually a strength for scalability and cost. | **5** — Very high effort. Would require standing up a persistent agent server (EC2/VPS), managing state, and integrating with the existing edge function pipeline. | **0** | Not recommended for this platform. The serverless architecture is the right choice for a web app. Instead, simulate persistence via database-backed state (learnings table, calibration models, skill files in storage). |
| 10 | **Historical market analysis for calibration** | Analyze thousands of historical market resolutions to find under/over-confidence patterns at different times before market close. | Partial. Platform has `calibration-refresh/` and `drift-evaluate/` edge functions. But it doesn't analyze prediction market historical data specifically. | **3** — Moderate. Requires access to historical Kalshi/Polymarket data (API or scrape). Platform's calibration is based on its own forecast history, not market data. | **3** — Medium. Would add a market-data-driven calibration signal. But the platform's own forecast history is more directly relevant to its calibration needs. | **3** — Medium effort. Add a `market-history-sync/` edge function that fetches historical Kalshi/Polymarket resolutions. Feed into calibration pipeline. | **+3** | Add `supabase/functions/market-history-sync/` edge function. Sync historical market resolutions to a `market_history` table. Feed into `calibration-refresh/` as an additional calibration signal. |
| 11 | **Confidence-conditional calibration** | Stratify predictions by confidence level. High-confidence calls may be well-calibrated while mid-confidence calls are worse than a coin flip. | No. Platform's calibration is probability-level calibration (isotonic regression), not confidence-conditional. | **4** — Feasible. Extends existing calibration system with an additional stratification dimension. | **4** — High. Would surface a known forecasting failure mode (mid-confidence overconfidence) and allow the platform to warn users when a forecast is in the danger zone. | **2** — Low effort. Add confidence bucket to calibration segment key. Compute per-bucket calibration metrics. ~150 lines of code. | **+6** | Add `confidenceBucket` to `CalibrationSegmentKey`. Update `fitIsotonicCalibration()` to compute per-confidence-bucket models. Show confidence-conditional calibration status in `MultiAgentForecastPanel.tsx`. |
| 12 | **Longshot probability floor** | Floor per-outcome probability at `min(0.10, max(0.05, 0.5 / n_outcomes))` to prevent assigning near-zero probability to outcomes that historically resolve more often. | No. Platform doesn't have a longshot floor. | **5** — Very feasible. It's a one-line clamp in the probability computation. | **3** — Medium. Prevents a known forecasting failure mode (assigning 1% to events that resolve 10% of the time). But the platform's scenarios are strategic, not market-style, so longshot bias may be less prevalent. | **1** — Very low effort. One line of code in the probability normalization step. | **+7** | Add longshot floor to `outcome-forecasting/` edge function: `probability = max(probability, min(0.10, max(0.05, 0.5 / n_outcomes)))`. |

---

## 3. Summary Scorecard

| Technique | Feasibility | Value-Add | Effort (inverted) | Net Score | Priority |
|-----------|------------|-----------|-------------------|-----------|----------|
| **Evidence gating (3-question gate)** | 5 | 5 | 5 | **+9** | P0 — Do first |
| **"No move" as valid output** | 5 | 5 | 5 | **+9** | P0 — Do first |
| **Per-category skill files** | 5 | 5 | 4 | **+8** | P0 — Do first |
| **Longshot probability floor** | 5 | 3 | 5 | **+7** | P1 — Quick win |
| **Learnings.md — persistent agent learnings** | 5 | 4 | 4 | **+7** | P1 — Quick win |
| **Market baseline + small nudges** | 4 | 5 | 3 | **+6** | P1 — High value |
| **LLM-based semantic routing** | 4 | 4 | 4 | **+6** | P1 — High value |
| **Confidence-conditional calibration** | 4 | 4 | 4 | **+6** | P1 — High value |
| **Hierarchical calibration tables** | 4 | 4 | 3 | **+5** | P2 — Medium value |
| **Ridge regression residual model** | 3 | 3 | 2 | **+2** | P3 — Low priority |
| **Historical market analysis for calibration** | 3 | 3 | 3 | **+3** | P3 — Low priority |
| **Persistent agent environment** | 2 | 3 | 1 | **0** | Skip — Architecture mismatch |

---

## 4. Recommended Implementation Phases

### Phase 1: Quick Wins (1-2 days, P0 items)

| Step | What | Files to Create/Modify | Effort |
|------|------|----------------------|--------|
| 1.1 | Create `src/lib/evidenceGate.ts` | New file: `evidenceGate.ts` (~100 lines). Function: `assessEvidenceGate(evidence, priorProbability)` returns `{ decision: 'move' \| 'no_move', reason: string, confidence: number }` | 2 hours |
| 1.2 | Add "no move" state to forecast types | Modify `src/types/strategic-analysis.ts`: add `noMoveReason?: string \| null` to `MultiAgentForecast` | 30 min |
| 1.3 | Wire evidence gate into forecasting | Modify `supabase/functions/outcome-forecasting/index.ts`: call `assessEvidenceGate()` before adjusting probability | 1 hour |
| 1.4 | Display "no move" in UI | Modify `src/components/MultiAgentForecastPanel.tsx`: show "No adjustment — evidence insufficient or already reflected in prior" state | 1 hour |
| 1.5 | Create per-category skill files | New directory: `src/lib/forecastSkills/`. Create 8 files: `geopolitical.ts`, `financial.ts`, `macro.ts`, `technology.ts`, `social.ts`, `commodity.ts`, `negotiation.ts`, `competitiveStrategy.ts`. Each ~150-200 lines. | 4 hours |
| 1.6 | Wire skill router into multi-agent forecast | Modify `supabase/functions/multi-agent-forecast/index.ts`: route to appropriate skill file based on scenario classification | 2 hours |

### Phase 2: High-Value Additions (3-5 days, P1 items)

| Step | What | Files to Create/Modify | Effort |
|------|------|----------------------|--------|
| 2.1 | Add longshot probability floor | Modify `supabase/functions/outcome-forecasting/index.ts`: add floor clamp | 30 min |
| 2.2 | Create `forecast_learnings` table | New Supabase migration: `forecast_learnings` table with columns: id, category, learning_text, evidence_count, created_at, updated_at | 1 hour |
| 2.3 | Wire learnings into forecasting | Modify `outcome-forecasting/` to read `forecast_learnings` before generating forecast. Add "update learnings" action to Human Review workflow. | 3 hours |
| 2.4 | Add Kalshi/Polymarket API integration | New edge function: `supabase/functions/market-prior/`. Fetch relevant market prices for the scenario. Return as prior probability. | 4 hours |
| 2.5 | Display market prior in UI | Modify `MultiAgentForecastPanel.tsx`: show market baseline, model forecast, and nudge delta | 2 hours |
| 2.6 | Add LLM semantic routing | Modify `supabase/functions/question-intake-v2/index.ts`: add LLM-based classification step before keyword routing | 3 hours |
| 2.7 | Add confidence-conditional calibration | Modify `shared/mlAdvisory.ts`: add `confidenceBucket` to `CalibrationSegmentKey`. Update `fitIsotonicCalibration()` | 4 hours |

### Phase 3: Medium-Value Extensions (1-2 weeks, P2 items)

| Step | What | Files to Create/Modify | Effort |
|------|------|----------------------|--------|
| 3.1 | Extend hierarchical calibration | Modify `CalibrationSegmentKey` to include sector, subtype, time-to-close. Update `calibration-refresh/` edge function. | 3 days |
| 3.2 | Add market history sync | New edge function: `market-history-sync/`. Sync historical Kalshi/Polymarket resolutions. Feed into calibration. | 2 days |
| 3.3 | Add ridge regression residual model | New module in `ml-service/`: feature engineering, model training, inference endpoint. | 5 days |

---

## 5. Competitive Advantage Analysis

| Dimension | Before ProphetHacks Integration | After ProphetHacks Integration | Competitive Impact |
|-----------|-------------------------------|-------------------------------|-------------------|
| **Forecast methodology** | Game-theoretic models + evidence retrieval → standalone probability | Game-theoretic models + evidence retrieval + market prior + evidence gate + skill files → calibrated probability with "no move" option | Uniquely combines game theory (no competitor has this) with market-anchored forecasting (ProphetHacks-proven). Best of both worlds. |
| **Calibration** | Single-segment isotonic regression | Hierarchical, confidence-conditional calibration with market-data signal | More honest calibration than Metaculus (which has basic calibration) or Palantir (which has none). |
| **Governance** | Human review + publish-readiness gating + claim registry | + Evidence gate ("no move" as valid output) + persistent learnings | Strongest governance layer in the market. No competitor has formal evidence gating. |
| **Domain expertise** | Game theory concept system + scenario templates | + Per-category procedural skill files with evidence hierarchies and domain traps | Codifies forecasting expertise in a way no competitor does. Skill files are a moat — they improve with use. |
| **Honesty signals** | Provenance badges + calibration status labels | + "No move" state + confidence-conditional calibration warnings + market prior transparency | Most transparent forecasting platform. Users see exactly why a probability was or wasn't adjusted. |

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Kalshi/Polymarket API access denied or rate-limited | Medium | Medium | Use Polymarket (public API, no auth required) as primary. Kalshi as secondary. Fall back to game-theoretic model only if market data unavailable. |
| Skill files become stale or misleading | Low | Medium | Add skill file review to Human Review workflow. Version skill files. Track which skill files produced best forecasts. |
| "No move" state confuses users | Low | Low | Clear UI messaging: "No adjustment — evidence insufficient or already reflected in prior." This is a feature, not a bug. |
| Market prior dominates game-theoretic signal | Medium | Medium | Cap nudge delta at ±10 percentage points. Show both market prior and model forecast independently. Let user see the disagreement. |
| Calibration data insufficient for hierarchical buckets | High | Low | Fall back to single-segment calibration when bucket sample size < 25 (already implemented in `fitIsotonicCalibration()`). |
| Ridge regression model overfits to historical data | Medium | Medium | Cap predictions at ±5 percentage points (per ProphetHacks runner-up design). Use regularization. Backtest with chronological split. |

---

## 7. Verification — Codebase Alignment

| ProphetHacks Concept | Platform File | Alignment Status |
|---------------------|---------------|-----------------|
| Calibration | `shared/mlAdvisory.ts` — `fitIsotonicCalibration()`, `CalibrationEnvelope`, `CalibrationModelRecord` | ✅ Strong foundation. Extensible for hierarchical and confidence-conditional calibration. |
| Brier scoring | `supabase/functions/brier-weighted-consensus/` | ✅ Already implemented. Used in Forecast Registry. |
| Multi-agent forecasting | `supabase/functions/multi-agent-forecast/` + `src/components/MultiAgentForecastPanel.tsx` | ✅ Already has disagreement index and champion model selection. Ready for skill file integration. |
| Evidence retrieval | `supabase/functions/evidence-retrieval-exa/` + `retrieval/` | ✅ Uses Exa neural search. Ready for evidence gate integration. |
| Human review | `src/components/HumanReview.tsx` + `supabase/functions/human-review/` | ✅ Already has approve/reject workflow. Ready for "update learnings" action. |
| Forecast governance | `src/lib/forecastGovernance.ts` | ✅ Already has publish-readiness gating. Evidence gate is a natural extension. |
| Question routing | `shared/publicForecasting.ts` — `routeCitizenQuestion()` | ✅ Already has intent-based routing. Ready for LLM semantic routing upgrade. |
| Scenario classification | `shared/gameTheoryKnowledge.ts` — `classifyStrategicScenario()` | ✅ Already classifies scenarios by game family and domain. Can be used for skill file routing. |
| Market data | `supabase/functions/market-stream/` + `trading-signals/` | ✅ Already has market data infrastructure. Ready for Kalshi/Polymarket integration. |
| ML service | `ml-service/` directory with `main.py`, `modal_worker.py` | ✅ Already has Python ML service. Ready for ridge regression model. |
| Concept system | `src/lib/conceptSystem.ts` | ✅ Pattern to follow for skill files. Same structure: definitions, examples, misconceptions. |

---

## 8. Conclusion

**ProphetHacks demonstrated that disciplined AI forecasting agents can beat prediction markets today.** The techniques are not exotic — they're about procedure, calibration, and conservatism. The Strategic Intelligence Platform already has 70% of the infrastructure needed to implement these techniques. The remaining 30% is:

1. **Evidence gating + "no move" state** (P0, 1 day, net score +9) — Pure logic, no infrastructure
2. **Per-category skill files** (P0, 1 day, net score +8) — Structured markdown, follows existing pattern
3. **Market prior integration** (P1, 2 days, net score +6) — API integration, extends existing market-stream
4. **Confidence-conditional calibration** (P1, 1 day, net score +6) — Extends existing calibration system
5. **Persistent learnings** (P1, 1 day, net score +7) — Database table + edge function read

**Total estimated effort for P0 + P1**: 5-7 days
**Competitive impact**: Transforms the platform from "game-theoretic analysis with forecasting" to "game-theoretic analysis + market-anchored, skill-guided, evidence-gated, calibration-aware forecasting with persistent learnings." No competitor has this combination.

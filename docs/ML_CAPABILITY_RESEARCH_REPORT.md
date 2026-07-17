# ML Capability Research Report for Strategic Intelligence Platform

Generated: 2026-05-01  
Scope: `Strategy Console + Forecast Registry` and `Geopolitical Radar + Commodities`  
Evidence base: `repo truth` from the current codebase plus `primary sources` only

## Executive Summary

The platform already has a strong intelligence shell, but most of it is not yet trained ML. The current stack is best described as `deterministic game-theory logic + heuristic feed translation + structured prompt orchestration + human/release governance`, with a few statistical layers that look model-like but are still hand-authored rather than learned.

The highest-confidence ML upgrades are not the flashiest ones. The strongest near-term additions are `probabilistic calibration`, `ontology-grounded retrieval`, `human-in-the-loop learning`, and `drift-triggered refresh`. The most strategically differentiated longer-horizon bets are `temporal knowledge-graph forecasting` and `multimodal objective-feed fusion`, but both depend on better entity resolution and better non-text data than the repo currently has.

Two ideas from the supplied list should be treated as `enablers`, not headline ML features: `object storage decoupling` and `stateful DAG orchestration`. They may still be useful operationally, but the repo evidence does not support presenting them as the primary ML roadmap.

## Methodology

- Repo surfaces audited: `useStrategyAnalysis`, `StrategyConsole`, `ForecastRegistry`, `brier-weighted-consensus`, `whitebox-release`, `gdelt-stream`, `market-stream`, `dynamic-recalibration`, `outcome-forecasting`, `human-review`, plus the deterministic knowledge and solver layers in `shared/gameTheoryKnowledge.ts` and `src/lib/matrixLab.ts`.
- Primary-source themes reviewed: calibration, ontology-grounded retrieval, temporal KG event forecasting, Wasserstein drift detection, time-series attribution, human-in-the-loop forecasting correction, hard-constrained neural methods, AIS-based forecasting, and rare-event synthetic data.
- `Applicability Index (1-5)`: data readiness, label availability, infra fit, inference cost, integration complexity, and dependence on self-hosted model infrastructure.
- `Alignment Index (1-5)`: fit to the chosen product wedges, trust impact, decision-quality uplift, leverage of existing modules, and strategic differentiation.
- Ranking rule: once a feature cleared the feasibility bar, ranking favored `strategic differentiation` rather than raw score sum alone.

## Current-State Diagnosis

| Layer | What Exists In Repo | Repo Evidence | Diagnosis |
| --- | --- | --- | --- |
| Deterministic strategy logic | Canonical payoff-matrix solvers, best-response checks, pattern detection, doctrine cards, scenario templates, sequential-game trees | `src/lib/matrixLab.ts:1-143`, `shared/gameTheoryKnowledge.ts:1-186` | Strong substrate for constraint-aware and ontology-aware ML, but not learned ML. |
| Prompt/orchestration layer | Browser-side fan-out from one analysis into many specialized engines | `src/hooks/useStrategyAnalysis.ts:762-1084` | This is orchestration-heavy and brittle, but it is not an integrated trained model stack. |
| Heuristic live-feed translation | GDELT events are mapped to game types with fixed event-code rules and thresholds; market moves are mapped to bargaining or auction scenarios with simple price-change logic; radar scoring is keyword and weighted-rule driven | `supabase/functions/gdelt-stream/index.ts:11-68`, `supabase/functions/market-stream/index.ts:5-45`, `src/lib/geopoliticalRadar.ts:7-167` | Current geopolitical and commodity intelligence is useful, but mostly heuristic and vulnerable to noise. |
| Statistical/model-like layers | Outcome curves use authored decay models and confidence intervals; recalibration uses Bayesian-style belief updates and trigger heuristics | `supabase/functions/outcome-forecasting/index.ts:1-229`, `supabase/functions/dynamic-recalibration/index.ts:1-257` | These look “ML-like” in UI terms, but they are still handcrafted statistical logic, not learned from historical labels. |
| Governance and evaluation | Brier-weighted aggregation, champion/challenger consensus policies, resolved-forecast Brier evaluation, and reviewer workflows already exist | `supabase/functions/brier-weighted-consensus/index.ts:44-211`, `supabase/functions/_shared/whitebox-release.ts:141-198`, `supabase/functions/_shared/whitebox-release.ts:250-275`, `supabase/functions/_shared/whitebox-release.ts:356-502`, `supabase/functions/human-review/index.ts:121-260` | This is the best current insertion point for trustworthy ML because the repo already captures quality signals. |
| Missing ML primitives | No evidence of entity-resolution training, objective multi-modal feed fusion, offline model-training/evaluation service, or gradient access/open-weight fine-tuning stack | Repo-wide absence across audited surfaces | This makes direct DINN/PINN-for-LLM-text and Integrated-Gradients-on-closed-LLM proposals structurally weak today. |

### Bottom-Line Diagnosis

- The platform is already `rich in structure` and `poor in learned adaptation`.
- The best ML roadmap is therefore to `learn on top of the existing structure`, not to replace it with a full custom model-hosting stack.
- The repo is unusually well positioned for `calibration`, `retrieval grounding`, `review-loop learning`, and `constraint-aware reranking`.

## Audit Of The 10 Supplied Suggestions

| # | Supplied Suggestion | Verdict | Repo-Grounded Assessment | Adversarial Notes |
| --- | --- | --- | --- | --- |
| 1 | Probabilistic calibration with isotonic regression | `KEEP` | The repo already tracks Brier-based performance and weighted consensus, so calibrated strategist and forecast probabilities have a clean insertion path. | The bottleneck is not theory; it is sparse resolved outcomes. Calibration can only be as good as the resolution history. |
| 2 | Object storage decoupling | `DEMOTE` | This may become useful operationally, but the stronger repo signal is client-side orchestration fan-out, not a proven ML bottleneck caused by large JSON payloads. | Treat as infra debt retirement if needed, not as an ML feature. The prior claim of a confirmed JSONB root cause is not established by repo truth. |
| 3 | PINNs / DINNs for doctrine-aware reasoning | `REFRAME` | The repo already has deterministic game-theory structure and doctrine cards; the practical move is a constraint-aware or neuro-symbolic reranker/post-processor, not PINN-style soft penalties over LLM text. | The current stack has no open-weight training loop or gradient access. Soft-penalty approaches also do not guarantee hard constraint satisfaction. |
| 4 | Spatial-temporal GNNs for geopolitical and supply-chain mapping | `KEEP` | `gdelt-stream` and `real_time_events` provide the right product surface for temporal-graph forecasting. | The major blocker is entity resolution and noisy event extraction, not model architecture alone. |
| 5 | Objective ground-truth anchoring with non-text feeds | `KEEP` | This directly addresses the repo’s dependence on noisy news-derived signals in geopolitical and commodity surfaces. | Data access, licensing, and alignment across feeds will be harder than the modeling itself. |
| 6 | Wasserstein drift detection | `KEEP` | `market-stream`, `outcome-forecasting`, and `dynamic-recalibration` give this a clear trigger-based insertion path. | Threshold calibration is nontrivial; drift detectors can create either stale strategies or expensive alert spam. |
| 7 | Explainability via Integrated Gradients | `REFRAME` | Attribution is useful, but the practical target is time-series and surrogate models, not closed LLM APIs. | Direct gradient attribution on hosted LLMs is structurally blocked. Use surrogate or auxiliary models instead. |
| 8 | Stateful DAG orchestration | `DEMOTE` | This can reduce edge-function fragility if orchestration becomes a bottleneck, but it does not itself improve forecasting quality. | It is an infra enabler. Presenting it as a headline ML feature would confuse ops reliability with intelligence improvement. |
| 9 | Dual-metric promotion gates | `KEEP` | The repo already has the beginnings of this in `whitebox-release`, including head-to-head Brier-based promotion logic. | The delta is incremental unless the platform also grows a richer resolved-forecast dataset and challenger library. |
| 10 | Synthetic data generation with SMOTE for black swans | `REFRAME` | Rare-event augmentation is directionally valid, but it should be structure-aware and simulator-backed, not naive interpolation over strategic states. | Recent rare-event literature is explicit that extreme synthesis needs tail-aware and constraint-aware evaluation; naive SMOTE is an unsafe default for structured game scenarios. |

## Top 10 ML / DL Features

| Rank | Feature | Borrowed Research Methodology | Target Product Surface | Applicability Index (1-5) | Alignment Index (1-5) | Why It Fits This Codebase | Bottlenecks / Adversarial Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Probabilistic calibration for strategist and forecast probabilities | Isotonic regression / post-hoc probability calibration | `Forecast Registry`, `Strategy Console` | 4.7 | 5.0 | Minimum viable shape: `offline calibration pipeline + edge lookup`. Insert into `forecast_scores`, `brier-weighted-consensus`, and `whitebox-release` so the platform stops presenting raw confidence as if it were calibrated probability. | Needs enough resolved outcomes. Calibration can improve trust, but it cannot rescue a systematically weak base model. |
| 2 | Ontology- or entity-linked retrieval for grounded geopolitical and commodity reasoning | Ontology-grounded retrieval over structured hypergraph / entity schema | `Strategy Console`, `GDELT / geopolitical radar`, `commodities` | 4.6 | 4.9 | Minimum viable shape: `thin retrieval/indexing service`. The repo already has domain ontology concepts, doctrine cards, required evidence, and claim-to-evidence structures in `shared/gameTheoryKnowledge.ts`, which makes ontology-grounded retrieval unusually natural here. | Requires disciplined ontology maintenance and better evidence ingestion quality. It improves grounding, not by itself predictive skill. |
| 3 | Temporal knowledge-graph forecasting for event cascades | Temporal KG + GNN + sequence modeling | `GDELT / geopolitical radar` | 3.5 | 4.9 | Minimum viable shape: `thin Python/ML service in shadow mode`. Upgrade `gdelt-stream` from fixed event-code mapping to learned event-forecasting over `real_time_events`. This is the cleanest long-horizon path from heuristic event parsing to learned geopolitical anticipation. | Weak entity resolution and noisy event extraction are the main blockers. Without a cleaner graph, the model will learn feed artifacts. |
| 4 | Multimodal fusion with objective feeds | Multi-source fusion of text + AIS / shipping / satellite / customs-like signals | `GDELT / geopolitical radar`, `market-stream / commodities` | 3.3 | 4.8 | Minimum viable shape: `new data ingestion layer + thin fusion service`. This directly counterbalances the repo’s current news-heavy worldview and is especially valuable for commodity supply shocks and logistics disruptions. | Feed access, schema alignment, and cost are the bottlenecks. Data operations complexity will dominate before model complexity does. |
| 5 | Human-in-the-loop active learning and correction | Model-agnostic post-hoc correction with expert feedback | `human-review`, `release governance`, `Forecast Registry` | 4.0 | 4.6 | Minimum viable shape: `offline correction/reranking pipeline`. The repo already has reviewer workflows and forecast resolution logic, so it can learn from reviewer disagreement, approvals, rejections, and outcome error. | Label sparsity is real. Reviewer signals may also be noisy or policy-biased unless normalized carefully. |
| 6 | Regime-shift and concept-drift detection | Wasserstein change-point / drift detection | `market-stream / commodities`, `dynamic-recalibration` | 4.3 | 4.2 | Minimum viable shape: `lightweight online detector`. This fits the existing `market-stream`, `outcome-forecasting`, and `dynamic-recalibration` path: detect distribution shift, then trigger refresh rather than running expensive analysis on a timer. | False positives and threshold tuning are the main risks. This improves freshness and timing more than base reasoning quality. |
| 7 | Constraint-aware or neuro-symbolic strategic reasoning | Hard-constrained learning / differentiable constraint projection / solver-backed reranking | `Strategy Console` | 3.4 | 4.5 | Minimum viable shape: `constraint-aware post-processor`, not full model retraining. The deterministic game solvers and doctrine cards already encode many of the constraints the platform cares about, so the ML move is to use them as guards or rerankers. | Hard constraints require explicit formalization of what is “invalid” strategy output. Some strategic claims remain too qualitative for strict projection. |
| 8 | Explainable forecast attribution for time-series and surrogate models | Temporality-aware Integrated Gradients and surrogate attribution | `Forecast Registry`, `outcome-forecasting`, `market-stream` | 3.6 | 4.0 | Minimum viable shape: `surrogate explanation layer`. The practical target is the outcome curves and future auxiliary models, not direct attribution of closed LLM internals. This is useful for trust, reviewer UX, and post-mortem analysis. | Do not overpromise “LLM explainability.” Hosted models will not expose the gradients required for direct IG. |
| 9 | Release-evaluation and promotion gates for prompts, models, and policies | Champion-challenger evaluation with proper scoring | `whitebox-release`, `multi-agent forecast`, `Forecast Registry` | 4.0 | 3.8 | Minimum viable shape: `expanded offline evaluation harness`. The repo already has promotion logic on resolved forecasts, so extending this from consensus policies to prompts, retrieval policies, or small auxiliary models is straightforward. | This is partly already implemented. The main bottleneck is evaluation data volume, not missing code structure. |
| 10 | Structure-aware rare-event / black-swan scenario synthesis | Extreme-event synthetic generation with tail-aware evaluation and domain constraints | `Strategy Console`, `scenario templates`, `labs` | 2.8 | 4.1 | Minimum viable shape: `offline scenario generation lab` tied to sequential-game templates and domain constraints. This is the right reframing of the original SMOTE idea. | Highest realism risk in the list. Synthetic scenarios that ignore strategic constraints will poison training and erode trust. |

### High-Confidence Additions Vs. Structurally Constrained Bets

- High-confidence additions the platform can evolve toward now: `probabilistic calibration`, `ontology-grounded retrieval`, `human-in-the-loop correction`, `drift detection`, and `expanded promotion gates`.
- Valuable but structurally constrained until data quality improves: `temporal KG forecasting`, `multimodal objective-feed fusion`, `constraint-aware strategic reranking`, `forecast attribution`, and `rare-event synthesis`.

## Short Roadmap

### Phase 1: High-Fit Near-Term

- Ship `probabilistic calibration` for forecast and strategist probabilities.
- Add `ontology/entity-linked retrieval` for geopolitical and commodity evidence grounding.
- Extend `whitebox-release` from consensus-policy comparison to prompt/retrieval challenger evaluation.
- Add `drift-triggered refresh` around `market-stream`, `outcome-forecasting`, and `dynamic-recalibration`.

### Phase 2: Thin-ML-Service Upgrades

- Add `human-in-the-loop correction` trained on review outcomes and resolved forecast error.
- Run `temporal KG forecasting` in shadow mode beside current `gdelt-stream` heuristics.
- Add `surrogate/time-series attribution` for forecast curves and market-triggered recommendations.
- Introduce `constraint-aware reranking` using doctrine cards and deterministic solver checks.

### Phase 3: Longer-Horizon R&D Bets

- Ingest `objective non-text feeds` for supply-chain and commodity grounding.
- Move from heuristic event linking to `entity-resolved multimodal event graphs`.
- Build `structure-aware black-swan scenario synthesis` tied to sequential-game templates and tail-aware evaluation.

## Operational Enablers That Should Not Be Sold As Headline ML

- `Object storage decoupling` is an infra option if analysis payload size becomes a real operational bottleneck.
- `Stateful orchestration` is an ops option if browser-side fan-out or edge-function timeout behavior becomes unacceptable.
- Both may still be worth doing, but they improve reliability and cost structure more than intelligence quality.

## Primary Sources

1. Eugène Berta, Francis Bach, Michael I. Jordan. “Classifier Calibration with ROC-Regularized Isotonic Regression.” AISTATS 2024. https://proceedings.mlr.press/v238/berta24a/berta24a.pdf
2. Kartik Sharma et al. “OG-RAG: Ontology-grounded retrieval-augmented generation for large language models.” EMNLP 2025. https://aclanthology.org/2025.emnlp-main.1674.pdf
3. Hongkuan Zhou et al. “SeDyT: A General Framework for Multi-Step Event Forecasting via Sequence Modeling on Dynamic Entity Embeddings.” CIKM 2021. http://arxiv.org/pdf/2109.04550v1
4. Riccardo Corizzo et al. “WATCH: Wasserstein Change Point Detection for High-Dimensional Time Series Data.” 2022. https://ar5iv.labs.arxiv.org/html/2201.07125
5. Hyeongwon Jang, Changhun Kim, Eunho Yang. “TIMING: Temporality-Aware Integrated Gradients for Time Series Explanation.” ICML 2025. https://proceedings.mlr.press/v267/jang25a.html
6. Yanhui Chen, Ailing Feng, Shun Chen, Jackson Jinhong Mi. “Forecasting the containerized freight index with AIS data: A novel information combination method based on gray incidence analysis.” Journal of Forecasting 2024. https://ideas.repec.org/a/wly/jforec/v43y2024i3p802-815.html
7. Malik Tiomoko et al. “Human-in-the-Loop Adaptive Optimization for Improved Time Series Forecasting.” OpenReview / ICLR submission, 2025. https://openreview.net/forum?id=OIXQUG0mf6
8. Ashfaq Iftakher et al. “KKT-Hardnet” hard-constrained neural projection paper, 2025. https://arxiv.org/pdf/2507.08124
9. Jingyi Gu, Xuan Zhang, Guiling Wang. “Beyond the Norm: A Survey of Synthetic Data Generation for Rare Events.” 2025. https://arxiv.org/pdf/2506.06380

## Repo Evidence Reviewed

- `src/hooks/useStrategyAnalysis.ts:762-1084`
- `src/components/StrategyConsole.tsx`
- `src/components/ForecastRegistry.tsx`
- `supabase/functions/brier-weighted-consensus/index.ts:44-211`
- `supabase/functions/_shared/whitebox-release.ts:141-198`
- `supabase/functions/_shared/whitebox-release.ts:250-275`
- `supabase/functions/_shared/whitebox-release.ts:356-502`
- `supabase/functions/gdelt-stream/index.ts:11-68`
- `supabase/functions/market-stream/index.ts:5-45`
- `supabase/functions/dynamic-recalibration/index.ts:1-257`
- `supabase/functions/outcome-forecasting/index.ts:1-229`
- `supabase/functions/human-review/index.ts:121-260`
- `shared/gameTheoryKnowledge.ts:1-186`
- `src/lib/matrixLab.ts:1-143`

## Validation Note

I re-ran a narrow regression slice around the deterministic and geopolitical helpers while preparing this memo:

- `tests/strategist-contract.test.ts`
- `tests/game-theory-knowledge.test.ts`
- `tests/geopolitical-radar.test.ts`

Result: `3/3 test files passed`, `13/13 tests passed`.

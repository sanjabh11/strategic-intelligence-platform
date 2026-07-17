# Modal.com ML / GPU Evidence Pack

Updated: 2026-05-06

## Customer Summary

We use **Modal.com as the dedicated ML compute layer** for calibration, drift monitoring, and deterministic strategic simulation.

### 1. What Is Real Today

- The platform **does use Modal.com today** through a Python `ml-service` deployed as:
  - a **web ASGI app** for live ML-backed enrichments and solver calls
  - a **scheduled worker** for bounded background jobs such as calibration refresh and drift evaluation
- The current Python runtime is **mostly CPU-based statistical ML plus deterministic game-theory solvers**.
- The current repo shows **no active GPU allocation** in the Modal worker definitions:
  - `ml-service/modal_worker.py`
  - `ml-service/modal_worker_jobs.py`
- That means the current MVP is accurately described as **Modal-backed and GPU-ready, but not currently GPU-accelerated**.

### 2. What Improves Prediction Quality Today

- **Probability calibration** improves how forecast probabilities are mapped to real-world outcomes.
- **Drift monitoring** flags when market, geopolitical, or forecast distributions move enough to warrant refresh or recalibration.
- **Deterministic game-theory solvers** turn structured strategic inputs into explicit coalition, signaling, correlated-equilibrium, evolutionary, and bounded-rationality outputs.
- **Ontology-assisted entity linking** and **attribution helpers** improve grounding and interpretability, but these are lighter-weight helpers rather than trained GPU models.

### 3. Where GPU On Modal Would Improve Accuracy Next

- The highest-confidence GPU opportunity is **tabular meta-modeling** on top of the platform’s existing forecast, calibration, disagreement, retrieval, and review signals.
- The second strongest opportunity is **event and retrieval ranking** over larger evidence sets and entity graphs.
- More ambitious opportunities such as **temporal graph forecasting** and **multimodal fusion** are credible, but they require more labeled data and stronger non-text feeds first.

## Table 1: Machine Learning Methods On Modal

| Method / capability | Implemented today? | GPU used today? | Modal/Python code components | Where it appears in the product | How it improves the web app | Customer-safe phrasing | Future GPU opportunity on Modal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Probabilistic calibration via isotonic regression | Yes - confirmed in code | No - no `gpu=` configured | `ml-service/main.py:360-404`, `ml-service/main.py:1193-1211`, `shared/mlAdvisory.ts:457-490` | Forecast consensus and advisory calibration in `ForecastRegistry` and forecast workflows | Makes published probabilities less overconfident by fitting them to resolved outcomes and storing reusable calibration curves | “We recalibrate probability surfaces against resolved history so forecast confidence is more realistic.” | Strong fit for GPU tabular meta-models once resolved outcome volume increases |
| Bayesian-smoothed calibration for sparse segments | Yes - confirmed in code | No | `ml-service/main.py:368-380`, `ml-service/tests/test_main.py:15-27` | Same forecast surfaces, especially lower-sample segments | Prevents sparse segments from producing unstable calibration curves by blending in a prior | “Where data is still sparse, we smooth calibration instead of pretending precision we do not have.” | Could evolve into GPU-accelerated hierarchical or boosted meta-model calibration |
| Distribution drift / regime-shift detection | Yes - confirmed in code | No | `ml-service/main.py:236-280`, `ml-service/main.py:777-931`, `shared/mlAdvisory.ts:486-543` | `StrategyConsole`, `ForecastRegistry`, `GeopoliticalDashboard`, `GoldGameModule`, `market-stream`, `outcome-forecasting` | Detects when market, geopolitical, or forecast behavior has moved enough to trigger refresh flags and recalibration workflows | “We continuously watch for drift so stale strategic advice can be re-evaluated before it misleads users.” | Good candidate for GPU anomaly, clustering, and richer regime-classification pipelines |
| Ontology / entity linking helper | Yes - confirmed in code | No | `ml-service/main.py:1214-1229`, `supabase/functions/_shared/ml-platform.ts:136-180`, `shared/mlAdvisory.ts:1-228` | Retrieval grounding, ontology sync, evidence ranking, `StrategyConsole` grounding | Links scenario text and evidence to known domain entities, improving retrieval and explanation structure | “We use ontology-assisted entity linking to keep strategic reasoning tied to named actors, assets, and domains.” | Strong candidate for GPU ranking or graph-based entity disambiguation over larger corpora |
| Shadow overconfidence scoring | Yes - confirmed in code | No | `ml-service/main.py:1232-1244`, `supabase/functions/shadow-model-refresh/index.ts` | Reviewer and shadow-model workflows | Scores disagreement, evidence scarcity, and drift to decide when reviewer attention is needed | “We score overconfidence risk so fragile outputs stay review-visible.” | Could become a GPU tabular risk classifier trained on review and resolution outcomes |
| Attribution scoring helper | Yes - confirmed in code | No | `ml-service/main.py:1247-1262`, `supabase/functions/market-stream/index.ts:101-136` | `market-stream`, `GoldGameModule`, attribution displays | Produces compact driver summaries for market and scenario outputs | “We generate driver-level attribution summaries to make market-linked strategy outputs more explainable.” | Could expand into GPU SHAP / tree-based attribution once a tabular model is added |
| Coalitional solver: Shapley value + core analysis | Yes - confirmed in code | No - deterministic solver, not learned ML | `ml-service/solvers.py:98-219`, `ml-service/main.py:1265-1278` | `StrategistBriefPanel`, `ResearcherView`, advanced deterministic layers | Quantifies coalition value splits, grand-coalition value, and core feasibility | “We compute explicit coalition payoffs and bargaining structure instead of relying on narrative-only advice.” | GPU is not necessary for today’s scale, but larger combinatorial coalition search could benefit later |
| Perfect Bayesian signaling solver | Yes - confirmed in code | No - deterministic solver | `ml-service/solvers.py:222-343`, `ml-service/main.py:1265-1278` | Strategist advanced-game outputs and researcher advanced frameworks | Models sender types, priors, messages, posterior beliefs, and sequential rationality | “We can formalize signaling and belief-updating scenarios when private information matters.” | GPU is secondary here; bigger gains would come from better upstream extraction of structured signaling inputs |
| Correlated-equilibrium solver | Yes - confirmed in code | No - deterministic solver | `ml-service/solvers.py:346-447`, `ml-service/main.py:1265-1278` | Strategist and researcher advanced deterministic layers | Computes obedience-compatible joint plans and expected welfare | “We can test coordinated strategic plans under explicit incentive constraints.” | GPU not required at current problem sizes; larger-scale equilibrium search could use parallelization later |
| Evolutionary replicator-dynamics solver | Yes - confirmed in code | No - deterministic solver | `ml-service/solvers.py:450-513`, `ml-service/main.py:1265-1278` | Strategist and researcher advanced deterministic layers | Simulates population-share evolution and dominant endpoint strategies | “We can model how strategic populations evolve over repeated interaction rather than only single-shot outcomes.” | GPU could help if this expands into large batched scenario or agent-population simulation |
| Bounded-rationality logit-QRE solver | Yes - confirmed in code | No - deterministic solver | `ml-service/solvers.py:516-604`, `ml-service/main.py:1265-1278` | `personal-life-coach`, strategist brief, advanced framework outputs | Models noisy play and sensitivity to rationality assumptions | “We can stress-test strategic recommendations under bounded-rational behavior, not just perfect rationality.” | Strong later candidate for GPU batched simulation if used at scale across many scenarios |

## Table 2: Modal.com Integration

| Integration surface | Current implementation | Caller / route | Endpoint on Modal | What Modal is doing for us | How it affects predictions | Current limitation | Proof source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Modal web ASGI app | FastAPI app deployed as `strategic-intelligence-ml-web` | Supabase edge functions via `maybeCallMlService(...)` | `/health`, `/ops/*`, `/game-theory/solve`, `/ontology/link`, `/shadow/score`, `/attribution/score` | Provides a dedicated Python-native compute layer without putting this logic inside Deno edge functions | Enables calibration, drift, solver, attribution, and linking calls from the web product | No explicit `gpu`, `cpu`, or `memory` request is configured today | Confirmed in docs and code: `ml-service/modal_worker.py:14-18`, `ml-service/modal_worker.py:44-57`, `docs/delivery/MODAL_DENO_ADVANCED_FRAMEWORKS_RUNBOOK.md` |
| Scheduled worker / queue drain | Separate Modal app `strategic-intelligence-ml-worker` with cron schedules | Background automation only | scheduled functions `scheduled_calibration_refresh()` and `scheduled_drift_evaluate()` | Runs ML maintenance jobs outside Postgres and outside the live request path | Keeps calibration and drift refresh off the user-facing edge path | Still a stopgap queue worker, not a full workflow engine; no GPU today | Confirmed in docs and code: `ml-service/modal_worker_jobs.py:44-71`, `docs/ML_ORCHESTRATION_TARGET.md` |
| Calibration refresh | Queue-driven or direct operational refresh of calibration curves | `supabase/functions/calibration-refresh/index.ts` | `/ops/calibration-refresh` | Rebuilds persisted calibration models from forecast and evaluation history | Improves probability realism for forecast consumers | Depends on enough resolved outcomes; still CPU scikit-learn | Confirmed in code: `ml-service/main.py:554-603`, `ml-service/main.py:1281-1290`, `supabase/functions/calibration-refresh/index.ts` |
| Drift evaluation | Queue-driven or direct operational drift scan | `supabase/functions/drift-evaluate/index.ts`, `market-stream` enqueue path | `/ops/drift-evaluate` | Scans recent events and forecast surfaces, persists drift signals, and marks refresh advisories | Helps prevent stale strategic outputs from persisting unchanged through regime shifts | Uses a proxy drift score rather than a richer learned drift classifier | Confirmed in code: `ml-service/main.py:777-931`, `ml-service/main.py:1294-1303`, `supabase/functions/drift-evaluate/index.ts` |
| Game-theory solving from `analyze-engine` | Hosted analysis upgrades LLM framework envelopes with deterministic solver outputs | `analyze-engine` advanced frameworks path | `/game-theory/solve` | Executes Python/Numpy/Scipy solver logic remotely and returns structured results | Turns advanced framework sections from heuristic envelopes into deterministic outputs | Deterministic solver quality still depends on good normalized inputs from upstream orchestration | Confirmed in code: `supabase/functions/analyze-engine/index.ts:1783-1836`, `ml-service/main.py:1265-1278`, `ml-service/solvers.py` |
| Strategist advanced framework solving from `personal-life-coach` | Personal decision strategist sends advanced game inputs to Modal | `personal-life-coach` strategist path | `/game-theory/solve` | Lets the strategist attach formal solver outputs to personal or business decision briefs | Adds coalition, signaling, correlated, evolutionary, and QRE layers to strategist outputs | If Modal is unavailable, the strategist falls back to heuristic envelopes | Confirmed in code: `supabase/functions/personal-life-coach/index.ts:494-538`, `ml-service/main.py:1265-1278` |
| Ontology warmup / retrieval entity linking | Deno side seeds ontology; Modal side performs lightweight alias matching | `ontology-sync`, retrieval helpers | `/ontology/link` | Gives the platform a Python service contract for ontology linking while keeping the edge shell unchanged | Improves evidence grounding and entity-aware retrieval explanations | Current implementation is alias-match based, not a trained linker | Confirmed in code: `supabase/functions/ontology-sync/index.ts`, `supabase/functions/_shared/ml-platform.ts:136-180`, `ml-service/main.py:1214-1229` |
| Attribution / shadow scoring | Deno services optionally call Modal for attribution or overconfidence signals | `market-stream`, `shadow-model-refresh` | `/attribution/score`, `/shadow/score` | Centralizes lightweight scoring helpers in the same Python ML service | Adds reviewer attention signals and attribution summaries that help users interpret outputs | These are heuristic scoring helpers, not learned GPU models | Confirmed in code: `ml-service/main.py:1232-1262`, `supabase/functions/market-stream/index.ts:101-136`, `supabase/functions/shadow-model-refresh/index.ts` |
| Secret wiring and Supabase bridge contract | Deploy scripts create Modal secrets; Supabase secrets carry `ML_SERVICE_URL` and `ML_SERVICE_TOKEN` | Deploy and runtime secret flow | Not a user endpoint; infrastructure contract | Keeps Modal credentials, DSN wiring, and Supabase bridge wiring explicit and scriptable | Makes the ML service callable from the edge/runtime layer without hardcoding URLs or tokens | Operational complexity is higher than a single-runtime deployment; still requires coordinated secret sync | Confirmed in docs and code: `scripts/deploy-modal-ml-web.sh`, `scripts/deploy-modal-ml-worker.sh`, `scripts/setup-secrets.sh`, `supabase/functions/_shared/ml-platform.ts:35-58`, `docs/delivery/MODAL_DENO_ADVANCED_FRAMEWORKS_RUNBOOK.md` |

## Technical Appendix

### Verified Adversarial Findings

These findings were checked against the current repo rather than inferred from older docs or naming.

1. **Modal is real and active in the codebase.**
   - The repo contains a dedicated Python `ml-service` built and deployed with the `modal` Python SDK.
   - Deploy scripts explicitly deploy:
     - `ml-service/modal_worker.py`
     - `ml-service/modal_worker_jobs.py`

2. **GPU is not actively configured today.**
   - Neither Modal worker file requests `gpu=...`.
   - Neither file requests explicit `cpu=` or `memory=` either.
   - That means the current ML service is not accurately described as GPU-powered today.

3. **The current Python stack is statistical / solver-heavy, not GPU-deep-learning heavy.**
   - `ml-service/requirements.txt` contains:
     - `numpy`
     - `scipy`
     - `scikit-learn`
     - `fastapi`
     - `modal`
   - It does **not** currently include GPU ML libraries such as:
     - `torch`
     - `xgboost`
     - `cuml`
     - `tensorflow`

4. **Several “ML” endpoints are lightweight helpers, not learned models.**
   - `/ontology/link` is alias matching.
   - `/shadow/score` is formula-based risk scoring.
   - `/attribution/score` is sorted feature contribution formatting.
   - These are still useful, but they should not be sold as GPU model inference.

5. **The deterministic solvers are highly valuable, but they are not learned ML.**
   - They provide formal strategic structure and decision rigor.
   - They are better described as **deterministic strategic simulation** than as “trained GPU models.”

### Compare The Results

| Check | Repo truth | Customer-safe conclusion |
| --- | --- | --- |
| Repo docs vs actual code | The runbook and deploy scripts really do point to Modal web + scheduled worker deployment | Safe to say the platform uses Modal.com today |
| ML claim vs implementation reality | Calibration and drift are real ML/statistical methods; several other endpoints are heuristic; solvers are deterministic | Safe to say the MVP uses selective ML plus deterministic strategic simulation |
| GPU claim vs implementation reality | No `gpu=` configuration exists in the Modal functions | Not safe to claim GPU-powered prediction today |
| Endpoint behavior vs product use | Supabase edge functions call Modal for solver, calibration, drift, ontology, attribution, and shadow scoring | Safe to say Modal is materially involved in prediction-support and simulation workflows |

### Look For The Accuracy Of The Details

| Capability | Correct classification |
| --- | --- |
| Calibration | Learned statistical fitting / post-hoc probability calibration |
| Drift detection | Statistical change detection |
| Ontology link | Heuristic / rules-based semantic helper |
| Shadow score | Heuristic risk scoring helper |
| Attribution score | Heuristic explanation helper |
| Advanced game-theory outputs | Deterministic solver layer, not trained ML |

### Confirm The Implementation

| Implementation question | Verified answer |
| --- | --- |
| Does Modal deploy flow match scripts? | Yes. `scripts/deploy-modal-ml-web.sh` and `scripts/deploy-modal-ml-worker.sh` deploy the two Python Modal apps. |
| Do Supabase edge functions call Modal? | Yes. `supabase/functions/_shared/ml-platform.ts` calls `ML_SERVICE_URL` with `ML_SERVICE_TOKEN`. |
| Do product surfaces expose the outputs? | Yes. Forecast, strategist, insights, commodities, and analysis routes consume or render calibration, drift, attribution, or deterministic framework outputs. |

## Ranked GPU Opportunities On Modal

These are **future opportunities only**, not present-tense claims.

| Rank | Opportunity | Why it fits this product | Why GPU specifically helps | What data is still missing | Expected prediction-quality effect | Implementation difficulty |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | GPU tabular meta-models for forecast calibration, champion selection, and disagreement risk | The platform already stores resolved forecasts, calibration history, provider disagreement, evidence counts, and review outcomes | Gradient-boosted trees and GPU tabular pipelines can train faster on wider feature sets and iterate more often | More resolved outcomes, reviewer labels, and stable target definitions for “good call” vs “poor call” | Medium-high: strongest near-term path to better probability quality and promotion decisions | Medium |
| 2 | GPU event / retrieval ranking over larger evidence graphs | Retrieval and entity grounding already exist, but ranking is still lightweight | GPU ranking models can process larger candidate sets and richer feature interactions at lower latency | Labeled relevance data, click/usefulness feedback, entity-resolution gold sets | Medium: better grounding and less noisy evidence selection | Medium |
| 3 | GPU temporal graph models for geopolitical and supply-chain forecasting | The repo already ingests events and reasons about actors, assets, and drifted regimes | Temporal graph models are computationally heavier and benefit from GPU memory and parallel graph operations | Better entity resolution, cleaner actor-event graph construction, outcome labels over time | Medium-high long-term, but only after data quality improves | High |
| 4 | GPU multimodal fusion with structured external feeds | Commodity, geopolitical, and supply-chain use cases would benefit from non-text confirmation signals | GPU pipelines help fuse larger feature spaces from text plus structured feeds | Feed licensing, AIS/customs/satellite or logistics data, alignment schemas, label strategy | Medium: especially valuable for supply shocks and commodity prediction | High |
| 5 | GPU reranking / surrogate explainability layers for strategist and forecast support | The product already has strategist and deterministic constraint layers that could be augmented by a learned reranker | GPU helps when reranking across many candidates or training surrogate models for explanation | High-quality labels linking inputs to preferred strategy outputs, evaluation harnesses | Medium: more consistency and explainability, less direct uplift than ranks 1-3 | Medium-high |

## Official Source Cross-Checks

Only official sources were used for the infrastructure and library claims below.

| Source | What it confirms | Why it matters here |
| --- | --- | --- |
| Modal GPU guide: <https://modal.com/docs/guide/gpu> | Modal only uses GPUs when the function requests them with the `gpu` argument | Confirms the current repo is **not** GPU-backed today because the worker definitions do not request GPUs |
| Modal resources guide: <https://modal.com/docs/guide/resources> | Modal functions have default CPU and memory requests, and resource requests can be made explicitly | Confirms the current worker definitions are using defaults rather than an explicitly provisioned compute profile |
| Modal cron guide: <https://modal.com/docs/guide/cron> | Modal supports cron-based scheduled functions | Confirms the scheduled worker architecture is technically aligned with official Modal scheduling |
| Modal ASGI docs: <https://modal.com/docs/reference/modal.asgi_app> | Modal supports serving FastAPI and other ASGI apps directly from a Modal function | Confirms the current `ml-service` web app deployment pattern is valid and intentional |
| scikit-learn isotonic regression docs: <https://scikit-learn.org/stable/modules/generated/sklearn.isotonic.IsotonicRegression.html> | `IsotonicRegression` is a monotonic post-hoc fitting method | Confirms the calibration layer is real statistical ML, not just UI language |
| XGBoost GPU docs: <https://xgboost.readthedocs.io/en/stable/gpu/> | GPU-accelerated gradient boosting is officially supported with `device=\"cuda\"` | Supports the strongest near-term GPU roadmap item: tabular meta-modeling |
| RAPIDS cuML docs: <https://docs.rapids.ai/api/cuml/latest/> | cuML provides GPU-accelerated, sklearn-like ML algorithms | Supports a pragmatic GPU path for future tabular, anomaly, clustering, and ranking workloads |
| PyTorch Geometric Temporal docs: <https://pytorch-geometric-temporal.readthedocs.io/> | Temporal graph neural network tooling exists for spatiotemporal graph forecasting | Supports the longer-horizon geopolitical / supply-chain temporal graph opportunity |

## Bottom Line For Customer Conversations

Use this language:

- “We already run a dedicated Python ML layer on Modal.com today.”
- “The current MVP uses Modal for calibration, drift monitoring, entity grounding support, and deterministic strategic simulation.”
- “The current runtime is Modal-based and GPU-ready, but the implemented ML methods in the current MVP are primarily CPU statistical ML and deterministic solvers.”
- “Our next GPU step on Modal is not vague experimentation. The best fit is tabular meta-modeling and richer evidence ranking on top of the signals the platform already captures.”

Do **not** use this language:

- “We are already using GPUs for prediction accuracy.”
- “The current prediction stack is GPU-powered.”
- “Every ML-looking endpoint is a trained model.”


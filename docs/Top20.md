# Top 20 Features to Lead With

Updated: 2026-05-03

## What This Ranking Is For

This document is a current-state positioning artifact for the actual routed and implemented product, not a roadmap or a wishlist. It reflects the live product shape in code today:

- public beta is centered on `Console`, `Templates`, and `Forecasts`
- public analysis is now intentionally `evidence-backed or withheld`
- several stronger analyst, review, and training surfaces still exist, but remain private or gated during the broad external beta

The current wedge is no longer “every module for every buyer.” It is:

- public evidence-backed strategic analysis
- adaptive question sharpening before prediction
- curated public forecasts with trust and governance signals

## Top 3 Implemented Features

These are the three strongest features currently implemented in the website.

1. **Evidence-Backed Strategy Console with Adaptive Clarification**
   The console now asks relevant context questions before analysis, routes citizen questions into the right domain pack, and only releases a public-facing answer when the hosted run is actually evidence-backed.

2. **Curated Public Forecast Registry**
   The forecast registry is now a real public reading surface with human-readable questions, curated forecast records, linked analysis state, consensus handling, and governance-aware detail views.

3. **Trust, Governance, and Honest Degraded Mode**
   The product now fails much more honestly: weak or unverified outputs are withheld, provider failures are surfaced as degraded states, and review/evidence signals are visible instead of hidden behind generic copy.

## New Since The Last Top20 Update

This update includes the newer feature work that did not exist in the previous ranking:

- public `analysis_only` beta mode with route-level hold surfaces
- adaptive clarification gate with `1-4` context questions before prediction
- hosted `question-intake` path and domain-specific citizen-question routing
- direct-answer contract for public analysis output
- evidence-backed public answer release gate with explicit withheld states
- anonymous context caching for country, location, horizon, and risk-profile inputs
- refreshed `Decision Workspace` plus compact `Trust & Governance` console layout
- curated public forecast set with sharper citizen-facing question phrasing
- stronger forecast trust alignment between card, detail, and linked analysis state
- structured hosted provider-failure metadata and safer public diagnostics exposure

## Scoring Method

Each feature is scored on a `1-5` scale for each criterion, then converted into a weighted total out of `100`.

| Criterion | Weight |
| --- | ---: |
| Pain urgency and immediacy | 35% |
| Budget clarity and budget owner | 20% |
| Procurement speed / friction | 10% |
| Financial or compliance ROI | 15% |
| Proof burden inverse | 15% |
| Implemented proof-fit | 10% |

Interpretation:

- `5` = strongest commercial fit on that criterion
- `3` = credible but mixed
- `1` = weak or highly constrained

## Top 20 Features to Lead With

| Rank | Feature | Surface | Primary Segment | Why Buyers Care | Weighted Score | Proof Fit Note |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | Evidence-Backed Strategy Console with Adaptive Clarification | Public | Strategy & Risk | Gives users one flagship surface that sharpens vague questions, collects missing context, and only presents a public answer when the hosted run is evidence-backed. | 93 | Main routed product surface with clarification intake, public answer rendering, and hosted evidence gating. |
| 2 | Curated Public Forecast Registry | Public | Forecasting & Research | Gives analysts, researchers, and curious end users a durable place to read curated forecasts instead of ephemeral chatbot-style outputs. | 90 | Routed `/forecasts` surface with seeded public forecasts, sharper question phrasing, consensus handling, and linked governance signals. |
| 3 | Trust, Governance, and Honest Degraded Mode | Public + Analyst | Strategy & Risk | Makes the platform more trustworthy by showing evidence state, review posture, provider degradation, and withholding unverified answers instead of pretending confidence. | 88 | Implemented across the console, forecast detail, and hosted analysis path with explicit withheld states and failure metadata. |
| 4 | Structured Evidence Retrieval and Provider Diversity Gating | Public + Analyst | Forecasting & Research | Grounds outputs in retrieved evidence and helps separate real analytical support from generic narrative generation. | 86 | Retrieval sufficiency, provider diversity, and evidence-backed release conditions are enforced in the current hosted flow. |
| 5 | Scenario Template Library with Console Prefill | Public | Strategy & Risk | Reduces friction for first-time users by turning abstract use cases into structured prompts that drop directly into the console. | 83 | Routed `/templates` library is wired into `/console` prefill and is part of the current public beta surface. |
| 6 | Direct-Answer Layer for Citizen Questions | Public | Strategy & Risk | Helps ordinary users understand the call, why it matters, what could change it, and what to do next without parsing internal analyst scaffolding. | 81 | The console now renders direct answer, trust state, watch factors, and next-step guidance from the public answer contract. |
| 7 | Strategist Briefing Layer | Analyst / Private | Strategy & Risk | Produces a more structured doctrine-shaped brief for internal or analyst-grade use when a higher-touch explanation is needed. | 78 | Implemented and rendered, but intentionally kept behind analyst access during the external beta. |
| 8 | Human Review Queue and Publication Governance | Analyst / Private | Forecasting & Research | Supports institutional trust by routing higher-stakes outputs through review discipline instead of publishing everything automatically. | 77 | Review queue, review states, and governance summaries are implemented and surfaced in the current app. |
| 9 | Multi-Agent Forecast Drafting Workflow | Public Reading + Analyst Authoring | Forecasting & Research | Connects analysis work to governed forecast records rather than leaving forecasting as an isolated or manual activity. | 75 | Console-to-forecast and linked forecast model paths exist; public authoring is private during the current beta. |
| 10 | Hosted Question Intake Service and Domain Routing | Public + Analyst | Strategy & Risk | Increases relevance by asking only the minimum high-value questions needed to avoid shallow or mismatched predictions. | 73 | Hosted `question-intake` plus shared routing logic now covers geopolitics, macro, markets, country politics, inflation, climate, disaster, and technology-society questions. |
| 11 | Public Analysis-Only Beta Controls | Public | Strategy & Risk | Keeps the first broad beta focused and trustworthy by hiding unstable or commercially unfinished surfaces from anonymous users. | 71 | Route-level hold surfaces, nav filtering, and beta-mode controls are implemented in the routed app. |
| 12 | Enterprise Audience Briefing Modes | Analyst / Private | Strategy & Risk | Lets the same analysis be reframed for executive, analyst, or operational audiences without rebuilding the underlying workflow. | 69 | Audience-aware rendering and enterprise workflow panels are still implemented in the console stack. |
| 13 | Live Geopolitical Intelligence Dashboard | Limited Public / Analyst | Strategy & Risk | Translates live geopolitical feed signals into a decision workflow instead of forcing teams to watch headlines manually. | 67 | Routed `/insights` surface still exists, but public availability remains conditional on hosted feed stability. |
| 14 | Gold and Safe-Haven Analysis Module | Limited Public / Analyst | Commodity & Market Intelligence | Gives buyers a specialized commodity and safe-haven workflow for uncertainty, inflation, and conflict-linked market scenarios. | 65 | Implemented in the current app with explicit degraded/feed-unavailable states; public release is still conditional. |
| 15 | Async Hosted Analysis and Status Tracking | Public + Analyst | Forecasting & Research | Matters operationally because users can launch heavier hosted analysis work without the interface collapsing into a blocking experience. | 63 | Current hosted analysis path supports status-aware console behavior and analysis-run tracking. |
| 16 | War Room Collaboration Surface | Analyst / Private | Strategy & Risk | Preserves strategist briefs, assumptions, and linked scenario artifacts as shared team memory for multi-user strategic work. | 61 | Routed `/war-room` exists and is gated to collaboration-enabled accounts during beta. |
| 17 | Negotiation Dojo | Analyst / Private | Training & Education | Gives the platform a credible applied-training story for negotiation, decision games, and workshops. | 59 | Implemented and surfaced from Labs, but kept out of the public beta wedge. |
| 18 | Game Tree Builder | Analyst / Private | Training & Education | Helps users reason about sequential moves and counter-moves rather than only reading narrative analysis. | 57 | Implemented and reachable through Labs with gating. |
| 19 | Classrooms and Academic Delivery | Analyst / Private | Training & Education | Supports instructional use cases like assignments, private rooms, and academic scenario delivery. | 54 | Routed `/classrooms` exists with academic and enterprise gating, but is private during the public beta. |
| 20 | Learning Mode and Guided Explainability | Public + Analyst | Training & Education | Lowers the barrier for new users by adding guided explanations without changing the underlying analytical workflow. | 51 | Learning mode, welcome guidance, and explanation components are implemented in the current shell. |

## How to Use This List

- `Ranks 1-6` are the primary story for the current external beta and should dominate demos, landing-page messaging, and buyer research.
- `Ranks 7-12` are strong supporting capabilities that deepen credibility for analyst and institutional use cases.
- `Ranks 13-20` are real implemented surfaces, but they should be framed as secondary, conditional, gated, or specialist capabilities until their public readiness is stronger.

Use this ranking in this order:

1. Lead with the public console, trust model, and forecast registry.
2. Use strategist, review, and enterprise briefing surfaces as proof of depth for analyst or institutional buyers.
3. Treat insights, commodities, labs, classrooms, and war-room as expansion or upsell stories unless their hosted/public readiness is revalidated.

The ranking intentionally favors features that are both commercially meaningful and demonstrably implemented in the current routed product.

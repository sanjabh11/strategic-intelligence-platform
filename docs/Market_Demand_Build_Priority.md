# Market Demand and Build Priority

Updated: 2026-04-29

## What This Document Is For

This is the next market-demand artifact after `/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Top20.md`.

The implementation follow-on for this ranking is documented in [/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Top10_First_Sale_Roadmap.md](/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Top10_First_Sale_Roadmap.md).

It answers four questions in order:

1. What are the top 15 global buyer challenges across the five target segments?
2. Which top 10 sellable product features best solve those challenges?
3. Where does the current product actually stand against those 10 features?
4. Which top 5 implementation candidates should make the first 25% to 40% build cut so we can start selling before the platform is fully built out?

Locked commercial stance for this document:

- Primary wedge: `Enterprise / Public Sector Strategy`
- Closest adjacent lane: `Forecasting & Research`
- Secondary lanes: `Training & Education`, `Commodity & Market Intelligence`
- Included but secondary lane: `Consumer / Personal Strategy`

## Scoring Method

This report uses the same scoring logic as the Top 20 work:

| Criterion | Weight |
| --- | ---: |
| Pain urgency and immediacy | 35% |
| Budget clarity and budget owner | 20% |
| Procurement speed / friction | 10% |
| Financial or compliance ROI | 15% |
| Proof burden inverse | 15% |
| Implemented proof-fit | 10% |

Important note: these weights sum to `105`, not `100`. To preserve the original weighting while keeping totals comparable, the weighted totals below are **normalized back to 100**.

Scoring scale:

- `1` = weak
- `3` = credible
- `5` = strongest

## 1. Top 15 Global Challenges

| Rank | ID | Challenge | Primary Segment | Primary Buyer | Why it is urgent now | How game theory changes the value proposition | Proof source(s) |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | C1 | Fragmented geopolitical and geoeconomic signals overwhelm decision teams. | Strategy & Risk | Chief strategy officer, chief risk officer, public-sector foresight lead | Trade conflict, state conflict, misinformation, and supply-chain weaponization now move faster than normal planning cycles. | Game theory turns noisy signals into actor maps, incentive conflicts, likely counter-moves, and decision paths. | S1, S9 |
| 2 | C2 | Teams lack structured adversarial scenario planning for multi-actor shocks. | Strategy & Risk | Strategy director, policy planning unit, enterprise risk lead | Most teams still plan around static scenarios even when competitors, regulators, and states are actively reacting to one another. | Game theory models strategic interaction, equilibrium shifts, escalation ladders, and credible threats instead of single-path forecasting. | S1, S2, S3 |
| 3 | C3 | AI-assisted analysis is hard to trust without evidence, provenance, confidence, and human accountability. | Strategy & Risk | Strategy lead, innovation lead, public-sector program owner | AI adoption is accelerating, but reliability, transparency, and bias are still the main blockers in high-stakes use. | Game theory forces explicit assumptions about actors, incentives, and contested alternatives rather than vague narrative output. | S2, S11 |
| 4 | C4 | Forecasting is disconnected from strategic decision workflows and executive action. | Forecasting & Research | Forecasting lead, research director, chief of staff | Forecasts often live in separate tools, while strategy and operating teams make decisions elsewhere. | Game theory links forecast questions to strategic choices, reactions, and adaptive moves rather than isolated probabilities. | S3, S4 |
| 5 | C5 | Analysts cannot turn raw research into leadership-ready briefs fast enough. | Strategy & Risk | Chief of staff, strategy operations lead, policy unit head | Leadership teams want short, decision-grade outputs, while analysts still spend too much time converting evidence into briefable form. | Game theory compresses complexity into actors, incentives, equilibrium options, and decision-relevant consequences. | S2, S3, S9 |
| 6 | C6 | Institutions need human review, publication gates, and auditability before AI or forecast output can be used operationally. | Forecasting & Research | Research head, governance lead, policy foresight lead | Public-sector and enterprise buyers cannot operationalize unsupported outputs without reviewable reasoning and approval states. | Game-theoretic reasoning becomes more usable when assumptions, challengers, and disagreements are explicit and reviewable. | S2, S11 |
| 7 | C7 | Commodity-exposed teams cannot convert volatility, trade shocks, and policy moves into timely decisions. | Commodity & Market Intelligence | Procurement head, treasury lead, commodity strategy director | Commodity price volatility is at multi-decade highs, and geopolitical shocks increasingly reshape supply and margin risk. | Game theory links market moves to the behavior of central banks, suppliers, states, and competitors rather than price charts alone. | S7, S8, S10 |
| 8 | C8 | Teams lack explicit actor-incentive and counter-move reasoning, creating blind spots in negotiation and policy response. | Strategy & Risk | Risk lead, strategy lead, negotiation lead | Many teams reason in linear narratives when they actually face strategic opponents, allies, and uncertain coalitions. | Game theory makes BATNAs, bargaining power, signaling, commitment, and coordination failure explicit. | S1, S5, S6 |
| 9 | C9 | Organizations face a material analytical skills gap in negotiation, scenario thinking, and strategic reasoning. | Training & Education | L&D head, dean, executive education lead | Employers still report skills gaps as the top transformation barrier, especially for analytical thinking and applied AI judgment. | Game-theory training gives teams practice with adversarial reasoning, tradeoffs, and response dynamics. | S5, S6 |
| 10 | C10 | Executives, analysts, and operators need the same analysis reframed differently without inconsistency. | Strategy & Risk | Chief of staff, strategy operations, risk PMO | The same strategic issue must often be explained to several audiences with different time horizons and action needs. | One game model can power multiple narratives without changing the underlying strategic logic. | S3, S9 |
| 11 | C11 | Buyers need live intelligence that degrades honestly rather than inventing certainty when feeds fail. | Strategy & Risk | Intelligence lead, risk operations lead | Teams increasingly distrust black-box dashboards that silently fall back to fake precision. | Game theory remains useful only if the system also shows the quality of the information state it is reasoning from. | S2, S9 |
| 12 | C12 | Forecast teams need outcome tracking, consensus discipline, and learning loops. | Forecasting & Research | Forecasting lead, analyst manager | Without tracked forecasts and post-resolution learning, buyers cannot improve calibration or prove the process works. | Game theory strengthens this by connecting predictions to anticipated actor responses and equilibrium drift over time. | S3, S4 |
| 13 | C13 | Commodity and market tools often separate live prices from decision simulation and procurement or hedging choices. | Commodity & Market Intelligence | Commodity analytics lead, procurement strategy lead | Many teams can see the market, but they cannot translate it into a structured response workflow fast enough. | Game theory ties live prices to strategic behavior, second-order effects, and scenario-dependent response options. | S7, S8, S10 |
| 14 | C14 | Universities and enterprise learning teams need experiential strategic training, not static theory. | Training & Education | Dean, executive education lead, capability-building lead | Training budgets increasingly favor simulation, practice, reflection, and applied AI literacy over passive content. | Game theory makes negotiation, sequencing, and coordination teachable through repeatable exercises. | S5, S6 |
| 15 | C15 | High-stakes personal decision-makers lack structured multi-actor reasoning. | Consumer / Personal Strategy | Consumer, advisor, coach | Personal decisions often involve family, employers, institutions, and conflicting incentives, but consumer tools rarely model this well. | Game theory reframes personal decisions as actor systems with tradeoffs, credible commitments, and counterfactuals. | S2, S5 |

## 2. Top 10 Sellable Features

Challenge references use the IDs above. `Implemented proof-fit` is intentionally a smaller factor than demand, budget ownership, and ROI. `Current implementation status` reflects current repo truth, not aspirational docs.

| Rank | Feature / solution capability | Primary challenges solved | Primary segment | User benefit | Current implementation status | U | B | P | ROI | PI | Fit | Weighted total / 100 |
| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | Strategic Decision Console for risk and policy teams | C1, C2, C5, C8, C10 | Strategy & Risk | One working surface for high-stakes analysis, actor reasoning, evidence review, forecast handoff, and leadership preparation. | partial | 5 | 5 | 3 | 4 | 4 | 4 | 88.6 |
| 2 | Evidence-locked strategist briefs and countermove maps | C2, C3, C5, C8, C10 | Strategy & Risk | Converts ambiguous problems into structured briefs with actors, incentives, equilibria, recommendations, evidence, and confidence. | partial | 5 | 4 | 4 | 4 | 4 | 3 | 84.8 |
| 3 | Live geopolitical risk radar and scenario monitor | C1, C2, C11 | Strategy & Risk | Replaces fragmented manual monitoring with live event tracking, scenario surfacing, and visible feed quality. | implemented | 5 | 4 | 3 | 4 | 3 | 4 | 81.9 |
| 4 | Forecast governance, registry, and publication workflow | C4, C6, C12 | Forecasting & Research | Gives research and forecasting teams a governed way to create, review, publish, and learn from forecasts. | partial | 4 | 4 | 4 | 4 | 4 | 4 | 80.0 |
| 5 | Multi-audience executive and analyst briefing layer | C5, C10 | Strategy & Risk | Lets the same analysis be reframed for executive, analyst, and operator audiences without rebuilding the work. | partial | 4 | 4 | 4 | 3 | 5 | 3 | 78.1 |
| 6 | Commodity volatility response workspace | C7, C13 | Commodity & Market Intelligence | Connects live market moves to strategy, simulation, and decision support for commodity-sensitive users. | partial | 4 | 4 | 3 | 5 | 3 | 3 | 76.2 |
| 7 | Research-to-forecast intelligence pipeline | C3, C4, C5, C12 | Forecasting & Research | Pulls external evidence directly into analysis and then into forecast creation, instead of leaving the steps disconnected. | partial | 4 | 4 | 4 | 4 | 3 | 3 | 75.2 |
| 8 | Negotiation simulation and bargaining skills suite | C8, C9, C14 | Training & Education | Gives institutions and teams a practical training surface for bargaining, concession strategy, and adversarial response. | partial | 4 | 4 | 4 | 3 | 4 | 3 | 75.2 |
| 9 | Collaborative strategic war room and shared decision log | C1, C2, C6, C10 | Strategy & Risk | Creates a shared workspace for decisions, assumptions, scenario updates, and team alignment around the same issue. | not implemented | 5 | 5 | 1 | 3 | 1 | 1 | 67.6 |
| 10 | Sequential game studio for countermove planning | C2, C8, C14 | Training & Education | Gives users a concrete way to model sequential moves, subgame-perfect logic, and likely response paths. | implemented | 3 | 3 | 4 | 3 | 4 | 4 | 66.7 |

Legend:

- `U` = pain urgency and immediacy
- `B` = budget clarity and budget owner
- `P` = procurement speed / friction
- `PI` = proof burden inverse

## 3. Gap Analysis on the Top 10

| Feature | Current state in codebase | Current market readiness | Gap to credible sale/demo | Implementation effort (1–5) | Sellability leverage (1–5) | Why the gap matters | Fastest path to credible version |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Strategic Decision Console for risk and policy teams | Routed flagship console already supports multi-engine analysis, evidence toggle, audience rendering, forecast draft handoff, and human-review request. | medium | It is still too broad and engine-heavy for a crisp first-sale story. The winning path is one narrower flagship workflow, not a menu of speculative engines. | 3 | 5 | Buyers need a clear reason to trust and adopt the console quickly. | Narrow the first demo to one high-stakes workflow: evidence-backed analysis → strategist brief → review → forecast draft. |
| Evidence-locked strategist briefs and countermove maps | Structured strategist outputs exist across console and personal strategist, with evidence, confidence, recommendation, and equilibrium structure. | medium | Citation discipline, actor-link clarity, and briefing polish are not yet strong enough for boardroom or policy-room trust. | 2 | 5 | This is one of the fastest ways to make the product look decision-grade instead of chatbot-like. | Turn the current strategist schema into a stable, exportable briefing format with visible evidence anchors and challenger logic. |
| Live geopolitical risk radar and scenario monitor | Real dashboard exists with live or degraded GDELT diagnostics, event cards, timeline views, and what-if simulation. | medium | It needs stronger analyst workflow value: tagging, prioritization, relevance scoring, and executive summarization. | 3 | 5 | Live intelligence is a headline differentiator, but only if it feels operationally useful rather than merely interesting. | Add issue prioritization, watchlist logic, and an executive summary strip for high-salience events. |
| Forecast governance, registry, and publication workflow | Registry, draft creation, readiness scoring, linked analysis freshness, review state, and weighted consensus are already present. | medium-high | The flow is real, but it still reads more like an internal tool than a polished institutional workflow. | 2 | 5 | This is the strongest bridge from analysis to accountable decision support. | Polish the publish-review-resolution loop and make trust signals first-class in list and detail views. |
| Multi-audience executive and analyst briefing layer | Audience-aware rendering exists in the main analysis flow. | medium | It needs explicit briefing modes, reusable audience presets, and cleaner output packaging. | 2 | 4 | Executive adoption depends heavily on how fast analysts can convert depth into usable briefings. | Promote audience modes into a visible first-class feature and add one-click briefing presets. |
| Commodity volatility response workspace | Hosted market stream exists with live or degraded provider diagnostics. Gold module now uses live market data and disables simulation without a real gold price. | low-medium | Buyer value is still constrained by missing paid feed setup, narrow vertical depth, and limited commodity workflows beyond gold. | 4 | 4 | The story is commercially interesting, but still too feed-dependent for the first wedge. | Add one reliable paid live feed and one buyer-specific workflow, such as procurement or treasury scenario analysis. |
| Research-to-forecast intelligence pipeline | Evidence retrieval and Firecrawl-backed research paths exist, and the console can draft forecasts from analysis. | medium-low | It is not yet packaged as one obvious workflow with curated source handling, traceability, and reviewer confidence. | 3 | 4 | Buyers do not want isolated retrieval features; they want a disciplined pipeline from evidence to publishable judgment. | Productize one linear path from retrieval → evidence summary → strategist brief → forecast draft. |
| Negotiation simulation and bargaining skills suite | Negotiation Dojo is playable today with scenario selection, turn-taking, scoring, and post-exercise assessment. | medium-low | It still relies heavily on heuristic behavior, limited scenarios, and weak institutional reporting. | 3 | 4 | Training buyers care about repeatability, instructional quality, and measurable learning value. | Expand the scenario library, add instructor rubric views, and replace more of the heuristic layer with structured critique. |
| Collaborative strategic war room and shared decision log | No real shared workspace, assumption log, or team collaboration layer is implemented yet. | low | The market case is strong, but the feature is still an idea, not a product surface. | 5 | 4 | It is valuable later, but it is not the right first-sale build when stronger near-term wedges already exist. | Defer until after the first customer motion. Only revisit once the console and governance flow are credible. |
| Sequential game studio for countermove planning | GameTreeBuilder already supports tree construction, backward induction, equilibrium outputs, and JSON export. | medium | It is technically credible but still isolated from the rest of the platform and not yet packaged for institutional use. | 3 | 3 | It strengthens the training wedge, but by itself it is not the fastest commercial anchor. | Add guided templates, explanatory overlays, and linkage into strategy or training modules rather than leaving it standalone. |

## 4. Top 5 Implementation Candidates

These are the first five build slices that best fit the "build 25% to 40%, sell first, expand later" rule.

| Rank | Candidate | Why it makes the first 25–40% cut | Implementation effort (1–5) | Current implementation fit (1–5) | Sellability uplift (1–5) | Pilot buyer segment | Why this should be built before the others |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | Evidence-locked strategist briefs and countermove maps | Fastest path to a serious, decision-grade differentiated output that is visibly better than generic AI chat. | 2 | 4 | 5 | Enterprise/public-sector strategy | It sits closest to the current codebase and directly answers the trust problem that blocks adoption. |
| 2 | Forecast governance, registry, and publication workflow | Turns the platform from "interesting analysis" into a governed judgment system with institutional discipline. | 2 | 4 | 5 | Forecasting & Research | The budget owner is clear, the workflow already exists, and the credibility payoff is immediate. |
| 3 | Live geopolitical risk radar and scenario monitor | Gives the product a strong top-of-funnel wedge around urgent, visible geopolitical pain. | 3 | 4 | 5 | Enterprise/public-sector strategy | It supports the current market narrative and is already demoable, but needs sharper prioritization and executive relevance. |
| 4 | Strategic Decision Console hardening | Consolidates the existing breadth into one flagship end-to-end enterprise workflow that sales can repeatedly demo. | 3 | 4 | 5 | Enterprise/public-sector strategy | The console is already the main surface; hardening it is higher leverage than adding more raw feature count. |
| 5 | Negotiation simulation and bargaining skills suite | Provides the first strong adjacent wedge for training, executive education, and capability-building programs. | 3 | 3 | 4 | Training & Education | It opens a second revenue lane without requiring the full commodity or collaboration stack first. |

Features intentionally deferred from the first cut:

- `Commodity volatility response workspace`: strong upsell, but depends on feed procurement and clearer buyer-specific workflows.
- `Collaborative strategic war room`: high value later, but too expensive for the first-sale phase.
- `Sequential game studio`: useful and real, but best deployed as a supporting feature inside training and strategy packages rather than as an early standalone wedge.

## Recommended Build Order

### Wave 1: Trust and governed decision output

1. Evidence-locked strategist briefs and countermove maps
2. Forecast governance, registry, and publication workflow
3. Multi-audience executive and analyst briefing layer

### Wave 2: Headline strategic intelligence motion

4. Live geopolitical risk radar and scenario monitor
5. Strategic Decision Console hardening around one flagship enterprise workflow

### Wave 3: First adjacent revenue lane

6. Negotiation simulation and bargaining skills suite

## Manual Founder Actions

1. Pick the first lighthouse buyer motion.
   - Default: `corporate strategy / risk team`
   - Second-best default: `public-sector foresight or policy planning unit`

2. Pick the first sales narrative.
   - Default: `geopolitical decision intelligence with governed strategist briefs`
   - Strong alternative: `forecast governance for analyst teams`

3. Keep the first demo script narrow.
   - Use one flagship storyline:
     - live geopolitical signal
     - strategist brief
     - human review or governance state
     - forecast draft handoff
   - Do not lead with every engine or every lab.

4. Decide where you are willing to spend external-data money first.
   - Research ingestion sources
   - Market data feeds
   - Institutional identity and delivery integrations

5. Treat the training wedge as deliberate adjacency.
   - Lead with `Negotiation Dojo`
   - Keep `Game Tree Builder` as the second training module, not the first

6. Keep consumer strategy as a secondary lane.
   - Use it only as an adjacency signal until enterprise or institutional demand is proven.

## Positioning Conclusion

If the objective is to become a top-3 product in this category, the platform should **not** try to win all five segments at once.

The best first claim to win is:

- `game-theory-informed strategic intelligence for enterprise and public-sector decision teams`

The best second claim to layer in is:

- `governed forecasting and evidence-backed analyst workflow`

The best third claim to add once the wedge is credible is:

- `experiential negotiation and strategic reasoning training`

Commodity intelligence should be treated as a high-value vertical expansion, not the initial category definition. Consumer strategy should remain adjacent until the B2B and institutional motion is proven.

## Source Key

- `S1` [World Economic Forum, Global Risks Report 2026](https://www.weforum.org/publications/global-risks-report-2026/in-full/global-risks-report-2026-chapter-1/)
- `S2` [OECD / WEF, AI in Strategic Foresight (2025)](https://www.oecd.org/en/publications/ai-in-strategic-foresight_aa573076-en.html)
- `S3` [The State of Corporate Foresight (2025)](https://www.thi.de/fileadmin/daten/forschung/Foresight/SHOTS/TheStateofCorporateForesight.pdf)
- `S4` [Board, 2025 Trends in Enterprise Planning](https://www.board.com/guide/2025-trends-in-enterprise-planning)
- `S5` [World Economic Forum, Future of Jobs Report 2025](https://www.weforum.org/publications/the-future-of-jobs-report-2025/)
- `S6` [AACSB, 2025 State of Business Education Report](https://www.aacsb.edu/-/media/publications/research-reports/aacsb-2025-state-of-business-education.pdf)
- `S7` [World Bank, Commodity Markets Outlook April 2025](https://www.worldbank.org/en/news/press-release/2025/04/29/commodity-markets-outlook-april-2025-press-release)
- `S8` [IEA, Global Critical Minerals Outlook 2025](https://www.iea.org/reports/global-critical-minerals-outlook-2025/executive-summary)
- `S9` [Futures Platform, all-in-one solution for strategic foresight](https://www.futuresplatform.com/homepage)
- `S10` [DecisionNext, commodity decision intelligence](https://decisionnext.com/)
- `S11` [World Economic Forum, The trust imperative for scaling responsible AI](https://www.weforum.org/stories/2025/01/the-trust-imperative-5-levers-for-scaling-ai-responsibly/)

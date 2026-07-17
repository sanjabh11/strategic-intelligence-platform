# Top 10 First-Sale Roadmap

Updated: 2026-04-29

## What This Document Is For

This is the implementation roadmap that follows:

- [/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Top20.md](/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Top20.md)
- [/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Market_Demand_Build_Priority.md](/Users/sanjayb/minimax/strategic-intelligence-platform/docs/Market_Demand_Build_Priority.md)

It converts the ranked feature stack into a concrete build sequence for the first-sale phase.

The purpose is not to finish the entire platform. The purpose is to build the first `25% to 40%` that makes the product credibly sellable.

Locked commercial objective:

- win the first wedge in `Enterprise / Public Sector Strategy`
- support that wedge with `Forecasting & Research`
- use `Training & Education` as the first adjacent lane
- defer `Commodity & Market Intelligence` and `Consumer / Personal Strategy` as later expansion lanes

## Score-Uplift Logic

The fastest path to a top-three category position is not feature breadth. It is a sharp increase in:

- `Proof burden inverse`
- `Implemented proof-fit`
- `Procurement speed / friction`
- secondarily `Financial ROI`

Baseline and target averages from the current ranking:

| Group | Current avg | Target avg |
| --- | ---: | ---: |
| Immediate top 5 | 82.1 | 89.5 |
| Next 5 | 72.8 | 83.3 |

That uplift comes from four moves:

1. making strategic output visibly evidence-backed and review-aware
2. making forecast governance first-class, not hidden
3. making the main demo path linear and executive-readable
4. turning live intelligence and training modules into operational workflows rather than interesting surfaces

## Immediate Priority: Top 5

These five are the first-sale build. They should be sequenced as one enterprise wedge, not as unrelated features.

### P1. Evidence-Locked Strategist Briefs and Countermove Maps

**Current starting point**

- strategist structure already exists in [src/lib/strategistContract.ts](/Users/sanjayb/minimax/strategic-intelligence-platform/src/lib/strategistContract.ts)
- strategist surfaces already render in [src/components/StrategyConsole.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/StrategyConsole.tsx) and [src/components/PersonalLifeCoach.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/PersonalLifeCoach.tsx)
- current evidence objects are still too weak for premium enterprise briefing because they mostly carry label/detail/source type rather than claim-level traceability

**Implementation scope**

- extend the strategist contract with:
  - `executive_summary`
  - `actor_map`
  - `countermoves`
  - `key_uncertainties`
  - `claim_to_evidence`
- distinguish clearly between:
  - `llm + evidence-backed`
  - `llm without enough evidence`
  - `heuristic / fallback`
- upgrade the console strategist surface from “structured output” to “decision-grade brief”
- make challenger reasoning, uncertainties, and confidence visible in the brief itself

**Acceptance**

- every enterprise brief renders:
  - actors
  - incentives
  - likely countermoves
  - key uncertainties
  - confidence
  - explicit evidence anchors
- fallback-derived outputs are visibly labeled and cannot pass as premium-ready output
- a user can copy or export one clean enterprise-ready brief from a single analysis

**Demo narrative**

- “Paste a live strategic problem, get a board-ready brief with actor map, likely countermoves, evidence trail, and confidence.”

**Expected score uplift**

- primary gains: `proof burden inverse`, `implemented proof-fit`
- target move: `84.8 -> 92+`

### P2. Forecast Governance, Registry, and Publication Workflow

**Current starting point**

- rule logic already exists in [src/lib/forecastGovernance.ts](/Users/sanjayb/minimax/strategic-intelligence-platform/src/lib/forecastGovernance.ts)
- registry and publish flow already exist in [src/components/ForecastRegistry.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/ForecastRegistry.tsx)
- review queue already exists in [src/components/HumanReview.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/HumanReview.tsx)
- current weakness is packaging, not absence

**Implementation scope**

- promote governance into a visible workflow, not a hidden warning layer
- standardize client-facing governance fields:
  - `review state`
  - `evidence-backed state`
  - `freshness`
  - `consensus reliability`
  - `publish blockers`
- make trust signals prominent in:
  - forecast list
  - forecast detail
  - create/publish flow
- make console-to-registry handoff preserve governance and provenance cleanly

**Acceptance**

- blocked forecasts cannot be published
- linked analysis review state is visible before publish
- users can see why a forecast is `ready`, `review_required`, `caution`, or `blocked`
- the review queue can complete one end-to-end round trip in a demo

**Demo narrative**

- “Run analysis, generate forecast draft, request review, pass governance, publish with visible trust signals.”

**Expected score uplift**

- primary gains: `ROI`, `proof burden inverse`, `implemented proof-fit`
- target move: `80.0 -> 91+`

### P3. Live Geopolitical Risk Radar and Scenario Monitor

**Current starting point**

- live or degraded event feed already exists in [src/components/GeopoliticalDashboard.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/GeopoliticalDashboard.tsx)
- provider diagnostics are already supported by [supabase/functions/_shared/live-data-providers.ts](/Users/sanjayb/minimax/strategic-intelligence-platform/supabase/functions/_shared/live-data-providers.ts)
- current weakness is that the dashboard is still closer to an intelligence surface than a risk-operations surface

**Implementation scope**

- add derived operational fields:
  - `priority_score`
  - `watch_reason`
  - `briefing_summary`
- add high-salience issue strip above the event grid
- add relevance ordering and watchlist-style filtering
- preserve live/degraded provider state as visible product behavior

**Acceptance**

- events can be sorted or filtered by priority
- a high-salience summary area tells the user what matters now
- degraded provider state never breaks the workflow or hides feed quality
- one geopolitical event can flow from radar to strategist brief without manual rewriting

**Demo narrative**

- “Open Insights and immediately see what matters now, why it matters, and where to drill into scenario implications.”

**Expected score uplift**

- primary gains: `procurement speed`, `proof burden inverse`, `fit`
- target move: `81.9 -> 88+`

### P4. Strategic Decision Console Hardening

**Current starting point**

- the main surface already exists in [src/components/StrategyConsole.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/StrategyConsole.tsx)
- current workflow is powerful but too broad, too engine-heavy, and too dependent on internal vocabulary for the first sales motion
- fallback behavior also still exists in the backend and client paths

**Implementation scope**

- make one flagship enterprise path primary:
  - `analyze -> strategist brief -> request review -> forecast draft`
- hide engine sprawl behind advanced controls
- reduce jargon in the main surface
- keep evidence and governance visible from the start
- make fallback and non-premium paths visibly non-enterprise

**Acceptance**

- a first-time enterprise user can complete the main path without understanding engine choice
- the main screen reads like a control room, not an experimentation lab
- no premium flow quietly degrades into local or heuristic logic without obvious UI treatment

**Demo narrative**

- “This is the control room: one place to go from ambiguous issue to governable decision package.”

**Expected score uplift**

- primary gains: `procurement speed`, `proof burden inverse`, `fit`
- target move: `88.6 -> 95-`

### P5. Negotiation Simulation and Bargaining Skills Suite

**Current starting point**

- playable base module already exists in [src/components/NegotiationDojo.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/NegotiationDojo.tsx)
- current scenarios and outcome logic are credible enough for a demo, but still visibly heuristic
- current weaknesses include:
  - small scenario set
  - random response delay
  - limited instructor or manager artifact
  - no structured coaching schema

**Implementation scope**

- expand the scenario catalog to at least six serious scenarios across:
  - procurement
  - policy
  - executive negotiation
- add structured debrief schema:
  - `BATNA assessment`
  - `concession pattern`
  - `ZOPA capture`
  - `missed value`
  - `coaching rubric`
- add exportable session summary
- reduce the heuristic feel and make the coaching output more structured

**Acceptance**

- at least six credible scenarios exist
- each completed session yields a structured debrief
- an instructor or manager can review a session summary without replaying the whole dialogue

**Demo narrative**

- “Run a procurement or policy negotiation, then show exactly where value was won or lost and how the user should improve.”

**Expected score uplift**

- primary gains: `fit`, `proof burden inverse`, `ROI`
- target move: `75.2 -> 80+`

## Immediate Release Sequence

### Release 1: Trust layer

Build in this order:

1. strategist briefs
2. forecast governance

This release establishes the product as decision-grade instead of chatbot-like.

### Release 2: Headline wedge

Build in this order:

3. geopolitical radar operationalization
4. strategy console hardening

This release establishes the main top-of-funnel buyer story.

### Release 3: Adjacent lane

Build:

5. negotiation suite v1

This release opens the first serious training expansion lane.

## Next Priority: Next 5

These deepen defensibility after the first wedge is already sellable.

### N1. Multi-Audience Executive and Analyst Briefing Layer

**Current truth**

- the current audience model is real, but it is still primarily education-oriented:
  - `student`
  - `learner`
  - `researcher`
  - `teacher`
  - `reviewer`
- this lives in [src/types/audience-views.ts](/Users/sanjayb/minimax/strategic-intelligence-platform/src/types/audience-views.ts) and [src/components/audience-views/AudienceViewRouter.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/audience-views/AudienceViewRouter.tsx)

**Implementation scope**

- add a separate enterprise briefing layer or extend the model with:
  - `executive`
  - `analyst`
  - `operator`
  - `policy`
- support switching the same analysis across those briefing presets without changing the reasoning core
- make one-click export or copy-ready summary views part of the deliverable

**Acceptance**

- one analysis can switch cleanly between enterprise briefing presets
- exports are readable and audience-specific

**Demo narrative**

- “The same issue can be briefed for a deputy minister, analyst, or operations head from one shared analytical core.”

**Expected score uplift**

- target move: `78.1 -> 86+`

### N2. Research-to-Forecast Intelligence Pipeline

**Current truth**

- retrieval and evidence services already exist
- console can already draft forecasts from analysis
- current weakness is that the flow still feels like connected features rather than one obvious workflow

**Implementation scope**

- create one guided path:
  - retrieval
  - evidence summary
  - strategist brief
  - forecast draft
- make provenance stay visible through the whole chain
- reduce friction between steps

**Acceptance**

- users can start with evidence and end with a forecast draft in one continuous flow
- trust metadata survives every step

**Demo narrative**

- “Start from evidence, not opinion, and end in a forecast draft without hand-copying between tools.”

**Expected score uplift**

- target move: `75.2 -> 84+`

### N3. Commodity Volatility Response Workspace

**Current truth**

- live market plumbing exists
- [src/components/GoldGameModule.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/GoldGameModule.tsx) already consumes hosted `market-stream`
- the current product is still too narrow and feed-dependent for the first wedge

**Implementation scope**

- add one real paid feed
- attach the workspace to one buyer use case:
  - procurement
  - treasury
  - commodity strategy
- frame the commodity lane around decisions, not just prices

**Acceptance**

- one live feed is stable enough for repeated demos
- one commodity workflow shows operational value, not just live prices

**Demo narrative**

- “Here is how today’s market move changes your sourcing, hedge posture, or strategic response.”

**Expected score uplift**

- target move: `76.2 -> 82+`

### N4. Sequential Game Studio for Countermove Planning

**Current truth**

- [src/components/GameTreeBuilder.tsx](/Users/sanjayb/minimax/strategic-intelligence-platform/src/components/GameTreeBuilder.tsx) already supports:
  - tree construction
  - backward induction
  - equilibrium display
  - JSON export
- current weakness is packaging and workflow linkage

**Implementation scope**

- add guided templates
- add explanation layers that show why the equilibrium holds
- link the module into strategy or training flows instead of leaving it isolated

**Acceptance**

- users can start from a template, solve a sequential game, and understand the result without reading raw structure alone

**Demo narrative**

- “Model the next three moves in a regulatory or bargaining conflict, not just the static state.”

**Expected score uplift**

- target move: `66.7 -> 78+`

### N5. Collaborative Strategic War Room and Shared Decision Log

**Current truth**

- this is not implemented yet
- there is no real shared workspace for:
  - decisions
  - assumptions
  - scenario versioning
  - comments

**Implementation scope**

- start with lightweight collaboration objects:
  - decision logs
  - assumption records
  - scenario versions
  - comments
- do not build this before the first enterprise wedge is already credible

**Acceptance**

- a team can share a decision package, preserve reasoning, and update the scenario over time

**Demo narrative**

- “This becomes the team memory for a live strategic issue, not just a single-user console.”

**Expected score uplift**

- target move: `67.6 -> 83+`

## Next-Priority Release Sequence

1. enterprise briefing layer
2. research-to-forecast pipeline
3. commodity workspace
4. sequential game studio packaging
5. collaborative war room

## Top-3 Positioning Path

This roadmap pushes the product toward a top-three position by matching what category leaders actually win on:

1. decision-ready outputs, not generic chat
2. evidence and governance, not unsupported AI fluency
3. live intelligence connected to workflow, not dashboard theater
4. practical training and structured reasoning, not passive theory

### What the platform can credibly claim after the immediate phase

- top-tier strategic intelligence workflow for enterprise/public-sector decision teams
- governed analyst-to-forecast workflow
- visible game-theory differentiation, not decorative AI language

### What the platform should not try to claim yet

- full cross-team collaboration leadership
- full commodity decision leadership across multiple verticals
- broad consumer leadership
- all-segment platform maturity

## Founder and Product Leadership Actions

1. Keep the first buyer motion narrow:
   - default: `corporate strategy / risk`
   - second: `public-sector foresight / policy planning`

2. Keep the first demo path narrow:
   - geopolitical signal
   - strategist brief
   - review / governance state
   - forecast draft handoff

3. Do not spend roadmap capital on breadth before trust:
   - no war-room first
   - no commodity-first wedge
   - no consumer-first wedge

4. Decide where to pay for external data first:
   - research sources before commodity breadth
   - one stable market feed before broader commodity positioning

5. Treat training as the first adjacent lane, not the first core wedge:
   - lead with `Negotiation Dojo`
   - support with `Game Tree Builder`

## Success Metrics

The roadmap is working if, after the immediate phase:

- one enterprise user can complete the flagship scenario without internal guidance
- strategist output looks premium, not exploratory
- governance is visibly enforced, not implied
- geopolitical radar feels actionable, not just informative
- the first training module feels like a serious product, not a side lab

The roadmap is not working if:

- the main demo still depends on explaining engines
- fallback states remain implicit
- trust signals are still buried in secondary panels
- the first sales story still requires feature breadth rather than one strong workflow

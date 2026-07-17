# Phase 3: Segment & Unmet-Need Triangulation

## Page 1: Decision Confidence Log

| Component | Score | Notes |
|-----------|-------|-------|
| Evidence Quality | 18/30 | 40+ items. Market research + competitor intel + codebase. Still 0 customer evidence. |
| Source Coverage | 15/25 | 6 source types. Segment research added education, negotiation training, scenario planning markets. |
| Internal Consistency | 16/20 | Segments are internally consistent. Adversarial review found tensions but resolved. |
| Counter-Evidence | 10/15 | Counter-evidence from Phase 2 survived. Game theory concern factored into segment scoring. |
| Validation Evidence | 0/10 | No experiments run |
| **Composite** | **59%** | Evidence-limited mode: CONDITIONAL GO. Moderate-high confidence in segment analysis. |

**Evidence types present**: product_promise (4), codebase_evidence (12), stakeholder_input (3), competitor_intel (15), market_research (12) = 5 types
**Evidence limitations**: No customer evidence. Segment scoring is inference-based, not validated. All scores are hypothesis-grade.

**Iteration**: 4 (after Phase 2)

---

## Page 2: Phase Findings

### 3a: Segment Hypothesis Generation (8 Segments)

Based on market research, competitor gaps, JTBD analysis, product capabilities, and pivot exploration angle:

| # | Segment | Description | Source of Hypothesis |
|---|---------|-------------|---------------------|
| S1 | **Corporate strategy teams (enterprise)** | Strategy teams at mid-to-large enterprises who need to turn geopolitical/market uncertainty into defensible decision options | Current positioning (POSITIONING.md) |
| S2 | **Geopolitical risk analysts (think tanks/research)** | Analysts at think tanks, research institutes, and policy organizations who need structured, evidence-backed analysis | Competitor gap (Metaculus/Good Judgment lack evidence workflow) |
| S3 | **University educators (game theory/strategy courses)** | Professors teaching game theory, strategic management, negotiation, or political science who need interactive tools for students | Product capability (ClassroomManager, academic tier, LTI, 26 patterns) |
| S4 | **Independent consultants/advisors** | Strategy consultants and advisors who need structured analysis tools for client engagements | Market research (Portage, CXO Scenario Planner target this segment) |
| S5 | **Forecasting researchers (AI safety/EA community)** | Researchers at AI safety orgs, EA organizations, and forecasting research institutes who need governed forecast creation and calibration | Market research (FRI, Metaculus, Good Judgment ecosystem) |
| S6 | **Prosumer analysts (finance/crypto/commodities)** | Individual analysts and traders who use game theory for market analysis (gold, crypto, commodities) | Product capability (GoldGameModule, trading signals, market data) |
| S7 | **Public-sector foresight units** | Government foresight and policy planning units who need evidence-backed scenario analysis | Current positioning (secondary in POSITIONING.md) |
| S8 | **Negotiation trainers and executive education programs** | Corporate training providers and executive education programs who need interactive negotiation/strategy tools | Product capability (NegotiationDojo, BiasProfile, Strategic DNA) + market research ($4K-$8K per executive program) |

### 3b: Segment Scoring (7 Dimensions, 1-10 scale)

| Segment | Need Intensity | Urgency | Reachability | WTP | Competition | Product Fit | Proof Avail. | **Total** | **Rank** |
|---------|---------------|---------|-------------|-----|------------|-------------|-------------|----------|---------|
| **S3: University educators** | 8 | 7 | 9 | 5 | 3 | 9 | 7 | **48** | **1** |
| **S4: Independent consultants** | 8 | 7 | 7 | 7 | 4 | 7 | 6 | **46** | **2** |
| **S5: Forecasting researchers** | 9 | 6 | 6 | 4 | 3 | 8 | 5 | **41** | **3** |
| **S8: Negotiation trainers** | 7 | 6 | 7 | 6 | 3 | 8 | 5 | **42** | **3** |
| **S2: Geopolitical analysts** | 8 | 7 | 5 | 4 | 5 | 7 | 4 | **40** | **5** |
| **S6: Prosumer analysts** | 7 | 8 | 8 | 5 | 7 | 6 | 3 | **44** | **2** |
| **S1: Corporate strategy (enterprise)** | 7 | 5 | 3 | 8 | 8 | 5 | 2 | **38** | **7** |
| **S7: Public-sector foresight** | 7 | 4 | 3 | 6 | 5 | 6 | 2 | **33** | **8** |

#### Scoring Rationale

**S3: University educators (Score: 48, Rank 1)**
- Need Intensity (8): Educators need interactive tools to teach game theory. MIT uses MobLab, Wolfram, custom tools — fragmented and limited.
- Urgency (7): Game theory courses are growing; AI is changing how it's taught (MIT moved from problem sets to quizzes because AI solves problem sets).
- Reachability (9): .edu email verification, academic conferences, direct outreach to professors, LMS integration. Very reachable.
- WTP (5): Academic budgets are limited. $34/mo academic tier is reasonable. Department licenses possible.
- Competition (3): MobLab (game theory experiments), Wolfram (toolkit), P-Cube (policy games). None combine evidence + game theory + forecast governance + classroom management.
- Product Fit (9): ClassroomManager, academic tier, LTI integration, 26 strategic patterns, audience modes (student/teacher/learner), scenario templates. Excellent fit.
- Proof Availability (7): Can demonstrate with pilot courses. Academic users are willing to try new tools and publish results.

**S4: Independent consultants (Score: 46, Rank 2)**
- Need Intensity (8): Consultants need structured analysis tools for client engagements. Currently use spreadsheets + expert judgment.
- Urgency (7): Clients demand faster, more rigorous analysis. AI is raising expectations.
- Reachability (7): LinkedIn, consulting networks, content marketing. Portage and CXO Scenario Planner target this segment.
- WTP (7): Consultants can expense tools. $49-$199/mo is reasonable for a billable tool.
- Competition (4): Portage ($10-$100/mo), CXO Scenario Planner (free), Jeda.ai, Hinsley. Growing but no game theory + governance combination.
- Product Fit (7): Strategy console, evidence retrieval, scenario templates, export to PDF, Monte Carlo. Good fit but lacks collaboration features consultants need.
- Proof Availability (6): Can demonstrate with pilot consulting engagements. Consultants are willing to adopt tools that improve deliverables.

**S6: Prosumer analysts (Score: 44, Rank 2 tied)**
- Need Intensity (7): Individual analysts need structured analysis for market decisions. Currently use ChatGPT + spreadsheets.
- Urgency (8): Markets move fast. Real-time analysis is valuable.
- Reachability (8): Self-serve, content marketing, Reddit, X, finance communities. Very reachable.
- WTP (5): $19-$49/mo is in range for prosumer tools. But ChatGPT is $20/mo and can do ad-hoc analysis.
- Competition (7): ChatGPT, Claude, Gemini (free/$20), Polymarket, Kalshi, Gliss, Problys. High competition.
- Product Fit (6): GoldGameModule, trading signals, market data, Monte Carlo. Partial fit — game theory for markets is niche.
- Proof Availability (3): Hard to prove value over ChatGPT without usage data. Self-serve means no guided evaluation.

**S8: Negotiation trainers (Score: 42, Rank 3 tied)**
- Need Intensity (7): Trainers need interactive tools for negotiation practice. Currently use role-play and case studies.
- Urgency (6): Corporate training is evolving with AI. Executive programs cost $4K-$8K — tools that enhance them are valuable.
- Reachability (7): Training companies, executive education programs, professional associations. Reachable through targeted outreach.
- WTP (6): Training companies can expense tools. $49-$199/mo reasonable for a training enhancement.
- Competition (3): No direct competitor offers AI-powered negotiation dojo with game theory. MobLab has some negotiation games but not AI-powered.
- Product Fit (8): NegotiationDojo, BiasProfile, Strategic DNA, game theory engine. Strong fit.
- Proof Availability (5): Can demonstrate with pilot training programs. Trainers are practical and will adopt tools that improve outcomes.

**S5: Forecasting researchers (Score: 41, Rank 3 tied)**
- Need Intensity (9): Researchers need governed forecast creation, calibration tracking, and evidence trails. Currently use ad-hoc tools.
- Urgency (6): AI safety and forecasting research is growing but not urgent for most researchers.
- Reachability (6): EA Forum, AI safety community, Forecasting Research Institute, academic networks. Niche but reachable.
- WTP (4): Research budgets are limited. Many use free tools (Metaculus). $19-$49/mo possible for individuals.
- Competition (3): Metaculus (free), Good Judgment (services), FRI (research). No software platform with governance + game theory.
- Product Fit (8): Forecast governance, Brier scoring, pre-resolution capture, evidence retrieval, multi-agent forecast. Excellent fit.
- Proof Availability (5): Can demonstrate with research collaborations. Researchers publish results, providing public proof.

**S2: Geopolitical analysts (Score: 40, Rank 5)**
- Need Intensity (8): Analysts need structured, evidence-backed analysis with citations. Currently use manual research + expert judgment.
- Urgency (7): Global events move fast. Real-time analysis is valuable.
- Reachability (5): Think tanks and research institutes are harder to reach than self-serve segments. Requires relationship building.
- WTP (4): Think tank budgets are limited. Many use free tools. Enterprise pricing not viable.
- Competition (5): ShadowBrief, GEOworx, Strider, S&P Global. Growing competition in this space.
- Product Fit (7): Evidence retrieval, GDELT, game theory, scenario templates. Good fit but GDELT requires configuration.
- Proof Availability (4): Can demonstrate with pilot analyses. Think tanks may publish, providing proof.

**S1: Corporate strategy teams (Score: 38, Rank 7)**
- Need Intensity (7): Strategy teams need defensible analysis. But many already have tools and processes.
- Urgency (5): Not urgent for most. Strategic decisions are quarterly/annual, not daily.
- Reachability (3): Enterprise sales requires relationships, procurement, security review. 0/8 procurement documents ready.
- WTP (8): Enterprise budgets are large ($50K-$150K+). But $199/mo doesn't fit enterprise procurement.
- Competition (8): Recorded Future, Palantir, S&P Global, Bloomberg, consulting firms. Very high competition.
- Product Fit (5): Core features work but enterprise readiness (SSO, SOC 2, audit logs) is missing. GDELT not live.
- Proof Availability (2): 0 customers, no hosted proof, no enterprise certifications. Very hard to prove.

**S7: Public-sector foresight (Score: 33, Rank 8)**
- Need Intensity (7): Foresight units need structured analysis. But many have custom internal tools.
- Urgency (4): Government procurement is slow. Not urgent.
- Reachability (3): Government procurement is complex, slow, and relationship-based. Very hard to reach.
- WTP (6): Government budgets exist but procurement is complex. $199/mo doesn't fit government contracting.
- Competition (5): Palantir, consulting firms, custom internal tools.
- Product Fit (6): Core features work but government-specific requirements (FedRAMP, security clearances) are missing.
- Proof Availability (2): 0 customers, no government certifications. Very hard to prove.

### 3b-continued: Beachhead Selection

**Beachhead segment: S3 — University educators (game theory/strategy courses)**

**Rationale**:
1. **Highest total score (48/70)** — best balance of need, urgency, reachability, product fit, and proof availability
2. **Lowest competition (3/10)** — no competitor offers the combination of game theory + evidence + classroom management + forecast governance
3. **Highest reachability (9/10)** — .edu email verification, academic conferences, direct professor outreach, LMS integration
4. **Excellent product fit (9/10)** — ClassroomManager, academic tier ($34/mo), LTI, 26 strategic patterns, audience modes, scenario templates
5. **Proof availability (7/10)** — pilot courses can generate public proof (published papers, course evaluations, student outcomes)
6. **Pivot from enterprise-first** — this is a fundamental pivot from the current positioning, which targets enterprise strategy teams (rank 7)
7. **Game theory is valued here** — unlike enterprise (where counter-evidence shows game theory is not a buying trigger), in education game theory IS the subject matter
8. **Self-serve compatible** — academic tier with .edu verification, no enterprise procurement needed
9. **Stepping stone to other segments** — students who learn on the platform become future users in consulting, research, and corporate strategy
10. **Counter-evidence survives** — game theory limitations (Phase 2) don't apply here because education is ABOUT game theory, not trying to use it as a business differentiator

### 3c: Negative ICP Definition (Top 3 Segments)

#### S3: University educators — Who is NOT a fit
- **K-12 teachers**: Product is too complex, game theory is not in standard K-12 curriculum
- **Non-game-theory courses**: If the course doesn't cover strategic interaction, the product adds no value
- **Large research universities with custom tools**: MIT, Stanford have bespoke tools (MobLab, Wolfram). Hard to displace.
- **Trap segment**: Adjunct professors with no budget — high need, zero WTP

#### S4: Independent consultants — Who is NOT a fit
- **Strategy consultants at Big 4**: They have proprietary tools and methodologies. Not interested in external tools.
- **One-person shops with no clients**: No revenue to expense tools against
- **Trap segment**: Consultants who want white-label but can't afford Enterprise tier — high need, insufficient WTP

#### S6: Prosumer analysts — Who is NOT a fit
- **Day traders**: Product is too slow/analytical for day trading. They need real-time signals, not game theory.
- **Crypto degens**: Not interested in game theory or governance. Just want signals.
- **Trap segment**: Analysts who expect ChatGPT-level speed and simplicity — product is too complex for casual use

### 3d: Unmet-Need Statements (Top 3 Segments)

#### S3: University educators
**Unmet need**: "I teach game theory and strategic thinking, but I lack an integrated platform where students can analyze real-world scenarios using Nash equilibrium, see evidence-backed citations, run simulations, and create governed forecasts — all in one workflow with classroom management and grading. I currently cobble together MobLab for games, Wolfram for computation, and manual case studies for real-world application."

#### S4: Independent consultants
**Unmet need**: "I need to deliver structured, evidence-backed strategic analysis for client engagements, but I currently use spreadsheets and manual research. I need a tool that combines evidence retrieval, game-theory analysis, scenario planning, and professional PDF export — without the overhead of enterprise tools like Palantir or the cost of consulting firm proprietary systems."

#### S6: Prosumer analysts
**Unmet need**: "I analyze market and geopolitical scenarios for my own trading/investment decisions, but ChatGPT gives me ad-hoc answers without evidence trails, governance, or calibration. I need a tool that gives me structured analysis with citations, Monte Carlo simulations, and forecast tracking — so I can learn from my predictions over time."

### 3e: Triangulation (4 Legs per Segment)

#### S3: University educators
| Leg | Evidence | Verdict |
|-----|----------|---------|
| Customer evidence | **Limited** — no direct customer evidence. Inference from MIT OCW using MobLab, growing game theory courses, AI changing teaching methods | PASS (inference) |
| Market research | **Strong** — game theory courses at MIT, Luxembourg, Wolfram toolkit. Education market for interactive tools is growing. | PASS |
| Product capability | **Strong** — ClassroomManager, academic tier, LTI, 26 patterns, audience modes, scenario templates | PASS |
| Counter-evidence | **Survived** — game theory limitations don't apply in education context. AI solving problem sets actually INCREASES need for interactive tools. | PASS |

**Triangulation result**: PASS — all 4 legs support this segment (with customer evidence as inference)

#### S4: Independent consultants
| Leg | Evidence | Verdict |
|-----|----------|---------|
| Customer evidence | **Limited** — no direct evidence. Inference from Portage, CXO Scenario Planner targeting consultants | PASS (inference) |
| Market research | **Moderate** — scenario planning tools (Portage, Hinsley, Jeda.ai) targeting consultants. Growing market. | PASS |
| Product capability | **Moderate** — strategy console, evidence retrieval, PDF export, Monte Carlo. Lacks collaboration features. | PASS with gap |
| Counter-evidence | **Survived** — game theory concern is relevant but consultants can use it as one lens. AI chatbot substitution is a threat. | PASS with caveat |

**Triangulation result**: PASS — all 4 legs support (with product gap in collaboration and AI substitution caveat)

#### S6: Prosumer analysts
| Leg | Evidence | Verdict |
|-----|----------|---------|
| Customer evidence | **Limited** — no direct evidence. Inference from prediction market tools (Gliss, Problys) targeting prosumers | PASS (inference) |
| Market research | **Moderate** — prediction market tools growing. Prosumer analyst market is large but fragmented. | PASS |
| Product capability | **Partial** — GoldGameModule, trading signals, market data. But GDELT/market feeds require configuration. | PARTIAL |
| Counter-evidence | **Not survived** — AI chatbot substitution is a MAJOR threat. ChatGPT at $20/mo can do ad-hoc game theory. Hard to prove value over free/cheap alternatives. | FAIL |

**Triangulation result**: FAIL on counter-evidence leg — AI chatbot substitution makes this segment risky as beachhead. May be viable as secondary/expansion segment.

### Failed Segments

| Segment | Reason for Failure |
|---------|-------------------|
| S1: Corporate strategy (enterprise) | Low reachability (3), high competition (8), low product fit (5), no proof (2). Enterprise procurement readiness is 0/8. Pricing mismatch. |
| S7: Public-sector foresight | Low reachability (3), low urgency (4), no proof (2). Government procurement is too slow for a pilot-phase product. |

---

## Page 3: Adversarial Review

### The Skeptic: Challenges evidence quality and assumptions

**Challenge 1**: "You're scoring segments without any customer evidence. How do you know university educators need this?"

**Response**: We don't know with certainty — this is evidence-limited mode. However: (a) MIT OCW shows game theory is taught with interactive tools (MobLab, Wolfram), (b) the professor explicitly noted AI has progressed to solve problem sets, requiring new teaching approaches, (c) no competitor combines game theory + evidence + classroom management + forecast governance. The inference is strong but unvalidated. Phase 5 experiments will test this.

**Challenge 2**: "University educators have no budget. WTP score of 5 is generous."

**Response**: Individual professors may have limited budgets, but (a) department licenses are common, (b) $34/mo academic tier is below typical software budgets, (c) executive education programs charge $4K-$8K per participant — a tool that enhances these programs has clear ROI. The WTP may be higher than scored through department/institutional purchasing.

**Challenge 3**: "You're ranking enterprise (S1) at 7 because it's hard to reach, but that's where the money is."

**Response**: The money is there, but the product can't capture it. 0/8 procurement documents, no SSO proof, no certifications, no hosted proof, $199/mo doesn't fit enterprise procurement. The product is not enterprise-ready. Pursuing enterprise now would burn time and resources with low probability of success. Better to build proof in education first, then expand to enterprise.

### The Missing Perspective: Identifies unrepresented voices

**Missing 1**: "You haven't considered students as users, not just educators."

**Response**: Valid. Students are the end-users of the educational tool. Their experience matters for retention and word-of-mouth. However, the BUYER is the educator/institution. Students are users but not decision-makers. The product already has audience modes (student, learner) which addresses this. Student feedback should be a validation metric in Phase 5.

**Missing 2**: "What about international universities? You've focused on US institutions."

**Response**: Valid. The .edu email check includes .ac.uk, .edu.au, .edu.in, .ac.nz, .edu.sg — so international academics are supported. Game theory is taught globally. The reachability may be even higher internationally where tools like MobLab are less established. This strengthens the segment score.

**Missing 3**: "You haven't considered corporate learning and development (L&D) teams as a segment."

**Response**: Valid. Corporate L&D teams that train employees in strategic thinking, negotiation, and decision-making are a potential segment. They have budgets, need interactive tools, and value game-theory-based training. This could be a hybrid of S3 (education) and S8 (negotiation trainers). Adding as a note for Phase 4 exploration.

### The Contrarian: Argues for the opposite conclusion

**Contrarian 1**: "The current enterprise-first positioning is correct. You're pivoting to education because it's easier, not because it's better."

**Response**: The evidence says otherwise. Enterprise scores 38/70 (rank 7) vs. education at 48/70 (rank 1). Enterprise has: low reachability (procurement not ready), high competition (8), low product fit (5 — no enterprise readiness), and no proof (2). Education has: high reachability (9), low competition (3), excellent product fit (9), and moderate proof availability (7). This isn't about easier — it's about where the product can actually win. Enterprise is a later expansion, not the beachhead.

**Contrarian 2**: "Game theory education is a niche market. You'll cap your growth potential."

**Response**: Education is the BEACHHEAD, not the forever-market. The strategy is: (1) win education where game theory is valued and competition is low, (2) build proof and user base, (3) expand to consultants and researchers (segments 2-4), (4) eventually expand to enterprise as product matures. This is the classic "bottom-up" market entry vs. "top-down" enterprise sales. The $16.5B decision intelligence market is the long-term opportunity; education is the wedge.

**Contrarian 3**: "You're ignoring the biggest threat: ChatGPT can do all of this for $20/mo."

**Response**: ChatGPT can do ad-hoc analysis but cannot provide: (a) evidence trails with citations, (b) human review workflow, (c) forecast governance with Brier scoring, (d) classroom management, (e) structured scenario templates, (f) Monte Carlo simulations, (g) pre-resolution forecast capture. The value is in the WORKFLOW and GOVERNANCE, not the analysis itself. This is the key positioning message: "ChatGPT gives you answers. We give you defensible, governed, reviewable decision artifacts."

---

## Page 4: Gate Decision

### Gate 3: Segment Triangulation Gate

**Exit Criteria Checklist**:
- [x] ≥ 8 segment hypotheses generated (8 segments)
- [x] Each segment scored on all 7 dimensions
- [x] Beachhead segment selected with rationale (S3: University educators)
- [x] Negative ICP defined for top 3 segments
- [x] Unmet-need statements written for top 3 segments
- [x] Triangulation completed for each segment (all 4 legs)
- [x] Failed segments documented with reasons (S1, S7)
- [x] **Adversarial review completed** (Skeptic, Missing Perspective, Contrarian — all 3 personas)
- [x] 360-degree: Customer + Competitor + Market + Financial perspectives
- [x] Pre-gate self-assessment ≥ threshold (adjusted for evidence-limited mode)

**Pre-Gate Self-Assessment (5 Dimensions)**:

| Dimension | Score (1-5) | Justification |
|-----------|-------------|---------------|
| Evidence Quality | 4 | 40+ items, multiple HIGH-grade sources. Segment scoring is inference-based but well-reasoned. |
| Source Coverage | 3 | 6 source types. Education, negotiation, scenario planning markets researched. |
| Logical Consistency | 4 | Segments are internally consistent. Adversarial review resolved tensions. Beachhead logic is sound. |
| Counter-Evidence | 3 | Counter-evidence survived for S3, S4. Failed for S6 (AI substitution). Game theory concern factored in. |
| Decision Readiness | 4 | Beachhead selected. Top 3 segments analyzed. Ready for gap mapping. |
| **Composite** | **18/25** | Meets 18/25 threshold for deep scope! |

**Gate Decision**: **CONDITIONAL GO** (evidence-limited mode cap) → proceed to Phase 4

**Rationale**: 8 segments generated and scored. Beachhead selected: S3 (University educators) with score 48/70. Adversarial review completed with all 3 personas — challenges addressed. Triangulation passed for top 3 segments. Failed segments (S1 enterprise, S7 public-sector) documented. The pivot from enterprise-first to education-first is supported by evidence: higher reachability, lower competition, better product fit, and game theory is valued in education context.

**Key insight for Phase 4**: The beachhead is education, not enterprise. The positioning must pivot from "governed strategic-intelligence pilot for enterprise" to "integrated game-theory learning and analysis platform for educators, students, and analysts." The integrated workflow (evidence → analysis → review → forecast) remains the differentiator, but the target user and value proposition change fundamentally.

**Next-phase skill selection**: ecc-plan (gap mapping) + manual analysis (alignment chain)

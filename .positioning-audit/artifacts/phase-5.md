# Phase 5: Validation Plan & Experiments

## Page 1: Decision Confidence Log

| Component | Score | Notes |
|-----------|-------|-------|
| Evidence Quality | 19/30 | Same evidence base. Experiments designed but not run. |
| Source Coverage | 15/25 | Same source coverage. Experiment design adds methodology. |
| Internal Consistency | 17/20 | Experiments are consistent with hypotheses and gaps. |
| Counter-Evidence | 11/15 | Counter-evidence factored into experiment design (falsification-first). |
| Validation Evidence | 2/10 | Experiments designed with clear thresholds. Not run yet. |
| **Composite** | **64%** | Evidence-limited mode: CONDITIONAL GO. Experiments designed, awaiting execution. |

**Evidence types present**: 6 types (same as Phase 4) + experiment_design
**Evidence limitations**: Experiments are designed but NOT run. No validation evidence yet. All claims remain unvalidated.

**Iteration**: 6 (after Phase 4)

---

## Page 2: Phase Findings

### 5a: Load-Bearing Claim Extraction (from PH-1)

| Claim ID | Type | Claim | Current Status |
|----------|------|-------|---------------|
| C1 | Segment | University educators need an integrated game-theory platform (not just experiments or computation) | Unvalidated |
| C2 | Product | Game theory + evidence + forecasting is more valuable than game theory alone | Unvalidated |
| C3 | Product | ClassroomManager and academic features are production-ready | Partially validated (code exists) |
| C4 | Pricing | $34/mo academic pricing is acceptable to educators/departments | Unvalidated |
| C5 | Competitive | Educators will switch from MobLab/Wolfram/manual methods to SIP | Unvalidated |
| C6 | Product | Evidence retrieval and citations add value for educational use | Unvalidated |
| C7 | Segment | Game theory courses are growing and need AI-resistant teaching tools | Partially validated (MIT OCW data) |
| C8 | Distribution | Educators are reachable through .edu verification, conferences, and direct outreach | Partially validated (.edu check exists) |
| C9 | Product | Forecast governance (Brier scoring, pre-resolution capture) is valuable in education | Unvalidated |
| C10 | Category | "Game-theory learning and analysis platform" is a recognizable category for educators | Unvalidated |

### 5b: Experiment Design (Fidelity Ladder — Cheapest Falsification First)

#### Experiment EXP-1: Educator Need Validation Survey
**Claims tested**: C1, C2, C6, C9, C10
**Fidelity**: Low (survey)
**Hypothesis**: ≥40% of game theory educators say they need an integrated platform that combines game theory analysis, evidence retrieval, and forecast governance
**Falsification threshold**: <20% express need for integration
**Method**: Online survey distributed to game theory professors via academic networks (EA Forum, Reddit r/gametheory, academic mailing lists, Twitter academic community)
**Sample size**: 50+ respondents
**Duration**: 2 weeks
**Cost**: $0 (self-distributed) or $200 (SurveyMonkey/promoted posts)
**Evidence type produced**: customer_outcome (survey response), user_quote (open-ended responses)
**Success threshold**: ≥40% express need for integrated platform
**Failure threshold**: <20% express need OR ≥60% say current tools are sufficient
**Blocking potential**: HIGH — if educators don't want integration, the beachhead thesis fails

#### Experiment EXP-2: Landing Page Smoke Test
**Claims tested**: C4, C5, C8, C10
**Fidelity**: Low (landing page)
**Hypothesis**: Educators who see the education-focused landing page will sign up for a pilot at ≥3% conversion rate
**Falsification threshold**: <0.5% conversion rate
**Method**: Create education-focused landing page ("Teach Game Theory with AI — Free Pilot for Educators"). Drive traffic via academic Twitter, Reddit, LinkedIn. Measure email signups.
**Sample size**: 500+ visitors
**Duration**: 3 weeks
**Cost**: $50 (domain/landing page) + $100 (promoted posts)
**Evidence type produced**: pricing_signal (signup behavior), behavioral_observation (click data)
**Success threshold**: ≥3% conversion (15+ signups from 500 visitors)
**Failure threshold**: <0.5% conversion (<3 signups from 500 visitors)
**Blocking potential**: MEDIUM — low conversion may indicate messaging problem, not lack of need

#### Experiment EXP-3: Professor Interview (5 interviews)
**Claims tested**: C1, C2, C5, C6, C7, C9
**Fidelity**: Medium (interview)
**Hypothesis**: ≥3 of 5 professors say they would use SIP in their course after seeing a demo
**Falsification threshold**: 0 of 5 say they would use it
**Method**: Recruit 5 game theory/strategy professors. 30-minute demo + structured interview. Ask: current tools, pain points, reaction to SIP, willingness to pilot, pricing comfort.
**Sample size**: 5 professors
**Duration**: 3 weeks (recruitment + interviews)
**Cost**: $0 (volunteer) or $500 (incentives @ $100/professor)
**Evidence type produced**: user_quote (interview quotes), customer_outcome (intent to use)
**Success threshold**: ≥3 of 5 say they would pilot
**Failure threshold**: 0 of 5 say they would pilot OR all say current tools are sufficient
**Blocking potential**: HIGH — if professors don't see value after demo, product-market fit is weak

#### Experiment EXP-4: Pilot Course Deployment
**Claims tested**: C3, C5, C6, C9 (all product claims)
**Fidelity**: High (pilot/beta)
**Hypothesis**: Students in a pilot course using SIP will report ≥70% satisfaction and the professor will report ≥80% likelihood to continue using
**Falsification threshold**: <50% student satisfaction OR professor would not continue
**Method**: Deploy SIP in 1-2 game theory courses for a semester. Professor assigns scenarios, students use platform, collect feedback surveys + professor interview at end.
**Sample size**: 20-50 students, 1-2 professors
**Duration**: 1 semester (3-4 months)
**Cost**: $0 (product is free for academic) + time for support
**Evidence type produced**: customer_outcome (satisfaction, usage), behavioral_observation (usage data), user_quote (feedback), analytics_data (platform metrics)
**Success threshold**: ≥70% student satisfaction, ≥80% professor continuation intent
**Failure threshold**: <50% student satisfaction OR professor would not continue
**Blocking potential**: CRITICAL — this is the make-or-break experiment

#### Experiment EXP-5: Academic Conference Presentation
**Claims tested**: C8, C10, C7
**Fidelity**: Medium (presentation + feedback)
**Hypothesis**: ≥10 educators express interest in piloting after conference presentation
**Falsification threshold**: 0 educators express interest
**Method**: Present at 1-2 academic conferences (e.g., Economic Science Association, Game Theory Society). Demo platform, distribute pilot sign-up sheet.
**Sample size**: 20-50 conference attendees
**Duration**: 1-2 conferences (3-6 months including submission + presentation)
**Cost**: $500-$2000 (registration, travel)
**Evidence type produced**: pricing_signal (interest), user_quote (feedback)
**Success threshold**: ≥10 educators sign up for pilot info
**Failure threshold**: 0 signups OR attendees dismiss the approach
**Blocking potential**: LOW — conference failure may indicate distribution problem, not product problem

### 5c: Experiment Priority Ranking

| Rank | Experiment | Falsification Potential | Cost Efficiency | Blocking Potential | Priority |
|------|-----------|----------------------|----------------|-------------------|----------|
| 1 | EXP-1: Survey | HIGH (tests core need) | HIGH ($0-$200) | HIGH | **P0 — Run first** |
| 2 | EXP-3: Interviews | HIGH (tests demo reaction) | MEDIUM ($0-$500) | HIGH | **P0 — Run second** |
| 3 | EXP-2: Landing page | MEDIUM (tests messaging) | HIGH ($150) | MEDIUM | **P1 — Run in parallel** |
| 4 | EXP-4: Pilot course | CRITICAL (tests actual use) | LOW (time-intensive) | CRITICAL | **P1 — Run after EXP-1/3 pass** |
| 5 | EXP-5: Conference | LOW (tests distribution) | LOW ($500-$2000) | LOW | **P2 — Run after EXP-4 passes** |

### 5d: Validation Plan Document

## Validation Plan: PH-1 (Education-First Platform)

### Phase 1: Need Validation (Weeks 1-3)
1. **EXP-1: Survey** — Distribute to 50+ game theory educators. Test core need for integrated platform.
2. **EXP-2: Landing page** — Launch education-focused landing page. Drive traffic. Measure signups.
3. **EXP-3: Interviews** — Recruit 5 professors. Demo + structured interview. Test reaction and willingness to pilot.

**Gate**: If EXP-1 shows <20% need OR EXP-3 shows 0/5 willingness → STOP, recycle to Phase 3 for new segment.

### Phase 2: Product Validation (Months 2-5)
4. **EXP-4: Pilot course** — Deploy in 1-2 courses for a semester. Test actual usage, satisfaction, and continuation intent.

**Gate**: If EXP-4 shows <50% student satisfaction OR professor would not continue → STOP, recycle to Phase 4 for product gap remediation.

### Phase 3: Distribution Validation (Months 3-8)
5. **EXP-5: Conference** — Present at 1-2 academic conferences. Test distribution channel and category recognition.

**Gate**: If EXP-5 shows 0 signups → reassess distribution strategy, not product.

### Timeline
| Experiment | Start | End | Duration | Cost |
|-----------|-------|-----|----------|------|
| EXP-1: Survey | Week 1 | Week 3 | 2 weeks | $0-$200 |
| EXP-2: Landing page | Week 1 | Week 4 | 3 weeks | $150 |
| EXP-3: Interviews | Week 2 | Week 5 | 3 weeks | $0-$500 |
| EXP-4: Pilot course | Month 2 | Month 5 | 1 semester | $0 + time |
| EXP-5: Conference | Month 3 | Month 8 | 3-6 months | $500-$2000 |
| **Total** | | | **~8 months** | **$650-$2,850** |

### Resource Requirements
- 1 person (founder) for survey distribution, landing page, interviews, pilot support
- PostHog analytics for landing page tracking (already integrated)
- Academic tier pricing already configured ($34/mo, .edu verification)
- ClassroomManager and LTI integration need verification before pilot

---

## Page 3: Adversarial Review

### The Skeptic

**Challenge 1**: "50 survey respondents is too few to draw conclusions."

**Response**: 50 is a minimum for directional signal, not statistical significance. The goal is falsification, not proof. If <20% of 50 educators express need, that's a strong negative signal. If ≥40% express need, that's sufficient to proceed to interviews. The sample size is appropriate for the fidelity level and cost.

**Challenge 2**: "EXP-4 (pilot course) is the critical experiment but it's last. You should run it first."

**Response**: Pilot course is the most expensive (time) experiment. Running it before validating need (EXP-1) and reaction (EXP-3) risks wasting a semester on a segment that doesn't want the product. The fidelity ladder principle says: cheapest falsification first. If EXP-1 or EXP-3 fail, we save months of pilot effort.

### The Missing Perspective

**Missing 1**: "You haven't included student feedback in the experiment design."

**Response**: EXP-4 includes student satisfaction surveys. Students are the end-users but not the buyers. Their satisfaction is a leading indicator of professor continuation intent. If students hate it, professors won't continue regardless of their own opinion. Student feedback is captured but not the primary gate metric.

**Missing 2**: "What about department-level purchasing? Individual professors may not have budget."

**Response**: EXP-3 interviews include a pricing comfort question. If professors say "I need department approval," that's a signal to add department licensing (G6). The landing page (EXP-2) can test both individual and department messaging.

### The Contrarian

**Contrarian 1**: "You're spending 8 months validating. Why not just launch and see what happens?"

**Response**: "Launch and see" with 0 customers and no evidence is how products fail silently. 8 months of structured validation produces: (a) evidence for investor/stakeholder conversations, (b) specific failure signals that enable recycling, (c) pilot results that become case studies, (d) professor relationships that become advocates. Unstructured launching produces none of these.

**Contrarian 2**: "The experiments assume educators will be honest about their needs. What if they say they want it but won't actually use it?"

**Response**: This is the gap between stated preference and revealed preference. EXP-1 and EXP-3 test stated preference. EXP-4 tests revealed preference (actual usage). The sequence is designed to catch this gap: if professors say they want it (EXP-3) but students don't use it (EXP-4), we know the need was overstated. This is why EXP-4 is the critical gate.

---

## Page 4: Gate Decision

### Gate 5: Validation Plan Gate

**Exit Criteria Checklist**:
- [x] All load-bearing claims extracted (10 claims from PH-1)
- [x] Each claim has designed experiment with thresholds (5 experiments covering all 10 claims)
- [x] Experiments priority-ranked (by falsification potential, cost efficiency, blocking potential)
- [x] Validation plan document written with timeline and resources
- [x] Cheapest-falsification-first principle followed (EXP-1 survey before EXP-4 pilot)
- [x] **Adversarial review completed** (3 hostile personas)
- [x] 360-degree: Customer + Financial perspectives
- [x] Pre-gate self-assessment ≥ threshold

**Pre-Gate Self-Assessment (5 Dimensions)**:

| Dimension | Score (1-5) | Justification |
|-----------|-------------|---------------|
| Evidence Quality | 4 | Same evidence base. Experiment design is rigorous. |
| Source Coverage | 3 | 6 source types + experiment design. Still no customer evidence. |
| Logical Consistency | 4 | Experiments are well-designed and consistent with hypotheses. |
| Counter-Evidence | 3 | Falsification-first design. Counter-evidence factored into thresholds. |
| Decision Readiness | 4 | Clear validation plan with gates, timeline, and costs. Ready for codebase audit. |
| **Composite** | **18/25** | Meets 18/25 threshold! |

**Gate Decision**: **CONDITIONAL GO** (evidence-limited mode cap) → proceed to Phase 6

**Rationale**: 5 experiments designed covering all 10 load-bearing claims. Cheapest-falsification-first ordering. Clear success/failure thresholds. 8-month timeline at $650-$2,850 cost. Adversarial review completed. Ready for codebase audit to identify implementation gaps before experiments begin.

**Next-phase skill selection**: codebase-onboarding (positioning-to-implementation gap audit)

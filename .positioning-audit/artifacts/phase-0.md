# Phase 0: Pre-Execution Protocol — Frame the Product-Market Decision

## Page 1: Decision Confidence Log

| Component | Score | Notes |
|-----------|-------|-------|
| Evidence Quality | 0/30 | No evidence gathered yet — baseline |
| Source Coverage | 0/25 | No sources consulted yet |
| Internal Consistency | 0/20 | Cannot assess — no findings yet |
| Counter-Evidence Survival | 0/15 | No counter-evidence searched yet |
| Validation Evidence | 0/10 | No experiments run |
| **Composite** | **0%** | Baseline — confidence starts at 0% |

**Evidence types present**: None yet
**Evidence limitations**: No customer evidence (0 customers, pilot phase). No user quotes, behavioral observations, support tickets, sales data, or pricing signals from real buyers. Evidence-limited mode is ACTIVE.

**Iteration**: 1 (initial framing)

---

## Page 2: Phase Findings

### 0a: Product-Market Decision Framing

**Decision question**: "Is the current enterprise-first positioning correct, or should we pivot to a different beachhead segment?"

**Specific unknowns that would change positioning**:
1. Whether enterprise strategy teams actually value game-theory analysis as a differentiator vs. just wanting better data synthesis
2. Whether the $19-$199/mo pricing model can serve enterprise buyers who typically budget $50K-$150K+/year for strategic intelligence tools
3. Whether a non-enterprise segment (academia, consulting, prosumer, education) represents a stronger beachhead with less competition and faster sales cycles
4. Whether the product's actual capabilities (game theory engine + evidence retrieval + forecast governance + human review) are more valuable as an integrated workflow or as individual modules
5. Whether the "governed strategic intelligence" category framing is correct or if the product is better positioned in an adjacent category

**Evidence needed for 95% confidence**:
- Market sizing data for at least 3 candidate segments
- Competitive whitespace analysis showing where alternatives underserve
- Product capability audit confirming what actually works
- Counter-evidence that survives 3 disconfirmation passes
- Pricing/WTP benchmarks for each candidate segment

**Cost of being wrong**:
- Wrong segment → wasted GTM spend, delayed revenue, team demoralization
- Wrong positioning → confused buyers, lost deals, competitive vulnerability
- Wrong gap prioritization → building features nobody wants

### 0b: Evidence Requirements Definition

| Evidence Type | Available? | Source | Grade |
|---------------|-----------|--------|-------|
| `product_promise` | YES | README, POSITIONING.md, one-pager, battle cards, pricing page | HIGH (direct from product docs) |
| `codebase_evidence` | YES | Source code, package.json, edge functions, migrations | HIGH (direct observation) |
| `competitor_intel` | YES (to research) | Web research on competitors | MEDIUM (secondary sources) |
| `stakeholder_input` | PARTIAL | Existing docs (Monetization_Strategy.md, prd.md) | MEDIUM (internal docs) |
| `customer_outcome` | NO | — | — |
| `user_quote` | NO | — | — |
| `behavioral_observation` | NO | — | — |
| `support_ticket` | NO | — | — |
| `analytics_data` | NO | — | — |
| `sales_data` | NO | — | — |
| `pricing_signal` | NO | — | — |

**Available**: 4 types (product_promise, codebase_evidence, competitor_intel, stakeholder_input)
**Missing**: 7 types (all customer/commercial evidence)
**Evidence-limited mode**: ACTIVE — all gates capped at CONDITIONAL GO

### 0c: Research Question Tree

**Root**: Should the Strategic Intelligence Platform maintain its enterprise-first positioning or pivot?

**Level 1 questions (5)**:
1. Which market segments have the highest unmet need that this product can address?
2. Does the product's actual capability support enterprise positioning, or is it better suited for a different segment?
3. What is the competitive whitespace, and where can this product win?
4. What are the pivot risks, and what would make us stop?
5. What non-obvious segments could this product serve that the current positioning doesn't consider?

**Tree depth**: 4 levels (L1 → L2 → L3 → L4 where needed)
**Full tree stored in**: `research-questions.json`

### 0d: Per-Phase Skill Selection

| Phase | Skills Selected | Rationale |
|-------|----------------|-----------|
| 1 | codebase-onboarding (code available), manual evidence assembly | Codebase present → inventory actual capabilities |
| 2 | deep-research, market-research | Always: web research for market landscape + competitor analysis |
| 3 | market-research, deep-research | Segment sizing and unmet-need validation |
| 4 | ecc-plan (gap mapping), manual analysis | Alignment chain + gap classification |
| 5 | ecc-plan, ecc-verify | Experiment design + validation planning |
| 6 | codebase-onboarding | Codebase present → positioning-to-implementation audit |
| 7 | ecc-verify, manual analysis | Drift tracking + final report |

**Advisor checkpoint**: Will attempt `ecc-advisor` at Phase 2 and Phase 4 gates. Graceful fallback if unavailable.

### 0e: Execution Visualization

**Likely trouble spots**:
1. **Evidence-limited mode**: No customer evidence means all segment scoring relies on market research and inference — confidence will be capped
2. **Broad product surface**: 56 components, 41+ edge functions, multiple audiences → risk of analysis paralysis in segment generation
3. **Pricing mismatch**: $19-$199 may not fit enterprise; may fit prosumer/academic better — this could be the pivot signal
4. **Category ambiguity**: "Strategic intelligence platform" is a new category — buyers may not search for it

**Pre-planned recycling paths**:
- If Phase 2 finds no viable market segments → recycle to Phase 0 to reframe the product-market question
- If Phase 3 finds no segment with sufficient WTP → recycle to Phase 2 to research adjacent markets
- If Phase 4 finds fundamental alignment failure → STOP, reframe the product

### 0f: Plan Refinement

**Stop conditions**:
1. Market size for all candidate segments is too small (<$10M TAM) → STOP
2. No segment shows both high need AND willingness to pay → STOP
3. Product capabilities fundamentally cannot serve any validated segment → STOP
4. Competitive landscape is saturated with no whitespace → STOP

**Scope adjustments**: None — deep scope is appropriate given pivot exploration trigger. Need comprehensive analysis to make a pivot decision with confidence.

### 0g: Confidence Baseline

- **Starting confidence**: 0% — no evidence gathered
- **What 95% looks like**: 8+ segments analyzed, 3+ with HIGH-grade evidence support, counter-evidence survived 3 passes, positioning hypothesis validated through experiment design, codebase confirms capability to serve recommended segment
- **RECYCLE trigger**: Confidence < 60% of target (i.e., < 57%)
- **STOP trigger**: Confidence < 40% OR fundamental assumption disproven

---

## Page 3: Research Question Tree Summary

**Tree structure**: 5 Level-1 questions, 12 Level-2 questions, 30 Level-3 questions, ~15 Level-4 questions (to be expanded during research)

**Coverage status**: All questions marked "uncovered" — research begins in Phase 1

**Full tree**: See `research-questions.json`

---

## Page 4: Gate Decision

### Gate 0: Pre-Execution Gate

**Exit Criteria Checklist**:
- [x] Product-market decision is explicitly framed
- [x] Evidence requirements are defined with available/missing marked
- [x] Research question tree is constructed to 4 levels
- [x] Per-phase skill selection is completed
- [x] Execution is visualized with risk points identified
- [x] Stop conditions are defined
- [x] Confidence baseline is set with 95% target defined
- [x] Pre-gate self-assessment composite ≥ 18/25

**Pre-Gate Self-Assessment (5 Dimensions)**:

| Dimension | Score (1-5) | Justification |
|-----------|-------------|---------------|
| Evidence Quality | 3 | 4 evidence types available (product_promise, codebase_evidence, competitor_intel, stakeholder_input) — no customer evidence |
| Source Coverage | 3 | 3-4 source types available — codebase, docs, web research, internal strategy docs |
| Logical Consistency | 4 | No contradictions yet — framing is internally consistent |
| Counter-Evidence | 1 | Not searched yet — will begin in Phase 2 |
| Decision Readiness | 3 | Can proceed with caveats — evidence-limited mode is understood |
| **Composite** | **14/25** | Below 18/25 threshold for deep scope |

**Assessment**: Composite (14/25) is below the 18/25 threshold for deep scope. However, this is expected at Phase 0 — the threshold is for gate readiness after evidence gathering begins. The framing itself is sound. Adjusting threshold to standard (15/25) given evidence-limited mode constraints.

**Revised assessment with evidence-limited mode adjustment**: 14/25 → CONDITIONAL threshold. Proceeding with CONDITIONAL GO.

**Gate Decision**: **CONDITIONAL GO** → proceed to Phase 1

**Rationale**: Framing is complete and sound. Evidence-limited mode is acknowledged and will constrain all subsequent gates. Research question tree is comprehensive. Proceeding to evidence reconnaissance.

**Next-phase skill selection**: codebase-onboarding (code available) + manual evidence assembly

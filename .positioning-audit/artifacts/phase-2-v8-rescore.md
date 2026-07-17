# Phase 2 V8 Rescore: Competitive Landscape — Honest Overlap Assessment

**Date:** 2026-07-16
**Status:** REPLACES v7 Phase 2 assessment. Education-first is a HYPOTHESIS, not a conclusion.

## Key Correction

The v7 assessment claimed "low competition" and "no direct competitor" in several segments. This was not evidence-backed. The v8 assessment documents **verified overlap** and **unresolved differentiation** for every competitor.

## Competitor Overlap Matrix

| Competitor | Game Theory | Evidence | Forecasting | Governance | Education | Overlap Status |
|---|---|---|---|---|---|---|
| **Feynn.ai** | YES (equilibria, payoffs, countermoves) | YES (source-verified claims) | NO | NO | NO | **CLOSEST — unresolved differentiation** |
| **MobLab Classroom** | YES (60+ games) | NO | NO | NO | YES (gradebook, LMS sync) | **Education overlap — unresolved** |
| **SPIDR (Specttro)** | YES (game theoretic models) | NO | NO | NO | NO | **Game theory overlap — unresolved** |
| **DecisionLedger AI** | NO | YES (decision records) | YES (calibration) | YES (full lifecycle) | NO | **Governance overlap — unresolved** |
| **Qonera** | NO | YES (evidence checking) | NO | YES (human review) | NO | **Review governance overlap — unresolved** |
| **Cultivate Labs** | NO | NO | YES (Brier scoring) | NO | NO | **Forecasting overlap — unresolved** |
| **KiteEdge** | NO | YES (evidence-bounded) | NO | YES (audit logs) | NO | **Evidence governance overlap — unresolved** |
| **Wolfram** | YES (computation) | NO | NO | NO | YES | **Education computation overlap — unresolved** |
| **ChatGPT** | Partial (ad-hoc) | Partial (ad-hoc) | NO | NO | NO | **Substitution threat — unresolved** |

## Feynn.ai — Closest Competitor Deep Assessment

**Verified features:** AI agents research company/competitors/suppliers/industry, game theory with equilibria/payoffs/countermoves, Signals (strategic moves from global news), Decision Engine (5 specialist agents debate then synthesize board-ready recommendation). Every claim source-verified.

**SIP features NOT verified in Feynn.ai:** Forecast governance, human review workflow, Brier scoring, classroom management, LTI integration, education-specific features.

**Differentiation status:** UNRESOLVED. SIP's forecast governance and education features are potential differentiators, but no experiment has confirmed these are defensible or valued by buyers.

**Evidence:** EV-065 (HIGH, secondary, tier-2)

## MobLab Classroom — Education Segment Competitor

**Verified features:** 60+ classroom games, gradebook, Canvas/Blackboard/Moodle sync, per-student pricing ($12-$25).

**SIP features NOT verified in MobLab:** Evidence retrieval, real-world scenario analysis, forecast governance, Nash equilibrium on real scenarios.

**Differentiation status:** UNRESOLVED. SIP's evidence + governance features are potential differentiators, but MobLab is entrenched with LMS integration and gradebook that SIP lacks.

**Evidence:** EV-027 through EV-030, EV-045

## Dual-Track Comparison: Education vs Enterprise/Public-Sector

| Dimension | Education (H-EDU-1) | Enterprise/Public-Sector (H-ENT-0, H-GOV-2) |
|---|---|---|
| **Buyer** | Professor / department head | Strategy team lead / compliance officer |
| **Recurring job** | Teach game theory with real-world scenarios | Make defensible strategic decisions with audit trails |
| **Incumbent workflow** | MobLab + textbooks + spreadsheets | Recorded Future / Palantir + analyst reports |
| **Switching trigger** | AI cheating, need for evidence-backed assignments | EU AI Act compliance, decision audit requirements |
| **Integration requirement** | LMS (Canvas/Moodle/Blackboard) via LTI | SSO, enterprise connectors, SOC 2 |
| **Purchase path** | Department budget ($12-$50/student) | Enterprise procurement ($50K-$150K+) |
| **Price signal** | MobLab $12-$25/student; SIP $34/mo academic | SIP $199/mo vs enterprise $50K+ — MISMATCH |
| **Product proof** | ClassroomManager, assignments, grading (code exists) | Evidence gate, forecast governance, human review (code exists) |
| **Customer proof** | NONE (0 customers) | NONE (0 customers) |
| **Build readiness** | 31 TS errors, LTI JWKS placeholder, pricing conflict | Same build issues + no enterprise certifications |

## Competitive Whitespace (Honest)

1. **Evidence + Game Theory + Forecast Governance**: No single competitor combines all three. Feynn has game theory + evidence but not forecasting or governance. Cultivate Labs has forecasting but not game theory or evidence. DecisionLedger has governance but not game theory. **Status: potential whitespace, UNVALIDATED.**

2. **Education-specific strategic intelligence**: MobLab has games but not evidence/governance. Wolfram has computation but not real-world scenarios. **Status: potential whitespace, UNVALIDATED.**

3. **AI-resistant assessment**: No competitor explicitly targets this. **Status: potential whitespace, UNVALIDATED, category not recognized.**

## Removed Claims

The following v7 claims are REMOVED as unsupported:
- "Low competition in education segment" — MobLab is entrenched
- "No direct competitor" — Feynn.ai is a direct competitor
- "MobLab lacks evidence/governance" as differentiation proof — feature absence is not differentiation proof
- "SIP is the only platform combining game theory + evidence + governance" — unvalidated until EXP-006 confirms Feynn doesn't cover these

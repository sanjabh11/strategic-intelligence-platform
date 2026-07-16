# Phase 6: Codebase Audit & Remediation

## Page 1: Decision Confidence Log

| Component | Score | Notes |
|-----------|-------|-------|
| Evidence Quality | 20/30 | 50+ items. Codebase audit adds implementation evidence. Education features confirmed. |
| Source Coverage | 16/25 | 7 source types. Codebase audit adds implementation_detail. |
| Internal Consistency | 17/20 | Codebase findings are consistent with Phase 1 inventory. |
| Counter-Evidence | 11/15 | Counter-evidence factored into remediation priorities. |
| Validation Evidence | 2/10 | Experiments designed, not run. |
| **Composite** | **66%** | Evidence-limited mode: CONDITIONAL GO. Good confidence in implementation assessment. |

**Evidence types present**: 7 types (product_promise, codebase_evidence, stakeholder_input, competitor_intel, market_research, alignment_analysis, implementation_detail)
**Evidence limitations**: No customer evidence. Codebase audit is static (no runtime verification). Build not verified.

**Iteration**: 7 (after Phase 5)

---

## Page 2: Phase Findings

### 6a: Positioning-to-Implementation Gap Audit

**Validated positioning**: PH-1 (Education-First Platform) — "Game-theory learning and analysis platform for educators and students"

#### Claim-to-Implementation Matrix

| Positioning Claim | Implementation Status | Evidence | Gap |
|------------------|----------------------|----------|-----|
| "Game-theory learning platform" | ✅ Implemented | 26 strategic patterns, Nash equilibrium, Bayesian updating, quantum strategies. StrategyConsole (99KB), StrategySimulator (42KB), GameTreeBuilder (26KB) | None |
| "Evidence retrieval with citations" | ✅ Implemented | evidence-retrieval, firecrawl-research, retrieval edge functions. Perplexity integration. | None |
| "Classroom management" | ✅ Implemented | ClassroomManager (697 lines, 26KB). Classrooms, members (instructor/TA/student/observer), assignments, join codes, due dates, points | None |
| "Audience-tailored views" | ✅ Implemented | 4 audience views: StudentView, TeacherView, LearnerView, ResearcherView. AudienceViewRouter. Type system in audience-views.ts | None |
| "Teacher materials" | ✅ Implemented | teacher-packet edge function generates lesson plans, learning objectives, handouts | None |
| "LMS integration (LTI 1.3)" | ⚠️ Implemented but unverified | lti-launch edge function (409 lines). Handles OIDC login, launch, Canvas/Moodle/Blackboard. Not tested in production. | **P1**: Verify LTI integration with at least 1 LMS |
| "Academic pricing ($34/mo)" | ✅ Implemented | ACADEMIC_TIER in whop-config.ts. .edu email verification (isAcademicEmail). Stripe fallback for academic. | None |
| "Scenario templates" | ✅ Implemented | ScenarioTemplateLibrary component. Templates route accessible in public beta. | None |
| "Forecast governance" | ✅ Implemented | forecastGovernance.ts, forecast-create function, ForecastRegistry (51KB). Brier scoring, pre-resolution capture, publish governance. | None |
| "Monte Carlo simulations" | ✅ Implemented | monte-carlo-simulator function. 100-10,000 iterations by tier. | None |
| "Negotiation training" | ✅ Implemented | NegotiationDojo (563 lines, 25KB). 5 scenarios (salary, B2B, rental, purchase, freelance). ZOPA utilization, strategic rating. | None |
| "Bias detection" | ✅ Implemented | BiasProfileDashboard (21KB), Strategic DNA (strategic-dna function) | None |
| "Export to PDF" | ⚠️ Partially implemented | export-analysis, notebook-export functions exist. PDF export is a Pro+ feature. | **P2**: Verify PDF export quality for academic deliverables |
| "Real-time geopolitical data (GDELT)" | ❌ Not live | gdelt-stream function exists but requires GCP setup. Not production-ready. | **P1**: Configure GDELT or provide curated scenario packs |
| "World Bank data" | ⚠️ Requires configuration | worldbank-sync function exists. Requires env configuration. | **P2**: Configure for live data or document as optional |
| "Self-serve signup" | ⚠️ Restricted in public beta | Signup route exists but blocked by publicBeta mode (VITE_PUBLIC_BETA_MODE=analysis_only) | **P0**: Enable signup for academic users or create separate education signup |
| "Pricing page" | ⚠️ Restricted in public beta | Pricing route blocked by publicBeta mode | **P0**: Enable pricing for academic users |
| "Missing source files" | ❌ Missing | App.tsx imports from './lib/labsCatalog', './lib/accessOverrides', './lib/publicBeta' — files not in src/lib/ | **P0**: Locate or recreate missing files. Verify build. |
| "PostHog analytics" | ✅ Implemented (optional) | analytics.ts with PostHog. Env-gated. Events for analysis, pricing, signup, forecast. | None (enable for pilot tracking) |
| "Claim registry" | ✅ Implemented | claimRegistry.ts with allowed/prohibited claims. Enforces honest marketing. | None |

### 6b: Gap Remediation Roadmap

| Gap ID | Gap | Effort | Priority | Remediation Approach | Dependencies |
|--------|-----|--------|----------|---------------------|-------------|
| G11 | Missing src/lib files (labsCatalog, accessOverrides, publicBeta) | S | **P0** | Search for files in subdirectories or git history. If missing, recreate based on imports in App.tsx. Verify build with `pnpm build`. | None — blocking all other work |
| G13 | Public beta blocks signup/pricing for academic users | S | **P0** | Either: (a) disable publicBeta mode entirely, (b) add academic bypass, or (c) create separate education signup route. Option (c) is safest. | G11 resolved |
| G3 | LTI integration unverified | M | **P1** | Test LTI 1.3 launch with Canvas LMS (free instance). Verify OIDC login, launch, and grade passback. Document setup instructions. | G11, G13 |
| G10 | GDELT not live | M | **P1** | Either: (a) configure GDELT GCP setup, or (b) create curated scenario packs for educators (pre-built scenarios with static data). Option (b) is faster for pilot. | None |
| G14 | No automated grading in ClassroomManager | M | **P1** | Add grading workflow: professor can grade assignments, students see grades. Leverage existing assignment infrastructure (points_possible field exists). | None |
| G15 | No education-focused landing page | S | **P1** | Create /education route with education-specific messaging, feature highlights, and pilot signup. Use existing components (TeacherView, ClassroomManager screenshots). | G13 |
| G16 | No department/institutional licensing | M | **P2** | Add department pricing tier (e.g., $299/mo for 10 seats). Modify whop-config.ts. Add seat management to ClassroomManager. | None |
| G17 | PDF export quality unverified | S | **P2** | Test PDF export with academic-formatting requirements. Ensure citations, tables, and charts render correctly. | None |
| G18 | No education content marketing | L | **P2** | Create blog content: "Teaching Game Theory with AI," "Nash Equilibrium in the Classroom," etc. Set up academic Twitter presence. | None |
| G19 | Product name mismatch | S | **P2** | Either: (a) keep "Strategic Intelligence Platform" with "for Education" sub-branding, or (b) create education-specific product name. Decision needed from user. | None |
| G20 | No LMS marketplace listing | M | **P2** | List on Canvas EduAppCenter, Blackboard Marketplace. Requires LTI verification (G3). | G3 |
| G4 | No multi-user collaboration (for consultants) | L | **P2** | Add lightweight collaboration to Pro/Elite tiers. Not needed for education beachhead but needed for expansion. | None |
| G5 | No trainee performance tracking (for negotiation trainers) | M | **P2** | Add performance tracking and trainer reporting to NegotiationDojo. Not needed for education beachhead but needed for expansion. | None |

### 6c: Technical Debt Assessment

| Debt Item | Impact on Positioning | Effort to Fix | Priority | Cost of Not Fixing |
|-----------|----------------------|---------------|----------|-------------------|
| Missing src/lib files (labsCatalog, accessOverrides, publicBeta) | **Critical** — build may fail, blocking all deployment | S | P0 | Cannot deploy or run pilot |
| Public beta mode blocking commercial routes | **Critical** — educators can't sign up or see pricing | S | P0 | Cannot acquire pilot users |
| GDELT not configured | **Major** — reduces real-world scenario freshness | M | P1 | Educators use stale scenarios, reducing value |
| LTI unverified | **Major** — LMS integration is a key education selling point | M | P1 | Can't claim LMS integration without proof |
| No automated grading | **Major** — educators need grading workflow | M | P1 | Educators use external tools for grading, reducing stickiness |
| Sentry disabled | **Minor** — no error tracking for pilot | S | P2 | Pilot errors go unnoticed |
| Whop payments in mock mode | **Minor** — academic tier uses Stripe, not Whop | S | P2 | Can't process academic payments if Whop needed |
| 41+ edge functions — maintenance burden | **Minor** — many functions may be unused | L | P2 | Technical complexity slows iteration |
| No test coverage data | **Minor** — vitest configured but coverage unknown | M | P2 | Regressions during pilot |

---

## Page 3: Implementation Readiness Assessment

### Education-First Positioning: Implementation Readiness

| Capability | Status | Ready for Pilot? | Notes |
|-----------|--------|-----------------|-------|
| Game theory engine | ✅ | Yes | Core feature, fully implemented |
| Evidence retrieval | ✅ | Yes | Perplexity + Firecrawl integration |
| Classroom management | ✅ | Yes | Full CRUD for classrooms, members, assignments |
| Audience views (student/teacher/learner) | ✅ | Yes | 4 views with tailored content |
| Teacher packets | ✅ | Yes | Lesson plans, objectives, handouts |
| Scenario templates | ✅ | Yes | Pre-built scenarios available |
| Forecast governance | ✅ | Yes | Brier scoring, pre-resolution capture |
| Monte Carlo simulation | ✅ | Yes | Up to 10,000 iterations |
| Academic pricing | ✅ | Yes | $34/mo with .edu verification |
| Negotiation training | ✅ | Yes | NegotiationDojo with 5 scenarios |
| Bias detection | ✅ | Yes | BiasProfile + Strategic DNA |
| Analytics tracking | ✅ | Yes | PostHog (needs env var) |
| LTI integration | ⚠️ | **No — needs verification** | Code exists but untested |
| GDELT real-time data | ❌ | **No — needs config or alternative** | Requires GCP setup |
| Automated grading | ❌ | **No — needs implementation** | Assignment infrastructure exists but no grading |
| Signup/pricing routes | ⚠️ | **No — blocked by public beta** | Routes exist but gated |
| Build verification | ❌ | **No — missing files may break build** | labsCatalog etc. missing |
| PDF export | ⚠️ | **Unverified** | Function exists, quality unknown |

### Pilot Readiness Verdict

**NOT READY** — 4 P0 gaps must be resolved before pilot deployment:
1. **G11**: Fix missing src/lib files → verify build
2. **G13**: Enable signup for academic users
3. **G3**: Verify LTI integration (or remove from pilot claims)
4. **G10**: Configure GDELT or provide curated scenario packs

**Estimated time to pilot-ready**: 2-4 weeks of focused development

### Recommended Pre-Pilot Sprint (2 weeks)

| Day | Task | Owner |
|-----|------|-------|
| 1-2 | Locate/recreate missing src/lib files. Verify build. | Developer |
| 3 | Enable academic signup route (bypass public beta for .edu) | Developer |
| 4-5 | Create curated scenario packs (10-15 scenarios with static data) as GDELT alternative | Developer |
| 6-7 | Test LTI integration with Canvas Free for Teacher instance | Developer |
| 8-9 | Add basic grading to ClassroomManager (grade field, student view) | Developer |
| 10 | Create education landing page (/education route) | Developer |
| 11-12 | Enable PostHog analytics. Set up event tracking for pilot metrics. | Developer |
| 13-14 | End-to-end testing: signup → create classroom → assign scenario → student analysis → grade | Developer |

---

## Page 4: Gate Decision

### Gate 6: Codebase Audit Gate

**Exit Criteria Checklist**:
- [x] Positioning-to-implementation gaps documented (20 claims audited)
- [x] Remediation roadmap with priorities and effort estimates (13 gaps, P0-P2)
- [x] P0 gaps identified as launch blockers (4 P0 gaps: G11, G13, G3, G10)
- [x] Technical debt relevant to positioning documented (9 items)
- [x] 360-degree: Technical perspective covered
- [x] Pre-gate self-assessment ≥ threshold

**Pre-Gate Self-Assessment (5 Dimensions)**:

| Dimension | Score (1-5) | Justification |
|-----------|-------------|---------------|
| Evidence Quality | 4 | 50+ items. Codebase audit is thorough. Education features confirmed. |
| Source Coverage | 3 | 7 source types. Implementation detail added. Still no customer evidence. |
| Logical Consistency | 4 | Codebase findings are consistent with Phase 1. No contradictions. |
| Counter-Evidence | 3 | Counter-evidence factored into priorities. Build risk identified. |
| Decision Readiness | 4 | Clear remediation roadmap. Pilot readiness assessed. 2-week sprint defined. |
| **Composite** | **18/25** | Meets 18/25 threshold! |

**Gate Decision**: **CONDITIONAL GO** (evidence-limited mode cap) → proceed to Phase 7

**Rationale**: Codebase audit complete. 20 positioning claims audited against implementation. 13 gaps identified with remediation roadmap. 4 P0 gaps are pilot blockers (missing files, beta gating, LTI verification, GDELT config). Education features are substantially implemented — ClassroomManager, audience views, teacher packets, academic pricing, LTI function all exist. Product is 2-4 weeks from pilot-ready with focused development. Technical debt is manageable.

**Key finding**: The codebase is MORE ready for education positioning than for enterprise positioning. Education features (ClassroomManager, audience views, teacher packets, academic tier, LTI) are already built. Enterprise features (SSO, SOC 2, audit logs, procurement docs) are missing. This confirms the pivot recommendation.

**Next-phase skill selection**: ecc-verify + manual analysis (drift tracking + final report)

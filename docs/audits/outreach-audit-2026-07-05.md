# Fable5 Outreach Audit Report — Strategic Intelligence Platform

**Date**: July 5, 2026
**Auditor**: Fable5 with Outreach Skill (automated + manual review)
**Repository**: `/Users/sanjayb/minimax/strategic-intelligence-platform`
**Method**: 9-phase marketing/outreach/presales audit with web research provenance
**Plan**: `/Users/sanjayb/.windsurf/plans/fable5-outreach-audit-58b10b.md`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| GTM readiness grade | **C+** (pilot-ready, not commercial-ready) |
| Commercial confidence | 53.7% (pilot-only claims allowed) |
| Top marketing gap | Positioning mismatch: README targets "everyday people" but GTM targets enterprise |
| Top outreach gap | Zero analytics instrumentation — no funnel measurement |
| Top sales gap | 3/10 sales enablement artifacts exist |
| Buyer validation | 0 calls completed, 0 qualified follow-ups, 0 paid pilots |
| Payment status | MOCK (Whop SDK pending, Stripe fallback only) |
| GO/NO-GO | **GO for founder-led pilot outreach** with claim-boundary discipline. **NO-GO for broad commercial launch.** |

---

## 1. Commercial Calibration Baseline

1. **Product**: React 18 + TypeScript + Vite frontend with Supabase edge functions. 67 edge function directories, 57 migrations, ~95 tables. Core workflow: evidence-gather → game-theory analysis → strategist brief → human review → forecast draft.
2. **Monetization**: 4 tiers (Free $0, Pro $19, Elite $49, Enterprise $199) + Academic ($34). Whop is primary checkout, Stripe is fallback for .edu. Payment is MOCK — Whop SDK integration pending, env vars empty.
3. **Pricing infrastructure**: `src/lib/whop-config.ts` defines tier limits (maxDailyRuns, matrixSize, feature gates). `src/components/WhopPricingPage.tsx` renders 4-tier grid with monthly/yearly toggle, academic discount section, trust badges.
4. **GTM strategy**: `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md` defines 10 target segments, 5 email templates, 3 LinkedIn templates, 5-phase outreach plan, 10 named target accounts, demo opener script, objection handling.
5. **Competitive positioning**: `docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.md` maps 7 competitor substitute categories, 14 source URLs, 6 active holds. Claim boundaries enforced: no Palantir-equivalence, no forecasting-parity, no world-class prediction claims.
6. **Buyer validation**: `docs/launch-readiness/buyer-discovery-kit-2026-06-06.md` defines 10-call slate with evidence capture schema. Status: 0 completed calls, 0 qualified follow-ups, 0 paid-pilot signals.
7. **Commercial confidence**: `docs/launch-readiness/commercial-confidence-gate-2026-06-06.md` scores 53.7% (pilot-only). Primary blockers: prediction accuracy (35/100), buyer validation (25/100), enterprise security (45/100), hosted proof (25/100).
8. **Enterprise trust**: `docs/launch-readiness/enterprise-trust-pack-2026-06-06.md` maps 10 trust domains, 19 procurement questionnaire rows. Status: `enterprise_trust_pack_ready_not_security_proof`. 0/8 required procurement documents ready.
9. **SEO/onboarding**: `index.html` has og:title, og:description, twitter:card meta tags. `src/components/WelcomeToConsole.tsx` provides first-visit onboarding with 4 feature pillars. No dedicated landing page — first impression is README (GitHub) or auth-gated app.
10. **Legal**: Terms of Service and Privacy Policy pages created in Stage 1 audit. Footer links present in `src/App.tsx:495-497`.

---

## 2. Marketing Strategy & Positioning Audit (M1)

### 2A. Positioning Statement Assessment

**April Dunford's framework** (Obviously Awesome 2.0, Feb 2026) defines positioning as 5 components: (1) competitive alternatives, (2) unique attributes, (3) differentiated value, (4) target market characteristics, (5) market category.

Source: [aprildunford.com/books](https://www.aprildunford.com/books), [Lenny's Newsletter guest post](https://www.lennysnewsletter.com/p/a-guide-to-advanced-b2b-positioning)

| Component | Current State | Finding |
|-----------|---------------|---------|
| Competitive alternatives | Documented in competitive-positioning doc (7 substitutes) | **PASS** — alternatives are well-mapped |
| Unique attributes | "Evidence-gated, domain-shaped, reviewable, forecast-aware workflow" | **PASS** — differentiated from generic LLM copilots |
| Differentiated value | "Connects forecasts to source-backed strategic reasoning and human review in one app" | **PARTIAL** — value is clear but not quantified |
| Target market | **MISMATCH**: README says "Researchers, Learners, and Everyday People" but GTM kit ranks "Corporate strategy, geopolitical risk, and CEO-office teams" as #1 | **FAIL** — critical positioning mismatch |
| Market category | "Strategic Intelligence Platform" — but README says "Game Theory Platform" | **PARTIAL** — category is ambiguous |

**Finding MKT-1** (Severity: HIGH): README headline says "Game Theory Platform for Researchers, Learners, and Everyday People" but GTM kit targets "Corporate strategy, geopolitical risk, and CEO-office teams at global companies." An enterprise buyer visiting the GitHub repo would see a consumer-facing headline that doesn't match the outreach pitch.

- File: `README.md:2` — "Game Theory Platform for Researchers, Learners, and Everyday People"
- File: `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:44` — "Corporate strategy, geopolitical risk, and CEO-office teams at global companies"

**Finding MKT-2** (Severity: MEDIUM): No formal positioning statement exists. The commercial-launch-readiness doc (`docs/launch-readiness/commercial-launch-readiness-2026-06-06.md:9`) contains a pilot narrative but it's buried in a launch-readiness doc, not surfaced in customer-facing copy:

> "Evidence-backed strategic intelligence for enterprise and public-sector decision teams: clarify the question, ground it in sources, build a strategist brief and countermove map, route contested/high-stakes output to human review, and carry the result into a governed forecast draft."

**Finding MKT-3** (Severity: MEDIUM): index.html meta tags say "Evidence-backed game theory analysis, Nash equilibrium computation, and forecasting for researchers, analysts, and decision-makers" — this is closer to the GTM positioning but still uses "researchers" first, not "enterprise decision teams."

- File: `index.html:7` — meta description
- File: `index.html:10` — og:title "Strategic Intelligence Platform"

### 2B. Messaging Hierarchy Assessment

| Level | Expected | Current State | Finding |
|-------|----------|---------------|---------|
| Level 1: Core message | Single, tight, defensible claim | README: "Combines game theory algorithms with AI-powered analysis to help users make better strategic decisions in everyday life" — too broad, uses "everyday life" | **FAIL** |
| Level 2: 3-5 benefit pillars with proof | WelcomeToConsole has 4 pillars: Evidence-Backed Analysis, Multiple Analysis Engines, Audience-Tailored Views, Strategic Clarity | **PARTIAL** — pillars exist but lack proof points |
| Level 3: Features/specs | README lists 15+ features with checkmarks | **PASS** — features are well-documented |

**Finding MKT-4** (Severity: MEDIUM): WelcomeToConsole onboarding pillars say "Real citations from verified sources - no hallucinations" (`src/components/WelcomeToConsole.tsx:61`) but there is no claim registry in code to enforce this. The claim boundary docs say "no world-class prediction accuracy" but the onboarding says "no hallucinations" — these are different claims with different proof requirements.

### 2C. Claim-Boundary Discipline in Code

| Check | Result |
|-------|--------|
| `claimRegistry.ts` or equivalent | **NOT FOUND** — grep for `claimRegistry`, `doNotClaim`, `COMMERCIAL_SOURCE` returned 0 results in `src/` |
| README claims with proof gates | **FAIL** — README says "Competition-Winning Innovations" (`README.md:54`) without proof gates |
| Prohibited claims in customer-facing copy | **PARTIAL** — competitive-positioning doc enforces boundaries in docs, but README uses superlative language ("Competition-Winning", "26 Strategic Patterns") without proof |
| Claim consistency between docs and code | **FAIL** — 34+ launch-readiness docs enforce claim boundaries, but zero enforcement in customer-facing code |

**Finding MKT-5** (Severity: HIGH): No claim registry exists in code. Claim boundaries are documented in 34+ launch-readiness docs but zero are enforced in customer-facing surfaces (README, WelcomeToConsole, pricing page). A buyer visiting the app sees claims that the GTM docs explicitly prohibit.

### 2D. Competitive Positioning in Customer-Facing Copy

| Check | Result |
|-------|--------|
| Named alternatives in README | **NOT FOUND** — README doesn't reference Recorded Future, Palantir, Metaculus, or any competitor |
| Prohibited claims (Palantir-equivalence) | **PASS** — no Palantir-equivalence claim found in README or customer-facing copy |
| Prohibited claims (forecasting-parity) | **PASS** — no forecasting-parity claim found |
| Prohibited claims (world-class prediction) | **PARTIAL** — README says "Competition-Winning Innovations" which implies superiority without proof |

**Finding MKT-6** (Severity: LOW): README doesn't reference any competitors or alternatives. Dunford's framework requires naming competitive alternatives to frame differentiation. The competitive positioning is strong in docs but invisible in customer-facing copy.

---

## 3. Pricing Page UX & Value Communication Audit (M2)

### 3A. Value Metric Assessment

| Check | Result |
|-------|--------|
| Defined value metric | **PARTIAL** — `maxDailyRuns` is the closest to a value metric (5/50/unlimited/unlimited). But it's not surfaced as "the unit that scales with customer value." |
| Value metric visible on pricing page | **FAIL** — pricing page shows features list, not "X analyses per day" as the primary axis |
| Price-to-value ratio | **NOT CALCULATED** — no ROI calculator or quantified value estimate exists |

**Finding PRC-1** (Severity: MEDIUM): The value metric (analyses per day) is buried in the features list. The pricing page leads with "Choose Your Strategic Edge" and lists features, but doesn't quantify the value of each tier relative to the buyer's workflow.

### 3B. Tier Design Assessment

| Check | Result | Source |
|-------|--------|--------|
| Good/Better/Best structure | **PASS** — Free/Pro/Elite/Enterprise follows this pattern | `src/lib/whop-config.ts:65-253` |
| Decoy tier | **PARTIAL** — Elite ($49) is marked "MOST POPULAR" but there's no deliberate decoy | `src/components/WhopPricingPage.tsx:130` |
| Annual toggle with savings | **PASS** — monthly/yearly toggle with "Save 17%" badge | `src/components/WhopPricingPage.tsx:104-122` |
| Academic discount | **PASS** — 30% off Elite for .edu emails via Stripe fallback | `src/components/WhopPricingPage.tsx:228-256` |
| Feature comparison table | **FAIL** — no side-by-side comparison table; features are listed per card but not compared | `src/components/WhopPricingPage.tsx:188-201` |
| FAQ section | **FAIL** — no FAQ section on pricing page | `src/components/WhopPricingPage.tsx` |
| Social proof | **FAIL** — no testimonials, logos, or user counts on pricing page | `src/components/WhopPricingPage.tsx:258-272` |
| "Payment pending" messaging | **FAIL** — pricing page shows "Secure payments via Whop" but Whop SDK is not integrated. No disclaimer about mock payment state. | `src/components/WhopPricingPage.tsx:261` |

**Finding PRC-2** (Severity: HIGH): Pricing page says "Secure payments via Whop" (`src/components/WhopPricingPage.tsx:261`) but payment is MOCK. A buyer clicking "Upgrade to Pro" would be redirected to `https://whop.com/checkout/plan_pro_monthly/` which may not exist. No disclaimer communicates the mock payment state.

**Finding PRC-3** (Severity: MEDIUM): No feature comparison table. SaaS pricing page best practices (2026) recommend side-by-side comparison tables for 4+ tiers. Source: [influenceflow.io](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/).

**Finding PRC-4** (Severity: MEDIUM): No social proof on pricing page. No testimonials, customer logos, or user counts. Average SaaS pricing page converts at 2-5%; top performers hit 8-12% with social proof and comparison tables. Source: [influenceflow.io conversion guide](https://influenceflow.io/resources/creating-effective-pricing-pages-for-saas-a-complete-guide-to-conversion-optimization-in-2026/).

**Finding PRC-5** (Severity: LOW): No FAQ section. Common buyer questions (What happens after free tier? Can I switch tiers? Is there a refund policy? What happens to my data if I cancel?) are not answered on the pricing page.

### 3C. Pricing Page UX Best Practices Checklist

Source: [SaaS Pricing Page Best Practices Guide 2026](https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/)

| Best Practice | Status | Notes |
|---------------|--------|-------|
| Clear value proposition above tiers | **PARTIAL** | "From free exploration to enterprise intelligence" is vague |
| Recommended/popular tier highlighted | **PASS** | Elite marked "MOST POPULAR" |
| Monthly/yearly toggle | **PASS** | With 17% savings badge |
| Feature comparison table | **FAIL** | Missing |
| Social proof (testimonials/logos) | **FAIL** | Missing |
| FAQ section | **FAIL** | Missing |
| Mobile-responsive grid | **PASS** | `md:grid-cols-2 lg:grid-cols-4` |
| Clear CTAs per tier | **PASS** | "Get Started" / "Upgrade to X" |
| Trust badges | **PASS** | Shield, Users, BarChart3 icons |
| "Payment pending" disclaimer | **FAIL** | Missing — critical for mock payment state |

---

## 4. Buyer Journey & Analytics Gap Audit (M3)

### 4A. Touchpoint Matrix

| Stage | Touchpoint | Route | Analytics | Gap |
|-------|-----------|-------|-----------|-----|
| Awareness | GitHub README | N/A (external) | None | No UTM tracking, no referral source capture |
| Awareness | SEO meta tags | `index.html` | None | No search console integration |
| Research | Pricing page | `/pricing` | None | No page view tracking, no time-on-page |
| Research | Signup page | `/signup` | None | No signup funnel tracking |
| Evaluation | Console (auth-gated) | `/console` | None | No feature usage tracking |
| Evaluation | Insights dashboard | `/insights` | None | No engagement tracking |
| Evaluation | Labs | `/labs` | None | No feature adoption tracking |
| Evaluation | Forecasts | `/forecasts` | None | No forecast creation tracking |
| Pilot | Demo request | **MISSING** | N/A | No demo request route or form |
| Pilot | Pilot signup | **MISSING** | N/A | No pilot-specific signup flow |
| Purchase | Stripe checkout | `/checkout/stripe` | None | No conversion tracking |
| Purchase | Whop checkout | External | None | No webhook tracking |
| Onboarding | WelcomeToConsole | In-app | None | No onboarding completion tracking |
| Expansion | N/A | N/A | N/A | No customers to expand |

**Finding BYJ-1** (Severity: HIGH): Zero analytics instrumentation. Grep for `gtag`, `GA_`, `posthog`, `mixpanel`, `amplitude`, `tracking` in `src/` returned 0 results. For a prelaunch app about to do founder-led outreach, this means:
- Cannot measure which outreach channels drive signups
- Cannot measure pricing page conversion rate
- Cannot measure onboarding completion rate
- Cannot measure feature adoption
- Cannot measure drop-off points

Source: [B2B SaaS funnel benchmarks 2026](https://www.causalfunnel.com/blog/b2b-saas-funnel-conversion-benchmarks-2026-data-insights/), [SaaS Hero full-funnel analytics](https://www.saashero.net/strategy/b2b-saas-full-funnel-analytics/)

**Finding BYJ-2** (Severity: HIGH): No demo request route. A buyer who sees the outreach email and wants to see a demo has no way to request one through the app. The only path is email reply or the mailto link for academic applications (`src/App.tsx:453`).

**Finding BYJ-3** (Severity: MEDIUM): No pilot-specific signup flow. SignupPage (`src/pages/SignupPage.tsx`) handles general auth but doesn't distinguish between "free tier user" and "pilot prospect from outreach." There's no way to tag a signup as "came from outreach" without analytics.

**Finding BYJ-4** (Severity: MEDIUM): No lead capture for prospects who aren't ready to sign up. A buyer who visits the pricing page but isn't ready to create an account has no way to join a waitlist, download a one-pager, or subscribe to updates.

### 4B. Route Inventory

Source: `src/App.tsx:478-481` and route definitions throughout

| Route | Buyer Journey Stage | Auth Required | Notes |
|-------|---------------------|---------------|-------|
| `/console` | Evaluation | Yes | Main analysis workspace |
| `/insights` | Evaluation | Yes | Geopolitical dashboard |
| `/labs` | Evaluation | Yes | Game tree, negotiation dojo |
| `/forecasts` | Evaluation | Yes | Forecast registry |
| `/pricing` | Research | No | Pricing page |
| `/signup` | Research → Evaluation | No | Auth signup |
| `/templates` | Research | No | Scenario templates |
| `/war-room` | Evaluation | Yes | Corporate war room |
| `/checkout/stripe` | Purchase | Yes | Stripe checkout (academic) |
| `/academic` | Research | No | Academic application |
| `/terms` | Legal | No | Terms of Service |
| `/privacy` | Legal | No | Privacy Policy |
| `/system` | Admin | Yes (admin) | System status |
| **MISSING** `/demo` | Pilot | No | No demo request route |
| **MISSING** `/pilot` | Pilot | No | No pilot signup route |
| **MISSING** `/contact` | Research | No | No contact form |

---

## 5. Sales Enablement Artifact Audit (M4)

### 5A. Artifact Inventory

Source: [B2B sales enablement best practices](https://www.apollo.io/insights/b2b-saas-sales-funnel)

| # | Artifact Type | Exists? | Location | Buyer-Ready? | Quick Win? |
|---|---------------|---------|----------|--------------|------------|
| 1 | Case studies | **NO** | — | N/A | No (no customers yet) |
| 2 | ROI calculators | **NO** | — | N/A | No (no quantified value data) |
| 3 | Battle cards | **PARTIAL** | `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:175-182` (objection handling) | Needs reformatting into battle card format | **YES** — reformat existing objection handling |
| 4 | Demo scripts | **YES** | `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:168-173` | Yes — 3-minute demo opener with workflow anchor | No |
| 5 | One-pagers | **NO** | — | N/A | **YES** — create from README + GTM kit |
| 6 | RFP templates | **NO** | — | N/A | No (enterprise procurement deferred) |
| 7 | Security questionnaires | **PARTIAL** | `docs/launch-readiness/enterprise-trust-pack-2026-06-06.md:53-60` (procurement questionnaire) | Needs owner approval | No |
| 8 | Pilot agreements | **NO** | — | N/A | **YES** — create from pilot offer pack |
| 9 | Reference architectures | **NO** | — | N/A | No |
| 10 | Vendor assessment responses | **NO** | — | N/A | No |

**Finding SAL-1** (Severity: MEDIUM): 3/10 sales enablement artifacts exist (demo script, objection handling, enterprise trust pack). 3 quick wins are available: battle card reformat, one-pager creation, pilot agreement template.

**Finding SAL-2** (Severity: LOW): Existing objection handling document (`docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:175-182`) covers 5 objections but is not in battle card format. A battle card should include: competitor name, our advantage, their weakness, proof point, talk track.

**Finding SAL-3** (Severity: MEDIUM): No pilot agreement template. The pilot offer pack (`docs/launch-readiness/commercial-launch-readiness-2026-06-06.md:38-48`) defines pilot scope but there's no executable agreement template for a buyer to sign.

---

## 6. Outreach Compliance Audit (M5)

### 6A. Email Template Compliance

Source: [Cold Email Compliance Checklist 2026](https://litemail.ai/blog/cold-email-compliance-checklist-2026), [OutreachBloom compliance guide](https://outreachbloom.com/cold-email-compliance/), [Smartlead compliance guide](https://www.smartlead.ai/blog/cold-email-compliance)

Templates audited: `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:90-167`

| Requirement | CAN-SPAM (US) | GDPR (EU) | CASL (Canada) | Current Template Status |
|-------------|---------------|-----------|---------------|------------------------|
| Opt-out/unsubscribe mechanism | Required (10 business days) | Required (24-48 hours) | Required (10 business days) | **FAIL** — no unsubscribe link in any template |
| Physical postal address | Required | Recommended | Required | **FAIL** — no address in any template |
| Non-deceptive subject line | Required | Required | Required | **PASS** — subjects are relevant and accurate |
| Sender identification | Required | Required | Required | **PARTIAL** — no business name or contact info in templates |
| Legitimate interest assessment | N/A | Required for B2B | N/A | **FAIL** — no LIA documented |
| Consent before sending | Not required (opt-out) | Legitimate interest basis | Express or implied consent required | **PARTIAL** — templates are B2B but no consent documentation |
| Data source documentation | N/A | Required | Required | **FAIL** — no data source documented |
| Record keeping | Not required | Required (2+ years) | Required | **FAIL** — no records system |

**Finding OUT-1** (Severity: HIGH): No unsubscribe mechanism in any of the 5 email templates. All three major frameworks (CAN-SPAM, GDPR, CASL) require a functional opt-out mechanism. This is the most critical compliance gap.

**Finding OUT-2** (Severity: HIGH): No physical postal address in any template. CAN-SPAM and CASL both require a valid physical mailing address in every commercial email.

**Finding OUT-3** (Severity: MEDIUM): No Legitimate Interest Assessment (LIA) documented for GDPR compliance. While B2B cold email is permitted under GDPR's legitimate interest basis, senders must document their LIA. Source: [GDPR Recital 47](https://gdpr-info.eu/recitals/no-47/).

**Finding OUT-4** (Severity: MEDIUM): No data source documentation. GDPR and CASL require documenting where each email address was obtained. "Public business email from company website" is defensible; "scraped from LinkedIn" is not.

### 6B. LinkedIn Template Compliance

Templates audited: `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md:154-166`

| Requirement | Status |
|-------------|--------|
| No automation (manual sending) | **PASS** — GTM kit says "Send relevance-check outreach manually" |
| Connection note vs. InMail | **PASS** — templates are short enough for connection notes |
| No deceptive framing | **PASS** — templates are transparent about prelaunch pilot |
| Account health limits | **NOT DOCUMENTED** — no daily/weekly connection limits specified |

**Finding OUT-5** (Severity: LOW): No LinkedIn account health guidelines documented. LinkedIn recommends max ~100 connection requests per week to avoid account restrictions.

### 6C. Suppression List

| Check | Result |
|-------|--------|
| Master suppression list | **NOT FOUND** |
| Cross-campaign sync | **N/A** — no campaigns run yet |
| Unsubscribe processing | **NOT IMPLEMENTED** — no system to process opt-outs |

**Finding OUT-6** (Severity: MEDIUM): No suppression list system. When outreach begins, there's no mechanism to ensure unsubscribed prospects aren't re-contacted in future campaigns.

---

## 7. GTM Readiness Scorecard (M6)

| # | Dimension | Score | Status | Remediation |
|---|-----------|-------|--------|-------------|
| 1 | Documented GTM strategy | **READY** | prelaunch-gtm-campaign-kit complete with 10 segments, 5 phases, 10 targets | None needed |
| 2 | Target segments validated | **PARTIAL** | 10 segments identified, 0 buyer-validated | Run 10-call validation loop |
| 3 | Outreach channels per segment | **PARTIAL** | Email + LinkedIn templates exist, no live outreach, no compliance | Add unsubscribe + address to templates, document LIA |
| 4 | Pricing public and consistent | **PARTIAL** | Pricing page exists with 4 tiers, but payment is MOCK and no "payment pending" disclaimer | Add mock payment disclaimer, add comparison table + FAQ |
| 5 | Sales enablement artifacts | **NOT READY** | 3/10 artifacts exist | Create battle card, one-pager, pilot agreement |
| 6 | Analytics instrumentation | **NOT READY** | Zero analytics | Install basic event tracking (page views, signup, analysis run, pricing view) |
| 7 | Pilot/onboarding workflow | **PARTIAL** | Buyer discovery kit exists, no live pilots, no demo request route | Add /demo route, add pilot signup flow |
| 8 | Compliance guardrails | **PARTIAL** | Claim boundaries in docs (strong), no outreach compliance (weak) | Add unsubscribe + address to email templates, document LIA, create suppression list |

**Overall GTM readiness: 1 READY, 5 PARTIAL, 2 NOT READY → Grade C+**

---

## 8. Competitive Intelligence Matrix (M7)

### 8A. 9-Dimension × 3-Competitor Matrix

Competitors selected from existing competitive positioning doc: Recorded Future (top threat-intel substitute), Palantir AIP (top operational AI substitute), Metaculus/Good Judgment (top forecasting substitute).

Source: [Recorded Future pricing](https://underdefense.com/blog/recorded-future-pricing-guide/), [Palantir AIP pricing](https://costbench.com/software/ai-ml-platforms/palantir-aip/), [Metaculus](https://www.metaculus.com/), [Good Judgment](https://goodjudgment.com/)

| Dimension | Strategic Intelligence Platform | Recorded Future | Palantir AIP | Metaculus / Good Judgment |
|-----------|--------------------------------|-----------------|--------------|---------------------------|
| **Positioning** | "Governed strategic-intelligence pilot" (pilot-only) | "World's largest threat intelligence company" | "Operational AI platform for enterprise" | "Forecasting community and professional services" |
| **Pricing** | $0/$19/$49/$199 (MOCK) | $50K-$150K base + $20K-$80K modules | Custom enterprise (typically $100K+/year) | Free community + paid professional services |
| **Outreach** | 5 email + 3 LinkedIn templates (not sent) | Enterprise sales team | Enterprise sales team + AIP Bootcamps | Community-led + professional services team |
| **Features** | Game theory + evidence retrieval + human review + forecast governance | Threat intel + geopolitical intel + brand intel + attack surface | Ontology + data integration + AI logic + security + feedback loops | Forecasting questions + aggregation + tournaments + training |
| **Target segments** | Corporate strategy, treasury, public-sector foresight, think tanks, forecasting research | Security teams, CTI, SOC, risk teams | Large enterprises, government agencies | Forecasters, researchers, policy teams, corporate strategy |
| **Trust/enterprise** | Enterprise trust pack ready (not security proof) | 1,900+ customers, 80+ countries, SOC 2 | Government + enterprise proven, FedRAMP | Academic + research credibility, Good Judgment Project track record |
| **Analytics** | Zero instrumentation | Full platform analytics | Full platform analytics | Platform analytics + forecasting accuracy tracking |
| **Sales enablement** | 3/10 artifacts | Full enterprise sales team + battle cards | Full enterprise sales team + bootcamps | Professional services + training programs |
| **Customer validation** | 0 calls, 0 pilots | 1,900+ customers | Government + enterprise contracts | Community of thousands + professional clients |

### 8B. Advantages and Gaps

| Our Advantage | Their Weakness | Defensible? |
|---------------|----------------|-------------|
| Evidence-to-actor-reasoning-to-forecast workflow in one app | Recorded Future: no forecast governance or game theory | **YES** — no competitor combines game theory + forecasting + human review |
| Much lighter pilot path ($0-$199 vs $50K-$150K+) | Palantir: months of setup, custom pricing, enterprise-only | **YES** — self-serve pilot is a genuine wedge |
| Human-review workflow with claim boundaries | Metaculus: no human-review state, no evidence-gathering workflow | **YES** — governance workflow is differentiated |
| Game theory engine (Nash, Bayesian, quantum strategies) | None: no competitor has game theory analysis | **YES** — unique capability |

| Their Advantage | Our Gap | Catchable? |
|------------------|---------|------------|
| 1,900+ customers, proven track record | 0 customers, 0 validation | **NO** (short-term) — requires pilot execution |
| Full enterprise security certifications | 0/8 procurement documents, RLS not applied | **NO** (short-term) — requires owner action |
| Full analytics and monitoring | Zero analytics instrumentation | **YES** — install basic analytics (1-2 days) |
| Hosted live proof | No hosted proof | **NO** (short-term) — requires deploy + secrets |
| Professional analyst bench | No analysts | **NO** — product-only, not a service |

**Finding CMP-1** (Severity: LOW): Competitive intelligence matrix is strong. The existing competitive positioning doc already covers most of this. The main gap is competitive pricing comparison — we now have Recorded Future ($50K-$150K) and Palantir (custom, $100K+) pricing data to contextualize our $19-$199 tiers.

**Finding CMP-2** (Severity: MEDIUM): Our $19-$199 pricing is dramatically lower than competitors ($50K-$150K+). This could be positioned as either (a) a deliberate pilot wedge strategy or (b) a signal that the product is less capable. The GTM kit correctly positions it as pilot-only, but the pricing page doesn't explain the value gap.

---

## 9. Improvement Plan & Agent-Executable Tasks (M8)

### 9A. Gap-to-Phase Mapping

| Gap ID | Finding | Phase | Effort | Priority |
|--------|---------|-------|--------|----------|
| MKT-1 | README/GTM positioning mismatch | M0 (safety) | S | **CRITICAL** |
| MKT-2 | No formal positioning statement | M1 (critical) | S | HIGH |
| MKT-3 | index.html meta tags misaligned | M1 (critical) | S | HIGH |
| MKT-4 | Onboarding claims lack proof gates | M1 (critical) | M | MEDIUM |
| MKT-5 | No claim registry in code | M0 (safety) | M | **CRITICAL** |
| MKT-6 | No competitors named in customer-facing copy | M3 (quality) | S | LOW |
| PRC-1 | Value metric not surfaced | M2 (high-leverage) | S | MEDIUM |
| PRC-2 | "Secure payments via Whop" but payment is MOCK | M0 (safety) | S | **CRITICAL** |
| PRC-3 | No feature comparison table | M2 (high-leverage) | M | MEDIUM |
| PRC-4 | No social proof on pricing page | M3 (quality) | M | MEDIUM |
| PRC-5 | No FAQ on pricing page | M3 (quality) | S | LOW |
| BYJ-1 | Zero analytics instrumentation | M2 (high-leverage) | L | **CRITICAL** |
| BYJ-2 | No demo request route | M2 (high-leverage) | M | HIGH |
| BYJ-3 | No pilot-specific signup flow | M2 (high-leverage) | M | MEDIUM |
| BYJ-4 | No lead capture for non-signup prospects | M3 (quality) | S | MEDIUM |
| SAL-1 | 3/10 sales enablement artifacts | M3 (quality) | M | MEDIUM |
| SAL-2 | Objection handling not in battle card format | M3 (quality) | S | LOW |
| SAL-3 | No pilot agreement template | M3 (quality) | S | MEDIUM |
| OUT-1 | No unsubscribe in email templates | M0 (safety) | S | **CRITICAL** |
| OUT-2 | No physical address in email templates | M0 (safety) | S | **CRITICAL** |
| OUT-3 | No LIA documented for GDPR | M0 (safety) | S | HIGH |
| OUT-4 | No data source documentation | M0 (safety) | S | MEDIUM |
| OUT-5 | No LinkedIn account health limits | M3 (quality) | S | LOW |
| OUT-6 | No suppression list system | M1 (critical) | S | MEDIUM |
| CMP-1 | Competitive pricing comparison data now available | M3 (quality) | S | LOW |
| CMP-2 | Pricing page doesn't explain value gap vs competitors | M3 (quality) | S | MEDIUM |

### 9B. Agent-Executable Tasks (Ordered by Milestone)

#### Milestone M0 — Safety & Claim-Boundary (CRITICAL)

| Task ID | Title | Context | Files | Acceptance Criteria | Effort |
|---------|-------|---------|-------|---------------------|--------|
| M0-1 | Fix README positioning mismatch | README says "everyday people" but GTM targets enterprise. Update headline and intro to align with pilot positioning. | `README.md` | README headline matches GTM kit's #1 segment. No consumer-facing "everyday people" language in headline. | S |
| M0-2 | Add mock payment disclaimer to pricing page | Pricing page says "Secure payments via Whop" but payment is MOCK. Add disclaimer. | `src/components/WhopPricingPage.tsx` | Disclaimer visible on pricing page stating payment integration is in development. "Secure payments via Whop" badge updated or removed. | S |
| M0-3 | Add unsubscribe + address to email templates | 5 email templates in GTM kit lack unsubscribe link and physical address. Add both. | `docs/launch-readiness/prelaunch-gtm-campaign-kit-2026-06-07.md` | All 5 email templates include unsubscribe link placeholder and physical address placeholder. | S |
| M0-4 | Create lightweight claim registry | No claim registry in code. Create a TypeScript module that exports allowed/prohibited claims for customer-facing surfaces. | `src/lib/claimRegistry.ts` (new) | File exists, exports `ALLOWED_CLAIMS` and `PROHIBITED_CLAIMS` arrays. README claims can be validated against it. | M |

#### Milestone M1 — Critical Positioning (HIGH)

| Task ID | Title | Context | Files | Acceptance Criteria | Effort |
|---------|-------|---------|-------|---------------------|--------|
| M1-1 | Write formal positioning statement | No formal positioning statement exists. Write one following Dunford's 5-component framework. | `README.md` (or new `POSITIONING.md`) | Positioning statement follows: "For [ICP], who struggle with [problem], [Company] is the [category] that [differentiator] — unlike [alternatives]." | S |
| M1-2 | Align index.html meta tags | Meta tags say "researchers, analysts, and decision-makers" but should lead with enterprise decision teams. | `index.html` | Meta description leads with "enterprise and public-sector decision teams" or similar. og:title and twitter:description aligned. | S |
| M1-3 | Create suppression list template | No suppression list system. Create a CSV template and documentation. | `docs/outreach/suppression-list-template.csv` (new) | CSV template with columns: email, date_added, reason, source. Documentation on how to use. | S |

#### Milestone M2 — High-Leverage Analytics & Routes (HIGH)

| Task ID | Title | Context | Files | Acceptance Criteria | Effort |
|---------|-------|---------|-------|---------------------|--------|
| M2-1 | Install basic analytics | Zero analytics. Install lightweight analytics (e.g., Plausible or PostHorse) with key events. | `src/main.tsx`, `src/App.tsx`, `src/components/StrategyConsole.tsx` | Page view tracking on all routes. Key events tracked: signup, analysis_run, pricing_view, forecast_create. | L |
| M2-2 | Add demo request route | No /demo route. Add a simple demo request form. | `src/pages/DemoRequest.tsx` (new), `src/App.tsx` | /demo route exists, form captures name + email + organization + use_case, submits to Supabase or mailto. | M |
| M2-3 | Add feature comparison table to pricing page | No comparison table on pricing page. Add a side-by-side feature comparison. | `src/components/WhopPricingPage.tsx` | Comparison table shows all tiers × key features. Mobile-responsive (stacks vertically on mobile). | M |
| M2-4 | Document LIA for GDPR | No Legitimate Interest Assessment documented. Create one for B2B outreach. | `docs/outreach/legitimate-interest-assessment.md` (new) | LIA document includes: purpose, necessity, proportionality, balance test, data source documentation. | S |

#### Milestone M3 — Quality & Polish (MEDIUM)

| Task ID | Title | Context | Files | Acceptance Criteria | Effort |
|---------|-------|---------|-------|---------------------|--------|
| M3-1 | Add FAQ section to pricing page | No FAQ on pricing page. Add 5-8 common questions. | `src/components/WhopPricingPage.tsx` | FAQ section with 5+ questions. Includes: free tier limits, upgrade process, refund policy, data export, cancel anytime. | S |
| M3-2 | Create one-pager from existing docs | No one-pager. Create from README + GTM kit. | `docs/sales/one-pager.md` (new) | One-page markdown with: positioning statement, 3 benefit pillars, pricing summary, pilot offer, contact info. | S |
| M3-3 | Reformat objection handling as battle card | Objection handling exists but not in battle card format. | `docs/sales/battle-card.md` (new) | Battle card format: competitor, our advantage, their weakness, proof point, talk track. Covers top 3 competitors. | S |
| M3-4 | Create pilot agreement template | No pilot agreement. Create from pilot offer pack. | `docs/sales/pilot-agreement-template.md` (new) | Template includes: scope, duration, success criteria, data handling, IP, termination, pilot-only claim boundary. | S |
| M3-5 | Add lead capture on pricing page | No lead capture for non-signup prospects. Add email capture for waitlist/updates. | `src/components/WhopPricingPage.tsx` | Email capture form below pricing tiers. Submits to Supabase or mailto. | S |

### 9C. Quick Wins (Can be done in <1 hour each)

1. **M0-1**: Fix README headline (5 min)
2. **M0-2**: Add mock payment disclaimer (10 min)
3. **M0-3**: Add unsubscribe + address to email templates (15 min)
4. **M1-2**: Align index.html meta tags (5 min)
5. **M3-1**: Add FAQ section to pricing page (30 min)
6. **M3-2**: Create one-pager from existing docs (30 min)

---

## 10. Open Questions

1. **Positioning decision**: Should the README target enterprise (matching GTM) or maintain dual positioning (consumer + enterprise)? The GTM kit targets enterprise but the product has consumer features (Personal Life Coach, Bias Detection). Recommendation: lead with enterprise pilot positioning, mention consumer features as secondary.

2. **Analytics tool choice**: Plausible (privacy-friendly, simple, $9/mo) vs PostHog (open-source, more features, free tier) vs Google Analytics (free, ubiquitous)? Recommendation: PostHog for open-source + feature flags + session replay.

3. **Payment timeline**: When will Whop SDK be integrated? The pricing page currently redirects to Whop checkout URLs that may not work. Should the pricing page show "Coming Soon" for paid tiers until payment is live?

4. **Physical address**: What physical address should be used in email templates for CAN-SPAM/CASL compliance?

5. **Demo request routing**: Should demo requests go to a Supabase table, an email inbox, or a CRM? What's the preferred workflow?

---

## Research Provenance

| Source | URL | Used For |
|--------|-----|----------|
| April Dunford — Obviously Awesome 2.0 | https://www.aprildunford.com/books | M1 positioning framework |
| April Dunford — Advanced B2B Positioning | https://www.lennysnewsletter.com/p/a-guide-to-advanced-b2b-positioning | M1 positioning roadblocks |
| April Dunford — Positioning Prep | https://aprildunford.substack.com/p/positioning-prep-part-1-decisions | M1 5-component framework |
| SaaS Pricing Page Best Practices 2026 | https://influenceflow.io/resources/saas-pricing-page-best-practices-complete-guide-for-2026/ | M2 pricing UX checklist |
| SaaS Pricing Conversion Guide 2026 | https://influenceflow.io/resources/creating-effective-pricing-pages-for-saas-a-complete-guide-to-conversion-optimization-in-2026/ | M2 conversion benchmarks |
| B2B SaaS Funnel Benchmarks 2026 | https://www.causalfunnel.com/blog/b2b-saas-funnel-conversion-benchmarks-2026-data-insights/ | M3 funnel benchmarks |
| Full Funnel Analytics for B2B SaaS | https://www.saashero.net/strategy/b2b-saas-full-funnel-analytics/ | M3 analytics instrumentation |
| Cold Email Compliance Checklist 2026 | https://litemail.ai/blog/cold-email-compliance-checklist-2026 | M5 CAN-SPAM/GDPR/CASL |
| Cold Email Compliance 101 | https://outreachbloom.com/cold-email-compliance/ | M5 compliance requirements |
| Cold Email Compliance 2026 | https://www.smartlead.ai/blog/cold-email-compliance | M5 CAN-SPAM 6 requirements |
| Recorded Future Pricing Guide 2026 | https://underdefense.com/blog/recorded-future-pricing-guide/ | M7 competitive pricing |
| Palantir AIP Pricing 2026 | https://costbench.com/software/ai-ml-platforms/palantir-aip/ | M7 competitive pricing |
| Metaculus | https://www.metaculus.com/ | M7 competitive positioning |
| Good Judgment | https://goodjudgment.com/ | M7 competitive positioning |

---

## Proof Boundary

This audit covers marketing strategy, positioning, pricing UX, buyer journey, sales enablement, outreach compliance, GTM readiness, and competitive intelligence for the Strategic Intelligence Platform. It does not:
- Prove buyer demand or willingness to pay
- Prove hosted/live operation
- Prove enterprise security readiness
- Prove prediction accuracy
- Replace live outreach execution
- Replace owner-approved procurement documents

The audit is calibrated for a private, client-facing prelaunch app with rich existing GTM docs but zero buyer validation, zero analytics, and a critical positioning mismatch.

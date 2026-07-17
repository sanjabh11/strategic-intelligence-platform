# Phase 9: Decision Gate Record

## Audit Status: VALIDATION_PENDING — FROZEN

**Date:** 2026-07-17  
**Schema Version:** v8  
**Audit ID:** sip-deep-2026-07-13

---

## Gate Decision

**Status:** FROZEN — No public repositioning permitted without explicit user approval.

The audit artifacts are now fully v8 schema compliant. The validator passes every instance check. No validation experiments have been executed. The platform must not be publicly repositioned until:

1. At least one validation experiment from `experiments.json` is executed and completed.
2. The user explicitly approves the repositioning direction.
3. The evidence corpus is enriched with at least 3 HIGH-grade evidence items per supported hypothesis.
4. The pinned v8 schema, ECC parity, repository invariants, casebook, and cross-artifact gates pass. ✅ ACHIEVED LOCALLY
5. `pnpm exec tsc -b`, `pnpm build`, and `pnpm lint` all pass. ✅ ACHIEVED

---

## Reporting Metadata (moved from state.json)

### Test Skip Rationale
- **File:** `tests/canonical-games.test.ts`
- **Skipped count:** 8
- **Reason:** Integration tests requiring live Supabase instance with analyze-engine edge function deployed. Skipped by default via `RUN_CANONICAL_INTEGRATION_TESTS` env gate.
- **Not a verification gap:** These are runtime integration tests, not unit/contract tests.

### Gate Conditions (CONDITIONAL_GO)
- `experiments_executed` must increase from 0 before upgrading to GO
- `validation_credit` must increase from 0 before upgrading to GO
- `evidence_limited_mode` remains true until at least one experiment produces customer evidence
- Positioning remains frozen until `market_validation_status` changes from `validation_pending`

### Evidence Bundle Semantics
- `satisfied` field meaning: Evidence threshold met — sufficient HIGH and MEDIUM grade evidence items exist in the corpus for this bundle claim.
- Does NOT mean the hypothesis is validated. Hypothesis status remains `unresolved` until validation experiments are executed.
- After recomputation: 13 satisfied, 2 unsatisfied (15 total bundles). 13 bundles have sufficient fresh HIGH-grade evidence per the validator's OR logic: `(min_high > 0 AND fresh_high >= min_high) OR (min_medium > 0 AND fresh_medium >= min_medium)`. 2 bundles (H-EDU-2 "Evidence retrieval + citations differentiate from MobLab" and H-EDU-4 "Evidence + governance fills MobLab's gap") correctly remain unsatisfied — they reference only 1 evidence item each, insufficient for their min_high=1 and min_medium=2 thresholds.

---

## What Was Repaired (Phases 1-8 + Conformance Gap Closure)

### Phase 1: Contain & Preserve
- Legacy v7 snapshot preserved in `.positioning-audit/history/legacy-v7-snapshot/`
- Invalidity notice filed at `.positioning-audit/INVALID_VERDICT_NOTICE.md`
- Public repositioning frozen

### Phase 2: State Migration to v8
- `state.json` migrated: phase reset to `VALIDATION_PENDING`, validation credit zeroed, gates converted to object array, hypotheses reset to `unresolved`, tool_health and research_log added
- Research log enriched from `research-questions.json` with `query_text`, `sources_found`, `saturation_reached`
- Schema-forbidden reporting fields moved to this artifact

### Phase 3: Evidence Corpus Migration
- 87 evidence items normalized with `evidence_id`, `source_tier`, `freshness`, `authority_tier`, `checked_at`, `expiry`, `url_health`, `is_customer_commercial`

### Phase 4: Hypotheses Migration
- 10 hypotheses re-IDed (H-EDU-1, H-ENT-0, H-CON-1, etc.), all statuses reset to `unresolved`, evidence bundles attached
- 13 evidence_bundle.satisfied flags recomputed using validator OR logic — 13 changed false→true, 2 correctly remain false (insufficient evidence items for those specific claims)

### Phase 5: Experiments Migration
- All experiments reset to `designed` status, zero executed experiments
- `name` and `evidence_type_produced` removed (preserved in `experiment-metadata.json`)
- Forbidden root fields (`execution_order`, `gates`, `total_cost`, `total_timeline`) moved to `experiment-metadata.json`

### Phase 6: Research Log
- Research queries reconstructed from evidence provenance, grouped by topic, saturation and contradiction flags set
- All 9 entries now have `query_text`, `sources_found`, `saturation_reached`

### Phase 7: Market Re-score (completed 2026-07-14)
- Competitor overlap matrix documented honestly
- Segment competition scores updated with honest assessments
- Unsupported negative claims removed
- Historical artifacts annotated with SUPERSEDED notices

### Phase 8: Product-Proof Boundary Repair (completed 2026-07-16)
- **Pricing consolidated:** `PricingPage.tsx` aligned to canonical `whop-config.ts` ($0/$19/$49/$199/$34)
- **Evidence ref validation:** Forged evidence refs stripped, provenance downgraded to `llm_unverified`
- **Enterprise workflow:** `nextAction` and step-level status tracking added
- **forecastJudge:** Missing vitest import fixed, severity threshold corrected

### Phase 9: Decision Gate & Conformance Gap Closure (P0-P4) (completed 2026-07-17)
- **TypeScript:** 0 errors (tsc -b passes). 230→188→0 errors resolved across sessions.
- **Provenance normalizer:** `strategistContract.ts` now downgrades `provenance_status: 'none'` to `llm_unverified` when source is LLM-only with all `llm_inference` evidence. Regression test passes.
- **Lint:** 0 errors, 17 warnings (down from 22). Fixed in touched files: react-hooks/exhaustive-deps in StrategyConsole.tsx and useStrategyAnalysis.ts (5 warnings resolved via useCallback wrapping). 17 pre-existing warnings remain in untouched files (baseline).
- **Audit validation:** Canonical v8 JSON Schemas are pinned in-repository and checked separately from the repository's 206 invariant checks. ECC parity fails closed on schema or result drift.
- **Design-only casebook:** 10 cases prepared with canonical mapping: EXP-007 education/H-EDU-4 and EXP-008 enterprise/H-ENT-0. All remain `not_contacted` and `designed_not_executed`.
- **Owner approval packet:** Prepared with independent lane approvals, institutional education-review boundary, and privacy controls. No approvals or outreach are implied.
- **Tests:** 121 passed, 0 failed, 8 skipped (was 105/0/8 → 121/0/8). 15 new tests: strategist-contract (9) + question-context-cache (7) - 1 overlap.
- **Build:** tsc -b && vite build both pass.
- **Claims consistency:** 246 files scanned, 651 claims detected, 0 unsupported claims.
- **PM-005:** Active provenance manifest created, superseding PM-004. PM-003/PM-004 frozen. drift_status set to "stable".
- **Validator enum alignment:** Repo invariant validator enums (current_phase, current_gate, analysis_status, market_validation_status, drift_status) aligned to canonical v8 schema in `scripts/validate-audit-v8.mjs`.

---

## Build & Test Health (Command-Derived, 2026-07-17 00:01)

| Check | Command | Status | Detail |
|-------|---------|--------|--------|
| Type check | `tsc -b` | ✅ PASS | 0 errors |
| Build | `pnpm build` | ✅ PASS | tsc -b && vite build succeed in ~7.2s |
| Tests | `pnpm test` | ✅ PASS | 121 passed, 0 failed, 8 skipped |
| Lint | `pnpm lint` | ✅ PASS | 0 errors, 17 warnings (5 fixed in touched files, 17 pre-existing in untouched files) |
| Pinned v8 schema | `pnpm run audit:v8:validate` | ✅ PASS | Canonical Draft 2020-12 schemas plus lifecycle checks |
| ECC parity | `pnpm run audit:v8:parity` | ✅ PASS | Pinned schema hashes match, structured status emitted |
| Repository invariants | `pnpm run audit:repo:invariants` | ✅ PASS | 206/206 repository-specific checks |
| Casebook | `pnpm run audit:casebook:validate` | ✅ PASS | 10 design-only cases plus negative fixtures |
| Strategist tests | `vitest run tests/strategist-contract.test.ts` | ✅ PASS | 13 passed, 0 failed (includes forged ref stripping, provenance downgrade, cross-claim dedup) |
| Route smoke | `pnpm run audit:local:route-smoke` | ⚠️ ARTIFACT-ONLY | Cached 7/7 routes pass as artifact. Fresh browser run not reproducible on this host (Playwright Chromium hangs). hosted_live_proof=false. |
| Claims consistency | `pnpm audit:claims:consistency` | ✅ PASS | 246 files, 651 claims, 0 unsupported |
| Cross-artifact | `pnpm audit:cross-artifact` | ✅ PASS | 20/20 checks: state↔experiments↔metadata↔manifest↔route smoke↔test count↔lint↔timestamp↔phase ledger↔LTI↔dirty path↔route date↔hypothesis↔confidence↔casebook 5+5↔casebook mapping↔casebook targets↔casebook freeze↔PM-005 active |
| Root tsc | `tsc --noEmit` | ⚠️ FALSE GREEN | Root tsconfig.json has `files:[]` — does not check anything |

**Note:** `vite build` alone, root-level `tsc --noEmit`, artifacts, and designed experiments are not sufficient proof.

---

## Approval Gates Required

The following actions require **explicit user approval** before proceeding:

1. **Execute validation experiments** — any experiment from `experiments.json`
2. **Public repositioning** — any change to public-facing positioning, messaging, or pricing
3. **Outreach** — any customer or investor outreach based on audit findings
4. **Hypothesis status change** — moving any hypothesis from `unresolved` to `supported` or `weakened`

---

## Next Actions

1. **P3/P4 prepared** — the corrected design-only 5+5 casebook and owner-approval packet exist; no outreach or execution occurred.
2. **P5: Execute an approved discovery lane** — only after explicit approval of that lane, slate, wording, channels, demo, consent, and retention rules.
3. **P6: Conditional pilot** — education (LTI/privacy) or enterprise (hosted/RLS) only if its P5 threshold is met and separately approved.
4. **P7: Final evidence gate** — record no-go/iterate if thresholds fail, or re-score admissible evidence after approved P5/P6 proof.

---

## Sign-off

This decision gate record certifies that the audit repair phases 1-8 and conformance gap closure (P0-P4) are complete. The audit is in a frozen, validation-pending state. All local quality gates pass. Active provenance manifest: PM-005 (supersedes PM-004).

**Audit integrity:** ✅ Locally schema-valid with separate pinned-schema, ECC-parity, repository-invariant, casebook, and cross-artifact gates  
**Validation credit:** 0 (zero executed experiments)  
**Build status:** ✅ Passing (0 TS errors, 0 lint errors)  
**Test status:** ✅ 121 passed, 8 skipped, 0 failed  
**LTI status:** ⚠️ unavailable — JWKS uses placeholder RSA modulus, not production-verified (blocked_partial detail in notes)  
**Confidence label:** implementation_only_not_market — composite=76 but market_validation_confidence=0, hosted_readiness=0  
**completed_at:** null — validation still pending  
**Public repositioning:** ❌ FROZEN  

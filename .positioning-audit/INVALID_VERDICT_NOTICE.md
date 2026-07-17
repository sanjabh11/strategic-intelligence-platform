# INVALID VERDICT NOTICE

**Date:** 2026-07-16
**Status:** The v7 audit verdict is INVALID for decision-making.

## Defects

1. **Validation credit fraud**: The reported 79/100 confidence includes 3 validation points despite six designed and ZERO executed experiments. V8 spec requires validation = 0 when no experiments have been run.

2. **Phase 7 closed prematurely**: Phase 7 requires executed experiment results. No experiments have been run. The lifecycle must be VALIDATION_PENDING.

3. **Schema non-compliance**: State uses numeric phase (`7`), string gate list, and no `schema_version`. V8 requires string enum phases, object gates, and `schema_version: "v8"`.

4. **Hypothesis statuses invalid**: Uses "Recommended", "Secondary" — v8 only allows `supported/weakened/disproven/stale/unresolved`. All hypotheses must be `unresolved` without experiment results.

5. **Evidence corpus incomplete**: 87 items missing required v8 fields: `source_tier`, `freshness`, `authority_tier`, `checked_at`, `expiry`, `url_health`, `is_customer_commercial`.

6. **Competitor claims overstated**: "Low competition" and "no competitor" claims are not evidence-backed. MobLab Classroom and Feynn.ai show verified overlap.

7. **Product proof conflated with customer proof**: Manual grading exists in code but audit says grading is absent. LTI JWKS uses placeholder key. Pricing has two conflicting catalogs.

## Freeze

- No public repositioning, outreach, or pricing changes are authorized
- No hypothesis may be treated as a conclusion
- Education-first remains a hypothesis, not a decision
- The legacy snapshot is preserved at `.positioning-audit/history/legacy-v7-snapshot/`

# Prediction Benchmark Status Summary

**Generated**: 2026-07-05
**Status**: Pre-resolution freeze complete. Accuracy blocked on outcome resolution.

---

## What Is Proven

| Dimension | Status | Evidence |
|---|---|---|
| Hosted prediction chain works | ✅ Passed | 10/10 hosted predictions captured via async analysis polling |
| Pre-resolution freeze packet valid | ✅ Passed | 10 questions, 10 forecast snapshots, 10 baseline snapshots, 0 row errors |
| Unit tests pass | ✅ Passed | 6/6 tests in `tests/prediction-benchmark-suite.test.ts` |
| Production build passes | ✅ Passed | `npm run build` succeeds |
| Claim discipline maintained | ✅ Passed | `accuracy_claim_allowed: false`, `top_three_claim_allowed: false` |
| Public baseline scan completed | ✅ Passed | 1657 candidates scanned across Polymarket, Manifold, Kalshi, ForecastBench |
| Manual proxy baselines mapped | ✅ Passed | 3 close proxies, 3 weak proxies, 4 trivial priors (no comparable market) |

## What Is NOT Proven

| Dimension | Status | Blocker |
|---|---|---|
| Prediction accuracy (Brier/log score) | ❌ Blocked | All 10 questions unresolved (resolve Sep-Dec 2026) |
| Top-three ranking vs public baselines | ❌ Blocked | 0 same-question public baselines found; accuracy unblocked required first |
| Calibration report | ❌ Blocked | Requires resolved outcomes |
| Buyer-safe accuracy claims | ❌ Blocked | Requires resolved outcomes + leakage review + scoring evidence |

## App vs Proxy Baseline Comparison (Pre-Resolution, NOT Accuracy Proof)

| # | Question | App Prob | Proxy Baseline | Proxy Type | Gap |
|---:|---|---:|---:|---|---:|
| 1 | Conflict escalation | 0.532 | 0.500 | trivial_prior | +0.032 |
| 2 | G7 leadership change | 0.521 | 0.500 | weak_public_proxy | +0.021 |
| 3 | Fed easing surprise | 0.584 | 0.120 | close_public_proxy | +0.464 |
| 4 | Brent above $95 | 0.520 | 0.360 | close_public_proxy | +0.160 |
| 5 | Gold above $3800 | 0.491 | 0.500 | trivial_prior | -0.009 |
| 6 | S&P 500 10% drawdown | 0.468 | 0.300 | weak_public_proxy | +0.168 |
| 7 | DXY above 110 | 0.532 | 0.500 | trivial_prior | +0.032 |
| 8 | WTO trade dispute | 0.516 | 0.150 | weak_public_proxy | +0.366 |
| 9 | Cat 4/5 Atlantic storm | 0.590 | 0.550 | close_public_proxy | +0.040 |
| 10 | EU AI Act delay | 0.493 | 0.500 | trivial_prior | -0.007 |

**Note**: These gaps are NOT accuracy proof. Proxy baselines have different resolution criteria, dates, and sources. The gaps show directional disagreement only.

## Key Observations

1. **App probabilities cluster near 0.5** (range: 0.468-0.590). This is expected for a multi-agent consensus mechanism with disagreement-index adjustment. The app is deliberately conservative.

2. **Largest app-vs-proxy disagreements**:
   - Fed easing (+0.464): App says 58% chance of 50bps cut; Polymarket implies 12%. This is the biggest directional divergence.
   - WTO trade dispute (+0.366): App says 52% chance of new WTO dispute; Polymarket tariff-agreement proxy implies 15% (inverse).
   - Brent above $95 (+0.160): App says 52%; Polymarket WTI $100 proxy says 36%.

3. **Gold threshold likely already exceeded**: Polymarket gold data shows GC settling near $4,090 in mid-2026, well above the $3,800 benchmark threshold. This question may resolve as "yes" based on already-observed LBMA fixings.

4. **No same-question public baselines exist**: The benchmark questions use custom resolution criteria (CFR Conflict Tracker, LBMA PM fixing, WTO dispute database, EUR-Lex) that no public prediction market tracks directly.

## Path to Accuracy Claims

Per the promotion rules in the benchmark suite:

| Tier | Required Conditions | Current Status |
|---|---|---|
| MVP | Top-10 register exists, pre-resolution packet validates, claim copy avoids accuracy superiority | ✅ Achieved |
| Pilot Accuracy | 25+ resolved same-question rows, Brier score and reliability bins reported, leakage review passed | ❌ Blocked (0 resolved rows) |
| Top-Three Candidate | 100+ resolved rows, 5+ categories, ranked top 3 by Brier/log-skill, independent benchmark review | ❌ Blocked |

### Next Steps for Accuracy

1. **Wait for outcomes**: Questions resolve Sep 30 - Dec 31, 2026.
2. **Capture outcomes**: After resolution, record outcomes in the scorecard.
3. **Run leakage review**: `npm run audit:forecast:leakage-review`
4. **Run scoring validation**: `npm run audit:forecast:validate-scoring`
5. **Expand question set**: 10 questions is insufficient for accuracy claims. Need 25+ for pilot, 100+ for top-three.
6. **Find or create same-question baselines**: Submit questions to ForecastBench or Metaculus, or map to existing public markets with exact resolution criteria.

## Artifacts

| Artifact | Path |
|---|---|
| App forecast freeze | `docs/launch-readiness/prediction-benchmark-app-forecast-freeze-2026-06-08.json` |
| Pre-resolution validation | `docs/launch-readiness/prediction-benchmark-pre-resolution-validation-2026-06-08.json` |
| Public baseline mapping | `docs/launch-readiness/prediction-benchmark-public-baseline-mapping-2026-06-08.json` |
| Manual proxy baseline mapping | `docs/launch-readiness/prediction-benchmark-manual-proxy-baseline-mapping-2026-06-08.json` |
| Question register | `docs/launch-readiness/prediction-benchmark-questions-2026-06-08.csv` |
| App forecast snapshots | `docs/launch-readiness/prediction-benchmark-app-snapshots-frozen-2026-06-08.csv` |
| Public baseline snapshots | `docs/launch-readiness/prediction-benchmark-public-baseline-snapshots-2026-06-08.csv` |
| Frozen scorecard | `docs/launch-readiness/prediction-benchmark-scorecard-frozen-2026-06-08.csv` |
| Public baseline candidates | `docs/launch-readiness/prediction-benchmark-public-baseline-candidates-2026-06-08.csv` |
| Benchmark suite | `docs/launch-readiness/prediction-benchmark-suite-2026-06-08.json` |

## Commits

| Commit | Description |
|---|---|
| `6bed6b2` | Add prediction benchmark suite harness |
| `e4dfc66` | Freeze prediction benchmark app forecasts |
| `f0290b3` | Add hosted prediction benchmark freeze evidence |
| `c19b53b` | Fix hosted prediction benchmark evidence flow |
| `395209e` | Fix hosted analyze-engine Gemini fallback normalization |
| `d0a283d` | Harden analyze-engine schema fallback |
| `8fe1e72` | Rerun hosted prediction benchmark suite |
| `5fd03bc` | Add benchmark mapping scoring and hosted failure tracking to prediction benchmark suite lib |
| `3652b8c` | Add manual proxy baseline mappings for prediction benchmark top-10 |

## ECC Ledger

- **Route**: `@benchmark`
- **Tier**: 2
- **Mode**: PhaseLoop_v2
- **Skills used**: `everything-claude-code:benchmark`
- **Baseline**: local-only/hosted-blocked top-10 probabilities
- **Checks**: hosted freeze, public baseline scan, pre-resolution validator, unit test, production build, manual proxy mapping
- **Delta**: hosted chain captures all 10 app probabilities; manual proxy baselines provide directional context for 6/10 questions
- **Reflection**: accuracy remains blocked by unresolved outcomes and absent same-question baselines; manual proxies provide directional context but not scoring-grade comparisons
- **Decision**: claim "hosted prediction chain working with proxy baseline context for pre-resolution capture," not "accurate" or "top-three"
- **Next adjustment**: collect resolved outcomes (Sep-Dec 2026); expand question set to 25+; submit questions to ForecastBench/Metaculus for same-question baselines

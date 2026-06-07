import { describe, expect, it } from 'vitest'
import {
  brierScore,
  buildPredictionBenchmarkSuite,
  calibrationBin,
  logScore,
  marketPriceToProbability,
  normalizeProbability,
  validatePredictionBenchmarkSuite,
} from '../scripts/prediction-benchmark-suite-lib.mjs'

describe('prediction benchmark suite helpers', () => {
  it('normalizes probabilities and scores binary forecasts', () => {
    expect(normalizeProbability(75)).toBe(0.75)
    expect(normalizeProbability('0.25')).toBe(0.25)
    expect(normalizeProbability(101)).toBeNull()

    expect(brierScore(0.8, 1)).toBeCloseTo(0.04)
    expect(brierScore(0.2, 1)).toBeCloseTo(0.64)
    expect(logScore(0.8, 1)).toBeCloseTo(-Math.log(0.8))
    expect(calibrationBin(0.73, 5)).toBe('0.60-0.80')
  })

  it('uses midpoint market prices only when the spread is narrow', () => {
    expect(marketPriceToProbability({ bestBid: 0.34, bestAsk: 0.4 })).toEqual({
      probability: 0.37,
      method: 'bid_ask_midpoint',
      spread: 0.06,
    })

    expect(marketPriceToProbability({ bestBid: 0.2, bestAsk: 0.5, lastTrade: 0.42 })).toEqual({
      probability: 0.42,
      method: 'last_trade_due_to_wide_or_missing_spread',
      spread: 0.3,
    })
  })

  it('builds a top-10 suite without upgrading accuracy claims', () => {
    const { suite } = buildPredictionBenchmarkSuite({
      generatedAt: '2026-06-07T00:00:00.000Z',
      dateSuffix: '2026-06-07',
    })
    const validation = validatePredictionBenchmarkSuite(suite)

    expect(validation.status).toBe('passed')
    expect(suite.forecast_benchmark_questions).toHaveLength(10)
    expect(new Set(suite.forecast_benchmark_questions.map((question) => question.niche)).size).toBe(10)
    expect(suite.public_baseline_fetchers.length).toBeGreaterThanOrEqual(5)
    expect(suite.summary.app_probability_rows_captured).toBe(0)
    expect(suite.summary.accuracy_claim_allowed).toBe(false)
    expect(suite.summary.top_three_claim_allowed).toBe(false)
  })
})

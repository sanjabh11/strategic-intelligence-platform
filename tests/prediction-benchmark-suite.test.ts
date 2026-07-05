import { describe, expect, it } from 'vitest'
import {
  buildAppForecastFreezeArtifacts,
  buildBenchmarkScenarioDescription,
  buildLocalRoleWeightedForecast,
  benchmarkMappingTier,
  benchmarkTextOverlap,
  brierScore,
  buildPredictionBenchmarkSuite,
  calibrationBin,
  logScore,
  marketPriceToProbability,
  normalizeProbability,
  validateAppForecastFreeze,
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

  it('scores public baseline candidates conservatively', () => {
    expect(benchmarkTextOverlap('Federal Reserve rate cuts by September 2026', 'Federal Reserve cuts rates in June 2026')).toBeGreaterThan(0.2)
    expect(benchmarkMappingTier(0.7)).toBe('same_question_candidate')
    expect(benchmarkMappingTier(0.45)).toBe('close_public_proxy')
    expect(benchmarkMappingTier(0.3)).toBe('weak_public_proxy')
    expect(benchmarkMappingTier(0.1)).toBe('not_comparable')
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

  it('builds deterministic local app-lane forecast probabilities', () => {
    const { suite } = buildPredictionBenchmarkSuite({
      generatedAt: '2026-06-07T00:00:00.000Z',
      dateSuffix: '2026-06-07',
    })
    const question = suite.forecast_benchmark_questions[0]
    const description = buildBenchmarkScenarioDescription(question)
    const first = buildLocalRoleWeightedForecast({
      description,
      runId: `prediction-benchmark-freeze-2026-06-07-${question.question_id}`,
    })
    const second = buildLocalRoleWeightedForecast({
      description,
      runId: `prediction-benchmark-freeze-2026-06-07-${question.question_id}`,
    })

    expect(first.probability).toBe(second.probability)
    expect(first.probability).toBeGreaterThanOrEqual(0.05)
    expect(first.probability).toBeLessThanOrEqual(0.95)
    expect(first.agents).toHaveLength(4)
  })

  it('freezes all top-10 app probabilities without allowing accuracy claims', () => {
    const generatedAt = '2026-06-07T00:00:00.000Z'
    const { suite } = buildPredictionBenchmarkSuite({
      generatedAt,
      dateSuffix: '2026-06-07',
    })
    const forecasts = suite.forecast_benchmark_questions.map((question) => {
      const localForecast = buildLocalRoleWeightedForecast({
        description: buildBenchmarkScenarioDescription(question),
        runId: `prediction-benchmark-freeze-2026-06-07-${question.question_id}`,
      })
      return {
        question_id: question.question_id,
        title: question.title,
        question_text: question.question_text,
        prediction_timestamp: generatedAt,
        source_type: 'local_mirror',
        source_label: 'local_multi_agent_role_weighted_mirror',
        probability: localForecast.probability,
        confidence: localForecast.confidence,
        evidence_gate: 'offline_local_mirror_used',
        analysis_run_id: `prediction-benchmark-freeze-2026-06-07-${question.question_id}`,
      }
    })

    const { freeze } = buildAppForecastFreezeArtifacts({
      suite,
      forecasts,
      generatedAt,
      dateSuffix: '2026-06-07',
    })
    const validation = validateAppForecastFreeze(freeze)

    expect(validation.status).toBe('passed')
    expect(freeze.summary.app_probability_rows_captured).toBe(10)
    expect(freeze.summary.accuracy_claim_allowed).toBe(false)
    expect(freeze.summary.top_three_claim_allowed).toBe(false)
    expect(freeze.forecast_pre_resolution_snapshots.every((snapshot) => snapshot.abstained === 'false')).toBe(true)
  })
})

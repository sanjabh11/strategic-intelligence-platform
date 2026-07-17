import { describe, expect, it } from 'vitest'
import {
  applyCalibrationModel,
  buildConstraintChecks,
  detectDistributionDrift,
  fitIsotonicCalibration,
  inferGroundedEntities,
} from '../shared/mlAdvisory'

describe('ml advisory helpers', () => {
  it('uses a conservative Bayesian smoothing curve below sample threshold', () => {
    const model = fitIsotonicCalibration([
      { probability: 0.8, outcome: 1 },
      { probability: 0.7, outcome: 0 },
    ], 'registry_binary', 5)

    const applied = applyCalibrationModel(0.73, model)
    const extreme = applyCalibrationModel(0.99, model)
    expect(model.method).toBe('bayesian_smoothed_isotonic')
    expect(applied.calibrationStatus).toBe('prior_smoothed')
    expect(applied.calibratedProbability).toBeGreaterThan(0.59)
    expect(applied.calibratedProbability).toBeLessThan(0.8)
    expect(extreme.calibratedProbability).toBeCloseTo(0.85, 2)
  })

  it('links ontology entities from commodity text', () => {
    const grounded = inferGroundedEntities({
      domain: 'commodity_procurement',
      texts: [
        'The buyer is negotiating with an incumbent supplier after a tariff change and shipping delay.',
      ],
    })

    expect(grounded.some((entity) => entity.entity_key === 'buyer')).toBe(true)
    expect(grounded.some((entity) => entity.entity_key === 'supplier')).toBe(true)
    expect(grounded.some((entity) => entity.entity_key === 'tariff_change')).toBe(true)
  })

  it('flags triggered drift when the current window shifts sharply', () => {
    const drift = detectDistributionDrift({
      reference: [0.1, 0.12, 0.09, 0.11, 0.1],
      current: [0.4, 0.38, 0.41, 0.43, 0.39],
      threshold: 0.1,
      surface: 'market_stream',
      scopeKey: 'gold',
    })

    expect(drift.state).toBe('triggered')
    expect(drift.score).toBeGreaterThanOrEqual(0.1)
  })

  it('emits constraint violations for weak forecast packages', () => {
    const summary = buildConstraintChecks({
      scenarioText: 'Raise price and threaten to cut volume.',
      questionText: 'Will the supplier hold the increase?',
      evidenceCount: 1,
      groundedEntityCount: 0,
      contradictionCount: 3,
      hasBatnaSignal: false,
      hasMoveSequenceSignal: false,
    })

    expect(summary.score).toBeLessThan(0.6)
    expect(summary.checks.some((check) => check.status === 'fail')).toBe(true)
  })
})

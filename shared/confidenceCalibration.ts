/**
 * Confidence Calibration — ProphetHacks-inspired learnings-based calibration.
 *
 * Uses the forecast_learnings table to fit per-segment isotonic calibration
 * and blend with market prior for final probability.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 * Pattern: CodexProphet's confidence calibration with learnings
 */

import {
  fitIsotonicCalibration,
  applyCalibrationModel,
  type CalibrationModelRecord,
  type CalibrationEnvelope,
  type CalibrationStatus,
} from './mlAdvisory.ts'

export interface LearningRecord {
  id: string
  intent: string
  skill_category: string
  predicted_probability: number
  actual_outcome: number | null
  brier_score: number | null
  evidence_gate_decision: string | null
  market_prior: number | null
  created_at: string
  resolved_at: string | null
}

export interface CalibrationWithLearningsResult {
  calibratedProbability: number
  rawProbability: number
  sampleSize: number
  brierScore: number | null
  calibrationStatus: CalibrationStatus
  method: string
}

export interface CalibrationConfidenceAssessment {
  sampleSize: number
  brierScore: number | null
  reliability: 'high' | 'moderate' | 'low'
}

const MINIMUM_SAMPLE_SIZE = 25

function clampProb(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.min(0.99, Math.max(0.01, value))
}

/**
 * Convert learning records to calibration points (only resolved learnings).
 */
function learningsToCalibrationPoints(learnings: LearningRecord[]) {
  return learnings
    .filter((l) => l.actual_outcome !== null && l.resolved_at !== null)
    .map((l) => ({
      probability: clampProb(l.predicted_probability),
      outcome: Number(l.actual_outcome),
    }))
}

/**
 * Compute mean Brier score from resolved learnings.
 * Brier score = (predicted - actual)^2
 */
function computeBrierScore(learnings: LearningRecord[]): number | null {
  const resolved = learnings.filter((l) => l.actual_outcome !== null && l.resolved_at !== null)
  if (resolved.length === 0) return null
  const sum = resolved.reduce((acc, l) => {
    const diff = clampProb(l.predicted_probability) - Number(l.actual_outcome)
    return acc + diff * diff
  }, 0)
  return sum / resolved.length
}

/**
 * Fit isotonic calibration from learnings and apply to a raw probability.
 * Falls back to 'missing_model' when insufficient resolved learnings.
 */
export function calibrateWithLearnings(
  rawProb: number,
  learnings: LearningRecord[],
  segmentKey = 'multi_agent_binary',
): CalibrationWithLearningsResult {
  const points = learningsToCalibrationPoints(learnings)
  const brierScore = computeBrierScore(learnings)

  if (points.length < MINIMUM_SAMPLE_SIZE) {
    return {
      calibratedProbability: clampProb(rawProb),
      rawProbability: rawProb,
      sampleSize: points.length,
      brierScore,
      calibrationStatus: 'missing_model',
      method: 'insufficient_learnings',
    }
  }

  const model: CalibrationModelRecord = fitIsotonicCalibration(
    points.map((p) => ({ probability: p.probability, outcome: p.outcome })),
    segmentKey as any,
    MINIMUM_SAMPLE_SIZE,
  )

  const envelope: CalibrationEnvelope = applyCalibrationModel(rawProb, model)

  return {
    calibratedProbability: envelope.calibratedProbability,
    rawProbability: rawProb,
    sampleSize: points.length,
    brierScore,
    calibrationStatus: envelope.calibrationStatus,
    method: model.method,
  }
}

/**
 * Blend a calibrated probability with a market prior.
 * Default: 25% market weight when calibration is empirical, 15% when prior_smoothed.
 */
export function blendCalibratedWithMarket(
  calibratedProb: number,
  marketProb: number | null,
  marketWeight?: number,
): number {
  if (marketProb === null || !Number.isFinite(marketProb)) {
    return clampProb(calibratedProb)
  }
  const w = marketWeight ?? 0.25
  return clampProb(calibratedProb * (1 - w) + clampProb(marketProb) * w)
}

/**
 * Assess calibration confidence from learnings data.
 */
export function assessCalibrationConfidence(
  learnings: LearningRecord[],
): CalibrationConfidenceAssessment {
  const resolved = learnings.filter((l) => l.actual_outcome !== null && l.resolved_at !== null)
  const sampleSize = resolved.length
  const brierScore = computeBrierScore(learnings)

  let reliability: 'high' | 'moderate' | 'low' = 'low'
  if (sampleSize >= 50 && brierScore !== null && brierScore < 0.25) {
    reliability = 'high'
  } else if (sampleSize >= 25 && brierScore !== null && brierScore < 0.33) {
    reliability = 'moderate'
  }

  return { sampleSize, brierScore, reliability }
}

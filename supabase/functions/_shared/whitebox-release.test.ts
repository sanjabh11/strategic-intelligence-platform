import { describe, expect, it } from 'vitest'
import {
  buildConsensusPresentation,
  buildReleaseEvaluation,
  buildWhiteboxEvaluations,
  DEFAULT_CONSENSUS_POLICY,
} from './whitebox-release.ts'

describe('whitebox release helper', () => {
it('promotes the configured policy into champion position', () => {
  const projected = buildConsensusPresentation([
    { id: 'role_weighted', label: 'Role-Weighted Champion', probability: 0.64, confidence: 0.7, method: 'role-weighted consensus' },
    { id: 'equal_weight', label: 'Equal-Weight Challenger', probability: 0.58, confidence: 0.68, method: 'simple mean' },
    { id: 'trimmed_mean', label: 'Trimmed-Mean Challenger', probability: 0.6, confidence: 0.69, method: 'drop extreme agent view' },
    { id: 'skeptic_adjusted', label: 'Skeptic-Adjusted Challenger', probability: 0.55, confidence: 0.63, method: 'champion minus disagreement penalty' },
  ], 'equal_weight')

  expect(projected.activePolicy).toBe('equal_weight')
  expect(projected.champion.policyId).toBe('equal_weight')
  expect(projected.challengers).toHaveLength(3)
})

it('emits one row per consensus variant', () => {
  const rows = buildWhiteboxEvaluations({
    id: 'forecast-1',
    analysis_run_id: 'run-1',
    resolution_outcome: 'yes',
    resolved_at: '2026-04-29T00:00:00Z',
    game_theory_model: {
      multi_agent_forecast: {
        question: { questionType: 'binary' },
        panel: { disagreementIndex: 0.12 },
        metadata: { evidenceCount: 4 },
        consensus: {
          activePolicy: DEFAULT_CONSENSUS_POLICY,
          champion: {
            policyId: 'role_weighted',
            probability: 0.66,
            confidence: 0.71,
            method: 'role-weighted consensus',
          },
          challengers: [
            { id: 'equal_weight', label: 'Equal-Weight Challenger', probability: 0.62, confidence: 0.68, method: 'simple mean' },
            { id: 'trimmed_mean', label: 'Trimmed-Mean Challenger', probability: 0.61, confidence: 0.69, method: 'drop extreme agent view' },
            { id: 'skeptic_adjusted', label: 'Skeptic-Adjusted Challenger', probability: 0.57, confidence: 0.64, method: 'champion minus disagreement penalty' },
          ],
        },
      },
    },
  })

  expect(rows).toHaveLength(4)
  expect(rows.some((row) => row.is_champion_variant && row.variant_id === 'role_weighted')).toBe(true)
})

it('recommends promotion when challenger beats champion with enough samples', () => {
  const evaluations = []
  for (let i = 0; i < 12; i++) {
    evaluations.push(
      {
        forecast_id: `f-${i}`,
        variant_id: 'role_weighted',
        probability: 0.7,
        outcome: i % 2 === 0 ? 1 : 0,
        brier_score: 0.22,
        is_champion_variant: true,
      },
      {
        forecast_id: `f-${i}`,
        variant_id: 'equal_weight',
        probability: 0.62,
        outcome: i % 2 === 0 ? 1 : 0,
        brier_score: 0.14,
        is_champion_variant: false,
      },
      {
        forecast_id: `f-${i}`,
        variant_id: 'trimmed_mean',
        probability: 0.68,
        outcome: i % 2 === 0 ? 1 : 0,
        brier_score: 0.2,
        is_champion_variant: false,
      },
      {
        forecast_id: `f-${i}`,
        variant_id: 'skeptic_adjusted',
        probability: 0.54,
        outcome: i % 2 === 0 ? 1 : 0,
        brier_score: 0.18,
        is_champion_variant: false,
      },
    )
  }

  const summary = buildReleaseEvaluation(evaluations, {
    active_policy: 'role_weighted',
    minimum_sample_size: 12,
    promotion_margin: 0.01,
  })

  expect(summary.recommendation.action).toBe('promote')
  expect(summary.recommendation.candidatePolicy).toBe('equal_weight')
})
})

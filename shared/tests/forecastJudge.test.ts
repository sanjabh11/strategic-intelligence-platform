/**
 * Tests for forecastJudge.ts — AgentHarness-inspired LLM-as-judge verification.
 *
 * Tests cover:
 * - Judge config retrieval and family mapping
 * - Judge prompt construction
 * - Judge response parsing (valid, invalid, edge cases)
 * - Judge adjustment application
 * - Verdict assessment and severity classification
 */

import { describe, it, expect } from 'vitest'
import {
  getJudgeConfig,
  mapIntentToJudgeFamily,
  buildJudgePrompt,
  parseJudgeResponse,
  applyJudgeAdjustment,
  assessJudgeVerdict,
  type JudgeInput,
  type JudgeResult,
} from '../forecastJudge'

describe('forecastJudge', () => {
  describe('getJudgeConfig', () => {
    it('returns geopolitical config for geopolitical family', () => {
      const config = getJudgeConfig('geopolitical')
      expect(config.family).toBe('geopolitical')
      expect(config.label).toBe('Geopolitical Judge')
      expect(config.systemPrompt).toContain('geopolitical')
      expect(config.verificationCriteria.length).toBeGreaterThan(0)
      expect(config.maxDisagreement).toBeGreaterThan(0)
      expect(config.weight).toBeGreaterThan(0)
    })

    it('returns general config as fallback for unknown family', () => {
      const config = getJudgeConfig('nonexistent' as any)
      expect(config.family).toBe('general')
    })

    it('returns all family configs with valid prompts', () => {
      const families = ['geopolitical', 'economic', 'conflict', 'trade', 'technology', 'general'] as const
      for (const family of families) {
        const config = getJudgeConfig(family)
        expect(config.family).toBe(family)
        expect(config.systemPrompt.length).toBeGreaterThan(50)
        expect(config.verificationCriteria.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('mapIntentToJudgeFamily', () => {
    it('maps geopolitical intent', () => {
      expect(mapIntentToJudgeFamily('geopolitical_sanctions')).toBe('geopolitical')
      expect(mapIntentToJudgeFamily('alliance_shift')).toBe('geopolitical')
    })

    it('maps conflict intent', () => {
      expect(mapIntentToJudgeFamily('military_conflict')).toBe('conflict')
      expect(mapIntentToJudgeFamily('ceasefire_likelihood')).toBe('conflict')
    })

    it('maps trade intent', () => {
      expect(mapIntentToJudgeFamily('trade_tariff')).toBe('trade')
      expect(mapIntentToJudgeFamily('export_control')).toBe('trade')
    })

    it('maps economic intent', () => {
      expect(mapIntentToJudgeFamily('economic_recession')).toBe('economic')
      expect(mapIntentToJudgeFamily('market_crash')).toBe('economic')
    })

    it('maps technology intent', () => {
      expect(mapIntentToJudgeFamily('ai_regulation')).toBe('technology')
      expect(mapIntentToJudgeFamily('tech_standard')).toBe('technology')
    })

    it('falls back to general for unknown intent', () => {
      expect(mapIntentToJudgeFamily('unknown_topic')).toBe('general')
      expect(mapIntentToJudgeFamily('')).toBe('general')
    })
  })

  describe('buildJudgePrompt', () => {
    const baseInput: JudgeInput = {
      question: 'Will sanctions be lifted by Q3 2025?',
      championProbability: 0.65,
      championThesis: 'Economic pressure is mounting and both sides have incentive to negotiate.',
      agentTheses: [
        { label: 'Geopolitics Agent', probability: 0.70, thesis: 'Diplomatic backchannels are active.' },
        { label: 'Economic Agent', probability: 0.60, thesis: 'Economic costs are unsustainable.' },
      ],
      evidenceSummary: 'Treasury report shows 40% GDP decline; diplomatic meetings scheduled.',
      evidenceCount: 5,
      distinctProviderCount: 3,
      disagreementIndex: 0.12,
      skepticProbability: 0.55,
      marketPriorProbability: 0.58,
      family: 'geopolitical',
    }

    it('builds a prompt containing the question', () => {
      const prompt = buildJudgePrompt(baseInput)
      expect(prompt).toContain('Will sanctions be lifted by Q3 2025?')
    })

    it('includes champion probability in prompt', () => {
      const prompt = buildJudgePrompt(baseInput)
      expect(prompt).toContain('65.0%')
    })

    it('includes agent theses in prompt', () => {
      const prompt = buildJudgePrompt(baseInput)
      expect(prompt).toContain('Geopolitics Agent')
      expect(prompt).toContain('70.0%')
    })

    it('includes market prior when available', () => {
      const prompt = buildJudgePrompt(baseInput)
      expect(prompt).toContain('58.0%')
    })

    it('handles null market prior', () => {
      const input = { ...baseInput, marketPriorProbability: null }
      const prompt = buildJudgePrompt(input)
      expect(prompt).toContain('N/A')
    })
  })

  describe('parseJudgeResponse', () => {
    it('parses a valid judge response', () => {
      const raw = JSON.stringify({
        verified_probability: 0.62,
        judge_confidence: 0.75,
        disagreement_with_champion: 0.03,
        judge_reasoning: 'The champion probability is slightly overconfident given evidence gaps.',
        verdict: 'adjusted_down',
        concerns: ['Insufficient primary sources', 'Recency bias detected'],
      })
      const result = parseJudgeResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.verifiedProbability).toBeCloseTo(0.62)
      expect(result!.judgeConfidence).toBeCloseTo(0.75)
      expect(result!.verdict).toBe('adjusted_down')
      expect(result!.concerns).toHaveLength(2)
      expect(result!.concerns[0]).toBe('Insufficient primary sources')
    })

    it('parses response with markdown code fences', () => {
      const raw = '```json\n{"verified_probability": 0.55, "judge_confidence": 0.8, "verdict": "confirmed", "judge_reasoning": "OK", "concerns": []}\n```'
      const result = parseJudgeResponse(raw)
      expect(result).not.toBeNull()
      expect(result!.verifiedProbability).toBeCloseTo(0.55)
      expect(result!.verdict).toBe('confirmed')
    })

    it('returns null for invalid JSON', () => {
      expect(parseJudgeResponse('not json')).toBeNull()
      expect(parseJudgeResponse('')).toBeNull()
    })

    it('returns null for missing verified_probability', () => {
      const raw = JSON.stringify({ judge_confidence: 0.8, verdict: 'confirmed' })
      expect(parseJudgeResponse(raw)).toBeNull()
    })

    it('clamps verified_probability to [0.01, 0.99]', () => {
      const raw = JSON.stringify({ verified_probability: 1.5, judge_confidence: 0.8, verdict: 'confirmed' })
      const result = parseJudgeResponse(raw)
      expect(result!.verifiedProbability).toBeLessThanOrEqual(0.99)
    })

    it('clamps judge_confidence to [0.1, 0.95]', () => {
      const raw = JSON.stringify({ verified_probability: 0.5, judge_confidence: 5.0, verdict: 'confirmed' })
      const result = parseJudgeResponse(raw)
      expect(result!.judgeConfidence).toBeLessThanOrEqual(0.95)
    })

    it('defaults verdict to confirmed for unknown value', () => {
      const raw = JSON.stringify({ verified_probability: 0.5, judge_confidence: 0.8, verdict: 'banana' })
      const result = parseJudgeResponse(raw)
      expect(result!.verdict).toBe('confirmed')
    })

    it('filters non-string concerns', () => {
      const raw = JSON.stringify({
        verified_probability: 0.5,
        judge_confidence: 0.8,
        verdict: 'confirmed',
        concerns: ['valid', 42, null, 'also valid'],
      })
      const result = parseJudgeResponse(raw)
      expect(result!.concerns).toEqual(['valid', 'also valid'])
    })
  })

  describe('applyJudgeAdjustment', () => {
    it('blends champion with judge probability', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.70,
        judgeConfidence: 0.8,
        disagreementWithChampion: 0.10,
        judgeReasoning: 'Slightly higher.',
        verdict: 'adjusted_up',
        concerns: [],
        family: 'geopolitical',
      }
      const result = applyJudgeAdjustment(0.60, judgeResult, 0.20)
      expect(result.adjustedProbability).toBeCloseTo(0.62, 1)
      expect(result.judgeDelta).toBeCloseTo(0.02, 1)
    })

    it('clamps result to [0.01, 0.99]', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.99,
        judgeConfidence: 0.9,
        disagreementWithChampion: 0.09,
        judgeReasoning: '',
        verdict: 'adjusted_up',
        concerns: [],
        family: 'general',
      }
      const result = applyJudgeAdjustment(0.98, judgeResult, 0.50)
      expect(result.adjustedProbability).toBeLessThanOrEqual(0.99)
    })

    it('uses default weight when not specified', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.80,
        judgeConfidence: 0.8,
        disagreementWithChampion: 0.20,
        judgeReasoning: '',
        verdict: 'adjusted_up',
        concerns: [],
        family: 'general',
      }
      const result = applyJudgeAdjustment(0.60, judgeResult)
      expect(result.adjustedProbability).toBeGreaterThan(0.60)
    })
  })

  describe('assessJudgeVerdict', () => {
    it('returns critical for rejected verdict', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.30,
        judgeConfidence: 0.85,
        disagreementWithChampion: 0.40,
        judgeReasoning: 'Champion is severely overconfident.',
        verdict: 'rejected',
        concerns: ['Major evidence gap'],
        family: 'geopolitical',
      }
      const config = getJudgeConfig('geopolitical')
      const assessment = assessJudgeVerdict(judgeResult, config)
      expect(assessment.shouldAdjust).toBe(true)
      expect(assessment.severity).toBe('critical')
    })

    it('returns major when disagreement exceeds maxDisagreement', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.40,
        judgeConfidence: 0.75,
        disagreementWithChampion: 0.25,
        judgeReasoning: 'Significant overconfidence.',
        verdict: 'adjusted_down',
        concerns: [],
        family: 'geopolitical',
      }
      const config = getJudgeConfig('geopolitical')
      const assessment = assessJudgeVerdict(judgeResult, config)
      expect(assessment.shouldAdjust).toBe(true)
      expect(assessment.severity).toBe('major')
    })

    it('returns critical when disagreement exceeds 2x maxDisagreement', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.20,
        judgeConfidence: 0.85,
        disagreementWithChampion: 0.50,
        judgeReasoning: 'Severe mismatch.',
        verdict: 'adjusted_down',
        concerns: [],
        family: 'geopolitical',
      }
      const config = getJudgeConfig('geopolitical')
      const assessment = assessJudgeVerdict(judgeResult, config)
      expect(assessment.severity).toBe('critical')
    })

    it('returns none for confirmed verdict with small disagreement', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.63,
        judgeConfidence: 0.80,
        disagreementWithChampion: 0.02,
        judgeReasoning: 'Champion is well-calibrated.',
        verdict: 'confirmed',
        concerns: [],
        family: 'geopolitical',
      }
      const config = getJudgeConfig('geopolitical')
      const assessment = assessJudgeVerdict(judgeResult, config)
      expect(assessment.shouldAdjust).toBe(false)
      expect(assessment.severity).toBe('none')
    })

    it('returns minor for adjusted verdict with moderate disagreement', () => {
      const judgeResult: JudgeResult = {
        verifiedProbability: 0.68,
        judgeConfidence: 0.75,
        disagreementWithChampion: 0.04,
        judgeReasoning: 'Minor adjustment needed.',
        verdict: 'adjusted_up',
        concerns: [],
        family: 'geopolitical',
      }
      const config = getJudgeConfig('geopolitical')
      const assessment = assessJudgeVerdict(judgeResult, config)
      expect(assessment.shouldAdjust).toBe(true)
      expect(assessment.severity).toBe('minor')
    })
  })
})

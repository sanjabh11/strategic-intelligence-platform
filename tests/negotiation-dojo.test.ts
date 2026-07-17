import { describe, expect, it } from 'vitest'
import {
  NEGOTIATION_SCENARIOS,
  buildNegotiationAiResponse,
  buildNegotiationDebriefText,
  calculateNegotiationResult,
  parseNegotiationMessage
} from '../src/lib/negotiationDojo'

describe('negotiation dojo helpers', () => {
  it('keeps exactly six business-first scenarios with the intended buyer-story mix', () => {
    expect(NEGOTIATION_SCENARIOS).toHaveLength(6)
    expect(NEGOTIATION_SCENARIOS.filter((entry) => entry.buyerStory === 'procurement')).toHaveLength(4)
    expect(NEGOTIATION_SCENARIOS.filter((entry) => entry.buyerStory === 'enterprise_software')).toHaveLength(2)
  })

  it('captures BATNA and non-price tradeables from user messages', () => {
    const scenario = NEGOTIATION_SCENARIOS[0]
    const analysis = parseNegotiationMessage(
      'We can do $101,000 if you include annual prepay, onboarding support, and a 24 month term. We have another vendor if this stalls.',
      scenario
    )

    expect(analysis.priceOffer).toBe(101000)
    expect(analysis.usesBatna).toBe(true)
    expect(analysis.tradeSignals.contract_length).toContain('24-month')
    expect(analysis.tradeSignals.onboarding_support).toBeTruthy()
    expect(analysis.tradeSignals.payment_timing).toBeTruthy()
  })

  it('rewards reciprocal leverage better than one-sided concessions', () => {
    const scenario = NEGOTIATION_SCENARIOS[2]
    const openingTurn = { role: 'ai' as const, message: 'Opening position', offer: scenario.openingPrice }

    const disciplinedUser = {
      role: 'user' as const,
      message: 'Our budget cap is $102,500 and we can share a quarterly forecast if you move there.',
      offer: 102500,
      analysis: parseNegotiationMessage('Our budget cap is $102,500 and we can share a quarterly forecast if you move there.', scenario)
    }
    const disciplinedResponse = buildNegotiationAiResponse(disciplinedUser, [openingTurn, disciplinedUser], scenario, scenario.openingPrice)
    const disciplinedHistory = [openingTurn, disciplinedUser, { role: 'ai' as const, message: disciplinedResponse.message, offer: disciplinedResponse.offer ?? undefined, termChanges: disciplinedResponse.termChanges }]
    const disciplinedResult = calculateNegotiationResult(scenario, disciplinedHistory, disciplinedResponse)

    const weakUser = {
      role: 'user' as const,
      message: 'We can probably stretch to $105,500 with no other asks.',
      offer: 105500,
      analysis: parseNegotiationMessage('We can probably stretch to $105,500 with no other asks.', scenario)
    }
    const weakResponse = buildNegotiationAiResponse(weakUser, [openingTurn, weakUser], scenario, scenario.openingPrice)
    const weakHistory = [openingTurn, weakUser, { role: 'ai' as const, message: weakResponse.message, offer: weakResponse.offer ?? undefined, termChanges: weakResponse.termChanges }]
    const weakResult = calculateNegotiationResult(scenario, weakHistory, weakResponse)

    expect(disciplinedResult.coaching_rubric.tradeoff_management.score).toBeGreaterThanOrEqual(weakResult.coaching_rubric.tradeoff_management.score)
    expect(disciplinedResult.batna_assessment).toContain('credible alternative')
  })

  it('always returns the structured debrief contract, including manager summary', () => {
    const scenario = NEGOTIATION_SCENARIOS[1]
    const openingTurn = { role: 'ai' as const, message: 'Opening position', offer: scenario.openingPrice }
    const userTurn = {
      role: 'user' as const,
      message: 'No deal. We have another vendor route if this cannot move.',
      analysis: parseNegotiationMessage('No deal. We have another vendor route if this cannot move.', scenario)
    }
    const response = buildNegotiationAiResponse(userTurn, [openingTurn, userTurn], scenario, scenario.openingPrice)
    const history = [openingTurn, userTurn, { role: 'ai' as const, message: response.message, offer: response.offer ?? undefined, termChanges: response.termChanges }]
    const result = calculateNegotiationResult(scenario, history, response)
    const debrief = buildNegotiationDebriefText(scenario, result)

    expect(result.manager_summary.length).toBeGreaterThan(40)
    expect(result.batna_assessment).toBeTruthy()
    expect(result.concession_pattern).toBeTruthy()
    expect(result.zopa_capture).toBeTruthy()
    expect(result.missed_value).toBeTruthy()
    expect(debrief).toContain('Manager summary:')
  })
})

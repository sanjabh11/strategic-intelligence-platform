import { describe, expect, it } from 'vitest'
import {
  buildCommodityResponsePlaybook,
  buildDoctrinePromptPack,
  buildSequentialConsoleScenarioText,
  buildSequentialGameStudioReport,
  classifyStrategicScenario,
  getSequentialGameTemplateById
} from '../shared/gameTheoryKnowledge'

describe('game theory knowledge base', () => {
  it('routes procurement renewal scenarios to bargaining doctrine instead of generic game theory', () => {
    const classification = classifyStrategicScenario(
      'A procurement lead is pushing back on a vendor renewal price increase while preserving migration leverage.'
    )

    expect(classification.game_family).toBe('sequential_bargaining')
    expect(classification.doctrine_ids).toContain('sequential_bargaining')
    expect(classification.template_id).toBeTruthy()
  })

  it('keeps supplier renewal scenarios in bargaining doctrine even when incumbent and migration cues are present', () => {
    const classification = classifyStrategicScenario(
      'Our incumbent supplier opened with a 14% increase. We have one weaker alternate supplier, can trade term length for price relief, and need to preserve continuity during migration.'
    )

    expect(classification.game_family).toBe('sequential_bargaining')
    expect(classification.template_id).not.toBe('entry-deterrence-retaliatory-sequence')
    expect(classification.doctrine_ids).toContain('sequential_bargaining')
  })

  it('routes entry-deterrence scenarios to extensive-form SPE doctrine', () => {
    const classification = classifyStrategicScenario(
      'An entrant is considering market entry while the incumbent threatens to fight and retaliate on price.'
    )

    expect(classification.game_family).toBe('extensive_form')
    expect(classification.doctrine_ids).toContain('extensive_form_spe')
  })

  it('routes signaling-heavy geopolitical scenarios to signaling and deterrence doctrine', () => {
    const classification = classifyStrategicScenario(
      'A sanctions threat is being used to deter escalation while states signal resolve and test each others credibility.'
    )

    expect(classification.game_family).toBe('signaling_deterrence')
    expect(classification.information_structure).toBe('signaling-heavy')
  })

  it('routes alliance and parliament scenarios to coalitional doctrine', () => {
    const classification = classifyStrategicScenario(
      'Three parliamentary blocs must decide whether to form a governing coalition, and each subset can pass legislation only with binding side deals.'
    )

    expect(classification.game_family).toBe('coalitional_cooperative')
    expect(classification.doctrine_ids).toContain('coalitional_shapley')
  })

  it('routes private-type bluffing scenarios to perfect Bayesian signaling', () => {
    const classification = classifyStrategicScenario(
      'A startup with a hidden cash runway sends a pricing signal to investors, who must update beliefs about whether the company is strong or weak.'
    )

    expect(classification.information_structure).toBe('asymmetric_bayesian')
    expect(classification.doctrine_ids).toContain('perfect_bayesian_signaling')
  })

  it('routes population-adoption scenarios to evolutionary doctrine', () => {
    const classification = classifyStrategicScenario(
      'A large population of consumers repeatedly chooses between premium and discount plans, and the market share evolves as successful strategies spread.'
    )

    expect(classification.game_family).toBe('evolutionary_population')
    expect(classification.doctrine_ids).toContain('evolutionary_replicator')
  })

  it('routes noisy human-play scenarios to bounded rationality', () => {
    const classification = classifyStrategicScenario(
      'Human negotiators keep making predictable mistakes and only respond approximately optimally because of limited computation and quantal response noise.'
    )

    expect(classification.game_family).toBe('bounded_rationality')
    expect(classification.doctrine_ids).toContain('bounded_rationality')
  })

  it('builds a doctrine prompt pack with explicit guardrails and output requirements', () => {
    const pack = buildDoctrinePromptPack({
      scenarioText: 'A supplier announced a 12% annual price increase and the buyer can move part of the volume elsewhere.',
      evidenceIds: ['market_gold', 'provider_mode']
    })

    expect(pack.required_output_sections).toContain('claim-to-evidence mapping')
    expect(pack.prohibitions.some((line) => line.includes('game family'))).toBe(true)
  })

  it('injects coalition-specific and Bayesian-specific solver instructions into the doctrine pack', () => {
    const coalitionPack = buildDoctrinePromptPack({
      scenarioText: 'Three parties are bargaining over a governing coalition and must split cabinet positions fairly.'
    })
    const signalingPack = buildDoctrinePromptPack({
      scenarioText: 'A sender with private information chooses a message, and a receiver updates beliefs before accepting or rejecting.'
    })

    expect(coalitionPack.guidance.some((line) => line.includes('coalition_values'))).toBe(true)
    expect(signalingPack.guidance.some((line) => line.includes('prior_probs'))).toBe(true)
  })

  it('builds a commodity response playbook that separates leverage, tradeables, and triggers', () => {
    const workspace = buildCommodityResponsePlaybook({
      scenarioId: 'constrained-supply-allocation',
      providerMode: 'live',
      marketAssets: [
        { asset: 'gold', price: 3025, change_24h: 2.8, unit: 'oz', currency: 'USD' },
        { asset: 'oil', price: 79, change_24h: 1.4, unit: 'bbl', currency: 'USD' }
      ]
    })

    expect(workspace.playbook.volatility_driver_summary).toContain('gold')
    expect(workspace.playbook.supplier_leverage_map).toHaveLength(3)
    expect(workspace.playbook.buyer_tradeables).toContain('payment timing')
    expect(workspace.playbook.trigger_watchlist.length).toBeGreaterThanOrEqual(4)
  })

  it('builds a sequential studio report and console handoff text from the selected template', () => {
    const template = getSequentialGameTemplateById('entry-deterrence-tree')
    expect(template).toBeTruthy()

    const report = buildSequentialGameStudioReport({
      template: template!,
      equilibrium: {
        strategy: {
          Entrant: { 'Entrant move': 'Enter' },
          Incumbent: { 'Incumbent response': 'Accommodate' }
        },
        expectedPayoffs: [2, 2],
        subgamePerfect: true,
        nashEquilibrium: true
      }
    })
    const scenarioText = buildSequentialConsoleScenarioText({
      template: template!,
      report
    })

    expect(report.backward_induction_assessment).toContain('Backward induction')
    expect(report.human_readable_brief).toContain('Entry deterrence')
    expect(scenarioText).toContain('Credible-threat checks')
  })
})

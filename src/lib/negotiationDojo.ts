export type NegotiationBuyerStory = 'procurement' | 'enterprise_software'
export type NegotiationDifficulty = 'easy' | 'medium' | 'hard'
export type NegotiationTradeKey =
  | 'contract_length'
  | 'volume_commitment'
  | 'onboarding_support'
  | 'payment_timing'
  | 'termination_flexibility'

export interface NegotiationScenario {
  id: string
  title: string
  description: string
  userRole: string
  aiRole: string
  openingPrice: number
  buyerWalkAway: number
  sellerFloor: number
  targetPrice: number
  difficulty: NegotiationDifficulty
  buyerStory: NegotiationBuyerStory
  primaryGoal: string
  tradeables: string[]
  batna: string
  counterpartyLikelyLevers: string[]
  successCriteria: string[]
}

export interface NegotiationSignals {
  priceOffer?: number
  accept: boolean
  walkAway: boolean
  usesBatna: boolean
  usesObjectiveData: boolean
  asksQuestion: boolean
  tradeSignals: Partial<Record<NegotiationTradeKey, string>>
}

export interface NegotiationTurnRecord {
  role: 'user' | 'ai'
  message: string
  offer?: number
  analysis?: NegotiationSignals
  termChanges?: string[]
}

export interface NegotiationAiResponse {
  message: string
  offer: number | null
  isDeal: boolean
  isNoDeal: boolean
  termChanges: string[]
}

export interface CoachingDimension {
  score: 1 | 2 | 3 | 4 | 5
  rationale: string
}

export interface NegotiationResult {
  outcome: 'deal' | 'no_deal' | 'ongoing'
  finalPrice?: number
  overallRating: 'excellent' | 'good' | 'fair' | 'poor'
  valueCapturedPercent: number
  priceLeakage: number
  batna_assessment: string
  concession_pattern: string
  zopa_capture: string
  missed_value: string
  coaching_rubric: {
    preparation: CoachingDimension
    anchoring: CoachingDimension
    information_discovery: CoachingDimension
    tradeoff_management: CoachingDimension
    closing: CoachingDimension
  }
  manager_summary: string
}

export const NEGOTIATION_SCENARIOS: NegotiationScenario[] = [
  {
    id: 'saas-renewal-budget-pressure',
    title: 'Enterprise SaaS Renewal Under Budget Pressure',
    description: 'Your team must renew a platform contract, but finance cut the budget. You need a lower annual commit plus better renewal flexibility.',
    userRole: 'Procurement Lead',
    aiRole: 'Account Executive',
    openingPrice: 125000,
    buyerWalkAway: 112000,
    sellerFloor: 98000,
    targetPrice: 101000,
    difficulty: 'hard',
    buyerStory: 'enterprise_software',
    primaryGoal: 'Reduce annual spend without losing core functionality or renewal flexibility.',
    tradeables: ['Multi-year term', 'Reference call', 'Annual prepay', 'Renewal notice flexibility'],
    batna: 'Two smaller vendors can cover 80% of requirements with a slower migration path.',
    counterpartyLikelyLevers: ['Quarter-end pressure', 'Bundle discounting', 'Switching cost concerns'],
    successCriteria: ['Final price near 101000', 'Better renewal terms', 'Support continuity preserved']
  },
  {
    id: 'software-procurement-100-seat',
    title: 'New 100-Seat Software Procurement',
    description: 'You are buying 100 seats of a new SaaS tool. The vendor is pushing list pricing, but you can trade contract length and rollout speed.',
    userRole: 'Strategic Sourcing Manager',
    aiRole: 'Sales Representative',
    openingPrice: 60000,
    buyerWalkAway: 52000,
    sellerFloor: 47000,
    targetPrice: 48500,
    difficulty: 'medium',
    buyerStory: 'enterprise_software',
    primaryGoal: 'Win a meaningful discount while trading non-price terms selectively.',
    tradeables: ['Annual term', 'Phased rollout', 'Customer logo approval', 'Centralized billing'],
    batna: 'A competing tool is feature-light but materially cheaper and can be deployed faster.',
    counterpartyLikelyLevers: ['Implementation urgency', 'Feature differentiation', 'Discount tied to annual commit'],
    successCriteria: ['Final price under 50000', 'Onboarding included', 'Payment terms improved']
  },
  {
    id: 'vendor-price-increase-pushback',
    title: 'Vendor Annual Price Increase Pushback',
    description: 'A critical supplier announced a 12% price increase. You need to contain the increase and trade for service or volume commitments only if necessary.',
    userRole: 'Procurement Category Manager',
    aiRole: 'Vendor Account Manager',
    openingPrice: 112000,
    buyerWalkAway: 106000,
    sellerFloor: 101500,
    targetPrice: 102500,
    difficulty: 'medium',
    buyerStory: 'procurement',
    primaryGoal: 'Limit the increase and avoid giving away terms for free.',
    tradeables: ['Volume forecast visibility', 'Longer ordering horizon', 'Quarterly payment cadence', 'Service-level review'],
    batna: 'You can shift 35% of volume to a secondary supplier within 90 days.',
    counterpartyLikelyLevers: ['Inflation narrative', 'Capacity constraints', 'Incumbent service performance'],
    successCriteria: ['Increase capped below 5%', 'No major loss of flexibility', 'Service credits preserved']
  },
  {
    id: 'implementation-services-scope-rate',
    title: 'Implementation Services Scope and Rate Negotiation',
    description: 'A consulting vendor is quoting premium implementation rates. You need to narrow scope, secure training support, and avoid runaway change-order risk.',
    userRole: 'Transformation Program Manager',
    aiRole: 'Implementation Director',
    openingPrice: 180000,
    buyerWalkAway: 160000,
    sellerFloor: 146000,
    targetPrice: 149000,
    difficulty: 'hard',
    buyerStory: 'procurement',
    primaryGoal: 'Reduce scope cost while protecting training and implementation quality.',
    tradeables: ['Reduced custom scope', 'Named resources', 'Training hours', 'Milestone payment schedule'],
    batna: 'An internal delivery partner can absorb phase two if the vendor will not narrow scope.',
    counterpartyLikelyLevers: ['Resource scarcity', 'Timeline urgency', 'Scope creep risk'],
    successCriteria: ['Lower initial phase cost', 'Training retained', 'Payment milestones tied to deliverables']
  },
  {
    id: 'strategic-sourcing-constrained-supply',
    title: 'Strategic Sourcing in a Constrained Supply Market',
    description: 'Supply is tight and the supplier knows it. You need to secure allocation while negotiating lead times, payment terms, and service-level commitments.',
    userRole: 'Head of Strategic Sourcing',
    aiRole: 'Supplier Commercial Lead',
    openingPrice: 245000,
    buyerWalkAway: 228000,
    sellerFloor: 218000,
    targetPrice: 220000,
    difficulty: 'hard',
    buyerStory: 'procurement',
    primaryGoal: 'Protect allocation and timing while containing price escalation.',
    tradeables: ['Allocation commitment', 'Forecast transparency', 'Deposit timing', 'Expedited shipping rights'],
    batna: 'Secondary suppliers cover only half your demand and carry worse lead times.',
    counterpartyLikelyLevers: ['Scarcity premium', 'Priority allocation', 'Deposit pressure'],
    successCriteria: ['Allocation secured', 'Price near 220000', 'Lead-time rights documented']
  },
  {
    id: 'vendor-consolidation-migration',
    title: 'Vendor Consolidation and Migration Leverage',
    description: 'You are consolidating vendors and can move spend to a preferred provider. Use that leverage to push for price, exit flexibility, and transition support.',
    userRole: 'Vendor Management Director',
    aiRole: 'Regional Sales Director',
    openingPrice: 98000,
    buyerWalkAway: 90000,
    sellerFloor: 83500,
    targetPrice: 85000,
    difficulty: 'medium',
    buyerStory: 'procurement',
    primaryGoal: 'Use consolidation leverage to improve pricing and migration terms simultaneously.',
    tradeables: ['Multi-site rollout', 'Case study approval', 'Migration schedule flexibility', 'Termination clause'],
    batna: 'A preferred vendor is prepared to absorb the workload if terms are not improved.',
    counterpartyLikelyLevers: ['Incumbency', 'Migration risk', 'Discount tied to exclusivity'],
    successCriteria: ['Price under 87000', 'Migration support included', 'Exit clause improved']
  }
]

function clampScore(value: number): 1 | 2 | 3 | 4 | 5 {
  if (value <= 1.5) return 1
  if (value <= 2.5) return 2
  if (value <= 3.5) return 3
  if (value <= 4.5) return 4
  return 5
}

export function parseNegotiationMessage(message: string, scenario: NegotiationScenario): NegotiationSignals {
  const lower = message.toLowerCase()

  const offerPatterns = [/\$([0-9,]+)/, /([0-9,]+)\s*dollars?/i, /([0-9,]+)\s*k\b/i]
  let priceOffer: number | undefined

  for (const pattern of offerPatterns) {
    const match = lower.match(pattern)
    if (!match) continue
    let amount = Number(match[1].replace(/,/g, ''))
    if (pattern.source.includes('\\s*k')) amount *= 1000
    if (amount > 0 && amount < scenario.openingPrice * 1.5) {
      priceOffer = amount
      break
    }
  }

  const tradeSignals: Partial<Record<NegotiationTradeKey, string>> = {}

  const contractLengthMatch = lower.match(/(\d+)\s*(month|months|year|years)/)
  if (contractLengthMatch) {
    const rawValue = Number(contractLengthMatch[1])
    const normalizedMonths = contractLengthMatch[2].startsWith('year') ? rawValue * 12 : rawValue
    tradeSignals.contract_length = `${normalizedMonths}-month term`
  }

  if (/(seat|seats|license|licenses|users|volume|units)/.test(lower)) {
    const volumeMatch = lower.match(/(\d+)\s*(seat|seats|license|licenses|users|units)/)
    tradeSignals.volume_commitment = volumeMatch ? `${volumeMatch[1]} ${volumeMatch[2]}` : 'Volume commitment'
  }

  if (/(onboarding|support|training|implementation)/.test(lower)) {
    tradeSignals.onboarding_support = 'Onboarding/support terms raised'
  }

  if (/(annual prepay|annual payment|upfront|net 30|net30|net 60|net60|quarterly|monthly billing)/.test(lower)) {
    const paymentLabel =
      lower.includes('net 60') || lower.includes('net60') ? 'Net 60 payment timing'
        : lower.includes('net 30') || lower.includes('net30') ? 'Net 30 payment timing'
          : lower.includes('quarterly') ? 'Quarterly payment timing'
            : lower.includes('annual') || lower.includes('upfront') ? 'Annual or upfront payment'
              : 'Payment timing raised'
    tradeSignals.payment_timing = paymentLabel
  }

  if (/(termination|renewal|opt[- ]?out|notice period|exit clause|flexibility)/.test(lower)) {
    tradeSignals.termination_flexibility = 'Termination or renewal flexibility requested'
  }

  return {
    priceOffer,
    accept: /(accept|deal|agreed|works for me|let's do it|move forward)/.test(lower),
    walkAway: /(no deal|walk away|cannot accept|can’t accept|forget it|stop here)/.test(lower),
    usesBatna: /(other vendor|alternative vendor|another vendor|competitor|rfp|migration|switch|secondary supplier|preferred vendor|finance cut|budget cap|walk away)/.test(lower),
    usesObjectiveData: /(benchmark|market|list price|usage data|service level|inflation|budget|analysis|base rate|reference)/.test(lower),
    asksQuestion: message.includes('?'),
    tradeSignals
  }
}

function tradeSignalList(signals: NegotiationSignals) {
  return Object.values(signals.tradeSignals)
}

export function buildNegotiationAiResponse(
  userTurn: NegotiationTurnRecord,
  history: NegotiationTurnRecord[],
  scenario: NegotiationScenario,
  currentOffer: number | null
): NegotiationAiResponse {
  const analysis = userTurn.analysis ?? parseNegotiationMessage(userTurn.message, scenario)
  const turnCount = history.length
  const sellerPosition = currentOffer ?? scenario.openingPrice
  const priceGap = Math.max(0, sellerPosition - scenario.sellerFloor)
  const tradeCount = tradeSignalList(analysis).length
  const leverageBoost = (analysis.usesBatna ? 0.12 : 0) + (analysis.usesObjectiveData ? 0.06 : 0) + (tradeCount * 0.04) + (analysis.asksQuestion ? 0.03 : 0)
  const concessionRate = Math.min(0.42, 0.18 + leverageBoost)
  const nextOffer = Math.round(Math.max(scenario.sellerFloor, sellerPosition - (priceGap * concessionRate)))
  const acceptedTerms = tradeSignalList(analysis).slice(0, 2)

  if (analysis.walkAway) {
    return {
      message: 'Understood. If you need to pause or run a competitive process, we can revisit later.',
      offer: null,
      isDeal: false,
      isNoDeal: true,
      termChanges: []
    }
  }

  if (analysis.accept && sellerPosition) {
    return {
      message: `Agreed. We can close at $${sellerPosition.toLocaleString()} and finalize the commercial package.`,
      offer: sellerPosition,
      isDeal: true,
      isNoDeal: false,
      termChanges: acceptedTerms
    }
  }

  if (analysis.priceOffer !== undefined) {
    const buyerOffer = analysis.priceOffer

    if (buyerOffer >= scenario.sellerFloor && (turnCount > 4 || Math.abs(sellerPosition - buyerOffer) <= Math.max(1500, scenario.openingPrice * 0.03))) {
      const termSuffix = acceptedTerms.length > 0 ? ` If we pair that with ${acceptedTerms.join(' and ')}, I can get this approved.` : ''
      return {
        message: `You are pushing hard, but I can make $${buyerOffer.toLocaleString()} work.${termSuffix}`,
        offer: buyerOffer,
        isDeal: true,
        isNoDeal: false,
        termChanges: acceptedTerms
      }
    }

    if (buyerOffer < scenario.sellerFloor) {
      const termLanguage = acceptedTerms.length > 0
        ? ` If you can commit to ${acceptedTerms.join(' and ')}, I can move to $${nextOffer.toLocaleString()}.`
        : ` The best I can do right now is $${nextOffer.toLocaleString()}.`

      return {
        message: `That number is below what we can approve.${termLanguage}`,
        offer: nextOffer,
        isDeal: false,
        isNoDeal: false,
        termChanges: acceptedTerms
      }
    }

    const counterOffer = Math.max(scenario.sellerFloor, Math.round((buyerOffer + nextOffer) / 2))
    const counterTermLanguage = acceptedTerms.length > 0
      ? ` If we package in ${acceptedTerms.join(' and ')}, I can move to $${counterOffer.toLocaleString()}.`
      : ` I can move to $${counterOffer.toLocaleString()} if we close the remaining gap.`

    return {
      message: `We're closer. ${counterTermLanguage}`,
      offer: counterOffer,
      isDeal: false,
      isNoDeal: false,
      termChanges: acceptedTerms
    }
  }

  const guidance = acceptedTerms.length > 0
    ? `I heard the request around ${acceptedTerms.join(' and ')}. Pair that with a specific commercial number and we can keep moving.`
    : 'Give me a specific commercial position and the trade-offs you want, and I can respond concretely.'

  return {
    message: guidance,
    offer: nextOffer,
    isDeal: false,
    isNoDeal: false,
    termChanges: acceptedTerms
  }
}

function getUserTurns(history: NegotiationTurnRecord[]) {
  return history.filter((turn) => turn.role === 'user')
}

function getAiTurns(history: NegotiationTurnRecord[]) {
  return history.filter((turn) => turn.role === 'ai')
}

function summarizeConcessionPattern(history: NegotiationTurnRecord[]) {
  const userOffers = getUserTurns(history).map((turn) => turn.offer).filter((offer): offer is number => typeof offer === 'number')
  const aiOffers = getAiTurns(history).map((turn) => turn.offer).filter((offer): offer is number => typeof offer === 'number')

  const userConcession = userOffers.length >= 2 ? Math.max(0, userOffers[userOffers.length - 1] - userOffers[0]) : 0
  const aiConcession = aiOffers.length >= 2 ? Math.max(0, aiOffers[0] - aiOffers[aiOffers.length - 1]) : 0

  if (userConcession === 0 && aiConcession > 0) {
    return 'You held your anchor while the counterparty did most of the movement. This is a disciplined pattern when supported by real leverage.'
  }

  if (aiConcession >= userConcession) {
    return 'Your concessions were broadly reciprocal. You traded movement for movement instead of giving away value first.'
  }

  return 'Your concessions became more one-sided than the counterparty response. Tighten your anchor and require a return trade before moving further.'
}

function scoreCoaching(history: NegotiationTurnRecord[], scenario: NegotiationScenario, finalPrice: number | undefined) {
  const userTurns = getUserTurns(history)
  const signals = userTurns.map((turn) => turn.analysis).filter((entry): entry is NegotiationSignals => Boolean(entry))
  const firstOffer = userTurns.find((turn) => typeof turn.offer === 'number')?.offer
  const tradeSignalCount = signals.reduce((sum, entry) => sum + Object.keys(entry.tradeSignals).length, 0)
  const batnaCount = signals.filter((entry) => entry.usesBatna).length
  const dataCount = signals.filter((entry) => entry.usesObjectiveData).length
  const questionCount = signals.filter((entry) => entry.asksQuestion).length

  const preparation = clampScore(2 + (batnaCount > 0 ? 1.5 : 0) + (dataCount > 0 ? 1 : 0))
  const anchoring = clampScore(firstOffer !== undefined ? (firstOffer <= scenario.targetPrice ? 4.8 : firstOffer <= scenario.buyerWalkAway ? 3.4 : 2) : 1.8)
  const informationDiscovery = clampScore(2 + Math.min(2.2, questionCount * 0.8))
  const tradeoffManagement = clampScore(1.8 + Math.min(2.6, tradeSignalCount * 0.7))
  const closing = clampScore(finalPrice !== undefined ? (finalPrice <= scenario.buyerWalkAway ? 4 : 3) : 2.2)

  return {
    preparation: {
      score: preparation,
      rationale: preparation >= 4
        ? 'You used external leverage or objective constraints instead of arguing from preference alone.'
        : 'Bring clearer budget, competitor, or switching-cost evidence into the negotiation earlier.'
    },
    anchoring: {
      score: anchoring,
      rationale: anchoring >= 4
        ? 'Your opening anchor stayed closer to the value you wanted than to the seller’s first position.'
        : 'Your anchor left too much room for the seller to control the reference point.'
    },
    information_discovery: {
      score: informationDiscovery,
      rationale: informationDiscovery >= 4
        ? 'You probed for terms and constraints instead of negotiating only on price.'
        : 'Ask more diagnostic questions before conceding. Discover pressure points first.'
    },
    tradeoff_management: {
      score: tradeoffManagement,
      rationale: tradeoffManagement >= 4
        ? 'You used non-price tradeables to create movement without donating value.'
        : 'You relied too heavily on price. Bring payment timing, support, or renewal terms into play.'
    },
    closing: {
      score: closing,
      rationale: closing >= 4
        ? 'You kept the deal inside a credible buyer zone and closed without unnecessary extra movement.'
        : 'Tighten the final stage so you do not drift past your leverage or budget case.'
    }
  }
}

export function calculateNegotiationResult(
  scenario: NegotiationScenario,
  history: NegotiationTurnRecord[],
  finalResponse: { offer: number | null; isDeal: boolean; isNoDeal: boolean }
): NegotiationResult {
  const finalPrice = finalResponse.isDeal ? (finalResponse.offer ?? undefined) : undefined
  const potentialRange = Math.max(1, scenario.buyerWalkAway - scenario.targetPrice)
  const buyerCapture = finalPrice !== undefined
    ? Math.max(0, scenario.buyerWalkAway - finalPrice)
    : 0
  const valueCapturedPercent = Math.round(Math.min(1, buyerCapture / potentialRange) * 100)
  const priceLeakage = finalPrice !== undefined ? Math.max(0, finalPrice - scenario.targetPrice) : Math.max(0, scenario.buyerWalkAway - scenario.targetPrice)
  const coachingRubric = scoreCoaching(history, scenario, finalPrice)
  const tradeSignalCount = getUserTurns(history)
    .map((turn) => turn.analysis)
    .filter((entry): entry is NegotiationSignals => Boolean(entry))
    .reduce((sum, entry) => sum + Object.keys(entry.tradeSignals).length, 0)
  const usedBatna = getUserTurns(history).some((turn) => turn.analysis?.usesBatna)
  const noDeal = finalResponse.isNoDeal || finalPrice === undefined

  let overallRating: NegotiationResult['overallRating'] = 'poor'
  if (!noDeal && valueCapturedPercent >= 80) overallRating = 'excellent'
  else if (!noDeal && valueCapturedPercent >= 55) overallRating = 'good'
  else if (!noDeal && valueCapturedPercent >= 30) overallRating = 'fair'

  const batnaAssessment = usedBatna
    ? 'You brought a credible alternative or budget constraint into the conversation. That improved your leverage and reduced the chance of price-only concessions.'
    : 'You negotiated mostly inside the seller’s frame. State your alternative path, switching option, or hard budget earlier to strengthen leverage.'

  const zopaCapture = noDeal
    ? 'No deal was reached, so the zone of possible agreement was not captured. Re-enter with a firmer anchor and clearer trade package.'
    : `You captured ${valueCapturedPercent}% of the buyer-side value between your walk-away point and target price. The final commercial position ${priceLeakage > 0 ? 'still leaked value versus the target' : 'stayed close to the target case'}.`

  const missedValue = noDeal
    ? 'The main value loss came from failing to close inside the feasible zone. Rework your anchor, then exchange non-price terms before moving again.'
    : priceLeakage > 0
      ? `You left roughly $${priceLeakage.toLocaleString()} of price value on the table. ${tradeSignalCount > 0 ? 'You did use non-price terms, but they were not extracted strongly enough.' : 'You also underused non-price tradeables such as term length, support, or renewal flexibility.'}`
      : 'Price capture was strong. The remaining gap is mostly in term design and documenting reciprocal concessions.'

  const managerSummarySentences = [
    `${scenario.title}: the participant delivered a ${overallRating} negotiation outcome ${finalPrice !== undefined ? `at $${finalPrice.toLocaleString()}` : 'without a final agreement'}.`,
    usedBatna
      ? 'They used explicit leverage instead of arguing from preference alone.'
      : 'They did not surface a strong BATNA early enough, which weakened their negotiating position.',
    tradeSignalCount > 0
      ? 'They brought non-price tradeables into the discussion, which helped move the counterparty off a pure price frame.'
      : 'They stayed too price-centric and underused term trade-offs that could have created better movement.',
    summarizeConcessionPattern(history),
    noDeal
      ? 'For the next attempt, tighten the opening anchor and trade movement only for reciprocal movement.'
      : 'For the next round, preserve the same structure while sharpening the opening anchor and closing discipline.'
  ]

  return {
    outcome: noDeal ? 'no_deal' : 'deal',
    finalPrice,
    overallRating,
    valueCapturedPercent,
    priceLeakage,
    batna_assessment: batnaAssessment,
    concession_pattern: summarizeConcessionPattern(history),
    zopa_capture: zopaCapture,
    missed_value: missedValue,
    coaching_rubric: coachingRubric,
    manager_summary: managerSummarySentences.join(' ')
  }
}

export function buildNegotiationDebriefText(scenario: NegotiationScenario, result: NegotiationResult) {
  const rubric = Object.entries(result.coaching_rubric)
    .map(([dimension, detail]) => `- ${dimension.replace(/_/g, ' ')}: ${detail.score}/5 — ${detail.rationale}`)
    .join('\n')

  return [
    `${scenario.title}`,
    `Outcome: ${result.outcome === 'deal' ? 'Deal reached' : 'No deal'}`,
    result.finalPrice !== undefined ? `Final price: $${result.finalPrice.toLocaleString()}` : 'Final price: none',
    `Value captured: ${result.valueCapturedPercent}%`,
    `Price leakage: $${result.priceLeakage.toLocaleString()}`,
    '',
    `BATNA assessment: ${result.batna_assessment}`,
    `Concession pattern: ${result.concession_pattern}`,
    `ZOPA capture: ${result.zopa_capture}`,
    `Missed value: ${result.missed_value}`,
    '',
    'Coaching rubric:',
    rubric,
    '',
    `Manager summary: ${result.manager_summary}`
  ].join('\n')
}

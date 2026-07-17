export type GameFamily =
  | 'extensive_form'
  | 'sequential_bargaining'
  | 'signaling_deterrence'
  | 'repeated_reciprocity'
  | 'price_competition'
  | 'auction_competition'
  | 'coordination'
  | 'generic_strategy'
  | 'coalitional_cooperative'
  | 'evolutionary_population'
  | 'bounded_rationality'

export type ScenarioDomain =
  | 'commodity_procurement'
  | 'enterprise_negotiation'
  | 'geopolitical'
  | 'competitive_strategy'
  | 'general'

export type MoveStructure = 'simultaneous' | 'sequential' | 'repeated'
export type InformationStructure =
  | 'complete'
  | 'incomplete'
  | 'signaling-heavy'
  | 'asymmetric_bayesian'
  | 'public_choreographed'

export interface CanonicalSourceReference {
  title: string
  url: string
  note: string
}

export interface GameTheoryDoctrineCard {
  id: string
  name: string
  when_to_use: string[]
  when_not_to_use: string[]
  actor_structure: string
  information_structure: InformationStructure
  key_questions: string[]
  common_failure_modes: string[]
  output_requirements: string[]
  canonical_sources: CanonicalSourceReference[]
}

export interface DomainOntologyEntity {
  entity_type: 'actor' | 'lever' | 'trigger' | 'outcome'
  key: string
  label: string
  description: string
  domain: ScenarioDomain | 'cross_domain'
}

export interface ScenarioTemplate {
  id: string
  title: string
  domain: ScenarioDomain
  game_family: GameFamily
  move_structure: MoveStructure
  information_structure: InformationStructure
  actor_roles: string[]
  template_prompt: string
  required_evidence: string[]
  credible_threat_tests: string[]
  default_assumptions: string[]
  desired_outputs: string[]
  keywords: string[]
}

export interface ScenarioClassification {
  game_family: GameFamily
  domain: ScenarioDomain
  actor_count: number
  move_structure: MoveStructure
  information_structure: InformationStructure
  decision_objective: string
  confidence: number
  why_fit: string
  doctrine_ids: string[]
  template_id: string | null
}

export interface PromptPack {
  doctrine_ids: string[]
  template_id: string | null
  evidence_ids: string[]
  required_output_sections: string[]
  guidance: string[]
  prohibitions: string[]
  classifier: ScenarioClassification
}

export interface DecisionPlaybookClaim {
  claim_id: string
  claim_text: string
  evidence_refs: Array<{
    evidence_id: string
    label: string
    support: 'direct' | 'partial' | 'inferred'
  }>
}

export interface DecisionPlaybook {
  volatility_driver_summary: string
  supplier_leverage_map: Array<{
    actor: string
    leverage: string
    implication: string
  }>
  buyer_tradeables: string[]
  recommended_negotiation_posture: string
  trigger_watchlist: string[]
  countermoves: string[]
  claim_to_evidence: DecisionPlaybookClaim[]
}

export interface CommodityMarketAsset {
  asset: string
  price: number
  change_24h: number
  currency?: string
  unit?: string
}

export interface SequentialTreeNodeTemplate {
  id: string
  type: 'decision' | 'chance' | 'terminal'
  label: string
  player?: string
  payoffs?: number[]
  probability?: number
  actionLabel?: string
  children: SequentialTreeNodeTemplate[]
}

export interface SequentialGameStudioTemplate {
  id: string
  title: string
  summary: string
  domain: ScenarioDomain
  doctrine_ids: string[]
  players: string[]
  move_structure: MoveStructure
  information_structure: InformationStructure
  assumptions: string[]
  credible_threats: string[]
  next_countermove_to_test: string
  tree: SequentialTreeNodeTemplate
}

export interface SequentialGameStudioReport {
  title: string
  executive_summary: string
  backward_induction_assessment: string
  credible_threat_analysis: string[]
  assumption_drivers: string[]
  next_countermove_to_test: string
  human_readable_brief: string
}

const PUBLIC_SOURCES = {
  osborne: {
    title: 'Osborne, Extensive Games with Perfect Information',
    url: 'https://www.economics.utoronto.ca/osborne/igt/igtChapter5.pdf',
    note: 'Canonical treatment of extensive-form games, strategies, and backward induction.'
  },
  mitBargaining: {
    title: 'MIT OCW, Extensive-Form Games and Bargaining',
    url: 'https://ocw.mit.edu/courses/6-254-game-theory-with-engineering-applications-spring-2010/634f8c484a8f35f865a5b88f62c2c0d4_MIT6_254S10_lec13.pdf',
    note: 'Concise engineering-oriented treatment of extensive-form games, bargaining, and SPE.'
  },
  harvardBatna: {
    title: 'Sebenius, BATNA and the Three Kinds of No',
    url: 'https://www.hbs.edu/ris/Publication%20Files/17-055_878a070d-7972-4ce3-95ce-73f424a38900.pdf',
    note: 'Practical negotiation doctrine on BATNA, no-deal options, and reset tactics.'
  },
  imfCommodity: {
    title: 'IMF Commodity Special Feature, April 2025',
    url: 'https://www.imf.org/-/media/files/publications/weo/2025/april/english/commodityspecialfeature.pdf',
    note: 'Commodity market drivers, oil/gold dynamics, and macro volatility context.'
  },
  eiaSteo: {
    title: 'EIA Short-Term Energy Outlook',
    url: 'https://www.eia.gov/outlooks/steo/',
    note: 'Operational outlook for oil and energy market supply-demand conditions.'
  },
  mitCooperativeGames: {
    title: 'MIT OCW, Cooperative Games, The Core, and the Shapley Value',
    url: 'https://ocw.mit.edu/courses/14-126-game-theory-spring-2016/25c82e8213fd23daa72c9382e921a2b0_MIT14_126S16_cooperative.pdf',
    note: 'Canonical lecture notes covering coalition worth, the core, and the Shapley value.'
  },
  mitPbe: {
    title: 'MIT OCW, Perfect Bayesian Equilibrium',
    url: 'https://ocw.mit.edu/courses/14-122-microeconomic-theory-ii-fall-2002/0c77aa544ed2ea3d26fed6f9e4460551_pbe.pdf',
    note: 'Reference treatment of beliefs, Bayes consistency, and sequential rationality.'
  },
  mitCorrelated: {
    title: 'MIT OCW, Correlated Equilibrium Notes',
    url: 'https://ocw.mit.edu/courses/14-126-game-theory-spring-2024/mit14_126_s24_yildiz-lecture-notes.pdf',
    note: 'Primary-source notes on correlated equilibrium and obedience constraints.'
  },
  mitEvolutionary: {
    title: 'MIT OCW, Evolutionary Game Theory and Replicator Dynamics',
    url: 'https://ocw.mit.edu/courses/14.126-game-theory-spring-2024/mit14_126_s24_lecture_slides_evolutionary_game_theory.pdf',
    note: 'Reference slides on ESS, population shares, and replicator dynamics.'
  },
  mckelveyPalfrey: {
    title: 'McKelvey and Palfrey, Quantal Response Equilibria for Normal Form Games',
    url: 'https://econpapers.repec.org/paper/cltsswopa/883.htm',
    note: 'Foundational logit-QRE reference for bounded-rationality response models.'
  },
  ogRag: {
    title: 'OG-RAG: Ontology-Grounded Retrieval-Augmented Generation',
    url: 'https://arxiv.org/pdf/2412.15235',
    note: 'Architecture reference for ontology-grounded retrieval and explainable reasoning.'
  }
} as const

export const GAME_THEORY_DOCTRINE_CARDS: GameTheoryDoctrineCard[] = [
  {
    id: 'extensive_form_spe',
    name: 'Extensive-form games and subgame perfect equilibrium',
    when_to_use: [
      'A focal actor moves first and expects a sequence of countermoves.',
      'The question hinges on credibility of retaliation, accommodation, or escalation.',
      'The decision is better modeled as a tree than a one-shot matrix.'
    ],
    when_not_to_use: [
      'All actors move simultaneously with no meaningful sequence.',
      'The scenario is mostly descriptive market commentary rather than strategic choice.'
    ],
    actor_structure: 'Two or more actors with explicit move order and observable prior actions.',
    information_structure: 'complete',
    key_questions: [
      'Who moves first, second, and last?',
      'Which threat or concession is not credible once the node is reached?',
      'What outcome survives backward induction?'
    ],
    common_failure_modes: [
      'Treating non-credible threats as if they will be carried out.',
      'Skipping move order and collapsing the problem into a static payoff matrix.'
    ],
    output_requirements: [
      'Explicit move order',
      'Credible threat test',
      'Subgame-perfect or non-SPE rationale',
      'Next countermove to test'
    ],
    canonical_sources: [PUBLIC_SOURCES.osborne, PUBLIC_SOURCES.mitBargaining]
  },
  {
    id: 'sequential_bargaining',
    name: 'Sequential bargaining under incomplete information',
    when_to_use: [
      'A buyer and supplier exchange offers over price, terms, timing, or scope.',
      'Outside options, reservation points, or BATNA materially affect leverage.',
      'The main uncertainty is how flexible the other side really is.'
    ],
    when_not_to_use: [
      'The scenario is a pure auction or commodity spot-market observation with no negotiation surface.',
      'There is no realistic leverage, outside option, or package trade to structure.'
    ],
    actor_structure: 'Counterparties trading price and non-price terms under imperfect information.',
    information_structure: 'incomplete',
    key_questions: [
      'What is each side willing to trade and what do they refuse to trade?',
      'What is the true no-deal path for each side?',
      'Which concessions are reciprocal and which are one-sided leakage?'
    ],
    common_failure_modes: [
      'Reducing everything to headline price and ignoring term leakage.',
      'Stating BATNA vaguely without explaining how it changes leverage.'
    ],
    output_requirements: [
      'Outside options and leverage',
      'Tradeables and reservation logic',
      'Likely countermoves',
      'Recommended negotiation posture'
    ],
    canonical_sources: [PUBLIC_SOURCES.harvardBatna, PUBLIC_SOURCES.mitBargaining]
  },
  {
    id: 'signaling_deterrence',
    name: 'Signaling, deterrence, and credible commitment',
    when_to_use: [
      'The scenario revolves around threats, sanctions, public positioning, or reveal/conceal choices.',
      'One side is trying to shape beliefs before the next move.'
    ],
    when_not_to_use: [
      'The scenario is a straightforward procurement discussion without signaling dynamics.'
    ],
    actor_structure: 'Actors trying to change beliefs, deter action, or extract concessions through signals.',
    information_structure: 'signaling-heavy',
    key_questions: [
      'What belief is each actor trying to create?',
      'Which signal is costly enough to be credible?',
      'What would falsify the deterrence posture?'
    ],
    common_failure_modes: [
      'Confusing loud rhetoric with credible commitment.',
      'Ignoring how the audience updates beliefs after each signal.'
    ],
    output_requirements: [
      'Signal and audience map',
      'Credibility test',
      'Escalation and de-escalation signposts'
    ],
    canonical_sources: [PUBLIC_SOURCES.osborne, PUBLIC_SOURCES.mitBargaining]
  },
  {
    id: 'repeated_reciprocity',
    name: 'Repeated games, reciprocity, and reputation',
    when_to_use: [
      'The relationship is ongoing and today’s move affects future bargaining power.',
      'The scenario includes renewal, repeated supply, or long-term service interaction.'
    ],
    when_not_to_use: [
      'The scenario is a one-off transaction with no reputation or repeat-play consequences.'
    ],
    actor_structure: 'Actors interact more than once and can reward, punish, or condition future play.',
    information_structure: 'incomplete',
    key_questions: [
      'What precedent does today’s move set?',
      'What future punishments or rewards are available?',
      'Is the current concession buying future cooperation or just leaking value?'
    ],
    common_failure_modes: [
      'Optimizing for the current round while damaging the future bargaining position.',
      'Ignoring reputation and renewal effects.'
    ],
    output_requirements: [
      'Precedent risk',
      'Reputation effects',
      'Repeat-play leverage and retaliation logic'
    ],
    canonical_sources: [PUBLIC_SOURCES.osborne]
  },
  {
    id: 'price_competition',
    name: 'Price and quantity competition',
    when_to_use: [
      'Commodity or supplier behavior is driven by price competition, capacity, or volume allocation.',
      'The scenario depends on whether suppliers behave more like price competitors or capacity managers.'
    ],
    when_not_to_use: [
      'A bespoke negotiation dominates and market structure is only background context.'
    ],
    actor_structure: 'Multiple producers or suppliers with price, quantity, or capacity choices.',
    information_structure: 'complete',
    key_questions: [
      'Is the pressure driven by price competition, scarcity, or coordination constraints?',
      'Does the buyer face auctions, capacity rationing, or stable supply?'
    ],
    common_failure_modes: [
      'Projecting static spot-market logic into negotiated contracts.',
      'Treating market prices as if they fully determine commercial leverage.'
    ],
    output_requirements: [
      'Market structure summary',
      'Supply and demand drivers',
      'Implications for negotiated leverage'
    ],
    canonical_sources: [PUBLIC_SOURCES.imfCommodity, PUBLIC_SOURCES.eiaSteo]
  },
  {
    id: 'coalitional_shapley',
    name: 'Coalitional Games, The Core, and Shapley Value',
    when_to_use: [
      'Multi-party alliances, parliaments, consortiums, or treaties determine the outcome.',
      'Actors can form binding coalitions and transfer value across members.'
    ],
    when_not_to_use: [
      'The scenario is a strict two-player conflict with no coalition formation.',
      'No communication, side payments, or binding agreements are plausible.'
    ],
    actor_structure: 'Three or more actors who can form coalitions S and generate coalition worth v(S).',
    information_structure: 'complete',
    key_questions: [
      'Is the grand coalition stable or blocked by a profitable sub-coalition?',
      'Which players are pivotal across coalition orderings?',
      'What allocation prevents secession while preserving feasibility?'
    ],
    common_failure_modes: [
      'Reducing multi-party bargaining to a series of bilateral negotiations.',
      'Ignoring the outside options available to subsets of players.'
    ],
    output_requirements: [
      'Players and valid coalition subsets',
      'Coalition worth map v(S)',
      'Core feasibility check',
      'Shapley value allocation'
    ],
    canonical_sources: [PUBLIC_SOURCES.mitCooperativeGames]
  },
  {
    id: 'perfect_bayesian_signaling',
    name: 'Perfect Bayesian Equilibrium (PBE)',
    when_to_use: [
      'One actor has private information and the other updates beliefs after observing a message or action.',
      'The scenario hinges on bluffing, reputation, screening, or signaling strength.'
    ],
    when_not_to_use: [
      'Moves are simultaneous under complete information.',
      'Beliefs do not change after observed actions.'
    ],
    actor_structure: 'A sender with private type and a receiver who updates beliefs and chooses a response.',
    information_structure: 'asymmetric_bayesian',
    key_questions: [
      'Does equilibrium separate types or pool them?',
      'Are posterior beliefs Bayes-consistent on path?',
      'Are both sender and receiver sequentially rational after each message?'
    ],
    common_failure_modes: [
      'Assigning arbitrary off-path beliefs without diagnosing the off-path case.',
      'Checking Bayes rule but skipping sequential rationality.'
    ],
    output_requirements: [
      'Sender types and prior probabilities',
      'Message set and receiver action set',
      'Sender and receiver payoff tables',
      'Posterior beliefs and PBE diagnosis'
    ],
    canonical_sources: [PUBLIC_SOURCES.mitPbe]
  },
  {
    id: 'correlated_equilibrium',
    name: 'Correlated Equilibrium (Platform as Choreographer)',
    when_to_use: [
      'A public signal, platform recommendation, or common event can coordinate actions.',
      'Actors want to avoid worst-case miscoordination without requiring binding agreements.'
    ],
    when_not_to_use: [
      'The scenario is pure zero-sum conflict where coordination has no value.',
      'No shared signal or platform-mediated recommendation exists.'
    ],
    actor_structure: 'Independent actors condition their moves on a shared signal distribution.',
    information_structure: 'public_choreographed',
    key_questions: [
      'What signal distribution induces obedience?',
      'Does any player gain by deviating from the recommended action?',
      'What welfare or safety gain comes from correlation rather than Nash play?'
    ],
    common_failure_modes: [
      'Assuming Nash equilibrium captures platform-mediated coordination.',
      'Skipping obedience-constraint checks on the recommended distribution.'
    ],
    output_requirements: [
      'Players and action sets',
      'Joint recommendation distribution',
      'Obedience constraints and slack values',
      'Expected welfare under the correlated plan'
    ],
    canonical_sources: [PUBLIC_SOURCES.mitCorrelated]
  },
  {
    id: 'evolutionary_replicator',
    name: 'Evolutionary Game Theory and Replicator Dynamics',
    when_to_use: [
      'Macro behavior emerges from a large population of repeated random matches.',
      'The scenario is about adoption, norms, pricing drift, or viral strategy spread.'
    ],
    when_not_to_use: [
      'The decision is a one-off bilateral executive negotiation.',
      'A small number of hyper-rational actors dominates the outcome.'
    ],
    actor_structure: 'A large or effectively infinite population split across strategy phenotypes.',
    information_structure: 'complete',
    key_questions: [
      'Which strategies outperform the population average over time?',
      'Does the system converge to an ESS or cycle indefinitely?',
      'How sensitive is the endpoint to starting shares and payoff asymmetries?'
    ],
    common_failure_modes: [
      'Forcing macro adoption dynamics into a two-player game tree.',
      'Treating a transient trend as a stable ESS.'
    ],
    output_requirements: [
      'Strategy list and initial shares',
      'Symmetric payoff matrix',
      'Replicator trajectory',
      'ESS diagnostics'
    ],
    canonical_sources: [PUBLIC_SOURCES.mitEvolutionary]
  },
  {
    id: 'bounded_rationality',
    name: 'Bounded Rationality and Quantal Response',
    when_to_use: [
      'Real-world human play includes noise, limited computation, or predictable mistakes.',
      'Observed behavior departs from perfect backward induction or exact best response.'
    ],
    when_not_to_use: [
      'The actors are deterministic algorithms with near-perfect optimization.',
      'The problem needs coalition structure or Bayesian signaling rather than noisy play.'
    ],
    actor_structure: 'Human or noisy decision-makers whose responses are probabilistic rather than exact.',
    information_structure: 'incomplete',
    key_questions: [
      'How sensitive is the predicted outcome to response noise λ?',
      'Does a stable logit-QRE exist?',
      'Which strategic recommendation survives when players make mistakes?'
    ],
    common_failure_modes: [
      'Assuming flawless best response from human actors.',
      'Presenting level-k language without a deterministic response model.'
    ],
    output_requirements: [
      'Players and action sets',
      'Payoff matrix',
      'Lambda or error-rate assumption',
      'QRE profile and convergence diagnostics'
    ],
    canonical_sources: [PUBLIC_SOURCES.mckelveyPalfrey]
  }
]

export const DOMAIN_ONTOLOGY: DomainOntologyEntity[] = [
  { entity_type: 'actor', key: 'buyer', label: 'Buyer / procurement lead', description: 'Commercial actor seeking price control, continuity, and flexibility.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'supplier', label: 'Primary supplier', description: 'Current vendor or incumbent supplier.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'alternate_supplier', label: 'Alternate supplier', description: 'Fallback supply path that shapes BATNA.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'regulator', label: 'Regulator or tariff-setting authority', description: 'Policy actor that shifts pricing and logistics constraints.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'logistics_node', label: 'Logistics node', description: 'Shipping or transit dependency that can tighten supply.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'central_bank', label: 'Central bank', description: 'Policy actor influencing gold demand and safe-haven flows.', domain: 'commodity_procurement' },
  { entity_type: 'actor', key: 'producer_cartel', label: 'Producer cartel / supply bloc', description: 'Coordinated producer influence on supply and price.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'volume_commitment', label: 'Volume commitment', description: 'Trade future volume for price or allocation movement.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'term_length', label: 'Contract term', description: 'Trade contract duration for commercial improvement.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'payment_timing', label: 'Payment timing', description: 'Use prepay, net terms, or cadence as a negotiation lever.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'inventory_buffer', label: 'Inventory buffer', description: 'Existing inventory can reduce urgency and strengthen BATNA.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'substitution', label: 'Substitution path', description: 'Ability to switch products, specs, or suppliers.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'support_bundle', label: 'Support / onboarding bundle', description: 'Non-price terms that preserve value in negotiated outcomes.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'hedging', label: 'Hedging posture', description: 'Financial risk transfer that changes urgency and reservation logic.', domain: 'commodity_procurement' },
  { entity_type: 'lever', key: 'logistics_flexibility', label: 'Logistics flexibility', description: 'Routing and shipping options that reduce supply pressure.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'price_spike', label: 'Price spike', description: 'Rapid increase in commodity prices.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'supply_disruption', label: 'Supply disruption', description: 'Shortage, outage, or allocation event.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'sanctions', label: 'Sanctions or trade restrictions', description: 'Policy shock changing permissible supply routes.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'shipping_delay', label: 'Shipping or transit delay', description: 'Logistics slowdown that erodes continuity.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'tariff_change', label: 'Tariff change', description: 'Policy change altering landed cost.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'fx_move', label: 'Foreign-exchange move', description: 'Currency movement altering supplier economics.', domain: 'commodity_procurement' },
  { entity_type: 'trigger', key: 'demand_shock', label: 'Demand shock', description: 'Unexpected demand move tightening or loosening the market.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'cost', label: 'Cost impact', description: 'Headline and embedded commercial cost.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'lead_time', label: 'Lead time impact', description: 'Delivery timing and allocation risk.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'continuity', label: 'Continuity risk', description: 'Probability of supply interruption.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'concentration', label: 'Concentration risk', description: 'Overdependence on one supplier or route.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'switching_cost', label: 'Switching cost', description: 'Operational or technical cost of changing suppliers.', domain: 'commodity_procurement' },
  { entity_type: 'outcome', key: 'relationship_damage', label: 'Relationship damage', description: 'Long-term reputational or cooperation cost.', domain: 'commodity_procurement' }
]

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'vendor-price-increase-pushback',
    title: 'Vendor price increase pushback',
    domain: 'commodity_procurement',
    game_family: 'sequential_bargaining',
    move_structure: 'sequential',
    information_structure: 'incomplete',
    actor_roles: ['buyer', 'supplier', 'alternate_supplier'],
    template_prompt: 'Treat this as a negotiation over price, continuity, and precedent. Make BATNA, reservation logic, and term leakage explicit.',
    required_evidence: ['price change', 'supplier communication', 'alternate supplier or internal fallback', 'service or allocation constraints'],
    credible_threat_tests: ['Can the buyer actually shift volume?', 'Can the supplier really hold price without losing share?', 'Would refusal change lead times or service quality?'],
    default_assumptions: ['The supplier is protecting precedent, not just current margin.', 'The buyer wants to reduce price without giving away term flexibility for free.'],
    desired_outputs: ['outside options', 'buyer tradeables', 'recommended posture', 'countermoves'],
    keywords: ['vendor', 'price increase', 'renewal', 'supplier', 'cost pressure', 'budget']
  },
  {
    id: 'constrained-supply-allocation',
    title: 'Constrained supply allocation',
    domain: 'commodity_procurement',
    game_family: 'sequential_bargaining',
    move_structure: 'sequential',
    information_structure: 'incomplete',
    actor_roles: ['buyer', 'supplier', 'logistics_node', 'alternate_supplier'],
    template_prompt: 'Treat this as a scarcity negotiation. Separate price risk from continuity risk and document what the buyer can trade for allocation certainty.',
    required_evidence: ['inventory or allocation pressure', 'lead times', 'shipping/logistics conditions', 'secondary sourcing coverage'],
    credible_threat_tests: ['Can the supplier shift allocation elsewhere?', 'Can the buyer tolerate partial fulfillment?', 'Is expedited transport actually available?'],
    default_assumptions: ['Allocation and lead time are at least as important as headline price.', 'Deposits and forecast visibility are tradeable levers.'],
    desired_outputs: ['supplier leverage map', 'trigger watchlist', 'buyer tradeables', 'claim-to-evidence mapping'],
    keywords: ['allocation', 'shortage', 'constrained supply', 'scarcity', 'lead time', 'priority']
  },
  {
    id: 'renewal-under-switching-leverage',
    title: 'Renewal under switching leverage',
    domain: 'commodity_procurement',
    game_family: 'repeated_reciprocity',
    move_structure: 'sequential',
    information_structure: 'incomplete',
    actor_roles: ['buyer', 'supplier', 'alternate_supplier'],
    template_prompt: 'Treat this as a repeated relationship problem: today’s concession changes the next renewal. Show precedent risk and the role of credible switching paths.',
    required_evidence: ['renewal timing', 'switching cost', 'migration or requalification path', 'supplier dependence'],
    credible_threat_tests: ['Will the buyer really switch?', 'Is the supplier relying on incumbency inertia?', 'Does the current concession worsen future leverage?'],
    default_assumptions: ['Renewal terms affect future bargaining power.', 'Switching cost is high but not prohibitive.'],
    desired_outputs: ['outside options', 'precedent risk', 'recommended posture', 'countermoves'],
    keywords: ['renewal', 'switch', 'migration', 'incumbent', 'requalify', 're-bid']
  },
  {
    id: 'implementation-scope-rate-negotiation',
    title: 'Implementation scope and rate negotiation',
    domain: 'enterprise_negotiation',
    game_family: 'sequential_bargaining',
    move_structure: 'sequential',
    information_structure: 'incomplete',
    actor_roles: ['buyer', 'supplier'],
    template_prompt: 'Treat scope, rate, training, and milestone payments as linked tradeables rather than isolated asks.',
    required_evidence: ['quoted rates', 'scope statement', 'change-order risk', 'internal delivery fallback'],
    credible_threat_tests: ['Can the buyer narrow scope without losing the outcome?', 'Can the supplier absorb lower rates in exchange for better payment structure?'],
    default_assumptions: ['Scope and timing create as much leakage as price.', 'Named resources and training hours are material tradeables.'],
    desired_outputs: ['tradeables', 'outside options', 'countermoves'],
    keywords: ['implementation', 'services', 'scope', 'rate', 'training', 'milestone']
  },
  {
    id: 'commodity-shock-response',
    title: 'Commodity shock response',
    domain: 'commodity_procurement',
    game_family: 'price_competition',
    move_structure: 'sequential',
    information_structure: 'incomplete',
    actor_roles: ['buyer', 'supplier', 'producer_cartel', 'regulator'],
    template_prompt: 'Treat the live commodity move as an input to bargaining posture, not the answer itself. Convert spot movement into response decisions and trigger watchlists.',
    required_evidence: ['live market data', 'macro driver commentary', 'supplier communication', 'inventory or hedge status'],
    credible_threat_tests: ['Is the spot move persistent or noise?', 'Can suppliers pass the move through immediately?', 'Does the buyer have timing or hedge flexibility?'],
    default_assumptions: ['Price movements change leverage unevenly across buyers and suppliers.', 'Response speed matters more than point forecasts.'],
    desired_outputs: ['volatility driver summary', 'supplier leverage map', 'trigger watchlist'],
    keywords: ['commodity', 'gold', 'oil', 'price spike', 'market move', 'volatility']
  },
  {
    id: 'entry-deterrence-retaliatory-sequence',
    title: 'Entry deterrence and retaliatory move sequence',
    domain: 'competitive_strategy',
    game_family: 'extensive_form',
    move_structure: 'sequential',
    information_structure: 'complete',
    actor_roles: ['entrant', 'incumbent'],
    template_prompt: 'Model this as a move sequence. Identify whether the incumbent’s threat is actually credible once entry occurs.',
    required_evidence: ['entry economics', 'incumbent cost of fighting', 'market share effects', 'timing of retaliation'],
    credible_threat_tests: ['Would the incumbent really pay the cost to fight?', 'Does the entrant know that the threat is non-credible?'],
    default_assumptions: ['The incumbent prefers accommodation if fight costs are large.', 'The entrant anticipates the continuation game.'],
    desired_outputs: ['move order', 'credible threat analysis', 'next countermove to test'],
    keywords: ['entry', 'entrant', 'incumbent', 'retaliation', 'fight', 'accommodate', 'deterrence']
  }
]

export const SEQUENTIAL_GAME_STUDIO_TEMPLATES: SequentialGameStudioTemplate[] = [
  {
    id: 'vendor-renewal-tree',
    title: 'Vendor renewal under switching leverage',
    summary: 'Test whether an incumbent supplier should hold firm or accommodate when the buyer has a credible migration path.',
    domain: 'commodity_procurement',
    doctrine_ids: ['sequential_bargaining', 'repeated_reciprocity', 'extensive_form_spe'],
    players: ['Buyer', 'Supplier'],
    move_structure: 'sequential',
    information_structure: 'incomplete',
    assumptions: [
      'The buyer can move enough volume to matter within one renewal cycle.',
      'The supplier values retention but wants to protect precedent.'
    ],
    credible_threats: [
      'The supplier threat to hold price is non-credible if churn cost exceeds the concession.',
      'The buyer threat to switch is non-credible if migration cost remains unaffordable.'
    ],
    next_countermove_to_test: 'Test whether the buyer should credibly threaten a phased migration rather than an immediate full switch.',
    tree: {
      id: 'renewal-root',
      type: 'decision',
      label: 'Buyer renewal decision',
      player: 'Buyer',
      children: [
        {
          id: 'renewal-counter',
          type: 'decision',
          label: 'Supplier response',
          player: 'Supplier',
          actionLabel: 'Request improved terms',
          children: [
            {
              id: 'renewal-accommodate',
              type: 'terminal',
              label: 'Accommodation',
              actionLabel: 'Accommodate',
              payoffs: [8, 6],
              children: []
            },
            {
              id: 'renewal-hold',
              type: 'terminal',
              label: 'Hold firm',
              actionLabel: 'Hold firm',
              payoffs: [3, 4],
              children: []
            }
          ]
        },
        {
          id: 'renewal-accept',
          type: 'terminal',
          label: 'Accept incumbent terms',
          actionLabel: 'Accept current terms',
          payoffs: [4, 8],
          children: []
        }
      ]
    }
  },
  {
    id: 'supplier-squeeze-tree',
    title: 'Constrained supply allocation sequence',
    summary: 'Test whether the buyer should concede deposit timing early to secure allocation or hold for better terms.',
    domain: 'commodity_procurement',
    doctrine_ids: ['sequential_bargaining', 'extensive_form_spe'],
    players: ['Buyer', 'Supplier'],
    move_structure: 'sequential',
    information_structure: 'complete',
    assumptions: [
      'Allocation is scarce and the supplier prefers prepay or forecast commitments.',
      'The buyer values continuity enough to trade on timing if needed.'
    ],
    credible_threats: [
      'Supplier threats are credible only if alternate buyers exist for the same allocation slot.',
      'Buyer refusal is credible only if partial secondary supply can bridge the gap.'
    ],
    next_countermove_to_test: 'Test whether offering demand visibility instead of a larger deposit preserves more buyer surplus.',
    tree: {
      id: 'allocation-root',
      type: 'decision',
      label: 'Supplier allocation request',
      player: 'Buyer',
      children: [
        {
          id: 'allocation-deposit',
          type: 'decision',
          label: 'Supplier response to deposit',
          player: 'Supplier',
          actionLabel: 'Offer deposit + visibility',
          children: [
            {
              id: 'allocation-priority',
              type: 'terminal',
              label: 'Priority allocation',
              actionLabel: 'Grant priority allocation',
              payoffs: [7, 7],
              children: []
            },
            {
              id: 'allocation-mixed',
              type: 'terminal',
              label: 'Partial movement',
              actionLabel: 'Grant partial movement',
              payoffs: [5, 6],
              children: []
            }
          ]
        },
        {
          id: 'allocation-refuse',
          type: 'terminal',
          label: 'Hold current terms',
          actionLabel: 'Refuse and wait',
          payoffs: [2, 5],
          children: []
        }
      ]
    }
  },
  {
    id: 'entry-deterrence-tree',
    title: 'Entry deterrence and accommodation test',
    summary: 'Test whether the incumbent’s threat to fight entry survives backward induction.',
    domain: 'competitive_strategy',
    doctrine_ids: ['extensive_form_spe'],
    players: ['Entrant', 'Incumbent'],
    move_structure: 'sequential',
    information_structure: 'complete',
    assumptions: [
      'Fighting entry is costly to the incumbent.',
      'The entrant observes whether accommodation dominates the continuation game.'
    ],
    credible_threats: [
      'Fight is not credible if accommodation leaves the incumbent better off once entry occurs.'
    ],
    next_countermove_to_test: 'Test whether the incumbent can commit to a cost-reducing defensive move before entry.',
    tree: {
      id: 'entry-root',
      type: 'decision',
      label: 'Entrant move',
      player: 'Entrant',
      children: [
        {
          id: 'entry-enter',
          type: 'decision',
          label: 'Incumbent response',
          player: 'Incumbent',
          actionLabel: 'Enter',
          children: [
            {
              id: 'entry-fight',
              type: 'terminal',
              label: 'Fight',
              actionLabel: 'Fight',
              payoffs: [-1, 1],
              children: []
            },
            {
              id: 'entry-accommodate',
              type: 'terminal',
              label: 'Accommodate',
              actionLabel: 'Accommodate',
              payoffs: [2, 2],
              children: []
            }
          ]
        },
        {
          id: 'entry-stayout',
          type: 'terminal',
          label: 'Stay out',
          actionLabel: 'Stay out',
          payoffs: [0, 3],
          children: []
        }
      ]
    }
  },
  {
    id: 'tariff-retaliation-tree',
    title: 'Tariff retaliation sequence',
    summary: 'Test whether a state should escalate or seek a negotiated climbdown after a tariff shock.',
    domain: 'geopolitical',
    doctrine_ids: ['signaling_deterrence', 'extensive_form_spe'],
    players: ['State A', 'State B'],
    move_structure: 'sequential',
    information_structure: 'signaling-heavy',
    assumptions: [
      'Both states care about domestic political signaling as well as direct economic payoffs.'
    ],
    credible_threats: [
      'Escalation is only credible if domestic political payoff outweighs trade loss.'
    ],
    next_countermove_to_test: 'Test whether a symbolic response can preserve deterrence without triggering a full retaliatory round.',
    tree: {
      id: 'tariff-root',
      type: 'decision',
      label: 'State A tariff decision',
      player: 'State A',
      children: [
        {
          id: 'tariff-escalate',
          type: 'decision',
          label: 'State B response',
          player: 'State B',
          actionLabel: 'Escalate',
          children: [
            {
              id: 'tariff-retaliate',
              type: 'terminal',
              label: 'Retaliate',
              actionLabel: 'Retaliate',
              payoffs: [2, 2],
              children: []
            },
            {
              id: 'tariff-negotiate',
              type: 'terminal',
              label: 'Negotiate',
              actionLabel: 'Negotiate',
              payoffs: [4, 5],
              children: []
            }
          ]
        },
        {
          id: 'tariff-hold',
          type: 'terminal',
          label: 'Hold status quo',
          actionLabel: 'Hold',
          payoffs: [5, 5],
          children: []
        }
      ]
    }
  },
  {
    id: 'regulatory-escalation-tree',
    title: 'Regulatory escalation and settlement',
    summary: 'Test whether a regulated firm should settle early or force a regulator into a costly escalation path.',
    domain: 'competitive_strategy',
    doctrine_ids: ['extensive_form_spe', 'signaling_deterrence'],
    players: ['Firm', 'Regulator'],
    move_structure: 'sequential',
    information_structure: 'incomplete',
    assumptions: [
      'The regulator values precedent while the firm values delay and negotiated flexibility.'
    ],
    credible_threats: [
      'Regulator threats are credible only if litigation or enforcement cost is tolerable.',
      'Firm threats are credible only if delay truly improves its outside option.'
    ],
    next_countermove_to_test: 'Test whether an early partial settlement weakens the regulator’s incentive to escalate.',
    tree: {
      id: 'regulatory-root',
      type: 'decision',
      label: 'Firm response',
      player: 'Firm',
      children: [
        {
          id: 'regulatory-settle',
          type: 'terminal',
          label: 'Settle early',
          actionLabel: 'Settle',
          payoffs: [5, 7],
          children: []
        },
        {
          id: 'regulatory-resist',
          type: 'decision',
          label: 'Regulator escalation choice',
          player: 'Regulator',
          actionLabel: 'Resist',
          children: [
            {
              id: 'regulatory-escalate',
              type: 'terminal',
              label: 'Escalate',
              actionLabel: 'Escalate',
              payoffs: [2, 4],
              children: []
            },
            {
              id: 'regulatory-compromise',
              type: 'terminal',
              label: 'Compromise',
              actionLabel: 'Compromise',
              payoffs: [6, 5],
              children: []
            }
          ]
        }
      ]
    }
  },
  {
    id: 'bargaining-incomplete-information-tree',
    title: 'Bargaining under incomplete information',
    summary: 'Test whether a buyer should make a tough early ask or probe for type first when the seller’s flexibility is uncertain.',
    domain: 'enterprise_negotiation',
    doctrine_ids: ['sequential_bargaining'],
    players: ['Buyer', 'Seller'],
    move_structure: 'sequential',
    information_structure: 'incomplete',
    assumptions: [
      'The seller may be flexible, policy-bound, or time-pressured.',
      'The buyer can learn type through one bounded counterproposal.'
    ],
    credible_threats: [
      'A hard ask is non-credible if the buyer lacks a workable BATNA.',
      'A final-offer claim is non-credible if the seller later reopens discussion.'
    ],
    next_countermove_to_test: 'Test whether a diagnostic question followed by a smaller ask dominates a blunt ultimatum.',
    tree: {
      id: 'bargaining-root',
      type: 'decision',
      label: 'Buyer opening choice',
      player: 'Buyer',
      children: [
        {
          id: 'bargaining-hard',
          type: 'decision',
          label: 'Seller response to hard ask',
          player: 'Seller',
          actionLabel: 'Make hard ask',
          children: [
            {
              id: 'bargaining-accept',
              type: 'terminal',
              label: 'Accept',
              actionLabel: 'Accept',
              payoffs: [8, 4],
              children: []
            },
            {
              id: 'bargaining-reject',
              type: 'terminal',
              label: 'Reject',
              actionLabel: 'Reject',
              payoffs: [1, 3],
              children: []
            }
          ]
        },
        {
          id: 'bargaining-probe',
          type: 'decision',
          label: 'Seller response to calibrated probe',
          player: 'Seller',
          actionLabel: 'Probe for type',
          children: [
            {
              id: 'bargaining-smallmove',
              type: 'terminal',
              label: 'Small movement',
              actionLabel: 'Offer limited concession',
              payoffs: [6, 6],
              children: []
            },
            {
              id: 'bargaining-freeze',
              type: 'terminal',
              label: 'Hold position',
              actionLabel: 'Hold position',
              payoffs: [3, 5],
              children: []
            }
          ]
        }
      ]
    }
  }
]

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function doctrineSpecificPromptGuidance(classifier: ScenarioClassification) {
  const instructions: string[] = []

  if (classifier.doctrine_ids.includes('coalitional_shapley')) {
    instructions.push(
      'For coalition games, enumerate all valid coalitions using sorted actor ids joined by "|" (example: "P1|P2"). Use "__empty__" for the empty coalition and return coalition worths as a JSON mapping named coalition_values.',
      'Do not infer coalitions containing actors outside the declared player list.',
      'Return coalition_values, players, and any stability caveats needed for a core feasibility check.'
    )
  }

  if (classifier.doctrine_ids.includes('perfect_bayesian_signaling')) {
    instructions.push(
      'For signaling games, identify sender types, prior probabilities, observable messages, receiver actions, and sender/receiver payoff tables.',
      'You MUST output prior_probs, sender_types, messages, receiver_actions, sender_payoffs, receiver_payoffs, and sender_strategies when signaling doctrine is selected.',
      'If a message is off-path, say so explicitly instead of inventing a posterior.'
    )
  }

  if (classifier.doctrine_ids.includes('correlated_equilibrium')) {
    instructions.push(
      'For correlated equilibrium, define players, each action set, and the normal-form payoff tensor needed to compute an obedience-compatible joint distribution.',
      'If a public signal coordinates behavior, describe the signal but still output the payoff structure needed for deterministic solving.'
    )
  }

  if (classifier.doctrine_ids.includes('evolutionary_replicator')) {
    instructions.push(
      'For evolutionary games, provide a symmetric payoff matrix, strategy labels, initial population shares, and any horizon assumptions needed for replicator dynamics.',
      'Do not collapse population dynamics into a one-shot bilateral equilibrium claim.'
    )
  }

  if (classifier.doctrine_ids.includes('bounded_rationality')) {
    instructions.push(
      'For bounded rationality, do not assume perfect backward induction.',
      'Return the normal-form payoff structure plus a logit-QRE lambda parameter (default 0.2 if evidence is thin).',
      'Level-k language is allowed for intuition, but deterministic outputs in this phase must be QRE-compatible inputs.'
    )
  }

  return instructions
}

function countActors(text: string) {
  const actorMatches = text.match(/\b(vendor|supplier|buyer|entrant|incumbent|regulator|state|china|usa|firm|customer|seller|bloc|blocs|party|parties|member|members|alliance|consortium)\b/gi) || []
  const inferredCount = uniqueStrings(actorMatches.map((entry) => entry.toLowerCase())).length || 2
  const numericHints: Record<string, number> = {
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  }
  const numericCount = Object.entries(numericHints).find(([label]) => new RegExp(`\\b${label}\\b`).test(text))?.[1] || null
  return Math.max(2, Math.min(5, Math.max(inferredCount, numericCount || 0)))
}

export function getDoctrineCardById(id: string) {
  return GAME_THEORY_DOCTRINE_CARDS.find((card) => card.id === id) || null
}

export function getScenarioTemplateById(id: string) {
  return SCENARIO_TEMPLATES.find((template) => template.id === id) || null
}

export function getSequentialGameTemplateById(id: string) {
  return SEQUENTIAL_GAME_STUDIO_TEMPLATES.find((template) => template.id === id) || null
}

export function classifyStrategicScenario(
  scenarioText: string,
  context: {
    domainHint?: ScenarioDomain
    preferredTemplateId?: string | null
  } = {}
): ScenarioClassification {
  const text = scenarioText.toLowerCase()
  const actorCount = countActors(text)
  const template = context.preferredTemplateId ? getScenarioTemplateById(context.preferredTemplateId) : null

  let domain: ScenarioDomain = context.domainHint || template?.domain || 'general'
  if (domain === 'general') {
    if (/(gold|oil|commodity|allocation|lead time|inventory|supplier|procurement|sourcing|tariff|shipping|fx)/.test(text)) {
      domain = 'commodity_procurement'
    } else if (/(renewal|saas|implementation|contract|pricing|vendor|services|budget|scope|migration)/.test(text)) {
      domain = 'enterprise_negotiation'
    } else if (/(sanction|nuclear|deterr|state|border|tariff retaliation|trade war|escalat)/.test(text)) {
      domain = 'geopolitical'
    } else if (/(entry|entrant|incumbent|retaliat|regulator|market share|competition)/.test(text)) {
      domain = 'competitive_strategy'
    }
  }

  let gameFamily: GameFamily = template?.game_family || 'generic_strategy'
  let moveStructure: MoveStructure = template?.move_structure || 'sequential'
  let informationStructure: InformationStructure = template?.information_structure || 'incomplete'
  let decisionObjective = 'Strengthen the focal actor position while preserving evidence-backed optionality.'
  let whyFit = 'The scenario requires structured strategic reasoning.'
  let doctrineIds: string[] = ['sequential_bargaining']
  let confidence = 0.62
  const hasBargainingSignals = /(renewal|vendor|supplier|procurement|allocation|price increase|services|scope|rate|contract|migration|seat|re-bid|requalify|term length|volume|pricing)/.test(text)
  const hasExplicitDeterrenceSignals = /(entry|entrant|fight|accommodate|retaliat|deterrence)/.test(text)
  const hasRegulatoryEscalationSignals = /(regulatory escalation)/.test(text)
  const hasSignalingSignals = /(signal|sanction|deterr|threat|escalat|public posture|warning)/.test(text)
  const hasCoalitionSignals = /(alliance|coalition|parliament|majority|bloc|consortium|treaty|grand coalition|swing vote|cabinet|multi-party)/.test(text)
  const hasBayesianSignals = /(private information|hidden type|sender|receiver|pooling|separating|bluff|screening|reputation|signal strength|credible signal)/.test(text)
  const hasCorrelatedSignals = /(coordinate|coordination failure|public signal|platform recommendation|traffic signal|shared signal|news event|recommendation engine|choreograph)/.test(text)
  const hasEvolutionarySignals = /(population|adoption|viral|diffusion|norm|replicator|phenotype|market-wide|mass behavior|share dynamics|ess)/.test(text)
  const hasBoundedRationalitySignals = /(human error|bounded rationality|quantal|noisy response|mistake|limited computation|cognitive limit|level-k|suboptimal)/.test(text)
  const procurementBiasedDomain =
    context.domainHint === 'enterprise_negotiation' ||
    context.domainHint === 'commodity_procurement' ||
    domain === 'enterprise_negotiation' ||
    domain === 'commodity_procurement'
  const shouldPreferBargaining =
    hasBargainingSignals &&
    (procurementBiasedDomain || !hasExplicitDeterrenceSignals || /(renewal|vendor|supplier|procurement|allocation|price increase|services|scope|rate|contract|seat|budget)/.test(text))

  if (hasCoalitionSignals && actorCount >= 3) {
    gameFamily = 'coalitional_cooperative'
    moveStructure = 'simultaneous'
    informationStructure = 'complete'
    doctrineIds = ['coalitional_shapley']
    decisionObjective = 'Stabilize the grand coalition while quantifying fair coalition payoffs and defection risk.'
    whyFit = 'The scenario is defined by coalition formation, coalition worth, and stability of multi-party agreements.'
    confidence = 0.88
  } else if (hasBayesianSignals || (hasSignalingSignals && /(private|hidden|bluff|pool|separat|reputation)/.test(text))) {
    gameFamily = 'signaling_deterrence'
    moveStructure = 'sequential'
    informationStructure = 'asymmetric_bayesian'
    doctrineIds = ['perfect_bayesian_signaling', 'signaling_deterrence']
    decisionObjective = 'Infer private type, update beliefs consistently, and choose a sequentially rational response.'
    whyFit = 'The scenario hinges on private information, belief updates, and signaling discipline rather than static deterrence alone.'
    confidence = 0.9
  } else if (hasCorrelatedSignals) {
    gameFamily = 'coordination'
    moveStructure = 'simultaneous'
    informationStructure = 'public_choreographed'
    doctrineIds = ['correlated_equilibrium']
    decisionObjective = 'Use a shared signal to coordinate behavior without assuming binding contracts.'
    whyFit = 'The platform or public signal mediates action choice, so obedience constraints matter more than standalone Nash reasoning.'
    confidence = 0.84
  } else if (hasEvolutionarySignals) {
    gameFamily = 'evolutionary_population'
    moveStructure = 'repeated'
    informationStructure = 'complete'
    doctrineIds = ['evolutionary_replicator']
    decisionObjective = 'Model how strategy shares evolve over time and whether an ESS emerges.'
    whyFit = 'Population-level adoption and fitness dynamics dominate the strategic story.'
    confidence = 0.84
  } else if (hasBoundedRationalitySignals) {
    gameFamily = 'bounded_rationality'
    moveStructure = 'simultaneous'
    informationStructure = 'incomplete'
    doctrineIds = ['bounded_rationality']
    decisionObjective = 'Predict robust moves when players respond noisily rather than perfectly.'
    whyFit = 'Observed or expected decision noise makes perfect-rationality equilibrium a poor first approximation.'
    confidence = 0.83
  } else if (shouldPreferBargaining) {
    gameFamily = 'sequential_bargaining'
    moveStructure = 'sequential'
    informationStructure = 'incomplete'
    doctrineIds = /(renewal|migration|incumbent)/.test(text)
      ? ['sequential_bargaining', 'repeated_reciprocity']
      : ['sequential_bargaining']
    decisionObjective = domain === 'commodity_procurement'
      ? 'Contain supplier leverage while protecting continuity, timing, and flexibility.'
      : 'Improve negotiated terms while preserving long-run leverage and delivery quality.'
    whyFit = 'The scenario is a multi-round bargaining problem with uncertain flexibility, BATNA, and package trade-offs.'
    confidence = 0.91
  } else if (hasExplicitDeterrenceSignals || hasRegulatoryEscalationSignals || /(incumbent)/.test(text)) {
    gameFamily = 'extensive_form'
    moveStructure = 'sequential'
    informationStructure = /(signal|bluff|threat)/.test(text) ? 'signaling-heavy' : 'complete'
    doctrineIds = /(signal|threat|sanction|deterr)/.test(text)
      ? ['extensive_form_spe', 'signaling_deterrence']
      : ['extensive_form_spe']
    decisionObjective = 'Choose a move that survives the continuation game and filters out non-credible threats.'
    whyFit = 'The scenario is driven by move order, retaliation, and credibility of continuation actions.'
    confidence = 0.89
  } else if (hasSignalingSignals) {
    gameFamily = 'signaling_deterrence'
    moveStructure = 'sequential'
    informationStructure = 'signaling-heavy'
    doctrineIds = ['signaling_deterrence']
    decisionObjective = 'Shape beliefs and deter the next move without overcommitting.'
    whyFit = 'The main strategic variable is how signals change beliefs and trigger escalation or restraint.'
    confidence = 0.85
  } else if (/(repeat|reputation|annual|precedent|future round|long-term)/.test(text)) {
    gameFamily = 'repeated_reciprocity'
    moveStructure = 'repeated'
    informationStructure = 'incomplete'
    doctrineIds = ['repeated_reciprocity', 'sequential_bargaining']
    decisionObjective = 'Optimize the current round without damaging future bargaining position.'
    whyFit = 'The problem hinges on precedent, retaliation, and long-term cooperation.'
    confidence = 0.8
  } else if (/(auction|bid|bidding|allocation slot|highest bidder)/.test(text)) {
    gameFamily = 'auction_competition'
    moveStructure = 'simultaneous'
    informationStructure = 'incomplete'
    doctrineIds = ['price_competition']
    decisionObjective = 'Define reservation logic and avoid bidding past the value of the prize.'
    whyFit = 'The scenario centers on competitive bids and reservation values.'
    confidence = 0.78
  } else if (/(cournot|bertrand|capacity|output|marginal cost|spot market|oil market|gold price|commodity shock)/.test(text)) {
    gameFamily = 'price_competition'
    moveStructure = 'simultaneous'
    informationStructure = 'complete'
    doctrineIds = ['price_competition']
    decisionObjective = 'Translate market structure and supply pressure into procurement leverage and timing choices.'
    whyFit = 'Market structure and supply-demand pressure are more important than bilateral concessions alone.'
    confidence = 0.76
  }

  const matchingTemplate = template || SCENARIO_TEMPLATES
    .map((entry) => ({
      entry,
      score: entry.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? 1 : 0), 0)
    }))
    .filter((candidate) => candidate.entry.game_family === gameFamily || candidate.entry.domain === domain)
    .sort((left, right) => right.score - left.score)[0]?.entry || null

  return {
    game_family: gameFamily,
    domain,
    actor_count: actorCount,
    move_structure: moveStructure,
    information_structure: informationStructure,
    decision_objective: decisionObjective,
    confidence,
    why_fit: whyFit,
    doctrine_ids: doctrineIds,
    template_id: matchingTemplate?.id || null
  }
}

export function buildDoctrinePromptPack(args: {
  scenarioText: string
  evidenceIds?: string[]
  domainHint?: ScenarioDomain
  preferredTemplateId?: string | null
}): PromptPack {
  const classifier = classifyStrategicScenario(args.scenarioText, {
    domainHint: args.domainHint,
    preferredTemplateId: args.preferredTemplateId
  })
  const template = classifier.template_id ? getScenarioTemplateById(classifier.template_id) : null
  const doctrineCards = classifier.doctrine_ids
    .map((id) => getDoctrineCardById(id))
    .filter((entry): entry is GameTheoryDoctrineCard => Boolean(entry))

  const requiredOutputSections = uniqueStrings([
    'game classification',
    'actor map',
    'move order and information structure',
    'outside options and leverage',
    'likely countermoves',
    'equilibrium or decision logic',
    'advanced solver inputs when doctrine requires them',
    'uncertainty and signposts',
    'claim-to-evidence mapping',
    ...(template?.desired_outputs || [])
  ])

  return {
    doctrine_ids: classifier.doctrine_ids,
    template_id: classifier.template_id,
    evidence_ids: args.evidenceIds || [],
    required_output_sections: requiredOutputSections,
    guidance: [
      `Selected game family: ${classifier.game_family}. Explain why this fit is better than a generic Nash summary.`,
      `Decision objective: ${classifier.decision_objective}`,
      ...(template ? [`Template guidance: ${template.template_prompt}`] : []),
      ...doctrineSpecificPromptGuidance(classifier),
      ...doctrineCards.flatMap((card) => card.key_questions.map((question) => `${card.name}: ${question}`))
    ],
    prohibitions: [
      'Do not name a game family without explaining why it fits the scenario.',
      'Do not state equilibrium logic without listing the assumptions that make it hold.',
      'Do not use live evidence as a substitute for doctrine selection.',
      'Do not present unsupported heuristics as evidence-backed conclusions.'
    ],
    classifier
  }
}

export function buildDoctrinePromptText(pack: PromptPack) {
  const doctrineCards = pack.doctrine_ids
    .map((id) => getDoctrineCardById(id))
    .filter((entry): entry is GameTheoryDoctrineCard => Boolean(entry))
  const template = pack.template_id ? getScenarioTemplateById(pack.template_id) : null

  const doctrineBlock = doctrineCards.map((card) => [
    `Doctrine: ${card.name} (${card.id})`,
    `Use when: ${card.when_to_use.join('; ')}`,
    `Avoid when: ${card.when_not_to_use.join('; ')}`,
    `Actor structure: ${card.actor_structure}`,
    `Key questions: ${card.key_questions.join(' | ')}`,
    `Failure modes: ${card.common_failure_modes.join(' | ')}`,
    `Required outputs: ${card.output_requirements.join(' | ')}`
  ].join('\n')).join('\n\n')

  const templateBlock = template
    ? [
        `Scenario template: ${template.title} (${template.id})`,
        `Template directive: ${template.template_prompt}`,
        `Required evidence: ${template.required_evidence.join('; ')}`,
        `Credible threat tests: ${template.credible_threat_tests.join('; ')}`,
        `Default assumptions: ${template.default_assumptions.join('; ')}`
      ].join('\n')
    : 'Scenario template: none selected'

  return [
    'DOCTRINE PACK:',
    `Classification: ${pack.classifier.game_family} | domain=${pack.classifier.domain} | move_structure=${pack.classifier.move_structure} | information_structure=${pack.classifier.information_structure} | confidence=${pack.classifier.confidence}`,
    `Why this fit: ${pack.classifier.why_fit}`,
    doctrineBlock,
    templateBlock,
    `Evidence ids available: ${pack.evidence_ids.join(', ') || 'none supplied'}`,
    `Required output sections: ${pack.required_output_sections.join('; ')}`,
    'Guardrails:',
    ...pack.prohibitions.map((line) => `- ${line}`)
  ].join('\n\n')
}

export function buildCommodityResponsePlaybook(args: {
  workflow?: 'procurement'
  scenarioId?: 'vendor-price-increase-pushback' | 'constrained-supply-allocation' | 'renewal-under-switching-leverage'
  marketAssets: CommodityMarketAsset[]
  providerMode?: 'live' | 'degraded' | 'simulated' | 'unconfigured'
}): {
  classification: ScenarioClassification
  promptPack: PromptPack
  playbook: DecisionPlaybook
} {
  const workflow = args.workflow || 'procurement'
  const scenarioTemplateId = args.scenarioId || 'vendor-price-increase-pushback'
  const template = getScenarioTemplateById(scenarioTemplateId) || getScenarioTemplateById('commodity-shock-response')
  const gold = args.marketAssets.find((asset) => asset.asset.toLowerCase() === 'gold')
  const oil = args.marketAssets.find((asset) => asset.asset.toLowerCase() === 'oil')
  const dominantAsset = [gold, oil]
    .filter((entry): entry is CommodityMarketAsset => Boolean(entry))
    .sort((left, right) => Math.abs(right.change_24h) - Math.abs(left.change_24h))[0] || null
  const priceShock = dominantAsset ? Math.abs(dominantAsset.change_24h) : 0
  const marketMode = args.providerMode || 'degraded'
  const scenarioText = template
    ? `${template.title}. Workflow=${workflow}. Market mode=${marketMode}. ${dominantAsset ? `${dominantAsset.asset} moved ${dominantAsset.change_24h.toFixed(2)}% in 24h.` : 'No dominant live asset is available.'}`
    : 'Commodity procurement response workspace.'

  const promptPack = buildDoctrinePromptPack({
    scenarioText,
    domainHint: 'commodity_procurement',
    preferredTemplateId: template?.id || null,
    evidenceIds: [gold ? 'market_gold' : '', oil ? 'market_oil' : '', 'provider_mode'].filter(Boolean)
  })

  const supplierLeverage = dominantAsset && dominantAsset.change_24h > 1.5
    ? 'Suppliers can credibly argue that spot pressure and scarcity justify harder pricing and allocation terms.'
    : dominantAsset && dominantAsset.change_24h < -1.5
      ? 'Buyers have more room to challenge pass-through logic and trade for timing or service.'
      : 'Leverage is balanced enough that package trade-offs matter more than spot commentary alone.'

  const recommendedPosture =
    scenarioTemplateId === 'constrained-supply-allocation'
      ? 'Preserve continuity first. Trade forecast visibility, payment timing, or limited deposits only in exchange for documented allocation and lead-time rights.'
      : scenarioTemplateId === 'renewal-under-switching-leverage'
        ? 'Use switching leverage selectively. Make one bounded ask that improves price and exit flexibility without giving away future precedent.'
        : 'Challenge the pass-through. Demand justification for the increase, tie any movement to reciprocal terms, and keep alternate supply options visible.'

  const claimToEvidence: DecisionPlaybookClaim[] = [
    {
      claim_id: 'commodity_claim_1',
      claim_text: dominantAsset
        ? `${dominantAsset.asset} is the dominant live volatility signal shaping supplier posture in this workspace.`
        : 'Live commodity evidence is sparse, so posture should stay review-visible rather than fully evidence-backed.',
      evidence_refs: dominantAsset
        ? [{
            evidence_id: dominantAsset.asset.toLowerCase() === 'gold' ? 'market_gold' : 'market_oil',
            label: `${dominantAsset.asset} market feed`,
            support: 'direct'
          }]
        : [{
            evidence_id: 'provider_mode',
            label: 'Provider mode',
            support: 'partial'
          }]
    },
    {
      claim_id: 'commodity_claim_2',
      claim_text: marketMode === 'live'
        ? 'The provider is live, so the playbook can treat current price movement as active context rather than placeholder commentary.'
        : 'The provider is degraded, so the playbook should emphasize trigger monitoring and contingency planning over point certainty.',
      evidence_refs: [{
        evidence_id: 'provider_mode',
        label: 'Market provider mode',
        support: 'direct'
      }]
    }
  ]

  return {
    classification: promptPack.classifier,
    promptPack,
    playbook: {
      volatility_driver_summary: dominantAsset
        ? `${dominantAsset.asset} moved ${dominantAsset.change_24h >= 0 ? '+' : ''}${dominantAsset.change_24h.toFixed(2)}% over 24 hours. Treat this as a bargaining input, not a complete explanation of supplier behavior.`
        : 'No dominant live commodity move is available. Hold the workspace in contingency mode and rely more heavily on lead time, allocation, and fallback evidence.',
      supplier_leverage_map: [
        {
          actor: 'Primary supplier',
          leverage: supplierLeverage,
          implication: 'Test whether the supplier can justify pass-through with continuity risk rather than just spot-market narrative.'
        },
        {
          actor: 'Buyer / procurement lead',
          leverage: 'Inventory, alternate suppliers, timing flexibility, and non-price tradeables shift reservation logic.',
          implication: 'Use package trades, not isolated asks, to recover value.'
        },
        {
          actor: 'Market / policy environment',
          leverage: 'Tariffs, sanctions, shipping constraints, and currency moves can amplify or dampen supplier pressure.',
          implication: 'Watch triggers that would change whether speed or price control is the dominant objective.'
        }
      ],
      buyer_tradeables: [
        'volume commitment',
        'contract term',
        'payment timing',
        'forecast visibility',
        'onboarding or support scope',
        'termination or renewal flexibility'
      ],
      recommended_negotiation_posture: recommendedPosture,
      trigger_watchlist: [
        'additional 3%+ move in the dominant commodity feed',
        'supplier allocation or lead-time notice',
        'tariff, sanctions, or shipping disruptions affecting supply',
        'evidence that alternate suppliers can absorb more volume',
        'material shift in FX or financing conditions'
      ],
      countermoves: [
        'Ask the supplier to separate temporary commodity pressure from permanent contract repricing.',
        'Trade one non-price concession only in exchange for measurable continuity or service protection.',
        'Preserve a visible fallback path so the next supplier response reveals whether the stated constraint is real.'
      ],
      claim_to_evidence: claimToEvidence
    }
  }
}

export function buildSequentialGameStudioReport(args: {
  template: SequentialGameStudioTemplate
  equilibrium?: {
    strategy: Record<string, Record<string, string>>
    expectedPayoffs: number[]
    subgamePerfect: boolean
    nashEquilibrium: boolean
  } | null
}): SequentialGameStudioReport {
  const equilibriumSummary = args.equilibrium
    ? `Expected payoffs: ${args.template.players.map((player, index) => `${player}=${args.equilibrium?.expectedPayoffs[index] ?? 0}`).join(', ')}.`
    : 'Solve the tree to generate payoff and strategy details.'
  const speLine = args.equilibrium
    ? args.equilibrium.subgamePerfect
      ? 'Backward induction applies cleanly here because the continuation game is explicit and the current solution is subgame perfect under the stated assumptions.'
      : 'The current solution is not subgame perfect, which means at least one threat or contingent action is not credible once that node is reached.'
    : 'Backward induction is the right solver when the move order and continuation payoffs are explicit.'

  const brief = [
    `Sequential Game Studio Brief: ${args.template.title}`,
    args.template.summary,
    `Doctrine: ${args.template.doctrine_ids.join(', ')}`,
    `Move structure: ${args.template.move_structure}; information structure: ${args.template.information_structure}.`,
    speLine,
    `Credible-threat checks: ${args.template.credible_threats.join(' ')}`,
    `Assumption drivers: ${args.template.assumptions.join(' ')}`,
    `Next countermove to test: ${args.template.next_countermove_to_test}`,
    equilibriumSummary
  ].join('\n')

  return {
    title: args.template.title,
    executive_summary: `${args.template.summary} ${args.template.next_countermove_to_test}`,
    backward_induction_assessment: speLine,
    credible_threat_analysis: args.template.credible_threats,
    assumption_drivers: args.template.assumptions,
    next_countermove_to_test: args.template.next_countermove_to_test,
    human_readable_brief: brief
  }
}

export function buildSequentialConsoleScenarioText(args: {
  template: SequentialGameStudioTemplate
  report: SequentialGameStudioReport
}) {
  return [
    `Countermove planning request: ${args.template.title}`,
    `Summary: ${args.template.summary}`,
    `Move structure: ${args.template.move_structure}`,
    `Information structure: ${args.template.information_structure}`,
    `Critical assumptions: ${args.template.assumptions.join('; ')}`,
    `Credible-threat checks: ${args.template.credible_threats.join('; ')}`,
    `Next countermove to test: ${args.report.next_countermove_to_test}`,
    `Brief: ${args.report.executive_summary}`
  ].join('\n')
}

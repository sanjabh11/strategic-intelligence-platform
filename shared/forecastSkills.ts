/**
 * Forecast Skill Files — ProphetHacks-inspired procedural priors.
 *
 * Skill files encode domain-specific FORECASTING PROCEDURES (not answers).
 * They guide the agent through evidence hierarchies, calibration warnings,
 * domain-specific traps, and probability validation rules.
 *
 * Source: https://www.prophetarena.co/research/prophethacks
 * Pattern: CodexProphet's per-category skill files
 */

export type ForecastSkillCategory =
  | 'geopolitical'
  | 'macroeconomic'
  | 'competitive_strategy'
  | 'negotiation'
  | 'technology'
  | 'commodity'
  | 'social_policy'
  | 'general'

export interface ForecastSkillFile {
  category: ForecastSkillCategory
  label: string
  /** Ordered list of evidence sources to consult, from highest to lowest priority. */
  evidenceHierarchy: string[]
  /** Domain-specific traps that commonly cause forecast errors. */
  domainTraps: string[]
  /** Calibration warnings specific to this category. */
  calibrationWarnings: string[]
  /** Rules for validating the final probability before submission. */
  probabilityValidationRules: string[]
  /** Sources that should be treated as primary/official for this category. */
  primarySources: string[]
  /** When to default to the prior ("no move" guidance). */
  noMoveGuidance: string
}

export const FORECAST_SKILLS: Record<ForecastSkillCategory, ForecastSkillFile> = {
  geopolitical: {
    category: 'geopolitical',
    label: 'Geopolitical Forecasting',
    evidenceHierarchy: [
      'Official government statements and press releases',
      'Diplomatic cables and formal declarations',
      'GDELT event stream (real-time global events)',
      'Think-tank analyses (RAND, CSIS, Brookings)',
      'Major news outlets with on-the-ground reporting',
      'Social media from verified regional journalists',
    ],
    domainTraps: [
      'Evidence abundance without resolution clarity — political questions often resolve on narrow semantic distinctions (confirmed vs. probable, reported vs. certified). The ambiguity, not lack of text, is what punishes forecasts.',
      'Overweighting recent dramatic events — recency bias is severe in geopolitical forecasting.',
      'Conflating capability with intent — a country CAN do something does not mean it WILL.',
      'Ignoring base rates of conflict escalation — most crises de-escalate without military action.',
    ],
    calibrationWarnings: [
      'Geopolitical forecasts tend to be overconfident at 60-80% range — consider nudging down.',
      'Long-horizon geopolitical forecasts (>6 months) have significantly higher Brier scores — widen confidence bands.',
      'Regime change forecasts are particularly poorly calibrated — treat any probability >70% with suspicion.',
    ],
    probabilityValidationRules: [
      'If probability >85%, verify there is a specific, named mechanism that makes the outcome near-certain.',
      'If probability <15%, verify the outcome is truly near-impossible, not just unlikely.',
      'Check that the probability accounts for at least 3 alternative scenarios.',
    ],
    primarySources: [
      'GDELT Project (gdeltproject.org)',
      'World Bank Open Data',
      'Official government websites (.gov domains)',
      'UN and international organization press releases',
    ],
    noMoveGuidance: 'When political markets have high liquidity and recent news is widely covered, the market has likely already incorporated the signal. Default to prior unless you have non-public analysis or a structural insight the market misses.',
  },

  macroeconomic: {
    category: 'macroeconomic',
    label: 'Macroeconomic Forecasting',
    evidenceHierarchy: [
      'Central bank official statements and policy rate decisions',
      'Bureau of Labor Statistics / Bureau of Economic Analysis releases',
      'Treasury yield curve data',
      'IMF and World Bank economic outlook reports',
      'Financial market pricing (fed funds futures, OIS)',
      'Economist consensus surveys (Bloomberg, Reuters)',
    ],
    domainTraps: [
      'Timing ambiguity — "will rates rise?" depends critically on the time horizon. Always clarify the resolution window.',
      'Overweighting Fed speak — officials often signal multiple possibilities deliberately. Focus on dot plots and market pricing over individual statements.',
      'Ignoring base rates — the economy is usually not in recession. Default to "no recession" unless evidence is overwhelming.',
    ],
    calibrationWarnings: [
      'Macro forecasts are well-calibrated at extremes (>90% or <10%) but poorly calibrated in the 40-60% range.',
      'Fed decision forecasts should be anchored to fed funds futures pricing — diverging from market-implied probabilities requires strong evidence.',
    ],
    probabilityValidationRules: [
      'If forecast differs from market-implied probability by >10pp, document the specific evidence driving the divergence.',
      'Verify that release timing is accounted for — a BLS release scheduled before resolution can change everything.',
      'Check for monotonicity in multi-threshold forecasts (e.g., "GDP growth >2%, >3%, >4%" should be monotonically decreasing).',
    ],
    primarySources: [
      'Federal Reserve (federalreserve.gov)',
      'Bureau of Labor Statistics (bls.gov)',
      'Bureau of Economic Analysis (bea.gov)',
      'IMF Data (imf.org)',
      'World Bank Open Data (worldbank.org)',
    ],
    noMoveGuidance: 'Macro markets are efficient. Fed funds futures are excellent priors. If your forecast matches the market-implied probability, that is a valid outcome — do not adjust for the sake of adjusting.',
  },

  competitive_strategy: {
    category: 'competitive_strategy',
    label: 'Competitive Strategy Forecasting',
    evidenceHierarchy: [
      'Company earnings calls and SEC filings (10-K, 10-Q, 8-K)',
      'Industry analyst reports (Gartner, Forrester, IDC)',
      'Patent filings and trademark applications',
      'Hiring patterns (LinkedIn job postings)',
      'Supply chain signals (supplier announcements, shipping data)',
      'Trade press and industry conferences',
    ],
    domainTraps: [
      'Conflating announced intentions with actual execution — companies announce more than they deliver.',
      'Ignoring game-theoretic dynamics — competitor responses are endogenous, not exogenous.',
      'Overweighting recent product launches — the strategic picture changes slowly.',
      'Survivorship bias — analyzing only successful competitors misses the graveyard of failed moves.',
    ],
    calibrationWarnings: [
      'Market entry forecasts are systematically overconfident — most announced market entries face delays or scope reductions.',
      'Competitive response forecasts should account for the competitor\'s own incentive structure, not just your analysis.',
    ],
    probabilityValidationRules: [
      'If predicting a competitor move, verify the move is consistent with their stated strategy and resource constraints.',
      'Check that the forecast accounts for at least 2 alternative competitive responses.',
      'For M&A forecasts, verify regulatory feasibility before assigning >50% probability.',
    ],
    primarySources: [
      'SEC EDGAR (sec.gov/edgar)',
      'USPTO (uspto.gov)',
      'Company investor relations pages',
      'Gartner / Forrester / IDC reports',
    ],
    noMoveGuidance: 'If the competitive analysis relies on public information that competitors also have access to, the strategic insight is likely already incorporated into market expectations. Move only if you have a structural insight about incentive misalignment.',
  },

  negotiation: {
    category: 'negotiation',
    label: 'Negotiation Outcome Forecasting',
    evidenceHierarchy: [
      'Stated positions and public statements from all parties',
      'BATNA analysis (Best Alternative to Negotiated Agreement)',
      'Historical negotiation outcomes in similar contexts',
      'Third-party mediator statements',
      'Public opinion polls (for political negotiations)',
      'Expert analysis of negotiation dynamics',
    ],
    domainTraps: [
      'Anchoring on stated positions — opening positions are almost always more extreme than reservation points.',
      'Ignoring zone of possible agreement (ZOPA) — if ZOPA doesn\'t exist, no agreement is possible regardless of skill.',
      'Overweighting deadlines — deadlines sometimes produce agreements but often produce extensions.',
      'Conflating negotiation skill with outcome strength — a skilled negotiator may still get a bad deal if their BATNA is weak.',
    ],
    calibrationWarnings: [
      'Agreement probabilities are typically overestimated — most negotiations fail to produce agreement.',
      'Deadlines increase probability of agreement but decrease quality of agreement for the party under time pressure.',
    ],
    probabilityValidationRules: [
      'Verify that ZOPA exists before assigning >50% agreement probability.',
      'If one party\'s BATNA is clearly superior, agreement probability should be <40%.',
      'Account for at least 2 breakdown scenarios (walk-away, escalation, delay).',
    ],
    primarySources: [
      'Official statements from negotiating parties',
      'Mediator press releases',
      'Historical treaty/agreement databases',
    ],
    noMoveGuidance: 'Negotiation outcomes are inherently uncertain. If both parties\' positions are public and widely analyzed, the market has likely priced in the most likely outcome. Move only if you have insight into reservation points that the public analysis misses.',
  },

  technology: {
    category: 'technology',
    label: 'Technology & Innovation Forecasting',
    evidenceHierarchy: [
      'Peer-reviewed research papers',
      'Patent filings and grant data',
      'Company R&D spending and hiring patterns',
      'Industry conference presentations',
      'Venture capital investment trends',
      'Technology analyst reports',
    ],
    domainTraps: [
      'Overestimating adoption speed — technology takes longer to deploy than to invent.',
      'Ignoring regulatory barriers — FDA, FCC, EU AI Act can delay or block deployment.',
      'Conflating technical feasibility with commercial viability.',
      'Hype cycles — Gartner hype cycle positions are useful reality checks.',
    ],
    calibrationWarnings: [
      'Technology timelines are systematically overestimated — multiply estimated time-to-deployment by 1.5-2x.',
      'Breakthrough probability forecasts should be anchored to historical base rates of similar technologies.',
    ],
    probabilityValidationRules: [
      'If predicting a technology milestone, verify it has been demonstrated in a relevant environment (not just lab conditions).',
      'Check that regulatory pathway is accounted for.',
      'For adoption forecasts, verify the technology addresses a real pain point with no cheaper alternative.',
    ],
    primarySources: [
      'USPTO patent database',
      'NIH grant database (reporter.nih.gov)',
      'arXiv and peer-reviewed journals',
      'FDA clinical trial registry',
    ],
    noMoveGuidance: 'Technology forecasts are particularly susceptible to hype. If the technology is widely discussed in tech press, the market has likely already priced in the optimistic scenario. Move only if you have insight into technical barriers or regulatory timelines that the mainstream narrative misses.',
  },

  commodity: {
    category: 'commodity',
    label: 'Commodity & Resource Forecasting',
    evidenceHierarchy: [
      'Exchange-traded futures and options pricing',
      'EIA / IEA official inventory and production data',
      'OPEC+ production decisions and statements',
      'Shipping and logistics data (Baltic Exchange, freight rates)',
      'Weather forecasts (for agricultural commodities)',
      'Geopolitical risk premium analysis',
    ],
    domainTraps: [
      'Ignoring contango/backwardation — futures curve shape contains market expectations.',
      'Overweighting supply disruptions without checking inventory buffer.',
      'Conflating nominal price movements with real price movements (inflation adjustment).',
      'Ignoring substitution effects — high prices trigger demand destruction and substitution.',
    ],
    calibrationWarnings: [
      'Commodity price forecasts should be anchored to futures curves — diverging requires strong evidence.',
      'Supply disruption probabilities should account for historical frequency of similar disruptions.',
    ],
    probabilityValidationRules: [
      'If forecast implies a price >20% away from futures curve, document the specific supply/demand imbalance.',
      'Verify that inventory levels and spare capacity are accounted for.',
      'Check for substitution effects at the forecasted price level.',
    ],
    primarySources: [
      'EIA (eia.gov)',
      'IEA (iea.org)',
      'CME Group futures data',
      'Bloomberg commodity pricing',
    ],
    noMoveGuidance: 'Commodity markets are among the most efficient. Futures curves are excellent priors. If your forecast matches the futures-implied probability, that is the correct outcome — do not adjust without a specific supply/demand insight.',
  },

  social_policy: {
    category: 'social_policy',
    label: 'Social Policy & Public Forecasting',
    evidenceHierarchy: [
      'Legislative text and committee reports',
      'Public opinion polls (Gallup, Pew, Gallup)',
      'Election results and demographic trends',
      'Court rulings and legal analysis',
      'Think-tank policy analyses',
      'Historical policy outcomes in similar jurisdictions',
    ],
    domainTraps: [
      'Conflating public support with legislative probability — popular policies often fail to pass due to institutional barriers.',
      'Ignoring path dependency — policy change is incremental, not revolutionary.',
      'Overweighting salient events — a single high-profile incident does not usually change policy trajectories.',
      'Ignoring implementation gaps — policy passage ≠ policy implementation.',
    ],
    calibrationWarnings: [
      'Policy passage forecasts should account for institutional veto points (filibuster, court challenges, regulatory implementation).',
      'Social change forecasts are typically overconfident in the short term and underconfident in the long term.',
    ],
    probabilityValidationRules: [
      'If predicting policy passage, verify the path through all institutional veto points.',
      'Check that public opinion is stable enough to sustain political will through the legislative process.',
      'Account for at least 2 alternative policy outcomes (partial passage, amendment, delay).',
    ],
    primarySources: [
      'Congress.gov (legislative text and status)',
      'Gallup / Pew Research polls',
      'SCOTUSblog (for court-related forecasts)',
      'National Conference of State Legislatures',
    ],
    noMoveGuidance: 'Policy forecasting is inherently uncertain. If the legislative path is clear and widely analyzed, the market has likely priced in the outcome. Move only if you have insight into whip counts, backroom deals, or institutional dynamics that public analysis misses.',
  },

  general: {
    category: 'general',
    label: 'General Strategic Forecasting',
    evidenceHierarchy: [
      'Official/primary sources specific to the question',
      'Expert analysis and commentary',
      'News reporting from multiple outlets',
      'Historical analogues and base rates',
      'Structured models (game-theoretic, statistical)',
      'Crowd wisdom and prediction market prices',
    ],
    domainTraps: [
      'Overconfidence in unique scenarios — most "unique" situations have historical analogues.',
      'Ignoring base rates — the default outcome is usually more likely than the dramatic one.',
      'Conflating correlation with causation in evidence assessment.',
      'Anchoring on the first probability estimate encountered.',
    ],
    calibrationWarnings: [
      'General forecasts in the 40-60% range are typically poorly calibrated — consider whether you truly have enough information to distinguish from 50%.',
      'Long-horizon forecasts (>12 months) have systematically higher Brier scores — widen confidence bands.',
    ],
    probabilityValidationRules: [
      'If probability is between 45-55%, consider whether "no move" (returning the prior) is the more honest outcome.',
      'Verify that at least 3 evidence sources support the adjustment direction.',
      'Check that the forecast accounts for at least 2 alternative outcomes.',
    ],
    primarySources: [
      'Domain-specific official sources',
      'Peer-reviewed research',
      'Government statistics',
    ],
    noMoveGuidance: 'When in doubt, default to the prior. "No move" is a valid and often the correct outcome. The strongest version of the forecast is not the most aggressive one — it is the one that only moves when evidence genuinely justifies it.',
  },
}

/**
 * Route a forecast question to the appropriate skill file based on its intent.
 */
export function routeForecastSkill(intent: string | undefined): ForecastSkillFile {
  if (!intent) return FORECAST_SKILLS.general

  const intentMap: Record<string, ForecastSkillCategory> = {
    global_geopolitics: 'geopolitical',
    middle_east_conflict: 'geopolitical',
    country_politics: 'geopolitical',
    macroeconomy: 'macroeconomic',
    inflation: 'macroeconomic',
    asset_allocation: 'macroeconomic',
    commodity_safe_haven: 'commodity',
    local_climate_risk: 'social_policy',
    global_disaster_risk: 'geopolitical',
    technology_society: 'technology',
    generic_public_analysis: 'general',
  }

  const category = intentMap[intent] ?? 'general'
  return FORECAST_SKILLS[category]
}

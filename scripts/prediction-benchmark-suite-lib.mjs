export const QUESTION_REGISTER_COLUMNS = [
  'question_id',
  'title',
  'question_text',
  'niche',
  'source_surface',
  'created_at',
  'forecast_opened_at',
  'forecast_due_at',
  'scheduled_close_at',
  'resolution_criteria',
  'expected_resolution_source_url',
  'ambiguity_policy',
  'exclusion_rule',
  'decision_relevance',
  'owner',
  'public_or_private',
  'notes',
];

export const FORECAST_SNAPSHOT_COLUMNS = [
  'snapshot_id',
  'question_id',
  'prediction_source',
  'forecaster_type',
  'model_or_team',
  'probability',
  'prediction_timestamp',
  'evidence_bundle_ref',
  'prompt_or_policy_version',
  'retrieval_cutoff',
  'source_cutoff',
  'abstained',
  'abstention_reason',
  'notes',
];

export const BASELINE_SNAPSHOT_COLUMNS = [
  'baseline_snapshot_id',
  'question_id',
  'baseline_type',
  'label',
  'probability',
  'prediction_timestamp',
  'source_url',
  'sample_size',
  'timestamp_policy',
  'comparability_notes',
  'notes',
];

export const SCORECARD_COLUMNS = [
  'scorecard_row_id',
  'question_id',
  'category',
  'track',
  'app_source',
  'app_probability',
  'external_baseline_id',
  'external_probability',
  'prediction_timestamp',
  'resolution_outcome',
  'resolved_at',
  'brier_score',
  'log_score',
  'calibration_bin',
  'coverage_status',
  'leakage_status',
  'claim_tier',
  'notes',
];

export const PROVIDER_MAP_COLUMNS = [
  'provider_id',
  'provider_name',
  'provider_type',
  'public_access',
  'read_only_endpoint',
  'probability_field_policy',
  'question_mapping_policy',
  'claim_boundary',
];

export const TOP_10_SCENARIOS = [
  {
    id: 'pbq-geo-escalation-001',
    category: 'geopolitical_escalation',
    title: 'Major conflict escalation monitor',
    question: 'Will the CFR Global Conflict Tracker classify at least one monitored conflict as worsening by 2026-09-30?',
    resolutionDate: '2026-09-30T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.cfr.org/global-conflict-tracker',
    resolutionCriteria: 'Resolve yes if the CFR Global Conflict Tracker lists any monitored conflict with a worsening status on or before 2026-09-30 compared with the 2026-06-07 benchmark packet review date; otherwise resolve no.',
    ambiguityPolicy: 'If CFR changes labels or the tracker is unavailable, use archived CFR pages and reviewer notes; unresolved label drift stays excluded.',
    exclusionRule: 'Exclude if the source retires the tracker or no archived status comparison can be established.',
    decisionRelevance: 'Stress-tests geopolitical escalation reasoning for strategic risk buyers.',
    sourceSurface: 'CFR Global Conflict Tracker',
    baselineQueries: ['CFR conflict tracker worsening 2026', 'Metaculus conflict escalation 2026', 'Polymarket conflict escalation 2026'],
  },
  {
    id: 'pbq-election-policy-002',
    category: 'election_policy',
    title: 'G7 leadership change outcome',
    question: 'Will any G7 country install a new head of government through a national election or parliamentary confidence process by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.idea.int/data-tools/data/election-database',
    resolutionCriteria: 'Resolve yes if an official G7 government source or IDEA election record confirms a new head of government took office through a national election or parliamentary confidence process by 2026-12-31; otherwise resolve no.',
    ambiguityPolicy: 'Caretaker, acting, or interim changes count only when the official head-of-government office changes.',
    exclusionRule: 'Exclude cabinet reshuffles without a head-of-government change.',
    decisionRelevance: 'Tests political-transition forecasts relevant to country-risk and policy buyers.',
    sourceSurface: 'IDEA election database plus official government pages',
    baselineQueries: ['G7 head of government change 2026 Metaculus', 'G7 election leadership change prediction market'],
  },
  {
    id: 'pbq-fed-rates-003',
    category: 'central_bank_macro',
    title: 'Federal Reserve easing surprise',
    question: 'Will the FOMC target range upper bound be at least 50 basis points lower on 2026-09-30 than the range in force on 2026-06-07?',
    resolutionDate: '2026-09-30T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.federalreserve.gov/monetarypolicy/openmarket.htm',
    resolutionCriteria: 'Resolve yes if the Federal Reserve implementation note or FOMC statement in force on 2026-09-30 shows an upper bound at least 50 bps below the target range in force on 2026-06-07; otherwise resolve no.',
    ambiguityPolicy: 'If the target-rate framework changes, convert to the nearest official target-range upper-bound equivalent by reviewer note.',
    exclusionRule: 'Exclude if official Federal Reserve target-rate publication is unavailable for the resolution date.',
    decisionRelevance: 'Tests macro policy prediction under market-sensitive conditions.',
    sourceSurface: 'Federal Reserve FOMC target range',
    baselineQueries: ['Fed funds target range September 2026 prediction market', 'Metaculus Federal Reserve rate cuts 2026'],
  },
  {
    id: 'pbq-energy-brent-004',
    category: 'energy_supply_shock',
    title: 'Brent crude upside shock',
    question: 'Will front-month Brent crude settle above USD 95 on any trading day by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.ice.com/products/219/Brent-Crude-Futures/data',
    resolutionCriteria: 'Resolve yes if ICE or another reviewer-approved market data source records a front-month Brent crude settlement above USD 95 on any trading day through 2026-12-31; otherwise resolve no.',
    ambiguityPolicy: 'If ICE public pages are unavailable, use EIA or CME-compatible public market data with the same front-month contract definition.',
    exclusionRule: 'Exclude intraday prints without a settlement price.',
    decisionRelevance: 'Tests energy-shock forecasting for procurement, commodities, and country-risk workflows.',
    sourceSurface: 'ICE Brent futures settlement data',
    baselineQueries: ['Brent crude above 95 2026 Polymarket', 'Brent oil price 2026 prediction market', 'Metaculus Brent crude 2026'],
  },
  {
    id: 'pbq-gold-safe-haven-005',
    category: 'safe_haven_commodity',
    title: 'Gold safe-haven breakout',
    question: 'Will the LBMA PM gold price exceed USD 3800 per troy ounce on any fixing day by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.lbma.org.uk/prices-and-data/precious-metal-prices',
    resolutionCriteria: 'Resolve yes if the LBMA PM gold price exceeds USD 3800 per troy ounce on any official fixing day through 2026-12-31; otherwise resolve no.',
    ambiguityPolicy: 'If LBMA data access changes, use a reviewer-approved public mirror that identifies the LBMA PM fixing.',
    exclusionRule: 'Exclude spot-price quotes that are not the LBMA PM fixing.',
    decisionRelevance: 'Tests commodity and safe-haven reasoning for inflation and conflict-linked market scenarios.',
    sourceSurface: 'LBMA precious metal prices',
    baselineQueries: ['gold above 3800 2026 prediction market', 'Metaculus gold price 2026', 'Polymarket gold 2026'],
  },
  {
    id: 'pbq-equity-drawdown-006',
    category: 'equity_volatility',
    title: 'S&P 500 drawdown risk',
    question: 'Will the S&P 500 close at least 10 percent below its 2026-06-07 reference close on any trading day by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.spglobal.com/spdji/en/indices/equity/sp-500/',
    resolutionCriteria: 'Resolve yes if S&P Dow Jones Indices or an approved public market-data source records an S&P 500 close at least 10 percent below the closing level used for the 2026-06-07 benchmark packet; otherwise resolve no.',
    ambiguityPolicy: 'If index methodology changes, use the official S&P 500 closing level under the prevailing methodology.',
    exclusionRule: 'Exclude intraday lows, futures, ETFs, or unofficial derived closes.',
    decisionRelevance: 'Tests cross-asset market shock prediction tied to executive risk decisions.',
    sourceSurface: 'S&P Dow Jones Indices closing level',
    baselineQueries: ['S&P 500 drawdown 2026 prediction market', 'Metaculus S&P 500 2026', 'Kalshi S&P 500 market 2026'],
  },
  {
    id: 'pbq-fx-sovereign-007',
    category: 'fx_sovereign_risk',
    title: 'US dollar index upside risk',
    question: 'Will the US Dollar Index close above 110 on any trading day by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.ice.com/products/194/US-Dollar-Index-Futures/data',
    resolutionCriteria: 'Resolve yes if ICE or another approved public market-data source records a US Dollar Index closing level above 110 on any trading day through 2026-12-31; otherwise resolve no.',
    ambiguityPolicy: 'If public ICE data is unavailable, use a reviewer-approved public source that explicitly tracks DXY closing levels.',
    exclusionRule: 'Exclude intraday prints, futures-only settlement proxies, or non-DXY dollar baskets.',
    decisionRelevance: 'Tests FX and sovereign-risk signal fusion for globally exposed buyers.',
    sourceSurface: 'ICE US Dollar Index data',
    baselineQueries: ['DXY above 110 2026 prediction market', 'US Dollar Index forecast Metaculus 2026'],
  },
  {
    id: 'pbq-trade-dispute-008',
    category: 'trade_supply_chain',
    title: 'Major trade-dispute initiation',
    question: 'Will the WTO publish a new dispute involving the United States, European Union, or China as a complainant or respondent by 2026-12-31?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.wto.org/english/tratop_e/dispu_e/dispu_status_e.htm',
    resolutionCriteria: 'Resolve yes if the WTO dispute settlement database publishes a new dispute number by 2026-12-31 where the United States, European Union, or China is a complainant or respondent; otherwise resolve no.',
    ambiguityPolicy: 'Use the WTO publication date and named parties; consultation requests count when assigned a WTO dispute number.',
    exclusionRule: 'Exclude press speculation, domestic cases, or disputes without a WTO dispute number.',
    decisionRelevance: 'Tests tariff and supply-chain disruption forecasting for corporate strategy buyers.',
    sourceSurface: 'WTO dispute settlement database',
    baselineQueries: ['WTO dispute US EU China 2026 prediction market', 'Metaculus trade dispute 2026'],
  },
  {
    id: 'pbq-climate-disaster-009',
    category: 'climate_disaster',
    title: 'Atlantic major hurricane occurrence',
    question: 'Will NOAA report at least one Atlantic named storm reaching Category 4 or 5 intensity by 2026-11-30?',
    resolutionDate: '2026-11-30T23:59:00.000Z',
    resolutionSourceUrl: 'https://www.nhc.noaa.gov/data/',
    resolutionCriteria: 'Resolve yes if NOAA/NHC best-track or public advisory data reports at least one Atlantic named storm reaching Category 4 or 5 intensity during the 2026 Atlantic hurricane season by 2026-11-30; otherwise resolve no.',
    ambiguityPolicy: 'Use post-season best-track updates if advisory and best-track intensity conflict.',
    exclusionRule: 'Exclude non-Atlantic storms and systems without named-storm status.',
    decisionRelevance: 'Tests disaster-risk forecasting with public scientific data sources.',
    sourceSurface: 'NOAA/NHC hurricane data',
    baselineQueries: ['2026 Atlantic hurricane Category 4 prediction market', 'Metaculus hurricane 2026'],
  },
  {
    id: 'pbq-ai-regulation-010',
    category: 'ai_cyber_regulation',
    title: 'EU AI Act high-risk timing change',
    question: 'Will the EU publish binding law by 2026-12-31 that delays the first application date for EU AI Act high-risk AI obligations?',
    resolutionDate: '2026-12-31T23:59:00.000Z',
    resolutionSourceUrl: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
    resolutionCriteria: 'Resolve yes if EUR-Lex publishes binding EU law by 2026-12-31 that delays the first application date for high-risk AI obligations under Regulation 2024/1689; otherwise resolve no.',
    ambiguityPolicy: 'Guidance, consultation papers, or non-binding announcements do not count unless followed by binding law.',
    exclusionRule: 'Exclude delays limited to unrelated AI Act provisions.',
    decisionRelevance: 'Tests AI regulation and compliance-timing forecasts for enterprise and public-sector buyers.',
    sourceSurface: 'EUR-Lex EU AI Act legal text',
    baselineQueries: ['EU AI Act high risk delay prediction market', 'Metaculus EU AI Act 2026', 'AI regulation 2026 FutureEval'],
  },
];

export const PUBLIC_BASELINE_PROVIDERS = [
  {
    provider_id: 'forecastbench',
    provider_name: 'ForecastBench',
    provider_type: 'ai_forecasting_benchmark',
    public_access: 'public_methodology_external_submission',
    read_only_endpoint: 'https://www.forecastbench.org/about/',
    probability_field_policy: 'Use submitted model probability and Brier Index only when question mapping is accepted by evaluator.',
    question_mapping_policy: 'Same question or documented comparable ForecastBench market/dataset question only.',
    claim_boundary: 'Methodology and ranking anchor, not automatic same-question baseline.',
  },
  {
    provider_id: 'futureeval_metaculus',
    provider_name: 'Metaculus FutureEval',
    provider_type: 'ai_and_human_forecasting_benchmark',
    public_access: 'public_leaderboard_and_methodology',
    read_only_endpoint: 'https://www.metaculus.com/futureeval/',
    probability_field_policy: 'Use bot, community, or pro forecast only when the same Metaculus question is mapped and timestamped.',
    question_mapping_policy: 'Same Metaculus question preferred; comparable question requires reviewer approval.',
    claim_boundary: 'Compare only on shared or documented comparable resolved questions.',
  },
  {
    provider_id: 'polymarket',
    provider_name: 'Polymarket',
    provider_type: 'prediction_market',
    public_access: 'public_market_data_apis',
    read_only_endpoint: 'https://gamma-api.polymarket.com/markets',
    probability_field_policy: 'Use midpoint of best bid/ask when spread is narrow; otherwise use last traded price with spread caveat.',
    question_mapping_policy: 'Mapped market resolution language must match the benchmark question or be excluded.',
    claim_boundary: 'Market-implied probability, not human/pro forecaster proof.',
  },
  {
    provider_id: 'manifold',
    provider_name: 'Manifold',
    provider_type: 'social_prediction_market',
    public_access: 'public_api_and_data_dumps',
    read_only_endpoint: 'https://docs.manifold.markets/',
    probability_field_policy: 'Use public market probability only when market resolution criteria match.',
    question_mapping_policy: 'Mapped market must be binary and same-direction after fee/currency caveats are reviewed.',
    claim_boundary: 'Community-market baseline with social-market liquidity caveats.',
  },
  {
    provider_id: 'kalshi',
    provider_name: 'Kalshi',
    provider_type: 'regulated_event_market',
    public_access: 'public_market_data_api',
    read_only_endpoint: 'https://api.elections.kalshi.com/trade-api/v2/markets',
    probability_field_policy: 'Use market price as implied probability after bid/ask and fee caveats are captured.',
    question_mapping_policy: 'Mapped event contract must match resolution criteria and time boundary.',
    claim_boundary: 'Regulated market baseline where matching markets exist.',
  },
];

export const CHALLENGER_LANES = [
  {
    lane_id: 'current_app_lane',
    label: 'Current app registry and multi-agent role-weighted forecast',
    mechanism: 'Use existing forecast registry, consensus, and calibration governance.',
    promotion_gate: 'Default lane until a challenger wins on resolved same-question rows.',
  },
  {
    lane_id: 'aia_style_llm_forecaster',
    label: 'AIA-style LLM forecaster',
    mechanism: 'Retrieval, base rates, decomposition, premortem, supervisor reconciliation, and statistical calibration.',
    promotion_gate: 'Shadow-only until leakage review passes and holdout Brier/log loss beats current app lane.',
  },
  {
    lane_id: 'market_consensus_lane',
    label: 'Public market consensus',
    mechanism: 'Use Polymarket, Manifold, and Kalshi implied probabilities when liquid and comparable.',
    promotion_gate: 'Eligible as ensemble feature only; never a standalone world-class proof.',
  },
  {
    lane_id: 'time_series_lane',
    label: 'Macro, market, energy, and commodity time-series forecaster',
    mechanism: 'Use Nixtla/StatsForecast-style probabilistic horizons for structured time-series questions.',
    promotion_gate: 'Only for source-backed numeric or threshold questions with clean historical series.',
  },
  {
    lane_id: 'calibration_meta_ensemble_lane',
    label: 'Calibration and meta-ensemble',
    mechanism: 'Use sigmoid/isotonic calibration, then stacking only after enough resolved rows.',
    promotion_gate: 'No stacking before minimum resolved samples; per-domain calibration must be reported.',
  },
  {
    lane_id: 'drift_monitor_lane',
    label: 'Online drift monitoring',
    mechanism: 'Track changing evidence distributions and forecast-age risk.',
    promotion_gate: 'Alerting lane, not direct probability source.',
  },
];

export function normalizeProbability(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (numeric >= 0 && numeric <= 1) return numeric;
  if (numeric > 1 && numeric <= 100) return numeric / 100;
  return null;
}

export function brierScore(probability, outcome) {
  const p = normalizeProbability(probability);
  const y = Number(outcome);
  if (p === null || ![0, 1].includes(y)) return null;
  return (p - y) ** 2;
}

export function logScore(probability, outcome) {
  const p = normalizeProbability(probability);
  const y = Number(outcome);
  if (p === null || ![0, 1].includes(y)) return null;
  const clipped = Math.min(1 - 1e-15, Math.max(1e-15, p));
  return y === 1 ? -Math.log(clipped) : -Math.log(1 - clipped);
}

export function calibrationBin(probability, bins = 5) {
  const p = normalizeProbability(probability);
  if (p === null || !Number.isInteger(bins) || bins < 2) return null;
  const index = Math.min(bins - 1, Math.floor(p * bins));
  const min = index / bins;
  const max = (index + 1) / bins;
  return `${min.toFixed(2)}-${max.toFixed(2)}`;
}

export function marketPriceToProbability({ bestBid = null, bestAsk = null, lastTrade = null, maxMidpointSpread = 0.1 } = {}) {
  const bid = normalizeProbability(bestBid);
  const ask = normalizeProbability(bestAsk);
  const last = normalizeProbability(lastTrade);
  if (bid !== null && ask !== null && ask >= bid && ask - bid <= maxMidpointSpread) {
    return {
      probability: Math.round(((bid + ask) / 2) * 1_000_000) / 1_000_000,
      method: 'bid_ask_midpoint',
      spread: Math.round((ask - bid) * 1_000_000) / 1_000_000,
    };
  }
  if (last !== null) {
    return {
      probability: last,
      method: 'last_trade_due_to_wide_or_missing_spread',
      spread: bid !== null && ask !== null && ask >= bid ? Math.round((ask - bid) * 1_000_000) / 1_000_000 : null,
    };
  }
  return {
    probability: null,
    method: 'no_public_price_available',
    spread: bid !== null && ask !== null && ask >= bid ? Math.round((ask - bid) * 1_000_000) / 1_000_000 : null,
  };
}

export function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvLine(columns) {
  return columns.map(csvCell).join(',');
}

export function rowsToCsv(columns, rows) {
  return [
    csvLine(columns),
    ...rows.map((row) => csvLine(columns.map((column) => row[column] ?? ''))),
  ].join('\n') + '\n';
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function isoPlusDays(baseIso, days) {
  const date = new Date(baseIso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function buildPredictionBenchmarkSuite({
  generatedAt = new Date().toISOString(),
  owner = 'forecast-evaluation-reviewer',
  dateSuffix = '2026-06-07',
} = {}) {
  const questionRows = TOP_10_SCENARIOS.map((scenario) => ({
    question_id: scenario.id,
    title: scenario.title,
    question_text: scenario.question,
    niche: scenario.category,
    source_surface: scenario.sourceSurface,
    created_at: generatedAt,
    forecast_opened_at: generatedAt,
    forecast_due_at: isoPlusDays(generatedAt, 7),
    scheduled_close_at: scenario.resolutionDate,
    resolution_criteria: scenario.resolutionCriteria,
    expected_resolution_source_url: scenario.resolutionSourceUrl,
    ambiguity_policy: scenario.ambiguityPolicy,
    exclusion_rule: scenario.exclusionRule,
    decision_relevance: scenario.decisionRelevance,
    owner,
    public_or_private: 'private_prelaunch_benchmark',
    notes: 'Cross-domain top-10 situation row; score only after frozen probabilities and outcomes exist.',
  }));

  const forecastSnapshotRows = TOP_10_SCENARIOS.map((scenario) => ({
    snapshot_id: `${scenario.id}-current-app-abstain-v1`,
    question_id: scenario.id,
    prediction_source: 'strategic_intelligence_platform',
    forecaster_type: 'app_lane',
    model_or_team: 'current_registry_multi_agent_role_weighted',
    probability: '',
    prediction_timestamp: generatedAt,
    evidence_bundle_ref: `docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.json`,
    prompt_or_policy_version: 'prediction-benchmark-suite-v1',
    retrieval_cutoff: generatedAt,
    source_cutoff: generatedAt,
    abstained: 'true',
    abstention_reason: 'No frozen app probability captured yet.',
    notes: 'Prelaunch planning row; replace with captured app probability before scoring.',
  }));

  const baselineSnapshotRows = TOP_10_SCENARIOS.map((scenario) => ({
    baseline_snapshot_id: `${scenario.id}-trivial-prior-v1`,
    question_id: scenario.id,
    baseline_type: 'trivial_prior',
    label: 'Trivial 50 percent binary prior',
    probability: '0.5',
    prediction_timestamp: generatedAt,
    source_url: scenario.resolutionSourceUrl,
    sample_size: '1',
    timestamp_policy: 'Captured at benchmark-suite generation before resolution.',
    comparability_notes: 'Same binary question; sanity baseline only, not public engine parity.',
    notes: 'Use as minimum control until public engine snapshot is captured.',
  }));

  const scorecardRows = TOP_10_SCENARIOS.map((scenario) => ({
    scorecard_row_id: `${scenario.id}-live-shadow-v1`,
    question_id: scenario.id,
    category: scenario.category,
    track: 'live_shadow',
    app_source: 'current_registry_multi_agent_role_weighted',
    app_probability: '',
    external_baseline_id: `${scenario.id}-trivial-prior-v1`,
    external_probability: '0.5',
    prediction_timestamp: generatedAt,
    resolution_outcome: '',
    resolved_at: '',
    brier_score: '',
    log_score: '',
    calibration_bin: '',
    coverage_status: 'awaiting_app_probability',
    leakage_status: 'not_reviewed',
    claim_tier: 'mechanics_only',
    notes: 'Unresolved row; not accuracy proof.',
  }));

  const providerRows = PUBLIC_BASELINE_PROVIDERS.map((provider) => ({ ...provider }));

  const suite = {
    schema_version: 'prediction-benchmark-suite-v1',
    generated_at: generatedAt,
    status: 'benchmark_suite_ready_for_pre_resolution_capture_not_accuracy_proof',
    proof_boundary: 'This suite creates a top-10 benchmark register, abstained app snapshot placeholders, trivial prior controls, public baseline provider map, and scorecard scaffold. It does not prove prediction accuracy, top-three status, hosted behavior, buyer validation, or benchmark superiority.',
    selected_defaults: {
      benchmark_mode: 'offline_replay_plus_live_shadow',
      baseline_scope: 'public_open_only',
      scenario_source: 'standard_cross_domain_top_10',
      private_engine_access_assumed: false,
    },
    summary: {
      top_10_question_count: questionRows.length,
      forecast_snapshot_rows: forecastSnapshotRows.length,
      app_probability_rows_captured: forecastSnapshotRows.filter((row) => normalizeProbability(row.probability) !== null && row.abstained !== 'true').length,
      abstained_app_rows: forecastSnapshotRows.filter((row) => row.abstained === 'true').length,
      baseline_snapshot_rows: baselineSnapshotRows.length,
      public_baseline_provider_count: providerRows.length,
      scorecard_rows: scorecardRows.length,
      accuracy_claim_allowed: false,
      top_three_claim_allowed: false,
    },
    methodology_sources: [
      'https://www.forecastbench.org/about/',
      'https://www.metaculus.com/futureeval/methodology/',
      'https://www.metaculus.com/futureeval/',
      'https://arxiv.org/abs/2511.07678',
      'https://arxiv.org/abs/2604.26106',
      'https://docs.polymarket.com/api-reference/introduction',
      'https://docs.polymarket.com/concepts/prices-orderbook',
      'https://docs.manifold.markets/',
      'https://help.kalshi.com/en/articles/13823854-kalshi-api',
      'https://scikit-learn.org/stable/modules/calibration.html',
      'https://nixtlaverse.nixtla.io/neuralforecast/docs/tutorials/uncertainty_quantification.html',
    ],
    public_baseline_fetchers: providerRows,
    challenger_lanes: CHALLENGER_LANES,
    promotion_rules: [
      {
        tier: 'mvp',
        allowed_claim: 'benchmark-instrumented, calibration-aware strategic forecasting workflow',
        minimum_conditions: ['top-10 register exists', 'pre-resolution capture packet validates', 'claim copy avoids accuracy superiority'],
      },
      {
        tier: 'pilot_accuracy',
        allowed_claim: 'internal pilot calibration report on documented resolved rows',
        minimum_conditions: ['at least 25 resolved same-question rows for one source', 'Brier score and reliability bins reported', 'leakage review passed'],
      },
      {
        tier: 'top_three_candidate',
        allowed_claim: 'candidate for top-three web-app forecasting review',
        minimum_conditions: ['at least 100 resolved rows', 'at least 5 categories covered', 'ranked top 3 by Brier or log-skill against chosen public/open pool', 'independent benchmark review or accepted external benchmark'],
      },
    ],
    forecast_benchmark_questions: questionRows,
    forecast_pre_resolution_snapshots: forecastSnapshotRows,
    forecast_baseline_snapshots: baselineSnapshotRows,
    forecast_scorecard_rows: scorecardRows,
    next_commands: [
      `npm run audit:forecast:benchmark-suite:validate -- --suite docs/launch-readiness/prediction-benchmark-suite-${dateSuffix}.json`,
      `npm run audit:forecast:validate-pre-resolution -- --question-register docs/launch-readiness/prediction-benchmark-questions-${dateSuffix}.csv --forecast-snapshot docs/launch-readiness/prediction-benchmark-app-snapshots-${dateSuffix}.csv --baseline-snapshot docs/launch-readiness/prediction-benchmark-baseline-snapshots-${dateSuffix}.csv --min-planned-questions 10`,
      'After real probabilities and outcomes exist, convert the approved rows to the resolved forecast export and run audit:calibration:ledger plus audit:forecast:benchmark.',
    ],
  };

  return {
    suite,
    csvs: {
      questionRegister: rowsToCsv(QUESTION_REGISTER_COLUMNS, questionRows),
      forecastSnapshots: rowsToCsv(FORECAST_SNAPSHOT_COLUMNS, forecastSnapshotRows),
      baselineSnapshots: rowsToCsv(BASELINE_SNAPSHOT_COLUMNS, baselineSnapshotRows),
      scorecard: rowsToCsv(SCORECARD_COLUMNS, scorecardRows),
      providerMap: rowsToCsv(PROVIDER_MAP_COLUMNS, providerRows),
    },
  };
}

export function validatePredictionBenchmarkSuite(suite) {
  const issues = [];
  const questions = Array.isArray(suite?.forecast_benchmark_questions) ? suite.forecast_benchmark_questions : [];
  const snapshots = Array.isArray(suite?.forecast_pre_resolution_snapshots) ? suite.forecast_pre_resolution_snapshots : [];
  const baselines = Array.isArray(suite?.forecast_baseline_snapshots) ? suite.forecast_baseline_snapshots : [];
  const providers = Array.isArray(suite?.public_baseline_fetchers) ? suite.public_baseline_fetchers : [];
  const scorecardRows = Array.isArray(suite?.forecast_scorecard_rows) ? suite.forecast_scorecard_rows : [];
  const questionIds = new Set(questions.map((question) => question.question_id));
  const snapshotQuestionIds = new Set(snapshots.map((snapshot) => snapshot.question_id));
  const baselineQuestionIds = new Set(baselines.map((baseline) => baseline.question_id));
  const categories = new Set(questions.map((question) => question.niche));

  if (questions.length !== 10) issues.push('Expected exactly 10 benchmark questions.');
  if (categories.size !== 10) issues.push('Expected 10 distinct benchmark categories.');
  if (snapshots.length !== questions.length) issues.push('Expected one app snapshot row per question.');
  if (baselines.length !== questions.length) issues.push('Expected one baseline snapshot row per question.');
  if (scorecardRows.length !== questions.length) issues.push('Expected one scorecard row per question.');
  if (providers.length < 5) issues.push('Expected at least five public/open provider descriptors.');
  if (suite?.summary?.accuracy_claim_allowed !== false) issues.push('accuracy_claim_allowed must remain false.');
  if (suite?.summary?.top_three_claim_allowed !== false) issues.push('top_three_claim_allowed must remain false.');

  for (const questionId of questionIds) {
    if (!snapshotQuestionIds.has(questionId)) issues.push(`Missing app snapshot for ${questionId}.`);
    if (!baselineQuestionIds.has(questionId)) issues.push(`Missing baseline snapshot for ${questionId}.`);
  }

  for (const baseline of baselines) {
    if (normalizeProbability(baseline.probability) === null) {
      issues.push(`Baseline ${baseline.baseline_snapshot_id} has invalid probability.`);
    }
  }

  return {
    status: issues.length ? 'failed' : 'passed',
    issue_count: issues.length,
    issues,
  };
}

export function renderPredictionBenchmarkMarkdown(suite) {
  const questionRows = suite.forecast_benchmark_questions
    .map((question, index) => `| ${index + 1} | ${mdCell(question.niche)} | ${mdCell(question.title)} | ${mdCell(question.question_text)} | ${mdCell(question.expected_resolution_source_url)} |`)
    .join('\n');

  const providerRows = suite.public_baseline_fetchers
    .map((provider) => `| ${mdCell(provider.provider_name)} | ${mdCell(provider.provider_type)} | ${mdCell(provider.public_access)} | ${mdCell(provider.claim_boundary)} |`)
    .join('\n');

  const laneRows = suite.challenger_lanes
    .map((lane) => `| ${mdCell(lane.label)} | ${mdCell(lane.mechanism)} | ${mdCell(lane.promotion_gate)} |`)
    .join('\n');

  return `# Prediction Benchmark Suite - ${suite.generated_at.slice(0, 10)}

Status: \`${suite.status}\`

${suite.proof_boundary}

## Summary

| Metric | Value |
|---|---:|
| Top-10 questions | ${suite.summary.top_10_question_count} |
| App probabilities captured | ${suite.summary.app_probability_rows_captured} |
| Abstained app rows | ${suite.summary.abstained_app_rows} |
| Public/open providers mapped | ${suite.summary.public_baseline_provider_count} |
| Accuracy claim allowed | ${suite.summary.accuracy_claim_allowed} |
| Top-three claim allowed | ${suite.summary.top_three_claim_allowed} |

## Top-10 Situations

| # | Category | Title | Question | Resolution Source |
|---:|---|---|---|---|
${questionRows}

## Public/Open Baselines

| Provider | Type | Access | Claim Boundary |
|---|---|---|---|
${providerRows}

## Challenger Lanes

| Lane | Mechanism | Promotion Gate |
|---|---|---|
${laneRows}

## Next Commands

${suite.next_commands.map((command, index) => `${index + 1}. \`${command}\``).join('\n')}
`;
}

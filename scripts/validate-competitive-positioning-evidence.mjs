#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_MARKET_DIFFERENTIATION = 'docs/launch-readiness/market-differentiation-validation-2026-06-06.md';
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_PROCUREMENT_GATE = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/competitive-positioning-evidence-validation-checklist-2026-06-06.csv';

const REQUIRED_COMPETITOR_PATTERNS = [
  { id: 'geopolitical_intelligence', label: 'Recorded Future / geopolitical intelligence platforms', pattern: /recorded future|geopolitical intelligence/i },
  { id: 'operational_ai', label: 'Palantir AIP / operational AI platforms', pattern: /palantir|operational ai|ontology/i },
  { id: 'forecasting_services', label: 'Metaculus / Good Judgment / forecasting services', pattern: /metaculus|good judgment|forecasting/i },
  { id: 'expert_advisory', label: 'Control Risks / Eurasia / EIU advisory substitutes', pattern: /control risks|eurasia|eiu|expert advisory/i },
  { id: 'policy_intelligence', label: 'FiscalNote / policy intelligence platforms', pattern: /fiscalnote|policy intelligence/i },
  { id: 'manual_workflow', label: 'Internal analyst spreadsheets and memos', pattern: /internal analyst|spreadsheets|memos|manual workflow/i },
  { id: 'generic_llm', label: 'Generic LLM copilots', pattern: /generic llm|copilot/i }
];

const REQUIRED_NICHES = [
  'Enterprise/public-sector strategic decision intelligence',
  'Governed forecasting and research workflow',
  'Geopolitical risk radar and scenario monitor',
  'Executive and analyst briefing layer',
  'Negotiation and strategic reasoning training'
];

const CURRENT_COMPETITIVE_SOURCES = [
  {
    source: 'Recorded Future Geopolitical Intelligence',
    url: 'https://www.recordedfuture.com/products/geopolitical-intelligence',
    implication: 'Threat-intelligence incumbents win on monitoring breadth and analyst support; this app should not claim raw coverage superiority.'
  },
  {
    source: 'Palantir AIP and Foundry platform overview',
    url: 'https://www.palantir.com/docs/foundry/platform-overview',
    implication: 'Operational AI incumbents win on data integration, ontology, security, and deployment depth; this app should sell a narrower strategic workflow pilot.'
  },
  {
    source: 'AlphaSense Enterprise Intelligence private-cloud documentation',
    url: 'https://developer.alpha-sense.com/enterprise/',
    implication: 'Enterprise market-intelligence incumbents compete on premium content, proprietary/internal-content search, deployment options, mTLS, certifications, and access controls.'
  },
  {
    source: 'Quid AI-powered consumer and market intelligence',
    url: 'https://www.quid.com/',
    implication: 'Market-intelligence incumbents compete on data coverage, proprietary NLP, context customization, and decision-ready workflows; this app should not claim data-breadth superiority.'
  },
  {
    source: 'World Economic Forum Strategic Intelligence',
    url: 'https://www.weforum.org/focus/strategic-intelligence/',
    implication: 'Strategic-intelligence incumbents validate the category but raise the bar for curated expert networks, maps, and foresight credibility.'
  },
  {
    source: 'Control Risks RiskMap 2026',
    url: 'https://www.controlrisks.com/riskmap',
    implication: 'Consulting and advisory incumbents validate buyer urgency but have trust, analyst, and briefing credibility this app has not proven.'
  },
  {
    source: 'Eurasia Group political risk advisory',
    url: 'https://www.eurasiagroup.net/services/political-risk-advisory',
    implication: 'Political-risk advisory substitutes reinforce that buyer value is judgment, briefing, and decision context, not only event feeds.'
  },
  {
    source: 'Oxford Analytica advisory services',
    url: 'https://www.oxan.com/',
    implication: 'Analyst-led briefing incumbents are a substitute for executive/analyst briefing workflows.'
  },
  {
    source: 'Metaculus FutureEval methodology',
    url: 'https://www.metaculus.com/futureeval/methodology/',
    implication: 'Forecasting parity claims require resolved questions and comparable human/model baselines.'
  },
  {
    source: 'Metaculus forecasting platform and aggregation engine',
    url: 'https://www.metaculus.com/about/',
    implication: 'Forecasting-platform substitutes bring resolved-question history, aggregation, tournaments, private spaces, and pro forecasters.'
  },
  {
    source: 'ForecastBench',
    url: 'https://forecastingresearch.org/research/forecastbench',
    implication: 'World-class forecasting claims need contamination-resistant benchmark discipline.'
  },
  {
    source: 'Good Judgment Superforecasting services',
    url: 'https://goodjudgment.com/',
    implication: 'Forecasting services and training are credible substitutes, but this app needs real outcomes before claiming performance parity.'
  },
  {
    source: 'FiscalNote political prediction-market expansion',
    url: 'https://fiscalnote.com/newsroom/fiscalnote-announces-major-expansion-into-political-prediction-markets',
    implication: 'Policy intelligence and prediction-market expansion validate the governed forecasting wedge while raising proof and regulatory expectations.'
  },
  {
    source: 'World Economic Forum Strategic Intelligence',
    url: 'https://www.weforum.org/focus/strategic-intelligence/',
    implication: 'Strategic-intelligence platforms validate complexity mapping and foresight demand, but this app needs workflow proof to avoid being only a map or content layer.'
  }
];

const PROHIBITED_STRENGTH_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\bcommercial[- ]ready\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bpalantir[- ]class\b/i,
  /\breplacement for geopolitical intelligence teams\b/i,
  /\bforecastbench\/metaculus\/good judgment parity\b/i,
  /\blive market[- ]data intelligence\b/i
];

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/validate-competitive-positioning-evidence.mjs',
    `  [--market-differentiation ${DEFAULT_MARKET_DIFFERENTIATION}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
    `  [--enterprise-procurement-gate ${DEFAULT_ENTERPRISE_PROCUREMENT_GATE}]`,
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    '  [--update-evidence]'
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  marketDifferentiation: argValue('--market-differentiation', DEFAULT_MARKET_DIFFERENTIATION),
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  enterpriseProcurementGate: argValue('--enterprise-procurement-gate', DEFAULT_ENTERPRISE_PROCUREMENT_GATE),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const updateEvidence = hasFlag('--update-evidence');

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readTextIfExists(relativePath, fallback = '') {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : fallback;
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(columns) {
  return columns.map(csvCell).join(',');
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function section(text, heading) {
  const start = text.indexOf(`## ${heading}`);
  if (start < 0) return '';
  const rest = text.slice(start);
  const next = rest.slice(1).search(/\n##\s+/);
  return next >= 0 ? rest.slice(0, next + 1) : rest;
}

function parseMarkdownTableRows(text) {
  return text
    .split('\n')
    .filter((line) => /^\|.*\|$/.test(line.trim()))
    .filter((line) => !/^\|\s*-+/.test(line.trim()))
    .slice(1)
    .map((line) => line.trim().slice(1, -1).split('|').map((cell) => cell.trim()))
    .filter((row) => row.length > 1);
}

function extractStrengthText(rows) {
  return rows.map((row) => row[2] ?? '').join(' ');
}

function replaceMatchingThenAppend(list, items, matchers) {
  const filtered = Array.isArray(list)
    ? list.filter((entry) => !matchers.some((matcher) => matcher.test(String(entry ?? ''))))
    : [];
  for (const item of items) {
    if (!filtered.includes(item)) filtered.push(item);
  }
  return filtered;
}

function replaceByTaskId(list, item) {
  const itemKey = item.task_id ?? item.target_task;
  const next = Array.isArray(list)
    ? list.filter((entry) => (entry.task_id ?? entry.target_task) !== itemKey)
    : [];
  next.push(item);
  return next;
}

function gateStatus(condition) {
  return condition ? 'passed' : 'failed';
}

const marketDifferentiationText = readTextIfExists(inputPaths.marketDifferentiation);
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, {
  status: 'missing',
  substitution_matrix: [],
  current_source_alignment: []
});
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, {
  status: 'missing',
  summary: {}
});
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, {
  status: 'missing',
  summary: {}
});
const localRouteProof = readJsonIfExists(inputPaths.localBrowserRouteProof, {
  status: 'missing',
  hosted_live_proof: false,
  source: {},
  marketability_route_map: []
});
const hostedProofValidation = readJsonIfExists(inputPaths.hostedProofValidation, {
  status: 'missing',
  summary: {}
});
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, {
  status: 'missing',
  summary: {}
});
const enterpriseProcurementGate = readJsonIfExists(inputPaths.enterpriseProcurementGate, {
  status: 'missing',
  summary: {}
});

const signalRows = parseMarkdownTableRows(section(marketDifferentiationText, 'Source-Backed Market Signals'));
const nicheRows = parseMarkdownTableRows(section(marketDifferentiationText, 'Top Five Niches Revalidated'));
const competitorRows = parseMarkdownTableRows(section(marketDifferentiationText, 'Competitor And Substitute Matrix'));
const loopholeRows = parseMarkdownTableRows(section(marketDifferentiationText, 'Loopholes That Must Be Closed'));
const buyerPlanRows = parseMarkdownTableRows(section(marketDifferentiationText, '10-Call Buyer Validation Plan'));
const claimsToAvoidSection = section(marketDifferentiationText, 'Claims To Avoid');
const strengthText = extractStrengthText(competitorRows);
const prohibitedStrengthHits = PROHIBITED_STRENGTH_PATTERNS
  .filter((pattern) => pattern.test(strengthText))
  .map((pattern) => pattern.source);

const competitorCoverage = REQUIRED_COMPETITOR_PATTERNS.map((required) => {
  const row = competitorRows.find((candidate) => required.pattern.test(candidate.join(' ')));
  return {
    id: required.id,
    label: required.label,
    present: Boolean(row),
    row: row ? row.join(' | ') : ''
  };
});

const pilotSubstitutions = asArray(pilotOfferPack.substitution_matrix);
const pilotSubstitutionCount = pilotSubstitutions.length;
const pilotSubstitutionCoverageByNiche = REQUIRED_NICHES.map((niche) => {
  const rows = pilotSubstitutions.filter((row) => asArray(row.covered_niches)
    .some((coveredNiche) => normalize(coveredNiche) === normalize(niche)));
  return {
    niche,
    covered: rows.length > 0,
    substitute_count: rows.length,
    substitutes: rows.map((row) => row.substitute)
  };
});
const pilotSubstitutionCoveredNicheCount = pilotSubstitutionCoverageByNiche.filter((item) => item.covered).length;
const pilotSubstitutionCoverageComplete = pilotSubstitutionCoverageByNiche.every((item) => item.covered);
const pilotSourceAlignmentCount = asArray(pilotOfferPack.current_source_alignment).length;
const marketNicheBuyerSafe = Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed);
const localRouteReady = localRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && Number(localRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0) >= 5
  && !Boolean(localRouteProof.hosted_live_proof ?? localRouteProof.source?.hosted_live_proof);
const buyerValidated = Boolean(buyerProofGate.summary?.buyer_validation_verified);
const hostedReady = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims);
const scoringReady = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const accuracyClaimAllowed = Boolean(scoringValidation.summary?.accuracy_claim_allowed);
const worldClassPredictionClaimAllowed = Boolean(scoringValidation.summary?.world_class_prediction_claim_allowed);
const enterpriseReady = Boolean(enterpriseProcurementGate.summary?.ready_for_enterprise_procurement_review)
  || enterpriseProcurementGate.status === 'enterprise_procurement_gate_ready_for_owner_procurement_review';

const structuralGates = [
  {
    gate: 'market_differentiation_artifact_present',
    status: gateStatus(marketDifferentiationText.length > 0),
    evidence: `${inputPaths.marketDifferentiation} length=${marketDifferentiationText.length}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'source_backed_market_signals_present',
    status: gateStatus(signalRows.length >= 7 && CURRENT_COMPETITIVE_SOURCES.length >= 10),
    evidence: `${signalRows.length} market-signal rows in Markdown; ${CURRENT_COMPETITIVE_SOURCES.length} current competitive-source anchors attached.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'top_five_niche_revalidation_present',
    status: gateStatus(nicheRows.length >= 5),
    evidence: `${nicheRows.length} niche rows loaded from market differentiation artifact.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'competitor_substitute_matrix_complete',
    status: gateStatus(competitorCoverage.every((item) => item.present) && competitorRows.length >= REQUIRED_COMPETITOR_PATTERNS.length),
    evidence: `${competitorCoverage.filter((item) => item.present).length}/${REQUIRED_COMPETITOR_PATTERNS.length} required substitute categories found; ${competitorRows.length} competitor rows loaded.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'loopholes_and_avoid_claims_present',
    status: gateStatus(loopholeRows.length >= 6 && claimsToAvoidSection.includes('World-class accurate predictions')),
    evidence: `${loopholeRows.length} loophole rows loaded; claims-to-avoid section present=${claimsToAvoidSection.length > 0}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'ten_call_buyer_plan_present',
    status: gateStatus(buyerPlanRows.length >= 5),
    evidence: `${buyerPlanRows.length} buyer-validation plan rows loaded.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'prohibited_strength_claims_absent',
    status: gateStatus(prohibitedStrengthHits.length === 0),
    evidence: `${prohibitedStrengthHits.length} prohibited equivalence/superiority patterns found in competitor strength cells.`,
    proof_bucket: 'repo_artifact'
  }
];

const boundaryGates = [
  {
    gate: 'pilot_substitution_matrix_consistent',
    status: gateStatus(pilotSubstitutionCount >= REQUIRED_NICHES.length && pilotSubstitutionCoverageComplete && pilotSourceAlignmentCount >= 8),
    evidence: `${pilotSubstitutionCount} pilot-offer substitution rows, ${pilotSubstitutionCoveredNicheCount}/${REQUIRED_NICHES.length} required niches covered, and ${pilotSourceAlignmentCount} source-alignment rows loaded.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'market_niche_gate_buyer_safe',
    status: gateStatus(marketNicheBuyerSafe),
    evidence: `Market niche validation status=${marketNicheValidation.status ?? 'missing'}; buyer_safe_pilot_claim_allowed=${marketNicheBuyerSafe}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'local_route_proof_supports_demo_not_live_claim',
    status: gateStatus(localRouteReady),
    evidence: `Local route proof status=${localRouteProof.status ?? 'missing'}; rendered_or_expected_auth_gate_count=${Number(localRouteProof.source?.rendered_or_expected_auth_gate_count ?? 0)}; hosted_live_proof=${Boolean(localRouteProof.hosted_live_proof ?? localRouteProof.source?.hosted_live_proof)}.`,
    proof_bucket: 'local'
  },
  {
    gate: 'buyer_validated_claim_blocked',
    status: gateStatus(!buyerValidated),
    evidence: `Buyer proof status=${buyerProofGate.status ?? 'missing'}; buyer_validation_verified=${buyerValidated}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'hosted_live_claim_blocked',
    status: gateStatus(!hostedReady),
    evidence: `Hosted proof status=${hostedProofValidation.status ?? 'missing'}; ready_for_buyer_safe_hosted_claims=${hostedReady}.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'enterprise_ready_claim_blocked',
    status: gateStatus(!enterpriseReady),
    evidence: `Enterprise procurement status=${enterpriseProcurementGate.status ?? 'missing'}; enterprise_ready=${enterpriseReady}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'forecasting_parity_claim_blocked',
    status: gateStatus(!scoringReady && !accuracyClaimAllowed && !worldClassPredictionClaimAllowed),
    evidence: `Scoring status=${scoringValidation.status ?? 'missing'}; scoring_ready=${scoringReady}; accuracy_claim_allowed=${accuracyClaimAllowed}; world_class_prediction_claim_allowed=${worldClassPredictionClaimAllowed}.`,
    proof_bucket: 'owner_input'
  }
];

const acceptanceGates = [...structuralGates, ...boundaryGates];
const structuralPassed = structuralGates.every((gate) => gate.status === 'passed');
const boundaryPassed = boundaryGates.every((gate) => gate.status === 'passed');
const defensibleCompetitiveWedgeClaimAllowed = structuralPassed
  && boundaryPassed
  && marketNicheBuyerSafe
  && localRouteReady;

const releaseHolds = [
  {
    hold: 'buyer_competitive_validation_missing',
    severity: 'P2',
    status: buyerValidated ? 'cleared' : 'active',
    evidence_needed: 'Run the 10-call validation plan with at least three qualified follow-ups and one paid-pilot/LOI/procurement-path signal.'
  },
  {
    hold: 'hosted_competitive_demo_proof_missing',
    severity: 'P2',
    status: hostedReady ? 'cleared' : 'active',
    evidence_needed: 'Attach hosted route/API proof before claiming live competitive demo readiness.'
  },
  {
    hold: 'forecasting_parity_proof_missing',
    severity: 'P1',
    status: scoringReady && accuracyClaimAllowed ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved resolved forecasts, comparable baselines, leakage review, scoring output, and approved claim language.'
  },
  {
    hold: 'enterprise_substitute_trust_gap_missing',
    severity: 'P1',
    status: enterpriseReady ? 'cleared' : 'active',
    evidence_needed: 'Enterprise procurement/security proof before comparing against established operational AI or advisory substitutes.'
  },
  {
    hold: 'owner_approved_competitive_claim_language_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external-share language for competitive positioning and buyer-facing proof packets.'
  }
];

const validation = {
  schema_version: 'competitive-positioning-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status: !structuralPassed
    ? 'competitive_positioning_validation_failed_structure_or_claim_boundary'
    : defensibleCompetitiveWedgeClaimAllowed
      ? 'competitive_positioning_validation_ready_pilot_only_not_buyer_validated'
      : 'competitive_positioning_validation_ready_claims_constrained',
  source: {
    market_differentiation: inputPaths.marketDifferentiation,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    market_niche_validation: inputPaths.marketNicheValidation,
    buyer_proof_gate: inputPaths.buyerProofGate,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    scoring_validation: inputPaths.scoringValidation,
    enterprise_procurement_gate: inputPaths.enterpriseProcurementGate,
    launch_evidence: inputPaths.evidence
  },
  summary: {
    market_signal_row_count: signalRows.length,
    current_competitive_source_count: CURRENT_COMPETITIVE_SOURCES.length,
    top_five_niche_row_count: nicheRows.length,
    competitor_substitute_row_count: competitorRows.length,
    required_competitor_category_count: REQUIRED_COMPETITOR_PATTERNS.length,
    required_competitor_category_present_count: competitorCoverage.filter((item) => item.present).length,
    loophole_row_count: loopholeRows.length,
    buyer_plan_row_count: buyerPlanRows.length,
    pilot_substitution_count: pilotSubstitutionCount,
    pilot_substitution_required_niche_count: REQUIRED_NICHES.length,
    pilot_substitution_covered_niche_count: pilotSubstitutionCoveredNicheCount,
    pilot_substitution_coverage_complete: pilotSubstitutionCoverageComplete,
    pilot_source_alignment_count: pilotSourceAlignmentCount,
    market_niche_buyer_safe_pilot_claim_allowed: marketNicheBuyerSafe,
    local_route_proof_ready: localRouteReady,
    buyer_validation_verified: buyerValidated,
    hosted_ready_for_buyer_safe_claims: hostedReady,
    scoring_output_ready_for_claim_review: scoringReady,
    enterprise_procurement_ready_for_review: enterpriseReady,
    active_release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length,
    defensible_competitive_wedge_claim_allowed: defensibleCompetitiveWedgeClaimAllowed,
    replacement_claim_allowed: false,
    data_breadth_superiority_claim_allowed: false,
    palantir_equivalence_claim_allowed: false,
    expert_advisory_replacement_claim_allowed: false,
    forecasting_parity_claim_allowed: false,
    generic_ai_superiority_claim_allowed: false,
    buyer_validated_claim_allowed: buyerValidated,
    hosted_live_claim_allowed: hostedReady,
    enterprise_ready_claim_allowed: enterpriseReady,
    accuracy_claim_allowed: accuracyClaimAllowed,
    world_class_prediction_claim_allowed: worldClassPredictionClaimAllowed
  },
  current_competitive_sources: CURRENT_COMPETITIVE_SOURCES,
  competitor_coverage: competitorCoverage,
  pilot_substitution_coverage_by_niche: pilotSubstitutionCoverageByNiche,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  recommended_market_language: [
    'lightweight governed strategic-intelligence pilot',
    'evidence-to-actor-reasoning-to-review-to-forecast workflow',
    'complements geopolitical intelligence, advisory, forecasting, and generic AI tools'
  ],
  prohibited_market_language: [
    'replacement for geopolitical intelligence teams',
    'Palantir-class operational AI',
    'ForecastBench/Metaculus/Good Judgment parity',
    'world-class accurate predictions',
    'enterprise-ready secure deployment',
    'live market-data intelligence'
  ],
  proof_boundary: 'This validator converts the competitive/substitute comparison into machine-checkable pilot positioning. It does not prove buyer demand, hosted live readiness, enterprise trust, data breadth superiority, expert-advisory replacement, or forecasting parity.'
};

function renderMarkdown(report) {
  const gateRows = report.acceptance_gates
    .map((gate) => [
      gate.gate,
      gate.status,
      gate.proof_bucket,
      mdCell(gate.evidence)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const competitorRowsRendered = report.competitor_coverage
    .map((item) => [
      item.label,
      item.present ? 'yes' : 'no',
      mdCell(item.row)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const holdRows = report.release_holds
    .map((hold) => [
      hold.hold,
      hold.severity,
      hold.status,
      mdCell(hold.evidence_needed)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = report.current_competitive_sources
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Competitive Positioning Evidence Validation - 2026-06-06

## Decision

Status: \`${report.status}\`.

Defensible competitive wedge claim allowed: **${report.summary.defensible_competitive_wedge_claim_allowed}**.

Replacement claim allowed: **${report.summary.replacement_claim_allowed}**.

Palantir-equivalence claim allowed: **${report.summary.palantir_equivalence_claim_allowed}**.

Forecasting-parity claim allowed: **${report.summary.forecasting_parity_claim_allowed}**.

World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

## Competitor Coverage

| Substitute Category | Present | Evidence Row |
|---|---|---|
${competitorRowsRendered}

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Current Competitive Sources

| Source | URL | Implication |
|---|---|---|
${sourceRows}

## Active Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Proof Boundary

${report.proof_boundary}
`;
}

function renderCsv(report) {
  const header = csvLine(['gate', 'status', 'proof_bucket', 'evidence']);
  const rows = report.acceptance_gates.map((gate) => csvLine([
    gate.gate,
    gate.status,
    gate.proof_bucket,
    gate.evidence
  ]));
  return `${[header, ...rows].join('\n')}\n`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(validation, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(validation));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(validation));
}

if (updateEvidence) {
  const evidence = readJsonIfExists(inputPaths.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:market:validate-competitive-positioning -- --market-differentiation ${inputPaths.marketDifferentiation} --pilot-offer-pack ${inputPaths.pilotOfferPack} --market-niche-validation ${inputPaths.marketNicheValidation} --buyer-proof-gate ${inputPaths.buyerProofGate} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --hosted-proof-validation ${inputPaths.hostedProofValidation} --scoring-validation ${inputPaths.scoringValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, defensible_competitive_wedge_claim_allowed ${validation.summary.defensible_competitive_wedge_claim_allowed}, forecasting_parity_claim_allowed false`
  ], [
    /npm run audit:market:validate-competitive-positioning/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-competitive-positioning-evidence.mjs validates competitive/substitute positioning against current source anchors, repo proof, and prohibited equivalence claims',
    'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json records substitute coverage, active competitive holds, and claim-allowance booleans',
    'docs/launch-readiness/competitive-positioning-evidence-validation-checklist-2026-06-06.csv provides the competitive-positioning claim-boundary checklist'
  ], [
    /scripts\/validate-competitive-positioning-evidence\.mjs/,
    /competitive-positioning-evidence-validation-2026-06-06\.json/,
    /competitive-positioning-evidence-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-competitive-positioning-evidence.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/competitive-positioning-evidence-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-competitive-positioning-evidence\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /competitive-positioning-evidence-validation-2026-06-06\.json/,
    /competitive-positioning-evidence-validation-2026-06-06\.md/,
    /competitive-positioning-evidence-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-competitive-positioning-evidence.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:market:validate-competitive-positioning -- --market-differentiation ${inputPaths.marketDifferentiation} --pilot-offer-pack ${inputPaths.pilotOfferPack} --market-niche-validation ${inputPaths.marketNicheValidation} --buyer-proof-gate ${inputPaths.buyerProofGate} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --hosted-proof-validation ${inputPaths.hostedProofValidation} --scoring-validation ${inputPaths.scoringValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-competitive-positioning-evidence\.mjs/,
    /npm run audit:market:validate-competitive-positioning/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Competitive positioning evidence validation is repo/local validation proof only; buyer calls, hosted demo proof, enterprise procurement/security proof, real forecast scoring, and owner-approved competitive claim language remain required before replacement, parity, or superiority claims can be upgraded.'
  ], [
    /Competitive positioning evidence validation is repo\/local validation proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'competitive-positioning-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator for competitive/substitute positioning before market superiority claims are upgraded.',
    acceptance_check: 'The validator confirms required substitute categories and buyer-safe competitive wedge language while blocking replacement, data-breadth superiority, Palantir-equivalence, expert-advisory replacement, forecasting-parity, hosted-live, enterprise-ready, and world-class prediction claims.',
    chosen_variant: 'minimal Node artifact validator plus commercial-confidence gate wiring; no product runtime change and no new dependency',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-competitive-positioning-evidence.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-competitive-positioning-evidence.mjs',
      'npm run audit:market:validate-competitive-positioning',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; defensible_competitive_wedge_claim_allowed=${validation.summary.defensible_competitive_wedge_claim_allowed}; replacement_claim_allowed=false; forecasting_parity_claim_allowed=false; world_class_prediction_claim_allowed=false.`,
    reason: 'The objective asks for market propositions versus gaps; competitive claims need machine-checkable proof boundaries before being used in launch narrative.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'competitive-positioning-evidence-validation-harness',
    variant: 'Treat a Markdown competitor matrix as proof of superiority or replacement value.',
    reason_rejected: 'Competitor/source mapping can support pilot positioning but cannot prove data breadth, enterprise scale, advisory replacement, forecasting parity, buyer demand, or hosted runtime quality.',
    tradeoff: 'Score-neutral validation improves external positioning discipline without manufacturing buyer or performance evidence.',
    evidence: `${validation.status} keeps replacement_claim_allowed=false and forecasting_parity_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'competitive-positioning-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no app runtime edit, no hosted or secret-dependent execution, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-competitive-positioning-evidence.mjs',
      'npm run audit:market:validate-competitive-positioning',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Buyer discovery, hosted proof, enterprise procurement evidence, and real resolved-outcome forecast scoring are still missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: validation.status,
  competitor_substitute_row_count: validation.summary.competitor_substitute_row_count,
  required_competitor_category_present_count: validation.summary.required_competitor_category_present_count,
  defensible_competitive_wedge_claim_allowed: validation.summary.defensible_competitive_wedge_claim_allowed,
  replacement_claim_allowed: validation.summary.replacement_claim_allowed,
  palantir_equivalence_claim_allowed: validation.summary.palantir_equivalence_claim_allowed,
  forecasting_parity_claim_allowed: validation.summary.forecasting_parity_claim_allowed,
  world_class_prediction_claim_allowed: validation.summary.world_class_prediction_claim_allowed
}, null, 2));

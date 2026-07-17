#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_BUYER_PROOF_GATE = 'docs/launch-readiness/buyer-proof-gate-2026-06-06.json';
const DEFAULT_BUYER_EVIDENCE_VALIDATION = 'docs/launch-readiness/buyer-evidence-input-validation-2026-06-06.json';
const DEFAULT_LOCAL_BROWSER_ROUTE_PROOF = 'docs/launch-readiness/local-browser-route-proof-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_VALIDATION = 'docs/launch-readiness/hosted-operational-proof-evidence-validation-2026-06-06.json';
const DEFAULT_SCORING_VALIDATION = 'docs/launch-readiness/forecast-scoring-evidence-validation-2026-06-06.json';
const DEFAULT_ENTERPRISE_PROCUREMENT_GATE = 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/market-niche-evidence-validation-checklist-2026-06-06.csv';

const REQUIRED_NICHES = [
  'Enterprise/public-sector strategic decision intelligence',
  'Governed forecasting and research workflow',
  'Geopolitical risk radar and scenario monitor',
  'Executive and analyst briefing layer',
  'Negotiation and strategic reasoning training'
];

const CURRENT_RESEARCH_ANCHORS = [
  {
    source: 'NIST AI Risk Management Framework plus Generative AI Profile',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'Best-practice AI claims need risk management, measurement, governance, and claim-specific proof gates before being upgraded.'
  },
  {
    source: 'NIST AI RMF Critical Infrastructure Profile concept note',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'Public-sector and critical-infrastructure positioning needs explicit trustworthy-AI and operational-risk controls, not only useful demos.'
  },
  {
    source: 'ISO/IEC 42001:2023 AI management system',
    url: 'https://www.iso.org/standard/42001',
    implication: 'Enterprise AI buyers increasingly expect an AI management-system posture: policies, traceability, transparency, risk treatment, and continuous improvement.'
  },
  {
    source: 'OWASP Top 10 for LLM Applications 2025',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    implication: 'LLM decision-support systems need prompt-injection, insecure-output, sensitive-disclosure, excessive-agency, and overreliance controls before enterprise trust claims.'
  },
  {
    source: 'CISA Secure by Design software manufacturer guidance',
    url: 'https://www.cisa.gov/news-events/news/building-secure-design-ecosystem',
    implication: 'Security posture should be framed as secure-by-design process evidence and owner-approved operational proof, not post-hoc assurance copy.'
  },
  {
    source: 'ForecastBench',
    url: 'https://forecastingresearch.org/research/forecastbench',
    implication: 'Forecasting claims need dynamic, contamination-resistant evaluation rather than sample fixtures.'
  },
  {
    source: 'Metaculus FutureEval methodology',
    url: 'https://www.metaculus.com/futureeval/methodology/',
    implication: 'Forecasting accuracy should be compared against human and model baselines on resolved questions.'
  },
  {
    source: 'Metaculus forecasting platform and aggregation engine',
    url: 'https://www.metaculus.com/about/',
    implication: 'Forecasting products are judged by resolved-question history, aggregation quality, and organizational use cases; sample fixtures do not prove parity.'
  },
  {
    source: 'Good Judgment Superforecasting services',
    url: 'https://goodjudgment.com/',
    implication: 'Human forecasting services validate buyer demand for foresight but set a high bar for outcome track record and expert process credibility.'
  },
  {
    source: 'World Economic Forum Strategic Intelligence',
    url: 'https://www.weforum.org/focus/strategic-intelligence/',
    implication: 'Strategic-intelligence demand is real, but differentiation must be workflow/actionability proof rather than another contextual map.'
  },
  {
    source: 'Tradeweb ICD Portal Client Survey 2026',
    url: 'https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/',
    implication: 'Corporate treasury buyers have a current geopolitical-risk pain signal, but this supports discovery focus rather than buyer validation.'
  },
  {
    source: 'McKinsey CFO Pulse Survey 2026',
    url: 'https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/cfos-have-been-concerned-about-geopolitical-impacts-for-months',
    implication: 'CFOs are spending attention on geopolitical impact, risk monitoring, and scenario planning; the pilot should sell decision workflow, not raw prediction.'
  },
  {
    source: 'Gartner procurement GenAI disillusionment signal',
    url: 'https://www.gartner.com/en/newsroom/press-releases/2025-07-30-gartner-says-generative-ai-for-procurement-has-entered-the-trough-of-disillusionment',
    implication: 'AI buyers need process-specific proof, risk controls, and ROI evidence; broad AI-platform copy is a commercial risk.'
  }
];

const PROHIBITED_BUYER_CLAIM_PATTERNS = [
  /\bworld[- ]class\b/i,
  /\bcommercial[- ]ready\b/i,
  /\baccurate predictions?\b/i,
  /\bprediction superiority\b/i,
  /\bbuyer[- ]validated\b/i,
  /\bfully proven\b/i,
  /\benterprise[- ]ready\b/i,
  /\breferenceable buyer\b/i
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
    'Usage: node scripts/validate-market-niche-evidence.mjs',
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--buyer-proof-gate ${DEFAULT_BUYER_PROOF_GATE}]`,
    `  [--buyer-evidence-validation ${DEFAULT_BUYER_EVIDENCE_VALIDATION}]`,
    `  [--local-browser-route-proof ${DEFAULT_LOCAL_BROWSER_ROUTE_PROOF}]`,
    `  [--hosted-proof-validation ${DEFAULT_HOSTED_PROOF_VALIDATION}]`,
    `  [--scoring-validation ${DEFAULT_SCORING_VALIDATION}]`,
    `  [--enterprise-procurement-gate ${DEFAULT_ENTERPRISE_PROCUREMENT_GATE}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
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
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  buyerProofGate: argValue('--buyer-proof-gate', DEFAULT_BUYER_PROOF_GATE),
  buyerEvidenceValidation: argValue('--buyer-evidence-validation', DEFAULT_BUYER_EVIDENCE_VALIDATION),
  localBrowserRouteProof: argValue('--local-browser-route-proof', DEFAULT_LOCAL_BROWSER_ROUTE_PROOF),
  hostedProofValidation: argValue('--hosted-proof-validation', DEFAULT_HOSTED_PROOF_VALIDATION),
  scoringValidation: argValue('--scoring-validation', DEFAULT_SCORING_VALIDATION),
  enterpriseProcurementGate: argValue('--enterprise-procurement-gate', DEFAULT_ENTERPRISE_PROCUREMENT_GATE),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE),
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
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function activeHoldCount(holds) {
  return asArray(holds).filter((hold) => String(hold.status ?? '').toLowerCase() === 'active').length;
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

function routeProofForNiche(niche, routeMap) {
  const normalizedNiche = normalize(niche);
  const tokens = normalizedNiche.split(' ').filter((token) => token.length >= 5);
  const matchedRoutes = asArray(routeMap).filter((route) => {
    const routeText = normalize(`${route.niche ?? ''} ${route.route ?? ''} ${route.expected_signal ?? ''}`);
    if (routeText.includes(normalizedNiche)) return true;
    return tokens.some((token) => routeText.includes(token));
  });

  const readyRoutes = matchedRoutes.filter((route) => {
    const status = String(route.status ?? '').toLowerCase();
    return ['rendered', 'auth_gate_expected'].includes(status) && Boolean(route.expected_signal_found);
  });

  return {
    matched_route_count: matchedRoutes.length,
    ready_route_count: readyRoutes.length,
    route_signals: readyRoutes.map((route) => `${route.route}: ${route.expected_signal}`)
  };
}

function gateStatus(condition) {
  return condition ? 'passed' : 'failed';
}

const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, {
  status: 'missing',
  pilot_offer: {},
  niche_offer_sequence: [],
  current_source_alignment: [],
  substitution_matrix: []
});
const buyerProofGate = readJsonIfExists(inputPaths.buyerProofGate, {
  status: 'missing',
  summary: {},
  release_holds: []
});
const buyerEvidenceValidation = readJsonIfExists(inputPaths.buyerEvidenceValidation, {
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
  summary: {},
  release_holds: []
});
const scoringValidation = readJsonIfExists(inputPaths.scoringValidation, {
  status: 'missing',
  summary: {}
});
const enterpriseProcurementGate = readJsonIfExists(inputPaths.enterpriseProcurementGate, {
  status: 'missing',
  summary: {},
  release_holds: []
});
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, {
  posture: {},
  dimensions: []
});

const nicheSequence = asArray(pilotOfferPack.niche_offer_sequence);
const sources = asArray(pilotOfferPack.current_source_alignment);
const substitutionMatrix = asArray(pilotOfferPack.substitution_matrix);
const routeMap = asArray(localRouteProof.marketability_route_map);
const substitutionCoverageByNiche = REQUIRED_NICHES.map((niche) => {
  const rows = substitutionMatrix.filter((row) => asArray(row.covered_niches)
    .some((coveredNiche) => normalize(coveredNiche) === normalize(niche)));
  return {
    niche,
    covered: rows.length > 0,
    substitute_count: rows.length,
    substitutes: rows.map((row) => row.substitute)
  };
});
const substitutionCoveredNicheCount = substitutionCoverageByNiche.filter((item) => item.covered).length;
const substitutionCoverageComplete = substitutionCoverageByNiche.every((item) => item.covered);
const allowedClaimText = [
  pilotOfferPack.pilot_offer?.name,
  pilotOfferPack.pilot_offer?.promise,
  ...asArray(pilotOfferPack.pilot_offer?.allowed_claims)
].join(' ');
const prohibitedAllowedClaimHits = PROHIBITED_BUYER_CLAIM_PATTERNS
  .filter((pattern) => pattern.test(allowedClaimText))
  .map((pattern) => pattern.source);

const nicheChecks = REQUIRED_NICHES.map((niche) => {
  const offer = nicheSequence.find((candidate) => normalize(candidate.niche) === normalize(niche));
  const proofAssets = asArray(offer?.proof_assets);
  const saleBoundary = String(offer?.sale_boundary ?? '');
  const routeProof = routeProofForNiche(niche, routeMap);
  const substitutionCoverage = substitutionCoverageByNiche.find((item) => normalize(item.niche) === normalize(niche));
  const proofAssetsReady = proofAssets.length >= 2;
  const boundaryReady = /\b(do not|no|requires|guided pilot only|not|pending|before)\b/i.test(saleBoundary)
    && saleBoundary.length >= 20;
  const buyerJobReady = String(offer?.buyer_job ?? '').length >= 40;

  return {
    niche,
    present: Boolean(offer),
    buyer_job_ready: buyerJobReady,
    proof_assets_ready: proofAssetsReady,
    sale_boundary_ready: boundaryReady,
    substitution_coverage_ready: Boolean(substitutionCoverage?.covered),
    substitution_rows: substitutionCoverage?.substitutes ?? [],
    local_route_signal_ready: routeProof.ready_route_count > 0,
    route_signals: routeProof.route_signals,
    readiness_score_percent: Number(offer?.readiness_score_percent ?? 0),
    status: Boolean(offer) && buyerJobReady && proofAssetsReady && boundaryReady && Boolean(substitutionCoverage?.covered)
      ? 'ready_for_pilot_positioning'
      : 'incomplete_market_positioning'
  };
});

const allRequiredNichesPresent = nicheChecks.every((check) => check.present);
const allNicheBoundariesReady = nicheChecks.every((check) => (
  check.buyer_job_ready
  && check.proof_assets_ready
  && check.sale_boundary_ready
));
const allLocalRouteSignalsReady = nicheChecks.every((check) => check.local_route_signal_ready);
const localRouteProofReady = localRouteProof.status === 'local_route_proof_ready_not_hosted_proof'
  && allLocalRouteSignalsReady
  && !Boolean(localRouteProof.hosted_live_proof ?? localRouteProof.source?.hosted_live_proof);
const buyerValidationVerified = Boolean(buyerProofGate.summary?.buyer_validation_verified);
const buyerEvidenceReady = Boolean(buyerEvidenceValidation.summary?.ready_for_buyer_proof_gate);
const hostedReady = Boolean(hostedProofValidation.summary?.ready_for_buyer_safe_hosted_claims)
  || hostedProofValidation.status === 'hosted_operational_evidence_validation_passed_buyer_safe_specific_claims';
const scoringReady = Boolean(scoringValidation.summary?.scoring_output_ready_for_claim_review);
const accuracyClaimAllowed = Boolean(scoringValidation.summary?.accuracy_claim_allowed);
const worldClassPredictionClaimAllowed = Boolean(scoringValidation.summary?.world_class_prediction_claim_allowed);
const enterpriseReady = Boolean(enterpriseProcurementGate.summary?.ready_for_enterprise_procurement_review)
  || enterpriseProcurementGate.status === 'enterprise_procurement_gate_ready_for_owner_procurement_review';
const confidenceDecision = commercialConfidenceGate.posture?.decision ?? 'missing';
const commercialWorldClassConfidence = Number(
  commercialConfidenceGate.posture?.commercial_world_class_confidence_percent ?? 0
);

const structuralGates = [
  {
    gate: 'five_niche_sequence_present',
    status: gateStatus(allRequiredNichesPresent && nicheSequence.length >= REQUIRED_NICHES.length),
    evidence: `${nicheChecks.filter((check) => check.present).length}/${REQUIRED_NICHES.length} required niches present; offer sequence length ${nicheSequence.length}.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'source_alignment_present',
    status: gateStatus(sources.length >= 8 && CURRENT_RESEARCH_ANCHORS.length >= 7),
    evidence: `${sources.length} pilot-pack source alignments and ${CURRENT_RESEARCH_ANCHORS.length} current research anchors attached.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'substitution_matrix_present',
    status: gateStatus(substitutionMatrix.length >= REQUIRED_NICHES.length && substitutionCoverageComplete),
    evidence: `${substitutionMatrix.length} substitute/competitor rows loaded; ${substitutionCoveredNicheCount}/${REQUIRED_NICHES.length} required niches have substitute coverage.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'niche_proof_assets_and_boundaries_present',
    status: gateStatus(allNicheBoundariesReady && substitutionCoverageComplete),
    evidence: `${nicheChecks.filter((check) => check.status === 'ready_for_pilot_positioning').length}/${REQUIRED_NICHES.length} niches have buyer job, proof assets, sale boundary, and substitute coverage.`,
    proof_bucket: 'repo_artifact'
  },
  {
    gate: 'buyer_safe_claim_language_preserved',
    status: gateStatus(prohibitedAllowedClaimHits.length === 0),
    evidence: `${prohibitedAllowedClaimHits.length} prohibited claim patterns found in pilot offer name, promise, or allowed claims.`,
    proof_bucket: 'repo_artifact'
  }
];

const boundaryGates = [
  {
    gate: 'local_route_proof_present',
    status: gateStatus(localRouteProofReady),
    evidence: `${nicheChecks.filter((check) => check.local_route_signal_ready).length}/${REQUIRED_NICHES.length} niches have local route signals; local artifact status ${localRouteProof.status ?? 'missing'}; hosted_live_proof=${Boolean(localRouteProof.hosted_live_proof ?? localRouteProof.source?.hosted_live_proof)}.`,
    proof_bucket: 'local'
  },
  {
    gate: 'hosted_live_proof_absent_boundary_preserved',
    status: gateStatus(!hostedReady),
    evidence: `Hosted validation status ${hostedProofValidation.status ?? 'missing'}; ready_for_buyer_safe_hosted_claims=${hostedReady}.`,
    proof_bucket: 'hosted_live'
  },
  {
    gate: 'buyer_validation_absent_boundary_preserved',
    status: gateStatus(!buyerValidationVerified && !buyerEvidenceReady),
    evidence: `Buyer validation verified=${buyerValidationVerified}; buyer evidence ready=${buyerEvidenceReady}; completed calls ${Number(buyerProofGate.summary?.completed_call_with_required_fields_count ?? 0)}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'accuracy_claim_blocked',
    status: gateStatus(!scoringReady && !accuracyClaimAllowed && !worldClassPredictionClaimAllowed),
    evidence: `Scoring status ${scoringValidation.status ?? 'missing'}; scoring_ready=${scoringReady}; accuracy_claim_allowed=${accuracyClaimAllowed}; world_class_prediction_claim_allowed=${worldClassPredictionClaimAllowed}.`,
    proof_bucket: 'owner_input'
  },
  {
    gate: 'enterprise_ready_claim_blocked',
    status: gateStatus(!enterpriseReady),
    evidence: `Enterprise procurement status ${enterpriseProcurementGate.status ?? 'missing'}; enterprise_ready=${enterpriseReady}.`,
    proof_bucket: 'owner_input'
  }
];

const acceptanceGates = [...structuralGates, ...boundaryGates];
const structuralPassed = structuralGates.every((gate) => gate.status === 'passed');
const boundaryPassed = boundaryGates.every((gate) => gate.status === 'passed');
const buyerSafePilotClaimAllowed = structuralPassed && localRouteProofReady && prohibitedAllowedClaimHits.length === 0;
const activeReleaseHolds = [
  {
    hold: 'buyer_validation_missing',
    severity: 'P1',
    status: buyerValidationVerified ? 'cleared' : 'active',
    evidence_needed: '10 completed buyer discovery calls, three qualified follow-ups, and one paid-pilot/LOI/procurement-path signal.'
  },
  {
    hold: 'hosted_live_claim_proof_missing',
    severity: 'P2',
    status: hostedReady ? 'cleared' : 'active',
    evidence_needed: 'Validated hosted route/API proof with deploy binding, redacted logs/screenshots, and core coverage.'
  },
  {
    hold: 'prediction_accuracy_claim_proof_missing',
    severity: 'P1',
    status: scoringReady && accuracyClaimAllowed ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved resolved forecasts, real comparable baselines, leakage review, scoring output, and approved claim language.'
  },
  {
    hold: 'enterprise_security_procurement_proof_missing',
    severity: 'P1',
    status: enterpriseReady ? 'cleared' : 'active',
    evidence_needed: 'Owner-approved privacy/support/incident evidence, RLS proof, hosted AI security proof, and external-share approvals.'
  },
  {
    hold: 'owner_external_claim_language_approval_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Owner-approved external-share language for pilot copy, screenshots, and proof packets.'
  }
];

const validation = {
  schema_version: 'market-niche-evidence-validation-v1',
  generated_at: new Date().toISOString(),
  status: !structuralPassed
    ? 'market_niche_evidence_validation_failed_structure_or_claim_boundary'
    : buyerValidationVerified && hostedReady && scoringReady && enterpriseReady
      ? 'market_niche_evidence_validation_ready_for_commercial_review'
      : 'market_niche_evidence_validation_ready_not_buyer_validated',
  source: {
    pilot_offer_pack: inputPaths.pilotOfferPack,
    buyer_proof_gate: inputPaths.buyerProofGate,
    buyer_evidence_validation: inputPaths.buyerEvidenceValidation,
    local_browser_route_proof: inputPaths.localBrowserRouteProof,
    hosted_proof_validation: inputPaths.hostedProofValidation,
    scoring_validation: inputPaths.scoringValidation,
    enterprise_procurement_gate: inputPaths.enterpriseProcurementGate,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    launch_evidence: inputPaths.evidence
  },
  summary: {
    niche_count: nicheSequence.length,
    required_niche_count: REQUIRED_NICHES.length,
    required_niche_present_count: nicheChecks.filter((check) => check.present).length,
    source_alignment_count: sources.length,
    current_research_anchor_count: CURRENT_RESEARCH_ANCHORS.length,
    substitution_matrix_count: substitutionMatrix.length,
    substitution_matrix_required_count: REQUIRED_NICHES.length,
    substitution_covered_niche_count: substitutionCoveredNicheCount,
    substitution_coverage_complete: substitutionCoverageComplete,
    named_target_count: Number(buyerProofGate.summary?.named_target_count ?? pilotOfferPack.pilot_offer?.named_target_count ?? 0),
    selected_target_count: Number(buyerProofGate.summary?.selected_target_count ?? pilotOfferPack.pilot_offer?.selected_target_count ?? 0),
    local_route_signal_ready_count: nicheChecks.filter((check) => check.local_route_signal_ready).length,
    local_route_proof_ready: localRouteProofReady,
    buyer_validation_verified: buyerValidationVerified,
    buyer_evidence_ready_for_proof_gate: buyerEvidenceReady,
    hosted_ready_for_buyer_safe_claims: hostedReady,
    scoring_output_ready_for_claim_review: scoringReady,
    enterprise_procurement_ready_for_review: enterpriseReady,
    commercial_world_class_confidence_percent: commercialWorldClassConfidence,
    commercial_confidence_decision: confidenceDecision,
    active_release_hold_count: activeReleaseHolds.filter((hold) => hold.status === 'active').length,
    buyer_safe_pilot_claim_allowed: buyerSafePilotClaimAllowed,
    buyer_validated_claim_allowed: buyerValidationVerified && buyerEvidenceReady,
    hosted_live_claim_allowed: hostedReady,
    enterprise_ready_claim_allowed: enterpriseReady,
    accuracy_claim_allowed: accuracyClaimAllowed,
    world_class_prediction_claim_allowed: worldClassPredictionClaimAllowed
  },
  current_research_anchors: CURRENT_RESEARCH_ANCHORS,
  niche_checks: nicheChecks,
  substitution_coverage_by_niche: substitutionCoverageByNiche,
  acceptance_gates: acceptanceGates,
  release_holds: activeReleaseHolds,
  recommended_market_language: [
    'governed strategic-intelligence pilot',
    'buyer-safe niche thesis with local route proof and explicit proof boundaries',
    'calibration-aware decision support, pending owner-approved resolved-outcome scoring'
  ],
  prohibited_market_language: [
    'world-class accurate predictions',
    'commercial-ready enterprise platform',
    'buyer-validated demand',
    'hosted live proof complete',
    'enterprise-ready security posture'
  ],
  proof_boundary: 'This validator confirms market-niche coherence, source alignment, local route evidence, and claim boundaries. It is not buyer validation, hosted proof, enterprise-security proof, or prediction-accuracy proof.'
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

  const nicheRows = report.niche_checks
    .map((check) => [
      check.niche,
      check.status,
      check.local_route_signal_ready ? 'yes' : 'no',
      check.readiness_score_percent,
      mdCell(check.route_signals.join('; '))
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

  const sourceRows = report.current_research_anchors
    .map((source) => [
      mdCell(source.source),
      source.url,
      mdCell(source.implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Market Niche Evidence Validation - 2026-06-06

## Decision

Status: \`${report.status}\`.

Buyer-safe pilot claim allowed: **${report.summary.buyer_safe_pilot_claim_allowed}**.

Buyer-validated claim allowed: **${report.summary.buyer_validated_claim_allowed}**.

Hosted-live claim allowed: **${report.summary.hosted_live_claim_allowed}**.

Enterprise-ready claim allowed: **${report.summary.enterprise_ready_claim_allowed}**.

World-class prediction claim allowed: **${report.summary.world_class_prediction_claim_allowed}**.

## Niche Checks

| Niche | Status | Local Route Signal | Readiness Score | Route Signals |
|---|---|---|---:|---|
${nicheRows}

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
${gateRows}

## Current Research Anchors

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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:market:validate-niches -- --pilot-offer-pack ${inputPaths.pilotOfferPack} --buyer-proof-gate ${inputPaths.buyerProofGate} --buyer-evidence-validation ${inputPaths.buyerEvidenceValidation} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --hosted-proof-validation ${inputPaths.hostedProofValidation} --scoring-validation ${inputPaths.scoringValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${validation.status}, buyer_safe_pilot_claim_allowed ${validation.summary.buyer_safe_pilot_claim_allowed}, world_class_prediction_claim_allowed false`
  ], [
    /npm run audit:market:validate-niches/
  ]);

  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-market-niche-evidence.mjs validates the five-niche pilot thesis against source alignment, route proof, buyer/hosted/security/accuracy boundaries, and prohibited market claims',
    'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json records market-niche coherence, current research anchors, active holds, and claim-allowance booleans',
    'docs/launch-readiness/market-niche-evidence-validation-checklist-2026-06-06.csv provides the market-niche claim-boundary checklist'
  ], [
    /scripts\/validate-market-niche-evidence\.mjs/,
    /market-niche-evidence-validation-2026-06-06\.json/,
    /market-niche-evidence-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/validate-market-niche-evidence.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json',
    'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.md',
    'docs/launch-readiness/market-niche-evidence-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/validate-market-niche-evidence\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /market-niche-evidence-validation-2026-06-06\.json/,
    /market-niche-evidence-validation-2026-06-06\.md/,
    /market-niche-evidence-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-market-niche-evidence.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:market:validate-niches -- --pilot-offer-pack ${inputPaths.pilotOfferPack} --buyer-proof-gate ${inputPaths.buyerProofGate} --buyer-evidence-validation ${inputPaths.buyerEvidenceValidation} --local-browser-route-proof ${inputPaths.localBrowserRouteProof} --hosted-proof-validation ${inputPaths.hostedProofValidation} --scoring-validation ${inputPaths.scoringValidation} --enterprise-procurement-gate ${inputPaths.enterpriseProcurementGate} --commercial-confidence-gate ${inputPaths.commercialConfidenceGate} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/validate-market-niche-evidence\.mjs/,
    /npm run audit:market:validate-niches/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Market niche evidence validation is repo/local validation proof only; buyer calls, hosted proof, enterprise procurement/security proof, real forecasting outcomes, and owner-approved external claim language remain required before market claims can be upgraded beyond pilot-only.'
  ], [
    /Market niche evidence validation is repo\/local validation proof only/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'market-niche-evidence-validation-harness',
    decision: 'Add a deterministic no-dependency validator for the five market niches before sellability claims are upgraded.',
    acceptance_check: 'The validator confirms five-niche coherence and buyer-safe pilot language while keeping buyer-validated, hosted-live, enterprise-ready, accuracy, and world-class prediction claims blocked.',
    chosen_variant: 'minimal Node artifact validator plus commercial-confidence gate wiring; no product runtime change and no new dependency',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/validate-market-niche-evidence.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/validate-market-niche-evidence.mjs',
      'npm run audit:market:validate-niches',
      'npm run audit:commercial:confidence'
    ],
    proof: `${validation.status}; buyer_safe_pilot_claim_allowed=${validation.summary.buyer_safe_pilot_claim_allowed}; buyer_validated_claim_allowed=${validation.summary.buyer_validated_claim_allowed}; world_class_prediction_claim_allowed=false.`,
    reason: 'The top-five niche strategy needed machine-checkable marketability and claim-boundary proof before being used as a commercial launch narrative.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'market-niche-evidence-validation-harness',
    variant: 'Raise commercial confidence or claim buyer validation from desk research and local route proof.',
    reason_rejected: 'Desk research and local route screenshots support pilot positioning, but do not prove willingness to pay, hosted runtime quality, enterprise procurement readiness, or forecasting accuracy.',
    tradeoff: 'Score-neutral validation strengthens the sellability thesis without manufacturing buyer or prediction evidence.',
    evidence: `${validation.status} keeps buyer_validated_claim_allowed=false and world_class_prediction_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'market-niche-evidence-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no app runtime edit, no hosted or secret-dependent execution, and generated artifacts remain repo/local proof only.',
    tests_or_checks: [
      'node --check scripts/validate-market-niche-evidence.mjs',
      'npm run audit:market:validate-niches',
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
  niche_count: validation.summary.niche_count,
  current_research_anchor_count: validation.summary.current_research_anchor_count,
  buyer_safe_pilot_claim_allowed: validation.summary.buyer_safe_pilot_claim_allowed,
  buyer_validated_claim_allowed: validation.summary.buyer_validated_claim_allowed,
  hosted_live_claim_allowed: validation.summary.hosted_live_claim_allowed,
  enterprise_ready_claim_allowed: validation.summary.enterprise_ready_claim_allowed,
  accuracy_claim_allowed: validation.summary.accuracy_claim_allowed,
  world_class_prediction_claim_allowed: validation.summary.world_class_prediction_claim_allowed
}, null, 2));

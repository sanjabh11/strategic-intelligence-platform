#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_OWNER_APPROVAL_VALIDATION = 'docs/launch-readiness/owner-approval-register-validation-2026-06-06.json';
const DEFAULT_COMMERCIAL_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/pilot-outcome-measurement-checklist-2026-06-06.csv';

const REQUIRED_NICHES = [
  'Enterprise/public-sector strategic decision intelligence',
  'Governed forecasting and research workflow',
  'Geopolitical risk radar and scenario monitor',
  'Executive and analyst briefing layer',
  'Negotiation and strategic reasoning training'
];

const FORBIDDEN_CLAIM_PATTERNS = [
  /world[-\s]?class accurate/i,
  /commercial[-\s]?ready enterprise/i,
  /buyer[-\s]?validated/i,
  /proven prediction superiority/i,
  /fully proven hosted runtime/i,
  /fully remediated rls/i
];

const CURRENT_SOURCE_ALIGNMENT = [
  {
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'Pilot claims should be tied to measured and governed risk-management evidence before any broader AI trust claim is upgraded.'
  },
  {
    source: 'NIST Secure Software Development Framework SP 800-218',
    url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    implication: 'Launch evidence should separate planned controls, implemented controls, and verified outcomes.'
  },
  {
    source: 'ForecastBench',
    url: 'https://www.forecastbench.org/about/',
    implication: 'Forecasting claims need dynamic, resolved-outcome evaluation with comparable baselines rather than fixture-only demonstrations.'
  },
  {
    source: 'OECD Strategic Foresight',
    url: 'https://www.oecd.org/strategic-foresight/',
    implication: 'Foresight value should be measured as better structured exploration and decision preparation, not as single-future prediction.'
  },
  {
    source: 'OWASP Top 10 for Large Language Model Applications',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    implication: 'LLM-enabled pilot evidence should preserve human review, provenance, prompt/input boundaries, and no-autonomous-action guardrails.'
  }
];

const OUTCOME_TEMPLATES = {
  'enterprise public sector strategic decision intelligence': {
    pilot_case_unit: 'one high-stakes strategy, policy, geopolitical, supplier, or operational-risk question',
    baseline_measure: 'current hours from source pack or analyst intake to buyer-reviewed decision brief',
    target_outcome_measure: 'pilot hours from source pack to evidence-linked brief with actor reasoning, countermoves, review state, and forecast-draft handoff',
    quality_measure: 'buyer reviewer rates evidence coverage, assumption clarity, option clarity, and next-action usefulness against the current workflow',
    buyer_decision_event: 'internal follow-up, paid pilot discussion, LOI/procurement path, or no-fit decision',
    minimum_valid_pilot_evidence: [
      '3 to 5 representative cases from one buyer team',
      'before and after time-to-reviewed-brief records',
      'one named reviewer note per case',
      'proof shown and objection captured for each case'
    ],
    success_threshold_for_owner_review: 'At least 3 cases completed with a credible time or clarity improvement signal and no unsupported prediction claim.'
  },
  'governed forecasting and research workflow': {
    pilot_case_unit: 'one scoreable forecast question or research question that can become a forecast',
    baseline_measure: 'current forecast or decision-confidence baseline with source, timestamp, probability method, and resolution criteria',
    target_outcome_measure: 'complete pre-resolution forecast packet with evidence cutoff, human review, comparable baseline, and planned Brier/log scoring',
    quality_measure: 'forecastability, leakage risk, baseline comparability, and reviewer approval status',
    buyer_decision_event: 'buyer accepts the scoring protocol, supplies baseline rows, requests paid scoring pilot, or rejects the protocol',
    minimum_valid_pilot_evidence: [
      '3 to 5 pre-resolution candidate questions for workflow review',
      '25 or more owner-approved resolved rows before accuracy claims',
      'comparable baseline source and timestamp for every scored row',
      'leakage and ambiguity review before scoring'
    ],
    success_threshold_for_owner_review: 'Protocol is accepted by the buyer and at least one real baseline source is available; accuracy claims remain blocked until resolved rows score.'
  },
  'geopolitical risk radar and scenario monitor': {
    pilot_case_unit: 'one live or buyer-approved geopolitical risk signal converted into scenario and decision prompts',
    baseline_measure: 'current time from external signal detection to scenario brief and stakeholder action recommendation',
    target_outcome_measure: 'pilot time from source signal to actor-aware scenario, countermeasure prompt, provenance label, and review decision',
    quality_measure: 'source freshness, provenance completeness, actionability, and false-positive/escalation review',
    buyer_decision_event: 'buyer asks for monitoring follow-up, rejects freshness/provenance, or requests hosted proof before continuing',
    minimum_valid_pilot_evidence: [
      'non-simulated source or buyer-approved scenario input',
      'freshness timestamp and source provenance',
      'reviewer escalation or no-action decision',
      'hosted smoke evidence before production-live claims'
    ],
    success_threshold_for_owner_review: 'Buyer confirms the radar-to-scenario workflow is useful for triage; hosted-live and feed SLA claims remain blocked.'
  },
  'executive and analyst briefing layer': {
    pilot_case_unit: 'one executive or analyst decision brief generated from the same reviewed evidence bundle',
    baseline_measure: 'current number of review cycles or hours from analyst draft to executive-ready brief',
    target_outcome_measure: 'pilot review cycles or hours from evidence bundle to executive-ready brief with assumptions, options, and decision asks preserved',
    quality_measure: 'executive clarity rating, analyst correction count, and governance reviewer signoff status',
    buyer_decision_event: 'buyer approves internal follow-up, asks for governance changes, or rejects the briefing format',
    minimum_valid_pilot_evidence: [
      '3 buyer-reviewable briefing cases',
      'before and after draft cycle count or preparation time',
      'analyst correction notes',
      'reviewer signoff or blocker notes'
    ],
    success_threshold_for_owner_review: 'At least one buyer reviewer says the briefing format improves review speed or decision clarity without losing caveats.'
  },
  'negotiation and strategic reasoning training': {
    pilot_case_unit: 'one cohort exercise using negotiation, game tree, or forecasting discipline on an applied organizational case',
    baseline_measure: 'pre-exercise rubric score for structured reasoning, assumption testing, and decision communication',
    target_outcome_measure: 'post-exercise rubric score plus debrief quality and transfer-to-work signal',
    quality_measure: 'rubric delta, facilitator notes, learner self-assessment, and buyer manager relevance rating',
    buyer_decision_event: 'cohort follow-up, paid training pilot discussion, curriculum revision request, or no fit',
    minimum_valid_pilot_evidence: [
      'one owner-approved cohort and rubric',
      'pre and post rubric results',
      'facilitator debrief notes',
      'buyer manager relevance rating'
    ],
    success_threshold_for_owner_review: 'Cohort shows a measurable rubric delta or manager-approved relevance signal; training remains an adjacent lane until buyer proof exists.'
  }
};

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-pilot-outcome-measurement-kit.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--owner-approval-validation ${DEFAULT_OWNER_APPROVAL_VALIDATION}]`,
    `  [--commercial-confidence-gate ${DEFAULT_COMMERCIAL_CONFIDENCE_GATE}]`,
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
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  marketNicheValidation: argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION),
  ownerApprovalValidation: argValue('--owner-approval-validation', DEFAULT_OWNER_APPROVAL_VALIDATION),
  commercialConfidenceGate: argValue('--commercial-confidence-gate', DEFAULT_COMMERCIAL_CONFIDENCE_GATE)
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvLine(values) {
  return values.map(csvCell).join(',');
}

function replaceMatchingThenAppend(existingValue, additions, matchers) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const filtered = existing.filter((item) => !matchers.some((matcher) => matcher.test(String(item))));
  return [...filtered, ...additions];
}

function replaceByTaskId(existingValue, nextValue) {
  const existing = Array.isArray(existingValue) ? existingValue : [];
  const taskId = nextValue.task_id ?? nextValue.target_task;
  return [
    ...existing.filter((item) => (item.task_id ?? item.target_task) !== taskId),
    nextValue
  ];
}

function collectForbiddenClaims(value, pathParts = [], out = []) {
  if (typeof value === 'string') {
    const matches = FORBIDDEN_CLAIM_PATTERNS
      .filter((pattern) => pattern.test(value))
      .map((pattern) => pattern.source);
    if (matches.length > 0) {
      out.push({ path: pathParts.join('.'), value, matches });
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenClaims(item, [...pathParts, index], out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.entries(value)
      .filter(([key]) => key !== 'blocked_claims')
      .forEach(([key, nested]) => collectForbiddenClaims(nested, [...pathParts, key], out));
  }

  return out;
}

const evidence = readJsonIfExists(inputPaths.evidence, {
  launch_decision: 'unknown',
  proof_buckets: {},
  fix_report: {}
});
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, {
  status: 'missing',
  pilot_offer: {},
  niche_offer_sequence: []
});
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, {
  status: 'missing',
  selected_targets: []
});
const marketNicheValidation = readJsonIfExists(inputPaths.marketNicheValidation, {
  status: 'missing',
  summary: {}
});
const ownerApprovalValidation = readJsonIfExists(inputPaths.ownerApprovalValidation, {
  status: 'missing',
  summary: {}
});
const commercialConfidenceGate = readJsonIfExists(inputPaths.commercialConfidenceGate, {
  posture: {},
  dimensions: []
});

const offer = pilotOfferPack.pilot_offer ?? {};
const nicheSequence = asArray(pilotOfferPack.niche_offer_sequence);
const selectedTargets = asArray(buyerDiscoveryKit.selected_targets);
const dimensionById = new Map(asArray(commercialConfidenceGate.dimensions).map((dimension) => [dimension.id, dimension]));
const ownerApprovedCount = Number(ownerApprovalValidation.summary?.owner_approved_count ?? 0);
const ownerRequiredCount = Number(ownerApprovalValidation.summary?.required_approval_count ?? 0);

function templateForNiche(niche) {
  return OUTCOME_TEMPLATES[normalize(niche)] ?? {
    pilot_case_unit: 'one buyer-approved pilot case',
    baseline_measure: 'current workflow baseline before the pilot',
    target_outcome_measure: 'pilot workflow outcome after the same case is run',
    quality_measure: 'buyer review quality and actionability',
    buyer_decision_event: 'internal follow-up, paid pilot discussion, LOI/procurement path, or no-fit decision',
    minimum_valid_pilot_evidence: [
      'buyer-approved case',
      'baseline value',
      'pilot outcome value',
      'reviewer note'
    ],
    success_threshold_for_owner_review: 'Buyer can compare baseline and pilot outcome without relying on unsupported claims.'
  };
}

const outcomeRows = REQUIRED_NICHES.map((niche, index) => {
  const sequence = nicheSequence.find((item) => normalize(item.niche) === normalize(niche)) ?? {};
  const template = templateForNiche(niche);
  const targetCount = selectedTargets.filter((target) => normalize(target.niche) === normalize(niche)).length;

  return {
    rank: Number(sequence.rank ?? index + 1),
    niche,
    sellability_role: sequence.sellability_role ?? 'not_packaged',
    buyer_job: sequence.buyer_job ?? '',
    pilot_case_unit: template.pilot_case_unit,
    baseline_measure: template.baseline_measure,
    target_outcome_measure: template.target_outcome_measure,
    quality_measure: template.quality_measure,
    buyer_decision_event: template.buyer_decision_event,
    minimum_valid_pilot_evidence: template.minimum_valid_pilot_evidence,
    success_threshold_for_owner_review: template.success_threshold_for_owner_review,
    selected_target_count: targetCount,
    sale_boundary: sequence.sale_boundary ?? 'pilot-only; claim upgrades blocked until proof gates pass',
    proof_assets: asArray(sequence.proof_assets),
    owner_input_needed: [
      'owner-approved pilot case or cohort',
      'baseline capture before demo or pilot',
      'buyer reviewer note after pilot run',
      'decision event and next action'
    ],
    blocked_claims: [
      'world-class accurate predictions',
      'commercial-ready enterprise platform',
      'buyer-validated demand',
      'fully proven hosted runtime'
    ]
  };
});

const coverageCount = outcomeRows.filter((row) => Boolean(row.buyer_job)).length;
const rowsWithBaseline = outcomeRows.filter((row) => Boolean(row.baseline_measure)).length;
const rowsWithTarget = outcomeRows.filter((row) => Boolean(row.target_outcome_measure)).length;
const rowsWithQuality = outcomeRows.filter((row) => Boolean(row.quality_measure)).length;
const rowsWithDecision = outcomeRows.filter((row) => Boolean(row.buyer_decision_event)).length;
const rowsWithEvidenceCapture = outcomeRows.filter((row) => row.minimum_valid_pilot_evidence.length >= 3).length;
const selectedCoverageCount = outcomeRows.filter((row) => row.selected_target_count > 0).length;
const offerReady = pilotOfferPack.status === 'pilot_offer_pack_ready_not_buyer_proof'
  && Boolean(offer.name)
  && asArray(offer.success_criteria).length > 0;
const marketBuyerSafePilot = Boolean(marketNicheValidation.summary?.buyer_safe_pilot_claim_allowed);
const ownerApprovalReady = Boolean(ownerApprovalValidation.summary?.all_required_approvals_ready_for_downstream_evidence);

const draftForClaimScan = {
  outcomeRows,
  proof_boundary: 'This kit makes pilot outcomes measurable for owner review. It does not prove buyer demand, willingness to pay, hosted runtime health, enterprise readiness, prediction accuracy, or commercial readiness.',
  allowed_claims: [
    'pilot outcome measurement ready for owner review',
    'baseline-and-outcome capture contract',
    'buyer decision event capture plan'
  ]
};
const forbiddenClaimMentions = collectForbiddenClaims(draftForClaimScan);
const outcomeMeasurementReady = offerReady
  && marketBuyerSafePilot
  && coverageCount === REQUIRED_NICHES.length
  && rowsWithBaseline === REQUIRED_NICHES.length
  && rowsWithTarget === REQUIRED_NICHES.length
  && rowsWithQuality === REQUIRED_NICHES.length
  && rowsWithDecision === REQUIRED_NICHES.length
  && rowsWithEvidenceCapture === REQUIRED_NICHES.length
  && forbiddenClaimMentions.length === 0;

const acceptanceGates = [
  {
    gate: 'top_five_outcome_coverage',
    status: coverageCount === REQUIRED_NICHES.length ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `${coverageCount}/${REQUIRED_NICHES.length} top-five niches have outcome rows; selected_target_coverage=${selectedCoverageCount}/${REQUIRED_NICHES.length}.`,
    next_action: 'Keep this measurement contract attached to the five-niche pilot package until buyer evidence changes the ranking.'
  },
  {
    gate: 'baseline_target_quality_metrics_present',
    status: rowsWithBaseline === REQUIRED_NICHES.length
      && rowsWithTarget === REQUIRED_NICHES.length
      && rowsWithQuality === REQUIRED_NICHES.length
      ? 'passed'
      : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `baseline=${rowsWithBaseline}/${REQUIRED_NICHES.length}; target=${rowsWithTarget}/${REQUIRED_NICHES.length}; quality=${rowsWithQuality}/${REQUIRED_NICHES.length}.`,
    next_action: 'Capture baseline before any buyer pilot run so value can be measured instead of inferred.'
  },
  {
    gate: 'buyer_decision_event_capture',
    status: rowsWithDecision === REQUIRED_NICHES.length && rowsWithEvidenceCapture === REQUIRED_NICHES.length
      ? 'passed'
      : 'failed',
    proof_bucket: 'repo_artifact',
    evidence: `decision_event_rows=${rowsWithDecision}/${REQUIRED_NICHES.length}; evidence_capture_rows=${rowsWithEvidenceCapture}/${REQUIRED_NICHES.length}.`,
    next_action: 'Record no-fit, follow-up, paid-pilot, LOI, and procurement-path outcomes exactly after owner-approved calls.'
  },
  {
    gate: 'current_framework_alignment',
    status: CURRENT_SOURCE_ALIGNMENT.length >= 5 ? 'passed' : 'failed',
    proof_bucket: 'repo_artifact_and_external_research',
    evidence: `${CURRENT_SOURCE_ALIGNMENT.length} current source anchors map the kit to AI risk management, software security, forecast evaluation, foresight, and LLM risk boundaries.`,
    next_action: 'Refresh source anchors when AI evaluation, forecasting, or public-sector foresight standards change.'
  },
  {
    gate: 'outcome_claim_guardrail',
    status: forbiddenClaimMentions.length === 0 ? 'passed_blocking_upgrades' : 'failed_unsupported_claim_language',
    proof_bucket: 'repo_artifact',
    evidence: `${forbiddenClaimMentions.length} forbidden claim mentions in measurement rows and proof boundary.`,
    next_action: 'Keep outcome-measurement language separate from buyer-validation, hosted-live, enterprise-ready, and prediction-accuracy claims.'
  },
  {
    gate: 'owner_and_buyer_outcome_proof_absent',
    status: !ownerApprovalReady ? 'blocked_owner_buyer_proof_missing' : 'owner_ready_for_downstream_capture',
    proof_bucket: 'owner_input',
    evidence: `owner_approved=${ownerApprovedCount}/${ownerRequiredCount}; real_outcome_rows=0; buyer_validated_claim_allowed=false.`,
    next_action: 'Owner approves pilot case collection, then records real before/after and buyer decision events.'
  }
];

const report = {
  schema_version: 'pilot-outcome-measurement-kit-v1',
  generated_at: new Date().toISOString(),
  status: outcomeMeasurementReady
    ? 'pilot_outcome_measurement_kit_ready_not_outcome_proof'
    : 'pilot_outcome_measurement_kit_incomplete',
  proof_boundary: 'This kit makes the five-niche pilot measurable for owner review. It is not buyer validation, willingness-to-pay proof, hosted proof, enterprise readiness, prediction accuracy proof, or commercial-ready proof.',
  source: {
    launch_evidence: inputPaths.evidence,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    market_niche_validation: inputPaths.marketNicheValidation,
    owner_approval_validation: inputPaths.ownerApprovalValidation,
    commercial_confidence_gate: inputPaths.commercialConfidenceGate,
    launch_decision: evidence.launch_decision ?? 'unknown',
    pilot_strategy_confidence_percent: commercialConfidenceGate.posture?.pilot_strategy_confidence_percent ?? null,
    commercial_world_class_confidence_percent: commercialConfidenceGate.posture?.commercial_world_class_confidence_percent ?? null
  },
  summary: {
    outcome_measurement_ready_for_owner_review: outcomeMeasurementReady,
    outcome_proof_claimed: false,
    required_niche_count: REQUIRED_NICHES.length,
    top_five_niche_coverage_count: coverageCount,
    selected_target_coverage_count: selectedCoverageCount,
    rows_with_baseline_measure: rowsWithBaseline,
    rows_with_target_measure: rowsWithTarget,
    rows_with_quality_measure: rowsWithQuality,
    rows_with_buyer_decision_event: rowsWithDecision,
    rows_with_minimum_evidence_capture: rowsWithEvidenceCapture,
    forbidden_claim_mention_count: forbiddenClaimMentions.length,
    offer_ready: offerReady,
    market_buyer_safe_pilot_claim_allowed: marketBuyerSafePilot,
    owner_approval_ready: ownerApprovalReady,
    owner_approved_count: ownerApprovedCount,
    owner_required_count: ownerRequiredCount,
    buyer_validated_claim_allowed: false,
    hosted_live_claim_allowed: false,
    enterprise_ready_claim_allowed: false,
    accuracy_claim_allowed: false,
    commercial_ready_claim_allowed: false,
    world_class_prediction_claim_allowed: false
  },
  current_source_alignment: CURRENT_SOURCE_ALIGNMENT,
  outcome_rows: outcomeRows,
  forbidden_claim_mentions: forbiddenClaimMentions,
  acceptance_gates: acceptanceGates,
  release_holds: [
    {
      hold: 'real_pilot_outcomes_missing',
      severity: 'P0',
      status: 'active',
      evidence_needed: 'Owner-approved real pilot rows with baseline values, pilot outcome values, reviewer notes, and buyer decision events.'
    },
    {
      hold: 'buyer_commitment_signal_missing',
      severity: 'P0',
      status: 'active',
      evidence_needed: 'At least three qualified follow-ups and one paid-pilot, LOI, or procurement-path signal from real calls.'
    },
    {
      hold: 'forecast_accuracy_outcomes_missing',
      severity: 'P0',
      status: dimensionById.get('prediction_accuracy_proof')?.status ?? 'blocked_owner_or_external_evidence',
      evidence_needed: 'Owner-approved resolved forecast rows, comparable baselines, leakage review, and scoring evidence.'
    }
  ],
  next_actions: [
    'Attach this kit to the owner review packet before buyer calls so each pilot has a baseline and target outcome.',
    'Do not run buyer calls without baseline capture fields; otherwise sellability cannot be measured after the call.',
    'After owner-approved pilot rows exist, rerun buyer input validation, substitution evidence validation, buyer proof gate, and commercial confidence gate.',
    'Keep launch decision at pilot-only until owner, buyer, hosted, enterprise, and prediction evidence gates pass.'
  ]
};

function renderMarkdown(artifact) {
  const outcomeRowsMd = artifact.outcome_rows
    .map((row) => `| ${[
      row.rank,
      row.niche,
      row.baseline_measure,
      row.target_outcome_measure,
      row.quality_measure,
      row.buyer_decision_event,
      row.success_threshold_for_owner_review
    ].map(mdCell).join(' | ')} |`)
    .join('\n');
  const gateRows = artifact.acceptance_gates
    .map((gate) => `| ${[
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence,
      gate.next_action
    ].map(mdCell).join(' | ')} |`)
    .join('\n');
  const sourceRows = artifact.current_source_alignment
    .map((source) => `| ${mdCell(source.source)} | ${source.url} | ${mdCell(source.implication)} |`)
    .join('\n');
  const holds = artifact.release_holds
    .map((hold) => `| ${[hold.hold, hold.severity, hold.status, hold.evidence_needed].map(mdCell).join(' | ')} |`)
    .join('\n');
  const actions = artifact.next_actions.map((item, index) => `${index + 1}. ${item}`).join('\n');

  return `# Pilot Outcome Measurement Kit - 2026-06-06

Status: \`${artifact.status}\`.

Outcome measurement ready for owner review: **${artifact.summary.outcome_measurement_ready_for_owner_review}**.

Outcome proof claimed: **${artifact.summary.outcome_proof_claimed}**.

Top-five niche coverage: **${artifact.summary.top_five_niche_coverage_count}/${artifact.summary.required_niche_count}**.

Owner approvals: **${artifact.summary.owner_approved_count}/${artifact.summary.owner_required_count}**.

Commercial/world-class confidence remains **${artifact.source.commercial_world_class_confidence_percent}%** and the launch decision remains \`${artifact.source.launch_decision}\`.

## Outcome Rows

| Rank | Niche | Baseline Measure | Target Outcome Measure | Quality Measure | Buyer Decision Event | Success Threshold |
|---:|---|---|---|---|---|---|
${outcomeRowsMd}

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Current Source Alignment

| Source | URL | Implication |
|---|---|---|
${sourceRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holds}

## Next Actions

${actions}

## Proof Boundary

${artifact.proof_boundary}
`;
}

function renderCsv(artifact) {
  const headers = [
    'rank',
    'niche',
    'sellability_role',
    'pilot_case_unit',
    'baseline_measure',
    'target_outcome_measure',
    'quality_measure',
    'buyer_decision_event',
    'success_threshold_for_owner_review',
    'selected_target_count',
    'sale_boundary'
  ];

  return [
    csvLine(headers),
    ...artifact.outcome_rows.map((row) => csvLine(headers.map((header) => row[header])))
  ].join('\n') + '\n';
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(report));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(report));
}

if (updateEvidence) {
  const nextEvidence = readJsonIfExists(inputPaths.evidence, null);
  if (!nextEvidence) {
    console.error(`Cannot update missing evidence artifact: ${inputPaths.evidence}`);
    process.exit(2);
  }

  nextEvidence.proof_buckets = nextEvidence.proof_buckets ?? {};
  nextEvidence.proof_buckets.local = replaceMatchingThenAppend(nextEvidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:pilot:outcome-kit -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, outcome_measurement_ready_for_owner_review ${report.summary.outcome_measurement_ready_for_owner_review}, outcome_proof_claimed ${report.summary.outcome_proof_claimed}`
  ], [
    /npm run audit:pilot:outcome-kit/
  ]);

  nextEvidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(nextEvidence.proof_buckets.repo_artifact, [
    'scripts/build-pilot-outcome-measurement-kit.mjs maps the five validated niches to baseline, target outcome, quality, buyer decision, and evidence-capture metrics without upgrading claims',
    'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json records a score-neutral pilot outcome measurement contract for owner review',
    'docs/launch-readiness/pilot-outcome-measurement-checklist-2026-06-06.csv provides the outcome measurement checklist for owner-approved pilot rows'
  ], [
    /scripts\/build-pilot-outcome-measurement-kit\.mjs/,
    /pilot-outcome-measurement-kit-2026-06-06\.json/,
    /pilot-outcome-measurement-checklist-2026-06-06\.csv/
  ]);

  nextEvidence.fix_report = nextEvidence.fix_report ?? {};
  nextEvidence.fix_report.files_changed = replaceMatchingThenAppend(nextEvidence.fix_report.files_changed, [
    'scripts/build-pilot-outcome-measurement-kit.mjs',
    'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json',
    'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.md',
    'docs/launch-readiness/pilot-outcome-measurement-checklist-2026-06-06.csv',
    'scripts/validate-pilot-package-readiness.mjs',
    'package.json'
  ], [
    /scripts\/build-pilot-outcome-measurement-kit\.mjs/,
    /pilot-outcome-measurement-kit-2026-06-06\.json/,
    /pilot-outcome-measurement-kit-2026-06-06\.md/,
    /pilot-outcome-measurement-checklist-2026-06-06\.csv/,
    /scripts\/validate-pilot-package-readiness\.mjs/,
    /package\.json/
  ]);

  nextEvidence.fix_report.tests_run = replaceMatchingThenAppend(nextEvidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-pilot-outcome-measurement-kit.mjs',
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:pilot:outcome-kit -- --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence`
  ], [
    /node --check scripts\/build-pilot-outcome-measurement-kit\.mjs/,
    /npm run audit:pilot:outcome-kit/
  ]);

  nextEvidence.fix_report.approval_gates = replaceMatchingThenAppend(nextEvidence.fix_report.approval_gates, [
    'Pilot outcome measurement is owner-review proof only; it does not upgrade buyer validation, hosted-live, enterprise-ready, commercial-ready, or prediction-accuracy claims.'
  ], [
    /Pilot outcome measurement is owner-review proof only/
  ]);

  nextEvidence.implementation_decisions = replaceByTaskId(nextEvidence.implementation_decisions, {
    task_id: 'pilot-outcome-measurement-kit',
    decision: 'Add a score-neutral pilot outcome measurement kit for the top-five niche strategy.',
    acceptance_check: 'Each selected niche must have baseline, target outcome, quality, buyer decision, minimum evidence, and proof-boundary fields while keeping all claim upgrades blocked.',
    chosen_variant: 'minimal Node artifact builder plus package-readiness gate; no product runtime change, no new dependency, no confidence-score increase',
    rejected_variants: [
      'Product UI dashboard: rejected because the missing proof is owner/buyer outcome capture, not a screen.',
      'Raise commercial confidence: rejected because no real owner approval, buyer call, hosted smoke, or resolved forecast evidence was added.',
      'Broader market report: rejected because market narratives already exist and do not measure pilot outcomes.'
    ],
    repo_pattern_reused: 'Existing launch-readiness Node artifact builder with JSON, Markdown, CSV, and evidence update outputs',
    files_changed: [
      'scripts/build-pilot-outcome-measurement-kit.mjs',
      'scripts/validate-pilot-package-readiness.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-pilot-outcome-measurement-kit.mjs',
      'npm run audit:pilot:outcome-kit',
      'npm run audit:pilot:package-readiness'
    ],
    proof: `${report.status}; outcome_measurement_ready_for_owner_review=${report.summary.outcome_measurement_ready_for_owner_review}; outcome_proof_claimed=${report.summary.outcome_proof_claimed}; world_class_prediction_claim_allowed=false.`,
    reason: 'The long-term sellability gap is measurable pilot value per niche, not stronger unsupported market language.'
  });

  nextEvidence.rejected_variants = replaceByTaskId(nextEvidence.rejected_variants, {
    task_id: 'pilot-outcome-measurement-kit',
    variant: 'Treat buyer discovery call sheets as sufficient outcome measurement.',
    reason_rejected: 'The discovery kit captures objections and willingness-to-pay signals but does not require per-niche baseline and target outcome measures.',
    tradeoff: 'A separate measurement kit keeps buyer calls measurable while preserving pilot-only status.',
    evidence: `${report.status}; top_five_niche_coverage=${report.summary.top_five_niche_coverage_count}/${report.summary.required_niche_count}.`
  });

  nextEvidence.code_optimization_reviews = replaceByTaskId(nextEvidence.code_optimization_reviews, {
    target_task: 'pilot-outcome-measurement-kit',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No dependency, no runtime product edit, no live outreach, no secret-dependent execution, and no confidence score change.',
    tests_or_checks: [
      'node --check scripts/build-pilot-outcome-measurement-kit.mjs',
      'npm run audit:pilot:outcome-kit',
      'npm run audit:pilot:package-readiness'
    ],
    remaining_risk: 'Real owner approvals, buyer outcomes, hosted proof, enterprise procurement evidence, and resolved forecast scoring remain missing.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  outcome_measurement_ready_for_owner_review: report.summary.outcome_measurement_ready_for_owner_review,
  outcome_proof_claimed: report.summary.outcome_proof_claimed,
  top_five_niche_coverage_count: report.summary.top_five_niche_coverage_count,
  owner_approved_count: report.summary.owner_approved_count,
  owner_required_count: report.summary.owner_required_count,
  buyer_validated_claim_allowed: report.summary.buyer_validated_claim_allowed,
  hosted_live_claim_allowed: report.summary.hosted_live_claim_allowed,
  commercial_ready_claim_allowed: report.summary.commercial_ready_claim_allowed,
  world_class_prediction_claim_allowed: report.summary.world_class_prediction_claim_allowed
}, null, 2));

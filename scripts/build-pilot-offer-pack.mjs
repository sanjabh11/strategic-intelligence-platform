#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_CONFIDENCE_GATE = 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.json';
const DEFAULT_BUYER_TARGETS = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json';
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_ACCURACY_INTAKE_KIT = 'docs/launch-readiness/accuracy-evidence-intake-kit-2026-06-06.json';
const DEFAULT_HOSTED_PROOF_KIT = 'docs/launch-readiness/hosted-operational-proof-kit-2026-06-06.json';
const DEFAULT_RLS_DRAFT = 'docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/pilot-offer-buyer-fit-checklist-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-pilot-offer-pack.mjs',
    `  [--evidence ${DEFAULT_EVIDENCE}]`,
    `  [--confidence-gate ${DEFAULT_CONFIDENCE_GATE}]`,
    `  [--buyer-targets ${DEFAULT_BUYER_TARGETS}]`,
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--accuracy-intake-kit ${DEFAULT_ACCURACY_INTAKE_KIT}]`,
    `  [--hosted-proof-kit ${DEFAULT_HOSTED_PROOF_KIT}]`,
    `  [--rls-draft ${DEFAULT_RLS_DRAFT}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const inputPaths = {
  evidence: argValue('--evidence', DEFAULT_EVIDENCE),
  confidenceGate: argValue('--confidence-gate', DEFAULT_CONFIDENCE_GATE),
  buyerTargets: argValue('--buyer-targets', DEFAULT_BUYER_TARGETS),
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  accuracyIntakeKit: argValue('--accuracy-intake-kit', DEFAULT_ACCURACY_INTAKE_KIT),
  hostedProofKit: argValue('--hosted-proof-kit', DEFAULT_HOSTED_PROOF_KIT),
  rlsDraft: argValue('--rls-draft', DEFAULT_RLS_DRAFT)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return fallback;
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
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

const evidence = readJsonIfExists(inputPaths.evidence, {
  launch_decision: 'unknown',
  proof_buckets: { hosted_live: [], local: [], repo_artifact: [] },
  pain_points: [],
  target_customers: []
});
const confidenceGate = readJsonIfExists(inputPaths.confidenceGate, { posture: {}, dimensions: [], primary_blockers: [] });
const buyerTargets = readJsonIfExists(inputPaths.buyerTargets, { targets: [], target_count: 0 });
const buyerDiscoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, { selected_targets: [], source: {} });
const accuracyIntakeKit = readJsonIfExists(inputPaths.accuracyIntakeKit, { status: 'missing', acceptance_gates: [] });
const hostedProofKit = readJsonIfExists(inputPaths.hostedProofKit, { status: 'missing', smoke_plan: [] });
const rlsDraft = readJsonIfExists(inputPaths.rlsDraft, { commercial_security_status: 'missing', summary: {} });

const dimensionById = new Map((confidenceGate.dimensions ?? []).map((dimension) => [dimension.id, dimension]));
const selectedTargets = Array.isArray(buyerDiscoveryKit.selected_targets)
  ? buyerDiscoveryKit.selected_targets
  : [];
const allTargets = Array.isArray(buyerTargets.targets) ? buyerTargets.targets : [];

const currentSources = [
  {
    source: 'NIST AI Risk Management Framework',
    url: 'https://www.nist.gov/itl/ai-risk-management-framework',
    implication: 'The offer should sell governed, measured, managed AI decision support rather than unsupported autonomous prediction claims.'
  },
  {
    source: 'CISA Secure by Design',
    url: 'https://www.cisa.gov/resources-tools/resources/secure-by-design',
    implication: 'Enterprise/public-sector pilot material must show security and deployment proof gates, not only product features.'
  },
  {
    source: 'Recorded Future Geopolitical Intelligence',
    url: 'https://www.recordedfuture.com/products/geopolitical-intelligence',
    implication: 'The market already buys geopolitical intelligence for operational risk, so differentiation must be decision-workflow governance rather than raw event monitoring.'
  },
  {
    source: 'Palantir AIP',
    url: 'https://www.palantir.com/platforms/aip/',
    implication: 'Operational AI buyers expect decision-context integration, security, and action workflows; this app should position as a narrower evidence-to-forecast pilot, not a full ontology platform.'
  },
  {
    source: 'Metaculus organizational forecasting',
    url: 'https://www.metaculus.com/about/',
    implication: 'Forecasting is a real service market, but accuracy claims require resolved outcomes and benchmarked baselines.'
  },
  {
    source: 'Good Judgment training and services',
    url: 'https://goodjudgment.com/services/training/',
    implication: 'Forecasting and decision-skill training is a credible adjacent lane, but it should not distract from the first enterprise/public-sector decision workflow wedge.'
  },
  {
    source: 'ForecastBench',
    url: 'https://www.forecastbench.org/about/',
    implication: 'World-class prediction language needs dynamic, comparable, resolved-outcome evaluation rather than sample fixtures.'
  },
  {
    source: 'OECD Strategic Foresight',
    url: 'https://www.oecd.org/strategic-foresight/',
    implication: 'Public-sector foresight buyers value structured exploration of plausible futures, not single-future prediction.'
  }
];

const proofAssets = [
  inputPaths.evidence,
  inputPaths.confidenceGate,
  inputPaths.buyerTargets,
  inputPaths.buyerDiscoveryKit,
  inputPaths.accuracyIntakeKit,
  inputPaths.hostedProofKit,
  inputPaths.rlsDraft
];

const nicheOfferSequence = [
  {
    rank: 1,
    niche: 'Enterprise/public-sector strategic decision intelligence',
    sellability_role: 'primary_offer',
    buyer_job: 'Turn ambiguous geopolitical, policy, supplier, or operational risk questions into evidence-backed briefs, countermove maps, review states, and scoreable forecast drafts.',
    proof_assets: ['Strategist/enterprise workflow route and function evidence', 'commercial-confidence-gate-2026-06-06.json', 'buyer-discovery-kit-2026-06-06.json'],
    sale_boundary: 'guided pilot only; no commercial-ready or prediction-superiority claim',
    readiness_score_percent: dimensionById.get('market_thesis')?.current_score_percent ?? 80
  },
  {
    rank: 2,
    niche: 'Governed forecasting and research workflow',
    sellability_role: 'second_offer_after_data',
    buyer_job: 'Link research evidence, human review, forecast governance, Brier scoring, and resolved-outcome learning.',
    proof_assets: ['accuracy-evidence-intake-kit-2026-06-06.json', 'forecast-benchmark-comparison-2026-06-06.json', 'whitebox-release function evidence'],
    sale_boundary: 'do not sell accuracy until owner-approved resolved outcomes and real baselines are scored',
    readiness_score_percent: dimensionById.get('prediction_accuracy_proof')?.current_score_percent ?? 35
  },
  {
    rank: 3,
    niche: 'Geopolitical risk radar and scenario monitor',
    sellability_role: 'demo_lane_with_feed_caveats',
    buyer_job: 'Monitor external risk signals and convert them into actor-aware strategic prompts and scenarios.',
    proof_assets: ['hosted-operational-proof-kit-2026-06-06.json', 'live-data-providers function evidence', 'geopolitical-radar tests'],
    sale_boundary: 'requires hosted non-simulated feed proof and freshness/SLA labels before production claims',
    readiness_score_percent: dimensionById.get('repo_product_proof')?.current_score_percent ?? 75
  },
  {
    rank: 4,
    niche: 'Executive and analyst briefing layer',
    sellability_role: 'proof_of_depth_for_primary_offer',
    buyer_job: 'Package the same evidence/review/forecast workflow for executives, analysts, and governance reviewers.',
    proof_assets: ['EnterpriseBriefingPanel route/component evidence', 'market-differentiation-validation-2026-06-06.md'],
    sale_boundary: 'use as demo narrative, not standalone enterprise platform claim',
    readiness_score_percent: dimensionById.get('differentiated_workflow')?.current_score_percent ?? 78
  },
  {
    rank: 5,
    niche: 'Negotiation and strategic reasoning training',
    sellability_role: 'adjacent_revenue_lane',
    buyer_job: 'Train managers, students, and analysts on negotiation, game trees, and forecasting discipline with structured debriefs.',
    proof_assets: ['NegotiationDojo/Classroom route evidence', 'hosted-operational-proof-kit-2026-06-06.json'],
    sale_boundary: 'requires classroom hosted smoke and buyer-specific curriculum proof before packaging as training product',
    readiness_score_percent: 55
  }
];

const substitutionMatrix = [
  {
    substitute: 'Geopolitical intelligence platforms',
    examples: ['Recorded Future'],
    covered_niches: ['Geopolitical risk radar and scenario monitor'],
    buyer_strength: 'real-time monitoring, source depth, location and country-risk intelligence',
    app_differentiator: 'turns evidence into actor reasoning, countermoves, human review state, and forecast-draft governance',
    avoid_claim: 'do not claim better raw intelligence coverage without hosted source/freshness proof'
  },
  {
    substitute: 'Operational AI platforms',
    examples: ['Palantir AIP'],
    covered_niches: [
      'Enterprise/public-sector strategic decision intelligence',
      'Executive and analyst briefing layer'
    ],
    buyer_strength: 'enterprise ontology, operational context, security, and action workflows',
    app_differentiator: 'narrower, faster guided pilot around decision-quality workflow for strategy/risk teams',
    avoid_claim: 'do not claim full enterprise ontology, private deployment, or scaled integration proof'
  },
  {
    substitute: 'Forecasting services and tournaments',
    examples: ['Metaculus', 'Good Judgment'],
    covered_niches: ['Governed forecasting and research workflow'],
    buyer_strength: 'forecasting communities, training, custom forecasting services, and benchmarkable probability discipline',
    app_differentiator: 'bridges source research, strategist brief, review gates, and governed forecast creation',
    avoid_claim: 'do not claim world-class accuracy before resolved-outcome and baseline evidence'
  },
  {
    substitute: 'Public-sector foresight process',
    examples: ['OECD strategic foresight programs'],
    covered_niches: [
      'Enterprise/public-sector strategic decision intelligence',
      'Executive and analyst briefing layer'
    ],
    buyer_strength: 'structured scenario thinking and anticipatory governance',
    app_differentiator: 'operationalizes foresight into evidence bundles, review states, and scoreable follow-up questions',
    avoid_claim: 'do not reduce foresight to single-future prediction'
  },
  {
    substitute: 'Strategy training and simulation programs',
    examples: ['Good Judgment training', 'business-school negotiation simulations'],
    covered_niches: ['Negotiation and strategic reasoning training'],
    buyer_strength: 'facilitated learning, classroom credibility, and reusable debrief structure',
    app_differentiator: 'links negotiation practice to game-tree reasoning, evidence review, forecast discipline, and analyst workflow handoff',
    avoid_claim: 'do not claim training product-market fit before hosted classroom smoke and buyer-specific curriculum proof'
  }
];

const pilotOffer = {
  name: 'Governed Strategic Intelligence Pilot',
  status: 'pilot_offer_pack_ready_not_buyer_proof',
  primary_buyer: 'Enterprise or public-sector strategy, risk, foresight, geopolitical, or analyst-workflow owner',
  promise: 'Reduce the time and ambiguity between source evidence and decision-ready strategic options while preserving provenance, uncertainty, human review, and forecastability.',
  proof_boundary: 'This is a packaged pilot offer built from repo artifacts, desk research, and proof-kit readiness. It is not buyer validation, hosted proof, enterprise-security proof, or prediction-accuracy proof.',
  allowed_claims: [
    'governed strategic-intelligence pilot',
    'evidence-backed actor reasoning and countermove workflow',
    'human-review and forecast-governance aware decision support',
    'calibration-aware, resolved-outcome-ready forecasting workflow'
  ],
  prohibited_claims: [
    'world-class accurate predictions',
    'commercial-ready enterprise platform',
    'fully proven hosted runtime',
    'buyer-validated willingness to pay',
    'fully remediated RLS/tenant isolation'
  ],
  pilot_scope: [
    'Select one high-stakes strategic question and one buyer team.',
    'Run source-to-brief-to-review-to-forecast workflow on 3 to 5 representative cases.',
    'Document evidence quality, review blockers, decision actions, and forecastability for each case.',
    'End with a buyer decision: no fit, internal follow-up, paid pilot discussion, LOI path, or procurement path.'
  ],
  success_criteria: [
    'At least three qualified buyer follow-ups from the target slate.',
    'At least one paid-pilot, LOI, or procurement-path conversation.',
    'Hosted proof attached for the demo route used in the pilot.',
    'No market copy uses prediction-superiority language before approved resolved-outcome scoring.'
  ],
  proof_packet: proofAssets,
  selected_target_count: selectedTargets.length,
  named_target_count: Number(buyerTargets.target_count ?? allTargets.length ?? 0),
  current_confidence: {
    launch_decision: evidence.launch_decision ?? 'unknown',
    pilot_strategy_confidence_percent: confidenceGate.posture?.pilot_strategy_confidence_percent ?? null,
    commercial_world_class_confidence_percent: confidenceGate.posture?.commercial_world_class_confidence_percent ?? null,
    decision: confidenceGate.posture?.decision ?? 'unknown'
  }
};

const buyerFitChecklist = [
  {
    segment: 'Enterprise strategy/risk',
    qualification_question: 'Do you have recurring decisions where geopolitical, supplier, cyber, policy, or market signals must be turned into an executive-ready action recommendation?',
    pass_signal: 'Named team owns the workflow and can provide 3 to 5 representative cases.',
    disqualifier: 'No current decision owner or no willingness to show the current workflow.',
    proof_asset: 'commercial-launch-readiness-2026-06-06.md',
    owner_input_needed: 'pilot case list',
    claim_status: 'guided_pilot_claim_allowed'
  },
  {
    segment: 'Public-sector foresight/policy',
    qualification_question: 'Do you need plausible-futures analysis linked to evidence, review, and follow-up forecast questions?',
    pass_signal: 'Buyer values scenario reasoning and governance over single-future prediction.',
    disqualifier: 'Buyer demands automated prediction superiority before workflow evaluation.',
    proof_asset: 'pilot-offer-pack-2026-06-06.md',
    owner_input_needed: 'policy scenario and review constraints',
    claim_status: 'foresight_workflow_claim_allowed'
  },
  {
    segment: 'Forecasting/research team',
    qualification_question: 'Can you supply resolved binary questions and comparable baseline forecasts for scoring?',
    pass_signal: 'Owner can provide at least 25 approved resolved rows for one scored source.',
    disqualifier: 'No resolved outcome data or baseline source is available.',
    proof_asset: 'accuracy-evidence-intake-kit-2026-06-06.json',
    owner_input_needed: 'approved resolved forecast export and comparable baseline',
    claim_status: 'accuracy_claim_blocked_until_scored'
  },
  {
    segment: 'Geopolitical/security intelligence',
    qualification_question: 'Is your problem source overload plus decision handoff, rather than only event monitoring?',
    pass_signal: 'Buyer needs actor reasoning, countermoves, and decision logs after external signals.',
    disqualifier: 'Buyer only wants raw location alerts or intelligence-feed replacement.',
    proof_asset: 'hosted-operational-proof-kit-2026-06-06.json',
    owner_input_needed: 'hosted non-simulated feed proof',
    claim_status: 'hosted_radar_claim_blocked_until_smoked'
  },
  {
    segment: 'Learning and development',
    qualification_question: 'Do managers or analysts need applied negotiation, game tree, or forecasting training tied to measurable debriefs?',
    pass_signal: 'Buyer can pilot with one cohort and a concrete decision-skill rubric.',
    disqualifier: 'Buyer wants a generic course marketplace rather than applied organizational cases.',
    proof_asset: 'buyer-discovery-kit-2026-06-06.json',
    owner_input_needed: 'cohort, rubric, hosted classroom proof',
    claim_status: 'adjacent_lane_only'
  }
];

const report = {
  schema_version: 'pilot-offer-pack-v1',
  generated_at: new Date().toISOString(),
  status: pilotOffer.status,
  proof_boundary: pilotOffer.proof_boundary,
  source: {
    launch_evidence: inputPaths.evidence,
    confidence_gate: inputPaths.confidenceGate,
    buyer_targets: inputPaths.buyerTargets,
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    accuracy_intake_kit: inputPaths.accuracyIntakeKit,
    hosted_proof_kit: inputPaths.hostedProofKit,
    rls_draft: inputPaths.rlsDraft,
    launch_decision: evidence.launch_decision ?? 'unknown',
    buyer_validation_verified: false,
    hosted_state_verified: Array.isArray(evidence.proof_buckets?.hosted_live) && evidence.proof_buckets.hosted_live.length > 0,
    accuracy_claim_verified: false,
    rls_policy_verified: Boolean(rlsDraft.source?.migration_applied)
  },
  pilot_offer: pilotOffer,
  niche_offer_sequence: nicheOfferSequence,
  substitution_matrix: substitutionMatrix,
  buyer_fit_checklist: buyerFitChecklist,
  required_proof_before_upgrade: [
    'Complete the selected buyer discovery calls and record buyer role, proof shown, objection, next action, willingness-to-pay signal, and evidence quality.',
    'Attach hosted smoke evidence through the hosted operational proof kit.',
    'Owner-approve and test the first RLS policy batch before enterprise/private-data claims.',
    'Score owner-approved resolved forecasts against real comparable baselines before prediction-accuracy claims.'
  ],
  current_source_alignment: currentSources,
  current_blockers: [
    `Buyer validation status remains ${dimensionById.get('buyer_validation')?.status ?? 'unknown'}.`,
    `Hosted proof kit status is ${hostedProofKit.status ?? 'unknown'} with ${(hostedProofKit.smoke_plan ?? []).length} planned checks.`,
    `Accuracy intake status is ${accuracyIntakeKit.status ?? 'unknown'} with ${(accuracyIntakeKit.acceptance_gates ?? []).length} acceptance gates.`,
    `RLS draft status is ${rlsDraft.commercial_security_status ?? 'unknown'} with ${rlsDraft.summary?.open_decision_count ?? 0} open owner decisions.`
  ]
};

function renderCsv() {
  const headers = [
    'segment',
    'qualification_question',
    'pass_signal',
    'disqualifier',
    'proof_asset',
    'owner_input_needed',
    'claim_status'
  ];

  return [headers, ...buyerFitChecklist.map((row) => headers.map((header) => row[header]))]
    .map(csvLine)
    .join('\n') + '\n';
}

function renderMarkdown() {
  const nicheRows = nicheOfferSequence
    .map((item) => [
      item.rank,
      mdCell(item.niche),
      mdCell(item.sellability_role),
      mdCell(item.buyer_job),
      mdCell(item.sale_boundary)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const substituteRows = substitutionMatrix
    .map((item) => [
      mdCell(item.substitute),
      mdCell(item.examples.join(', ')),
      mdCell(item.covered_niches.join('; ')),
      mdCell(item.buyer_strength),
      mdCell(item.app_differentiator),
      mdCell(item.avoid_claim)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const checklistRows = buyerFitChecklist
    .map((item) => [
      mdCell(item.segment),
      mdCell(item.qualification_question),
      mdCell(item.pass_signal),
      mdCell(item.disqualifier),
      mdCell(item.claim_status)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const sourceRows = currentSources
    .map((item) => `| ${mdCell(item.source)} | ${item.url} | ${mdCell(item.implication)} |`)
    .join('\n');

  return `# Pilot Offer Pack - 2026-06-06

## Status

Status: \`${report.status}\`.

Offer: **${pilotOffer.name}**.

This is a sellability packet, not buyer proof. The launch decision remains \`${pilotOffer.current_confidence.launch_decision}\`, with pilot-strategy confidence **${pilotOffer.current_confidence.pilot_strategy_confidence_percent}%** and commercial/world-class confidence **${pilotOffer.current_confidence.commercial_world_class_confidence_percent}%**.

## Buyer-Safe Promise

${pilotOffer.promise}

Allowed claims:

${pilotOffer.allowed_claims.map((claim) => `- ${claim}`).join('\n')}

Prohibited claims:

${pilotOffer.prohibited_claims.map((claim) => `- ${claim}`).join('\n')}

## Niche Offer Sequence

| Rank | Niche | Role | Buyer Job | Sale Boundary |
|---:|---|---|---|---|
${nicheRows}

## Substitution Matrix

| Substitute | Examples | Covered Niches | Buyer Strength | App Differentiator | Avoid Claim |
|---|---|---|---|---|---|
${substituteRows}

## Pilot Scope

${pilotOffer.pilot_scope.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Success Criteria

${pilotOffer.success_criteria.map((item) => `- ${item}`).join('\n')}

## Buyer Fit Checklist

| Segment | Qualification Question | Pass Signal | Disqualifier | Claim Status |
|---|---|---|---|---|
${checklistRows}

## Current Source Alignment

| Source | URL | Implication |
|---|---|---|
${sourceRows}

## Proof Boundary

${pilotOffer.proof_boundary}
`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown());
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv());
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: report.status,
  selected_target_count: selectedTargets.length,
  named_target_count: pilotOffer.named_target_count,
  pilot_strategy_confidence_percent: pilotOffer.current_confidence.pilot_strategy_confidence_percent,
  commercial_world_class_confidence_percent: pilotOffer.current_confidence.commercial_world_class_confidence_percent
}, null, 2));

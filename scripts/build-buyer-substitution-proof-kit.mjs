#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_BUYER_DISCOVERY_KIT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_PILOT_OFFER_PACK = 'docs/launch-readiness/pilot-offer-pack-2026-06-06.json';
const DEFAULT_COMPETITIVE_POSITIONING_VALIDATION = 'docs/launch-readiness/competitive-positioning-evidence-validation-2026-06-06.json';
const DEFAULT_BUYER_EXECUTION_READINESS = 'docs/launch-readiness/buyer-validation-execution-readiness-2026-06-06.json';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv';

const SUBSTITUTE_CATALOG = [
  {
    id: 'geopolitical_intelligence_platforms',
    category: 'Geopolitical intelligence platforms',
    examples: ['Recorded Future', 'Dataminr'],
    source_url: 'https://www.recordedfuture.com/products/geopolitical-intelligence',
    buyer_strength: 'real-time monitoring, alerting, location risk, country-risk scoring, source breadth, and analyst support',
    app_wedge_to_test: 'decision-quality workflow that turns source evidence into actor reasoning, review state, scenario branches, and scoreable follow-up questions',
    must_not_claim: 'raw monitoring coverage or live-intelligence superiority',
    close_question: 'Would this complement the alerting platform by improving decision briefs, or is alerting coverage the actual buying criterion?'
  },
  {
    id: 'operational_ai_platforms',
    category: 'Operational AI platforms',
    examples: ['Palantir AIP'],
    source_url: 'https://www.palantir.com/platforms/aip/',
    buyer_strength: 'enterprise ontology, governed data integration, operational AI workflows, automation, and human-in-the-loop controls',
    app_wedge_to_test: 'narrow, fast guided pilot for strategy/risk teams that do not yet need enterprise ontology deployment',
    must_not_claim: 'Palantir-class enterprise deployment, ontology depth, or scaled operational automation',
    close_question: 'Would a lightweight pilot be useful before a full enterprise AI platform evaluation, or is integrated operational deployment mandatory from day one?'
  },
  {
    id: 'forecasting_services_and_benchmarks',
    category: 'Forecasting services and tournaments',
    examples: ['Metaculus', 'Good Judgment'],
    source_url: 'https://www.metaculus.com/futureeval/',
    buyer_strength: 'large scored question history, professional forecasters, calibration, benchmark discipline, and custom forecasting services',
    app_wedge_to_test: 'workflow bridge from research evidence to forecast-draft governance and resolved-outcome scoring readiness',
    must_not_claim: 'forecasting parity, world-class accuracy, or benchmark superiority before real resolved outcomes',
    close_question: 'Is the pain better solved by buying forecasts/training, or by improving the internal workflow that creates and governs forecasts?'
  },
  {
    id: 'expert_advisory_and_risk_briefings',
    category: 'Expert advisory and risk briefings',
    examples: ['Control Risks RiskMap', 'Eurasia Group'],
    source_url: 'https://www.controlrisks.com/riskmap',
    buyer_strength: 'expert analyst judgment, executive credibility, bespoke briefings, regional depth, and board-ready advisory output',
    app_wedge_to_test: 'repeatable internal workflow for evidence capture, dissent, scenario review, and follow-up scoring between advisory cycles',
    must_not_claim: 'replacement for expert analysts or advisory firms',
    close_question: 'Would this reduce internal preparation and follow-through around advisory briefings, or is external expert judgment the core purchase?'
  },
  {
    id: 'policy_and_regulatory_intelligence',
    category: 'Policy and regulatory intelligence platforms',
    examples: ['FiscalNote', 'policy intelligence platforms'],
    source_url: 'https://fiscalnote.com/',
    buyer_strength: 'legislative tracking, regulatory intelligence, stakeholder monitoring, and policy workflow integration',
    app_wedge_to_test: 'cross-domain strategic reasoning and forecast governance around policy, geoeconomic, and institutional uncertainty',
    must_not_claim: 'legislative-data coverage, regulatory tracking completeness, or compliance workflow replacement',
    close_question: 'Is the job legislative tracking, or strategic interpretation and forecast governance around policy uncertainty?'
  },
  {
    id: 'internal_analyst_workflow',
    category: 'Internal analyst spreadsheets and memos',
    examples: ['spreadsheets', 'slides', 'email threads', 'manual analyst memos'],
    source_url: 'repo-local workflow hypothesis',
    buyer_strength: 'low procurement friction, institutional context, analyst control, and existing trust relationships',
    app_wedge_to_test: 'standardized evidence provenance, human review, assumption tracking, scenario structure, and forecast scoring handoff',
    must_not_claim: 'full analyst replacement or autonomous decision authority',
    close_question: 'Which step is painful enough to justify changing an existing trusted analyst workflow?'
  },
  {
    id: 'generic_llm_copilots',
    category: 'Generic LLM copilots',
    examples: ['ChatGPT', 'Claude', 'Microsoft Copilot'],
    source_url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications',
    buyer_strength: 'low-cost general reasoning, drafting, search, and broad familiarity',
    app_wedge_to_test: 'governed decision workflow with explicit evidence, review states, claim boundaries, and forecast-scoring readiness',
    must_not_claim: 'better general intelligence or broad LLM superiority',
    close_question: 'Does governance and repeatable evidence handling matter enough to move beyond a general LLM prompt workflow?'
  },
  {
    id: 'training_and_workshops',
    category: 'Training, simulations, and workshops',
    examples: ['negotiation training', 'scenario-planning workshops', 'war games'],
    source_url: 'https://goodjudgment.com/services/',
    buyer_strength: 'facilitated learning, behavior change, expert coaching, and stakeholder alignment',
    app_wedge_to_test: 'repeatable practice environment linking game-tree reasoning, negotiation moves, evidence, and measurable follow-up',
    must_not_claim: 'replacement for trained facilitators or certified education programs',
    close_question: 'Would a software-mediated practice loop be adopted between workshops, or is facilitated instruction the whole value?'
  }
];

const NICHE_SUBSTITUTE_MAP = {
  'Enterprise/public-sector strategic decision intelligence': [
    'operational_ai_platforms',
    'expert_advisory_and_risk_briefings',
    'internal_analyst_workflow'
  ],
  'Governed forecasting and research workflow': [
    'forecasting_services_and_benchmarks',
    'internal_analyst_workflow',
    'generic_llm_copilots'
  ],
  'Geopolitical risk radar and scenario monitor': [
    'geopolitical_intelligence_platforms',
    'expert_advisory_and_risk_briefings',
    'policy_and_regulatory_intelligence'
  ],
  'Executive and analyst briefing layer': [
    'expert_advisory_and_risk_briefings',
    'internal_analyst_workflow',
    'generic_llm_copilots'
  ],
  'Negotiation and strategic reasoning training': [
    'training_and_workshops',
    'generic_llm_copilots',
    'internal_analyst_workflow'
  ]
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
    'Usage: node scripts/build-buyer-substitution-proof-kit.mjs',
    `  [--buyer-discovery-kit ${DEFAULT_BUYER_DISCOVERY_KIT}]`,
    `  [--pilot-offer-pack ${DEFAULT_PILOT_OFFER_PACK}]`,
    `  [--competitive-positioning-validation ${DEFAULT_COMPETITIVE_POSITIONING_VALIDATION}]`,
    `  [--buyer-execution-readiness ${DEFAULT_BUYER_EXECUTION_READINESS}]`,
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
  buyerDiscoveryKit: argValue('--buyer-discovery-kit', DEFAULT_BUYER_DISCOVERY_KIT),
  pilotOfferPack: argValue('--pilot-offer-pack', DEFAULT_PILOT_OFFER_PACK),
  competitivePositioningValidation: argValue('--competitive-positioning-validation', DEFAULT_COMPETITIVE_POSITIONING_VALIDATION),
  buyerExecutionReadiness: argValue('--buyer-execution-readiness', DEFAULT_BUYER_EXECUTION_READINESS),
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

function uniqueValues(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
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

function catalogById(id) {
  return SUBSTITUTE_CATALOG.find((item) => item.id === id);
}

function substituteIdsForNiche(niche) {
  return NICHE_SUBSTITUTE_MAP[niche] ?? [
    'internal_analyst_workflow',
    'generic_llm_copilots',
    'expert_advisory_and_risk_briefings'
  ];
}

function buildTestRow(target, substitute, priority) {
  const proofToShow = asArray(target.proof_to_show).length > 0
    ? asArray(target.proof_to_show).join('; ')
    : target.proof_asset;

  return {
    rank: target.rank,
    account_name: target.account_name,
    website: target.website,
    buyer_role: target.buyer_role,
    niche: target.niche,
    substitute_priority: priority,
    substitute_category: substitute.category,
    substitute_examples: substitute.examples.join('; '),
    substitute_source_url: substitute.source_url,
    strongest_substitute_strength: substitute.buyer_strength,
    app_wedge_to_test: substitute.app_wedge_to_test,
    must_not_claim: substitute.must_not_claim,
    close_question: substitute.close_question,
    proof_to_show: proofToShow,
    call_status: 'not_contacted',
    call_date: '',
    buyer_name_or_redacted_id: '',
    current_tool_or_workflow: '',
    current_budget_owner: '',
    switching_barrier: '',
    must_have_proof: '',
    proof_shown: '',
    buyer_reaction: '',
    next_action: '',
    willingness_to_pay_signal: '',
    substitution_outcome: '',
    evidence_quality: '',
    validation_status: 'not_contacted_not_buyer_proof'
  };
}

const discoveryKit = readJsonIfExists(inputPaths.buyerDiscoveryKit, {
  status: 'missing',
  selected_targets: []
});
const pilotOfferPack = readJsonIfExists(inputPaths.pilotOfferPack, {
  status: 'missing',
  substitution_matrix: []
});
const competitivePositioningValidation = readJsonIfExists(inputPaths.competitivePositioningValidation, {
  status: 'missing',
  summary: {}
});
const buyerExecutionReadiness = readJsonIfExists(inputPaths.buyerExecutionReadiness, {
  status: 'missing',
  summary: {}
});

const selectedTargets = asArray(discoveryKit.selected_targets);
const testRows = selectedTargets.flatMap((target) => substituteIdsForNiche(target.niche)
  .map((id, index) => buildTestRow(target, catalogById(id), index + 1))
  .filter((row) => row.substitute_category));
const topPriorityRows = testRows.filter((row) => row.substitute_priority === 1);
const selectedNiches = uniqueValues(selectedTargets.map((target) => target.niche));
const coveredNiches = uniqueValues(testRows.map((row) => row.niche));
const coveredCategories = uniqueValues(testRows.map((row) => row.substitute_category));
const sourceUrls = uniqueValues(testRows.map((row) => row.substitute_source_url).filter((url) => url.startsWith('https://')));
const completedRows = testRows.filter((row) => row.validation_status !== 'not_contacted_not_buyer_proof');
const substitutionProtocolReady = selectedTargets.length >= 10
  && selectedNiches.length >= 5
  && topPriorityRows.length >= 10
  && coveredCategories.length >= 7
  && sourceUrls.length >= 6;
const buyerValidated = Boolean(buyerExecutionReadiness.summary?.buyer_validated_claim_allowed)
  || Boolean(buyerExecutionReadiness.summary?.buyer_validation_verified);
const defensibleWedge = Boolean(competitivePositioningValidation.summary?.defensible_competitive_wedge_claim_allowed);

const protocolGates = [
  {
    gate: 'selected_buyer_targets_present',
    status: selectedTargets.length >= 10 ? 'passed' : 'failed',
    evidence: `${selectedTargets.length} selected targets loaded from ${inputPaths.buyerDiscoveryKit}.`
  },
  {
    gate: 'top_five_niches_covered',
    status: coveredNiches.length >= 5 ? 'passed' : 'failed',
    evidence: `${coveredNiches.length}/5 niches covered: ${coveredNiches.join('; ')}.`
  },
  {
    gate: 'primary_substitution_test_per_target',
    status: topPriorityRows.length >= selectedTargets.length ? 'passed' : 'failed',
    evidence: `${topPriorityRows.length}/${selectedTargets.length} selected targets have a priority substitution test.`
  },
  {
    gate: 'substitute_category_breadth',
    status: coveredCategories.length >= 7 ? 'passed' : 'failed',
    evidence: `${coveredCategories.length} substitute categories covered: ${coveredCategories.join('; ')}.`
  },
  {
    gate: 'current_source_anchors_attached',
    status: sourceUrls.length >= 6 ? 'passed' : 'failed',
    evidence: `${sourceUrls.length} source URLs attached to substitution tests.`
  },
  {
    gate: 'defensible_wedge_still_pilot_only',
    status: defensibleWedge && !buyerValidated ? 'passed' : 'failed',
    evidence: `defensible_competitive_wedge_claim_allowed=${defensibleWedge}; buyer_validated=${buyerValidated}.`
  },
  {
    gate: 'buyer_substitution_proof_not_fabricated',
    status: completedRows.length === 0 ? 'passed' : 'failed',
    evidence: `${completedRows.length} completed substitution rows found in generated sheet; generated kit must remain execution-ready only.`
  }
];

const report = {
  schema_version: 'buyer-substitution-proof-kit-v1',
  generated_at: new Date().toISOString(),
  status: substitutionProtocolReady
    ? 'buyer_substitution_proof_kit_ready_not_buyer_proof'
    : 'buyer_substitution_proof_kit_incomplete',
  source: {
    buyer_discovery_kit: inputPaths.buyerDiscoveryKit,
    pilot_offer_pack: inputPaths.pilotOfferPack,
    competitive_positioning_validation: inputPaths.competitivePositioningValidation,
    buyer_execution_readiness: inputPaths.buyerExecutionReadiness,
    launch_evidence: inputPaths.evidence
  },
  summary: {
    selected_target_count: selectedTargets.length,
    selected_niche_count: selectedNiches.length,
    substitution_test_row_count: testRows.length,
    priority_substitution_test_count: topPriorityRows.length,
    substitute_category_count: coveredCategories.length,
    source_anchor_count: sourceUrls.length,
    protocol_gate_pass_count: protocolGates.filter((gate) => gate.status === 'passed').length,
    protocol_gate_count: protocolGates.length,
    substitution_protocol_ready: substitutionProtocolReady,
    buyer_validated_claim_allowed: buyerValidated,
    defensible_competitive_wedge_claim_allowed: defensibleWedge,
    replacement_claim_allowed: false,
    parity_claim_allowed: false,
    paid_pilot_claim_allowed: false
  },
  success_gate_for_confidence_upgrade: {
    minimum_completed_substitution_calls: 10,
    minimum_niches_with_completed_substitution_calls: 5,
    minimum_qualified_followups: 3,
    minimum_paid_pilot_loi_or_procurement_signals: 1,
    required_fields: [
      'current_tool_or_workflow',
      'current_budget_owner',
      'switching_barrier',
      'must_have_proof',
      'proof_shown',
      'buyer_reaction',
      'next_action',
      'willingness_to_pay_signal',
      'substitution_outcome',
      'evidence_quality',
      'validation_status'
    ],
    valid_substitution_outcomes: [
      'no_fit',
      'complement_only',
      'pilot_candidate',
      'replacement_candidate',
      'procurement_path'
    ]
  },
  protocol_gates: protocolGates,
  substitute_catalog: SUBSTITUTE_CATALOG,
  pilot_offer_substitution_matrix: asArray(pilotOfferPack.substitution_matrix),
  substitution_tests: testRows,
  proof_boundary: 'This kit prepares buyer substitution testing. It does not prove buyer validation, replacement, parity, paid-pilot demand, or world-class prediction accuracy.'
};

function renderCsv(artifact) {
  const columns = [
    'rank',
    'account_name',
    'website',
    'buyer_role',
    'niche',
    'substitute_priority',
    'substitute_category',
    'substitute_examples',
    'substitute_source_url',
    'strongest_substitute_strength',
    'app_wedge_to_test',
    'must_not_claim',
    'close_question',
    'proof_to_show',
    'call_status',
    'call_date',
    'buyer_name_or_redacted_id',
    'current_tool_or_workflow',
    'current_budget_owner',
    'switching_barrier',
    'must_have_proof',
    'proof_shown',
    'buyer_reaction',
    'next_action',
    'willingness_to_pay_signal',
    'substitution_outcome',
    'evidence_quality',
    'validation_status'
  ];
  return [
    csvLine(columns),
    ...artifact.substitution_tests.map((row) => csvLine(columns.map((column) => row[column])))
  ].join('\n') + '\n';
}

function renderMarkdown(artifact) {
  const gateRows = artifact.protocol_gates
    .map((gate) => `| ${mdCell(gate.gate)} | ${mdCell(gate.status)} | ${mdCell(gate.evidence)} |`)
    .join('\n');

  const catalogRows = artifact.substitute_catalog
    .map((item) => `| ${mdCell(item.category)} | ${mdCell(item.examples.join('; '))} | ${mdCell(item.buyer_strength)} | ${mdCell(item.app_wedge_to_test)} | ${mdCell(item.must_not_claim)} |`)
    .join('\n');

  const targetRows = artifact.substitution_tests
    .filter((row) => row.substitute_priority === 1)
    .map((row) => `| ${row.rank} | ${mdCell(row.account_name)} | ${mdCell(row.niche)} | ${mdCell(row.substitute_category)} | ${mdCell(row.close_question)} |`)
    .join('\n');

  return `# Buyer Substitution Proof Kit - 2026-06-06

## Decision

Status: \`${artifact.status}\`.

Substitution protocol ready: **${artifact.summary.substitution_protocol_ready}**.

Buyer-validated claim allowed: **${artifact.summary.buyer_validated_claim_allowed}**.

Replacement claim allowed: **${artifact.summary.replacement_claim_allowed}**.

Parity claim allowed: **${artifact.summary.parity_claim_allowed}**.

Selected targets: **${artifact.summary.selected_target_count}**.

Substitution test rows: **${artifact.summary.substitution_test_row_count}**.

Substitute categories: **${artifact.summary.substitute_category_count}**.

## Protocol Gates

| Gate | Status | Evidence |
|---|---|---|
${gateRows}

## Priority Substitution Tests

| Rank | Account | Niche | Primary Substitute | Close Question |
|---|---|---|---|---|
${targetRows}

## Substitute Catalog

| Category | Examples | Buyer Strength | App Wedge To Test | Must Not Claim |
|---|---|---|---|---|
${catalogRows}

## Confidence Upgrade Gate

To support a buyer-validation confidence upgrade, the owner must record at least ${artifact.success_gate_for_confidence_upgrade.minimum_completed_substitution_calls} completed substitution calls across ${artifact.success_gate_for_confidence_upgrade.minimum_niches_with_completed_substitution_calls} niches, ${artifact.success_gate_for_confidence_upgrade.minimum_qualified_followups} qualified follow-ups, and ${artifact.success_gate_for_confidence_upgrade.minimum_paid_pilot_loi_or_procurement_signals} paid-pilot, LOI, or procurement-path signal.

## Proof Boundary

${artifact.proof_boundary}
`;
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
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:substitution-kit -- --update-evidence: status ${report.status}, substitution_protocol_ready ${report.summary.substitution_protocol_ready}, substitution_test_rows ${report.summary.substitution_test_row_count}`
  ], [
    /npm run audit:buyer:substitution-kit/
  ]);

  nextEvidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(nextEvidence.proof_buckets.repo_artifact, [
    'scripts/build-buyer-substitution-proof-kit.mjs creates a buyer-substitution proof protocol for testing the five-niche pilot wedge against named substitutes',
    'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.json records substitute categories, success gates, and test rows without treating them as buyer proof',
    'docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv provides the owner-execution sheet for current-tool, budget-owner, switching-barrier, proof, and willingness-to-pay capture'
  ], [
    /scripts\/build-buyer-substitution-proof-kit\.mjs/,
    /buyer-substitution-proof-kit-2026-06-06\.json/,
    /buyer-substitution-test-sheet-2026-06-06\.csv/
  ]);

  nextEvidence.fix_report = nextEvidence.fix_report ?? {};
  nextEvidence.fix_report.files_changed = replaceMatchingThenAppend(nextEvidence.fix_report.files_changed, [
    'scripts/build-buyer-substitution-proof-kit.mjs',
    'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.json',
    'docs/launch-readiness/buyer-substitution-proof-kit-2026-06-06.md',
    'docs/launch-readiness/buyer-substitution-test-sheet-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/build-buyer-substitution-proof-kit\.mjs/,
    /buyer-substitution-proof-kit-2026-06-06\.json/,
    /buyer-substitution-proof-kit-2026-06-06\.md/,
    /buyer-substitution-test-sheet-2026-06-06\.csv/,
    /package\.json/
  ]);

  nextEvidence.fix_report.tests_run = replaceMatchingThenAppend(nextEvidence.fix_report.tests_run, [
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/build-buyer-substitution-proof-kit.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:buyer:substitution-kit -- --update-evidence'
  ], [
    /node --check scripts\/build-buyer-substitution-proof-kit\.mjs/,
    /npm run audit:buyer:substitution-kit/
  ]);

  nextEvidence.fix_report.approval_gates = replaceMatchingThenAppend(nextEvidence.fix_report.approval_gates, [
    'Buyer substitution proof kit is execution-ready only; replacement, parity, buyer-validated, and paid-pilot claims remain blocked until owner-recorded calls pass buyer evidence gates.'
  ], [
    /Buyer substitution proof kit is execution-ready only/
  ]);

  nextEvidence.implementation_decisions = replaceByTaskId(nextEvidence.implementation_decisions, {
    task_id: 'buyer-substitution-proof-kit',
    decision: 'Add an owner-execution kit that turns the competitive wedge into explicit substitution tests for each selected buyer target.',
    acceptance_check: 'The kit must cover the selected 10-call slate, all five niches, named substitute categories, proof-to-show fields, close questions, and claim boundaries without fabricating buyer validation.',
    chosen_variant: 'minimal artifact generator and package script',
    rejected_variants: [
      'No-code/defer: rejected because the substitution loophole stayed too vague for owner execution.',
      'Product UI change: rejected because no buyer substitution evidence exists yet.',
      'Confidence increase: rejected because the kit creates a protocol, not completed buyer proof.'
    ],
    repo_pattern_reused: 'Existing launch-readiness artifact generator and evidence update pattern',
    files_changed: [
      'scripts/build-buyer-substitution-proof-kit.mjs',
      'package.json'
    ],
    tests_run: [
      'node --check scripts/build-buyer-substitution-proof-kit.mjs',
      'npm run audit:buyer:substitution-kit'
    ],
    proof: `${report.status}; substitution_protocol_ready=${report.summary.substitution_protocol_ready}; substitution_test_rows=${report.summary.substitution_test_row_count}.`,
    reason: 'Marketability and uniqueness are not sellability proof until buyers compare the pilot wedge against their current tools, advisory vendors, forecasting services, and manual workflows.'
  });

  writeArtifact(inputPaths.evidence, `${JSON.stringify(nextEvidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  selected_target_count: report.summary.selected_target_count,
  selected_niche_count: report.summary.selected_niche_count,
  substitution_test_row_count: report.summary.substitution_test_row_count,
  substitute_category_count: report.summary.substitute_category_count,
  protocol_gate_pass_count: report.summary.protocol_gate_pass_count,
  protocol_gate_count: report.summary.protocol_gate_count,
  substitution_protocol_ready: report.summary.substitution_protocol_ready,
  buyer_validated_claim_allowed: report.summary.buyer_validated_claim_allowed,
  replacement_claim_allowed: report.summary.replacement_claim_allowed,
  parity_claim_allowed: report.summary.parity_claim_allowed
}, null, 2));

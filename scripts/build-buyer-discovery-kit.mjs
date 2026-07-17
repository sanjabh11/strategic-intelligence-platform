#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const DEFAULT_TARGETS = 'docs/launch-readiness/buyer-validation-targets-2026-06-06.json';
const DEFAULT_MARKET_NICHE_VALIDATION = 'docs/launch-readiness/market-niche-evidence-validation-2026-06-06.json';
const DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT = 'docs/launch-readiness/pilot-outcome-measurement-kit-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.json';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/buyer-discovery-call-sheet-2026-06-06.csv';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/buyer-discovery-kit-2026-06-06.md';
const DEFAULT_SELECT_COUNT = 10;
const DEFAULT_CANDIDATE_POOL = 20;
const FALLBACK_TOP_FIVE_NICHES = [
  'Enterprise/public-sector strategic decision intelligence',
  'Governed forecasting and research workflow',
  'Geopolitical risk radar and scenario monitor',
  'Executive and analyst briefing layer',
  'Negotiation and strategic reasoning training'
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
    'Usage: node scripts/build-buyer-discovery-kit.mjs',
    `  [--targets ${DEFAULT_TARGETS}]`,
    `  [--market-niche-validation ${DEFAULT_MARKET_NICHE_VALIDATION}]`,
    `  [--pilot-outcome-measurement-kit ${DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT}]`,
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--select-count ${DEFAULT_SELECT_COUNT}]`,
    `  [--candidate-pool ${DEFAULT_CANDIDATE_POOL}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const targetsPath = argValue('--targets', DEFAULT_TARGETS);
const marketNicheValidationPath = argValue('--market-niche-validation', DEFAULT_MARKET_NICHE_VALIDATION);
const pilotOutcomeMeasurementKitPath = argValue('--pilot-outcome-measurement-kit', DEFAULT_PILOT_OUTCOME_MEASUREMENT_KIT);
const jsonOutputPath = argValue('--json-output', DEFAULT_JSON_OUTPUT);
const csvOutputPath = argValue('--csv-output', DEFAULT_CSV_OUTPUT);
const mdOutputPath = argValue('--md-output', DEFAULT_MD_OUTPUT);
const selectCount = Number(argValue('--select-count', DEFAULT_SELECT_COUNT));
const candidatePool = Number(argValue('--candidate-pool', DEFAULT_CANDIDATE_POOL));

if (!Number.isInteger(selectCount) || selectCount < 1) {
  console.error('--select-count must be a positive integer.');
  process.exit(2);
}

if (!Number.isInteger(candidatePool) || candidatePool < selectCount) {
  console.error('--candidate-pool must be an integer greater than or equal to --select-count.');
  process.exit(2);
}

if (!jsonOutputPath && !csvOutputPath && !mdOutputPath) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.resolve(process.cwd(), relativePath);
}

function readJson(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) {
    console.error(`Missing required target artifact: ${relativePath}`);
    process.exit(2);
  }
  return JSON.parse(readFileSync(absolutePath, 'utf8'));
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
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function mdCell(value) {
  return String(value ?? '').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function truncateForSubject(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 74);
}

function cleanPhrase(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
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

function sortByRank(left, right) {
  return Number(left.rank) - Number(right.rank);
}

function selectBalancedTargets(targets, priorityNiches, count, poolSize) {
  const sortedTargets = [...targets].sort(sortByRank);
  const rankedFillPool = sortedTargets.filter((target) => Number(target.rank) <= poolSize);
  const selectedByRank = new Map();

  for (const niche of priorityNiches) {
    const target = sortedTargets.find((candidate) => candidate.niche === niche);
    if (target) selectedByRank.set(Number(target.rank), target);
  }

  for (const target of rankedFillPool) {
    if (selectedByRank.size >= count) break;
    selectedByRank.set(Number(target.rank), target);
  }

  for (const target of sortedTargets) {
    if (selectedByRank.size >= count) break;
    selectedByRank.set(Number(target.rank), target);
  }

  return [...selectedByRank.values()].sort(sortByRank);
}

function buildQuestions(target) {
  return [
    `Where does ${target.account_name} currently lose time or confidence moving from source material to a decision-ready brief?`,
    'Which evidence, review, or governance step is mandatory before a forecast or scenario recommendation is trusted?',
    'What proof would you need from a guided pilot before sponsoring a broader evaluation?',
    'Which existing tool, analyst workflow, consultancy, or spreadsheet would this need to complement or replace?',
    'If the workflow helped, what concrete next step would be credible: second review, internal demo, paid pilot, LOI, or no action?'
  ];
}

function buildDisqualifiers(target) {
  const common = [
    'No current owner for foresight, forecasting, risk, strategy, or analyst-workflow improvement.',
    'Cannot review any hosted demo or artifact until security/RLS proof is complete.',
    'Needs proven world-class prediction accuracy before any pilot discussion.'
  ];

  if (target.niche.includes('forecast')) {
    return [
      ...common,
      'Requires a shared-question benchmark or resolved-outcome corpus before validating workflow value.'
    ];
  }

  if (target.niche.includes('Geopolitical')) {
    return [
      ...common,
      'Requires paid-feed SLAs or production freshness proof before evaluating radar use.'
    ];
  }

  return common;
}

function buildProofToShow(target) {
  const base = [
    target.proof_asset,
    'commercial-confidence-gate-2026-06-06.md',
    'commercial-launch-readiness-2026-06-06.md'
  ];

  if (target.niche.includes('forecast')) {
    return [
      ...base,
      'resolved-forecast-calibration-ledger-2026-06-06.json',
      'forecast-benchmark-comparison-2026-06-06.json'
    ];
  }

  if (target.niche.includes('public-sector') || target.niche.includes('Executive')) {
    return [
      ...base,
      'rls-identity-and-review-policy-draft-2026-06-06.md',
      'buyer-validation-targets-2026-06-06.md'
    ];
  }

  return [
    ...base,
    'buyer-validation-targets-2026-06-06.md'
  ];
}

function buildEmail(target) {
  const subject = `Relevance check: ${truncateForSubject(target.niche)}`;
  const body = [
    `Hi - I am validating a narrow guided pilot for ${target.buyer_role}.`,
    '',
    `The pain we are testing: ${target.validation_question}`,
    '',
    `The current proof asset is ${target.proof_asset} It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.`,
    '',
    'Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.',
    '',
    'If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.'
  ].join('\n');

  return { subject, body };
}

function buildLinkedIn(target) {
  return [
    `I am validating a pilot for ${target.niche.toLowerCase()}.`,
    `The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for ${target.buyer_role}.`,
    'Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.'
  ].join(' ');
}

function buildDemoOpener(target) {
  const proofPhrase = cleanPhrase(target.proof_asset).toLowerCase();
  return [
    `For ${target.account_name}, I would not position this as a prediction oracle.`,
    `The workflow starts with one ambiguous decision, builds ${proofPhrase}, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable.`,
    'The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.'
  ].join(' ');
}

const targetPack = readJson(targetsPath);
const marketNicheValidation = readJsonIfExists(marketNicheValidationPath, { niche_checks: [] });
const pilotOutcomeMeasurementKit = readJsonIfExists(pilotOutcomeMeasurementKitPath, { status: 'missing', outcome_rows: [] });
const targets = Array.isArray(targetPack.targets) ? targetPack.targets : [];
const outcomeByNiche = new Map((pilotOutcomeMeasurementKit.outcome_rows ?? []).map((row) => [row.niche, row]));
const priorityNiches = uniqueValues(
  (marketNicheValidation.niche_checks ?? []).map((niche) => niche.niche)
).length > 0
  ? uniqueValues((marketNicheValidation.niche_checks ?? []).map((niche) => niche.niche))
  : FALLBACK_TOP_FIVE_NICHES;
const selectedRawTargets = selectBalancedTargets(targets, priorityNiches, selectCount, candidatePool);
const selectedNiches = uniqueValues(selectedRawTargets.map((target) => target.niche));
const missingPriorityNiches = priorityNiches.filter((niche) => !selectedNiches.includes(niche));
const outOfPoolCoverageRanks = selectedRawTargets
  .filter((target) => Number(target.rank) > candidatePool)
  .map((target) => Number(target.rank));
const selectedTargets = selectedRawTargets
  .map((target) => {
    const email = buildEmail(target);
    const outcome = outcomeByNiche.get(target.niche) ?? {};
    return {
      rank: target.rank,
      account_name: target.account_name,
      account_type: target.account_type,
      niche: target.niche,
      website: target.source_url,
      buyer_role: target.buyer_role,
      validation_question: target.validation_question,
      proof_asset: target.proof_asset,
      proof_to_show: buildProofToShow(target),
      source_title: target.source_title,
      source_note: target.source_note,
      why_this_target: target.why_this_target,
      discovery_goal: 'Determine whether this account has a real workflow pain, a credible champion, a proof requirement, and a paid-pilot or LOI path.',
      call_agenda: [
        'Confirm current workflow and owner.',
        'Show one narrow evidence-to-brief-to-review-to-forecast path.',
        'Ask where the workflow is wrong, risky, or insufficient.',
        'Ask what proof would justify an internal follow-up.',
        'Record next action and willingness-to-pay signal exactly.'
      ],
      discovery_questions: buildQuestions(target),
      disqualifiers: buildDisqualifiers(target),
      email_subject: email.subject,
      email_body: email.body,
      linkedin_message: buildLinkedIn(target),
      demo_opener: buildDemoOpener(target),
      required_capture_fields: [
        'buyer_role',
        'proof_shown',
        'objection',
        'next_action',
        'willingness_to_pay_signal',
        'baseline_value_or_current_workflow',
        'pilot_outcome_value_or_expected_delta',
        'quality_signal',
        'buyer_decision_event',
        'outcome_evidence_notes'
      ],
      pilot_case_unit: outcome.pilot_case_unit ?? '',
      baseline_measure: outcome.baseline_measure ?? '',
      baseline_value_or_current_workflow: '',
      target_outcome_measure: outcome.target_outcome_measure ?? '',
      pilot_outcome_value_or_expected_delta: '',
      quality_measure: outcome.quality_measure ?? '',
      quality_signal: '',
      buyer_decision_event: outcome.buyer_decision_event ?? '',
      outcome_evidence_notes: '',
      call_status: 'not_contacted',
      validation_status: 'not_contacted_not_buyer_proof'
    };
  });

const evidenceCaptureSchema = [
  { field: 'call_status', required: true, allowed_values: ['not_contacted', 'contacted', 'replied', 'scheduled', 'completed', 'rejected'] },
  { field: 'buyer_name_or_redacted_id', required: true, proof_note: 'Use a redacted identifier if the buyer name should not be stored.' },
  { field: 'buyer_role', required: true, proof_note: 'Decision maker, champion, evaluator, or disqualified.' },
  { field: 'proof_shown', required: true, proof_note: 'Specific demo, report, screenshot, or artifact shown.' },
  { field: 'objection', required: true, proof_note: 'Quote or concise paraphrase of the strongest buyer objection.' },
  { field: 'next_action', required: true, proof_note: 'Concrete next step and date, or no-fit reason.' },
  { field: 'willingness_to_pay_signal', required: true, allowed_values: ['none', 'curiosity_only', 'qualified_followup', 'paid_pilot_discussion', 'loi_discussion', 'procurement_path'] },
  { field: 'pilot_case_unit', required: true, proof_note: 'Outcome unit from the pilot outcome measurement kit for this niche.' },
  { field: 'baseline_measure', required: true, proof_note: 'Baseline metric definition from the pilot outcome measurement kit.' },
  { field: 'baseline_value_or_current_workflow', required: true, proof_note: 'Observed current workflow value, or a precise current-workflow description if numeric measurement is not possible yet.' },
  { field: 'target_outcome_measure', required: true, proof_note: 'Target outcome metric definition from the pilot outcome measurement kit.' },
  { field: 'pilot_outcome_value_or_expected_delta', required: true, proof_note: 'Observed pilot value, buyer-accepted expected delta, or explicit not-run-yet blocker.' },
  { field: 'quality_measure', required: true, proof_note: 'Quality metric definition from the pilot outcome measurement kit.' },
  { field: 'quality_signal', required: true, proof_note: 'Buyer review signal, rubric result, or specific quality blocker.' },
  { field: 'buyer_decision_event', required: true, proof_note: 'No fit, internal follow-up, paid pilot discussion, LOI/procurement path, or explicit blocker.' },
  { field: 'outcome_evidence_notes', required: true, proof_note: 'What evidence supports the before/after or expected-delta claim; keep this redacted if needed.' },
  { field: 'security_or_procurement_blocker', required: false, proof_note: 'SOC2, RLS, DPA, SSO, procurement, hosted proof, or data-boundary blocker.' },
  { field: 'accuracy_or_benchmark_blocker', required: false, proof_note: 'Resolved outcomes, benchmark protocol, human baseline, or calibration blocker.' },
  { field: 'evidence_quality', required: true, allowed_values: ['low', 'medium', 'high', 'owner_verified', 'external_share_approved'] }
];

const objectionHandling = [
  {
    objection: 'We already use another intelligence or foresight platform.',
    response: 'Position this as a governed handoff layer from evidence and actor reasoning into review and scoreable forecast drafts, not a replacement for their source platform.'
  },
  {
    objection: 'Is this secure enough for enterprise or public-sector data?',
    response: 'Do not overclaim. Show the RLS draft and state that production security proof requires owner-approved migration, pgTAP, and hosted smoke evidence before sensitive pilots.'
  },
  {
    objection: 'What proof do you have that predictions are accurate?',
    response: 'State that prediction superiority is not claimed. Show calibration and benchmark mechanics, then ask what resolved-outcome and baseline protocol they would accept.'
  },
  {
    objection: 'Can procurement approve this?',
    response: 'Ask which documents are mandatory first: security summary, data boundary, pilot SOW, DPA, hosted proof, support model, and price threshold.'
  },
  {
    objection: 'How fast can this produce value?',
    response: 'Offer one constrained pilot decision workflow with a before/after measure: time from source pack to reviewed decision brief and forecast-draft readiness.'
  }
];

const report = {
  schema_version: 'buyer-discovery-execution-kit-v1',
  generated_at: new Date().toISOString(),
  status: 'discovery_kit_ready_not_buyer_proof',
  proof_boundary: 'This kit prepares approved discovery calls. It is not buyer feedback, willingness-to-pay proof, LOI evidence, paid-pilot evidence, or procurement proof.',
  source: {
    buyer_validation_targets: targetsPath,
    market_niche_validation: marketNicheValidationPath,
    pilot_outcome_measurement_kit: pilotOutcomeMeasurementKitPath,
    pilot_outcome_measurement_kit_status: pilotOutcomeMeasurementKit.status ?? 'missing',
    target_pack_status: targetPack.status ?? 'unknown',
    selected_count: selectedTargets.length,
    candidate_pool: candidatePool,
    selection_rule: `Cover each validated top-five niche with its first available target, then fill ${selectCount} slots by rank from the first ${candidatePool} source-backed rows.`,
    priority_niche_count: priorityNiches.length,
    selected_priority_niche_count: priorityNiches.length - missingPriorityNiches.length,
    selected_niches: selectedNiches,
    missing_priority_niches: missingPriorityNiches,
    out_of_pool_coverage_ranks: outOfPoolCoverageRanks
  },
  success_gate_for_confidence_upgrade: targetPack.success_gate_for_confidence_upgrade ?? {
    minimum_calls: 10,
    qualified_followups: 3,
    paid_pilot_or_loi_discussions: 1,
    required_fields_to_record: [
      'buyer_role',
      'proof_shown',
      'objection',
      'next_action',
      'willingness_to_pay_signal',
      'baseline_value_or_current_workflow',
      'pilot_outcome_value_or_expected_delta',
      'quality_signal',
      'buyer_decision_event',
      'outcome_evidence_notes'
    ]
  },
  evidence_capture_schema: evidenceCaptureSchema,
  objection_handling: objectionHandling,
  selected_targets: selectedTargets,
  use_rules: [
    'Do not send messages or run discovery calls without owner approval.',
    'Do not count a target as buyer proof until a real completed interaction records the required fields.',
    'Keep world-class prediction language prohibited until resolved-outcome calibration and real baseline proof exist.',
    'Use no-fit and rejection outcomes as evidence; do not discard them.'
  ]
};

function renderCsv(data) {
  const columns = [
    'rank',
    'account_name',
    'website',
    'buyer_role',
    'niche',
    'validation_question',
    'proof_asset',
    'proof_to_show',
    'email_subject',
    'email_body',
    'linkedin_message',
    'demo_opener',
    'call_status',
    'call_date',
    'buyer_name_or_redacted_id',
    'proof_shown',
    'objection',
    'next_action',
    'willingness_to_pay_signal',
    'pilot_case_unit',
    'baseline_measure',
    'baseline_value_or_current_workflow',
    'target_outcome_measure',
    'pilot_outcome_value_or_expected_delta',
    'quality_measure',
    'quality_signal',
    'buyer_decision_event',
    'outcome_evidence_notes',
    'security_or_procurement_blocker',
    'accuracy_or_benchmark_blocker',
    'evidence_quality',
    'validation_status'
  ];

  return [
    columns.join(','),
    ...data.selected_targets.map((target) => columns.map((column) => {
      if (column === 'proof_to_show') {
        return csvCell(target.proof_to_show.join('; '));
      }
      return csvCell(target[column] ?? '');
    }).join(','))
  ].join('\n') + '\n';
}

function renderMarkdown(data) {
  const targetRows = data.selected_targets
    .map((target) => [
      target.rank,
      mdCell(target.account_name),
      mdCell(target.niche),
      mdCell(target.buyer_role),
      mdCell(target.validation_question),
      mdCell(target.proof_asset)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const schemaRows = data.evidence_capture_schema
    .map((field) => [
      mdCell(field.field),
      field.required ? 'yes' : 'no',
      mdCell(field.allowed_values?.join(', ') ?? field.proof_note ?? '')
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const objectionRows = data.objection_handling
    .map((item) => [
      mdCell(item.objection),
      mdCell(item.response)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const scriptBlocks = data.selected_targets
    .map((target) => [
      `### ${target.rank}. ${target.account_name}`,
      '',
      `**Email subject:** ${target.email_subject}`,
      '',
      '```text',
      target.email_body,
      '```',
      '',
      `**LinkedIn:** ${target.linkedin_message}`,
      '',
      `**Demo opener:** ${target.demo_opener}`
    ].join('\n'))
    .join('\n\n');

  return `# Buyer Discovery Execution Kit - 2026-06-06

## Proof Boundary

Status: \`${data.status}\`.

${data.proof_boundary}

## Success Gate

- Minimum completed calls: ${data.success_gate_for_confidence_upgrade.minimum_calls}
- Qualified follow-ups: ${data.success_gate_for_confidence_upgrade.qualified_followups}
- Paid pilot or LOI discussions: ${data.success_gate_for_confidence_upgrade.paid_pilot_or_loi_discussions}
- Required fields: ${data.success_gate_for_confidence_upgrade.required_fields_to_record.join(', ')}

## Selected Call Slate

Selection rule: ${data.source.selection_rule}
Validated niche coverage: ${data.source.selected_priority_niche_count}/${data.source.priority_niche_count}. Missing priority niches: ${data.source.missing_priority_niches.length > 0 ? data.source.missing_priority_niches.join(', ') : 'none'}.

| Rank | Account | Niche | Buyer Role | Validation Question | Proof Asset |
|---:|---|---|---|---|---|
${targetRows}

## Evidence Capture Schema

| Field | Required | Allowed Values / Proof Note |
|---|---|---|
${schemaRows}

## Objection Handling

| Objection | Response Discipline |
|---|---|
${objectionRows}

## Scripts

${scriptBlocks}

## Use Rules

${data.use_rules.map((rule) => `- ${rule}`).join('\n')}
`;
}

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (csvOutputPath) {
  writeArtifact(csvOutputPath, renderCsv(report));
}

if (mdOutputPath) {
  writeArtifact(mdOutputPath, renderMarkdown(report));
}

console.log(JSON.stringify({
  json_output: jsonOutputPath,
  csv_output: csvOutputPath,
  md_output: mdOutputPath,
  status: report.status,
  selected_count: report.source.selected_count,
  selected_priority_niche_count: report.source.selected_priority_niche_count,
  priority_niche_count: report.source.priority_niche_count,
  missing_priority_niches: report.source.missing_priority_niches,
  proof_boundary: report.proof_boundary
}, null, 2));

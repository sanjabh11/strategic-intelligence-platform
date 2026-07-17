#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function usage() {
  console.error([
    'Usage: node scripts/build-rls-classification-register.mjs',
    '  --input docs/launch-readiness/rls-remediation-plan-2026-06-06.json',
    '  [--json-output docs/launch-readiness/rls-table-classification-register-2026-06-06.json]',
    '  [--csv-output docs/launch-readiness/rls-table-classification-register-2026-06-06.csv]',
    '  [--md-output docs/launch-readiness/rls-table-classification-register-2026-06-06.md]'
  ].join('\n'));
}

const inputPath = argValue('--input');
const jsonOutputPath = argValue('--json-output');
const csvOutputPath = argValue('--csv-output');
const mdOutputPath = argValue('--md-output');

if (!inputPath) {
  usage();
  process.exit(2);
}

if (!jsonOutputPath && !csvOutputPath && !mdOutputPath) {
  console.error('At least one of --json-output, --csv-output, or --md-output is required.');
  process.exit(2);
}

const sourcePath = path.resolve(process.cwd(), inputPath);
if (!existsSync(sourcePath)) {
  console.error(`Missing RLS remediation plan: ${inputPath}`);
  process.exit(2);
}

const plan = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(plan.priority_tables) || !Array.isArray(plan.remediation_batches)) {
  console.error('RLS remediation plan must include priority_tables and remediation_batches arrays.');
  process.exit(2);
}

const now = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();

const domainClassifications = {
  identity_and_review: {
    data_category: 'authenticated_user_or_review_data',
    default_sensitivity: 'high',
    recommended_visibility: 'owner_reviewer_service_role_only',
    owner_model_to_confirm: 'user_id, created_by, reviewer assignment, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which user or reviewer owns each row?',
      'Should any review metadata be published after redaction?',
      'Which edge functions need service-role write access?'
    ]
  },
  collaboration_and_warroom: {
    data_category: 'team_collaboration_data',
    default_sensitivity: 'high',
    recommended_visibility: 'member_creator_reviewer_service_role_only',
    owner_model_to_confirm: 'room/session membership, creator, reviewer, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which membership table authorizes reads and writes?',
      'Can creators invite members without exposing private rows?',
      'Are any published summaries intentionally public?'
    ]
  },
  classroom: {
    data_category: 'education_classroom_data',
    default_sensitivity: 'high',
    recommended_visibility: 'teacher_student_membership_service_role_only',
    owner_model_to_confirm: 'classroom membership, teacher role, student owner, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which actor can see student submissions?',
      'Which teacher/admin role can manage the classroom?',
      'Are any course catalog rows separate from student data?'
    ]
  },
  retrieval_and_evidence: {
    data_category: 'retrieval_query_and_source_context',
    default_sensitivity: 'high',
    recommended_visibility: 'owner_analysis_service_role_only_with_published_citation_exceptions',
    owner_model_to_confirm: 'analysis owner, source publication status, or service role',
    public_or_anon_exception_default: 'only_if_published_citation',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Which rows are private retrieval logs versus public citations?',
      'What publication flag makes a source safe to expose?',
      'Which intake paths require anonymous writes behind an edge function?'
    ]
  },
  analysis_execution: {
    data_category: 'analysis_execution_and_public_beta_intake',
    default_sensitivity: 'medium_high',
    recommended_visibility: 'owner_service_role_only_with_public_status_exceptions',
    owner_model_to_confirm: 'job owner, analysis owner, public status flag, or service role',
    public_or_anon_exception_default: 'only_if_public_intake_or_redacted_status',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Which public beta intake writes must remain anonymous?',
      'What abuse controls and rate limits protect public intake?',
      'Which job status fields can be safely exposed?'
    ]
  },
  forecasting_and_ml_evaluation: {
    data_category: 'evaluation_shadow_and_forecast_data',
    default_sensitivity: 'high',
    recommended_visibility: 'owner_reviewer_service_role_only_with_published_summary_exceptions',
    owner_model_to_confirm: 'forecast owner, analysis owner, reviewer, release job, or service role',
    public_or_anon_exception_default: 'only_if_published_summary',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Which metrics are private evaluation rows versus public summaries?',
      'Which release or calibration jobs need service-role writes?',
      'How are resolved outcomes approved before publication?'
    ]
  },
  ontology_and_graph: {
    data_category: 'ontology_and_derived_graph_data',
    default_sensitivity: 'medium_high',
    recommended_visibility: 'service_role_owner_or_published_reference_only',
    owner_model_to_confirm: 'global reference status, customer-derived edge owner, or service role',
    public_or_anon_exception_default: 'only_if_global_reference',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Which ontology rows are global reference data?',
      'Which graph edges are customer-derived and private?',
      'What publication state separates public references from private derived data?'
    ]
  },
  public_catalog_candidates: {
    data_category: 'public_catalog_candidate',
    default_sensitivity: 'medium',
    recommended_visibility: 'published_public_read_only_or_private_by_default',
    owner_model_to_confirm: 'published flag, catalog owner, or service role',
    public_or_anon_exception_default: 'only_if_explicitly_published_read_only',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Is this truly public catalog data or pilot/customer data?',
      'What published flag authorizes public reads?',
      'Should anonymous writes always be blocked?'
    ]
  },
  observability: {
    data_category: 'observability_and_operational_logs',
    default_sensitivity: 'high',
    recommended_visibility: 'admin_reviewer_service_role_only',
    owner_model_to_confirm: 'admin/reviewer role or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which operators or reviewers can inspect logs?',
      'What redacted health summary can be public?',
      'Which provider failure fields must never be public?'
    ]
  },
  advanced_services: {
    data_category: 'advanced_strategy_output_data',
    default_sensitivity: 'high',
    recommended_visibility: 'owner_analysis_service_role_only',
    owner_model_to_confirm: 'analysis owner, strategy owner, authenticated creator, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which actor owns generated strategic outputs?',
      'Which service jobs can write advanced outputs?',
      'Can any rows become public only through an explicit publish workflow?'
    ]
  },
  unclassified: {
    data_category: 'owner_classification_required',
    default_sensitivity: 'unknown',
    recommended_visibility: 'deny_by_default_until_classified',
    owner_model_to_confirm: 'TBD by owner',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'classification_required',
    owner_questions: [
      'What data class does this table belong to?',
      'Which actor owns each row?',
      'Can any rows be public and by what flag?'
    ]
  }
};

const tableClassificationOverrides = {
  assignment_submissions: {
    ...domainClassifications.classroom,
    data_category: 'education_classroom_data',
    default_sensitivity: 'high',
    recommended_visibility: 'teacher_student_membership_service_role_only',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_model_to_confirm: 'assignment owner, classroom membership, teacher role, or service role',
    owner_questions: [
      'Which teacher and student roles can see each submission?',
      'Can submissions ever be shared outside the classroom?',
      'Which service-role path grades or exports submissions?'
    ]
  },
  campaign_participants: {
    data_category: 'campaign_participant_data',
    default_sensitivity: 'medium_high',
    recommended_visibility: 'campaign_member_owner_service_role_only',
    owner_model_to_confirm: 'campaign membership, participant owner, campaign owner, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which campaign members can see participant records?',
      'Can participant rows contain personal or organizational identifiers?',
      'Which service path manages campaign membership changes?'
    ]
  },
  cooperation_campaigns: {
    data_category: 'campaign_coordination_data',
    default_sensitivity: 'medium_high',
    recommended_visibility: 'campaign_owner_member_service_role_with_published_summary_exception',
    owner_model_to_confirm: 'campaign owner, member role, publication status, or service role',
    public_or_anon_exception_default: 'only_if_explicitly_published_summary',
    policy_exception_status: 'pending_public_exception_review',
    owner_questions: [
      'Are campaign records customer-private or public templates?',
      'What publication flag makes a campaign summary public?',
      'Which members can update campaign state?'
    ]
  },
  signaling_recommendations: {
    data_category: 'advanced_strategy_output_data',
    default_sensitivity: 'high',
    recommended_visibility: 'owner_analysis_service_role_only',
    owner_model_to_confirm: 'analysis owner, strategy owner, authenticated creator, or service role',
    public_or_anon_exception_default: 'no',
    policy_exception_status: 'not_allowed_by_default',
    owner_questions: [
      'Which strategic analysis owns each recommendation?',
      'Can recommendations become public only through a publish workflow?',
      'Which service path generates recommendation rows?'
    ]
  }
};

const firstFixDomains = new Set([
  'identity_and_review',
  'collaboration_and_warroom',
  'forecasting_and_ml_evaluation'
]);

const personaTestsByDomain = {
  identity_and_review: ['anon_denied', 'unrelated_authenticated_denied', 'owner_allowed', 'reviewer_allowed', 'service_role_allowed'],
  collaboration_and_warroom: ['anon_denied', 'non_member_denied', 'member_allowed', 'creator_allowed', 'service_role_allowed'],
  classroom: ['anon_denied', 'non_member_denied', 'student_or_teacher_allowed', 'teacher_admin_allowed', 'service_role_allowed'],
  retrieval_and_evidence: ['anon_denied_private_rows', 'unrelated_authenticated_denied', 'owner_allowed', 'published_citation_allowed_if_classified', 'service_role_allowed'],
  analysis_execution: ['anon_denied_private_jobs', 'public_intake_allowed_if_classified', 'unrelated_authenticated_denied', 'owner_allowed', 'service_role_allowed'],
  forecasting_and_ml_evaluation: ['anon_denied_private_evaluation', 'unrelated_authenticated_denied', 'owner_or_reviewer_allowed', 'published_summary_allowed_if_classified', 'service_role_allowed'],
  ontology_and_graph: ['anon_denied_private_graph', 'unrelated_authenticated_denied', 'owner_allowed_for_customer_edges', 'global_reference_allowed_if_classified', 'service_role_allowed'],
  public_catalog_candidates: ['anon_read_allowed_only_if_published', 'anon_write_denied', 'authenticated_write_denied_unless_owner', 'service_role_allowed'],
  observability: ['anon_denied', 'authenticated_non_admin_denied', 'admin_or_reviewer_allowed', 'service_role_allowed'],
  advanced_services: ['anon_denied', 'unrelated_authenticated_denied', 'owner_allowed', 'service_role_allowed'],
  unclassified: ['anon_denied', 'unrelated_authenticated_denied', 'owner_path_defined', 'service_role_allowed']
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function escapeCsv(value) {
  const stringValue = Array.isArray(value) ? value.join('|') : `${value ?? ''}`;
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

function writeArtifact(destinationPath, contents) {
  const destination = path.resolve(process.cwd(), destinationPath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function mdCell(value) {
  return `${value ?? ''}`.replaceAll('|', '/');
}

const batchOrder = new Map(
  plan.remediation_batches.map((batch, index) => [batch.domain, index + 1])
);
const batchByDomain = new Map(
  plan.remediation_batches.map((batch) => [batch.domain, batch])
);

const rows = plan.priority_tables.map((tablePlan) => {
  const domain = tablePlan.domain ?? 'unclassified';
  const classification =
    tableClassificationOverrides[tablePlan.table] ??
    domainClassifications[domain] ??
    domainClassifications.unclassified;
  const batch = batchByDomain.get(domain);
  return {
    table: tablePlan.table,
    domain,
    remediation_batch_order: batchOrder.get(domain) ?? null,
    batch_priority: batch?.priority ?? tablePlan.priority,
    table_priority: tablePlan.priority,
    data_category: classification.data_category,
    default_sensitivity: classification.default_sensitivity,
    recommended_visibility: classification.recommended_visibility,
    public_or_anon_exception_default: classification.public_or_anon_exception_default,
    policy_exception_status: classification.policy_exception_status,
    owner_model_to_confirm: classification.owner_model_to_confirm,
    owner_to_assign: 'TBD',
    approval_status: 'pending_owner_classification',
    first_fix_batch_candidate: firstFixDomains.has(domain),
    finding_count: tablePlan.finding_count,
    p1_finding_count: tablePlan.p1_finding_count,
    issue_types: uniqueSorted(tablePlan.issue_types ?? []),
    operations: uniqueSorted(tablePlan.operations ?? []),
    recommended_policy_direction: tablePlan.recommended_policy_direction,
    required_persona_tests: personaTestsByDomain[domain] ?? personaTestsByDomain.unclassified,
    owner_questions: classification.owner_questions,
    source_locations: uniqueSorted(tablePlan.source_locations ?? [])
  };
}).sort((a, b) =>
  (a.remediation_batch_order ?? 999) - (b.remediation_batch_order ?? 999) ||
  b.p1_finding_count - a.p1_finding_count ||
  b.finding_count - a.finding_count ||
  a.table.localeCompare(b.table)
);

const registerColumns = [
  'table',
  'domain',
  'remediation_batch_order',
  'batch_priority',
  'table_priority',
  'data_category',
  'default_sensitivity',
  'recommended_visibility',
  'public_or_anon_exception_default',
  'policy_exception_status',
  'owner_model_to_confirm',
  'owner_to_assign',
  'approval_status',
  'first_fix_batch_candidate',
  'finding_count',
  'p1_finding_count',
  'issue_types',
  'operations',
  'recommended_policy_direction',
  'required_persona_tests',
  'owner_questions',
  'source_locations'
];

const report = {
  schema_version: 1,
  generated_at: now.toISOString(),
  source: {
    remediation_plan: path.relative(process.cwd(), sourcePath),
    production_state_verified: false,
    owner_classification_verified: false
  },
  proof_boundary: 'This register is a static owner-approval artifact. It does not inspect hosted Supabase state, apply policy changes, or prove deployed RLS behavior.',
  classification_status: 'pending_owner_approval',
  commercial_security_status: 'classification_required_not_enterprise_ready',
  summary: {
    table_count: rows.length,
    p1_table_count: rows.filter((row) => row.table_priority === 'P1').length,
    pending_owner_classification_count: rows.filter((row) => row.approval_status === 'pending_owner_classification').length,
    first_fix_batch_candidate_count: rows.filter((row) => row.first_fix_batch_candidate).length,
    public_exception_review_count: rows.filter((row) => row.policy_exception_status === 'pending_public_exception_review').length,
    data_category_counts: countBy(rows.map((row) => row.data_category)),
    domain_counts: countBy(rows.map((row) => row.domain)),
    priority_counts: countBy(rows.map((row) => row.table_priority))
  },
  approval_workflow: [
    'Assign a business/security owner for every table.',
    'Confirm the data category, row owner model, and whether any public/anonymous exception is intentionally required.',
    'Reject broad public or anonymous policies for private tables before drafting migrations.',
    'Draft one narrow RLS migration per approved domain batch.',
    'Run Supabase database tests for anon, unrelated authenticated, owner/member/reviewer, and service-role paths.',
    'Attach hosted smoke logs and policy-test output before upgrading from pilot-only.'
  ],
  register_columns: registerColumns,
  rows
};

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (csvOutputPath) {
  const csvRows = [
    registerColumns.map(escapeCsv).join(','),
    ...rows.map((row) => registerColumns.map((column) => escapeCsv(row[column])).join(','))
  ];
  writeArtifact(csvOutputPath, `${csvRows.join('\n')}\n`);
}

if (mdOutputPath) {
  const categoryRows = Object.entries(report.summary.data_category_counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `| \`${mdCell(category)}\` | ${count} |`)
    .join('\n');

  const registerRows = rows.map((row) => [
    row.remediation_batch_order ?? '',
    `\`${mdCell(row.table)}\``,
    `\`${mdCell(row.domain)}\``,
    row.table_priority,
    `\`${mdCell(row.data_category)}\``,
    `\`${mdCell(row.recommended_visibility)}\``,
    mdCell(row.public_or_anon_exception_default),
    mdCell(row.approval_status)
  ].join(' | '));

  const markdown = `# RLS Table Classification Register - 2026-06-06

## Decision

Commercial security status: \`${report.commercial_security_status}\`.

This is a static owner-approval artifact. It does not inspect hosted Supabase state, apply policy changes, or prove deployed RLS behavior. It converts \`${report.source.remediation_plan}\` into the table-by-table classification register needed before safe RLS migrations.

## Summary

| Metric | Count |
|---|---:|
| Tables requiring classification | ${report.summary.table_count} |
| P1-priority tables | ${report.summary.p1_table_count} |
| Pending owner classification | ${report.summary.pending_owner_classification_count} |
| First fix batch candidates | ${report.summary.first_fix_batch_candidate_count} |
| Public/anonymous exception reviews | ${report.summary.public_exception_review_count} |

## Data Categories

| Data Category | Tables |
|---|---:|
${categoryRows}

## Approval Workflow

${report.approval_workflow.map((step, index) => `${index + 1}. ${step}`).join('\n')}

## Register

| Batch Order | Table | Batch | Priority | Data Category | Recommended Visibility | Public/Anon Exception Default | Approval Status |
|---:|---|---|---|---|---|---|---|
${registerRows.map((row) => `| ${row} |`).join('\n')}

## Generated Artifacts

- JSON register: \`${jsonOutputPath ?? 'not requested'}\`
- CSV register: \`${csvOutputPath ?? 'not requested'}\`
`;
  writeArtifact(mdOutputPath, markdown);
}

console.log(JSON.stringify({
  json_output: jsonOutputPath ?? null,
  csv_output: csvOutputPath ?? null,
  md_output: mdOutputPath ?? null,
  commercial_security_status: report.commercial_security_status,
  table_count: report.summary.table_count,
  p1_table_count: report.summary.p1_table_count,
  first_fix_batch_candidate_count: report.summary.first_fix_batch_candidate_count,
  public_exception_review_count: report.summary.public_exception_review_count
}, null, 2));

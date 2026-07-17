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
    'Usage: node scripts/build-rls-acceptance-test-plan.mjs',
    '  --input docs/launch-readiness/rls-table-classification-register-2026-06-06.json',
    '  [--domain identity_and_review]',
    '  [--json-output docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json]',
    '  [--md-output docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.md]',
    '  [--sql-output docs/launch-readiness/rls-identity-and-review-pgtap-template-2026-06-06.sql]'
  ].join('\n'));
}

const inputPath = argValue('--input');
const domain = argValue('--domain', 'identity_and_review');
const jsonOutputPath = argValue('--json-output');
const mdOutputPath = argValue('--md-output');
const sqlOutputPath = argValue('--sql-output');

if (!inputPath) {
  usage();
  process.exit(2);
}

if (!jsonOutputPath && !mdOutputPath && !sqlOutputPath) {
  console.error('At least one of --json-output, --md-output, or --sql-output is required.');
  process.exit(2);
}

const sourcePath = path.resolve(process.cwd(), inputPath);
if (!existsSync(sourcePath)) {
  console.error(`Missing RLS classification register: ${inputPath}`);
  process.exit(2);
}

const register = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(register.rows)) {
  console.error('RLS classification register must include a rows array.');
  process.exit(2);
}

const now = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();

const tableSpecificGuidance = {
  analysis_runs: {
    owner_path: 'public.analysis_runs.user_id = auth.uid()',
    reviewer_path: "status in ('needs_review', 'under_review') and get_user_role() in ('reviewer', 'admin')",
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'owner private run, unrelated private run, review-queue run, completed public-exception candidate',
    direct_public_exception: 'only if an owner-approved published/redacted status is introduced; completed alone is not enough for enterprise-private rows',
    open_schema_gap: false
  },
  human_reviews: {
    owner_path: 'review owner through analysis_runs.user_id, plus reviewer_id when the actor is the assigned reviewer',
    reviewer_path: "get_user_role() in ('reviewer', 'admin') and reviewer_id::uuid = auth.uid() for writes",
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'review linked to owner run, review linked to unrelated run, assigned reviewer, unassigned reviewer',
    direct_public_exception: 'none by default',
    open_schema_gap: false
  },
  users: {
    owner_path: 'public.users.auth_id = auth.uid()',
    reviewer_path: 'security-definer role lookup only; direct reviewer reads need owner approval and column minimization',
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'owner user row, unrelated user row, reviewer user row, admin user row',
    direct_public_exception: 'none by default',
    open_schema_gap: false
  },
  asset_storage: {
    owner_path: 'asset owner through analysis_runs.user_id',
    reviewer_path: "reviewer/admin only for assets linked to review-queue runs if owner-approved",
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'asset linked to owner run, asset linked to unrelated run, asset linked to review-queue run',
    direct_public_exception: 'only via explicit published/redacted asset workflow',
    open_schema_gap: false
  },
  schema_failures: {
    owner_path: 'no durable owner column in current migration; add analysis_run_id/user_id or restrict to admin/service-role only',
    reviewer_path: 'admin/reviewer read only if failure metadata is redacted and owner-approved',
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'private validation failure with request_id, owner-linked failure after schema update, unrelated failure',
    direct_public_exception: 'none by default',
    open_schema_gap: true
  }
};

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function writeArtifact(destinationPath, contents) {
  const destination = path.resolve(process.cwd(), destinationPath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function mdCell(value) {
  return `${value ?? ''}`.replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function sqlIdentifier(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

const batchRows = register.rows
  .filter((row) => row.domain === domain)
  .sort((a, b) =>
    b.p1_finding_count - a.p1_finding_count ||
    b.finding_count - a.finding_count ||
    a.table.localeCompare(b.table)
  );

if (batchRows.length === 0) {
  console.error(`No classification rows found for domain: ${domain}`);
  process.exit(2);
}

const personas = [
  {
    id: 'anon',
    role: 'anon',
    purpose: 'Prove anonymous users cannot read or write private identity/review rows.'
  },
  {
    id: 'owner_user',
    role: 'authenticated',
    purpose: 'Prove the row owner can read and write only their own permitted rows.'
  },
  {
    id: 'unrelated_user',
    role: 'authenticated',
    purpose: 'Prove a different authenticated user cannot read or mutate private rows.'
  },
  {
    id: 'assigned_reviewer',
    role: 'authenticated',
    purpose: 'Prove reviewer access is limited to review-queue or explicitly assigned review rows.'
  },
  {
    id: 'admin',
    role: 'authenticated',
    purpose: 'Prove admin/reviewer override paths are explicit and role-bound.'
  },
  {
    id: 'service_role',
    role: 'service_role',
    purpose: 'Prove trusted edge functions and jobs can seed/manage rows without granting public policies.'
  }
];

function tableCases(row) {
  const guidance = tableSpecificGuidance[row.table] ?? {
    owner_path: row.owner_model_to_confirm,
    reviewer_path: 'reviewer/admin path requires owner approval',
    service_role_path: "auth.role() = 'service_role'",
    minimum_seed: 'owner row, unrelated row, review row if applicable',
    direct_public_exception: row.public_or_anon_exception_default,
    open_schema_gap: false
  };

  const cases = [
    {
      case_id: `${row.table}.anon_select_denied`,
      persona: 'anon',
      operation: 'SELECT',
      expected: 'zero private rows visible',
      assertion: `results_eq count from ${row.table} visible to anon is 0`,
      maps_to_issue_types: row.issue_types.filter((issue) =>
        ['unconditional_using_true', 'sensitive_table_read_without_identity_predicate', 'policy_grants_to_public_role'].includes(issue)
      )
    },
    {
      case_id: `${row.table}.unrelated_authenticated_select_denied`,
      persona: 'unrelated_user',
      operation: 'SELECT',
      expected: 'zero owner/private rows visible',
      assertion: `results_eq count from ${row.table} for unrelated authenticated user is 0`,
      maps_to_issue_types: row.issue_types.filter((issue) =>
        ['unconditional_using_true', 'sensitive_table_read_without_identity_predicate', 'policy_grants_to_public_role'].includes(issue)
      )
    },
    {
      case_id: `${row.table}.owner_path_allowed`,
      persona: 'owner_user',
      operation: 'SELECT',
      expected: guidance.open_schema_gap ? 'blocked until owner path exists' : 'owner-visible row count is 1',
      assertion: guidance.open_schema_gap
        ? `schema prerequisite before owner read test for ${row.table}`
        : `results_eq count from ${row.table} for owner is 1`,
      maps_to_issue_types: ['required_positive_owner_path']
    },
    {
      case_id: `${row.table}.reviewer_path_limited`,
      persona: 'assigned_reviewer',
      operation: 'SELECT',
      expected: 'reviewer sees only approved review-queue or assigned rows',
      assertion: `results_eq reviewer-visible rows from ${row.table} match approved review seed only`,
      maps_to_issue_types: ['required_positive_reviewer_path']
    },
    {
      case_id: `${row.table}.service_role_path_allowed`,
      persona: 'service_role',
      operation: row.operations.includes('INSERT') ? 'INSERT' : 'SELECT',
      expected: 'service role can perform trusted setup/edge-function operation',
      assertion: `lives_ok service-role operation for ${row.table}`,
      maps_to_issue_types: ['required_service_role_path']
    }
  ];

  if (row.operations.includes('INSERT') || row.issue_types.includes('anonymous_write_check')) {
    cases.push({
      case_id: `${row.table}.anon_insert_denied`,
      persona: 'anon',
      operation: 'INSERT',
      expected: 'insert rejected by RLS',
      assertion: `throws_ok anon insert into ${row.table} with SQLSTATE 42501`,
      maps_to_issue_types: ['anonymous_write_check', 'anonymous_non_select_policy']
    });
    cases.push({
      case_id: `${row.table}.unrelated_authenticated_write_denied`,
      persona: 'unrelated_user',
      operation: 'INSERT/UPDATE',
      expected: 'write rejected unless row owner or approved reviewer/service role',
      assertion: `throws_ok unrelated authenticated write to ${row.table} with SQLSTATE 42501`,
      maps_to_issue_types: ['write_without_obvious_identity_predicate']
    });
  }

  return cases;
}

const tables = batchRows.map((row) => {
  const guidance = tableSpecificGuidance[row.table] ?? {};
  return {
    table: row.table,
    priority: row.table_priority,
    finding_count: row.finding_count,
    p1_finding_count: row.p1_finding_count,
    issue_types: uniqueSorted(row.issue_types ?? []),
    operations: uniqueSorted(row.operations ?? []),
    data_category: row.data_category,
    recommended_visibility: row.recommended_visibility,
    owner_model_to_confirm: row.owner_model_to_confirm,
    owner_path: guidance.owner_path ?? row.owner_model_to_confirm,
    reviewer_path: guidance.reviewer_path ?? 'reviewer/admin path requires owner approval',
    service_role_path: guidance.service_role_path ?? "auth.role() = 'service_role'",
    minimum_seed: guidance.minimum_seed ?? 'owner row, unrelated row, review row if applicable',
    direct_public_exception: guidance.direct_public_exception ?? row.public_or_anon_exception_default,
    open_schema_gap: Boolean(guidance.open_schema_gap),
    source_locations: uniqueSorted(row.source_locations ?? []),
    test_cases: tableCases(row)
  };
});

const testCaseCount = tables.reduce((count, table) => count + table.test_cases.length, 0);
const openSchemaGaps = tables
  .filter((table) => table.open_schema_gap)
  .map((table) => ({
    table: table.table,
    gap: table.owner_path
  }));

const report = {
  schema_version: 1,
  generated_at: now.toISOString(),
  source: {
    classification_register: path.relative(process.cwd(), sourcePath),
    supabase_docs_basis: [
      'Supabase CLI: supabase test db runs pgTAP tests on local or linked projects',
      'Supabase docs: RLS tests should authenticate seeded personas and assert positive and negative visibility/write cases'
    ],
    production_state_verified: false,
    owner_classification_verified: register.source?.owner_classification_verified === true,
    test_execution_verified: false
  },
  domain,
  commercial_security_status: 'acceptance_tests_planned_not_executed',
  proof_boundary: 'This is a static acceptance-test plan and pgTAP template. It does not apply RLS migrations, start Supabase, connect to hosted Supabase, or prove current deployed policy behavior.',
  summary: {
    table_count: tables.length,
    p1_table_count: tables.filter((table) => table.priority === 'P1').length,
    persona_count: personas.length,
    test_case_count: testCaseCount,
    open_schema_gap_count: openSchemaGaps.length,
    expected_initial_result: 'fail_or_incomplete_before_owner_approved_rls_remediation',
    runnable_after: [
      'owner approves table classifications and public exceptions',
      'current hosted/local policy state is inspected',
      'narrow identity_and_review RLS migration is drafted',
      'test seed helpers are created or Supabase tests helpers are installed',
      'supabase test db runs locally and, after approval, against linked project'
    ]
  },
  recommended_commands_after_approval: [
    'supabase test new identity_and_review_rls --template pgtap',
    'supabase test db supabase/tests/identity_and_review_rls.test.sql --local',
    'supabase test db supabase/tests/identity_and_review_rls.test.sql --linked'
  ],
  personas,
  open_schema_gaps: openSchemaGaps,
  tables
};

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (mdOutputPath) {
  const tableRows = tables.map((table) => [
    `\`${mdCell(table.table)}\``,
    table.priority,
    table.test_cases.length,
    mdCell(table.owner_path),
    mdCell(table.reviewer_path),
    mdCell(table.direct_public_exception),
    table.open_schema_gap ? 'yes' : 'no'
  ].join(' | '));

  const personaRows = personas.map((persona) => [
    `\`${mdCell(persona.id)}\``,
    `\`${mdCell(persona.role)}\``,
    mdCell(persona.purpose)
  ].join(' | '));

  const markdown = `# RLS Acceptance Test Plan - ${domain} - 2026-06-06

## Decision

Commercial security status: \`${report.commercial_security_status}\`.

This is a static acceptance-test plan and pgTAP template for the first RLS approval batch. It does not apply policy changes, start Supabase, connect to hosted Supabase, or prove deployed RLS behavior.

## Summary

| Metric | Count |
|---|---:|
| Tables in batch | ${report.summary.table_count} |
| P1 tables | ${report.summary.p1_table_count} |
| Personas | ${report.summary.persona_count} |
| Planned test cases | ${report.summary.test_case_count} |
| Open schema gaps | ${report.summary.open_schema_gap_count} |

Expected initial result: \`${report.summary.expected_initial_result}\`.

## Personas

| Persona | Role | Purpose |
|---|---|---|
${personaRows.map((row) => `| ${row} |`).join('\n')}

## Table Acceptance Matrix

| Table | Priority | Cases | Owner Path | Reviewer Path | Public Exception | Schema Gap |
|---|---|---:|---|---|---|---|
${tableRows.map((row) => `| ${row} |`).join('\n')}

## Open Schema Gaps

${openSchemaGaps.length
  ? openSchemaGaps.map((entry) => `- \`${entry.table}\`: ${entry.gap}`).join('\n')
  : '- None identified for this batch.'}

## Commands After Approval

\`\`\`bash
supabase test new identity_and_review_rls --template pgtap
supabase test db supabase/tests/identity_and_review_rls.test.sql --local
supabase test db supabase/tests/identity_and_review_rls.test.sql --linked
\`\`\`

## Required Approval Gates

1. Owner approves the classification register for these tables.
2. Current local and hosted policy state is inspected.
3. A narrow \`identity_and_review\` RLS migration is drafted.
4. Test seed helpers are created or Supabase docs-compatible test helpers are installed.
5. Local pgTAP output is attached, then linked-project output is attached only after approval.

## Generated SQL Template

\`${sqlOutputPath ?? 'not requested'}\`
`;
  writeArtifact(mdOutputPath, markdown);
}

if (sqlOutputPath) {
  const plannedAssertions = tables.flatMap((table) =>
    table.test_cases.map((testCase) =>
      `-- ${testCase.case_id}: ${testCase.assertion}; expected ${testCase.expected}.`
    )
  );
  const tableBlocks = tables.map((table) => {
    const alias = sqlIdentifier(table.table);
    return [
      `-- ${table.table}`,
      `-- Owner path: ${table.owner_path}`,
      `-- Reviewer path: ${table.reviewer_path}`,
      `-- Service-role path: ${table.service_role_path}`,
      `-- Minimum seed: ${table.minimum_seed}`,
      `-- Public exception default: ${table.direct_public_exception}`,
      `-- Source findings: ${table.source_locations.join(', ')}`,
      `-- TODO after owner approval: replace this placeholder with pgTAP results_eq/throws_ok/lives_ok assertions for ${alias}.`
    ].join('\n');
  });

  const sql = `-- RLS acceptance test template for ${domain}
-- Generated by scripts/build-rls-acceptance-test-plan.mjs.
-- Proof boundary: template only. Do not treat this as passing RLS proof until
-- owner-approved policies are migrated and this file is run with supabase test db.
--
-- Primary docs basis:
-- - supabase test db [path] runs pgTAP tests locally or, with approval, on a linked project.
-- - Supabase RLS tests should authenticate seeded personas and assert both positive and negative access cases.

begin;

-- TODO after approval:
-- 1. Create this as supabase/tests/identity_and_review_rls.test.sql.
-- 2. Add or import Supabase docs-compatible test helpers, for example:
--    tests.create_supabase_user(...)
--    tests.authenticate_as(...)
--    tests.authenticate_as_service_role()
--    tests.clear_authentication()
-- 3. Seed owner, unrelated, reviewer, admin, and service-role setup rows.
-- 4. Run: supabase test db supabase/tests/identity_and_review_rls.test.sql --local
-- 5. After owner approval, run: supabase test db supabase/tests/identity_and_review_rls.test.sql --linked

select plan(${testCaseCount});

${plannedAssertions.join('\n')}

${tableBlocks.join('\n\n')}

select * from finish();
rollback;
`;
  writeArtifact(sqlOutputPath, sql);
}

console.log(JSON.stringify({
  json_output: jsonOutputPath ?? null,
  md_output: mdOutputPath ?? null,
  sql_output: sqlOutputPath ?? null,
  domain,
  commercial_security_status: report.commercial_security_status,
  table_count: report.summary.table_count,
  p1_table_count: report.summary.p1_table_count,
  test_case_count: report.summary.test_case_count,
  open_schema_gap_count: report.summary.open_schema_gap_count
}, null, 2));

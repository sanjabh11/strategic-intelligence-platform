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
    'Usage: node scripts/build-rls-policy-draft.mjs',
    '  --input docs/launch-readiness/rls-identity-and-review-test-plan-2026-06-06.json',
    '  [--json-output docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.json]',
    '  [--md-output docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.md]',
    '  [--sql-output docs/launch-readiness/rls-identity-and-review-policy-draft-2026-06-06.sql]'
  ].join('\n'));
}

const inputPath = argValue('--input');
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
  console.error(`Missing RLS acceptance-test plan: ${inputPath}`);
  process.exit(2);
}

const testPlan = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(testPlan.tables) || testPlan.domain !== 'identity_and_review') {
  console.error('This draft generator currently expects an identity_and_review test plan with a tables array.');
  process.exit(2);
}

const now = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();

function writeArtifact(destinationPath, contents) {
  const destination = path.resolve(process.cwd(), destinationPath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, contents);
}

function mdCell(value) {
  return `${value ?? ''}`.replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

const policyDecisions = [
  {
    table: 'analysis_runs',
    decision: 'owner/reviewer/admin access; no anonymous read or insert by default',
    drops_broad_policies: ['read_anon_runs', 'read_public_runs', 'read_runs', 'public_read_completed_runs', 'mvp_insert_anon_runs', 'insert_service_role_runs'],
    creates_policies: [
      'identity_review_owner_read_analysis_runs',
      'identity_review_owner_insert_analysis_runs',
      'identity_review_reviewer_read_analysis_runs',
      'identity_review_reviewer_update_analysis_runs',
      'identity_review_admin_all_analysis_runs'
    ],
    commercial_reason: 'Analysis rows can contain customer questions, source context, strategist output, and review state.',
    public_exception_status: 'not approved in this draft; requires explicit published/redacted workflow'
  },
  {
    table: 'human_reviews',
    decision: 'owner, assigned reviewer, queue reviewer, or admin access only',
    drops_broad_policies: ['read_human_reviews', 'reviewer_read_human_reviews', 'reviewer_write_human_reviews', 'admin_access_human_reviews'],
    creates_policies: [
      'identity_review_owner_read_human_reviews',
      'identity_review_reviewer_read_human_reviews',
      'identity_review_reviewer_update_human_reviews',
      'identity_review_admin_all_human_reviews'
    ],
    commercial_reason: 'Review records expose high-stakes reviewer decisions and feedback.',
    public_exception_status: 'none by default'
  },
  {
    table: 'users',
    decision: 'own profile row plus admin access; direct reviewer reads require a separate approved minimization path',
    drops_broad_policies: ['read_users_public', 'read_users'],
    creates_policies: ['identity_review_owner_read_users', 'identity_review_admin_all_users'],
    commercial_reason: 'User role data powers RLS decisions and should not be public catalog data.',
    public_exception_status: 'none by default'
  },
  {
    table: 'asset_storage',
    decision: 'owner or approved reviewer/admin access through linked analysis_runs',
    drops_broad_policies: ['read_asset_storage'],
    creates_policies: [
      'identity_review_owner_read_asset_storage',
      'identity_review_reviewer_read_asset_storage',
      'identity_review_admin_all_asset_storage'
    ],
    commercial_reason: 'Assets can contain handouts, slides, source packages, and customer analysis material.',
    public_exception_status: 'only via explicit published/redacted asset workflow, not included in this draft'
  },
  {
    table: 'schema_failures',
    decision: 'admin-only direct reads until owner chooses an analysis_run_id/user_id schema link',
    drops_broad_policies: ['read_schema_failures'],
    creates_policies: ['identity_review_admin_read_schema_failures'],
    commercial_reason: 'Validation failures can leak prompts, raw model output, schema internals, and customer context.',
    public_exception_status: 'none by default'
  }
];

const openDecisions = [
  {
    decision_id: 'schema_failures_owner_path',
    status: 'owner_decision_required',
    recommended_default: 'admin_service_role_only',
    alternative: 'add analysis_run_id uuid references public.analysis_runs(id) and owner/reviewer policies through analysis_runs',
    reason: 'Current migrations define schema_failures with request_id/raw_response/validation_errors but no durable owner column.'
  },
  {
    decision_id: 'public_completed_analysis_runs',
    status: 'owner_decision_required',
    recommended_default: 'no_public_completed_read_in_enterprise_default',
    alternative: 'create a separate redacted/published summary table or explicit published_at flag before public reads',
    reason: 'status=completed alone is not enough to prove a row is safe for anonymous or public reads.'
  },
  {
    decision_id: 'reviewer_direct_user_reads',
    status: 'owner_decision_required',
    recommended_default: 'no_direct_reviewer_user_table_reads',
    alternative: 'create a least-privilege reviewer profile view with only role/name fields needed for queue work',
    reason: 'The users table powers role checks and should not become a broad reviewer directory without minimization.'
  }
];

const sqlDraft = `-- NON-APPLIED DRAFT: identity_and_review RLS remediation
-- Generated by scripts/build-rls-policy-draft.mjs.
-- Do not place this file under supabase/migrations or apply it to hosted Supabase
-- until owner classification, current hosted policy inspection, and local pgTAP
-- test helpers are complete.
--
-- Proof boundary:
-- - This is a draft, not an executed migration.
-- - Supabase service_role keys can bypass RLS server-side; never expose them to clients.
-- - Public reads are intentionally not included for analysis_runs, users,
--   human_reviews, asset_storage, or schema_failures in this draft.

-- Harden helper used by RLS role predicates.
create or replace function public.get_user_role()
returns text
security definer
set search_path = public
language sql
stable
as $$
  select u.role
  from public.users u
  where u.auth_id = (select auth.uid())::uuid
  limit 1
$$;

-- Remove legacy broad policies for the first remediation batch.
drop policy if exists read_anon_runs on public.analysis_runs;
drop policy if exists read_public_runs on public.analysis_runs;
drop policy if exists read_runs on public.analysis_runs;
drop policy if exists public_read_completed_runs on public.analysis_runs;
drop policy if exists mvp_insert_anon_runs on public.analysis_runs;
drop policy if exists insert_service_role_runs on public.analysis_runs;
drop policy if exists reviewer_read_analysis_runs on public.analysis_runs;
drop policy if exists reviewer_update_analysis_runs on public.analysis_runs;
drop policy if exists admin_access_analysis_runs on public.analysis_runs;

drop policy if exists read_human_reviews on public.human_reviews;
drop policy if exists reviewer_read_human_reviews on public.human_reviews;
drop policy if exists reviewer_write_human_reviews on public.human_reviews;
drop policy if exists admin_access_human_reviews on public.human_reviews;

drop policy if exists read_users_public on public.users;
drop policy if exists read_users on public.users;

drop policy if exists read_asset_storage on public.asset_storage;
drop policy if exists read_schema_failures on public.schema_failures;

-- Remove prior draft policy names as well, so the final approved migration can be idempotent.
drop policy if exists identity_review_owner_read_analysis_runs on public.analysis_runs;
drop policy if exists identity_review_owner_insert_analysis_runs on public.analysis_runs;
drop policy if exists identity_review_reviewer_read_analysis_runs on public.analysis_runs;
drop policy if exists identity_review_reviewer_update_analysis_runs on public.analysis_runs;
drop policy if exists identity_review_admin_all_analysis_runs on public.analysis_runs;

drop policy if exists identity_review_owner_read_human_reviews on public.human_reviews;
drop policy if exists identity_review_reviewer_read_human_reviews on public.human_reviews;
drop policy if exists identity_review_reviewer_update_human_reviews on public.human_reviews;
drop policy if exists identity_review_admin_all_human_reviews on public.human_reviews;

drop policy if exists identity_review_owner_read_users on public.users;
drop policy if exists identity_review_admin_all_users on public.users;

drop policy if exists identity_review_owner_read_asset_storage on public.asset_storage;
drop policy if exists identity_review_reviewer_read_asset_storage on public.asset_storage;
drop policy if exists identity_review_admin_all_asset_storage on public.asset_storage;

drop policy if exists identity_review_admin_read_schema_failures on public.schema_failures;

alter table public.analysis_runs enable row level security;
alter table public.human_reviews enable row level security;
alter table public.users enable row level security;
alter table public.asset_storage enable row level security;
alter table public.schema_failures enable row level security;

-- analysis_runs: owner, reviewer queue, and admin.
create policy identity_review_owner_read_analysis_runs
  on public.analysis_runs
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy identity_review_owner_insert_analysis_runs
  on public.analysis_runs
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy identity_review_reviewer_read_analysis_runs
  on public.analysis_runs
  for select
  to authenticated
  using (
    public.get_user_role() = 'reviewer'
    and status in ('needs_review', 'under_review')
  );

create policy identity_review_reviewer_update_analysis_runs
  on public.analysis_runs
  for update
  to authenticated
  using (
    public.get_user_role() = 'reviewer'
    and status in ('needs_review', 'under_review')
  )
  with check (
    public.get_user_role() = 'reviewer'
    and status in ('needs_review', 'under_review', 'approved', 'rejected')
  );

create policy identity_review_admin_all_analysis_runs
  on public.analysis_runs
  for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- human_reviews: owner through analysis_run, assigned/queue reviewer, and admin.
create policy identity_review_owner_read_human_reviews
  on public.human_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analysis_runs ar
      where ar.id = human_reviews.analysis_run_id
        and ar.user_id = (select auth.uid())
    )
  );

create policy identity_review_reviewer_read_human_reviews
  on public.human_reviews
  for select
  to authenticated
  using (
    public.get_user_role() = 'reviewer'
    and (
      reviewer_id = (select auth.uid())::text
      or exists (
        select 1
        from public.analysis_runs ar
        where ar.id = human_reviews.analysis_run_id
          and ar.status in ('needs_review', 'under_review')
      )
    )
  );

create policy identity_review_reviewer_update_human_reviews
  on public.human_reviews
  for update
  to authenticated
  using (
    public.get_user_role() = 'reviewer'
    and reviewer_id = (select auth.uid())::text
  )
  with check (
    public.get_user_role() = 'reviewer'
    and reviewer_id = (select auth.uid())::text
  );

create policy identity_review_admin_all_human_reviews
  on public.human_reviews
  for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- users: own row and admin only.
create policy identity_review_owner_read_users
  on public.users
  for select
  to authenticated
  using (auth_id = (select auth.uid()));

create policy identity_review_admin_all_users
  on public.users
  for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- asset_storage: owner through analysis_run, approved review queue, and admin.
create policy identity_review_owner_read_asset_storage
  on public.asset_storage
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.analysis_runs ar
      where ar.id = asset_storage.analysis_run_id
        and ar.user_id = (select auth.uid())
    )
  );

create policy identity_review_reviewer_read_asset_storage
  on public.asset_storage
  for select
  to authenticated
  using (
    public.get_user_role() = 'reviewer'
    and exists (
      select 1
      from public.analysis_runs ar
      where ar.id = asset_storage.analysis_run_id
        and ar.status in ('needs_review', 'under_review')
    )
  );

create policy identity_review_admin_all_asset_storage
  on public.asset_storage
  for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- schema_failures: no owner path exists in current migrations.
-- Draft default: admin-only direct reads; service-role jobs can manage server-side.
-- Owner alternative: add analysis_run_id/user_id and mirror owner/reviewer policies.
create policy identity_review_admin_read_schema_failures
  on public.schema_failures
  for select
  to authenticated
  using (public.get_user_role() = 'admin');
`;

const report = {
  schema_version: 1,
  generated_at: now.toISOString(),
  source: {
    acceptance_test_plan: path.relative(process.cwd(), sourcePath),
    production_state_verified: false,
    owner_classification_verified: testPlan.source?.owner_classification_verified === true,
    migration_applied: false,
    test_execution_verified: false
  },
  domain: testPlan.domain,
  commercial_security_status: 'policy_draft_not_applied',
  proof_boundary: 'This draft is a launch-readiness artifact only. It must not be copied into supabase/migrations or applied to hosted Supabase until owner approval, hosted policy inspection, local pgTAP tests, and linked-project approval gates are complete.',
  summary: {
    table_count: policyDecisions.length,
    policy_count_to_drop: policyDecisions.reduce((count, decision) => count + decision.drops_broad_policies.length, 0),
    policy_count_to_create: policyDecisions.reduce((count, decision) => count + decision.creates_policies.length, 0),
    open_decision_count: openDecisions.length,
    expected_test_plan_cases: testPlan.summary?.test_case_count ?? null,
    expected_initial_result: 'not_executable_until_owner_approval_and_pgTAP_helpers'
  },
  policy_decisions: policyDecisions,
  open_decisions: openDecisions,
  required_approval_gates: [
    'Owner approves identity_and_review table classifications and public exceptions.',
    'Owner chooses schema_failures owner path: admin/service-role only or add analysis_run_id/user_id.',
    'Current hosted Supabase policies are inspected before migration text is finalized.',
    'SQL draft is converted into one timestamped migration only after approval.',
    'Generated pgTAP template is converted into supabase/tests with helpers and run locally.',
    'Linked-project pgTAP and hosted smoke are run only after explicit production approval.'
  ],
  sql_draft_preview: sqlDraft
};

if (jsonOutputPath) {
  writeArtifact(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (mdOutputPath) {
  const tableRows = policyDecisions.map((decision) => [
    `\`${mdCell(decision.table)}\``,
    mdCell(decision.decision),
    decision.drops_broad_policies.length,
    decision.creates_policies.length,
    mdCell(decision.public_exception_status)
  ].join(' | '));

  const openRows = openDecisions.map((decision) => [
    `\`${mdCell(decision.decision_id)}\``,
    mdCell(decision.recommended_default),
    mdCell(decision.alternative),
    mdCell(decision.reason)
  ].join(' | '));

  const markdown = `# RLS Policy Draft - identity_and_review - 2026-06-06

## Decision

Commercial security status: \`${report.commercial_security_status}\`.

This is a non-applied policy draft. It must not be placed under \`supabase/migrations\` or applied to hosted Supabase until owner approval, hosted policy inspection, local pgTAP tests, and linked-project approval gates are complete.

## Summary

| Metric | Count |
|---|---:|
| Tables covered | ${report.summary.table_count} |
| Broad policies to drop | ${report.summary.policy_count_to_drop} |
| Least-privilege policies to create | ${report.summary.policy_count_to_create} |
| Open owner decisions | ${report.summary.open_decision_count} |
| Planned pgTAP cases from source plan | ${report.summary.expected_test_plan_cases} |

## Table Policy Decisions

| Table | Decision | Drop Count | Create Count | Public Exception |
|---|---|---:|---:|---|
${tableRows.map((row) => `| ${row} |`).join('\n')}

## Open Owner Decisions

| Decision | Recommended Default | Alternative | Reason |
|---|---|---|---|
${openRows.map((row) => `| ${row} |`).join('\n')}

## Approval Gates

${report.required_approval_gates.map((gate, index) => `${index + 1}. ${gate}`).join('\n')}

## SQL Draft

\`${sqlOutputPath ?? 'not requested'}\`
`;
  writeArtifact(mdOutputPath, markdown);
}

if (sqlOutputPath) {
  writeArtifact(sqlOutputPath, sqlDraft);
}

console.log(JSON.stringify({
  json_output: jsonOutputPath ?? null,
  md_output: mdOutputPath ?? null,
  sql_output: sqlOutputPath ?? null,
  commercial_security_status: report.commercial_security_status,
  table_count: report.summary.table_count,
  policy_count_to_drop: report.summary.policy_count_to_drop,
  policy_count_to_create: report.summary.policy_count_to_create,
  open_decision_count: report.summary.open_decision_count
}, null, 2));

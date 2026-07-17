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
  console.error('Usage: node scripts/build-rls-remediation-plan.mjs --input docs/launch-readiness/rls-policy-audit-2026-06-06.json [--output docs/launch-readiness/rls-remediation-plan-2026-06-06.json]');
}

const inputPath = argValue('--input');
const outputPath = argValue('--output');

if (!inputPath) {
  usage();
  process.exit(2);
}

const sourcePath = path.resolve(process.cwd(), inputPath);
if (!existsSync(sourcePath)) {
  console.error(`Missing RLS audit report: ${inputPath}`);
  process.exit(2);
}

const audit = JSON.parse(readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(audit.findings)) {
  console.error('RLS audit report must include a findings array.');
  process.exit(2);
}

const now = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
  : new Date();

const domainRules = [
  {
    domain: 'identity_and_review',
    patterns: [/^users$/, /^human_reviews$/, /^analysis_runs$/, /^asset_storage$/, /^schema_failures$/],
    buyerImpact: 'Directly affects user privacy, review confidentiality, and buyer trust in analysis ownership.',
    policyDirection: 'Require authenticated owner, reviewer, or service-role access; remove unconditional public reads and anonymous writes except through audited edge functions.'
  },
  {
    domain: 'collaboration_and_warroom',
    patterns: [/collaborative/, /^session_participants$/, /^warroom_/],
    buyerImpact: 'Collaboration memory and war-room records are enterprise-sensitive and need team/member scoped access.',
    policyDirection: 'Scope reads and writes to room/session membership, creator ownership, explicit reviewer roles, or service-role jobs.'
  },
  {
    domain: 'classroom',
    patterns: [/^classrooms$/, /^classroom_/],
    buyerImpact: 'Academic pilots need teacher/student membership boundaries and privacy-safe activity logs.',
    policyDirection: 'Restrict access by classroom membership and teacher role; prove non-members cannot read or write classroom artifacts.'
  },
  {
    domain: 'retrieval_and_evidence',
    patterns: [/^retrieval/, /^evidence_/],
    buyerImpact: 'Evidence, retrieval cache, and provider runs can expose query intent, sources, and analysis context.',
    policyDirection: 'Separate public citation reads from private retrieval logs; route anonymous evidence writes through edge functions with rate limits and provenance metadata.'
  },
  {
    domain: 'analysis_execution',
    patterns: [/^analysis_jobs$/, /^analysis_features$/, /^multiplayer_/, /^real_time_events$/, /^rate_limit_tracking$/, /^circuit_breaker$/],
    buyerImpact: 'Analysis execution and public-beta intake tables can expose job state, feature outputs, abuse controls, and user workflow metadata.',
    policyDirection: 'Route anonymous public-beta writes through edge functions, bind job reads/writes to owner or service-role, and expose only redacted public status.'
  },
  {
    domain: 'forecasting_and_ml_evaluation',
    patterns: [/whitebox/, /forecasting/, /recalibration/, /outcome/, /strategy_success/, /strategy_outcomes/, /temporal_optimization/, /cross_domain_transfer/, /^calibration_models$/, /^drift_signals$/, /^forecast_scores$/, /^shadow_/, /^temporal_forecasts$/, /^community_metrics$/],
    buyerImpact: 'Prediction-science claims require protected evaluation data, shadow runs, and resolved-outcome ledgers.',
    policyDirection: 'Restrict evaluation, shadow, and calibration tables to service-role jobs, owners, reviewers, and explicitly public published summaries.'
  },
  {
    domain: 'ontology_and_graph',
    patterns: [/^ontology_/, /^entity_graph_/],
    buyerImpact: 'Ontology and graph data can reveal strategic context, source linkage, and inferred entities across customer analyses.',
    policyDirection: 'Separate globally public ontology references from customer-derived graph edges; require owner/service-role access for derived graph records.'
  },
  {
    domain: 'public_catalog_candidates',
    patterns: [/^domain_specific_patterns$/, /^marketplace_scenarios$/, /^tier_limits$/, /^game_definitions$/, /^patterns$/, /^signaling_recommendations$/, /^cooperation_campaigns$/, /^campaign_participants$/, /^assignment_submissions$/],
    buyerImpact: 'Some catalog rows may be intentionally public, but enterprise buyers need an exception register explaining why broad reads are safe.',
    policyDirection: 'Classify each table as public catalog or private pilot data; retain public reads only for explicitly published catalog rows and block anonymous writes.'
  },
  {
    domain: 'observability',
    patterns: [/monitoring_alerts/, /rpc_errors/, /third_party_noise/],
    buyerImpact: 'Operational logs can expose system internals, provider failures, and customer activity.',
    policyDirection: 'Restrict observability records to service-role/admin/reviewer roles; expose only redacted health summaries.'
  },
  {
    domain: 'advanced_services',
    patterns: [/quantum/, /strategic_patterns/, /belief_networks/, /information_value/, /scale_invariant/, /agent_beliefs/, /analysis_trajectories/, /shared_strategies/, /collective_/, /^insight_reactions$/],
    buyerImpact: 'Advanced outputs can contain customer scenario data and should not be anonymously writable or broadly readable.',
    policyDirection: 'Require owner-bound inserts and reads, or service-role mediated writes from authenticated analysis jobs.'
  }
];

const issueGuidance = {
  unconditional_using_true: {
    remediation: 'Replace USING (true) with an owner, membership, status, role, or published-public predicate.',
    test: 'Add a deny-by-default test proving an unrelated authenticated user and anon role cannot read private rows.'
  },
  sensitive_table_read_without_identity_predicate: {
    remediation: 'Add a visible identity, ownership, role, membership, or publication-state predicate.',
    test: 'Add positive and negative read tests for owner/member/reviewer versus unrelated user.'
  },
  anonymous_write_check: {
    remediation: 'Remove direct anon writes or move them behind an edge function/service-role flow with rate limits and input validation.',
    test: 'Add anon insert denial tests and a separate service-role/edge-function happy-path test.'
  },
  anonymous_non_select_policy: {
    remediation: 'Remove non-read anonymous policies unless the table is explicitly classified as public intake and has abuse controls.',
    test: 'Add anon update/delete/insert denial tests for private tables.'
  },
  policy_grants_to_public_role: {
    remediation: 'Replace TO public with explicit roles and predicates; use public only for tables classified as public catalog/read-only.',
    test: 'Add role-scoped access tests for anon, authenticated owner, unrelated authenticated user, reviewer, and service role.'
  },
  write_without_obvious_identity_predicate: {
    remediation: 'Add ownership, service-role, or reviewer predicates to write policies.',
    test: 'Add write denial tests for unrelated users and write acceptance tests for the intended actor.'
  }
};

function domainForTable(table) {
  const matched = domainRules.find((rule) => rule.patterns.some((pattern) => pattern.test(table)));
  return matched ?? {
    domain: 'unclassified',
    buyerImpact: 'Classification needed before enterprise pilots.',
    policyDirection: 'Classify as public catalog, authenticated user data, team data, service-job data, or observability data before policy changes.'
  };
}

function priorityForFindings(findings) {
  if (findings.some((finding) => finding.severity === 'P1')) return 'P1';
  return findings.some((finding) => finding.severity === 'P2') ? 'P2' : 'P3';
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

const findingsByTable = new Map();
for (const finding of audit.findings) {
  if (!finding.table) continue;
  const existing = findingsByTable.get(finding.table) ?? [];
  existing.push(finding);
  findingsByTable.set(finding.table, existing);
}

const priorityRank = { P1: 1, P2: 2, P3: 3 };
const tablePlans = [...findingsByTable.entries()].map(([table, findings]) => {
  const domain = domainForTable(table);
  const issueTypes = uniqueSorted(findings.map((finding) => finding.issue));
  const operations = uniqueSorted(findings.map((finding) => finding.operation));
  const files = uniqueSorted(findings.map((finding) => `${finding.file}:${finding.line}`));
  const priority = priorityForFindings(findings);
  return {
    table,
    domain: domain.domain,
    priority,
    finding_count: findings.length,
    p1_finding_count: findings.filter((finding) => finding.severity === 'P1').length,
    issue_types: issueTypes,
    operations,
    buyer_impact: domain.buyerImpact,
    recommended_policy_direction: domain.policyDirection,
    required_tests: issueTypes.map((issue) => issueGuidance[issue]?.test ?? 'Add positive and negative role tests.'),
    remediation_notes: issueTypes.map((issue) => issueGuidance[issue]?.remediation ?? 'Classify and replace broad policy with role-scoped predicates.'),
    source_locations: files
  };
}).sort((a, b) =>
  priorityRank[a.priority] - priorityRank[b.priority] ||
  b.p1_finding_count - a.p1_finding_count ||
  b.finding_count - a.finding_count ||
  a.table.localeCompare(b.table)
);

const tablesByDomain = new Map();
for (const plan of tablePlans) {
  const existing = tablesByDomain.get(plan.domain) ?? [];
  existing.push(plan);
  tablesByDomain.set(plan.domain, existing);
}

const remediationBatches = [...tablesByDomain.entries()].map(([domain, plans]) => {
  const p1Tables = plans.filter((plan) => plan.priority === 'P1');
  const rule = domainRules.find((entry) => entry.domain === domain);
  return {
    domain,
    priority: p1Tables.length ? 'P1' : plans.some((plan) => plan.priority === 'P2') ? 'P2' : 'P3',
    table_count: plans.length,
    p1_table_count: p1Tables.length,
    tables: plans.map((plan) => plan.table),
    buyer_impact: rule?.buyerImpact ?? 'Classification needed before enterprise pilots.',
    recommended_policy_direction: rule?.policyDirection ?? 'Classify table data sensitivity and apply least-privilege role predicates.',
    acceptance_tests: [
      'anon role cannot read or write private rows',
      'unrelated authenticated user cannot access another owner/member row',
      'intended owner/member/reviewer/service-role path still works',
      'published public summary rows remain readable only when explicitly classified public'
    ]
  };
}).sort((a, b) =>
  priorityRank[a.priority] - priorityRank[b.priority] ||
  b.p1_table_count - a.p1_table_count ||
  b.table_count - a.table_count ||
  a.domain.localeCompare(b.domain)
);

const report = {
  schema_version: 1,
  generated_at: now.toISOString(),
  source: {
    audit_report: path.relative(process.cwd(), sourcePath),
    mode: 'static_remediation_plan',
    production_state_verified: false
  },
  summary: {
    source_migration_file_count: audit.summary?.migration_file_count ?? null,
    source_policy_count: audit.summary?.policy_count ?? null,
    source_finding_count: audit.summary?.finding_count ?? audit.findings.length,
    source_p1_finding_count: audit.summary?.severity_counts?.P1 ?? audit.findings.filter((finding) => finding.severity === 'P1').length,
    affected_table_count: tablePlans.length,
    p1_table_count: tablePlans.filter((plan) => plan.priority === 'P1').length,
    remediation_batch_count: remediationBatches.length,
    commercial_security_status: 'not_enterprise_ready'
  },
  best_practice_mapping: [
    {
      framework: 'OWASP API1:2023 Broken Object Level Authorization',
      requirement: 'Every record-access path needs object-level authorization tied to the requesting actor and the requested object.',
      implication: 'Broad USING (true), public role policies, and anonymous writes are not acceptable for private strategic-intelligence data.'
    },
    {
      framework: 'Supabase RLS and database testing guidance',
      requirement: 'RLS policies should be automated-test covered via application tests or Supabase CLI SQL/pgTAP tests.',
      implication: 'A policy migration is not complete until anon, unrelated authenticated, owner/member, reviewer, and service-role behavior is proven.'
    },
    {
      framework: 'NIST SSDF SP 800-218',
      requirement: 'Secure software practices should reduce vulnerability likelihood and provide acquisition-ready communication between producer and customer.',
      implication: 'This remediation plan is a procurement evidence artifact, not proof that deployed policies are already fixed.'
    },
    {
      framework: 'CISA Secure by Design',
      requirement: 'Product owners should take ownership of customer security outcomes and ship secure defaults.',
      implication: 'Enterprise pilots should wait for table-scoped least-privilege policies and hosted proof.'
    }
  ],
  remediation_batches: remediationBatches,
  priority_tables: tablePlans,
  approval_gates: [
    'Do not apply broad RLS migrations without owner approval and current hosted policy inspection.',
    'Classify each affected table as public catalog, authenticated user data, team/collaboration data, service-job data, evaluation/shadow data, or observability data.',
    'Draft one narrow migration per domain batch, starting with identity_and_review plus collaboration_and_warroom.',
    'Run Supabase database tests for anon, unrelated authenticated, owner/member, reviewer, and service-role paths.',
    'Run hosted smoke scripts after deployment and attach logs/screenshots to launch evidence.',
    'Keep commercial decision at pilot-only until P1 policy findings are fixed or intentionally accepted with written buyer-facing caveats.'
  ],
  procurement_evidence_needed: [
    'Table classification register with owner and sensitivity for each P1 table.',
    'Policy diff showing broad public/anon predicates removed or explicitly justified.',
    'Supabase test output proving negative and positive access cases.',
    'Hosted smoke output for console, forecast, review, classroom/war-room where relevant, pricing/auth, and schema preflight.',
    'Exception register for any public or anonymous policy retained for public beta intake.'
  ]
};

if (outputPath) {
  const destination = path.resolve(process.cwd(), outputPath);
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify({
  output: outputPath ?? null,
  commercial_security_status: report.summary.commercial_security_status,
  affected_table_count: report.summary.affected_table_count,
  p1_table_count: report.summary.p1_table_count,
  remediation_batch_count: report.summary.remediation_batch_count
}, null, 2));

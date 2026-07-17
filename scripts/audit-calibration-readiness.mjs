#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DEFAULT_OUTPUT = 'docs/launch-readiness/calibration-readiness-audit-2026-06-06.json'

function parseArgs(argv) {
  const parsed = {
    output: DEFAULT_OUTPUT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--output') {
      parsed.output = argv[index + 1]
      index += 1
    } else if (arg.startsWith('--output=')) {
      parsed.output = arg.slice('--output='.length)
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true
    }
  }

  return parsed
}

function usage() {
  console.log(`Usage: node scripts/audit-calibration-readiness.mjs [--output ${DEFAULT_OUTPUT}]`)
}

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) {
    return null
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

function readJson(relativePath) {
  const text = readText(relativePath)
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function lineFor(text, needle) {
  if (!text) return null
  const lines = text.split(/\r?\n/)
  const index = lines.findIndex((line) => line.includes(needle))
  return index === -1 ? null : index + 1
}

function listFiles(relativePath, predicate) {
  const absolutePath = path.join(ROOT, relativePath)
  if (!fs.existsSync(absolutePath)) return []
  return fs
    .readdirSync(absolutePath)
    .filter((entry) => predicate(entry))
    .map((entry) => path.join(relativePath, entry))
    .sort()
}

function evidenceRef(relativePath, line) {
  return line ? `${relativePath}:${line}` : relativePath
}

function buildRequirement(relativePath, label, needle, rationale) {
  const text = readText(relativePath)
  const line = lineFor(text, needle)
  return {
    label,
    status: text && line ? 'pass' : 'fail',
    evidence: text && line ? evidenceRef(relativePath, line) : `${relativePath}: missing "${needle}"`,
    rationale,
  }
}

function collectRlsCalibrationFindings() {
  const rlsAuditPath = 'docs/launch-readiness/rls-policy-audit-2026-06-06.json'
  const audit = readJson(rlsAuditPath)
  if (!audit || !Array.isArray(audit.findings)) {
    return {
      source: rlsAuditPath,
      status: 'not_available',
      relevant_p1_tables: [],
      finding_count: 0,
      findings: [],
    }
  }

  const relevantPattern = /(calibration|whitebox|shadow|drift|forecast)/i
  const findings = audit.findings
    .filter((finding) => relevantPattern.test(String(finding.table || '')))
    .map((finding) => ({
      severity: finding.severity,
      table: finding.table,
      issue: finding.issue,
      policy: finding.policy,
      file: finding.file,
      line: finding.line,
    }))

  const relevantP1Tables = [
    ...new Set(
      findings
        .filter((finding) => finding.severity === 'P1')
        .map((finding) => finding.table),
    ),
  ].sort()

  return {
    source: rlsAuditPath,
    status: relevantP1Tables.length ? 'open_p1_findings' : 'no_relevant_p1_findings',
    relevant_p1_tables: relevantP1Tables,
    finding_count: findings.length,
    findings,
  }
}

function collectLedgerReports() {
  return listFiles('docs/launch-readiness', (entry) =>
    /^resolved-forecast-calibration-ledger.*\.json$/i.test(entry),
  )
    .map((relativePath) => {
      const report = readJson(relativePath)
      return {
        path: relativePath,
        mode: report?.source?.mode || 'unknown',
        commercial_claim_status: report?.commercial_claim_status || 'unknown',
        included_point_count: Number(report?.summary?.included_point_count || 0),
        max_source_sample_size: Number(report?.summary?.max_source_sample_size || 0),
        minimum_sample_size: Number(report?.summary?.minimum_sample_size || 0),
        sources_scored: Number(report?.summary?.sources_scored || 0),
        has_reliability_bins: Array.isArray(report?.source_summaries)
          && report.source_summaries.some((source) => Array.isArray(source.reliability_bins) && source.reliability_bins.length > 0),
      }
    })
}

function collectBenchmarkReports() {
  return listFiles('docs/launch-readiness', (entry) =>
    /^forecast-benchmark-comparison.*\.json$/i.test(entry),
  )
    .map((relativePath) => {
      const report = readJson(relativePath)
      return {
        path: relativePath,
        commercial_benchmark_status: report?.commercial_benchmark_status || 'unknown',
        ledger_mode: report?.source?.ledger_mode || 'unknown',
        comparisons_made: Number(report?.summary?.comparisons_made || 0),
        baselines_loaded: Number(report?.summary?.baselines_loaded || 0),
        sources_compared: Number(report?.summary?.sources_compared || 0),
      }
    })
}

function buildAudit() {
  const generatedAt = new Date().toISOString()
  const ledgerReports = collectLedgerReports()
  const benchmarkReports = collectBenchmarkReports()
  const approvedLedger = ledgerReports.find((report) => report.commercial_claim_status === 'usable_with_caveats')
  const sampleLedger = ledgerReports.find((report) => report.mode === 'sample_fixture')
  const approvedBenchmark = benchmarkReports.find((report) => report.commercial_benchmark_status === 'usable_with_caveats')
  const sampleBenchmark = benchmarkReports.find((report) => report.commercial_benchmark_status === 'sample_only_not_launch_proof')

  const requirements = [
    buildRequirement(
      'shared/mlAdvisory.ts',
      'TypeScript calibration fitting uses isotonic or prior-smoothed calibration.',
      'fitIsotonicCalibration',
      'Local and Edge code need a reusable calibration model before accuracy claims can be measured.',
    ),
    buildRequirement(
      'shared/mlAdvisory.ts',
      'Calibration metrics include Brier loss before and after calibration.',
      'brier_calibrated',
      'Brier loss is the minimum scoring primitive for binary forecast credibility.',
    ),
    buildRequirement(
      'ml-service/main.py',
      'ML service can refresh persisted calibration models from resolved outcomes.',
      '/ops/calibration-refresh',
      'A production learning loop needs an operational calibration refresh endpoint.',
    ),
    buildRequirement(
      'ml-service/main.py',
      'ML service stores sample size and raw/calibrated Brier metrics.',
      'brier_calibrated',
      'Calibration claims need sample-size and score metadata, not only adjusted probabilities.',
    ),
    buildRequirement(
      'supabase/functions/_shared/whitebox-release.ts',
      'Whitebox release helper computes Brier scores per resolved forecast variant.',
      'calculateBrierScore',
      'Consensus-policy promotion should be score-backed by resolved outcomes.',
    ),
    buildRequirement(
      'supabase/functions/_shared/whitebox-release.ts',
      'Promotion is blocked until a minimum resolved sample size is available.',
      'minimumSampleSize',
      'Small-sample challenger wins must not drive automatic promotion.',
    ),
    buildRequirement(
      'supabase/functions/whitebox-scheduled/index.ts',
      'Scheduled whitebox job backfills resolved forecast evaluations.',
      'fetchPendingWhiteboxForecasts',
      'The app needs a repeatable backfill path from resolved forecasts to evaluation rows.',
    ),
    buildRequirement(
      'supabase/functions/release-evaluation/index.ts',
      'Release evaluation endpoint summarizes challenger performance.',
      'buildReleaseEvaluation',
      'Governed releases need a dry-run/evaluation surface before promotion.',
    ),
    buildRequirement(
      'supabase/functions/release-promotion/index.ts',
      'Release promotion endpoint requires threshold evidence unless forced.',
      'Promotion thresholds are not met.',
      'Manual or automatic policy changes need explicit gates.',
    ),
    buildRequirement(
      'supabase/functions/calibration-refresh/index.ts',
      'Calibration refresh Edge function proxies authorized calls to the ML service.',
      '/ops/calibration-refresh',
      'Hosted operations need a service boundary rather than direct client writes.',
    ),
    buildRequirement(
      'supabase/functions/drift-evaluate/index.ts',
      'Drift evaluation Edge function proxies authorized calls to the ML service.',
      '/ops/drift-evaluate',
      'Forecast reliability needs drift monitoring when evidence distributions shift.',
    ),
    buildRequirement(
      'supabase/functions/brier-weighted-consensus/index.ts',
      'Consensus aggregation incorporates user Brier history and reliability.',
      'calculateBrierWeight',
      'A sellable forecast workflow needs a performance-weighted consensus lane.',
    ),
    buildRequirement(
      'supabase/migrations/20260429000100_whitebox_release_governance.sql',
      'Schema stores whitebox release state, evaluations, and decisions.',
      'whitebox_release_evaluations',
      'Resolved-outcome evaluation needs durable tables, not transient logs.',
    ),
    buildRequirement(
      'supabase/migrations/20260501000100_ml_phase1_phase2_foundation.sql',
      'Schema stores calibration models, drift signals, and shadow predictions.',
      'calibration_models',
      'Calibration and drift artifacts need first-class database tables.',
    ),
    buildRequirement(
      'tests/ml-advisory.test.ts',
      'Unit tests cover prior-smoothed calibration and drift flags.',
      'uses a conservative Bayesian smoothing curve',
      'Scientific primitives need deterministic regression coverage.',
    ),
    buildRequirement(
      'supabase/functions/_shared/whitebox-release.test.ts',
      'Whitebox tests cover challenger promotion on resolved samples.',
      'recommends promotion when challenger beats champion',
      'Release-governance logic needs direct tests for promotion decisions.',
    ),
    buildRequirement(
      'scripts/build-calibration-ledger.mjs',
      'Resolved-outcome calibration ledger harness computes Brier metrics and reliability bins from approved exports.',
      'reliability_bins',
      'Commercial accuracy claims need a repeatable report path from resolved forecast exports to calibration evidence.',
    ),
  ]

  const evidenceGates = [
    {
      gate: 'resolved_outcome_sample',
      status: approvedLedger ? 'pass' : sampleLedger ? 'partial' : 'open',
      evidence: approvedLedger
        ? `${approvedLedger.path} is marked usable_with_caveats with max source sample size ${approvedLedger.max_source_sample_size}.`
        : sampleLedger
          ? `${sampleLedger.path} verifies the ledger mechanism as a sample fixture, but is not launch proof.`
          : 'No repo-local resolved-forecast sample ledger was found in docs/launch-readiness.',
      required_for_commercial_claim: true,
      fix: 'Generate a resolved forecast ledger with included/excluded question rules, sample size, Brier score, calibration status, and benchmark baseline.',
    },
    {
      gate: 'reliability_curve_or_bucket_report',
      status: approvedLedger?.has_reliability_bins ? 'pass' : sampleLedger?.has_reliability_bins ? 'partial' : 'open',
      evidence: approvedLedger?.has_reliability_bins
        ? `${approvedLedger.path} includes reliability bins from an approved export.`
        : sampleLedger?.has_reliability_bins
          ? `${sampleLedger.path} includes reliability bins for a sample fixture only.`
          : 'No reliability-curve or Brier bucket artifact found in docs/launch-readiness.',
      required_for_commercial_claim: true,
      fix: 'Add probability-bin reliability curves or equivalent calibration buckets for resolved binary forecasts.',
    },
    {
      gate: 'hosted_calibration_run',
      status: 'open',
      evidence: 'No hosted calibration-refresh, whitebox-scheduled, release-evaluation, or release-promotion smoke output is captured in this launch evidence set.',
      required_for_commercial_claim: true,
      fix: 'After owner-approved deploy and secrets, run hosted dry-run jobs and attach logs/screenshots without exposing credentials.',
    },
    {
      gate: 'benchmark_comparison',
      status: approvedBenchmark ? 'pass' : sampleBenchmark ? 'partial' : 'open',
      evidence: approvedBenchmark
        ? `${approvedBenchmark.path} compares an approved ledger against baseline forecasts.`
        : sampleBenchmark
          ? `${sampleBenchmark.path} verifies benchmark comparison mechanics with sample-only data.`
          : 'No comparison against human/community/baseline or ForecastBench-style dynamic benchmark is present.',
      required_for_commercial_claim: true,
      fix: 'Compare app forecasts against a trivial base rate, uncalibrated model, human/community baseline where available, and a published benchmark protocol.',
    },
    {
      gate: 'security_boundary_for_evaluation_tables',
      status: 'open',
      evidence: 'RLS static audit still reports relevant P1 findings for whitebox/shadow/forecast-adjacent tables.',
      required_for_commercial_claim: true,
      fix: 'Classify calibration/evaluation tables as public, authenticated, owner-bound, or service-only, then verify policies against hosted Supabase state.',
    },
  ]

  const rls = collectRlsCalibrationFindings()
  if (rls.status === 'no_relevant_p1_findings') {
    const securityGate = evidenceGates.find((gate) => gate.gate === 'security_boundary_for_evaluation_tables')
    securityGate.status = 'partial'
    securityGate.evidence = 'Static RLS audit did not find P1 findings on calibration/whitebox/shadow/drift/forecast tables, but hosted policy proof is still missing.'
  } else if (rls.status === 'not_available') {
    const securityGate = evidenceGates.find((gate) => gate.gate === 'security_boundary_for_evaluation_tables')
    securityGate.status = 'unknown'
    securityGate.evidence = 'RLS static audit JSON was not available for calibration-adjacent table classification.'
  }

  const passingRequirementCount = requirements.filter((item) => item.status === 'pass').length
  const failingRequirementCount = requirements.length - passingRequirementCount
  const openGateCount = evidenceGates.filter((gate) => gate.status === 'open' || gate.status === 'unknown').length

  const readinessScore = Math.max(
    1,
    Math.min(
      5,
      Math.floor((passingRequirementCount / requirements.length) * 3) + (openGateCount <= 2 ? 1 : 0),
    ),
  )

  const decision = openGateCount === 0 && failingRequirementCount === 0
    ? 'sellable-with-caveats'
    : 'pilot-only'

  return {
    schema_version: 1,
    generated_at: generatedAt,
    repo: {
      name: 'strategic-intelligence-platform',
      path: ROOT,
    },
    decision,
    summary: {
      readiness_score_1_to_5: readinessScore,
      code_primitives_present: passingRequirementCount,
      code_primitives_checked: requirements.length,
      failing_code_checks: failingRequirementCount,
      open_evidence_gates: openGateCount,
      confidence_statement: 'Calibration and whitebox-governance primitives are present, but world-class prediction accuracy is not commercially claimable until resolved-outcome ledgers, reliability curves, hosted dry-runs, security boundaries, and benchmark comparisons are attached.',
    },
    requirements,
    evidence_gates: evidenceGates,
    ledger_reports: ledgerReports,
    benchmark_reports: benchmarkReports,
    rls_calibration_findings: rls,
    best_practice_alignment: [
      {
        framework: 'ForecastBench / dynamic forecasting evaluation',
        alignment: 'partial',
        repo_evidence: 'Brier scoring, resolved outcome backfill, and challenger release evaluation exist.',
        missing: 'External benchmark protocol, model/human baseline comparison, and public resolved sample report.',
      },
      {
        framework: 'NIST AI RMF Measure and Manage',
        alignment: 'partial',
        repo_evidence: 'Calibration metrics, drift signals, and release decisions create monitoring primitives.',
        missing: 'Operational measurement report, incident thresholds, owner sign-off, and hosted monitoring proof.',
      },
      {
        framework: 'ISO/IEC 42001 continuous improvement',
        alignment: 'partial',
        repo_evidence: 'Governed promotion/hold decisions and shadow/challenger tables exist.',
        missing: 'Named AI management process, periodic review cadence, and externally reviewable records.',
      },
      {
        framework: 'OWASP GenAI / CISA secure-by-design expectations',
        alignment: 'not_ready',
        repo_evidence: 'Local dependency audit and unsafe eval hardening are complete in the launch evidence set.',
        missing: 'Tenant/object-boundary proof for evaluation data and hosted auth/RLS smoke checks.',
      },
    ],
    top_blockers: [
      'No approved resolved-outcome export ledger with enough samples for commercial accuracy claims.',
      'No approved reliability curve or probability-bin calibration report.',
      'No hosted dry-run proof for calibration refresh, whitebox scheduled backfill, release evaluation, or promotion hold.',
      'No approved benchmark comparison against real human/community/pro/external baselines.',
      'RLS and tenant-boundary proof for calibration/evaluation/shadow data remains unresolved.',
    ],
    recommended_next_actions: [
      'Add a local resolved-forecast calibration report generator that reads only sanitized/sample data or hosted exports approved by the owner.',
      'Use reliability bins and Brier decomposition before making any prediction-superiority claim.',
      'Keep market copy at "calibration-aware decision support" until the ledger shows enough resolved outcomes.',
      'Run hosted dry-runs only after secrets/deploy are owner-approved, and redact all credentials from evidence artifacts.',
      'Fold calibration-adjacent RLS tables into the owner-approved policy-hardening queue.',
    ],
  }
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  usage()
  process.exit(0)
}

const audit = buildAudit()
const outputPath = path.isAbsolute(args.output) ? args.output : path.join(ROOT, args.output)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(audit, null, 2)}\n`)

console.log(JSON.stringify({
  output: path.relative(ROOT, outputPath),
  decision: audit.decision,
  code_primitives_present: audit.summary.code_primitives_present,
  code_primitives_checked: audit.summary.code_primitives_checked,
  open_evidence_gates: audit.summary.open_evidence_gates,
}, null, 2))

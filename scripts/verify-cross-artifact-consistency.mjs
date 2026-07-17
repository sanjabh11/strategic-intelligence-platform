#!/usr/bin/env node

/**
 * Cross-artifact consistency verifier for the positioning audit.
 *
 * Catches drift that the v8 schema validator does not:
 *  - state experiment IDs differ from experiments.json
 *  - experiments_designed count differs from designed count in experiments.json
 *  - metadata references unknown experiment IDs
 *  - phase-9 metrics differ from provenance manifest
 *  - route-proof readiness contradicts underlying smoke JSON
 *  - state/manifest test count, lint warning, or timestamp drift
 *  - phase ledger completeness (phase-7/8/9 recorded if phase-9 artifact exists)
 *  - LTI status consistency (not "installed" when JWKS is placeholder)
 *  - dirty-path count drift between manifest and live worktree (warn-only)
 *  - route artifact date matches proof builder default date
 *  - no hypothesis promotion without completed experiment evidence
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const AUDIT_DIR = process.argv[2] || '.positioning-audit';
const ROOT = process.cwd();

function readJson(relPath) {
  const full = path.join(ROOT, relPath);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf-8'));
}

const failures = [];
const passes = [];
const warnings = [];

function check(name, condition, detail) {
  if (condition) {
    passes.push(name);
  } else {
    failures.push(`${name}: ${detail || 'failed'}`);
  }
}

function warn(name, condition, detail) {
  if (condition) {
    passes.push(name);
  } else {
    warnings.push(`${name}: ${detail || 'warning'}`);
  }
}

// 1. state experiment IDs match experiments.json
const state = readJson(`${AUDIT_DIR}/state.json`);
const experiments = readJson(`${AUDIT_DIR}/experiments.json`);

if (state && experiments) {
  const stateExpIds = new Set((state.experiments || []).map(e => e.experiment_id));
  const fileExpIds = new Set((experiments.experiments || []).map(e => e.experiment_id));

  check(
    'cross_artifact.state_experiment_ids_match',
    stateExpIds.size === fileExpIds.size && [...stateExpIds].every(id => fileExpIds.has(id)),
    `state has ${[...stateExpIds].join(',')} but experiments.json has ${[...fileExpIds].join(',')}`
  );

  // 2. experiments_designed count matches designed count
  const designedCount = (experiments.experiments || []).filter(e => e.status === 'designed').length;
  check(
    'cross_artifact.designed_count_match',
    state.experiments_designed === designedCount,
    `state.experiments_designed=${state.experiments_designed} but experiments.json has ${designedCount} designed`
  );
}

// 3. metadata references only valid experiment IDs
const meta = readJson(`${AUDIT_DIR}/experiment-metadata.json`);
if (meta && experiments) {
  const fileExpIds = new Set((experiments.experiments || []).map(e => e.experiment_id));
  const metaExpIds = new Set(Object.keys(meta.experiments || {}));
  const unknown = [...metaExpIds].filter(id => !fileExpIds.has(id));
  check(
    'cross_artifact.metadata_no_unknown_experiments',
    unknown.length === 0,
    `metadata references unknown experiment IDs: ${unknown.join(', ')}`
  );

  // Also check execution_order references
  const execOrder = meta.execution_order || [];
  const unknownInOrder = execOrder.filter(id => !fileExpIds.has(id));
  check(
    'cross_artifact.execution_order_valid',
    unknownInOrder.length === 0,
    `execution_order references unknown IDs: ${unknownInOrder.join(', ')}`
  );
}

// 4. phase-9 metrics consistent with the active provenance manifest
const manifest = readJson(`${AUDIT_DIR}/provenance-manifest.json`);
const pm005 = readJson(`${AUDIT_DIR}/provenance-manifest-pm005.json`);
if (pm005 && manifest) {
  check(
    'cross_artifact.active_manifest_is_pm005',
    manifest.manifest_id === 'PM-005' && JSON.stringify(manifest) === JSON.stringify(pm005),
    `active manifest=${manifest.manifest_id}; PM-005 mirror mismatch`
  );
}
const phase9Path = `${AUDIT_DIR}/artifacts/phase-9-decision-gate.md`;
if (manifest && existsSync(path.join(ROOT, phase9Path))) {
  const phase9 = readFileSync(path.join(ROOT, phase9Path), 'utf-8');
  const manifestDirty = manifest.dirty_path_count;
  const phase9MentionsFrozen = phase9.includes('FROZEN');
  const manifestFrozen = manifest.recovery_results?.hypothesis_status_changes?.includes('none');
  check(
    'cross_artifact.phase9_manifest_frozen_consistency',
    phase9MentionsFrozen && manifestFrozen,
    `phase-9 FROZEN=${phase9MentionsFrozen}, manifest hypothesis_status_changes=${manifest.recovery_results?.hypothesis_status_changes}`
  );
}

// 5. route-proof readiness vs smoke JSON
const proofDate = state?.last_updated?.slice(0, 10) || '2026-07-17';
const smokePath = `docs/launch-readiness/local-browser-route-smoke-${proofDate}.json`;
const smokeJson = readJson(smokePath);
if (smokeJson) {
  const ready = smokeJson.all_top_niche_routes_ready === true;
  const failedCount = smokeJson.failed_count || 0;
  check(
    'cross_artifact.route_smoke_ready_consistency',
    ready === (failedCount === 0),
    `all_top_niche_routes_ready=${ready} but failed_count=${failedCount}`
  );
}

// 6. state/manifest test count match
if (state && manifest) {
  const manifestTests = manifest.baseline_results?.pnpm_test;
  if (manifestTests) {
    const stateTestNotes = state.tool_health?.['pnpm-test']?.notes || '';
    const manifestPassed = manifestTests.passed;
    const stateMentionsCount = stateTestNotes.match(/(\d+)\s+passed/);
    const statePassed = stateMentionsCount ? parseInt(stateMentionsCount[1], 10) : null;
    check(
      'cross_artifact.state_manifest_test_count_match',
      statePassed === manifestPassed,
      `state.json pnpm-test notes say ${statePassed} passed but manifest says ${manifestPassed}`
    );
  }

  // 7. state/manifest lint warning match
  const manifestLint = manifest.baseline_results?.pnpm_lint;
  if (manifestLint) {
    const stateLintNotes = state.tool_health?.['pnpm-lint']?.notes || '';
    const manifestWarnings = manifestLint.warnings;
    const stateMentionsWarnings = stateLintNotes.match(/(\d+)\s+warnings/);
    const stateWarnings = stateMentionsWarnings ? parseInt(stateMentionsWarnings[1], 10) : null;
    check(
      'cross_artifact.state_manifest_lint_warning_match',
      stateWarnings === manifestWarnings,
      `state.json pnpm-lint notes say ${stateWarnings} warnings but manifest says ${manifestWarnings}`
    );
  }

  // 8. state timestamp freshness (within 48h of manifest created_at)
  const stateUpdated = state.last_updated;
  const manifestCreated = manifest.created_at;
  if (stateUpdated && manifestCreated) {
    const stateMs = new Date(stateUpdated).getTime();
    const manifestMs = new Date(manifestCreated).getTime();
    const diffHours = Math.abs(stateMs - manifestMs) / (1000 * 60 * 60);
    check(
      'cross_artifact.state_timestamp_freshness',
      diffHours <= 48,
      `state.json last_updated=${stateUpdated} is ${diffHours.toFixed(1)}h from manifest created_at=${manifestCreated} (threshold: 48h)`
    );
  }
}

// 9. phase ledger completeness — phase-7/8/9 in phases_completed if phase-9 artifact exists
if (state && existsSync(path.join(ROOT, phase9Path))) {
  const phasesCompleted = state.phases_completed || [];
  const requiredPhases = ['phase-7', 'phase-8', 'phase-9'];
  const missing = requiredPhases.filter(p => !phasesCompleted.includes(p));
  check(
    'cross_artifact.phase_ledger_completeness',
    missing.length === 0,
    `phases_completed is missing: ${missing.join(', ')} but phase-9-decision-gate.md exists`
  );
}

// 10. LTI status consistency — must be "unavailable" (not "installed" or "blocked_partial") if JWKS is placeholder
if (state) {
  const ltiStatus = state.tool_health?.['lti-launch']?.status || '';
  const ltiNotes = state.tool_health?.['lti-launch']?.notes || '';
  const mentionsPlaceholder = ltiNotes.toLowerCase().includes('placeholder') || ltiNotes.toLowerCase().includes('not production-verified');
  const invalidStatuses = ['installed', 'blocked_partial', 'healthy'];
  check(
    'cross_artifact.lti_status_consistency',
    !(mentionsPlaceholder && invalidStatuses.includes(ltiStatus)),
    `lti-launch status is "${ltiStatus}" but notes mention placeholder/not production-verified — must be "unavailable"`
  );
}

// 11. dirty-path count must equal the live worktree after final manifest generation
if (manifest) {
  const manifestDirtyCount = manifest.recovery_results?.dirty_path_count;
  if (manifestDirtyCount !== undefined) {
    const gitStatus = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    const liveDirtyCount = gitStatus.status === 0
      ? gitStatus.stdout.split('\n').filter(Boolean).length
      : null;
    check(
      'cross_artifact.dirty_path_drift',
      liveDirtyCount !== null && manifestDirtyCount === liveDirtyCount,
      `manifest dirty_path_count=${manifestDirtyCount}, live=${liveDirtyCount}`
    );
  }
}

// 12. route artifact date match — explicit proof_date must match the selected artifact
if (smokeJson) {
  check(
    'cross_artifact.route_artifact_date_match',
    (smokeJson.proof_date || (smokeJson.generated_at || '').slice(0, 10)) === proofDate,
    `route smoke proof date ${smokeJson.proof_date || smokeJson.generated_at} does not match ${proofDate}`
  );
}

// 13. hypothesis no promotion without experiments
if (state && experiments) {
  const experimentsExecuted = state.experiments_executed || 0;
  const allUnresolved = (state.hypotheses || []).every(h => h.status === 'unresolved');
  check(
    'cross_artifact.hypothesis_no_promotion_without_experiments',
    experimentsExecuted > 0 || allUnresolved,
    `experiments_executed=${experimentsExecuted} but not all hypotheses are unresolved — someone may have been promoted without experiment evidence`
  );
}

// 14. confidence label present (disambiguate implementation vs market confidence)
if (state) {
  const dc = state.decision_confidence || {};
  const hasLabel = dc.confidence_label !== undefined;
  const hasMarketConf = dc.market_validation_confidence !== undefined;
  const hasHostedReadiness = dc.hosted_readiness !== undefined;
  check(
    'cross_artifact.confidence_dimensions_separated',
    hasLabel && hasMarketConf && hasHostedReadiness,
    `state.json decision_confidence missing separated dimensions: confidence_label=${hasLabel}, market_validation_confidence=${hasMarketConf}, hosted_readiness=${hasHostedReadiness}`
  );
}

// 15-18. Design-only casebook contract and source-pack consistency
const casebook = readJson(`${AUDIT_DIR}/experiment-casebook-2026-07-17.json`);
const sourcePack = readJson(`${AUDIT_DIR}/comparative-5plus5-discovery-pack-2026-07-17.json`);
const hypothesesDoc = readJson(`${AUDIT_DIR}/hypotheses.json`);
if (casebook && sourcePack && experiments && state) {
  const cases = casebook.cases || [];
  const expected = {
    education: { experiment_id: 'EXP-007', hypothesis_id: 'H-EDU-4' },
    enterprise: { experiment_id: 'EXP-008', hypothesis_id: 'H-ENT-0' },
  };
  check(
    'cross_artifact.casebook_exact_5plus5_design_only',
    cases.length === 10
      && cases.filter((entry) => entry.lane === 'education').length === 5
      && cases.filter((entry) => entry.lane === 'enterprise').length === 5
      && cases.every((entry) => entry.status === 'designed_not_executed' && entry.contact_status === 'not_contacted'),
    'casebook must contain exactly five design-only, not-contacted cases per lane'
  );
  check(
    'cross_artifact.casebook_experiment_hypothesis_mapping',
    cases.every((entry) => entry.experiment_id === expected[entry.lane]?.experiment_id
      && entry.hypothesis_id === expected[entry.lane]?.hypothesis_id),
    'EXP-007 must map to education/H-EDU-4 and EXP-008 to enterprise/H-ENT-0'
  );
  const sourceTargets = new Set((sourcePack.targets || []).map((entry) => `${entry.lane}:${entry.organization}`));
  check(
    'cross_artifact.casebook_targets_match_source_pack',
    cases.every((entry) => sourceTargets.has(`${entry.lane}:${entry.target_organization}`)),
    'casebook contains a target not present in the source 5+5 pack'
  );
  check(
    'cross_artifact.casebook_preserves_validation_freeze',
    state.experiments_executed === 0
      && (experiments.experiments || []).every((entry) => entry.status === 'designed' && entry.hypothesis_transition === 'unresolved')
      && (hypothesesDoc?.hypotheses || []).every((entry) => entry.status === 'unresolved'),
    'casebook design must not execute experiments or transition hypotheses'
  );
}

// Output
console.log('============================================================');
console.log('Cross-Artifact Consistency Verifier');
console.log('============================================================');
for (const p of passes) {
  console.log(`  [PASS] ${p}`);
}
for (const w of warnings) {
  console.log(`  [WARN] ${w}`);
}
for (const f of failures) {
  console.log(`  [FAIL] ${f}`);
}

if (failures.length > 0) {
  console.log(`\nFAILED: ${failures.join(', ')}`);
  process.exit(1);
} else {
  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length} (non-blocking)`);
  }
  console.log('\nALL CROSS-ARTIFACT CHECKS PASSED');
  process.exit(0);
}

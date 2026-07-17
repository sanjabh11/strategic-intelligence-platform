#!/usr/bin/env node

/**
 * Repository-specific v8 audit invariant validator.
 * This complements, but does not replace, the pinned canonical JSON Schema gate.
 *
 * Usage: node scripts/validate-audit-v8.mjs [.positioning-audit]
 */

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const AUDIT_DIR = process.argv[2] || '.positioning-audit';
const ROOT = process.cwd();

const failures = [];
const passes = [];

function check(name, condition, detail) {
  if (condition) {
    passes.push(name);
  } else {
    failures.push(`${name}: ${detail || 'failed'}`);
  }
}

function readJson(relPath) {
  const full = path.join(ROOT, relPath);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, 'utf-8'));
}

// ─── Load state.json ───
const state = readJson(`${AUDIT_DIR}/state.json`);
if (!state) {
  console.error(`FATAL: Cannot read ${AUDIT_DIR}/state.json`);
  process.exit(1);
}

// ─── Schema version ───
check('schema.version', state.schema_version === 'v8', `schema_version is "${state.schema_version}", expected "v8"`);

// ─── Required top-level fields ───
const requiredFields = [
  'audit_id', 'product', 'scope', 'started_at', 'current_phase',
  'current_gate', 'evidence_limited_mode', 'analysis_status',
  'market_validation_status', 'experiments_designed', 'experiments_executed',
  'decision_confidence', 'hypotheses', 'experiments', 'evidence_types_present',
  'evidence_types_missing', 'evidence_limitations', 'phases_completed',
  'gates_passed', 'gaps', 'tool_health', 'drift_status', 'last_updated',
  'schema_version'
];
for (const field of requiredFields) {
  check(`required.${field}`, state[field] !== undefined, `missing required field: ${field}`);
}

// ─── Enum: current_phase ───
const validPhases = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7', 'VALIDATION_PENDING', 'completed'];
check('enum.current_phase', validPhases.includes(state.current_phase), `current_phase is "${state.current_phase}", expected one of: ${validPhases.join(', ')}`);

// ─── Enum: current_gate ───
const validGates = ['GO', 'CONDITIONAL_GO', 'RECYCLE', 'STOP'];
check('enum.current_gate', validGates.includes(state.current_gate), `current_gate is "${state.current_gate}", expected one of: ${validGates.join(', ')}`);

// ─── Enum: analysis_status ───
const validAnalysisStatus = ['in_progress', 'complete'];
check('enum.analysis_status', validAnalysisStatus.includes(state.analysis_status), `analysis_status is "${state.analysis_status}"`);

// ─── Enum: market_validation_status ───
const validMarketStatus = ['not_started', 'validation_pending', 'in_progress', 'validated', 'invalidated'];
check('enum.market_validation_status', validMarketStatus.includes(state.market_validation_status), `market_validation_status is "${state.market_validation_status}"`);

// ─── Enum: drift_status ───
const validDriftStatus = ['stable', 'drifting', 'stale', 'not_assessed'];
check('enum.drift_status', validDriftStatus.includes(state.drift_status), `drift_status is "${state.drift_status}"`);

// ─── Boolean: evidence_limited_mode ───
check('type.evidence_limited_mode', typeof state.evidence_limited_mode === 'boolean', `evidence_limited_mode is ${typeof state.evidence_limited_mode}, expected boolean`);

// ─── Number: experiments_designed, experiments_executed ───
check('type.experiments_designed', typeof state.experiments_designed === 'number', `experiments_designed is ${typeof state.experiments_designed}`);
check('type.experiments_executed', typeof state.experiments_executed === 'number', `experiments_executed is ${typeof state.experiments_executed}`);

// ─── Constraint: experiments_executed must be 0 when market_validation_status is validation_pending ───
check('constraint.no_executions_while_pending',
  state.market_validation_status !== 'validation_pending' || state.experiments_executed === 0,
  `experiments_executed is ${state.experiments_executed} but market_validation_status is "validation_pending"`
);

// ─── Constraint: completed_at must be null when VALIDATION_PENDING ───
check('constraint.completed_at_null_while_pending',
  state.current_phase !== 'VALIDATION_PENDING' || state.completed_at === null,
  `completed_at is "${state.completed_at}" but current_phase is "VALIDATION_PENDING"`
);

// ─── Decision confidence schema ───
const dc = state.decision_confidence || {};
const dcFields = ['composite', 'implementation_confidence', 'evidence_coverage', 'market_validation_confidence', 'hosted_readiness', 'confidence_label'];
for (const f of dcFields) {
  check(`decision_confidence.${f}`, dc[f] !== undefined, `missing decision_confidence.${f}`);
}
check('decision_confidence.confidence_label_type', typeof dc.confidence_label === 'string', `confidence_label is ${typeof dc.confidence_label}`);
check('decision_confidence.market_validation_zero',
  dc.market_validation_confidence === 0,
  `market_validation_confidence is ${dc.market_validation_confidence}, expected 0 (no market evidence)`
);
check('decision_confidence.hosted_readiness_zero',
  dc.hosted_readiness === 0,
  `hosted_readiness is ${dc.hosted_readiness}, expected 0 (no hosted proof)`
);

// ─── Hypotheses schema ───
const hypotheses = state.hypotheses || [];
check('hypotheses.nonempty', hypotheses.length > 0, 'no hypotheses found');
const validHypStatuses = ['unresolved', 'supported', 'refuted', 'inconclusive'];
for (const h of hypotheses) {
  check(`hypothesis.${h.id}.has_id`, typeof h.id === 'string' && h.id.length > 0, `hypothesis missing id`);
  check(`hypothesis.${h.id}.has_text`, typeof h.text === 'string' && h.text.length > 0, `hypothesis ${h.id} missing text`);
  check(`hypothesis.${h.id}.status_enum`, validHypStatuses.includes(h.status), `hypothesis ${h.id} status is "${h.status}"`);
  check(`hypothesis.${h.id}.evidence_array`, Array.isArray(h.evidence), `hypothesis ${h.id} evidence is not an array`);
  check(`hypothesis.${h.id}.load_bearing_claims_array`, Array.isArray(h.load_bearing_claims), `hypothesis ${h.id} load_bearing_claims is not an array`);
}

// ─── Constraint: all hypotheses must be unresolved when VALIDATION_PENDING ───
if (state.current_phase === 'VALIDATION_PENDING') {
  const nonUnresolved = hypotheses.filter(h => h.status !== 'unresolved');
  check('constraint.all_hypotheses_unresolved',
    nonUnresolved.length === 0,
    `${nonUnresolved.length} hypotheses are not "unresolved": ${nonUnresolved.map(h => h.id).join(', ')}`
  );
}

// ─── Experiments schema ───
const experiments = state.experiments || [];
check('experiments.count_matches_designed',
  experiments.length === state.experiments_designed,
  `experiments array length (${experiments.length}) != experiments_designed (${state.experiments_designed})`
);
const validExpStatuses = ['designed', 'executing', 'completed', 'failed', 'cancelled'];
const validTransitions = ['unresolved', 'supported', 'refuted', 'inconclusive'];
for (const exp of experiments) {
  check(`experiment.${exp.experiment_id}.has_id`, typeof exp.experiment_id === 'string', `experiment missing experiment_id`);
  check(`experiment.${exp.experiment_id}.has_hypothesis_id`, typeof exp.hypothesis_id === 'string', `experiment ${exp.experiment_id} missing hypothesis_id`);
  check(`experiment.${exp.experiment_id}.status_enum`, validExpStatuses.includes(exp.status), `experiment ${exp.experiment_id} status is "${exp.status}"`);
  check(`experiment.${exp.experiment_id}.transition_enum`, validTransitions.includes(exp.hypothesis_transition), `experiment ${exp.experiment_id} hypothesis_transition is "${exp.hypothesis_transition}"`);
}

// ─── Constraint: all experiments must be "designed" when experiments_executed is 0 ───
if (state.experiments_executed === 0) {
  const nonDesigned = experiments.filter(e => e.status !== 'designed');
  check('constraint.all_experiments_designed_when_zero_executed',
    nonDesigned.length === 0,
    `${nonDesigned.length} experiments are not "designed": ${nonDesigned.map(e => e.experiment_id).join(', ')}`
  );
}

// ─── Constraint: all hypothesis_transitions must be "unresolved" when VALIDATION_PENDING ───
if (state.current_phase === 'VALIDATION_PENDING') {
  const nonUnresolvedTransitions = experiments.filter(e => e.hypothesis_transition !== 'unresolved');
  check('constraint.all_transitions_unresolved_while_pending',
    nonUnresolvedTransitions.length === 0,
    `${nonUnresolvedTransitions.length} experiments have non-unresolved transitions: ${nonUnresolvedTransitions.map(e => e.experiment_id).join(', ')}`
  );
}

// ─── Evidence types ───
check('evidence_types_present.array', Array.isArray(state.evidence_types_present), 'evidence_types_present is not an array');
check('evidence_types_missing.array', Array.isArray(state.evidence_types_missing), 'evidence_types_missing is not an array');
check('evidence_limitations.array', Array.isArray(state.evidence_limitations), 'evidence_limitations is not an array');

// ─── Phases completed ───
check('phases_completed.array', Array.isArray(state.phases_completed), 'phases_completed is not an array');
const requiredPhases = ['phase-0', 'phase-1', 'phase-2', 'phase-3', 'phase-4', 'phase-5', 'phase-6', 'phase-7', 'phase-8', 'phase-9'];
const missingPhases = requiredPhases.filter(p => !state.phases_completed.includes(p));
check('phases_completed.all_required', missingPhases.length === 0, `missing phases: ${missingPhases.join(', ')}`);

// ─── Gates passed ───
check('gates_passed.array', Array.isArray(state.gates_passed), 'gates_passed is not an array');
const validGateDecisions = ['CONDITIONAL_GO', 'GO', 'NO_GO', 'BLOCKED'];
for (const g of state.gates_passed || []) {
  check(`gate.${g.gate}.decision_enum`, validGateDecisions.includes(g.decision), `gate ${g.gate} decision is "${g.decision}"`);
}

// ─── Gaps ───
const gaps = state.gaps || {};
check('gaps.has_critical', typeof gaps.critical === 'number', 'gaps.critical is not a number');
check('gaps.has_major', typeof gaps.major === 'number', 'gaps.major is not a number');

// ─── Tool health schema ───
const toolHealth = state.tool_health || {};
const validToolStatuses = ['healthy', 'unavailable', 'degraded', 'blocked', 'not_implemented'];
for (const [key, val] of Object.entries(toolHealth)) {
  check(`tool_health.${key}.status_enum`,
    validToolStatuses.includes(val.status),
    `tool_health.${key}.status is "${val.status}", expected one of: ${validToolStatuses.join(', ')}`
  );
  check(`tool_health.${key}.has_checked_at`, typeof val.checked_at === 'string', `tool_health.${key} missing checked_at`);
  check(`tool_health.${key}.has_notes`, typeof val.notes === 'string', `tool_health.${key} missing notes`);
}

// ─── Constraint: lti-launch.status must not be "healthy" or "blocked_partial" when notes mention placeholder ───
const lti = toolHealth['lti-launch'];
if (lti) {
  const mentionsPlaceholder = lti.notes.toLowerCase().includes('placeholder') || lti.notes.toLowerCase().includes('not production-verified');
  check('constraint.lti_not_healthy_with_placeholder',
    !(mentionsPlaceholder && (lti.status === 'healthy' || lti.status === 'blocked_partial' || lti.status === 'not_implemented')),
    `lti-launch.status is "${lti.status}" but notes mention placeholder — must be "unavailable" or "degraded"`
  );
}

// ─── Constraint: no "blocked_partial" status anywhere in tool_health (not a valid enum) ───
for (const [key, val] of Object.entries(toolHealth)) {
  check(`tool_health.${key}.no_blocked_partial`,
    val.status !== 'blocked_partial',
    `tool_health.${key}.status is "blocked_partial" — not a valid v8 enum value`
  );
}

// ─── Timestamp format ───
check('last_updated.format', typeof state.last_updated === 'string' && state.last_updated.length > 0, 'last_updated is missing or empty');
check('started_at.format', typeof state.started_at === 'string' && state.started_at.length > 0, 'started_at is missing or empty');

// ─── Experiment-hypothesis cross-reference ───
const hypIds = new Set(hypotheses.map(h => h.id));
for (const exp of experiments) {
  check(`experiment.${exp.experiment_id}.hypothesis_exists`,
    hypIds.has(exp.hypothesis_id),
    `experiment ${exp.experiment_id} references unknown hypothesis ${exp.hypothesis_id}`
  );
}

// ─── Evidence bundle semantics: check for forbidden root fields ───
const evidenceCorpus = readJson(`${AUDIT_DIR}/evidence-corpus.json`);
if (evidenceCorpus) {
  const forbiddenRootFields = ['customer_outcome', 'user_quote', 'behavioral_observation', 'sales_data', 'pricing_signal'];
  for (const field of forbiddenRootFields) {
    check(`evidence_corpus.no_${field}`,
      !evidenceCorpus[field] || (Array.isArray(evidenceCorpus[field]) && evidenceCorpus[field].length === 0),
      `evidence-corpus.json contains forbidden root field: ${field}`
    );
  }
}

// ─── Summary ───
console.log('============================================================');
console.log('Repository Audit Invariant Validator');
console.log('============================================================');
console.log(`  Schema: v8`);
console.log(`  Audit ID: ${state.audit_id || 'unknown'}`);
console.log(`  Checks passed: ${passes.length}`);
console.log(`  Checks failed: ${failures.length}`);
console.log('');

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(`  [FAIL] ${f}`);
  }
  console.log('');
  console.log('REPOSITORY INVARIANTS FAILED');
  process.exit(1);
} else {
  console.log('ALL REPOSITORY INVARIANTS PASSED');
  process.exit(0);
}

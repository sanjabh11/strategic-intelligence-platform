#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();
const DEFAULT_PROJECT_REF = 'jxdihzqoaxtydolmltdr';
const DEFAULT_ENV_FILE = '.env';
const DEFAULT_EVIDENCE = 'docs/launch-readiness/launch-evidence-2026-06-06.json';
const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/hosted-access-preflight-validation-checklist-2026-06-06.csv';
const DEFAULT_SUPABASE_PACKAGE = 'supabase@2.105.0';
const DEFAULT_TIMEOUT_MS = 30000;

const CORE_ENV_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const PROVIDER_ENV_KEYS = [
  'OPENAI_API_KEY',
  'XAI_API_KEY',
  'GROK_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'VITE_GEMINI_API_KEY'
];

const STRIPE_PROOF_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_ACADEMIC_PRICE_ID',
  'APP_URL'
];

const RUNTIME_FUNCTION_PROBES = [
  { function_name: 'health', method: 'GET', path: '/functions/v1/health', required_for: 'runtime_health' },
  { function_name: 'question-intake', method: 'OPTIONS', path: '/functions/v1/question-intake', required_for: 'question_routing' },
  { function_name: 'analyze-engine', method: 'OPTIONS', path: '/functions/v1/analyze-engine', required_for: 'forecast_analysis' },
  { function_name: 'multi-agent-forecast', method: 'OPTIONS', path: '/functions/v1/multi-agent-forecast', required_for: 'forecast_consensus' },
  { function_name: 'brier-weighted-consensus', method: 'OPTIONS', path: '/functions/v1/brier-weighted-consensus', required_for: 'forecast_registry_consensus' }
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
    'Usage: node scripts/validate-hosted-access-preflight.mjs',
    `  [--project-ref ${DEFAULT_PROJECT_REF}]`,
    `  [--env-file ${DEFAULT_ENV_FILE}]`,
    `  [--supabase-package ${DEFAULT_SUPABASE_PACKAGE}]`,
    `  [--timeout-ms ${DEFAULT_TIMEOUT_MS}]`,
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

const input = {
  projectRef: argValue('--project-ref', process.env.SUPABASE_PROJECT_REF || DEFAULT_PROJECT_REF),
  envFile: argValue('--env-file', DEFAULT_ENV_FILE),
  supabasePackage: argValue('--supabase-package', DEFAULT_SUPABASE_PACKAGE),
  timeoutMs: Number(argValue('--timeout-ms', DEFAULT_TIMEOUT_MS)),
  evidence: argValue('--evidence', DEFAULT_EVIDENCE)
};

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

const updateEvidence = hasFlag('--update-evidence');

if (!Number.isInteger(input.timeoutMs) || input.timeoutMs < 1000) {
  console.error('--timeout-ms must be an integer >= 1000.');
  process.exit(2);
}

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function writeArtifact(relativePath, contents) {
  const absolutePath = resolveRepoPath(relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function readJsonIfExists(relativePath, fallback) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? JSON.parse(readFileSync(absolutePath, 'utf8')) : fallback;
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

function parseEnvFile(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  if (!existsSync(absolutePath)) return {};
  const parsed = {};
  for (const rawLine of readFileSync(absolutePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('export ')) continue;
    const equalsIndex = line.indexOf('=');
    if (equalsIndex <= 0) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

function hasEnvValue(env, key) {
  return String(env[key] ?? '').trim().length > 0;
}

function commandOnPath(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 5000
  });
  return result.status === 0 && result.stdout.trim();
}

function stripAnsi(text) {
  return String(text ?? '').replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
}

function sanitizeOutput(text) {
  return stripAnsi(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, 'Bearer [redacted]')
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[redacted-jwt]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, '[redacted-key]');
}

function classifyAccess(result) {
  const combined = sanitizeOutput(`${result.stdout}\n${result.stderr}`).toLowerCase();
  if (result.timedOut) return 'timeout';
  if (result.status === 0) return 'visible';
  if (combined.includes('403') || combined.includes('necessary privileges')) return 'access_denied_403';
  if (combined.includes('not logged in') || combined.includes('login')) return 'not_authenticated';
  if (combined.includes('not found')) return 'not_found';
  return 'error';
}

function runCommand(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    timeout: input.timeoutMs,
    maxBuffer: 1024 * 1024
  });
  return {
    status: result.status,
    signal: result.signal,
    timedOut: result.error?.code === 'ETIMEDOUT',
    stdout: sanitizeOutput(result.stdout),
    stderr: sanitizeOutput(result.stderr)
  };
}

function runtimeHostFromEnv(env) {
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  try {
    return {
      supabaseUrl,
      runtimeHost: new URL(supabaseUrl).host
    };
  } catch {
    return {
      supabaseUrl,
      runtimeHost: ''
    };
  }
}

async function probeRuntimeFunction(env, probe) {
  const { supabaseUrl, runtimeHost } = runtimeHostFromEnv(env);
  if (!supabaseUrl || !runtimeHost) {
    return {
      status: 'missing_or_invalid_url',
      function_name: probe.function_name,
      method: probe.method,
      runtime_host: runtimeHost,
      url_path: probe.path,
      http_status: null,
      error_code: null,
      load_error_code: null,
      required_for: probe.required_for
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(input.timeoutMs, 15000));
  const probeUrl = `${supabaseUrl.replace(/\/$/, '')}${probe.path}`;
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    const authKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (authKey) {
      headers.Authorization = `Bearer ${authKey}`;
      headers.apikey = authKey;
    }
    const response = await fetch(probeUrl, {
      method: probe.method,
      headers,
      signal: controller.signal
    });
    const text = await response.text().catch(() => '');
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    const loadErrorCode = payload?.code === 'LOAD_FUNCTION_ERROR' ? payload.code : null;
    const status = response.ok
      ? 'load_ok'
      : loadErrorCode
        ? 'load_error'
        : `reachable_http_${response.status}`;
    return {
      status,
      function_name: probe.function_name,
      method: probe.method,
      runtime_host: runtimeHost,
      url_path: probe.path,
      http_status: response.status,
      error_code: null,
      load_error_code: loadErrorCode,
      required_for: probe.required_for
    };
  } catch (error) {
    const errorCode = error?.cause?.code || error?.name || 'fetch_error';
    return {
      status: errorCode === 'AbortError' ? 'timeout' : 'unreachable',
      function_name: probe.function_name,
      method: probe.method,
      runtime_host: runtimeHost,
      url_path: probe.path,
      http_status: null,
      error_code: errorCode,
      load_error_code: null,
      required_for: probe.required_for
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeRuntimeFunctions(env) {
  const probes = [];
  for (const probe of RUNTIME_FUNCTION_PROBES) {
    probes.push(await probeRuntimeFunction(env, probe));
  }
  return probes;
}

async function probeRuntimeHealth(env) {
  const healthProbe = await probeRuntimeFunction(env, RUNTIME_FUNCTION_PROBES[0]);
  return {
    status: healthProbe.status === 'load_ok' ? 'reachable_ok' : healthProbe.status,
    runtime_host: healthProbe.runtime_host,
    health_url_path: healthProbe.url_path,
    http_status: healthProbe.http_status,
    error_code: healthProbe.error_code,
    load_error_code: healthProbe.load_error_code
  };
}

const envFileValues = parseEnvFile(input.envFile);
const commandEnv = {
  ...process.env,
  ...envFileValues,
  PATH: `${process.env.HOME}/.nvm/versions/node/v20.19.5/bin:${process.env.PATH ?? ''}`
};

if (commandEnv.SUPABASE_USE_ENV_TOKEN !== 'true') {
  delete commandEnv.SUPABASE_ACCESS_TOKEN;
}

const globalSupabasePath = commandOnPath('supabase');
const npmAvailable = Boolean(commandOnPath('npm'));
const supabaseCommand = globalSupabasePath
  ? {
      source: 'global_supabase',
      command: 'supabase',
      argsPrefix: []
    }
  : npmAvailable
    ? {
        source: `npm_exec_${input.supabasePackage}`,
        command: 'npm',
        argsPrefix: ['exec', '--yes', '--package', input.supabasePackage, '--', 'supabase']
      }
    : null;

const missingCoreEnvKeys = CORE_ENV_KEYS.filter((key) => !hasEnvValue(commandEnv, key));
const missingProviderKeys = PROVIDER_ENV_KEYS.filter((key) => !hasEnvValue(commandEnv, key));
const missingStripeProofKeys = STRIPE_PROOF_KEYS.filter((key) => !hasEnvValue(commandEnv, key));

const commandResults = {
  version: supabaseCommand ? runCommand(supabaseCommand.command, [...supabaseCommand.argsPrefix, '--version'], commandEnv) : null,
  projectsList: supabaseCommand ? runCommand(supabaseCommand.command, [...supabaseCommand.argsPrefix, 'projects', 'list'], commandEnv) : null,
  functionsList: supabaseCommand ? runCommand(supabaseCommand.command, [...supabaseCommand.argsPrefix, 'functions', 'list', '--project-ref', input.projectRef], commandEnv) : null,
  secretsList: supabaseCommand ? runCommand(supabaseCommand.command, [...supabaseCommand.argsPrefix, 'secrets', 'list', '--project-ref', input.projectRef], commandEnv) : null
};
const runtimeHealth = await probeRuntimeHealth(commandEnv);
const runtimeFunctionProbes = await probeRuntimeFunctions(commandEnv);

const versionText = commandResults.version?.status === 0
  ? stripAnsi(commandResults.version.stdout).trim().split(/\s+/).at(-1) ?? 'unknown'
  : 'unknown';
const projectsText = commandResults.projectsList ? `${commandResults.projectsList.stdout}\n${commandResults.projectsList.stderr}` : '';
const listedProjectRefs = [...new Set(stripAnsi(projectsText).match(/\b[a-z]{20}\b/g) ?? [])];
const targetProjectVisible = listedProjectRefs.includes(input.projectRef);
const functionsAccess = commandResults.functionsList ? classifyAccess(commandResults.functionsList) : 'cli_unavailable';
const secretsAccess = commandResults.secretsList ? classifyAccess(commandResults.secretsList) : 'cli_unavailable';
const projectsAccess = commandResults.projectsList ? classifyAccess(commandResults.projectsList) : 'cli_unavailable';
const coreEnvPresent = missingCoreEnvKeys.length === 0;
const providerKeyPresent = missingProviderKeys.length < PROVIDER_ENV_KEYS.length;
const stripeProofReady = missingStripeProofKeys.length === 0;
const managementAccessReady = functionsAccess === 'visible' && secretsAccess === 'visible';
const runtimeHealthReachable = String(runtimeHealth.status).startsWith('reachable_');
const forecastRuntimeProbeNames = new Set(['analyze-engine', 'multi-agent-forecast']);
const forecastRuntimeFunctionsLoad = runtimeFunctionProbes
  .filter((probe) => forecastRuntimeProbeNames.has(probe.function_name))
  .every((probe) => probe.status === 'load_ok');
const failedRuntimeFunctionProbes = runtimeFunctionProbes.filter((probe) => probe.status !== 'load_ok');
const hostedAccessReady = Boolean(supabaseCommand)
  && coreEnvPresent
  && providerKeyPresent
  && managementAccessReady
  && runtimeHealthReachable
  && forecastRuntimeFunctionsLoad;

const status = !supabaseCommand
  ? 'hosted_access_preflight_blocked_cli_unavailable'
  : !coreEnvPresent
    ? 'hosted_access_preflight_blocked_missing_core_env'
    : !managementAccessReady
      ? 'hosted_access_preflight_blocked_project_privileges'
      : !runtimeHealthReachable
        ? 'hosted_access_preflight_blocked_runtime_unreachable'
        : !forecastRuntimeFunctionsLoad
          ? 'hosted_access_preflight_blocked_forecast_runtime_function_load'
          : !stripeProofReady
            ? 'hosted_access_preflight_partial_payment_proof_missing'
            : 'hosted_access_preflight_ready_not_hosted_demo_proof';

const acceptanceGates = [
  {
    gate: 'supabase_cli_available',
    status: supabaseCommand ? 'passed' : 'blocked',
    proof_bucket: 'local',
    evidence: supabaseCommand ? `Supabase CLI source ${supabaseCommand.source}; version ${versionText}.` : 'No global supabase and npm fallback unavailable.',
    next_action: supabaseCommand ? 'No CLI install action needed for access preflight.' : 'Install Supabase CLI or make npm exec available.'
  },
  {
    gate: 'core_hosted_env_present',
    status: coreEnvPresent ? 'passed' : 'blocked',
    proof_bucket: 'local',
    evidence: missingCoreEnvKeys.length === 0 ? 'All required core hosted env keys are present by name.' : `Missing ${missingCoreEnvKeys.join(', ')}.`,
    next_action: coreEnvPresent ? 'Keep values redacted; do not store secrets in artifacts.' : 'Provide redacted env manifest and local env values.'
  },
  {
    gate: 'strategist_provider_key_present',
    status: providerKeyPresent ? 'passed' : 'blocked',
    proof_bucket: 'local',
    evidence: providerKeyPresent ? 'At least one strategist provider key is present by name.' : `Missing all provider key options: ${PROVIDER_ENV_KEYS.join(', ')}.`,
    next_action: providerKeyPresent ? 'Run hosted strategist smoke only after owner approval.' : 'Provide one owner-approved strategist provider key.'
  },
  {
    gate: 'project_visibility_checked',
    status: projectsAccess === 'visible' ? 'passed' : 'blocked',
    proof_bucket: 'hosted_live_access_check',
    evidence: `projects list access=${projectsAccess}; listed_project_count=${listedProjectRefs.length}; target_project_visible=${targetProjectVisible}.`,
    next_action: targetProjectVisible ? 'Proceed to project-scoped function/secret access checks.' : 'Confirm project ref or grant access to the intended Supabase project.'
  },
  {
    gate: 'function_management_access',
    status: functionsAccess === 'visible' ? 'passed' : 'blocked',
    proof_bucket: 'hosted_live_access_check',
    evidence: `functions list access=${functionsAccess}.`,
    next_action: functionsAccess === 'visible' ? 'Proceed to hosted function drift proof.' : 'Grant Supabase function-management visibility for the target project or correct the project ref.'
  },
  {
    gate: 'secret_management_access',
    status: secretsAccess === 'visible' ? 'passed' : 'blocked',
    proof_bucket: 'hosted_live_access_check',
    evidence: `secrets list access=${secretsAccess}.`,
    next_action: secretsAccess === 'visible' ? 'Proceed to redacted secret manifest and hosted smoke.' : 'Grant secret-management visibility for the target project or use an owner-generated redacted manifest.'
  },
  {
    gate: 'hosted_runtime_health_reachable',
    status: runtimeHealthReachable ? 'passed' : 'blocked',
    proof_bucket: 'hosted_live_access_check',
    evidence: `runtime_host=${runtimeHealth.runtime_host || 'missing'}; health_path=${runtimeHealth.health_url_path || 'missing'}; runtime_status=${runtimeHealth.status}; http_status=${runtimeHealth.http_status ?? 'n/a'}; error_code=${runtimeHealth.error_code ?? 'n/a'}.`,
    next_action: runtimeHealthReachable ? 'Proceed to hosted function smoke after management access is also ready.' : 'Correct the Supabase URL/project ref or restore DNS/runtime reachability for the hosted project.'
  },
  {
    gate: 'forecast_runtime_functions_load',
    status: forecastRuntimeFunctionsLoad ? 'passed' : 'blocked',
    proof_bucket: 'hosted_live_access_check',
    evidence: failedRuntimeFunctionProbes.length === 0
      ? 'All probed runtime functions loaded via read-only OPTIONS/GET checks.'
      : `Failed probes: ${failedRuntimeFunctionProbes.map((probe) => `${probe.function_name}:${probe.status}:${probe.http_status ?? 'n/a'}:${probe.load_error_code ?? probe.error_code ?? 'n/a'}`).join('; ')}.`,
    next_action: forecastRuntimeFunctionsLoad ? 'Proceed to hosted forecast freeze.' : 'Redeploy or repair the failing Supabase edge function bundle before claiming hosted prediction readiness.'
  },
  {
    gate: 'payment_proof_values_present',
    status: stripeProofReady ? 'passed' : 'blocked',
    proof_bucket: 'local',
    evidence: missingStripeProofKeys.length === 0 ? 'Stripe proof keys are present by name.' : `Missing ${missingStripeProofKeys.join(', ')}.`,
    next_action: stripeProofReady ? 'Run payment proof only in owner-approved test/smoke mode.' : 'Provide Stripe proof values before pricing/payment hosted proof.'
  }
];

const releaseHolds = [
  {
    hold: 'target_project_management_access_missing',
    severity: 'P1',
    status: managementAccessReady ? 'cleared' : 'active',
    evidence_needed: 'Supabase functions and secrets list commands succeed for the intended project ref without exposing values.'
  },
  {
    hold: 'hosted_runtime_health_unreachable',
    severity: 'P1',
    status: runtimeHealthReachable ? 'cleared' : 'active',
    evidence_needed: 'The configured Supabase runtime host resolves and /functions/v1/health returns a reachable HTTP response without exposing secret values.'
  },
  {
    hold: 'forecast_runtime_function_load_failure',
    severity: 'P1',
    status: forecastRuntimeFunctionsLoad ? 'cleared' : 'active',
    evidence_needed: 'The hosted analyze-engine and multi-agent-forecast edge functions load successfully through read-only runtime probes.'
  },
  {
    hold: 'hosted_url_and_deploy_binding_missing',
    severity: 'P1',
    status: 'active',
    evidence_needed: 'Owner-approved hosted URL plus deploy id, release id, or commit SHA for browser and smoke evidence.'
  },
  {
    hold: 'stripe_payment_proof_values_missing',
    severity: 'P2',
    status: stripeProofReady ? 'cleared' : 'active',
    evidence_needed: 'STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_ACADEMIC_PRICE_ID, and APP_URL are present for owner-approved payment proof.'
  },
  {
    hold: 'hosted_browser_screenshots_missing',
    severity: 'P2',
    status: 'active',
    evidence_needed: 'Browser screenshots or externally supplied evidence for buyer-visible hosted routes after deploy binding.'
  }
];

const report = {
  schema_version: 'hosted-access-preflight-validation-v1',
  generated_at: new Date().toISOString(),
  status,
  source: {
    project_ref: input.projectRef,
    env_file: input.envFile,
    supabase_cli_source: supabaseCommand?.source ?? 'unavailable',
    supabase_cli_version: versionText,
    supabase_access_token_source: commandEnv.SUPABASE_USE_ENV_TOKEN === 'true' ? 'env_token_allowed' : 'active_cli_login_or_none',
    launch_evidence: input.evidence
  },
  summary: {
    cli_available: Boolean(supabaseCommand),
    core_env_present: coreEnvPresent,
    missing_core_env_key_count: missingCoreEnvKeys.length,
    strategist_provider_key_present: providerKeyPresent,
    missing_provider_key_option_count: missingProviderKeys.length,
    stripe_proof_ready: stripeProofReady,
    missing_stripe_proof_key_count: missingStripeProofKeys.length,
    projects_list_access: projectsAccess,
    listed_project_count: listedProjectRefs.length,
    target_project_visible: targetProjectVisible,
    functions_list_access: functionsAccess,
    secrets_list_access: secretsAccess,
    management_access_ready: managementAccessReady,
    hosted_runtime_health_status: runtimeHealth.status,
    hosted_runtime_health_error_code: runtimeHealth.error_code,
    hosted_runtime_host: runtimeHealth.runtime_host,
    hosted_runtime_health_reachable: runtimeHealthReachable,
    forecast_runtime_functions_load: forecastRuntimeFunctionsLoad,
    failed_runtime_function_probe_count: failedRuntimeFunctionProbes.length,
    hosted_access_ready_for_smoke: hostedAccessReady,
    hosted_claim_allowed: false,
    active_release_hold_count: releaseHolds.filter((hold) => hold.status === 'active').length
  },
  missing_keys_by_name_only: {
    core_env: missingCoreEnvKeys,
    provider_options: missingProviderKeys,
    stripe_proof: missingStripeProofKeys
  },
  command_exit_summary: {
    version_exit_code: commandResults.version?.status ?? null,
    projects_list_exit_code: commandResults.projectsList?.status ?? null,
    functions_list_exit_code: commandResults.functionsList?.status ?? null,
    secrets_list_exit_code: commandResults.secretsList?.status ?? null,
    runtime_health_http_status: runtimeHealth.http_status
  },
  runtime_function_probes: runtimeFunctionProbes,
  acceptance_gates: acceptanceGates,
  release_holds: releaseHolds,
  proof_boundary: 'This artifact validates local, management, and runtime-access readiness only. It does not prove hosted route behavior, browser rendering, buyer-safe hosted claims, payment readiness, enterprise readiness, or prediction accuracy.'
};

function renderCsv(validation) {
  return [
    csvLine(['gate', 'status', 'proof_bucket', 'evidence', 'next_action']),
    ...validation.acceptance_gates.map((gate) => csvLine([
      gate.gate,
      gate.status,
      gate.proof_bucket,
      gate.evidence,
      gate.next_action
    ]))
  ].join('\n') + '\n';
}

function renderMarkdown(validation) {
  const gateRows = validation.acceptance_gates
    .map((gate) => [
      mdCell(gate.gate),
      mdCell(gate.status),
      mdCell(gate.proof_bucket),
      mdCell(gate.evidence),
      mdCell(gate.next_action)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const runtimeProbeRows = validation.runtime_function_probes
    .map((probe) => [
      mdCell(probe.function_name),
      mdCell(probe.required_for),
      mdCell(probe.method),
      mdCell(probe.status),
      mdCell(probe.http_status ?? 'n/a'),
      mdCell(probe.load_error_code ?? probe.error_code ?? 'n/a')
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const holdRows = validation.release_holds
    .map((hold) => [
      mdCell(hold.hold),
      mdCell(hold.severity),
      mdCell(hold.status),
      mdCell(hold.evidence_needed)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  return `# Hosted Access Preflight Validation - ${validation.generated_at.slice(0, 10)}

## Decision

Status: \`${validation.status}\`.

Hosted access ready for smoke: **${validation.summary.hosted_access_ready_for_smoke}**.

Supabase CLI source: **${validation.source.supabase_cli_source}**. Supabase CLI version: **${validation.source.supabase_cli_version}**.

Core hosted env present: **${validation.summary.core_env_present}**. Strategist provider key present: **${validation.summary.strategist_provider_key_present}**. Stripe proof ready: **${validation.summary.stripe_proof_ready}**.

Project list access: **${validation.summary.projects_list_access}**. Target project visible: **${validation.summary.target_project_visible}**. Function access: **${validation.summary.functions_list_access}**. Secret access: **${validation.summary.secrets_list_access}**.

Runtime health reachable: **${validation.summary.hosted_runtime_health_reachable}**. Runtime status: **${validation.summary.hosted_runtime_health_status}**. Runtime error code: **${validation.summary.hosted_runtime_health_error_code ?? 'n/a'}**.

Forecast runtime functions load: **${validation.summary.forecast_runtime_functions_load}**. Failed runtime probe count: **${validation.summary.failed_runtime_function_probe_count}**.

Hosted claim allowed: **${validation.summary.hosted_claim_allowed}**.

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence | Next Action |
|---|---|---|---|---|
${gateRows}

## Runtime Function Probes

| Function | Required For | Method | Status | HTTP Status | Error |
|---|---|---|---|---|---|
${runtimeProbeRows}

## Release Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
${holdRows}

## Proof Boundary

${validation.proof_boundary}

No secret values, tokens, emails, project names, raw CLI output, or payment identifiers are stored in this artifact.
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
  const evidence = readJsonIfExists(input.evidence, null);
  if (!evidence) {
    console.error(`Cannot update missing evidence artifact: ${input.evidence}`);
    process.exit(2);
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

  evidence.proof_buckets = evidence.proof_buckets ?? {};
  evidence.proof_buckets.local = replaceMatchingThenAppend(evidence.proof_buckets.local, [
    `PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:access-preflight -- --project-ref ${input.projectRef} --json-output ${outputPaths.json} --md-output ${outputPaths.md} --csv-output ${outputPaths.csv} --update-evidence: status ${report.status}, cli_available ${report.summary.cli_available}, core_env_present ${report.summary.core_env_present}, functions_list_access ${report.summary.functions_list_access}, secrets_list_access ${report.summary.secrets_list_access}, hosted_access_ready_for_smoke ${report.summary.hosted_access_ready_for_smoke}`
  ], [
    /npm run audit:hosted:access-preflight/
  ]);
  evidence.proof_buckets.repo_artifact = replaceMatchingThenAppend(evidence.proof_buckets.repo_artifact, [
    'scripts/validate-hosted-access-preflight.mjs records sanitized hosted access preflight status without storing secret values or raw management output',
    'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json records CLI fallback, env-key presence, project visibility, function/secret access, and hosted-smoke release holds',
    'docs/launch-readiness/hosted-access-preflight-validation-checklist-2026-06-06.csv provides the hosted-access preflight checklist'
  ], [
    /scripts\/validate-hosted-access-preflight\.mjs/,
    /hosted-access-preflight-validation-2026-06-06\.json/,
    /hosted-access-preflight-validation-checklist-2026-06-06\.csv/
  ]);

  evidence.fix_report = evidence.fix_report ?? {};
  evidence.fix_report.files_changed = replaceMatchingThenAppend(evidence.fix_report.files_changed, [
    'scripts/hosted-access-preflight.sh',
    'scripts/validate-hosted-access-preflight.mjs',
    'scripts/build-commercial-confidence-gate.mjs',
    'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.json',
    'docs/launch-readiness/hosted-access-preflight-validation-2026-06-06.md',
    'docs/launch-readiness/hosted-access-preflight-validation-checklist-2026-06-06.csv',
    'package.json'
  ], [
    /scripts\/hosted-access-preflight\.sh/,
    /scripts\/validate-hosted-access-preflight\.mjs/,
    /scripts\/build-commercial-confidence-gate\.mjs/,
    /hosted-access-preflight-validation-2026-06-06\.json/,
    /hosted-access-preflight-validation-2026-06-06\.md/,
    /hosted-access-preflight-validation-checklist-2026-06-06\.csv/,
    /package\.json/
  ]);
  evidence.fix_report.tests_run = replaceMatchingThenAppend(evidence.fix_report.tests_run, [
    'bash -n scripts/hosted-access-preflight.sh',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH node --check scripts/validate-hosted-access-preflight.mjs',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run diag:hosted:access',
    'PATH=$HOME/.nvm/versions/node/v20.19.5/bin:$PATH npm run audit:hosted:access-preflight'
  ], [
    /bash -n scripts\/hosted-access-preflight\.sh/,
    /node --check scripts\/validate-hosted-access-preflight\.mjs/,
    /npm run diag:hosted:access/,
    /npm run audit:hosted:access-preflight/
  ]);
  evidence.fix_report.approval_gates = replaceMatchingThenAppend(evidence.fix_report.approval_gates, [
    'Hosted access preflight is not hosted demo proof; Supabase function/secret management access, owner-approved hosted URL/deploy binding, redacted screenshots/logs, and payment proof values remain required before hosted-live or buyer-safe hosted claims can be upgraded.'
  ], [
    /Hosted access preflight is not hosted demo proof/
  ]);

  evidence.implementation_decisions = replaceByTaskId(evidence.implementation_decisions, {
    task_id: 'hosted-access-preflight-validation-harness',
    decision: 'Add a Supabase CLI npm-exec fallback and sanitized hosted access preflight validator before hosted-live claims are upgraded.',
    acceptance_check: 'The validator records CLI availability, core env presence, provider-key presence, project visibility, function/secret management access, Stripe proof gaps, and hosted-claim boundary without storing secret values or raw project data.',
    chosen_variant: 'minimal shell fallback plus no-dependency Node validator; no hosted mutation, no secret persistence, no browser claim upgrade',
    repo_pattern_reused: 'Existing launch-readiness Node artifact validator pattern',
    files_changed: [
      'scripts/hosted-access-preflight.sh',
      'scripts/validate-hosted-access-preflight.mjs',
      'scripts/build-commercial-confidence-gate.mjs',
      'package.json'
    ],
    tests_run: [
      'bash -n scripts/hosted-access-preflight.sh',
      'node --check scripts/validate-hosted-access-preflight.mjs',
      'npm run diag:hosted:access',
      'npm run audit:hosted:access-preflight',
      'npm run audit:commercial:confidence'
    ],
    proof: `${report.status}; cli_available=${report.summary.cli_available}; functions_list_access=${report.summary.functions_list_access}; secrets_list_access=${report.summary.secrets_list_access}; hosted_access_ready_for_smoke=${report.summary.hosted_access_ready_for_smoke}; hosted_claim_allowed=false.`,
    reason: 'Hosted proof is a commercial blocker; the current environment needed a safe runtime preflight before browser or hosted smoke evidence could be claimed.'
  });
  evidence.rejected_variants = replaceByTaskId(evidence.rejected_variants, {
    task_id: 'hosted-access-preflight-validation-harness',
    variant: 'Claim hosted readiness from local route proof, env presence, or smoke script availability.',
    reason_rejected: 'Local proof, env names, and script presence do not prove hosted project management access, deploy binding, browser rendering, payment proof, or buyer-safe hosted claims.',
    tradeoff: 'The validator records the real access blocker and keeps hosted confidence unchanged until management access and hosted smoke evidence are attached.',
    evidence: `${report.status} keeps hosted_claim_allowed=false.`
  });
  evidence.code_optimization_reviews = replaceByTaskId(evidence.code_optimization_reviews, {
    target_task: 'hosted-access-preflight-validation-harness',
    policy: 'strict',
    verdict: 'pass',
    minimality_score: 4,
    evidence: 'No new dependency, no app runtime edit, no live mutation, no raw secret capture, and the commercial confidence score remains unchanged.',
    tests_or_checks: [
      'bash -n scripts/hosted-access-preflight.sh',
      'node --check scripts/validate-hosted-access-preflight.mjs',
      'npm run audit:hosted:access-preflight',
      'npm run audit:commercial:confidence'
    ],
    remaining_risk: 'Function/secret management access, owner-approved hosted URL/deploy binding, browser screenshots, payment proof, buyer calls, enterprise evidence, and real forecast scoring are still missing.'
  });

  writeArtifact(input.evidence, `${JSON.stringify(evidence, null, 2)}\n`);
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  evidence_updated: updateEvidence,
  status: report.status,
  cli_available: report.summary.cli_available,
  supabase_cli_source: report.source.supabase_cli_source,
  supabase_cli_version: report.source.supabase_cli_version,
  core_env_present: report.summary.core_env_present,
  strategist_provider_key_present: report.summary.strategist_provider_key_present,
  stripe_proof_ready: report.summary.stripe_proof_ready,
  projects_list_access: report.summary.projects_list_access,
  listed_project_count: report.summary.listed_project_count,
  target_project_visible: report.summary.target_project_visible,
  functions_list_access: report.summary.functions_list_access,
  secrets_list_access: report.summary.secrets_list_access,
  forecast_runtime_functions_load: report.summary.forecast_runtime_functions_load,
  failed_runtime_function_probe_count: report.summary.failed_runtime_function_probe_count,
  hosted_access_ready_for_smoke: report.summary.hosted_access_ready_for_smoke,
  hosted_claim_allowed: report.summary.hosted_claim_allowed
}, null, 2));

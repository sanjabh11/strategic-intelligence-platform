#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const ROOT = process.cwd();

const DEFAULT_JSON_OUTPUT = 'docs/launch-readiness/ai-action-inventory-2026-06-06.json';
const DEFAULT_MD_OUTPUT = 'docs/launch-readiness/ai-action-inventory-2026-06-06.md';
const DEFAULT_CSV_OUTPUT = 'docs/launch-readiness/ai-action-inventory-2026-06-06.csv';

function argValue(name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function usage() {
  console.error([
    'Usage: node scripts/build-ai-action-inventory.mjs',
    `  [--json-output ${DEFAULT_JSON_OUTPUT}]`,
    `  [--md-output ${DEFAULT_MD_OUTPUT}]`,
    `  [--csv-output ${DEFAULT_CSV_OUTPUT}]`
  ].join('\n'));
}

if (hasFlag('--help') || hasFlag('-h')) {
  usage();
  process.exit(0);
}

const outputPaths = {
  json: argValue('--json-output', DEFAULT_JSON_OUTPUT),
  md: argValue('--md-output', DEFAULT_MD_OUTPUT),
  csv: argValue('--csv-output', DEFAULT_CSV_OUTPUT)
};

if (!outputPaths.json && !outputPaths.md && !outputPaths.csv) {
  console.error('At least one output path is required.');
  process.exit(2);
}

function resolveRepoPath(relativePath) {
  return path.isAbsolute(relativePath) ? relativePath : path.join(ROOT, relativePath);
}

function readText(relativePath) {
  const absolutePath = resolveRepoPath(relativePath);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
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

function findEvidence(check) {
  const text = readText(check.file);
  if (!text) {
    return {
      label: check.label,
      file: check.file,
      found: false,
      line: null,
      snippet: `missing file: ${check.file}`
    };
  }

  const lines = text.split(/\r?\n/);
  const lineIndex = lines.findIndex((line) => line.includes(check.contains));
  return {
    label: check.label,
    file: check.file,
    found: lineIndex >= 0,
    line: lineIndex >= 0 ? lineIndex + 1 : null,
    snippet: lineIndex >= 0 ? lines[lineIndex].trim() : `missing pattern: ${check.contains}`
  };
}

const currentSourceAlignment = [
  {
    framework: 'OWASP LLM06:2025 Excessive Agency',
    source_url: 'https://genai.owasp.org/llmrisk/llm062025-excessive-agency/',
    implication: 'Minimize tool functionality and permissions, avoid open-ended tools, execute actions in user context, require approval for high-impact actions, and enforce authorization outside the model.'
  },
  {
    framework: 'OWASP GenAI/LLM Top 10 2025',
    source_url: 'https://genai.owasp.org/llm-top-10/',
    implication: 'Action inventory should be reviewed alongside prompt injection, sensitive information disclosure, output handling, misinformation, prompt leakage, vector/retrieval weakness, and unbounded consumption.'
  },
  {
    framework: 'NIST AI RMF Generative AI Profile',
    source_url: 'https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf',
    implication: 'Treat generative-AI risks as lifecycle risks that need governance, mapping, measurement, management, provenance, pre-deployment testing, and incident disclosure evidence.'
  },
  {
    framework: 'CISA Secure by Design',
    source_url: 'https://www.cisa.gov/resources-tools/resources/secure-by-design',
    implication: 'Supplier posture should show ownership of customer security outcomes and transparent proof boundaries rather than shifting verification burden to buyers.'
  },
  {
    framework: 'CISA Secure by Demand Guide',
    source_url: 'https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf',
    implication: 'Procurement reviewers need direct answers about product-security controls, not only enterprise-security posture.'
  },
  {
    framework: 'NIST SSDF SP 800-218',
    source_url: 'https://csrc.nist.gov/pubs/sp/800/218/final',
    implication: 'Repeatable secure-development and verification artifacts should be usable by software purchasers and consumers.'
  }
];

const actionSurfaces = [
  {
    id: 'analyze_engine_service_role_persistence',
    name: 'Analyze-engine service-role persistence',
    category: 'ai_adjacent_persistence',
    files: ['supabase/functions/analyze-engine/index.ts'],
    action_type: 'server-side create/update of analysis runs, analysis jobs, review flags, telemetry, simulation rows, and schema failure logs',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: false,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'partial_static_gates_present_hosted_unverified',
    current_gate_summary: 'Service-role persistence exists inside the server function and has some review/provenance paths, but this phase does not prove hosted RLS, downstream authorization, or a centralized AI action policy.',
    buyer_safe_claim: 'AI-adjacent persistence is mapped; no hosted service-role/RLS boundary proof is attached.',
    next_gate: 'Add owner-approved hosted proof and a centralized allowlist for post-synthesis writes/fanout before enterprise no-autonomous-action claims.',
    evidence_checks: [
      { label: 'service role client', file: 'supabase/functions/analyze-engine/index.ts', contains: 'const supabaseAdmin = createClient' },
      { label: 'analysis run insert', file: 'supabase/functions/analyze-engine/index.ts', contains: 'async function insertAnalysisRunOrThrow' },
      { label: 'analysis run update', file: 'supabase/functions/analyze-engine/index.ts', contains: 'async function updateAnalysisRunOrThrow' },
      { label: 'analysis job upsert', file: 'supabase/functions/analyze-engine/index.ts', contains: 'async function createOrReplaceAnalysisJobOrThrow' },
      { label: 'human review insert', file: 'supabase/functions/analyze-engine/index.ts', contains: 'await supabaseAdmin.from("human_reviews").insert' },
      { label: 'monitoring metrics insert', file: 'supabase/functions/analyze-engine/index.ts', contains: 'await supabaseAdmin.from("monitoring_metrics").insert' }
    ]
  },
  {
    id: 'analyze_engine_function_fanout',
    name: 'Analyze-engine adjacent function and ML fanout',
    category: 'ai_adjacent_tool_fanout',
    files: ['supabase/functions/analyze-engine/index.ts'],
    action_type: 'server-side calls to ML service and adjacent export/playbook/forecast/value functions after analysis synthesis',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: true,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'partial_static_gates_present_hosted_unverified',
    current_gate_summary: 'Function fanout is explicit and source-visible, but not yet governed by a single action inventory/approval policy or hosted no-unapproved-action regression.',
    buyer_safe_claim: 'Post-analysis fanout is mapped as a high-impact surface; autonomous-action proof is not complete.',
    next_gate: 'Add a centralized post-LLM action allowlist with per-action approval/authorization labels and hosted regression evidence.',
    evidence_checks: [
      { label: 'ML service call', file: 'supabase/functions/analyze-engine/index.ts', contains: "await maybeCallMlService('/game-theory/solve'" },
      { label: 'notebook export function call', file: 'supabase/functions/analyze-engine/index.ts', contains: 'fetch(buildFunctionUrl("notebook-export")' },
      { label: 'teacher packet function call', file: 'supabase/functions/analyze-engine/index.ts', contains: 'fetch(buildFunctionUrl("teacher-packet")' },
      { label: 'strategic playbook function call', file: 'supabase/functions/analyze-engine/index.ts', contains: 'fetch(buildFunctionUrl("strategic-playbook")' },
      { label: 'information value function call', file: 'supabase/functions/analyze-engine/index.ts', contains: '/functions/v1/information-value-assessment' },
      { label: 'outcome forecasting function call', file: 'supabase/functions/analyze-engine/index.ts', contains: '/functions/v1/outcome-forecasting' }
    ]
  },
  {
    id: 'forecast_publication',
    name: 'Forecast publication',
    category: 'public_content_publication',
    files: ['supabase/functions/forecast-create/index.ts'],
    action_type: 'creates public forecast rows from a user-owned linked analysis',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: false,
    public_or_financial_effect: true,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Authentication, owner check, and publish-governance checks are present before public forecast creation.',
    buyer_safe_claim: 'Public forecast creation has static user/owner/governance gates; hosted behavior and RLS are not proven here.',
    next_gate: 'Run hosted smoke plus RLS tests for owned, unowned, rejected, unreviewed, and contested linked analyses.',
    evidence_checks: [
      { label: 'authenticated user required', file: 'supabase/functions/forecast-create/index.ts', contains: 'const user = await getAuthenticatedUser(req)' },
      { label: 'ownership error path', file: 'supabase/functions/forecast-create/index.ts', contains: "code: 'analysis_not_owned'" },
      { label: 'publish governance assessment', file: 'supabase/functions/forecast-create/index.ts', contains: 'const governance = assessPublishGovernance(draft, readiness, reviewState)' },
      { label: 'forecast insert', file: 'supabase/functions/forecast-create/index.ts', contains: ".from('forecasts')" },
      { label: 'public forecast flag', file: 'supabase/functions/forecast-create/index.ts', contains: 'is_public: true' }
    ]
  },
  {
    id: 'human_review_request',
    name: 'Human review request',
    category: 'review_workflow_state_change',
    files: ['supabase/functions/human-review/index.ts'],
    action_type: 'moves analysis runs into review workflow',
    impact_level: 'medium',
    high_impact_product_action: false,
    external_side_effect: false,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Requester must be reviewer, owner, or ownerless analysis path before status moves to under_review.',
    buyer_safe_claim: 'Review-request transitions are statically owner/reviewer gated; hosted proof is pending.',
    next_gate: 'Run hosted owner/reviewer/other-user request-review smoke with redacted evidence.',
    evidence_checks: [
      { label: 'reviewer user lookup', file: 'supabase/functions/human-review/index.ts', contains: 'async function getReviewerUser' },
      { label: 'requester gate', file: 'supabase/functions/human-review/index.ts', contains: "requester.role === 'reviewer' || analysisOwnerId === requester.id" },
      { label: 'forbidden owner/reviewer error', file: 'supabase/functions/human-review/index.ts', contains: 'Forbidden - analysis owner or reviewer required' },
      { label: 'under review status', file: 'supabase/functions/human-review/index.ts', contains: "status: 'under_review'" }
    ]
  },
  {
    id: 'human_review_approve_reject',
    name: 'Human review approve/reject',
    category: 'review_decision',
    files: ['supabase/functions/human-review/index.ts'],
    action_type: 'reviewer-only approval or rejection of analysis runs',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: false,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Reviewer role and under_review status are required, and only approve/reject actions are accepted.',
    buyer_safe_claim: 'Review decisions are statically human/reviewer gated; hosted proof is pending.',
    next_gate: 'Run hosted role-boundary tests for reviewer, owner, anonymous, and unrelated users.',
    evidence_checks: [
      { label: 'reviewer role required', file: 'supabase/functions/human-review/index.ts', contains: "if (reviewer.role !== 'reviewer')" },
      { label: 'approve/reject action validation', file: 'supabase/functions/human-review/index.ts', contains: "['approve', 'reject'].includes(action)" },
      { label: 'under review precondition', file: 'supabase/functions/human-review/index.ts', contains: "analysis.status !== 'under_review'" },
      { label: 'analysis status update', file: 'supabase/functions/human-review/index.ts', contains: 'async function updateAnalysisStatus' },
      { label: 'human review record insert', file: 'supabase/functions/human-review/index.ts', contains: 'async function createHumanReview' }
    ]
  },
  {
    id: 'stripe_checkout_session',
    name: 'Stripe checkout session creation',
    category: 'payment_action',
    files: ['supabase/functions/stripe-checkout/index.ts'],
    action_type: 'creates Stripe checkout sessions for authenticated users',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: true,
    public_or_financial_effect: true,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Authentication, email match, allowed tier, academic email, and same-origin redirect checks are present before Stripe checkout creation.',
    buyer_safe_claim: 'Checkout initiation is user-authenticated and static-gated; payment proof requires owner-approved Stripe test policy.',
    next_gate: 'Run hosted payment test only with owner-approved test keys and redacted evidence.',
    evidence_checks: [
      { label: 'authenticated user required', file: 'supabase/functions/stripe-checkout/index.ts', contains: 'const user = await getAuthenticatedUser(req)' },
      { label: 'email match check', file: 'supabase/functions/stripe-checkout/index.ts', contains: 'Authenticated user email does not match checkout email' },
      { label: 'allowed tier check', file: 'supabase/functions/stripe-checkout/index.ts', contains: 'if (!isStripeTierAllowed(tier))' },
      { label: 'academic email gate', file: 'supabase/functions/stripe-checkout/index.ts', contains: 'Academic pricing requires a .edu email address' },
      { label: 'Stripe checkout creation', file: 'supabase/functions/stripe-checkout/index.ts', contains: 'stripe.checkout.sessions.create' }
    ]
  },
  {
    id: 'stripe_webhook_entitlement_sync',
    name: 'Stripe webhook entitlement sync',
    category: 'payment_entitlement_mutation',
    files: ['supabase/functions/stripe-webhook/index.ts', 'supabase/functions/_shared/monetization.ts'],
    action_type: 'updates user subscriptions, payment logs, and Stripe-backed entitlements from signed webhook events',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: true,
    public_or_financial_effect: true,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Webhook signature verification is present before entitlement synchronization; local-development bypass is explicit and must remain non-production only.',
    buyer_safe_claim: 'Stripe entitlement sync is signature-gated in source; hosted invalid-signature proof is not attached.',
    next_gate: 'Run invalid-signature and valid-test-event hosted proof under owner-approved Stripe test policy.',
    evidence_checks: [
      { label: 'Stripe signature verification', file: 'supabase/functions/stripe-webhook/index.ts', contains: 'verifyStripeSignature(rawBody, signature, stripeWebhookSecret)' },
      { label: 'Stripe entitlement sync call', file: 'supabase/functions/stripe-webhook/index.ts', contains: 'await syncStripeEntitlement(supabase' },
      { label: 'payment log insert', file: 'supabase/functions/stripe-webhook/index.ts', contains: "supabase.from('payment_logs').insert" },
      { label: 'subscription table update', file: 'supabase/functions/stripe-webhook/index.ts', contains: ".from('user_subscriptions')" },
      { label: 'monetization user subscription upsert', file: 'supabase/functions/_shared/monetization.ts', contains: ".from('user_subscriptions')" }
    ]
  },
  {
    id: 'whop_webhook_entitlement_sync',
    name: 'Whop webhook entitlement sync',
    category: 'payment_entitlement_mutation',
    files: ['supabase/functions/whop-webhook/index.ts', 'supabase/functions/_shared/monetization.ts'],
    action_type: 'updates Whop users and user subscriptions from signed Whop events',
    impact_level: 'high',
    high_impact_product_action: true,
    external_side_effect: true,
    public_or_financial_effect: true,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'static_gates_present_hosted_unverified',
    current_gate_summary: 'Webhook secret and signature verification are present before entitlement synchronization; local-development bypass is explicit and must remain non-production only.',
    buyer_safe_claim: 'Whop entitlement sync is signature-gated in source; hosted invalid-signature proof is not attached.',
    next_gate: 'Run invalid-signature and valid-test-event hosted proof under owner-approved Whop test policy.',
    evidence_checks: [
      { label: 'Whop webhook secret requirement', file: 'supabase/functions/whop-webhook/index.ts', contains: 'WHOP_WEBHOOK_SECRET' },
      { label: 'Whop signature verification', file: 'supabase/functions/whop-webhook/index.ts', contains: 'verifyWhopSignature(rawBody, req.headers, webhookSecret)' },
      { label: 'Whop entitlement sync call', file: 'supabase/functions/whop-webhook/index.ts', contains: 'await syncWhopEntitlement(supabase' },
      { label: 'Whop users upsert', file: 'supabase/functions/_shared/monetization.ts', contains: ".from('whop_users')" },
      { label: 'user subscriptions upsert', file: 'supabase/functions/_shared/monetization.ts', contains: ".from('user_subscriptions')" }
    ]
  },
  {
    id: 'buyer_discovery_outreach_copy',
    name: 'Buyer discovery outreach copy',
    category: 'outreach_copy_only',
    files: ['scripts/build-buyer-discovery-kit.mjs'],
    action_type: 'generates outreach and discovery-call copy but does not send messages',
    impact_level: 'low',
    high_impact_product_action: false,
    external_side_effect: false,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'copy_only_no_send_action',
    current_gate_summary: 'The script generates buyer-discovery copy and explicitly warns not to send messages or run calls without owner approval.',
    buyer_safe_claim: 'Outreach artifacts are draft-only and require owner approval before external contact.',
    next_gate: 'Owner approves or edits the target slate and message copy before any outreach.',
    evidence_checks: [
      { label: 'do-not-send warning', file: 'scripts/build-buyer-discovery-kit.mjs', contains: 'Do not send messages or run discovery calls without owner approval.' }
    ]
  },
  {
    id: 'hosted_service_role_smoke_scripts',
    name: 'Hosted service-role smoke scripts',
    category: 'operator_test_only',
    files: ['scripts/hosted-access-preflight.sh', 'scripts/hosted-strategist-smoke.mjs', 'scripts/hosted-auth-diagnostics.mjs', 'scripts/hosted-stripe-proof.mjs'],
    action_type: 'operator-run hosted diagnostics and smoke proof scripts requiring owner-approved secrets',
    impact_level: 'operator_high',
    high_impact_product_action: false,
    external_side_effect: true,
    public_or_financial_effect: false,
    direct_llm_to_irreversible_action: false,
    static_gate_status: 'owner_approved_test_only_not_runtime_product_action',
    current_gate_summary: 'Service-role keys are used only by explicit hosted proof scripts, not as autonomous runtime actions in this inventory.',
    buyer_safe_claim: 'Hosted proof scripts are test-only and require owner-approved secret handling.',
    next_gate: 'Run only after owner approval, with redacted logs and no secrets persisted.',
    evidence_checks: [
      { label: 'preflight service-role requirement', file: 'scripts/hosted-access-preflight.sh', contains: 'SUPABASE_SERVICE_ROLE_KEY' },
      { label: 'strategist smoke service-role requirement', file: 'scripts/hosted-strategist-smoke.mjs', contains: 'const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY' },
      { label: 'auth diagnostics service-role requirement', file: 'scripts/hosted-auth-diagnostics.mjs', contains: 'const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY' },
      { label: 'Stripe proof service-role requirement', file: 'scripts/hosted-stripe-proof.mjs', contains: 'const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY' }
    ]
  }
];

function enrichSurface(surface) {
  const evidence = surface.evidence_checks.map(findEvidence);
  const foundEvidenceCount = evidence.filter((item) => item.found).length;
  const missingEvidenceCount = evidence.length - foundEvidenceCount;
  return {
    ...surface,
    evidence,
    found_evidence_count: foundEvidenceCount,
    missing_evidence_count: missingEvidenceCount,
    source_evidence_status: missingEvidenceCount === 0 ? 'all_expected_static_evidence_found' : 'some_expected_static_evidence_missing'
  };
}

const surfaces = actionSurfaces.map(enrichSurface);
const highImpactProductSurfaces = surfaces.filter((surface) => surface.high_impact_product_action);
const staticGateCompleteSurfaces = surfaces.filter((surface) => surface.static_gate_status === 'static_gates_present_hosted_unverified');
const partialGateSurfaces = surfaces.filter((surface) => surface.static_gate_status === 'partial_static_gates_present_hosted_unverified');
const missingEvidenceSurfaces = surfaces.filter((surface) => surface.missing_evidence_count > 0);
const externalSideEffectSurfaces = surfaces.filter((surface) => surface.external_side_effect);
const publicOrFinancialSurfaces = surfaces.filter((surface) => surface.public_or_financial_effect);
const directLlmIrreversibleSurfaces = surfaces.filter((surface) => surface.direct_llm_to_irreversible_action);

const inventory = {
  schema_version: 'ai-action-inventory-v1',
  generated_at: new Date().toISOString(),
  generated_for_date: '2026-06-06',
  status: directLlmIrreversibleSurfaces.length === 0
    ? 'ai_action_inventory_ready_high_impact_gates_partial_not_hosted_proof'
    : 'ai_action_inventory_direct_irreversible_action_review_required',
  source: {
    repo_root: ROOT,
    static_inventory_only: true,
    hosted_state_verified: false,
    production_state_verified: false,
    owner_policy_approved: false,
    no_runtime_or_payment_or_outreach_actions_executed: true
  },
  proof_boundary: {
    allowed_use: 'Source-grounded inventory for AI/tool/action governance, procurement prep, and next hosted-test planning.',
    not_proof_of: [
      'hosted runtime behavior',
      'production Supabase policy state',
      'payment/webhook correctness',
      'buyer-approved external security posture',
      'complete absence of all possible side effects',
      'world-class prediction accuracy'
    ],
    buyer_safe_positioning: 'The product is decision support with mapped high-impact gates; no hosted no-autonomous-action proof is attached yet.'
  },
  summary: {
    action_surface_count: surfaces.length,
    high_impact_product_action_count: highImpactProductSurfaces.length,
    external_side_effect_surface_count: externalSideEffectSurfaces.length,
    public_or_financial_effect_surface_count: publicOrFinancialSurfaces.length,
    direct_llm_to_irreversible_action_count: directLlmIrreversibleSurfaces.length,
    static_gate_complete_hosted_unverified_count: staticGateCompleteSurfaces.length,
    partial_static_gate_count: partialGateSurfaces.length,
    missing_static_evidence_surface_count: missingEvidenceSurfaces.length,
    hosted_verified_count: 0,
    owner_approved_policy_count: 0
  },
  current_source_alignment: currentSourceAlignment,
  action_surfaces: surfaces,
  required_next_controls: [
    'Create a central high-impact action policy that labels publication, review decisions, payments, entitlement mutations, service-role writes, and post-analysis fanout.',
    'Require user context, reviewer role, webhook signature, or owner-approved operator context for every high-impact action.',
    'Add hosted no-autonomous-action smoke tests for unowned publication, non-reviewer approve/reject, invalid webhooks, checkout email mismatch, and post-analysis fanout boundaries.',
    'Keep outreach artifacts copy-only until owner approval and record that no messages were sent by the app.',
    'Keep service-role proof scripts as owner-approved operator tests with redacted logs, never autonomous runtime tools.',
    'Do not upgrade enterprise/public-sector AI trust claims until hosted proof and RLS tests exist.'
  ],
  decision: {
    launch_confidence_delta: 0,
    confidence_reason: 'Inventory improves proof readiness and procurement clarity, but no hosted tests, owner-approved AI action policy, RLS proof, payment proof, buyer proof, or accuracy proof were added.',
    current_claim: 'decision-support workflow with mapped high-impact action gates',
    prohibited_claim: 'fully proven no-autonomous-action AI system'
  }
};

function renderMarkdown(report) {
  const sourceRows = report.current_source_alignment
    .map((source) => [
      mdCell(source.framework),
      source.source_url,
      mdCell(source.implication)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const surfaceRows = report.action_surfaces
    .map((surface) => [
      mdCell(surface.name),
      mdCell(surface.category),
      mdCell(surface.impact_level),
      surface.high_impact_product_action ? 'yes' : 'no',
      surface.direct_llm_to_irreversible_action ? 'yes' : 'no',
      mdCell(surface.static_gate_status),
      `${surface.found_evidence_count}/${surface.evidence.length}`,
      mdCell(surface.next_gate)
    ])
    .map((row) => `| ${row.join(' | ')} |`)
    .join('\n');

  const evidenceBlocks = report.action_surfaces
    .map((surface) => {
      const rows = surface.evidence
        .map((item) => `- ${item.found ? 'found' : 'missing'}: ${item.label} - ${item.file}${item.line ? `:${item.line}` : ''} - ${item.snippet}`)
        .join('\n');
      return `### ${surface.name}\n\n${rows}`;
    })
    .join('\n\n');

  return `# AI Action Inventory - 2026-06-06

## Decision

Status: \`${report.status}\`.

This is a static, source-grounded inventory of AI-adjacent writes, function fanout, public publication, review decisions, payment/entitlement changes, outreach-copy artifacts, and operator-only hosted proof scripts. It does not execute hosted tests, payment flows, outreach, production jobs, or migrations.

Buyer-safe position:

> ${report.proof_boundary.buyer_safe_positioning}

## Summary

| Metric | Count |
|---|---:|
| Action surfaces inventoried | ${report.summary.action_surface_count} |
| High-impact product action surfaces | ${report.summary.high_impact_product_action_count} |
| External side-effect surfaces | ${report.summary.external_side_effect_surface_count} |
| Public or financial effect surfaces | ${report.summary.public_or_financial_effect_surface_count} |
| Direct LLM-to-irreversible-action surfaces found | ${report.summary.direct_llm_to_irreversible_action_count} |
| Static gates present but hosted-unverified | ${report.summary.static_gate_complete_hosted_unverified_count} |
| Partial static gate surfaces | ${report.summary.partial_static_gate_count} |
| Hosted-verified surfaces | ${report.summary.hosted_verified_count} |

## Source Alignment

| Framework | Source | Inventory Implication |
|---|---|---|
${sourceRows}

## Action Surfaces

| Surface | Category | Impact | High-Impact Product Action | Direct LLM-to-Irreversible | Gate Status | Evidence | Next Gate |
|---|---|---|---|---|---|---:|---|
${surfaceRows}

## Required Next Controls

${report.required_next_controls.map((item) => `- ${item}`).join('\n')}

## Evidence

${evidenceBlocks}

## Proof Boundary

Allowed use: ${report.proof_boundary.allowed_use}

Not proof of:

${report.proof_boundary.not_proof_of.map((item) => `- ${item}`).join('\n')}
`;
}

function renderCsv(report) {
  const header = csvLine([
    'id',
    'name',
    'category',
    'impact_level',
    'high_impact_product_action',
    'external_side_effect',
    'public_or_financial_effect',
    'direct_llm_to_irreversible_action',
    'static_gate_status',
    'source_evidence_status',
    'found_evidence_count',
    'missing_evidence_count',
    'buyer_safe_claim',
    'next_gate',
    'files'
  ]);
  const rows = report.action_surfaces.map((surface) => csvLine([
    surface.id,
    surface.name,
    surface.category,
    surface.impact_level,
    surface.high_impact_product_action,
    surface.external_side_effect,
    surface.public_or_financial_effect,
    surface.direct_llm_to_irreversible_action,
    surface.static_gate_status,
    surface.source_evidence_status,
    surface.found_evidence_count,
    surface.missing_evidence_count,
    surface.buyer_safe_claim,
    surface.next_gate,
    surface.files.join('; ')
  ]));
  return `${[header, ...rows].join('\n')}\n`;
}

if (outputPaths.json) {
  writeArtifact(outputPaths.json, `${JSON.stringify(inventory, null, 2)}\n`);
}

if (outputPaths.md) {
  writeArtifact(outputPaths.md, renderMarkdown(inventory));
}

if (outputPaths.csv) {
  writeArtifact(outputPaths.csv, renderCsv(inventory));
}

console.log(JSON.stringify({
  json_output: outputPaths.json,
  md_output: outputPaths.md,
  csv_output: outputPaths.csv,
  status: inventory.status,
  action_surface_count: inventory.summary.action_surface_count,
  high_impact_product_action_count: inventory.summary.high_impact_product_action_count,
  direct_llm_to_irreversible_action_count: inventory.summary.direct_llm_to_irreversible_action_count,
  hosted_verified_count: inventory.summary.hosted_verified_count
}, null, 2));

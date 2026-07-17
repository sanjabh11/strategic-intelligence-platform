# AI Action Inventory - 2026-06-06

## Decision

Status: `ai_action_inventory_ready_high_impact_gates_partial_not_hosted_proof`.

This is a static, source-grounded inventory of AI-adjacent writes, function fanout, public publication, review decisions, payment/entitlement changes, outreach-copy artifacts, and operator-only hosted proof scripts. It does not execute hosted tests, payment flows, outreach, production jobs, or migrations.

Buyer-safe position:

> The product is decision support with mapped high-impact gates; no hosted no-autonomous-action proof is attached yet.

## Summary

| Metric | Count |
|---|---:|
| Action surfaces inventoried | 10 |
| High-impact product action surfaces | 7 |
| External side-effect surfaces | 5 |
| Public or financial effect surfaces | 4 |
| Direct LLM-to-irreversible-action surfaces found | 0 |
| Static gates present but hosted-unverified | 6 |
| Partial static gate surfaces | 2 |
| Hosted-verified surfaces | 0 |

## Source Alignment

| Framework | Source | Inventory Implication |
|---|---|---|
| OWASP LLM06:2025 Excessive Agency | https://genai.owasp.org/llmrisk/llm062025-excessive-agency/ | Minimize tool functionality and permissions, avoid open-ended tools, execute actions in user context, require approval for high-impact actions, and enforce authorization outside the model. |
| OWASP GenAI/LLM Top 10 2025 | https://genai.owasp.org/llm-top-10/ | Action inventory should be reviewed alongside prompt injection, sensitive information disclosure, output handling, misinformation, prompt leakage, vector/retrieval weakness, and unbounded consumption. |
| NIST AI RMF Generative AI Profile | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | Treat generative-AI risks as lifecycle risks that need governance, mapping, measurement, management, provenance, pre-deployment testing, and incident disclosure evidence. |
| CISA Secure by Design | https://www.cisa.gov/resources-tools/resources/secure-by-design | Supplier posture should show ownership of customer security outcomes and transparent proof boundaries rather than shifting verification burden to buyers. |
| CISA Secure by Demand Guide | https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf | Procurement reviewers need direct answers about product-security controls, not only enterprise-security posture. |
| NIST SSDF SP 800-218 | https://csrc.nist.gov/pubs/sp/800/218/final | Repeatable secure-development and verification artifacts should be usable by software purchasers and consumers. |

## Action Surfaces

| Surface | Category | Impact | High-Impact Product Action | Direct LLM-to-Irreversible | Gate Status | Evidence | Next Gate |
|---|---|---|---|---|---|---:|---|
| Analyze-engine service-role persistence | ai_adjacent_persistence | high | yes | no | partial_static_gates_present_hosted_unverified | 6/6 | Add owner-approved hosted proof and a centralized allowlist for post-synthesis writes/fanout before enterprise no-autonomous-action claims. |
| Analyze-engine adjacent function and ML fanout | ai_adjacent_tool_fanout | high | yes | no | partial_static_gates_present_hosted_unverified | 6/6 | Add a centralized post-LLM action allowlist with per-action approval/authorization labels and hosted regression evidence. |
| Forecast publication | public_content_publication | high | yes | no | static_gates_present_hosted_unverified | 5/5 | Run hosted smoke plus RLS tests for owned, unowned, rejected, unreviewed, and contested linked analyses. |
| Human review request | review_workflow_state_change | medium | no | no | static_gates_present_hosted_unverified | 4/4 | Run hosted owner/reviewer/other-user request-review smoke with redacted evidence. |
| Human review approve/reject | review_decision | high | yes | no | static_gates_present_hosted_unverified | 5/5 | Run hosted role-boundary tests for reviewer, owner, anonymous, and unrelated users. |
| Stripe checkout session creation | payment_action | high | yes | no | static_gates_present_hosted_unverified | 5/5 | Run hosted payment test only with owner-approved test keys and redacted evidence. |
| Stripe webhook entitlement sync | payment_entitlement_mutation | high | yes | no | static_gates_present_hosted_unverified | 5/5 | Run invalid-signature and valid-test-event hosted proof under owner-approved Stripe test policy. |
| Whop webhook entitlement sync | payment_entitlement_mutation | high | yes | no | static_gates_present_hosted_unverified | 5/5 | Run invalid-signature and valid-test-event hosted proof under owner-approved Whop test policy. |
| Buyer discovery outreach copy | outreach_copy_only | low | no | no | copy_only_no_send_action | 1/1 | Owner approves or edits the target slate and message copy before any outreach. |
| Hosted service-role smoke scripts | operator_test_only | operator_high | no | no | owner_approved_test_only_not_runtime_product_action | 4/4 | Run only after owner approval, with redacted logs and no secrets persisted. |

## Required Next Controls

- Create a central high-impact action policy that labels publication, review decisions, payments, entitlement mutations, service-role writes, and post-analysis fanout.
- Require user context, reviewer role, webhook signature, or owner-approved operator context for every high-impact action.
- Add hosted no-autonomous-action smoke tests for unowned publication, non-reviewer approve/reject, invalid webhooks, checkout email mismatch, and post-analysis fanout boundaries.
- Keep outreach artifacts copy-only until owner approval and record that no messages were sent by the app.
- Keep service-role proof scripts as owner-approved operator tests with redacted logs, never autonomous runtime tools.
- Do not upgrade enterprise/public-sector AI trust claims until hosted proof and RLS tests exist.

## Evidence

### Analyze-engine service-role persistence

- found: service role client - supabase/functions/analyze-engine/index.ts:83 - const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- found: analysis run insert - supabase/functions/analyze-engine/index.ts:93 - async function insertAnalysisRunOrThrow(row: Record<string, unknown>) {
- found: analysis run update - supabase/functions/analyze-engine/index.ts:105 - async function updateAnalysisRunOrThrow(analysisRunId: string, row: Record<string, unknown>) {
- found: analysis job upsert - supabase/functions/analyze-engine/index.ts:128 - async function createOrReplaceAnalysisJobOrThrow(row: Record<string, unknown>) {
- found: human review insert - supabase/functions/analyze-engine/index.ts:4172 - await supabaseAdmin.from("human_reviews").insert({
- found: monitoring metrics insert - supabase/functions/analyze-engine/index.ts:4699 - await supabaseAdmin.from("monitoring_metrics").insert(metrics).catch(err => {

### Analyze-engine adjacent function and ML fanout

- found: ML service call - supabase/functions/analyze-engine/index.ts:1785 - const result = await maybeCallMlService('/game-theory/solve', {
- found: notebook export function call - supabase/functions/analyze-engine/index.ts:4266 - const notebookResponse = await fetch(buildFunctionUrl("notebook-export"), {
- found: teacher packet function call - supabase/functions/analyze-engine/index.ts:4282 - const teacherResponse = await fetch(buildFunctionUrl("teacher-packet"), {
- found: strategic playbook function call - supabase/functions/analyze-engine/index.ts:4297 - const playbookResponse = await fetch(buildFunctionUrl("strategic-playbook"), {
- found: information value function call - supabase/functions/analyze-engine/index.ts:4512 - const evpiResponse = await fetch(`${SUPABASE_URL}/functions/v1/information-value-assessment`, {
- found: outcome forecasting function call - supabase/functions/analyze-engine/index.ts:4594 - const forecastResponse = await fetch(`${SUPABASE_URL}/functions/v1/outcome-forecasting`, {

### Forecast publication

- found: authenticated user required - supabase/functions/forecast-create/index.ts:147 - const user = await getAuthenticatedUser(req)
- found: ownership error path - supabase/functions/forecast-create/index.ts:172 - return jsonResponse(403, { ok: false, message: 'Forbidden - you can only link your own analysis runs', code: 'analysis_not_owned' })
- found: publish governance assessment - supabase/functions/forecast-create/index.ts:183 - const governance = assessPublishGovernance(draft, readiness, reviewState)
- found: forecast insert - supabase/functions/forecast-create/index.ts:194 - .from('forecasts')
- found: public forecast flag - supabase/functions/forecast-create/index.ts:206 - is_public: true,

### Human review request

- found: reviewer user lookup - supabase/functions/human-review/index.ts:46 - async function getReviewerUser(req: Request): Promise<{ id: string; role: string } | null> {
- found: requester gate - supabase/functions/human-review/index.ts:82 - const canRequestReview = requester.role === 'reviewer' || analysisOwnerId === requester.id || analysisOwnerId === null
- found: forbidden owner/reviewer error - supabase/functions/human-review/index.ts:85 - return jsonResponse(403, { ok: false, message: 'Forbidden - analysis owner or reviewer required' })
- found: under review status - supabase/functions/human-review/index.ts:92 - status: 'under_review',

### Human review approve/reject

- found: reviewer role required - supabase/functions/human-review/index.ts:248 - if (reviewer.role !== 'reviewer') {
- found: approve/reject action validation - supabase/functions/human-review/index.ts:324 - if (!action || !['approve', 'reject'].includes(action)) {
- found: under review precondition - supabase/functions/human-review/index.ts:333 - if (analysis.status !== 'under_review') {
- found: analysis status update - supabase/functions/human-review/index.ts:207 - async function updateAnalysisStatus(analysisId: string, status: 'approved' | 'rejected') {
- found: human review record insert - supabase/functions/human-review/index.ts:220 - async function createHumanReview(analysisId: string, reviewerId: string, status: 'approved' | 'rejected', notes?: string) {

### Stripe checkout session creation

- found: authenticated user required - supabase/functions/stripe-checkout/index.ts:60 - const user = await getAuthenticatedUser(req);
- found: email match check - supabase/functions/stripe-checkout/index.ts:85 - return jsonResponse(403, { error: "Authenticated user email does not match checkout email" }, corsHeaders);
- found: allowed tier check - supabase/functions/stripe-checkout/index.ts:88 - if (!isStripeTierAllowed(tier)) {
- found: academic email gate - supabase/functions/stripe-checkout/index.ts:93 - return jsonResponse(400, { error: "Academic pricing requires a .edu email address" }, corsHeaders);
- found: Stripe checkout creation - supabase/functions/stripe-checkout/index.ts:102 - const session = await stripe.checkout.sessions.create({

### Stripe webhook entitlement sync

- found: Stripe signature verification - supabase/functions/stripe-webhook/index.ts:55 - const verification = await verifyStripeSignature(rawBody, signature, stripeWebhookSecret)
- found: Stripe entitlement sync call - supabase/functions/stripe-webhook/index.ts:139 - await syncStripeEntitlement(supabase, {
- found: payment log insert - supabase/functions/stripe-webhook/index.ts:213 - await supabase.from('payment_logs').insert({
- found: subscription table update - supabase/functions/stripe-webhook/index.ts:228 - .from('user_subscriptions')
- found: monetization user subscription upsert - supabase/functions/_shared/monetization.ts:166 - .from('user_subscriptions')

### Whop webhook entitlement sync

- found: Whop webhook secret requirement - supabase/functions/whop-webhook/index.ts:66 - const webhookSecret = Deno.env.get("WHOP_WEBHOOK_SECRET");
- found: Whop signature verification - supabase/functions/whop-webhook/index.ts:74 - const verification = await verifyWhopSignature(rawBody, req.headers, webhookSecret);
- found: Whop entitlement sync call - supabase/functions/whop-webhook/index.ts:132 - await syncWhopEntitlement(supabase, {
- found: Whop users upsert - supabase/functions/_shared/monetization.ts:142 - .from('whop_users')
- found: user subscriptions upsert - supabase/functions/_shared/monetization.ts:166 - .from('user_subscriptions')

### Buyer discovery outreach copy

- found: do-not-send warning - scripts/build-buyer-discovery-kit.mjs:373 - 'Do not send messages or run discovery calls without owner approval.',

### Hosted service-role smoke scripts

- found: preflight service-role requirement - scripts/hosted-access-preflight.sh:45 - "SUPABASE_SERVICE_ROLE_KEY"
- found: strategist smoke service-role requirement - scripts/hosted-strategist-smoke.mjs:22 - const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
- found: auth diagnostics service-role requirement - scripts/hosted-auth-diagnostics.mjs:22 - const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
- found: Stripe proof service-role requirement - scripts/hosted-stripe-proof.mjs:27 - const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

## Proof Boundary

Allowed use: Source-grounded inventory for AI/tool/action governance, procurement prep, and next hosted-test planning.

Not proof of:

- hosted runtime behavior
- production Supabase policy state
- payment/webhook correctness
- buyer-approved external security posture
- complete absence of all possible side effects
- world-class prediction accuracy

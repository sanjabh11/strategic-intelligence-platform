export interface ClaimRule {
  claim: string;
  allowed: boolean;
  reason: string;
  source: string;
}

export const ALLOWED_CLAIMS: string[] = [
  'governed strategic-intelligence pilot',
  'evidence-backed actor reasoning',
  'human-review and forecast-governance aware decision support',
  'calibration-aware forecasting workflow',
  'game theory analysis with Nash equilibrium computation',
  'evidence-gated workflows with real citations',
  'pilot-only platform for enterprise and public-sector decision teams',
  'source-backed strategic analysis',
  'reviewer-visible evidence trail',
  'pre-resolution forecast capture',
];

export const PROHIBITED_CLAIMS: string[] = [
  'world-class accurate predictions',
  'world-class prediction accuracy',
  'commercial-ready enterprise platform',
  'fully proven hosted runtime',
  'buyer-validated willingness to pay',
  'fully remediated RLS/tenant isolation',
  'enterprise-ready security',
  'enterprise-ready platform',
  'SOC 2 certified',
  'ISO 27001 certified',
  'FedRAMP certified',
  'prediction superiority',
  'forecasting parity',
  'Palantir-equivalent',
  'competition-winning',
  'competition winning',
];

export const CLAIM_RULES: ClaimRule[] = [
  {
    claim: 'governed strategic-intelligence pilot',
    allowed: true,
    reason: 'Pilot-only positioning with evidence-gated workflow is the approved commercial stance.',
    source: 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.md',
  },
  {
    claim: 'world-class accurate predictions',
    allowed: false,
    reason: 'No resolved-outcome calibration ledger exists. Forecast claim governance status: approved_world_class_claim=false.',
    source: 'docs/launch-readiness/forecast-claim-governance-2026-06-06.md',
  },
  {
    claim: 'enterprise-ready platform',
    allowed: false,
    reason: '0/8 required procurement documents ready. RLS not applied. Hosted proof absent.',
    source: 'docs/launch-readiness/enterprise-procurement-readiness-gate-2026-06-06.md',
  },
  {
    claim: 'buyer-validated willingness to pay',
    allowed: false,
    reason: '0 completed discovery calls, 0 qualified follow-ups, 0 paid-pilot signals.',
    source: 'docs/launch-readiness/buyer-proof-gate-2026-06-06.md',
  },
  {
    claim: 'competition-winning',
    allowed: false,
    reason: 'No competition evidence attached. Superlative language without proof gates.',
    source: 'docs/launch-readiness/commercial-confidence-gate-2026-06-06.md',
  },
  {
    claim: 'evidence-backed actor reasoning',
    allowed: true,
    reason: 'Core workflow includes evidence gathering, actor/countermove maps, and source citations.',
    source: 'docs/launch-readiness/commercial-launch-readiness-2026-06-06.md',
  },
  {
    claim: 'calibration-aware forecasting workflow',
    allowed: true,
    reason: 'Brier scoring, reliability calibration, and pre-resolution capture are implemented.',
    source: 'docs/launch-readiness/forecast-claim-governance-2026-06-06.md',
  },
];

export function isClaimAllowed(claim: string): boolean {
  const lowered = claim.toLowerCase();
  for (const prohibited of PROHIBITED_CLAIMS) {
    if (lowered.includes(prohibited.toLowerCase())) {
      return false;
    }
  }
  return true;
}

export function getProhibitedClaimsInText(text: string): string[] {
  const lowered = text.toLowerCase();
  return PROHIBITED_CLAIMS.filter((c) => lowered.includes(c.toLowerCase()));
}

export function validateClaims(text: string): { valid: boolean; violations: string[] } {
  const violations = getProhibitedClaimsInText(text);
  return { valid: violations.length === 0, violations };
}

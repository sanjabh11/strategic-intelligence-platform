#!/bin/bash
# Script to deploy all edge functions to Supabase

set -euo pipefail

DEFAULT_PROJECT_REF="jxdihzqoaxtydolmltdr"

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Always prefer the active Supabase CLI login token for management API calls.
# .env may contain a stale personal access token that belongs to a different org.
if [ "${SUPABASE_USE_ENV_TOKEN:-false}" != "true" ]; then
  unset SUPABASE_ACCESS_TOKEN
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_PROJECT_REF}"
SUPABASE_CMD="${SUPABASE_CMD:-npx supabase@latest}"

echo "🔎 Verifying Supabase access for project $PROJECT_REF..."
if ! ACCESS_OUTPUT=$($SUPABASE_CMD functions list --project-ref "$PROJECT_REF" 2>&1); then
  echo "❌ Cannot access Supabase project $PROJECT_REF."
  echo "$ACCESS_OUTPUT"
  echo ""
  echo "Fix the platform access first:"
  echo "  1. Log in with a Supabase account that can access $PROJECT_REF."
  echo "  2. If login is blocked, clear stale personal access tokens in Supabase."
  echo "  3. Re-run this script after 'supabase functions list --project-ref $PROJECT_REF' succeeds."
  exit 1
fi

FAILED_FUNCTIONS=()

deploy_function() {
  local func="$1"
  local auth_mode="${2:-public}"
  local cmd=($SUPABASE_CMD functions deploy "$func" --project-ref "$PROJECT_REF")

  if [ "$auth_mode" = "public" ]; then
    cmd+=(--no-verify-jwt)
  fi

  if [ ! -d "supabase/functions/$func" ]; then
    echo "  ⚠️  Skipping $func (not found)"
    return 0
  fi

  echo "  Deploying $func..."
  if ! DEPLOY_OUTPUT=$("${cmd[@]}" 2>&1); then
    echo "$DEPLOY_OUTPUT"
    FAILED_FUNCTIONS+=("$func")
    return 1
  fi

  echo "$DEPLOY_OUTPUT"
  return 0
}

echo "🚀 Deploying all edge functions to Supabase..."
echo "   Project: $PROJECT_REF"
echo ""

# Critical functions first
CRITICAL_FUNCTIONS=(
  "analyze-engine"
  "get-analysis-status"
  "analysis-hydrator"
  "system-status"
  "evidence-retrieval-exa"
  "retrieval"
)

echo "📦 Deploying critical functions..."
for func in "${CRITICAL_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying strategic engine functions..."

STRATEGIC_FUNCTIONS=(
  "multi-agent-forecast"
  "recursive-equilibrium"
  "symmetry-mining"
  "quantum-strategy-service"
  "information-value-assessment"
  "outcome-forecasting"
  "strategy-success-analysis"
  "scale-invariant-templates"
  "temporal-strategy-optimization"
  "dynamic-recalibration"
  "cross-domain-transfer"
)

for func in "${STRATEGIC_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying utility functions..."

UTILITY_FUNCTIONS=(
  "firecrawl-research"
  "pattern-symmetry-mining"
  "notebook-export"
  "teacher-packet"
  "strategic-playbook"
  "sensitivity-analysis"
  "collective-aggregation"
  "collective-intelligence"
  "collective-stats"
  "share-strategy"
  "game-monitoring"
  "bayes-belief-updating"
  "human-review"
  "personal-life-coach"
  "process-queue"
)

for func in "${UTILITY_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying new functions..."

NEW_FUNCTIONS=(
  "strategy-cross-pollination"
  "collective-intelligence-aggregator"
  "whitebox-scheduled"
  "release-evaluation"
  "release-promotion"
)

for func in "${NEW_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying monetization functions..."

MONETIZATION_FUNCTIONS=(
  "export-analysis"
  "stripe-checkout"
  "stripe-verify"
  "stripe-webhook"
)

for func in "${MONETIZATION_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying live data functions..."

LIVE_DATA_FUNCTIONS=(
  "gdelt-stream"
  "market-stream"
)

for func in "${LIVE_DATA_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying Phase 2 functions (LMS, SSO, Enterprise)..."

PHASE2_FUNCTIONS=(
  "lti-launch"
  "sso-auth"
)

for func in "${PHASE2_FUNCTIONS[@]}"; do
  deploy_function "$func" public || true
done

echo ""
echo "📦 Deploying internal ML jobs..."

INTERNAL_ML_FUNCTIONS=(
  "calibration-refresh"
  "ontology-sync"
  "drift-evaluate"
  "shadow-model-refresh"
)

for func in "${INTERNAL_ML_FUNCTIONS[@]}"; do
  deploy_function "$func" internal || true
done

echo ""
if [ "${#FAILED_FUNCTIONS[@]}" -gt 0 ]; then
  echo "❌ Deployment finished with failures:"
  for func in "${FAILED_FUNCTIONS[@]}"; do
    echo "  - $func"
  done
  exit 1
fi

echo "✅ Deployment complete."
echo ""
echo "Next checks:"
echo "  supabase functions list --project-ref $PROJECT_REF"
echo "  curl https://$PROJECT_REF.supabase.co/functions/v1/system-status"

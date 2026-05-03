#!/bin/bash
# Script to set up Supabase edge function secrets

set -euo pipefail

echo "🔑 Setting up Supabase edge function secrets..."
echo ""

DEFAULT_PROJECT_REF="jxdihzqoaxtydolmltdr"

# Read from .env file
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  echo "❌ Error: .env file not found"
  exit 1
fi

# Always prefer the active Supabase CLI login token for management API calls.
# .env may contain a stale personal access token that belongs to a different org.
if [ "${SUPABASE_USE_ENV_TOKEN:-false}" != "true" ]; then
  unset SUPABASE_ACCESS_TOKEN
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_PROJECT_REF}"
SUPABASE_CMD="${SUPABASE_CMD:-npx supabase@latest}"

GEMINI_SECRET_VALUE="${GEMINI_API_KEY:-${GOOGLE_AI_API_KEY:-${VITE_GEMINI_API_KEY:-}}}"
HAS_STRATEGIST_PROVIDER=false
if [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${XAI_API_KEY:-}" ] || [ -n "${GROK_API_KEY:-}" ] || [ -n "${GEMINI_SECRET_VALUE:-}" ]; then
  HAS_STRATEGIST_PROVIDER=true
fi

HAS_STRIPE_PROOF_CONTRACT=true
STRIPE_PROOF_GAPS=()
for secret_name in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_ACADEMIC_PRICE_ID APP_URL; do
  if [ -z "${!secret_name:-}" ]; then
    HAS_STRIPE_PROOF_CONTRACT=false
    STRIPE_PROOF_GAPS+=("$secret_name")
  fi
done

SECRETS_TO_PUSH=(
  "${EXA_API_KEY:-}"
  "${FIRECRAWL_API_KEY:-}"
  "${GEMINI_SECRET_VALUE:-}"
  "${GEMINI_ANALYZE_MODEL:-}"
  "${GEMINI_FALLBACK_ANALYZE_MODEL:-}"
  "${GEMINI_RETRIEVAL_MODEL:-}"
  "${OPENAI_API_KEY:-}"
  "${OPENAI_ANALYZE_MODEL:-}"
  "${OPENAI_STRATEGIST_MODEL:-}"
  "${XAI_API_KEY:-${GROK_API_KEY:-}}"
  "${XAI_ANALYZE_MODEL:-}"
  "${XAI_STRATEGIST_MODEL:-}"
  "${GEMINI_STRATEGIST_MODEL:-}"
  "${STRIPE_SECRET_KEY:-}"
  "${STRIPE_WEBHOOK_SECRET:-}"
  "${STRIPE_ACADEMIC_PRICE_ID:-}"
  "${WHOP_WEBHOOK_SECRET:-}"
  "${APP_URL:-}"
  "${WHITEBOX_SCHEDULE_TOKEN:-}"
  "${ML_SERVICE_URL:-}"
  "${ML_SERVICE_TOKEN:-${MODAL_WORKER_TOKEN:-}}"
  "${GDELT_DOC_API_URL:-}"
  "${GDELT_QUERY:-}"
  "${GDELT_TIMESPAN:-}"
  "${GDELT_MAX_RECORDS:-}"
  "${GDELT_ALLOW_SIMULATION:-false}"
  "${MARKET_BTC_URL:-}"
  "${MARKET_GOLD_URL:-}"
  "${MARKET_OIL_URL:-}"
  "${MARKET_ALLOW_SIMULATION:-false}"
)

HAS_ANY_SECRET=false
for secret_value in "${SECRETS_TO_PUSH[@]}"; do
  if [ -n "$secret_value" ]; then
    HAS_ANY_SECRET=true
    break
  fi
done

if [ "$HAS_ANY_SECRET" = false ]; then
  echo "❌ No hosted secrets are populated in .env."
  echo "Populate at least one server-side secret before re-running this script."
  exit 1
fi

echo "🔎 Verifying Supabase secrets access for project $PROJECT_REF..."
if ! ACCESS_OUTPUT=$($SUPABASE_CMD secrets list --project-ref "$PROJECT_REF" 2>&1); then
  echo "❌ Cannot manage secrets for Supabase project $PROJECT_REF."
  echo "$ACCESS_OUTPUT"
  echo ""
  echo "Fix the platform access first:"
  echo "  1. Log in with a Supabase account that can access $PROJECT_REF."
  echo "  2. If login is blocked, clear stale personal access tokens in Supabase."
  echo "  3. Re-run this script after 'supabase secrets list --project-ref $PROJECT_REF' succeeds."
  exit 1
fi

set_secret_if_present() {
  local secret_name="$1"
  local secret_value="$2"

  if [ -n "$secret_value" ]; then
    echo "Setting $secret_name..."
    $SUPABASE_CMD secrets set "$secret_name=$secret_value" --project-ref "$PROJECT_REF"
  else
    echo "Skipping $secret_name (empty)"
  fi
}

set_secret_if_present "EXA_API_KEY" "${EXA_API_KEY:-}"
set_secret_if_present "FIRECRAWL_API_KEY" "${FIRECRAWL_API_KEY:-}"
set_secret_if_present "GEMINI_API_KEY" "${GEMINI_SECRET_VALUE:-}"
set_secret_if_present "GEMINI_ANALYZE_MODEL" "${GEMINI_ANALYZE_MODEL:-}"
set_secret_if_present "GEMINI_FALLBACK_ANALYZE_MODEL" "${GEMINI_FALLBACK_ANALYZE_MODEL:-}"
set_secret_if_present "GEMINI_RETRIEVAL_MODEL" "${GEMINI_RETRIEVAL_MODEL:-}"
set_secret_if_present "OPENAI_API_KEY" "${OPENAI_API_KEY:-}"
set_secret_if_present "OPENAI_ANALYZE_MODEL" "${OPENAI_ANALYZE_MODEL:-}"
set_secret_if_present "GEMINI_STRATEGIST_MODEL" "${GEMINI_STRATEGIST_MODEL:-}"
set_secret_if_present "OPENAI_STRATEGIST_MODEL" "${OPENAI_STRATEGIST_MODEL:-}"
set_secret_if_present "XAI_API_KEY" "${XAI_API_KEY:-${GROK_API_KEY:-}}"
set_secret_if_present "XAI_ANALYZE_MODEL" "${XAI_ANALYZE_MODEL:-}"
set_secret_if_present "XAI_STRATEGIST_MODEL" "${XAI_STRATEGIST_MODEL:-}"
set_secret_if_present "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
set_secret_if_present "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
set_secret_if_present "STRIPE_ACADEMIC_PRICE_ID" "${STRIPE_ACADEMIC_PRICE_ID:-}"
set_secret_if_present "WHOP_WEBHOOK_SECRET" "${WHOP_WEBHOOK_SECRET:-}"
set_secret_if_present "APP_URL" "${APP_URL:-}"
set_secret_if_present "WHITEBOX_SCHEDULE_TOKEN" "${WHITEBOX_SCHEDULE_TOKEN:-}"
set_secret_if_present "ML_SERVICE_URL" "${ML_SERVICE_URL:-}"
set_secret_if_present "ML_SERVICE_TOKEN" "${ML_SERVICE_TOKEN:-${MODAL_WORKER_TOKEN:-}}"
set_secret_if_present "GDELT_DOC_API_URL" "${GDELT_DOC_API_URL:-}"
set_secret_if_present "GDELT_QUERY" "${GDELT_QUERY:-}"
set_secret_if_present "GDELT_TIMESPAN" "${GDELT_TIMESPAN:-}"
set_secret_if_present "GDELT_MAX_RECORDS" "${GDELT_MAX_RECORDS:-}"
set_secret_if_present "GDELT_ALLOW_SIMULATION" "${GDELT_ALLOW_SIMULATION:-false}"
set_secret_if_present "MARKET_BTC_URL" "${MARKET_BTC_URL:-}"
set_secret_if_present "MARKET_GOLD_URL" "${MARKET_GOLD_URL:-}"
set_secret_if_present "MARKET_OIL_URL" "${MARKET_OIL_URL:-}"
set_secret_if_present "MARKET_ALLOW_SIMULATION" "${MARKET_ALLOW_SIMULATION:-false}"

echo ""
echo "✅ Available secrets configured."
if [ "$HAS_STRATEGIST_PROVIDER" = false ]; then
  echo "⚠️  No strategist provider key was present locally."
  echo "   Live strategist smoke will remain blocked until GEMINI_API_KEY, OPENAI_API_KEY, or XAI_API_KEY is set."
fi
if [ "$HAS_STRIPE_PROOF_CONTRACT" = false ]; then
  echo "⚠️  Stripe hosted proof is still blocked by missing local values:"
  for secret_name in "${STRIPE_PROOF_GAPS[@]}"; do
    echo "   - $secret_name"
  done
fi
echo ""
echo "Verify secrets with:"
echo "  supabase secrets list --project-ref $PROJECT_REF"

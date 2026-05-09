#!/bin/bash
# Script to set up Supabase edge function secrets

set -euo pipefail

echo "🔑 Setting up Supabase edge function secrets..."
echo ""

DEFAULT_PROJECT_REF="jxdihzqoaxtydolmltdr"
PRESET_ML_SERVICE_URL="${ML_SERVICE_URL:-}"
PRESET_ML_SERVICE_TOKEN="${ML_SERVICE_TOKEN:-}"

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

if [ -n "${PRESET_ML_SERVICE_URL}" ]; then
  ML_SERVICE_URL="${PRESET_ML_SERVICE_URL}"
fi
if [ -n "${PRESET_ML_SERVICE_TOKEN}" ]; then
  ML_SERVICE_TOKEN="${PRESET_ML_SERVICE_TOKEN}"
fi

# Always prefer the active Supabase CLI login token for management API calls.
# .env may contain a stale personal access token that belongs to a different org.
if [ "${SUPABASE_USE_ENV_TOKEN:-false}" != "true" ]; then
  unset SUPABASE_ACCESS_TOKEN
  echo "ℹ️ Using Supabase CLI profile credentials (SUPABASE_ACCESS_TOKEN ignored)."
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-$DEFAULT_PROJECT_REF}"
if [ -z "${SUPABASE_CMD:-}" ]; then
  if command -v supabase >/dev/null 2>&1; then
    SUPABASE_CMD="supabase"
  else
    SUPABASE_CMD="npx supabase@latest"
  fi
fi

GEMINI_SECRET_VALUE="${GEMINI_API_KEY:-${GOOGLE_AI_API_KEY:-${VITE_GEMINI_API_KEY:-}}}"
OPENROUTER_API_KEY_VALUE="${OPENROUTER_API_KEY:-}"
OPENROUTER_MODEL_VALUE="${OPENROUTER_MODEL:-}"
OPENROUTER_BASE_URL_VALUE="${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
OPENROUTER_HTTP_REFERER_VALUE="${OPENROUTER_HTTP_REFERER:-${APP_URL:-}}"
OPENROUTER_X_TITLE_VALUE="${OPENROUTER_X_TITLE:-Strategic Intelligence Platform}"
STRATEGIST_PROVIDER_TIMEOUT_MS_VALUE="${STRATEGIST_PROVIDER_TIMEOUT_MS:-}"
HAS_STRATEGIST_PROVIDER=false
if [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${XAI_API_KEY:-}" ] || [ -n "${GROK_API_KEY:-}" ] || [ -n "${GEMINI_SECRET_VALUE:-}" ] || [ -n "${OPENROUTER_API_KEY_VALUE:-}" ]; then
  HAS_STRATEGIST_PROVIDER=true
fi

HAS_STRIPE_PROOF_CONTRACT=true
for secret_name in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_ACADEMIC_PRICE_ID; do
  if [ -z "${!secret_name:-}" ]; then
    HAS_STRIPE_PROOF_CONTRACT=false
    break
  fi
done

SECRETS_TO_PUSH=(
  "${EXA_API_KEY:-}"
  "${FIRECRAWL_API_KEY:-}"
  "${GEMINI_SECRET_VALUE:-}"
  "${GEMINI_ANALYZE_MODEL:-}"
  "${GEMINI_FALLBACK_ANALYZE_MODEL:-}"
  "${GEMINI_RETRIEVAL_MODEL:-}"
  "${OPENROUTER_API_KEY_VALUE:-}"
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

if [ "$HAS_STRATEGIST_PROVIDER" = true ]; then
  if [ -z "${OPENROUTER_API_KEY_VALUE:-}" ]; then
    echo "❌ OpenRouter fallback is required for hosted strategist resilience."
    echo "Add OPENROUTER_API_KEY to .env before running setup-secrets."
    exit 1
  fi

  if [ -z "${OPENROUTER_HTTP_REFERER_VALUE:-}" ]; then
    echo "❌ OpenRouter requires OPENROUTER_HTTP_REFERER or APP_URL for hosted attribution."
    echo "Populate APP_URL or OPENROUTER_HTTP_REFERER before running setup-secrets."
    exit 1
  fi

  if [ -z "${OPENROUTER_MODEL_VALUE:-}" ]; then
    echo "❌ OpenRouter-first rollout requires an explicit OPENROUTER_MODEL."
    echo "Set OPENROUTER_MODEL explicitly before running setup-secrets."
    exit 1
  fi

  if [ "${OPENROUTER_MODEL_VALUE:-}" = "openrouter/free" ]; then
    echo "ℹ️ OPENROUTER_MODEL=openrouter/free will be synced as a secondary fallback."
    echo "   Hosted primary remains Gemini under the current provider-order rules."
  fi
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
if [ -n "${OPENROUTER_API_KEY_VALUE:-}" ]; then
  set_secret_if_present "OPENROUTER_API_KEY" "${OPENROUTER_API_KEY_VALUE:-}"
  if [ -n "${OPENROUTER_MODEL_VALUE:-}" ]; then
    set_secret_if_present "OPENROUTER_MODEL" "${OPENROUTER_MODEL_VALUE:-}"
  else
    echo "Skipping OPENROUTER_MODEL (empty; hosted primary remains Gemini unless a premium model is explicitly set)"
  fi
  set_secret_if_present "OPENROUTER_BASE_URL" "${OPENROUTER_BASE_URL_VALUE:-}"
  set_secret_if_present "OPENROUTER_HTTP_REFERER" "${OPENROUTER_HTTP_REFERER_VALUE:-}"
  set_secret_if_present "OPENROUTER_X_TITLE" "${OPENROUTER_X_TITLE_VALUE:-}"
fi
set_secret_if_present "STRATEGIST_PROVIDER_TIMEOUT_MS" "${STRATEGIST_PROVIDER_TIMEOUT_MS_VALUE:-}"
set_secret_if_present "OPENAI_API_KEY" "${OPENAI_API_KEY:-}"
set_secret_if_present "OPENAI_ANALYZE_MODEL" "${OPENAI_ANALYZE_MODEL:-}"
set_secret_if_present "GEMINI_STRATEGIST_MODEL" "${GEMINI_STRATEGIST_MODEL:-}"
set_secret_if_present "OPENAI_STRATEGIST_MODEL" "${OPENAI_STRATEGIST_MODEL:-}"
set_secret_if_present "XAI_API_KEY" "${XAI_API_KEY:-${GROK_API_KEY:-}}"
set_secret_if_present "XAI_ANALYZE_MODEL" "${XAI_ANALYZE_MODEL:-}"
set_secret_if_present "XAI_STRATEGIST_MODEL" "${XAI_STRATEGIST_MODEL:-}"
if [ "$HAS_STRIPE_PROOF_CONTRACT" = true ]; then
  set_secret_if_present "STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY:-}"
  set_secret_if_present "STRIPE_WEBHOOK_SECRET" "${STRIPE_WEBHOOK_SECRET:-}"
  set_secret_if_present "STRIPE_ACADEMIC_PRICE_ID" "${STRIPE_ACADEMIC_PRICE_ID:-}"
fi
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
  echo "   Live strategist smoke will remain blocked until GEMINI_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, or XAI_API_KEY is set."
fi
echo ""
echo "Verify secrets with:"
echo "  supabase secrets list --project-ref $PROJECT_REF"

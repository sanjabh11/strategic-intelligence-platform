#!/bin/bash

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

echo "🔎 Hosted access preflight"
echo "   Project: $PROJECT_REF"
echo ""

if command -v supabase >/dev/null 2>&1; then
  SUPABASE_CMD=(supabase)
  SUPABASE_CMD_SOURCE="global supabase"
elif command -v npm >/dev/null 2>&1; then
  SUPABASE_CLI_PACKAGE="${SUPABASE_CLI_PACKAGE:-supabase@2.105.0}"
  SUPABASE_CMD=(npm exec --yes --package "$SUPABASE_CLI_PACKAGE" -- supabase)
  SUPABASE_CMD_SOURCE="npm exec $SUPABASE_CLI_PACKAGE"
else
  echo "❌ Supabase CLI is not installed or available through npm exec."
  exit 1
fi

echo "✅ Supabase CLI command source: $SUPABASE_CMD_SOURCE"
echo "   Version: $("${SUPABASE_CMD[@]}" --version 2>/dev/null || echo "unknown")"
echo ""

CORE_ENV_KEYS=(
  "VITE_SUPABASE_URL"
  "VITE_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_CORE_ENV_KEYS=()
for key in "${CORE_ENV_KEYS[@]}"; do
  if [ -z "${!key:-}" ]; then
    MISSING_CORE_ENV_KEYS+=("$key")
  fi
done

GEMINI_SECRET_VALUE="${GEMINI_API_KEY:-${GOOGLE_AI_API_KEY:-${VITE_GEMINI_API_KEY:-}}}"

if [ "${#MISSING_CORE_ENV_KEYS[@]}" -gt 0 ]; then
  echo "❌ Missing core .env values required for hosted diagnostics:"
  for key in "${MISSING_CORE_ENV_KEYS[@]}"; do
    echo "  - $key"
  done
  echo ""
else
  echo "✅ Core hosted diagnostic values are present."
  echo ""
fi

if [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${XAI_API_KEY:-}" ] || [ -n "${GROK_API_KEY:-}" ] || [ -n "${GEMINI_SECRET_VALUE:-}" ]; then
  echo "✅ A strategist provider key is present locally."
else
  echo "⚠️  No strategist provider key is present locally."
  echo "   Live strategist smoke will remain blocked until GEMINI_API_KEY, OPENAI_API_KEY, or XAI_API_KEY is set."
fi
echo ""

STRIPE_PROOF_GAPS=()
for key in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_ACADEMIC_PRICE_ID APP_URL; do
  if [ -z "${!key:-}" ]; then
    STRIPE_PROOF_GAPS+=("$key")
  fi
done

if [ "${#STRIPE_PROOF_GAPS[@]}" -eq 0 ]; then
  echo "✅ Stripe hosted proof contract is present locally."
else
  echo "⚠️  Stripe hosted proof is blocked by missing local values:"
  for key in "${STRIPE_PROOF_GAPS[@]}"; do
    echo "  - $key"
  done
fi
echo ""

echo "🔐 Supabase project visibility:"
"${SUPABASE_CMD[@]}" projects list || true
echo ""

echo "📦 Edge function access check:"
if ! "${SUPABASE_CMD[@]}" functions list --project-ref "$PROJECT_REF"; then
  echo "❌ Cannot list functions for $PROJECT_REF."
fi
echo ""

echo "🔑 Secret management access check:"
if ! "${SUPABASE_CMD[@]}" secrets list --project-ref "$PROJECT_REF"; then
  echo "❌ Cannot list secrets for $PROJECT_REF."
fi
echo ""

if [ "${#MISSING_CORE_ENV_KEYS[@]}" -gt 0 ]; then
  echo "Preflight finished with missing core local env values."
  exit 1
fi

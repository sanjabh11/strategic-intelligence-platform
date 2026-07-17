#!/bin/bash

set -euo pipefail

DEFAULT_PROJECT_REF="jxdihzqoaxtydolmltdr"
SUPABASE_CMD="${SUPABASE_CMD:-npx supabase@latest}"

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
SUPABASE_URL="${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-${EDGE_SUPABASE_SERVICE_ROLE_KEY:-}}"
SUPABASE_DEPLOY_USE_API="${SUPABASE_DEPLOY_USE_API:-true}"

PUBLIC_FUNCTIONS=(
  "evidence-retrieval-exa"
  "market-stream"
  "gdelt-stream"
)

INTERNAL_FUNCTIONS=(
  "analyze-engine"
  "personal-life-coach"
  "calibration-refresh"
  "drift-evaluate"
  "ontology-sync"
  "shadow-model-refresh"
)

echo "🔎 Verifying Supabase access for $PROJECT_REF..."
if ! ACCESS_OUTPUT=$($SUPABASE_CMD functions list --project-ref "$PROJECT_REF" 2>&1); then
  echo "❌ Cannot access Supabase functions for $PROJECT_REF."
  echo "$ACCESS_OUTPUT"
  echo ""
  echo "This token is not a deploy-capable member of the target project/org."
  echo "Re-run after logging in with a PAT from the dashboard account that can open $PROJECT_REF."
  exit 1
fi

echo "$ACCESS_OUTPUT"
echo ""

deploy_function() {
  local func="$1"
  local auth_mode="$2"
  local cmd=($SUPABASE_CMD functions deploy "$func" --project-ref "$PROJECT_REF")

  if [ "$SUPABASE_DEPLOY_USE_API" = "true" ]; then
    cmd+=(--use-api)
  fi

  if [ "$auth_mode" = "public" ]; then
    cmd+=(--no-verify-jwt)
  fi

  echo "🚀 Deploying $func..."
  "${cmd[@]}"
  echo ""
}

for func in "${PUBLIC_FUNCTIONS[@]}"; do
  deploy_function "$func" "public"
done

for func in "${INTERNAL_FUNCTIONS[@]}"; do
  deploy_function "$func" "internal"
done

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "⚠️  Skipping smoke tests because VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
  exit 0
fi

echo "🧪 Smoke testing live calibration-refresh..."
curl -sS -X POST "$SUPABASE_URL/functions/v1/calibration-refresh" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"minimumSampleSize":25}'
echo ""
echo ""

echo "🧪 Smoke testing live drift-evaluate..."
curl -sS -X POST "$SUPABASE_URL/functions/v1/drift-evaluate" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"threshold":0.12}'
echo ""
echo ""

if command -v node >/dev/null 2>&1; then
  echo "🧪 Smoke testing hosted strategist advanced frameworks..."
  node scripts/hosted-strategist-smoke.mjs
  echo ""
  echo ""

  echo "🧪 Smoke testing hosted researcher advanced frameworks..."
  node scripts/hosted-researcher-advanced-smoke.mjs
  echo ""
fi

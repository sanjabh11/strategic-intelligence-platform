#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?must be set}"
: "${SUPABASE_ANON_KEY:?must be set}"

RUN_ID="00000000-0000-0000-0000-000000000003"

echo "[1] Evidence Retrieval: Perplexity primary + Firecrawl fallback"
resp=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/evidence-retrieval" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{\n    \"runId\": \"$RUN_ID\",\n    \"query\": \"Implications of U.S. export controls on AI chips in China 2024-2025\",\n    \"contextualFactors\": {\n      \"domain\": \"geopolitics\",\n      \"stakeholders\": [\"US\",\"China\",\"NVIDIA\"],\n      \"temporalScope\": { \"start\": \"2024-01-01\", \"end\": \"2025-12-31\" },\n      \"confidenceThreshold\": 0.5\n    },\n    \"sourceConfig\": {\n      \"include_perplexity\": true,\n      \"include_academic\": false,\n      \"include_news\": false,\n      \"include_firecrawl\": true,\n      \"maxSources\": 6\n    }\n  }" | sed 's/\n/ /g')
if command -v jq >/dev/null 2>&1; then echo "$resp" | jq -r '.'; else echo "$resp"; fi

echo "Done."

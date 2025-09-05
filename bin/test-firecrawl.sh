#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_URL:?must be set}"
: "${SUPABASE_ANON_KEY:?must be set}"

RUN_ID_SEARCH="00000000-0000-0000-0000-000000000001"
RUN_ID_SCRAPE="00000000-0000-0000-0000-000000000002"

echo "[1] Firecrawl Research: search"
resp1=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/firecrawl-research" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{\n    \"runId\": \"$RUN_ID_SEARCH\",\n    \"mode\": \"search\",\n    \"query\": \"Apple AI strategy competition markets\",\n    \"config\": { \"maxPages\": 5, \"returnFormat\": \"markdown\", \"includeMetadata\": true, \"extractSchemas\": false },\n    \"context\": { \"domain\": \"strategic-research\", \"stakeholders\": [\"researcher\",\"analyst\"], \"strategicContext\": \"Apple AI strategy\" }\n  }" | sed 's/\n/ /g')
if command -v jq >/dev/null 2>&1; then echo "$resp1" | jq -r '.'; else echo "$resp1"; fi

sleep 1

echo "[2] Firecrawl Research: scrape (concurrent/paced)"
resp2=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/firecrawl-research" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{\n    \"runId\": \"$RUN_ID_SCRAPE\",\n    \"mode\": \"scrape\",\n    \"urls\": [\"https://openai.com\",\"https://anthropic.com\",\"https://deepmind.google\"],\n    \"config\": { \"returnFormat\": \"markdown\", \"includeMetadata\": true, \"extractSchemas\": true },\n    \"context\": { \"domain\": \"web-analysis\", \"stakeholders\": [\"intelligence-analyst\"], \"strategicContext\": \"Strategic web research\" }\n  }" | sed 's/\n/ /g')
if command -v jq >/dev/null 2>&1; then echo "$resp2" | jq -r '.'; else echo "$resp2"; fi

echo "Done."

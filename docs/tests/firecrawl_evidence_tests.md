# Firecrawl + Evidence Retrieval Test Plan (curl)

Prereqs
- Set env: SUPABASE_URL, SUPABASE_ANON_KEY, FIRECRAWL_API_KEY (Edge), PERPLEXITY_API_KEY (Edge optional)
- Deploy RPC migration 20250903_0009_evidence_metrics_rpcs.sql

## 1) Firecrawl Research — Search
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/firecrawl-research" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "runId": "00000000-0000-0000-0000-000000000001",
    "mode": "search",
    "query": "Apple AI strategy competition markets",
    "config": { "maxPages": 5, "returnFormat": "markdown", "includeMetadata": true, "extractSchemas": false },
    "context": { "domain": "strategic-research", "stakeholders": ["researcher","analyst"], "strategicContext": "Apple AI strategy" }
  }' | jq -r '.'
```
Checks
- ok=true
- response.processingStats.apiCalls >= 1
- evidence[].url present

## 2) Firecrawl Research — Scrape (Concurrent/Paced)
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/firecrawl-research" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "runId": "00000000-0000-0000-0000-000000000002",
    "mode": "scrape",
    "urls": ["https://openai.com","https://anthropic.com","https://deepmind.google"],
    "config": { "returnFormat": "markdown", "includeMetadata": true, "extractSchemas": true },
    "context": { "domain": "web-analysis", "stakeholders": ["intelligence-analyst"], "strategicContext": "Strategic web research" }
  }' | jq -r '.'
```
Checks
- evidence length >= 2
- processingStats.pagesScraped equals evidence length

## 3) Evidence Retrieval — Perplexity Primary + Firecrawl Fallback
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/evidence-retrieval" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "runId": "00000000-0000-0000-0000-000000000003",
    "query": "Implications of U.S. export controls on AI chips in China 2024-2025",
    "contextualFactors": {
      "domain": "geopolitics",
      "stakeholders": ["US","China","NVIDIA"],
      "temporalScope": { "start": "2024-01-01", "end": "2025-12-31" },
      "confidenceThreshold": 0.5
    },
    "sourceConfig": {
      "include_perplexity": true,
      "include_academic": false,
      "include_news": false,
      "include_firecrawl": true,
      "maxSources": 6
    }
  }' | jq -r '.'
```
Checks
- ok=true
- evidence_set length > 0
- temporal filtering honored (dates within window)

Troubleshooting
- 401: ensure Supabase anon key and URL are correct; in Edge logs confirm function deployed
- Timeouts: verify Edge has outgoing internet access; check `FIRECRAWL_API_KEY` and `PERPLEXITY_API_KEY`
- DB errors: ensure RPC migration applied and service role set for Edge write operations

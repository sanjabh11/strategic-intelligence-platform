# Test Evidence: PBI-02-02 Secure External Retrievals + Env Toggles

Timestamp: 2025-08-26T20:39:30+05:30

## 1) System Status
Command:
```
curl -s -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "apikey: $VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_URL/functions/v1/system-status"
```
Output (excerpt):
```json
{"overall_status":"healthy","timestamp":"2025-08-26T15:12:47.446Z","components":{"database":{"status":"healthy","info":{"reachable":true,"runs_count":182,"features_count":7}},"edge_functions":{"status":"healthy","info":{"uptime_sec":0}},"worker_service":{"status":"unknown"},"external_apis":{"status":"unknown"}}}
```

## 2) Health
Command:
```
curl -s -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "apikey: $VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_URL/functions/v1/health"
```
Output:
```json
{"schema_ok":true,"version":"2025-08-26","checks":[{"name":"db_connectivity","status":"ok"},{"name":"policies","status":"ok","detail":"RLS enabled with read_anon_* policies"}]}
```

## 3) Analyze-engine with retrievals disabled
Secrets:
```
EDGE_ENABLE_RETRIEVALS=false
```
Command:
```
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"Test retrievals disabled"}' | jq '{retrieval_count: .analysis.retrieval_count, provenance: .analysis.provenance, ok: .ok}'
```
Output:
```json
{
  "retrieval_count": 0,
  "provenance": {
    "evidence_backed": false,
    "retrieval_count": 0,
    "model": "edge-mvp-1.0",
    "warning": "external retrieval disabled: EDGE_ENABLE_RETRIEVALS=false"
  },
  "ok": true
}
```

## 4) Analyze-engine with retrievals enabled (success path)
Secrets:
```
EDGE_ENABLE_RETRIEVALS=true
EDGE_RETRIEVAL_TIMEOUT_MS=15000
```
Command:
```
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"US AI executive order summary today"}' | jq '{retrieval_count: .analysis.retrieval_count, warning: .analysis.provenance.warning, evidence_backed: .analysis.provenance.evidence_backed, retrievals: .analysis.retrievals}'
```
Output (excerpt):
```json
{
  "retrieval_count": 5,
  "warning": null,
  "evidence_backed": true,
  "retrievals": [
    {"id":"https://www.orrick.com/en/Insights/2025/08/How-Trumps-AI-Action-Plan-and-Executive-Orders-Will-Impact-US-Technology-and-Federal-Procurement","title":"orrick.com","url":"https://www.orrick.com/en/Insights/2025/08/How-Trumps-AI-Action-Plan-and-Executive-Orders-Will-Impact-US-Technology-and-Federal-Procurement"},
    {"id":"https://natlawreview.com/article/trump-administration-issues-ai-action-plan-and-ai-executive-orders","title":"natlawreview.com","url":"https://natlawreview.com/article/trump-administration-issues-ai-action-plan-and-ai-executive-orders"}
  ]
}
```

## 5) Explicit timeout path
Secrets:
```
EDGE_ENABLE_RETRIEVALS=true
EDGE_RETRIEVAL_TIMEOUT_MS=1
```
Command:
```
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"Connectivity test"}' | jq '{retrieval_count: .analysis.retrieval_count, warning: .analysis.provenance.warning}'
```
Output:
```json
{
  "retrieval_count": 0,
  "warning": "retrieval timeout"
}
```

## 6) Restored defaults (disabled again)
Secrets:
```
EDGE_ENABLE_RETRIEVALS=false
EDGE_RETRIEVAL_TIMEOUT_MS=8000
```
Command:
```
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"Final disabled confirmation"}' | jq '{retrieval_count: .analysis.retrieval_count, warning: .analysis.provenance.warning}'
```
Output:
```json
{
  "retrieval_count": 0,
  "warning": "external retrieval disabled: EDGE_ENABLE_RETRIEVALS=false"
}
```

## 7) UI verification (frontend)
Timestamp: 2025-08-26T21:10:12+05:30

Observed on local dev (Vite):
- Per `PerplexityDashboard` empty state rendered with text: "No external sources retrieved" and helper line "This analysis was conducted using internal knowledge without external research."
- Scenario input present in `StrategySimulator` textarea confirming UI is interactive.

Notes:
- This corresponds to the disabled retrievals configuration and matches backend outputs above.

# PBI-06: MVP Persistence Test Evidence

- Timestamp: 2025-08-26T19:43:30+05:30
- Project ref: jxdihzqoaxtydolmltdr

## Goal
Verify that `analyze-engine` persists a row and `system-status` reflects the incremented `runs_count`.

## Pre-conditions
- `.env` contains:
  - `VITE_SUPABASE_URL=https://jxdihzqoaxtydolmltdr.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon JWT>`
- Functions secret set (server-side):
  - `EDGE_SUPABASE_SERVICE_ROLE_KEY=<service role JWT>`

## Evidence Commands

Read current runs_count:

```bash
curl -s \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/system-status" | jq .components.database.info.runs_count
```

Trigger analyze-engine with a minimal payload:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{
    "scenario_text": "MVP trigger",
    "players_def": [
      {"id": "P1", "actions": ["A", "B"]},
      {"id": "P2", "actions": ["A", "B"]}
    ],
    "options": { "deterministicSeed": 7 }
  }'
```

Re-read runs_count (expect +1):

```bash
curl -s \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/system-status" | jq .components.database.info.runs_count
```

## Observed Result
- Prior to trigger: 175
- After trigger: 176
- Conclusion: Writes are landing and visible via `system-status`.

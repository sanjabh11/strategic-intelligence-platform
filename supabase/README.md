# Supabase Backend

This directory contains Supabase Edge Functions and SQL migrations for the Strategic Intelligence Platform.

## Prerequisites
- Supabase project (URL and anon key configured in `.env` at repo root)
- Supabase CLI installed and logged in (`supabase login`)

## Functions
- analyze-engine (POST): Runs the analysis engine and returns an AnalysisResult payload synchronously (MVP).
- get-analysis-status (GET): Returns status for a given `request_id`. Currently returns `processing` placeholder (MVP synchronous engine does not emit IDs).
- system-status (GET): Returns runtime info and basic service statuses.
- health (GET): Returns schema checks placeholder; safe to call in production.

### Deploy functions
From repo root:

```bash
# Link to your project if not already
supabase link --project-ref <your-project-ref>

# Deploy functions
supabase functions deploy analyze-engine
supabase functions deploy get-analysis-status
supabase functions deploy system-status
supabase functions deploy health
```

### Invoke locally
```bash
# Using Supabase CLI (auth headers added automatically in linked project)
supabase functions serve analyze-engine

# Or curl against hosted endpoint
curl -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"scenario_text":"Test scenario"}' \
     "$VITE_SUPABASE_URL/functions/v1/analyze-engine"
```

## Database and pgvector
Initial migration enables `pgvector` and creates core tables.

Apply via any of:
- SQL Editor in Supabase dashboard (paste from `sql/0001_init.sql`)
- `psql`/`psql -f supabase/sql/0001_init.sql`

After applying, configure RLS policies per your environment and grant minimal privileges.

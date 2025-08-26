# PBI-06: Key Rotation Plan (Pre-Production)

- Timestamp: 2025-08-26T19:43:30+05:30
- Project ref: jxdihzqoaxtydolmltdr

## Scope
Rotate Supabase anon and service role keys before production, ensuring zero/low downtime for clients and Edge Functions.

## Steps
1) Prepare new keys
   - In Supabase Dashboard → Project Settings → API → rotate keys (start with anon). Note the new JWT values.
2) Update server-side secrets first (Edge Functions)
   - Keep old keys valid temporarily.
   - Set the new keys as secrets:
     ```bash
     supabase secrets set EDGE_SUPABASE_ANON_KEY=<NEW_ANON_JWT> --project-ref jxdihzqoaxtydolmltdr
     supabase secrets set EDGE_SUPABASE_SERVICE_ROLE_KEY=<NEW_SERVICE_ROLE_JWT> --project-ref jxdihzqoaxtydolmltdr
     ```
   - Redeploy functions that read these secrets (defensive):
     ```bash
     supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr
     supabase functions deploy system-status --project-ref jxdihzqoaxtydolmltdr
     supabase functions deploy health --project-ref jxdihzqoaxtydolmltdr
     ```
3) Update client configuration
   - Update `.env` in the frontend with the NEW anon key only:
     ```
     VITE_SUPABASE_URL=https://jxdihzqoaxtydolmltdr.supabase.co
     VITE_SUPABASE_ANON_KEY=<NEW_ANON_JWT>
     ```
   - Rebuild/redeploy the frontend.
4) Validate
   - `system-status` reachable and counts selectable with the new anon key.
   - `analyze-engine` still persists (uses service role via server-side secret).
5) Decommission old keys
   - In Dashboard, revoke old anon/service role keys.

## Notes
- Never place the service role key in `.env` or commit it. It must remain server-side only.
- Rotate anon first, validate, then rotate service role.
- If you use additional secrets (e.g., embeddings providers), rotate them separately and record evidence.

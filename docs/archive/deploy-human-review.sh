#!/bin/bash
# Deploy human-review edge function to Supabase
# Run from repo root: ./deploy-human-review.sh

set -e
cd "$(dirname "$0")"

# Load env
set -a
source ./.env
set +a

echo "=== Deploying human-review to Supabase ==="
echo "Project: jxdihzqoaxtydolmltdr"

# Verify CLI
supabase --version || { echo "Install Supabase CLI first: https://supabase.com/docs/guides/cli"; exit 1; }

# Login (if needed)
echo "=== Checking Supabase login ==="
supabase projects list --project-ref jxdihzqoaxtydolmltdr >/dev/null 2>&1 || supabase login

# Set secrets (using names without SUPABASE_ prefix since CLI blocks those)
echo "=== Setting function secrets ==="
supabase secrets set \
  --project-ref jxdihzqoaxtydolmltdr \
  URL="$VITE_SUPABASE_URL" \
  ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# Deploy
echo "=== Deploying human-review function ==="
supabase functions deploy human-review --project-ref jxdihzqoaxtydolmltdr

# Verify deployment
echo "=== Checking function health ==="
sleep 3
curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/human-review/review_queue" | grep -q "401\|403" && echo "✅ Function reachable (auth required)" || echo "⚠️ Check logs for errors"

echo "=== Done ==="
echo "View logs: https://supabase.com/dashboard/project/jxdihzqoaxtydolmltdr/functions/human-review/logs"

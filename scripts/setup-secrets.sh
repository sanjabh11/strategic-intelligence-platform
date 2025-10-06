#!/bin/bash
# Script to set up Supabase edge function secrets
# Run this once to configure API keys for all edge functions

set -e

echo "🔑 Setting up Supabase edge function secrets..."
echo ""

# Read from .env file
if [ -f .env ]; then
  source .env
else
  echo "❌ Error: .env file not found"
  exit 1
fi

# Set secrets
echo "Setting PERPLEXITY_API_KEY..."
supabase secrets set PERPLEXITY_API_KEY="$PERPLEXITY_API_KEY" --project-ref jxdihzqoaxtydolmltdr

echo "Setting FIRECRAWL_API_KEY..."
supabase secrets set FIRECRAWL_API_KEY="$FIRECRAWL_API_KEY" --project-ref jxdihzqoaxtydolmltdr

echo "Setting GEMINI_API_KEY..."
supabase secrets set GEMINI_API_KEY="$VITE_GEMINI_API_KEY" --project-ref jxdihzqoaxtydolmltdr

echo "Setting GOOGLE_SEARCH_API_KEY..."
supabase secrets set GOOGLE_SEARCH_API_KEY="$GOOGLE_SEARCH_API_KEY" --project-ref jxdihzqoaxtydolmltdr

echo "Setting GOOGLE_CSE_ID..."
supabase secrets set GOOGLE_CSE_ID="$GOOGLE_CSE_ID" --project-ref jxdihzqoaxtydolmltdr

echo "Setting OPENAI_KEY (optional)..."
supabase secrets set OPENAI_KEY="${OPENAI_KEY:-}" --project-ref jxdihzqoaxtydolmltdr || true

echo ""
echo "✅ All secrets configured!"
echo ""
echo "Verify secrets with:"
echo "  supabase secrets list --project-ref jxdihzqoaxtydolmltdr"

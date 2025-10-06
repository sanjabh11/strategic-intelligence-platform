#!/bin/bash
# Script to deploy all edge functions to Supabase
# Use this after fixing CORS headers

set -e

PROJECT_REF="jxdihzqoaxtydolmltdr"

echo "🚀 Deploying all edge functions to Supabase..."
echo "   Project: $PROJECT_REF"
echo ""

# Critical functions first
CRITICAL_FUNCTIONS=(
  "analyze-engine"
  "get-analysis-status"
  "system-status"
  "evidence-retrieval"
  "retrieval"
)

echo "📦 Deploying critical functions..."
for func in "${CRITICAL_FUNCTIONS[@]}"; do
  echo "  Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt || echo "  ⚠️  Failed to deploy $func"
done

echo ""
echo "📦 Deploying strategic engine functions..."

STRATEGIC_FUNCTIONS=(
  "recursive-equilibrium"
  "symmetry-mining"
  "quantum-strategy-service"
  "information-value-assessment"
  "outcome-forecasting"
  "strategy-success-analysis"
  "scale-invariant-templates"
  "temporal-strategy-optimization"
  "dynamic-recalibration"
  "cross-domain-transfer"
)

for func in "${STRATEGIC_FUNCTIONS[@]}"; do
  echo "  Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt || echo "  ⚠️  Failed to deploy $func"
done

echo ""
echo "📦 Deploying utility functions..."

UTILITY_FUNCTIONS=(
  "firecrawl-research"
  "pattern-symmetry-mining"
  "notebook-export"
  "teacher-packet"
  "strategic-playbook"
  "sensitivity-analysis"
  "collective-aggregation"
  "collective-intelligence"
  "collective-stats"
  "share-strategy"
  "game-monitoring"
  "bayes-belief-updating"
  "human-review"
  "process-queue"
)

for func in "${UTILITY_FUNCTIONS[@]}"; do
  echo "  Deploying $func..."
  supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt || echo "  ⚠️  Failed to deploy $func"
done

echo ""
echo "📦 Deploying new functions..."

NEW_FUNCTIONS=(
  "strategy-cross-pollination"
  "collective-intelligence-aggregator"
)

for func in "${NEW_FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$func" ]; then
    echo "  Deploying $func..."
    supabase functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt || echo "  ⚠️  Failed to deploy $func"
  else
    echo "  ⚠️  Skipping $func (not found)"
  fi
done

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Test with:"
echo "  curl https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/system-status"

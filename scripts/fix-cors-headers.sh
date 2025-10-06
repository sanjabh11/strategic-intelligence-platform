#!/bin/bash
# Script to fix CORS headers in all edge functions
# Adds 'apikey' to Access-Control-Allow-Headers

set -e

echo "🔧 Fixing CORS headers in all edge functions..."

FUNCTIONS_DIR="supabase/functions"

# List of functions that need CORS header fix
FUNCTIONS=(
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
  "evidence-retrieval"
  "firecrawl-research"
  "pattern-symmetry-mining"
  "notebook-export"
  "teacher-packet"
  "strategic-playbook"
  "sensitivity-analysis"
  "collective-aggregation"
  "game-monitoring"
  "bayes-belief-updating"
  "collective-intelligence"
  "collective-stats"
  "share-strategy"
)

for func in "${FUNCTIONS[@]}"; do
  FILE="$FUNCTIONS_DIR/$func/index.ts"
  
  if [ -f "$FILE" ]; then
    echo "  Fixing $func..."
    
    # Replace old CORS headers with new ones
    sed -i.bak "s/'Access-Control-Allow-Headers': 'Content-Type, Authorization'/'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'/g" "$FILE"
    
    # Remove backup file
    rm -f "$FILE.bak"
    
    echo "  ✅ Fixed $func"
  else
    echo "  ⚠️  Skipping $func (file not found)"
  fi
done

echo ""
echo "✅ CORS headers fixed in all functions!"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff supabase/functions"
echo "2. Deploy functions: supabase functions deploy [function-name]"
echo "3. Or deploy all: ./scripts/deploy-all-functions.sh"

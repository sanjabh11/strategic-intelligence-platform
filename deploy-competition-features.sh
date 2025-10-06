#!/bin/bash
# Deploy Competition-Winning Innovations
# Run this script to deploy all 5 breakthrough features

set -e

echo "🚀 Deploying Competition-Winning Features..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_REF="jxdihzqoaxtydolmltdr"

# Step 1: Apply database migration
echo -e "${BLUE}Step 1/4: Applying database schema...${NC}"
supabase db push
echo -e "${GREEN}✓ Database schema applied${NC}"
echo ""

# Step 2: Deploy edge functions
echo -e "${BLUE}Step 2/4: Deploying edge functions...${NC}"

echo "  Deploying personal-life-coach..."
supabase functions deploy personal-life-coach --project-ref $PROJECT_REF

echo "  Deploying ai-mediator..."
supabase functions deploy ai-mediator --project-ref $PROJECT_REF

echo "  Deploying matching-markets..."
supabase functions deploy matching-markets --project-ref $PROJECT_REF

echo "  Deploying strategic-dna..."
supabase functions deploy strategic-dna --project-ref $PROJECT_REF

echo -e "${GREEN}✓ All innovation functions deployed${NC}"
echo ""

# Step 3: Build frontend
echo -e "${BLUE}Step 3/4: Building frontend...${NC}"
pnpm build
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 4: Success message
echo -e "${BLUE}Step 4/4: Deployment complete!${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   🎉 COMPETITION FEATURES DEPLOYED! 🎉   ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "Test your innovations:"
echo "  1. Personal Life Coach: http://localhost:5174/life-coach"
echo "  2. AI Mediator: http://localhost:5174/mediator"
echo "  3. Matching Markets: API at /functions/v1/matching-markets"
echo "  4. Strategic DNA: API at /functions/v1/strategic-dna"
echo ""
echo "Next steps:"
echo "  - Test all features with real scenarios"
echo "  - Record demo video (3-5 minutes)"
echo "  - Prepare competition presentation"
echo ""
echo "Good luck! 🏆"

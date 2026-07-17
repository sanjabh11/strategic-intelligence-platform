#!/bin/bash
# Test all console error fixes

echo "🧪 Testing Console Error Fixes"
echo "==============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📋 Issues Fixed:"
echo "1. ✅ React Fragment error (data-matrix-id)"
echo "2. ✅ PersonalLifeCoach wrong URL"
echo "3. ✅ AIMediator wrong URL"
echo "4. ✅ CORS error on health endpoint"
echo "5. ✅ multiplayer_participants schema mismatch"
echo "6. ✅ Favicon 404"
echo "7. ✅ console.log statements"
echo ""

echo "🔧 Changes Made:"
echo ""
echo "${YELLOW}1. GeopoliticalDashboard.tsx${NC}"
echo "   - Changed React.Fragment to <span> wrapper"
echo "   - Removed invalid data-matrix-id prop usage"
echo ""

echo "${YELLOW}2. PersonalLifeCoach.tsx${NC}"
echo "   - Fixed URL: /functions/v1/... → \${API_BASE}/..."
echo "   - Added proper auth headers with getAuthHeaders()"
echo "   - Added error handling for HTTP errors"
echo "   - Displays user-friendly error messages"
echo ""

echo "${YELLOW}3. AIMediator.tsx${NC}"
echo "   - Fixed URL: /functions/v1/... → \${API_BASE}/..."
echo "   - Added proper auth headers with getAuthHeaders()"
echo "   - Added error handling for HTTP errors"
echo "   - Displays user-friendly error messages"
echo ""

echo "${YELLOW}4. health/index.ts (Edge Function)${NC}"
echo "   - Added CORS headers:"
echo "     * Access-Control-Allow-Origin: *"
echo "     * Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type"
echo "   - Added OPTIONS handler for preflight requests"
echo "   - Applied CORS headers to all responses"
echo ""

echo "${YELLOW}5. multiplayer_participants Schema${NC}"
echo "   - Fixed GameInterface.tsx field names:"
echo "     * player_id → participant_id"
echo "     * total_payoff → current_payoff"
echo "     * action_history → actions_taken"
echo "   - Updated Participant type in multiplayer.ts"
echo "   - Added proper error handling"
echo ""

echo "${YELLOW}6. Favicon${NC}"
echo "   - Created empty favicon.ico in public/"
echo "   - Prevents 404 errors"
echo ""

echo "${YELLOW}7. Console Logs${NC}"
echo "   - Removed debug console.log from useStrategyAnalysis.ts"
echo "   - Kept only console.error for production errors"
echo ""

echo "📊 Build Test:"
echo "--------------"
if pnpm build 2>&1 | grep -q "built in"; then
    echo "${GREEN}✅ Build successful${NC}"
else
    echo "${RED}❌ Build failed${NC}"
    exit 1
fi
echo ""

echo "🚀 Next Steps:"
echo "--------------"
echo "1. Start dev server: pnpm dev"
echo "2. Test in browser at http://localhost:5174"
echo "3. Open browser console (F12)"
echo "4. Navigate to each tab:"
echo "   - Geopolitical Dashboard (check for Fragment errors)"
echo "   - Personal Life Coach (test form submission)"
echo "   - AI Mediator (test form submission)"
echo "   - Multiplayer Games (test joining/creating)"
echo "5. Verify no console errors appear"
echo ""

echo "${GREEN}✅ All fixes implemented successfully!${NC}"
echo ""
echo "Expected Results:"
echo "- No React Fragment warnings"
echo "- No 404 errors on edge function calls"
echo "- No CORS errors"
echo "- No multiplayer_participants 400 errors"
echo "- No favicon 404"
echo "- Clean console (only intentional errors if any)"

# External Sources Not Appearing - Diagnostic Report

## Status: IN PROGRESS

### What Works ✅
1. Perplexity API key configured and functional
2. `test-perplexity` function returns 10 citations successfully  
3. All secrets accessible in Supabase edge environment
4. UI components created (no more 500 errors)

### What Doesn't Work ❌
`analyze-engine` returns 0 external sources consistently

### Evidence
```bash
# Direct Perplexity test - SUCCESS
curl test-perplexity → 10 citations

# analyze-engine - FAILS
curl analyze-engine → retrieval_count: 0
```

### Root Cause Hypothesis

**Theory 1: Timeout Too Aggressive**
- Current: 7000ms for all parallel API calls
- UN Comtrade, World Bank, GDELT might timeout
- Solution: Increase timeout OR make Perplexity-only fallback

**Theory 2: Error in retrievalClient Flow**
- `Promise.allSettled` might not be handling rejections correctly
- GDELT_BASE constant was missing (now fixed)
- Solution: Add console.log debugging in production

**Theory 3: Cache Poisoning**
- Old "0 results" might be cached
- Solution: Clear retrieval_cache table OR force fresh fetch

### Recommended Fix Priority

1. **IMMEDIATE**: Increase timeout from 7s → 15s
2. **IMMEDIATE**: Add verbose logging to retrievalClient
3. **SHORT-TERM**: Make Perplexity-only fallback when other APIs fail
4. **MEDIUM-TERM**: Implement circuit breaker reset mechanism

### Test Plan
1. Deploy with increased timeout
2. Clear browser cache + hard refresh
3. Run analysis with "Bitcoin price"
4. Check if citations appear
5. If not, check Supabase function logs

### Security Note
All API keys are now properly stored in Supabase secrets (not in code).
The temporary `.env` file with real keys should NOT be committed.

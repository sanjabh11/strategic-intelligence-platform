# 🚀 Strategic Intelligence Platform - Final Deployment Guide

## 🎯 Root Cause Analysis

**Issue**: All tests failing with old function behavior (missing audience, cache_hit, solver_invocations)

**Root Cause**: Edge Function still running old version - deployment not completed

**Solution**: Follow the step-by-step deployment process below

## 📋 Complete Deployment Checklist

### ✅ PREP: Required Credentials & Access
- [ ] SUPABASE_URL
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] PERPLEXITY_KEY
- [ ] GEMINI_API_KEY
- [ ] Supabase Dashboard access

### 1️⃣ Apply Database Migration
**Location**: Supabase Dashboard → SQL Editor

```sql
-- Add solver-related columns (idempotent)
ALTER TABLE IF EXISTS analysis_runs
  ADD COLUMN IF NOT EXISTS solver_invocations JSONB,
  ADD COLUMN IF NOT EXISTS solver_results JSONB;

CREATE INDEX IF NOT EXISTS idx_analysis_runs_solver_invocations
  ON analysis_runs USING GIN (solver_invocations)
  WHERE solver_invocations IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analysis_runs_solver_results
  ON analysis_runs USING GIN (solver_results)
  WHERE solver_results IS NOT NULL;

COMMENT ON COLUMN analysis_runs.solver_invocations IS 'Array of solver calls made during analysis with timing and results';
COMMENT ON COLUMN analysis_runs.solver_results IS 'Consolidated results from game theory solvers (Nashpy, Axelrod, etc.)';
```

**Expected**: ✅ Migration runs successfully with no errors

### 2️⃣ Deploy Edge Function
**Method A: Supabase Dashboard (Recommended)**
1. Navigate: Supabase → Edge Functions → analyze-engine
2. Click "Edit" → Replace entire code with `supabase/functions/analyze-engine/index.ts`
3. Click "Save" → "Deploy"
4. Monitor logs until "compiled successfully"

**Method B: CLI**
```bash
supabase login
supabase functions deploy analyze-engine --project-ref <PROJECT_REF> --no-verify
```

### 3️⃣ Verify Environment Variables
**Location**: Supabase Dashboard → Edge Functions → analyze-engine → Settings → Environment

Required variables:
```
SUPABASE_URL=https://jxdihzqoaxtydolmltdr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PERPLEXITY_KEY=<your-perplexity-key>
GEMINI_API_KEY=<your-gemini-key>
OPENAI_KEY=<your-openai-key>
```

### 4️⃣ Clear Frontend Cache
- Hard refresh browser (Ctrl/Cmd+Shift+R)
- Clear browser cache
- If using CDN, purge API endpoint cache

### 5️⃣ Run Automated Verification
```bash
# Set environment variables
export SUPABASE_URL="https://jxdihzqoaxtydolmltdr.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"

# Run verification script
node test_postdeploy.js
```

**Expected Output:**
```
1) Audience validation (invalid audience): expect 400
Status: 400
✅ PASS: YES

2) Cache bypass (forceFresh): expect provenance.cache_hit === false
Status: 200
Cache Hit: false
Audience: learner
✅ PASS: YES

3) Prisoner Dilemma solver (expect solver_invocations)
Status: 200
Solver Invocations: [{"name":"nashpy","ok":true,"duration_ms":150}]
✅ PASS: YES
```

### 6️⃣ Database Verification Queries

```sql
-- Check run rows
SELECT id, run_id, audience, provenance, solver_invocations, created_at
FROM analysis_runs
WHERE run_id IN ('test_gold_auto','test_pd_auto')
ORDER BY created_at DESC;

-- Check retrievals used
SELECT id, source, retrieval_id, score, retrieved_at
FROM retrieval_cache
WHERE retrieval_id = ANY(
  (SELECT (provenance->'used_retrieval_ids')::text[] FROM analysis_runs WHERE run_id='test_gold_auto')
);

-- Check cache behavior
SELECT run_id, (provenance->>'cache_hit')::boolean AS cache_hit,
       (provenance->>'retrieval_count')::int as retrieval_count
FROM analysis_runs
WHERE run_id = 'test_gold_auto';
```

## 🧪 Manual Test Commands

### Test 1: Audience Validation
```bash
curl -X POST "https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine" \
  -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Test","audience":"invalid"}'
# Expected: 400 invalid_audience
```

### Test 2: Cache Bypass
```bash
curl -X POST "https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine" \
  -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Gold price","audience":"learner","options":{"forceFresh":true}}'
# Expected: provenance.cache_hit = false
```

### Test 3: Solver Integration
```bash
curl -X POST "https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine" \
  -H "Authorization: Bearer <SERVICE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Prisoner'\''s Dilemma","audience":"researcher"}'
# Expected: solver_invocations present
```

## 🔍 Troubleshooting

### Issue: Still seeing old behavior
1. **Check function logs**: Verify new deployment timestamp
2. **Verify environment variables**: Missing keys cause fallback behavior
3. **Check database migration**: Ensure columns were added
4. **Clear frontend cache**: Browser/CDN may cache old responses

### Issue: Function deployment fails
1. **Check build logs**: Look for compilation errors
2. **Verify project reference**: Ensure correct PROJECT_REF
3. **Check permissions**: Service role key may be incorrect

### Issue: Database writes fail
1. **Verify service role key**: Must have write permissions
2. **Check table permissions**: analysis_runs table access
3. **Verify migration**: Columns must exist before writes

## 📊 Expected Post-Deployment Results

### Successful Deployment Indicators:
- ✅ **Audience validation**: 400 errors for invalid audiences
- ✅ **Cache bypass**: `cache_hit: false` for `forceFresh: true`
- ✅ **Solver integration**: Nashpy calls for canonical games
- ✅ **Schema compliance**: Audience-specific response structures
- ✅ **Evidence tracking**: `used_retrieval_ids` and `retrieval_sources`

### Sample Response Structure:
```json
{
  "ok": true,
  "analysis": {
    "audience": "researcher",
    "long_summary": { "text": "..." },
    "simulation_results": { "equilibria": [...] }
  },
  "provenance": {
    "cache_hit": false,
    "evidence_backed": true,
    "solver_invocations": [
      {
        "name": "nashpy",
        "ok": true,
        "duration_ms": 150
      }
    ],
    "retrieval_sources": ["uncomtrade", "worldbank"],
    "used_retrieval_ids": ["rid_uncomtrade_2024", "rid_worldbank_2024"]
  }
}
```

## 🚀 CI/CD Automation (Optional)

Add these secrets to GitHub repository:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`

The `.github/workflows/deploy.yml` file will automatically:
- Deploy function on code changes
- Run post-deployment tests
- Notify on failures

## ✅ Final Validation Checklist

- [ ] Database migration applied successfully
- [ ] Edge function deployed with new code
- [ ] Environment variables configured
- [ ] Frontend cache cleared
- [ ] Automated tests pass (`node test_postdeploy.js`)
- [ ] Manual API tests return expected responses
- [ ] Database queries show correct provenance data
- [ ] Solver invocations working for canonical games

## 🎉 Success Criteria

**Deployment is successful when:**
1. All automated tests pass
2. Database shows proper provenance fields
3. Solver integrations work for canonical games
4. Cache bypass functions correctly
5. Audience-specific schemas are enforced

**The implementation is now ready for production use!** 🚀
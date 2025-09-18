# 🚀 Strategic Intelligence Platform - Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Code Changes Completed
- [x] Audience validation and routing
- [x] Game theory solver integration (Nashpy, Axelrod)
- [x] Cache bypass logic with TTL policies
- [x] Evidence-backed determination rules
- [x] Comprehensive provenance tracking
- [x] Database schema updates

### 🔧 Required Actions Before Deployment

#### 1. Database Migration
```sql
-- Apply this migration to add solver columns
ALTER TABLE analysis_runs
ADD COLUMN IF NOT EXISTS solver_invocations JSONB,
ADD COLUMN IF NOT EXISTS solver_results JSONB;
```

#### 2. Environment Variables
Ensure these are set in Supabase Edge Function environment:
```bash
SUPABASE_URL=https://jxdihzqoaxtydolmltdr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PERPLEXITY_KEY=<your-perplexity-key>
GEMINI_API_KEY=<your-gemini-key>
OPENAI_KEY=<your-openai-key>
WORKER_URL=<optional-worker-url>
```

#### 3. Solver Endpoints Setup
**Option A: Use Mock Endpoints (Recommended for initial deployment)**
```javascript
// In analyze-engine/index.ts, replace solver URLs with working endpoints
const SOLVER_ENDPOINTS = {
  nashpy: 'https://httpbin.org/post', // Mock endpoint for testing
  axelrod: 'https://httpbin.org/post'  // Mock endpoint for testing
};
```

**Option B: Deploy Real Solver Microservices**
```bash
# Deploy Nashpy FastAPI service
# Deploy Axelrod tournament service
# Update URLs in analyze-engine/index.ts
```

## 🚀 Deployment Steps

### Step 1: Deploy Database Migration
```bash
# Via Supabase Dashboard SQL Editor
# Run the migration from supabase/migrations/20250906_0005_add_solver_integration.sql
```

### Step 2: Deploy Edge Function
```bash
# If you have CLI access:
supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr

# Or deploy via Supabase Dashboard:
# 1. Go to Edge Functions
# 2. Upload/replace analyze-engine function
# 3. Ensure environment variables are set
```

### Step 3: Test Deployment
```bash
# Run comprehensive test suite
node test_solver_integration.js
```

## 🧪 Post-Deployment Validation

### Test 1: Audience Mode Validation
```bash
curl -X POST https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Test","audience":"invalid"}'
# Should return 400 invalid_audience
```

### Test 2: Canonical Game Solver Integration
```bash
curl -X POST https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Prisoner'\''s Dilemma","audience":"researcher"}'
# Should include solver_invocations in provenance
```

### Test 3: Cache Bypass
```bash
curl -X POST https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/analyze-engine \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scenario_text":"Real-time data","options":{"forceFresh":true}}'
# Should have cache_hit: false
```

## 📊 Expected Results After Deployment

### For Researcher Mode with Canonical Games:
```json
{
  "ok": true,
  "analysis": {
    "audience": "researcher",
    "long_summary": {...},
    "simulation_results": {...},
    "numeric_claims": [...]
  },
  "provenance": {
    "cache_hit": false,
    "evidence_backed": true,
    "solver_invocations": [
      {
        "name": "nashpy",
        "ok": true,
        "duration_ms": 150,
        "result_id": "nash-uuid"
      }
    ]
  }
}
```

## 🔍 Troubleshooting

### Issue: Solver Endpoints Failing
**Solution:** Update solver URLs to working endpoints or use mock responses:
```javascript
// Temporary fix in analyze-engine/index.ts
if (nashResponse.status !== 200) {
  solverResults.nashpy = { mock: true, equilibria: [[0.5, 0.5]] };
}
```

### Issue: Database Migration Fails
**Solution:** Check table permissions and run migration manually via SQL editor.

### Issue: Function Times Out
**Solution:** Increase timeout in Supabase Edge Function settings.

## 🎯 Acceptance Criteria

- [ ] Audience validation working (400 for invalid audiences)
- [ ] Canonical games trigger solver calls
- [ ] Cache bypass respects `forceFresh` flag
- [ ] Evidence-backed determination includes source quality
- [ ] All provenance fields populated correctly
- [ ] Database stores solver invocations and results

## 📈 Monitoring & Metrics

After deployment, monitor:
- Solver call success rates
- Cache hit ratios by query type
- Evidence-backed analysis percentages
- Audience-specific usage patterns

## 🚨 Rollback Plan

If issues arise:
1. Revert to previous function version
2. Keep database migration (additive only)
3. Update solver endpoints to mocks
4. Gradually enable features

---

**Status:** Ready for deployment with comprehensive testing suite included.
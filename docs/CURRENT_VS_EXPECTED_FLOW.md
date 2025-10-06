# Current vs Expected Flow Analysis
**Strategic Intelligence Platform - Flow Comparison**

## Critical Issues Identified

### 1. CORS Headers Blocking All API Calls ❌ **CRITICAL**

**Problem**: Most edge functions missing `'apikey'` in Access-Control-Allow-Headers

**Affected Functions** (25 of 33):
- ❌ recursive-equilibrium
- ❌ symmetry-mining  
- ❌ quantum-strategy-service
- ❌ information-value-assessment
- ❌ outcome-forecasting
- ❌ strategy-success-analysis
- ❌ scale-invariant-templates
- ❌ temporal-strategy-optimization
- ❌ dynamic-recalibration
- ❌ cross-domain-transfer
- ❌ evidence-retrieval
- ❌ firecrawl-research
- ❌ pattern-symmetry-mining
- ❌ notebook-export
- ❌ teacher-packet
- ❌ strategic-playbook
- ❌ sensitivity-analysis
- ❌ collective-aggregation
- ❌ game-monitoring
- And more...

**Working Functions** (8 of 33):
- ✅ analyze-engine (has apikey)
- ✅ system-status (has apikey)
- ✅ retrieval (has apikey)
- ✅ strategy-cross-pollination (new, has apikey)
- ✅ collective-intelligence-aggregator (new, has apikey)

**Impact**: 75% of strategic engines are completely blocked by CORS

---

## Expected vs Current Flow

### EXPECTED FLOW (from PRD)

```
1. User Input
   ↓
2. Strategic Analysis Engine
   ├─→ External Research (Perplexity, Firecrawl, Google)
   │   - Retrieve 5+ authoritative sources
   │   - Extract key facts, numbers, dates
   │   - Build evidence base
   ↓
3. LLM Analysis with Evidence
   - Pattern Recognition Phase
   - Multi-Dimensional Analysis (temporal, information, reputation, network)
   - Symmetric Strategy Discovery (cross-domain analogies)
   - Recursive Equilibrium Computation
   ↓
4. Strategic Engine Enhancement (Parallel)
   ├─→ Recursive Equilibrium Engine
   │   - Multi-agent learning simulation
   │   - Belief depth: 3+ levels
   │   - 500+ iterations
   │
   ├─→ Symmetry Mining Engine
   │   - Cross-domain pattern matching
   │   - Historical success rates
   │   - 5 analogies from different domains
   │
   ├─→ Quantum Strategy Service
   │   - Superposition state modeling
   │   - Entanglement analysis
   │   - Decoherence effects
   │
   ├─→ Information Value Assessment (EVPI)
   │   - Calculate expected value of perfect information
   │   - Identify high-value signals
   │   - Prioritize information gathering
   │
   ├─→ Outcome Forecasting
   │   - 90-day temporal predictions
   │   - Probability decay models
   │   - Confidence intervals
   │
   ├─→ Strategy Success Analysis
   │   - Historical pattern effectiveness
   │   - Context-dependent success rates
   │
   ├─→ Scale-Invariant Templates
   │   - Cross-scale strategy transfer
   │   - Universal pattern application
   │
   └─→ Temporal Optimization
       - Timing recommendations
       - Option value analysis
   ↓
5. Comprehensive Result
   - Players identified
   - Equilibrium computed
   - External sources cited (5+)
   - Cross-domain insights
   - EVPI analysis
   - Outcome forecasts
   - Actionable recommendations
```

### CURRENT FLOW (Broken)

```
1. User Input
   ↓
2. Frontend calls analyze-engine
   ✅ WORKS (has CORS headers)
   ↓
3. analyze-engine processes
   ⚠️ PARTIAL:
   - May or may not call external research
   - Returns basic analysis
   ↓
4. Frontend tries to call Strategic Engines
   ❌ BLOCKED BY CORS:
   - recursive-equilibrium → CORS error
   - symmetry-mining → CORS error  
   - quantum-strategy → CORS error
   - information-value → CORS error
   - outcome-forecasting → CORS error
   - (All fail with "apikey not allowed" error)
   ↓
5. Degraded Result
   - ❌ No external sources ("No external sources retrieved")
   - ❌ No cross-domain insights ("No recommendations available")
   - ❌ No EVPI analysis ("No EVPI highlights available")
   - ❌ No outcome forecasts ("No forecast summary available")
   - ⚠️ Possibly mock/fallback data
```

---

## Detailed Issue Breakdown

### Issue #1: CORS Headers ❌ **BLOCKING 75% OF FUNCTIONALITY**

**Root Cause**: Edge functions return:
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
// Missing 'apikey' !!!
```

**Should be**:
```typescript
'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, X-Client-Info'
```

**Console Errors**:
```
Access to fetch at 'https://jxdihzqoaxtydolmltdr.supabase.co/functions/v1/recursive-equilibrium' 
from origin 'http://localhost:5174' has been blocked by CORS policy: 
Request header field apikey is not allowed by Access-Control-Allow-Headers in preflight response.
```

---

### Issue #2: External Research Not Working ❌

**Expected** (from PRD):
- Perplexity API call for 5+ sources
- Firecrawl for deep web scraping
- Google Search for context
- Evidence-backed analysis with citations

**Current**:
- Message: "No external sources retrieved"
- Message: "This analysis was conducted using internal knowledge without external research"

**Possible Causes**:
1. analyze-engine not calling evidence-retrieval function
2. evidence-retrieval failing silently
3. Perplexity API not configured in edge function environment
4. No fallback error handling

**PRD Requirement** (User Story 1):
```
External research should:
- Query Perplexity API with strategic context
- Retrieve 5+ authoritative sources
- Extract numeric claims with confidence scores
- Link every factual assertion to sources
```

---

### Issue #3: Mock Data Usage ⚠️

**Evidence**:
- Empty results for all strategic engines
- "No recommendations available" everywhere
- Generic/missing insights

**Likely Causes**:
1. Strategic engines return empty/null due to CORS failures
2. Frontend shows default/empty states
3. No graceful degradation messaging

**PRD Expectation**:
- Real-time computation, not mocks
- Evidence-backed predictions
- Confidence intervals on all numbers
- Source citations

---

### Issue #4: Strategic Engines Not Integrated

**Expected** (PRD User Stories 1-4):

**Recursive Equilibrium** (US2):
- Multi-agent learning over 500+ iterations
- Belief depth: 3-5 levels (Theory of Mind)
- Convergence tracking
- **Reality**: CORS blocked, returns null

**Symmetry Mining** (US3):
- 5 cross-domain analogies (military→business, politics→sports, etc.)
- Historical success rates from database
- Structural similarity scoring
- **Reality**: CORS blocked, returns null

**Quantum Strategy** (PRD Innovation #4):
- Superposition state modeling
- Entanglement between players
- Quantum coherence analysis
- **Reality**: CORS blocked, returns null

**Information Value** (US4):
- EVPI calculation (Expected Value of Perfect Information)
- Signal prioritization
- Decision tree analysis
- **Reality**: CORS blocked, returns null

**Outcome Forecasting** (US1):
- 90-day temporal predictions
- Probability decay models (exponential/power-law)
- Confidence bands
- **Reality**: CORS blocked, returns null

---

## Root Cause Analysis

### Why is this happening?

1. **CORS Configuration Inconsistency**
   - Only 8 functions updated with proper CORS headers
   - 25 functions still have old headers
   - Frontend sends 'apikey' header (required for Supabase auth)
   - Backend rejects it in preflight → all calls fail

2. **Missing Environment Variables in Edge Functions**
   - PERPLEXITY_API_KEY might not be set in Supabase edge function secrets
   - FIRECRAWL_API_KEY might not be configured
   - Edge functions run in isolated environment, need explicit secrets

3. **No Graceful Degradation**
   - When strategic engines fail, UI shows empty states
   - Should show: "Strategic engine temporarily unavailable" or retry logic
   - Should fallback to basic analysis with clear warning

4. **External Research Not Triggered**
   - analyze-engine may not be calling evidence-retrieval
   - Or evidence-retrieval is failing silently
   - No error propagation to user

---

## Expected Feature Checklist (from PRD)

### User Story 1: Universal Strategic Decision Engine
- [ ] **Automatic player identification** - Working?
- [ ] **Strategy enumeration** - Working?
- [ ] **Real-time Nash equilibrium** - BLOCKED by CORS
- [ ] **Cross-domain pattern recognition** - BLOCKED by CORS
- [ ] **Outcome probability forecasting** - BLOCKED by CORS
- [ ] **Confidence intervals** - Missing
- [ ] **External research** - NOT WORKING

### User Story 2: Multi-Agent Recursive Prediction
- [ ] **Multi-agent learning simulation** - BLOCKED by CORS
- [ ] **Recursive strategy adaptation** - BLOCKED by CORS
- [ ] **Long-term equilibrium tracking** - BLOCKED by CORS
- [ ] **Meta-game awareness** - BLOCKED by CORS
- [ ] **Strategy cross-pollination** - NEW FUNCTION CREATED (needs deployment)

### User Story 3: Symmetric Strategy Mining
- [ ] **Cross-domain pattern matching** - BLOCKED by CORS
- [ ] **Historical success rate analysis** - DATABASE SEEDED (needs CORS fix)
- [ ] **Analogical reasoning** - BLOCKED by CORS
- [ ] **Confidence scoring** - BLOCKED by CORS
- [ ] **Symmetry detection** - BLOCKED by CORS

### User Story 4: Real-Time Adaptation
- [ ] **Real-time Bayesian updating** - BLOCKED by CORS
- [ ] **Dynamic strategy recalibration** - BLOCKED by CORS
- [ ] **Information value assessment (EVPI)** - BLOCKED by CORS
- [ ] **Temporal strategy optimization** - BLOCKED by CORS
- [ ] **Adaptive signaling** - NOT IMPLEMENTED

### User Story 5: Collective Intelligence
- [ ] **Anonymous strategy sharing** - Working (table exists)
- [ ] **Collective pattern recognition** - NEW FUNCTION CREATED (needs deployment)
- [ ] **Meta-analysis of success rates** - NEW FUNCTION CREATED (needs deployment)
- [ ] **Privacy-preserving learning** - Partial
- [ ] **Distributed simulation** - NOT IMPLEMENTED

**Overall Feature Completion**: ~15% functional (due to CORS blocking 75% of features)

---

## Why Search is Not Activated

### Expected Search Flow:
1. analyze-engine receives request
2. Calls evidence-retrieval or firecrawl-research
3. evidence-retrieval calls Perplexity API with query
4. Returns 5+ sources with snippets
5. LLM uses sources to back claims
6. Citations shown in UI

### Current Search Flow:
1. analyze-engine receives request ✅
2. ❓ May or may not call evidence-retrieval
3. ❌ If called, might fail due to:
   - PERPLEXITY_API_KEY not set in edge function environment
   - Error handling swallows failures
   - Timeout issues
4. ❌ Returns: "No external sources retrieved"

### Proof Search Is Not Working:
- Console message: "No external sources retrieved"
- Console message: "This analysis was conducted using internal knowledge"
- No retrievals array in response
- No citations anywhere in output

---

## Implementation Priority

### PHASE 1: CRITICAL FIXES (DO IMMEDIATELY)

**1. Fix CORS Headers** (30 minutes)
- Update all 25 edge functions with proper CORS headers
- Add 'apikey' to Access-Control-Allow-Headers
- This unblocks 75% of functionality

**2. Configure Edge Function Secrets** (15 minutes)
```bash
supabase secrets set PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
supabase secrets set FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY}
supabase secrets set GEMINI_API_KEY=${GEMINI_API_KEY}
supabase secrets set GOOGLE_SEARCH_API_KEY=${GOOGLE_SEARCH_API_KEY}
supabase secrets set GOOGLE_CSE_ID=${GOOGLE_CSE_ID}
```

**3. Verify analyze-engine Calls Evidence Retrieval** (30 minutes)
- Check if analyze-engine actually calls evidence-retrieval
- Add proper error handling
- Add logging for debugging

### PHASE 2: TESTING (30 minutes)

**4. Test Full Flow**
- Run analysis with real scenario
- Verify external sources retrieved
- Verify all strategic engines return data
- Verify UI shows all sections

### PHASE 3: ENHANCEMENTS (Later)

**5. Add Graceful Degradation**
- Show proper error messages when engines fail
- Add retry logic
- Display partial results with warnings

**6. Deploy New Functions**
- strategy-cross-pollination
- collective-intelligence-aggregator
- Apply database migration for strategic patterns

---

## Success Criteria

After fixes, user should see:

✅ **External Sources Section**:
- 5+ sources from Perplexity
- Titles, URLs, snippets
- Confidence scores

✅ **Cross-Domain Recommendations**:
- 3-5 strategic analogies
- From different domains (military, business, politics)
- Success rates and structural similarity

✅ **EVPI Analysis**:
- Expected value calculations
- High-value signals identified
- Information gathering priorities

✅ **Outcome Forecast**:
- Probability curves over time
- Confidence bands
- Temporal decay models

✅ **No CORS Errors** in console

✅ **No "Not Available" messages** in UI

---

*Generated: 2025-10-05 | Critical Flow Analysis*

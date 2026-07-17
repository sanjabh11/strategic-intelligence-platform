# QA Checklist: Education PBI Implementation

## Quick Reference: Files to Test

| Component | File Path | Key Exports |
|-----------|-----------|-------------|
| Types | `src/types/education.ts` | ProvenanceCategory, EducationMode, ModeContext |
| Matrix Lab | `src/lib/matrixLab.ts` | findBestResponse, findNashEquilibrium, generateCanonicalGame |
| Concept System | `src/lib/conceptSystem.ts` | getConcept, getMisconceptions, getWorkedExample |
| Provenance UI | `src/components/ProvenanceBadge.tsx` | ProvenanceBadge, ProvenanceBanner |
| Teaching Flow | `src/components/GameTreeTeachingFlow.tsx` | GameTreeTeachingFlow |
| Education Helpers | `src/lib/educationHelpers.ts` | buildEducationForecast, educationHeuristicWeight |
| LTI Security | `supabase/functions/lti-launch/index.ts` | verifyLTIToken, fetchJWKS |

## Critical Test Cases

### 1. Provenance System
- [ ] Badge renders with `category="canonical_education"` shows green checkmark
- [ ] Badge renders with `category="simulated_demo"` shows yellow warning
- [ ] ProvenanceBanner accepts only: `category`, `stepByStepAvailable`, `onShowSteps`, `className`
- [ ] Invalid category prop throws TypeScript error

### 2. Matrix Lab (Deterministic)
- [ ] `generateCanonicalGame('prisonersDilemma')` returns same matrix every call
- [ ] `findBestResponse(pdMatrix, 'row', 0)` returns `['D']`
- [ ] `findPureStrategyNash(pdMatrix)` finds (D,D) equilibrium
- [ ] `isParetoOptimal(pdMatrix, 0, 0)` returns false for (D,D)
- [ ] `isParetoOptimal(pdMatrix, 1, 1)` returns true for (C,C)
- [ ] No `Math.random()` calls in any exported function

### 3. GameTreeTeachingFlow
- [ ] Component mounts without lint errors
- [ ] ProvenanceBanner import uses named import `{ ProvenanceBanner }`
- [ ] TEACHING_SCENARIOS has no duplicate keys (Pass vs Pass (0,0) fixed)
- [ ] Navigation through 6 steps works: intro → tree → backward → spe → practice → complete
- [ ] Backward induction demo highlights nodes in correct order

### 4. Education Helpers Integration
- [ ] `useStrategyAnalysis.ts` imports from `educationHelpers.ts`
- [ ] `buildEducationForecast()` returns deterministic agent probabilities
- [ ] Education mode returns identical results on repeated calls
- [ ] Sandbox mode can still use probabilistic results

### 5. LTI Security Hardening
- [ ] `verifyLTIToken()` verifies JWT signature with Web Crypto API
- [ ] `fetchJWKS()` caches results for 1 hour
- [ ] Issuer mismatch returns 401 error
- [ ] Audience mismatch returns 401 error
- [ ] Expired token returns 401 error
- [ ] Deployment ID mismatch returns 401 error
- [ ] Missing `kid` in JWT header throws error
- [ ] RSA key type unsupported throws descriptive error

### 6. ClassroomManager
- [ ] Accepts `educationMode` prop (classroom/homework/exam/sandbox)
- [ ] Renders ProvenanceBadge with canonical_education category
- [ ] Shows "Classroom Mode - Verified Content Only" label

## Run These Commands

```bash
# Type check all education files
npx tsc --noEmit src/types/education.ts src/lib/matrixLab.ts src/lib/conceptSystem.ts src/lib/educationHelpers.ts src/components/ProvenanceBadge.tsx src/components/GameTreeTeachingFlow.tsx

# Lint specific files
npx eslint src/components/GameTreeTeachingFlow.tsx src/components/ProvenanceBadge.tsx --ext .tsx

# Test deterministic output (run twice, compare)
node -e "const {generateCanonicalGame} = require('./src/lib/matrixLab'); console.log(JSON.stringify(generateCanonicalGame('prisonersDilemma')))" > /tmp/run1.json
node -e "const {generateCanonicalGame} = require('./src/lib/matrixLab'); console.log(JSON.stringify(generateCanonicalGame('prisonersDilemma')))" > /tmp/run2.json
diff /tmp/run1.json /tmp/run2.json && echo 'PASS: Deterministic' || echo 'FAIL: Non-deterministic'
```

## Edge Function Deployment

```bash
# Deploy LTI function
supabase functions deploy lti-launch

# Verify function loads without import errors
supabase functions logs lti-launch --tail
```

## Sign-off Criteria

- [ ] All TypeScript compiles without errors
- [ ] No `any` types introduced in education files
- [ ] All random-based heuristics have education-safe alternatives
- [ ] LTI function validates JWT signatures before processing
- [ ] Provenance badges visible on all education mode UIs

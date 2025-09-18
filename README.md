# Strategic Intelligence Platform (React + TypeScript + Vite)

## Top 10 Functionalities

### 1. **Quantum Game Theory Analysis Engine**
Advanced strategic analysis using quantum-inspired algorithms and recursive Nash equilibria computation. Supports complex multi-player scenarios with real-time equilibrium calculation and confidence intervals.

### 2. **Multi-Agent Recursive Prediction System**
Models scenarios where multiple intelligent agents adapt to each other's strategies over time, computing meta-equilibria that account for players knowing others are computing equilibria.

### 3. **Strategic DNA Analysis & Cognitive Profiling**
Personalized strategic personality assessment including cognitive bias analysis, decision pattern recognition, and strategic recommendation engine based on individual decision history.

### 4. **Cross-Domain Pattern Mining & Symmetry Discovery**
AI-powered discovery of strategic parallels across seemingly unrelated domains, identifying successful strategies from analogous situations and recommending hybrid approaches.

### 5. **Real-Time Evidence Retrieval & Validation**
Integrated evidence system using Perplexity AI and Firecrawl for real-time information gathering, with sophisticated validation requiring multiple sources and quality scoring.

### 6. **Audience-Specific Analysis Views**
Tailored analysis outputs for different user types (students, learners, researchers, teachers) with appropriate complexity levels and educational explanations.

### 7. **Multi-Scenario Comparison & Sensitivity Analysis**
Advanced comparison tools for analyzing multiple strategic scenarios simultaneously, with sensitivity analysis to understand how changes in parameters affect outcomes.

### 8. **Collective Intelligence & Collaborative Sessions**
Multi-user strategic simulations and collaborative decision-making sessions with real-time participant coordination and collective intelligence aggregation.

### 9. **Bayesian Belief Updating System**
Dynamic belief network updates based on new evidence, with strategic implications analysis and belief stability calculations for decision confidence.

### 10. **Comprehensive Monitoring & Analytics Dashboard**
Real-time system monitoring, performance metrics, quota tracking, and strategic analysis history with advanced caching and optimization features.

## Quick Start

1) Copy environment file and set Supabase credentials

```bash
cp .env.example .env
# Edit .env and set:
# VITE_SUPABASE_URL=https://<your-project>.supabase.co
# VITE_SUPABASE_ANON_KEY=<your_anon_public_key>
```

2) Install and run

```bash
pnpm install
pnpm dev
```

3) Build for production

```bash
pnpm build
pnpm preview
```

Notes:
- Supabase URL/key are now read from Vite env vars in `src/lib/supabase.ts`.
- Edge function endpoints used:
  - `/functions/v1/analyze-engine`
  - `/functions/v1/get-analysis-status`
  - `/functions/v1/system-status`
  - `/functions/v1/health` (optional)

### Optional Health Endpoint Spec

If you add a read-only health function, the frontend will consume it automatically to display schema checks in System Status.

Expected JSON (fields optional):

```json
{
  "schema_ok": true,
  "version": "2025-08-26",
  "checks": [
    { "name": "tables_exist", "status": "ok", "detail": "analysis, players, results present" },
    { "name": "columns", "status": "ok", "detail": "results.confidence fields found" },
    { "name": "policies", "status": "warn", "detail": "Anon read-only policy configured" }
  ]
}
```

Quick test:

```bash
curl -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" \
     "$VITE_SUPABASE_URL/functions/v1/health"
```

## MVP Verification

Use these commands to verify the backend is live and persisting:

1) Read current runs_count

```bash
curl -s \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/system-status" | jq .components.database.info.runs_count
```

2) Trigger analyze-engine (minimal payload)

```bash
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{
    "scenario_text": "MVP trigger",
    "players_def": [
      {"id": "P1", "actions": ["A", "B"]},
      {"id": "P2", "actions": ["A", "B"]}
    ],
    "options": { "deterministicSeed": 7 }
  }'
```

3) Re-read runs_count (expect +1)

```bash
curl -s \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  "$VITE_SUPABASE_URL/functions/v1/system-status" | jq .components.database.info.runs_count
```

### Key Handling (security)

- Only put these in `.env` (client):
  - `VITE_SUPABASE_URL=https://<project>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon JWT>`
- Do NOT place the service role key in `.env`. Keep it server-side as a Functions secret:
  - `EDGE_SUPABASE_SERVICE_ROLE_KEY=<service role JWT>`
- Do NOT put Perplexity keys in `.env` (client). Keep them server-side as a Functions secret:
  - `EDGE_PERPLEXITY_API_KEY=<perplexity key>`
- Functions already read `EDGE_*` secrets; redeploy after changing secrets.

#### External Retrievals (optional)

The analyze engine can perform best-effort external retrievals via Perplexity to attach citations.

Environment toggles (server-side secrets):

- `EDGE_ENABLE_RETRIEVALS=true|false` (default: false)
- `EDGE_RETRIEVAL_TIMEOUT_MS=<ms>` (default: 8000)
- `EDGE_PERPLEXITY_API_KEY=<key>`

Set secrets with Supabase CLI (replace values as needed):

```bash
supabase secrets set \
  EDGE_ENABLE_RETRIEVALS=true \
  EDGE_RETRIEVAL_TIMEOUT_MS=8000 \
  EDGE_PERPLEXITY_API_KEY=pk-live-xxxxxxxx \
  --project-ref jxdihzqoaxtydolmltdr

# Deploy updated function
supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr
```

Verification:

```bash
# Disabled (expect 0 retrievals)
supabase secrets set EDGE_ENABLE_RETRIEVALS=false --project-ref jxdihzqoaxtydolmltdr
supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"Test retrievals"}' | jq '.analysis.retrieval_count'

# Enabled (expect >= 1 when citations available)
supabase secrets set EDGE_ENABLE_RETRIEVALS=true --project-ref jxdihzqoaxtydolmltdr
supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"AI policy headlines today"}' | jq '.analysis.retrieval_count, .analysis.provenance'

# Timeout path (expect 0 retrievals and a warning)
supabase secrets set EDGE_RETRIEVAL_TIMEOUT_MS=1 --project-ref jxdihzqoaxtydolmltdr
supabase functions deploy analyze-engine --project-ref jxdihzqoaxtydolmltdr
curl -s -X POST \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  "$VITE_SUPABASE_URL/functions/v1/analyze-engine" \
  -d '{"scenario_text":"Connectivity test"}' | jq '.analysis.retrieval_count, .analysis.provenance.warning'
```

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```

# Modal + Deno Advanced Frameworks Runbook

This runbook installs the local toolchain, deploys the Modal ML service, wires the Supabase bridge secrets through the existing secret flow, redeploys the affected edge functions, and runs the hosted proof scripts for the deterministic game-theory expansion.

Official references:
- Modal guide: https://modal.com/docs/guide
- Modal deploy CLI: https://modal.com/docs/reference/cli/deploy
- Modal secret CLI: https://modal.com/docs/reference/cli/secret
- Modal token CLI: https://modal.com/docs/reference/cli/token
- Modal deployment management: https://modal.com/docs/guide/managing-deployments
- Deno installation: https://docs.deno.com/runtime/manual/getting_started
- Deno check: https://docs.deno.com/runtime/reference/cli/check/

## Prerequisites

Required local environment variables:
- `SUPABASE_PROJECT_REF`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `ML_SUPABASE_DB_URL` (recommended) or a direct `SUPABASE_DB_URL` that includes the database password
- `ML_SERVICE_TOKEN`
- `MODAL_TOKEN_ID`
- `MODAL_TOKEN_SECRET`

Recommended: store these in `.env` and keep `scripts/setup-secrets.sh` as the single source of truth for Supabase secret propagation.

## Local Toolchain

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r ml-service/requirements.txt

if command -v brew >/dev/null 2>&1; then
  brew install deno
else
  curl -fsSL https://deno.land/install.sh | sh
  export DENO_INSTALL="$HOME/.deno"
  export PATH="$DENO_INSTALL/bin:$PATH"
fi

python --version
deno --version
```

## Modal Auth And Deploy

Manual-first recovery keeps the web bridge deployed and leaves the scheduled worker undeployed by default.

```bash
source .venv/bin/activate

python -m modal token set --token-id "$MODAL_TOKEN_ID" --token-secret "$MODAL_TOKEN_SECRET"
python -m modal token info

bash scripts/deploy-modal-ml-web.sh
```

The web deploy script derives a session-pooler DSN for Modal and writes it into the `ml-service-db` secret as `ML_SUPABASE_DB_URL`. After deploy, record the Modal web endpoint URL and export it as `ML_SERVICE_URL`.

Only re-enable autonomous background work intentionally:

```bash
bash scripts/deploy-modal-ml-worker.sh
```

## Supabase Secret Wiring

Push the bridge URL and token through the existing secret script instead of a parallel path:

```bash
export ML_SERVICE_URL="https://<your-modal-endpoint>"
export ML_SERVICE_TOKEN="${ML_SERVICE_TOKEN}"

bash scripts/setup-secrets.sh
```

Then redeploy the edge functions that call `maybeCallMlService(...)`:

```bash
SUPABASE_CMD=supabase bash scripts/deploy-ml-bridge-functions.sh
```

That script now redeploys:
- `analyze-engine`
- `personal-life-coach`
- `market-stream`
- `ontology-sync`
- `shadow-model-refresh`
- the existing public bridge functions already in scope

If Docker is not running locally, redeploy the five proof-critical functions with the Supabase server-side bundler so the edge gateway actually receives the bundle:

```bash
for fn in analyze-engine personal-life-coach export-analysis notebook-export analysis-hydrator; do
  supabase functions deploy "$fn" \
    --project-ref "$SUPABASE_PROJECT_REF" \
    --use-api
done
```

## Post-Deploy Verification

### Modal Endpoint Proof

```bash
curl "$ML_SERVICE_URL/health"

curl -H "Authorization: Bearer $ML_SERVICE_TOKEN" \
  "$ML_SERVICE_URL/ops/health"

curl -X POST "$ML_SERVICE_URL/ops/drift-evaluate" \
  -H "Authorization: Bearer $ML_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold":0.12}'

curl -X POST "$ML_SERVICE_URL/ops/calibration-refresh" \
  -H "Authorization: Bearer $ML_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"minimumSampleSize":25}'

curl -X POST "$ML_SERVICE_URL/game-theory/solve" \
  -H "Authorization: Bearer $ML_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"framework":"coalitional","payload":{"players":["P1","P2","P3"],"coalition_values":{"__empty__":0,"P1":0,"P2":0,"P3":0,"P1|P2":1,"P1|P3":1,"P2|P3":1,"P1|P2|P3":1}}}'
```

### Local Validation Gate

```bash
deno check --all \
  supabase/functions/analyze-engine/index.ts \
  supabase/functions/personal-life-coach/index.ts \
  supabase/functions/notebook-export/index.ts \
  supabase/functions/export-analysis/index.ts \
  supabase/functions/_shared/strategist-provider.deno.ts

python3 -m pytest ml-service/tests/test_game_theory.py ml-service/tests/test_main.py

npm test -- --run \
  tests/game-theory-knowledge.test.ts \
  tests/strategist-contract.test.ts \
  tests/canonical-games.test.ts

npm run build
```

### Hosted Proof Gate

```bash
node scripts/hosted-strategist-smoke.mjs
node scripts/hosted-researcher-advanced-smoke.mjs
```

These hosted proofs use canonical request-seeded advanced inputs, so they remain deterministic even if the hosted LLM provider is temporarily unavailable.

The hosted proof is only considered complete if both scripts pass and confirm:
- deterministic `advanced_game_outputs` for strategist scenarios
- deterministic `simulation_results.advanced_frameworks` for researcher scenarios
- preserved framework data through `analysis-hydrator`
- preserved framework data through `export-analysis`
- preserved framework data through `notebook-export`

## Failure Triage

If Modal deploy succeeds but hosted proof fails:
- run `curl "$ML_SERVICE_URL/health"` first
- confirm `ML_SERVICE_URL` and `ML_SERVICE_TOKEN` were pushed via `scripts/setup-secrets.sh`
- confirm `/ops/health` reports `db_config_valid: true`, `db_mode: "supavisor_session"`, and `db_user_kind: "project_scoped"`
- redeploy with `SUPABASE_CMD=supabase bash scripts/deploy-ml-bridge-functions.sh`
- if the gateway returns `404 NOT_FOUND` for a freshly deployed function while `supabase functions list` shows a new version, redeploy that function with `--use-api`
- verify the deployed artifact is retrievable with `supabase functions download <function-name> --project-ref "$SUPABASE_PROJECT_REF" --use-api`

If Deno validation fails:
- confirm `deno --version`
- rerun the exact `deno check --all ...` command from this document

If researcher proof fails after analysis succeeds:
- inspect the hydrated payload first
- then inspect the export payload
- then inspect the notebook payload
- do not treat the initial analyze response as sufficient proof

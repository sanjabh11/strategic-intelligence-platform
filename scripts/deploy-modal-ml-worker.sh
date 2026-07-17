#!/bin/bash

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -x ".venv/bin/python" ]; then
  MODAL_PYTHON=".venv/bin/python"
else
  MODAL_PYTHON="python3"
fi

echo "⚠️  Deploying the scheduled Modal worker will re-enable background automation."
echo "    Manual-first recovery keeps this app undeployed by default."

"$MODAL_PYTHON" -m modal deploy ml-service/modal_worker_jobs.py --stream-logs

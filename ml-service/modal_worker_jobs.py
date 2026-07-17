from __future__ import annotations

from pathlib import Path

import modal


APP_DIR = Path(__file__).resolve().parent
REMOTE_APP_DIR = "/app"
DB_SECRET_NAME = "ml-service-db"
AUTH_SECRET_NAME = "ml-service-web-auth"
WORKER_APP_NAME = "strategic-intelligence-ml-worker"

image = (
    modal.Image.debian_slim(python_version="3.13")
    .pip_install_from_requirements(APP_DIR / "requirements.txt")
    .add_local_dir(APP_DIR, remote_path=REMOTE_APP_DIR, copy=True)
)

app = modal.App(WORKER_APP_NAME)
service_secrets = [
    modal.Secret.from_name(
        DB_SECRET_NAME,
        required_keys=["ML_SUPABASE_DB_URL"],
    ),
    modal.Secret.from_name(
        AUTH_SECRET_NAME,
        required_keys=["ML_SERVICE_TOKEN"],
    ),
]


def _load_runtime_exports():
    import sys

    if REMOTE_APP_DIR not in sys.path:
        sys.path.insert(0, REMOTE_APP_DIR)

    from main import run_scheduled_queue_drain_sync

    return run_scheduled_queue_drain_sync


@app.function(
    image=image,
    secrets=service_secrets,
    timeout=900,
    schedule=modal.Cron("0 */6 * * *", timezone="UTC"),
    env={
        "ML_WORKER_MODE": "scheduled-burst",
        "ML_AUTOMATION_ENABLED": "true",
    },
)
def scheduled_calibration_refresh() -> dict[str, object]:
    run_scheduled_queue_drain_sync = _load_runtime_exports()
    return run_scheduled_queue_drain_sync(["calibration_refresh"])


@app.function(
    image=image,
    secrets=service_secrets,
    timeout=900,
    schedule=modal.Cron("*/15 * * * *", timezone="UTC"),
    env={
        "ML_WORKER_MODE": "scheduled-burst",
        "ML_AUTOMATION_ENABLED": "true",
    },
)
def scheduled_drift_evaluate() -> dict[str, object]:
    run_scheduled_queue_drain_sync = _load_runtime_exports()
    return run_scheduled_queue_drain_sync(["drift_evaluate"])

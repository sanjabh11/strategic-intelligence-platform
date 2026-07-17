from __future__ import annotations

from pathlib import Path

import modal


APP_DIR = Path(__file__).resolve().parent
REMOTE_APP_DIR = "/app"
DB_SECRET_NAME = "ml-service-db"
AUTH_SECRET_NAME = "ml-service-web-auth"
WEB_APP_NAME = "strategic-intelligence-ml-web"

image = (
    modal.Image.debian_slim(python_version="3.13")
    .pip_install_from_requirements(APP_DIR / "requirements.txt")
    .add_local_dir(APP_DIR, remote_path=REMOTE_APP_DIR, copy=True)
)

app = modal.App(WEB_APP_NAME)
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

    from main import create_app, run_scheduled_queue_drain_sync

    return create_app, run_scheduled_queue_drain_sync


@app.function(
    image=image,
    secrets=service_secrets,
    timeout=900,
    env={
        "ML_WORKER_MODE": "web-only",
        "ML_AUTOMATION_ENABLED": "false",
    },
)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def web():
    create_app, _ = _load_runtime_exports()
    return create_app()

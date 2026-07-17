import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from unittest.mock import AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

import main as ml_main
from main import build_geopolitical_window_metrics, compute_retry_delay_seconds, fit_calibration_shape, job_is_claimable


def test_sparse_calibration_uses_bayesian_smoothing():
    fitted = fit_calibration_shape(
        [
            {"probability": 0.8, "outcome": 1},
            {"probability": 0.7, "outcome": 0},
        ],
        minimum_sample_size=5,
    )

    assert fitted["method"] == "bayesian_smoothed_isotonic"
    assert fitted["shape"]["y"] == sorted(fitted["shape"]["y"])
    assert 0.84 <= fitted["shape"]["y"][-2] <= 0.87


def test_dense_calibration_stays_monotone_and_clipped():
    fitted = fit_calibration_shape(
        [
            {"probability": 0.1, "outcome": 0},
            {"probability": 0.2, "outcome": 0},
            {"probability": 0.3, "outcome": 0},
            {"probability": 0.6, "outcome": 1},
            {"probability": 0.7, "outcome": 1},
            {"probability": 0.8, "outcome": 1},
        ],
        minimum_sample_size=5,
    )

    assert fitted["method"] == "isotonic_regression"
    assert fitted["shape"]["y"] == sorted(fitted["shape"]["y"])
    assert min(fitted["shape"]["y"]) >= 0.02
    assert max(fitted["shape"]["y"]) <= 0.98


def test_geopolitical_window_metrics_capture_concentration_signals():
    summary = build_geopolitical_window_metrics(
        [
            {"actors": ["USA", "CHN"], "event_type": "cooperation", "goldstein_scale": 4},
            {"actors": ["USA", "CHN"], "event_type": "cooperation", "goldstein_scale": 3},
            {"actors": ["USA", "RUS"], "event_type": "conflict", "goldstein_scale": -5},
            {"actors": ["USA", "CHN"], "event_type": "cooperation", "goldstein_scale": 2},
        ]
    )

    assert summary["sample_size"] == 4
    assert len(summary["metrics"]) == 6
    assert summary["summary"]["negative_ratio"] == 0.25
    assert summary["summary"]["event_type_concentration"] == 0.75
    assert summary["summary"]["actor_pair_concentration"] == 0.75


def test_persist_drift_signal_accepts_iso_timestamp_strings():
    conn = AsyncMock()
    conn.fetchrow.return_value = {"surface": "geopolitical_radar", "scope_key": "global"}

    result = asyncio.run(
        ml_main.persist_drift_signal(
            conn,
            {
                "surface": "geopolitical_radar",
                "scope_key": "global",
                "detector": "gdelt_regime_shift_v1",
                "score": 0.22,
                "threshold": 0.12,
                "state": "triggered",
                "metadata": {"sample_size": 24},
                "triggered_at": "2026-05-02T05:04:17.106569+00:00",
            },
        )
    )

    assert result["surface"] == "geopolitical_radar"
    assert isinstance(conn.fetchrow.await_args.args[-1], datetime)


def test_retry_delay_grows_but_caps():
    assert compute_retry_delay_seconds(1) == 30
    assert compute_retry_delay_seconds(2) == 60
    assert compute_retry_delay_seconds(6) == 900


def test_job_claimability_respects_schedule_and_lease():
    now = datetime.now(timezone.utc)

    assert job_is_claimable(
        {
            "status": "queued",
            "scheduled_at": now - timedelta(minutes=1),
            "lease_expires_at": now - timedelta(seconds=1),
        },
        now,
    )

    assert not job_is_claimable(
        {
            "status": "queued",
            "scheduled_at": now + timedelta(minutes=1),
            "lease_expires_at": None,
        },
        now,
    )

    assert not job_is_claimable(
        {
            "status": "queued",
            "scheduled_at": now - timedelta(minutes=1),
            "lease_expires_at": now + timedelta(seconds=30),
        },
        now,
    )


def test_normalize_job_types_rejects_unknown():
    with pytest.raises(ValueError):
        ml_main.normalize_job_types(["not_real"])


def test_analyze_db_dsn_rejects_plain_postgres_on_supabase_session_pooler():
    diagnostics = ml_main.analyze_db_dsn(
        "postgresql://postgres:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
    )

    assert diagnostics.db_mode == "supavisor_session"
    assert diagnostics.db_user_kind == "postgres_root"
    assert diagnostics.valid is False
    assert diagnostics.error is not None


def test_analyze_db_dsn_accepts_project_scoped_supabase_session_pooler():
    diagnostics = ml_main.analyze_db_dsn(
        "postgresql://postgres.jxdihzqoaxtydolmltdr:secret@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
    )

    assert diagnostics.db_mode == "supavisor_session"
    assert diagnostics.db_user_kind == "project_scoped"
    assert diagnostics.valid is True
    assert diagnostics.error is None


def test_drain_queue_once_processes_filtered_batch(monkeypatch):
    observed = {}
    processed = []

    async def fake_claim_jobs(pool, settings, job_types=None, batch_size=None):
        observed["job_types"] = job_types
        observed["batch_size"] = batch_size
        return [
            {"id": "job-1", "job_type": "calibration_refresh"},
            {"id": "job-2", "job_type": "calibration_refresh"},
        ]

    async def fake_process_job(pool, settings, job):
        processed.append(job["id"])

    monkeypatch.setattr(ml_main, "claim_jobs", fake_claim_jobs)
    monkeypatch.setattr(ml_main, "process_job", fake_process_job)

    settings = ml_main.WorkerSettings(
        batch_size=2,
        lease_seconds=600,
        cooldown_minutes=60,
        max_refreshes_per_user_per_hour=5,
        worker_id="test-worker",
        db_target="test-db",
        db_host="db.example",
        db_port=5432,
        db_mode="generic",
        db_user_kind="custom",
        db_config_valid=True,
        db_config_error=None,
    )

    result = asyncio.run(
        ml_main.drain_queue_once(
            pool=object(),
            settings=settings,
            job_types=["calibration_refresh"],
            batch_size=2,
        )
    )

    assert observed["job_types"] == ["calibration_refresh"]
    assert observed["batch_size"] == 2
    assert processed == ["job-1", "job-2"]
    assert result["claimed"] == 2
    assert result["processed"] == 2
    assert result["job_types"] == ["calibration_refresh"]

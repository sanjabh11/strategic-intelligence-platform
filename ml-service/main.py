from __future__ import annotations

import asyncio
from collections import Counter
import json
import logging
import os
import socket
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional
from urllib.parse import urlparse

import asyncpg
import numpy as np
from fastapi import APIRouter, FastAPI, HTTPException, Request
from pydantic import BaseModel, Field
from sklearn.isotonic import IsotonicRegression
from solvers import SOLVER_VERSION as GAME_THEORY_SOLVER_VERSION, SolverInputError, solve_game_theory_framework
from forecast_bias import generate_bias_adjusted_forecast, evaluate_shadow_mode, InsufficientDataError, FORECAST_BIAS_VERSION


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("strategic-intelligence-ml")

SERVICE_VERSION = "0.2.1"
PRIOR_X = np.array([0.0, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1.0], dtype=float)
PRIOR_Y = np.array([0.05, 0.08, 0.15, 0.20, 0.32, 0.50, 0.68, 0.80, 0.83, 0.85, 0.86], dtype=float)
SUPPORTED_JOB_TYPES = ("calibration_refresh", "drift_evaluate")
SUPABASE_POOLER_HOST_SUFFIX = ".pooler.supabase.com"
SUPABASE_DIRECT_HOST_SUFFIX = ".supabase.co"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def current_worker_mode() -> str:
    return (os.getenv("ML_WORKER_MODE") or "scheduled-burst").strip()


def automation_enabled() -> bool:
    return (os.getenv("ML_AUTOMATION_ENABLED") or "true").strip().lower() == "true"


def clamp_probability(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def round_float(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def average(values: Iterable[float]) -> float:
    data = list(values)
    if not data:
        return 0.0
    return float(sum(data) / len(data))


def standard_deviation(values: Iterable[float]) -> float:
    data = list(values)
    if len(data) < 2:
        return 0.0
    mean = average(data)
    return float((sum((value - mean) ** 2 for value in data) / len(data)) ** 0.5)


def brier_score(probability: float, outcome: float) -> float:
    return (clamp_probability(probability) - clamp_probability(outcome)) ** 2


def normalize_text(value: str) -> str:
    return " ".join(str(value or "").lower().split())


def concentration(values: Iterable[str]) -> float:
    normalized_values = [normalize_text(value) for value in values if normalize_text(value)]
    if not normalized_values:
        return 0.0
    counts = Counter(normalized_values)
    return float(max(counts.values()) / len(normalized_values))


def actor_pair_key(actors: Any) -> str:
    if not isinstance(actors, list):
        return "global"
    normalized = [normalize_text(str(actor)) for actor in actors if normalize_text(str(actor))]
    if not normalized:
        return "global"
    if len(normalized) == 1:
        return normalized[0]
    pair = sorted(normalized[:2])
    return "::".join(pair)


def compute_retry_delay_seconds(attempt_count: int) -> int:
    attempt = max(1, int(attempt_count))
    return min(900, 30 * (2 ** (attempt - 1)))


def job_is_claimable(job: Dict[str, Any], current_time: datetime) -> bool:
    status = str(job.get("status") or "")
    if status != "queued":
      return False
    scheduled_at = job.get("scheduled_at")
    lease_expires_at = job.get("lease_expires_at")
    if scheduled_at and scheduled_at > current_time:
        return False
    if lease_expires_at and lease_expires_at > current_time:
        return False
    return True


def db_target_from_dsn(dsn: str) -> str:
    parsed = urlparse(dsn)
    host = parsed.hostname or "unknown-host"
    port = parsed.port or 5432
    database = parsed.path.lstrip("/") or "postgres"
    return f"{host}:{port}/{database}"


@dataclass(frozen=True)
class DbConfigDiagnostics:
    dsn: str
    db_target: str
    db_host: str
    db_port: int
    db_name: str
    db_mode: str
    db_user_kind: str
    username: str
    has_sslmode: bool
    valid: bool
    error: Optional[str]


def classify_db_user(username: str) -> str:
    normalized = (username or "").strip()
    if not normalized:
        return "missing"
    if normalized == "postgres":
        return "postgres_root"
    if normalized.startswith("postgres."):
        return "project_scoped"
    return "custom"


def classify_db_mode(host: str, port: int) -> str:
    normalized_host = (host or "").strip().lower()
    if normalized_host.endswith(SUPABASE_POOLER_HOST_SUFFIX):
        if port == 5432:
            return "supavisor_session"
        if port == 6543:
            return "supavisor_transaction"
        return "supavisor_unknown"
    if normalized_host.startswith("db.") and normalized_host.endswith(SUPABASE_DIRECT_HOST_SUFFIX):
        if port == 5432:
            return "supabase_direct"
        if port == 6543:
            return "supabase_dedicated_transaction"
    if normalized_host:
        return "generic"
    return "unconfigured"


def analyze_db_dsn(dsn: str) -> DbConfigDiagnostics:
    normalized = (dsn or "").strip()
    if not normalized:
        return DbConfigDiagnostics(
            dsn="",
            db_target="unconfigured",
            db_host="unconfigured",
            db_port=0,
            db_name="unconfigured",
            db_mode="unconfigured",
            db_user_kind="missing",
            username="",
            has_sslmode=False,
            valid=False,
            error="SUPABASE_DB_URL not configured",
        )

    parsed = urlparse(normalized)
    host = parsed.hostname or "unknown-host"
    port = parsed.port or 5432
    db_name = parsed.path.lstrip("/") or "postgres"
    username = parsed.username or ""
    db_mode = classify_db_mode(host, port)
    db_user_kind = classify_db_user(username)
    has_sslmode = "sslmode=" in normalized.lower()
    error: Optional[str] = None

    if host.endswith(SUPABASE_POOLER_HOST_SUFFIX) and username == "postgres":
        error = (
            "Invalid Supabase session pooler credentials: use postgres.<project_ref> "
            "when connecting to *.pooler.supabase.com on port 5432"
        )

    return DbConfigDiagnostics(
        dsn=normalized,
        db_target=f"{host}:{port}/{db_name}",
        db_host=host,
        db_port=port,
        db_name=db_name,
        db_mode=db_mode,
        db_user_kind=db_user_kind,
        username=username,
        has_sslmode=has_sslmode,
        valid=error is None,
        error=error,
    )


def require_valid_db_diagnostics(diagnostics: DbConfigDiagnostics) -> DbConfigDiagnostics:
    if not diagnostics.valid:
        raise RuntimeError(diagnostics.error or "Invalid database configuration")
    return diagnostics


def merge_advisories(existing: Optional[Dict[str, Any]], advisory: Dict[str, Any]) -> Dict[str, Any]:
    current = existing if isinstance(existing, dict) else {}
    advisories = current.get("advisories") if isinstance(current.get("advisories"), dict) else {}
    return {
        **current,
        "advisories": {
            **advisories,
            **advisory,
        },
    }


def detect_distribution_drift(
    reference: List[float],
    current: List[float],
    threshold: float,
    surface: str,
    scope_key: str,
    detector: str = "wasserstein_proxy_v2",
) -> Dict[str, Any]:
    cleaned_reference = [float(value) for value in reference if isinstance(value, (float, int))]
    cleaned_current = [float(value) for value in current if isinstance(value, (float, int))]

    if not cleaned_reference or not cleaned_current:
        return {
            "surface": surface,
            "scope_key": scope_key,
            "detector": detector,
            "score": 0.0,
            "threshold": threshold,
            "state": "stable",
            "metadata": {
                "reference_size": len(cleaned_reference),
                "current_size": len(cleaned_current),
                "reason": "insufficient_samples",
            },
            "triggered_at": now_iso(),
        }

    sorted_reference = sorted(cleaned_reference)
    sorted_current = sorted(cleaned_current)
    samples = max(len(sorted_reference), len(sorted_current))
    transport = 0.0

    for index in range(samples):
        reference_index = min(len(sorted_reference) - 1, int(index * len(sorted_reference) / samples))
        current_index = min(len(sorted_current) - 1, int(index * len(sorted_current) / samples))
        transport += abs(sorted_reference[reference_index] - sorted_current[current_index])

    normalized_transport = transport / samples
    mean_shift = abs(average(sorted_reference) - average(sorted_current))
    volatility_shift = abs(standard_deviation(sorted_reference) - standard_deviation(sorted_current))
    score = round_float(normalized_transport * 0.55 + mean_shift * 0.3 + volatility_shift * 0.15)

    if score >= threshold:
        state = "triggered"
    elif score >= threshold * 0.65:
        state = "watch"
    else:
        state = "stable"

    return {
        "surface": surface,
        "scope_key": scope_key,
        "detector": detector,
        "score": score,
        "threshold": threshold,
        "state": state,
        "metadata": {
            "reference_size": len(sorted_reference),
            "current_size": len(sorted_current),
            "normalized_transport": round_float(normalized_transport),
            "mean_shift": round_float(mean_shift),
            "volatility_shift": round_float(volatility_shift),
        },
        "triggered_at": now_iso(),
    }


def build_geopolitical_window_metrics(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    goldstein_values = [float(event.get("goldstein_scale") or 0.0) for event in events]
    event_types = [str(event.get("event_type") or "unknown") for event in events]
    actor_pairs = [actor_pair_key(event.get("actors")) for event in events]

    sample_size = len(goldstein_values)
    negative_ratio = float(sum(1 for value in goldstein_values if value < 0) / sample_size) if sample_size else 0.0
    positive_ratio = float(sum(1 for value in goldstein_values if value > 0) / sample_size) if sample_size else 0.0
    average_magnitude = average([abs(value) for value in goldstein_values]) if goldstein_values else 0.0
    event_type_concentration = concentration(event_types)
    actor_pair_concentration = concentration(actor_pairs)

    return {
        "sample_size": sample_size,
        "metrics": [
            round_float(average(goldstein_values)),
            round_float(average_magnitude),
            round_float(negative_ratio),
            round_float(positive_ratio),
            round_float(event_type_concentration),
            round_float(actor_pair_concentration),
        ],
        "summary": {
            "sample_size": sample_size,
            "goldstein_mean": round_float(average(goldstein_values)),
            "goldstein_magnitude_mean": round_float(average_magnitude),
            "negative_ratio": round_float(negative_ratio),
            "positive_ratio": round_float(positive_ratio),
            "event_type_concentration": round_float(event_type_concentration),
            "actor_pair_concentration": round_float(actor_pair_concentration),
        },
    }


def interpolate(probability: float, shape: Dict[str, List[float]]) -> float:
    x = np.asarray(shape.get("x") or [], dtype=float)
    y = np.asarray(shape.get("y") or [], dtype=float)
    if x.size == 0 or y.size == 0 or x.size != y.size:
        return clamp_probability(probability)
    return clamp_probability(float(np.interp(clamp_probability(probability), x, y)))


def _sanitize_points(points: List[Dict[str, float]]) -> List[Dict[str, float]]:
    sanitized: List[Dict[str, float]] = []
    for point in points:
        if "probability" not in point or "outcome" not in point:
            continue
        sanitized.append(
            {
                "probability": clamp_probability(float(point["probability"])),
                "outcome": 1.0 if float(point["outcome"]) >= 0.5 else 0.0,
            }
        )
    sanitized.sort(key=lambda item: item["probability"])
    return sanitized


def fit_calibration_shape(points: List[Dict[str, float]], minimum_sample_size: int) -> Dict[str, Any]:
    sanitized = _sanitize_points(points)
    sample_size = len(sanitized)
    minimum = max(1, int(minimum_sample_size))

    probabilities = np.array([point["probability"] for point in sanitized], dtype=float)
    outcomes = np.array([point["outcome"] for point in sanitized], dtype=float)

    use_prior = sample_size < minimum
    method = "bayesian_smoothed_isotonic" if use_prior else "isotonic_regression"

    fit_x = probabilities.copy()
    fit_y = outcomes.copy()
    sample_weight = np.ones(sample_size, dtype=float) if sample_size else np.array([], dtype=float)

    if use_prior:
        prior_total_weight = max(float(minimum), float(minimum - sample_size + 8))
        prior_weight_per_point = np.full(PRIOR_X.shape[0], prior_total_weight / PRIOR_X.shape[0], dtype=float)
        fit_x = np.concatenate([fit_x, PRIOR_X]) if sample_size else PRIOR_X.copy()
        fit_y = np.concatenate([fit_y, PRIOR_Y]) if sample_size else PRIOR_Y.copy()
        sample_weight = np.concatenate([sample_weight, prior_weight_per_point]) if sample_size else prior_weight_per_point

    model = IsotonicRegression(y_min=0.02, y_max=0.98, out_of_bounds="clip")
    model.fit(fit_x, fit_y, sample_weight=sample_weight if sample_weight.size else None)

    shape = {
        "x": [round_float(value) for value in np.asarray(model.X_thresholds_, dtype=float).tolist()],
        "y": [round_float(value) for value in np.asarray(model.y_thresholds_, dtype=float).tolist()],
    }

    raw_brier = average(brier_score(point["probability"], point["outcome"]) for point in sanitized)
    calibrated_brier = average(
        brier_score(interpolate(point["probability"], shape), point["outcome"]) for point in sanitized
    )

    return {
        "method": method,
        "shape": shape,
        "sample_size": sample_size,
        "metrics": {
            "sample_size": sample_size,
            "brier_raw": round_float(raw_brier),
            "brier_calibrated": round_float(calibrated_brier),
        },
    }


class CalibrationFitRequest(BaseModel):
    points: List[Dict[str, float]]
    minimum_sample_size: int = Field(default=25, ge=1)


class CalibrationPredictRequest(BaseModel):
    probability: float
    shape: Dict[str, List[float]]


class OntologyLinkRequest(BaseModel):
    texts: List[str]
    aliases: Dict[str, List[str]]


class ShadowScoreRequest(BaseModel):
    subject_type: str
    features: Dict[str, float]


class AttributionRequest(BaseModel):
    subject_type: str
    features: Dict[str, float]


class OperationalRequest(BaseModel):
    minimumSampleSize: int = Field(default=25, ge=1)
    threshold: float = Field(default=0.12, ge=0.04, le=0.5)


class GameTheorySolveRequest(BaseModel):
    framework: str
    payload: Dict[str, Any]


class BiasAdjustedForecastRequest(BaseModel):
    historical_values: List[float] = Field(default_factory=list)
    actors: Optional[List[Dict[str, Any]]] = None
    payoff_structure: Optional[Dict[str, Any]] = None
    events_data: Optional[List[Dict[str, Any]]] = None
    lookback: int = Field(default=14, ge=3, le=60)


class ShadowEvaluationRequest(BaseModel):
    historical_values: List[float] = Field(default_factory=list)
    outcomes: List[float] = Field(default_factory=list)
    heuristic_probabilities: List[float] = Field(default_factory=list)
    actors: Optional[List[Dict[str, Any]]] = None
    payoff_structure: Optional[Dict[str, Any]] = None
    events_data: Optional[List[Dict[str, Any]]] = None


@dataclass
class WorkerSettings:
    batch_size: int
    lease_seconds: int
    cooldown_minutes: int
    max_refreshes_per_user_per_hour: int
    worker_id: str
    db_target: str
    db_host: str
    db_port: int
    db_mode: str
    db_user_kind: str
    db_config_valid: bool
    db_config_error: Optional[str]


async def init_db_connection(conn: asyncpg.Connection) -> None:
    await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await conn.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


def require_token(request: Request) -> None:
    expected_token = os.getenv("ML_SERVICE_TOKEN", "").strip()
    if not expected_token:
        return
    provided = (request.headers.get("authorization") or request.headers.get("Authorization") or "").replace("Bearer ", "").strip()
    if provided != expected_token:
        raise HTTPException(status_code=401, detail="Unauthorized")


async def fetch_rows(conn: asyncpg.Connection, query: str, *args: Any) -> List[asyncpg.Record]:
    rows = await conn.fetch(query, *args)
    return list(rows)


def get_db_dsn() -> str:
    return (
        os.getenv("ML_SUPABASE_DB_URL")
        or os.getenv("SUPABASE_DB_URL")
        or os.getenv("DATABASE_URL")
        or ""
    ).strip()


async def fetch_forecast_points(conn: asyncpg.Connection) -> Dict[str, List[Dict[str, float]]]:
    forecasts = await fetch_rows(
        conn,
        """
        select id, current_probability, resolution_outcome, analysis_run_id, game_theory_model
        from public.forecasts
        where resolution_outcome in ('yes', 'no')
        """,
    )
    release_evaluations = await fetch_rows(
        conn,
        """
        select probability, outcome
        from public.whitebox_release_evaluations
        where is_champion_variant = true
        """,
    )

    def resolve_outcome(value: Any) -> Optional[int]:
        normalized = str(value or "").strip().lower()
        if normalized == "yes":
            return 1
        if normalized == "no":
            return 0
        return None

    registry_points: List[Dict[str, float]] = []
    strategist_points: List[Dict[str, float]] = []

    for forecast in forecasts:
        probability = forecast["current_probability"]
        outcome = resolve_outcome(forecast["resolution_outcome"])
        if probability is not None and outcome is not None:
            registry_points.append(
                {
                    "probability": float(probability),
                    "outcome": float(outcome),
                }
            )

        model = forecast.get("game_theory_model") or {}
        champion = (
            ((model.get("multi_agent_forecast") or {}).get("champion"))
            or (((model.get("multi_agent_forecast") or {}).get("consensus") or {}).get("champion"))
            or {}
        )
        champion_probability = champion.get("rawProbability", champion.get("probability"))
        if forecast["analysis_run_id"] and champion_probability is not None and outcome is not None:
            strategist_points.append(
                {
                    "probability": float(champion_probability),
                    "outcome": float(outcome),
                }
            )

    multi_agent_points = [
        {"probability": float(row["probability"]), "outcome": float(row["outcome"])}
        for row in release_evaluations
        if row["probability"] is not None and row["outcome"] is not None
    ]

    return {
        "registry_binary": registry_points,
        "multi_agent_binary": multi_agent_points,
        "strategist_linked_binary": strategist_points,
    }


async def persist_calibration_models(conn: asyncpg.Connection, minimum_sample_size: int) -> Dict[str, Any]:
    segment_points = await fetch_forecast_points(conn)
    persisted_models: List[Dict[str, Any]] = []

    async with conn.transaction():
        for segment_key, points in segment_points.items():
            fitted = fit_calibration_shape(points, minimum_sample_size)
            await conn.execute(
                "update public.calibration_models set active = false where segment_key = $1 and active = true",
                segment_key,
            )
            version = f"{segment_key}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
            inserted = await conn.fetchrow(
                """
                insert into public.calibration_models (
                  scope,
                  segment_key,
                  method,
                  params_json,
                  metrics_json,
                  minimum_sample_size,
                  active,
                  version
                )
                values (
                  'probability_surface',
                  $1,
                  $2,
                  $3::jsonb,
                  $4::jsonb,
                  $5,
                  true,
                  $6
                )
                returning id, segment_key, method, metrics_json, version
                """,
                segment_key,
                fitted["method"],
                {"isotonic": fitted["shape"]},
                fitted["metrics"],
                minimum_sample_size,
                version,
            )
            persisted_models.append(dict(inserted))

    return {
        "minimumSampleSize": minimum_sample_size,
        "models": persisted_models,
    }


async def persist_drift_signal(conn: asyncpg.Connection, signal: Dict[str, Any]) -> Dict[str, Any]:
    triggered_at = signal.get("triggered_at")
    if isinstance(triggered_at, str):
        triggered_at = datetime.fromisoformat(triggered_at.replace("Z", "+00:00"))
    elif not isinstance(triggered_at, datetime):
        triggered_at = datetime.now(timezone.utc)

    record = await conn.fetchrow(
        """
        insert into public.drift_signals (
          surface,
          scope_key,
          detector,
          score,
          threshold,
          state,
          metadata,
          triggered_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        returning *
        """,
        signal["surface"],
        signal["scope_key"],
        signal["detector"],
        signal["score"],
        signal["threshold"],
        signal["state"],
        signal.get("metadata") or {},
        triggered_at,
    )
    return dict(record)


def matches_scope(forecast: Dict[str, Any], signal: Dict[str, Any]) -> bool:
    scope_key = normalize_text(str(signal.get("scope_key") or "global"))
    if signal["surface"] == "outcome_forecasting":
        return True

    tags = " ".join((forecast.get("tags") or []) if isinstance(forecast.get("tags"), list) else [])
    haystack = normalize_text(
        f"{forecast.get('category') or ''} {forecast.get('title') or ''} {forecast.get('question') or ''} {forecast.get('description') or ''} {tags}"
    )

    if scope_key == "global":
        return True
    if scope_key in haystack:
        return True
    category = normalize_text(str(forecast.get("category") or ""))
    if scope_key == "gold":
        return any(token in category for token in ("financial", "economic", "commodity"))
    if scope_key == "oil":
        return any(token in category for token in ("financial", "economic", "commodity", "energy"))
    return False


async def apply_refresh_flags(
    conn: asyncpg.Connection,
    signal: Dict[str, Any],
    forecasts: List[Dict[str, Any]],
    settings: WorkerSettings,
) -> Dict[str, Any]:
    if signal["state"] != "triggered":
        return {
            "surface": signal["surface"],
            "scope_key": signal["scope_key"],
            "forecastCount": 0,
            "analysisCount": 0,
            "skippedRateLimit": 0,
            "skippedCooldown": 0,
        }

    matched = [forecast for forecast in forecasts if matches_scope(forecast, signal)]
    if not matched:
        return {
            "surface": signal["surface"],
            "scope_key": signal["scope_key"],
            "forecastCount": 0,
            "analysisCount": 0,
            "skippedRateLimit": 0,
            "skippedCooldown": 0,
        }

    advisory = {
        "refresh_needed": True,
        "refresh_reason": f"{signal['surface']}:{signal['scope_key']}:{signal['state']}",
        "refresh_marked_at": now_iso(),
        "drift_signal": signal,
    }

    forecast_updates: List[Dict[str, Any]] = []
    analysis_run_ids: set[str] = set()
    skipped_rate_limit = 0
    skipped_cooldown = 0

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for forecast in matched:
        owner_key = str(forecast.get("creator_id") or forecast.get("analysis_user_id") or "unowned")
        grouped.setdefault(owner_key, []).append(forecast)

    for owner_key, owner_forecasts in grouped.items():
        cooldown_ok = await conn.fetchval(
            "select public.claim_drift_refresh_cooldown($1, $2, $3, $4)",
            owner_key,
            signal["surface"],
            str(signal["scope_key"]),
            settings.cooldown_minutes,
        )
        if not cooldown_ok:
            skipped_cooldown += len(owner_forecasts)
            continue

        capacity = await conn.fetchval(
            "select public.consume_rate_limit_capacity($1, $2, $3, $4, $5)",
            "drift_refresh_flags",
            owner_key,
            settings.max_refreshes_per_user_per_hour,
            60,
            len(owner_forecasts),
        )
        granted = int((capacity or {}).get("granted", 0)) if isinstance(capacity, dict) else 0
        if granted <= 0:
            skipped_rate_limit += len(owner_forecasts)
            continue

        allowed = owner_forecasts[:granted]
        skipped_rate_limit += max(len(owner_forecasts) - granted, 0)
        forecast_updates.extend(allowed)
        for forecast in allowed:
            if forecast.get("analysis_run_id"):
                analysis_run_ids.add(str(forecast["analysis_run_id"]))

    updated_forecasts = 0
    updated_analyses = 0

    async with conn.transaction():
        for forecast in forecast_updates:
            current_model = forecast.get("game_theory_model") if isinstance(forecast.get("game_theory_model"), dict) else {}
            next_model = merge_advisories(current_model, advisory)
            await conn.execute(
                "update public.forecasts set game_theory_model = $1::jsonb where id = $2",
                next_model,
                forecast["id"],
            )
            updated_forecasts += 1

        if analysis_run_ids:
            analysis_rows = await fetch_rows(
                conn,
                "select id, analysis_json from public.analysis_runs where id = any($1::uuid[])",
                list(analysis_run_ids),
            )
            for row in analysis_rows:
                current_json = row["analysis_json"] if isinstance(row["analysis_json"], dict) else {}
                next_json = merge_advisories(current_json, advisory)
                await conn.execute(
                    "update public.analysis_runs set analysis_json = $1::jsonb where id = $2",
                    next_json,
                    row["id"],
                )
                updated_analyses += 1

    return {
        "surface": signal["surface"],
        "scope_key": signal["scope_key"],
        "forecastCount": updated_forecasts,
        "analysisCount": updated_analyses,
        "skippedRateLimit": skipped_rate_limit,
        "skippedCooldown": skipped_cooldown,
    }


async def run_drift_evaluation(conn: asyncpg.Connection, threshold: float, settings: WorkerSettings) -> Dict[str, Any]:
    market_events = await fetch_rows(
        conn,
        """
        select actors, goldstein_scale, timestamp, source
        from public.real_time_events
        where source in ('financial_markets', 'energy')
        order by timestamp desc
        limit 120
        """,
    )
    geopolitical_events = await fetch_rows(
        conn,
        """
        select actors, event_type, goldstein_scale, timestamp, source
        from public.real_time_events
        where source = 'gdelt'
           or source like 'gdelt%'
        order by timestamp desc
        limit 120
        """,
    )
    forecasts = await fetch_rows(
        conn,
        """
        select
          f.id,
          f.analysis_run_id,
          f.creator_id,
          f.category,
          f.title,
          f.question,
          f.description,
          f.tags,
          f.game_theory_model,
          f.current_probability,
          f.created_at,
          ar.user_id as analysis_user_id
        from public.forecasts f
        left join public.analysis_runs ar on ar.id = f.analysis_run_id
        where f.is_resolved = false
        order by f.created_at desc
        limit 250
        """,
    )

    grouped_assets: Dict[str, List[float]] = {}
    for event in market_events:
        actors = event.get("actors") if isinstance(event.get("actors"), list) else []
        asset = normalize_text(str(actors[0] if actors else "global")) or "global"
        grouped_assets.setdefault(asset, []).append(float(event.get("goldstein_scale") or 0))

    persisted_signals: List[Dict[str, Any]] = []
    refresh_updates: List[Dict[str, Any]] = []
    skipped_scopes: List[Dict[str, Any]] = []
    minimum_drift_sample_size = 12

    for asset, values in grouped_assets.items():
        if len(values) < minimum_drift_sample_size:
            skipped_scopes.append(
                {
                    "surface": "market_stream",
                    "scope_key": asset,
                    "sample_size": len(values),
                    "reason": "minimum_sample_gate",
                }
            )
            continue
        split_point = max(minimum_drift_sample_size // 2, len(values) // 2)
        current = values[:split_point]
        reference = values[split_point:]
        if not current or not reference:
            continue
        signal = detect_distribution_drift(reference, current, threshold, "market_stream", asset)
        persisted_signals.append(await persist_drift_signal(conn, signal))
        if signal["state"] == "triggered":
            refresh_updates.append(await apply_refresh_flags(conn, signal, [dict(row) for row in forecasts], settings))
            recalibration_signal = {
                **signal,
                "surface": "dynamic_recalibration",
                "triggered_at": now_iso(),
            }
            persisted_signals.append(await persist_drift_signal(conn, recalibration_signal))
            refresh_updates.append(
                await apply_refresh_flags(conn, recalibration_signal, [dict(row) for row in forecasts], settings)
            )

    if len(geopolitical_events) >= minimum_drift_sample_size:
        split_point = max(minimum_drift_sample_size // 2, len(geopolitical_events) // 2)
        current_window = [dict(row) for row in geopolitical_events[:split_point]]
        reference_window = [dict(row) for row in geopolitical_events[split_point:]]

        if current_window and reference_window:
            current_metrics = build_geopolitical_window_metrics(current_window)
            reference_metrics = build_geopolitical_window_metrics(reference_window)
            signal = detect_distribution_drift(
                reference_metrics["metrics"],
                current_metrics["metrics"],
                threshold,
                "geopolitical_radar",
                "global",
                detector="gdelt_regime_shift_v1",
            )
            signal["metadata"] = {
                **(signal.get("metadata") or {}),
                "reference_window": reference_metrics["summary"],
                "current_window": current_metrics["summary"],
            }
            persisted_signals.append(await persist_drift_signal(conn, signal))
            if signal["state"] == "triggered":
                refresh_updates.append(await apply_refresh_flags(conn, signal, [dict(row) for row in forecasts], settings))
    else:
        skipped_scopes.append(
            {
                "surface": "geopolitical_radar",
                "scope_key": "global",
                "sample_size": len(geopolitical_events),
                "reason": "minimum_sample_gate",
            }
        )

    probabilities = [
        float(row["current_probability"])
        for row in forecasts
        if row.get("current_probability") is not None
    ]
    if len(probabilities) >= minimum_drift_sample_size:
        midpoint = len(probabilities) // 2
        signal = detect_distribution_drift(
            probabilities[midpoint:],
            probabilities[:midpoint],
            threshold,
            "outcome_forecasting",
            "global",
        )
        persisted_signals.append(await persist_drift_signal(conn, signal))
        if signal["state"] == "triggered":
            refresh_updates.append(await apply_refresh_flags(conn, signal, [dict(row) for row in forecasts], settings))
    else:
        skipped_scopes.append(
            {
                "surface": "outcome_forecasting",
                "scope_key": "global",
                "sample_size": len(probabilities),
                "reason": "minimum_sample_gate",
            }
        )

    return {
        "threshold": threshold,
        "signalCount": len(persisted_signals),
        "signals": persisted_signals,
        "refreshUpdates": refresh_updates,
        "skippedScopes": skipped_scopes,
    }


def normalize_job_types(job_types: Optional[Iterable[str]]) -> List[str]:
    if not job_types:
        return []

    normalized: List[str] = []
    for job_type in job_types:
        candidate = str(job_type or "").strip()
        if not candidate:
            continue
        if candidate not in SUPPORTED_JOB_TYPES:
            raise ValueError(f"Unsupported scheduled job type: {candidate}")
        if candidate not in normalized:
            normalized.append(candidate)
    return normalized


async def claim_jobs(
    pool: asyncpg.Pool,
    settings: WorkerSettings,
    job_types: Optional[Iterable[str]] = None,
    batch_size: Optional[int] = None,
) -> List[asyncpg.Record]:
    filters = normalize_job_types(job_types)
    requested_batch_size = max(1, int(batch_size or settings.batch_size))
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            with claimable as (
              select id
              from public.ml_job_queue
              where status = 'queued'
                and scheduled_at <= now()
                and (lease_expires_at is null or lease_expires_at <= now())
                and (cardinality($4::text[]) = 0 or job_type = any($4::text[]))
              order by priority desc, scheduled_at asc, created_at asc
              limit $1
              for update skip locked
            )
            update public.ml_job_queue queue
            set status = 'processing',
                claimed_at = now(),
                lease_expires_at = now() + make_interval(secs => $2),
                attempt_count = queue.attempt_count + 1,
                worker_id = $3,
                updated_at = now()
            from claimable
            where queue.id = claimable.id
            returning queue.*
            """,
            requested_batch_size,
            settings.lease_seconds,
            settings.worker_id,
            filters,
        )
        return list(rows)


async def complete_job(pool: asyncpg.Pool, job_id: str, result: Dict[str, Any]) -> None:
    async with pool.acquire() as conn:
        await conn.execute(
            """
            update public.ml_job_queue
            set status = 'completed',
                completed_at = now(),
                lease_expires_at = null,
                result_json = $2::jsonb,
                updated_at = now()
            where id = $1
            """,
            job_id,
            result,
        )


async def fail_job(pool: asyncpg.Pool, job: asyncpg.Record, error_message: str) -> None:
    attempt_count = int(job["attempt_count"] or 1)
    max_attempts = int(job["max_attempts"] or 1)
    next_status = "failed" if attempt_count >= max_attempts else "queued"
    delay_seconds = compute_retry_delay_seconds(attempt_count)

    async with pool.acquire() as conn:
        await conn.execute(
            """
            update public.ml_job_queue
            set status = $2,
                lease_expires_at = null,
                scheduled_at = case when $2 = 'queued' then now() + make_interval(secs => $3) else scheduled_at end,
                completed_at = case when $2 = 'failed' then now() else completed_at end,
                last_error = $4,
                result_json = jsonb_build_object('last_error', $4, 'failed_at', $5),
                updated_at = now()
            where id = $1
            """,
            job["id"],
            next_status,
            delay_seconds,
            error_message,
            now_iso(),
        )


async def process_job(pool: asyncpg.Pool, settings: WorkerSettings, job: asyncpg.Record) -> None:
    job_type = str(job["job_type"])
    payload = job["payload_json"] if isinstance(job["payload_json"], dict) else {}

    try:
        async with pool.acquire() as conn:
            if job_type == "calibration_refresh":
                minimum_sample_size = max(1, int(payload.get("minimumSampleSize", 25)))
                result = await persist_calibration_models(conn, minimum_sample_size)
            elif job_type == "drift_evaluate":
                threshold = max(0.04, min(float(payload.get("threshold", 0.12)), 0.5))
                result = await run_drift_evaluation(conn, threshold, settings)
            else:
                raise RuntimeError(f"Unsupported job type: {job_type}")
        await complete_job(pool, str(job["id"]), result)
        logger.info("Completed ML job %s (%s)", job["id"], job_type)
    except Exception as exc:  # noqa: BLE001
        message = str(exc)
        logger.exception("Failed ML job %s (%s): %s", job["id"], job_type, message)
        await fail_job(pool, job, message)


def build_worker_settings() -> WorkerSettings:
    diagnostics = analyze_db_dsn(get_db_dsn())
    return WorkerSettings(
        batch_size=max(1, int(os.getenv("ML_BATCH_SIZE", "2"))),
        lease_seconds=max(30, int(os.getenv("ML_LEASE_SECONDS", "600"))),
        cooldown_minutes=max(1, int(os.getenv("ML_DRIFT_COOLDOWN_MINUTES", "60"))),
        max_refreshes_per_user_per_hour=max(1, int(os.getenv("ML_MAX_REFRESHES_PER_USER_PER_HOUR", "5"))),
        worker_id=os.getenv("ML_WORKER_ID", f"{socket.gethostname()}:{os.getpid()}"),
        db_target=diagnostics.db_target,
        db_host=diagnostics.db_host,
        db_port=diagnostics.db_port,
        db_mode=diagnostics.db_mode,
        db_user_kind=diagnostics.db_user_kind,
        db_config_valid=diagnostics.valid,
        db_config_error=diagnostics.error,
    )


async def connect_with_validated_dsn() -> asyncpg.Connection:
    diagnostics = require_valid_db_diagnostics(analyze_db_dsn(get_db_dsn()))
    conn = await asyncpg.connect(diagnostics.dsn)
    await init_db_connection(conn)
    return conn


async def drain_queue_once(
    pool: asyncpg.Pool,
    settings: WorkerSettings,
    job_types: Optional[Iterable[str]] = None,
    batch_size: Optional[int] = None,
) -> Dict[str, Any]:
    filters = normalize_job_types(job_types)
    requested_batch_size = max(1, int(batch_size or settings.batch_size))
    jobs = await claim_jobs(pool, settings, filters, requested_batch_size)

    if not jobs:
        return {
            "claimed": 0,
            "processed": 0,
            "batch_size": requested_batch_size,
            "job_types": filters or list(SUPPORTED_JOB_TYPES),
        }

    for job in jobs:
        await process_job(pool, settings, job)

    return {
        "claimed": len(jobs),
        "processed": len(jobs),
        "batch_size": requested_batch_size,
        "job_types": filters or list(SUPPORTED_JOB_TYPES),
        "job_ids": [str(job["id"]) for job in jobs],
    }


async def run_scheduled_queue_drain(
    job_types: Optional[Iterable[str]] = None,
    batch_size: Optional[int] = None,
) -> Dict[str, Any]:
    settings = build_worker_settings()
    diagnostics = require_valid_db_diagnostics(analyze_db_dsn(get_db_dsn()))
    filters = normalize_job_types(job_types)
    logger.info(
        "Running scheduled queue drain version=%s db_target=%s batch_size=%s job_types=%s db_mode=%s db_user_kind=%s",
        SERVICE_VERSION,
        settings.db_target,
        batch_size or settings.batch_size,
        ",".join(filters or SUPPORTED_JOB_TYPES),
        settings.db_mode,
        settings.db_user_kind,
    )
    pool = await asyncpg.create_pool(
        diagnostics.dsn,
        min_size=1,
        max_size=max(2, int(batch_size or settings.batch_size)),
        init=init_db_connection,
    )
    try:
        result = await drain_queue_once(pool, settings, filters, batch_size)
        return {
            "status": "ok",
            "version": SERVICE_VERSION,
            "db_target": settings.db_target,
            **result,
        }
    finally:
        await pool.close()


def run_scheduled_queue_drain_sync(
    job_types: Optional[Iterable[str]] = None,
    batch_size: Optional[int] = None,
) -> Dict[str, Any]:
    return asyncio.run(run_scheduled_queue_drain(job_types, batch_size))


router = APIRouter()


@router.get("/health")
async def health(request: Request) -> Dict[str, Any]:
    settings: WorkerSettings = request.app.state.worker_settings
    return {
        "status": "ok",
        "version": SERVICE_VERSION,
        "worker_mode": current_worker_mode(),
        "automation_enabled": automation_enabled(),
        "job_types": list(SUPPORTED_JOB_TYPES),
        "db_mode": settings.db_mode,
        "db_user_kind": settings.db_user_kind,
        "db_config_valid": settings.db_config_valid,
    }


@router.get("/ops/health")
async def operational_health(request: Request) -> Dict[str, Any]:
    require_token(request)
    settings: WorkerSettings = request.app.state.worker_settings
    return {
        "status": "ok",
        "version": SERVICE_VERSION,
        "worker_mode": current_worker_mode(),
        "automation_enabled": automation_enabled(),
        "db_target": settings.db_target,
        "db_host": settings.db_host,
        "db_port": settings.db_port,
        "db_mode": settings.db_mode,
        "db_user_kind": settings.db_user_kind,
        "db_config_valid": settings.db_config_valid,
        "db_config_error": settings.db_config_error,
        "job_types": list(SUPPORTED_JOB_TYPES),
        "batch_size": settings.batch_size,
        "cooldown_minutes": settings.cooldown_minutes,
    }


@router.post("/calibration/fit")
async def calibration_fit(request: Request, body: CalibrationFitRequest) -> Dict[str, Any]:
    require_token(request)
    fitted = fit_calibration_shape(body.points, body.minimum_sample_size)
    return {
        "method": fitted["method"],
        "shape": fitted["shape"],
        "sample_size": fitted["sample_size"],
        "metrics": fitted["metrics"],
    }


@router.post("/calibration/predict")
async def calibration_predict(request: Request, body: CalibrationPredictRequest) -> Dict[str, float]:
    require_token(request)
    return {
        "raw_probability": clamp_probability(body.probability),
        "calibrated_probability": interpolate(body.probability, body.shape),
    }


@router.post("/ontology/link")
async def ontology_link(request: Request, body: OntologyLinkRequest) -> Dict[str, Any]:
    require_token(request)
    normalized_text = " ".join(text.lower() for text in body.texts)
    matches = []
    for entity_key, aliases in body.aliases.items():
        best = next((alias for alias in aliases if alias.lower() in normalized_text), None)
        if best:
            matches.append(
                {
                    "entity_key": entity_key,
                    "matched_text": best,
                    "confidence": 0.8,
                }
            )
    return {"matches": matches}


@router.post("/shadow/score")
async def shadow_score(request: Request, body: ShadowScoreRequest) -> Dict[str, Any]:
    require_token(request)
    disagreement = float(body.features.get("disagreement_index", 0.12))
    evidence = float(body.features.get("evidence_count", 0.0))
    drift = float(body.features.get("drift_score", 0.0))
    risk_score = max(0.05, min(0.95, disagreement * 0.6 + (0.2 if evidence < 3 else 0.05) + drift * 0.35))
    return {
        "subject_type": body.subject_type,
        "overconfidence_risk": round_float(risk_score, 4),
        "needs_reviewer_attention": risk_score >= 0.62,
        "correction_delta": round_float(-(risk_score - 0.5) * 0.12, 4),
    }


@router.post("/attribution/score")
async def attribution_score(request: Request, body: AttributionRequest) -> Dict[str, Any]:
    require_token(request)
    drivers = [
        {
            "label": key,
            "contribution": round_float(float(value), 4),
            "direction": "positive" if value >= 0 else "negative",
        }
        for key, value in body.features.items()
    ]
    drivers = sorted(drivers, key=lambda driver: abs(driver["contribution"]), reverse=True)[:5]
    return {
        "subject_type": body.subject_type,
        "drivers": drivers,
    }


@router.post("/game-theory/solve")
async def game_theory_solve(request: Request, body: GameTheorySolveRequest) -> Dict[str, Any]:
    require_token(request)
    started = time.perf_counter()
    try:
        result = solve_game_theory_framework(body.framework, body.payload)
    except SolverInputError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    diagnostics = result.get("diagnostics") if isinstance(result.get("diagnostics"), dict) else {}
    diagnostics["timing_ms"] = round((time.perf_counter() - started) * 1000, 3)
    diagnostics["solver_version"] = diagnostics.get("solver_version") or GAME_THEORY_SOLVER_VERSION
    result["diagnostics"] = diagnostics
    return result


@router.post("/forecast/bias-adjusted")
async def forecast_bias_adjusted(request: Request, body: BiasAdjustedForecastRequest) -> Dict[str, Any]:
    require_token(request)
    started = time.perf_counter()
    try:
        result = generate_bias_adjusted_forecast(
            historical_values=body.historical_values,
            actors=body.actors,
            payoff_structure=body.payoff_structure,
            events_data=body.events_data,
            lookback=body.lookback,
        )
    except InsufficientDataError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result["diagnostics"] = {
        "timing_ms": round((time.perf_counter() - started) * 1000, 3),
        "version": FORECAST_BIAS_VERSION,
    }
    return result


@router.post("/forecast/shadow-evaluate")
async def forecast_shadow_evaluate(request: Request, body: ShadowEvaluationRequest) -> Dict[str, Any]:
    require_token(request)
    started = time.perf_counter()
    try:
        result = evaluate_shadow_mode(
            historical_values=body.historical_values,
            outcomes=body.outcomes,
            heuristic_probabilities=body.heuristic_probabilities,
            actors=body.actors,
            payoff_structure=body.payoff_structure,
            events_data=body.events_data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result["diagnostics"] = {
        "timing_ms": round((time.perf_counter() - started) * 1000, 3),
        "version": FORECAST_BIAS_VERSION,
    }
    return result


@router.post("/ops/calibration-refresh")
async def operational_calibration_refresh(request: Request, body: OperationalRequest) -> Dict[str, Any]:
    require_token(request)
    try:
        conn = await connect_with_validated_dsn()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    try:
        return await persist_calibration_models(conn, body.minimumSampleSize)
    finally:
        await conn.close()


@router.post("/ops/drift-evaluate")
async def operational_drift_evaluate(request: Request, body: OperationalRequest) -> Dict[str, Any]:
    require_token(request)
    try:
        conn = await connect_with_validated_dsn()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    try:
        return await run_drift_evaluation(conn, body.threshold, request.app.state.worker_settings)
    finally:
        await conn.close()


def create_app() -> FastAPI:
    application = FastAPI(title="Strategic Intelligence Platform ML Service", version=SERVICE_VERSION)
    application.state.worker_settings = build_worker_settings()
    settings: WorkerSettings = application.state.worker_settings
    logger.info(
        "ML service starting version=%s worker_mode=%s automation_enabled=%s db_target=%s batch_size=%s handlers=%s db_mode=%s db_user_kind=%s db_config_valid=%s",
        SERVICE_VERSION,
        current_worker_mode(),
        automation_enabled(),
        settings.db_target,
        settings.batch_size,
        ",".join(SUPPORTED_JOB_TYPES),
        settings.db_mode,
        settings.db_user_kind,
        settings.db_config_valid,
    )
    if settings.db_config_error:
        logger.warning("ML DB configuration warning: %s", settings.db_config_error)
    application.include_router(router)
    return application


app = create_app()

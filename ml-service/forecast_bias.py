from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

MIN_TRAINING_SAMPLES = 100
LOOKBACK_WINDOW = 14
BIAS_LAMBDA = 0.3
SENTIMENT_WEIGHT = 0.15
LSTM_WEIGHT = 0.55
GT_BIAS_WEIGHT = 0.30

FORECAST_BIAS_VERSION = "forecast_bias_v1"


class InsufficientDataError(ValueError):
    pass


def _normalize_series(values: List[float]) -> np.ndarray:
    arr = np.array(values, dtype=float)
    if arr.size == 0:
        return arr
    mean = float(np.mean(arr))
    std = float(np.std(arr))
    if std < 1e-9:
        return np.zeros_like(arr)
    return (arr - mean) / std


def _create_sequences(data: np.ndarray, lookback: int) -> Tuple[np.ndarray, np.ndarray]:
    if len(data) < lookback + 1:
        raise InsufficientDataError(
            f"Need at least {lookback + 1} data points for lookback window {lookback}; got {len(data)}."
        )
    X: List[List[float]] = []
    y: List[float] = []
    for i in range(len(data) - lookback):
        X.append(data[i : i + lookback].tolist())
        y.append(float(data[i + lookback]))
    return np.array(X), np.array(y)


def train_lstm_baseline(
    historical_values: List[float],
    lookback: int = LOOKBACK_WINDOW,
) -> Dict[str, Any]:
    if len(historical_values) < MIN_TRAINING_SAMPLES:
        raise InsufficientDataError(
            f"Need at least {MIN_TRAINING_SAMPLES} historical data points; got {len(historical_values)}."
        )

    normalized = _normalize_series(historical_values)
    X, y = _create_sequences(normalized, lookback)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = MLPRegressor(
        hidden_layer_sizes=(64, 32),
        activation="relu",
        solver="adam",
        max_iter=300,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.15,
        n_iter_no_change=20,
    )
    model.fit(X_scaled, y)

    last_window = normalized[-lookback:].reshape(1, -1)
    last_window_scaled = scaler.transform(last_window)
    raw_prediction = float(model.predict(last_window_scaled)[0])

    mean = float(np.mean(historical_values))
    std = float(np.std(historical_values))
    denormalized = raw_prediction * std + mean if std > 1e-9 else mean

    baseline_probability = max(0.01, min(0.99, denormalized))

    train_score = float(model.score(X_scaled, y))

    return {
        "baseline_probability": round(baseline_probability, 6),
        "model_score": round(train_score, 6),
        "lookback": lookback,
        "training_samples": len(X),
        "normalized_prediction": round(raw_prediction, 6),
    }


def compute_game_theory_bias(
    actors: List[Dict[str, Any]],
    payoff_structure: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    if not actors or not payoff_structure:
        return {
            "bias_delta": 0.0,
            "method": "no_payoff_structure",
            "confidence": 0.0,
        }

    payoff_matrix = payoff_structure.get("payoff_matrix")
    if not payoff_matrix or not isinstance(payoff_matrix, list):
        return {
            "bias_delta": 0.0,
            "method": "missing_payoff_matrix",
            "confidence": 0.0,
        }

    try:
        matrix = np.array(payoff_matrix, dtype=float)
        if matrix.ndim < 2 or matrix.shape[0] < 2:
            return {
                "bias_delta": 0.0,
                "method": "insufficient_matrix",
                "confidence": 0.0,
            }

        row_max = np.max(matrix, axis=1) if matrix.ndim == 2 else np.max(matrix)
        col_max = np.max(matrix, axis=0) if matrix.ndim == 2 else np.max(matrix)

        cooperation_incentive = float(np.mean(row_max)) - float(np.min(row_max))
        defection_incentive = float(np.max(matrix)) - float(np.mean(row_max)) if matrix.ndim == 2 else 0.0

        if defection_incentive > cooperation_incentive:
            bias_delta = -BIAS_LAMBDA * (defection_incentive - cooperation_incentive) / (defection_incentive + cooperation_incentive + 1e-9)
            method = "defection_dominant"
        else:
            bias_delta = BIAS_LAMBDA * (cooperation_incentive - defection_incentive) / (cooperation_incentive + defection_incentive + 1e-9)
            method = "cooperation_dominant"

        confidence = min(1.0, abs(cooperation_incentive - defection_incentive) / (float(np.max(matrix)) + 1e-9))

        return {
            "bias_delta": round(max(-0.2, min(0.2, bias_delta)), 6),
            "method": method,
            "cooperation_incentive": round(cooperation_incentive, 6),
            "defection_incentive": round(defection_incentive, 6),
            "confidence": round(confidence, 6),
        }
    except (ValueError, TypeError, IndexError):
        return {
            "bias_delta": 0.0,
            "method": "computation_error",
            "confidence": 0.0,
        }


def compute_sentiment_overlay(
    events_data: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if not events_data:
        return {
            "sentiment_score": 0.0,
            "sentiment_adjustment": 0.0,
            "sample_size": 0,
            "method": "no_data",
        }

    tones: List[float] = []
    goldstein_values: List[float] = []

    for event in events_data:
        tone = event.get("tone") or event.get("avg_tone")
        if tone is not None:
            try:
                tones.append(float(tone))
            except (ValueError, TypeError):
                pass

        goldstein = event.get("goldstein_scale") or event.get("goldstein")
        if goldstein is not None:
            try:
                goldstein_values.append(float(goldstein))
            except (ValueError, TypeError):
                pass

    if not tones and not goldstein_values:
        return {
            "sentiment_score": 0.0,
            "sentiment_adjustment": 0.0,
            "sample_size": len(events_data),
            "method": "no_sentiment_fields",
        }

    sentiment_components: List[float] = []
    if tones:
        avg_tone = float(np.mean(tones))
        sentiment_components.append(np.tanh(avg_tone / 10.0))
    if goldstein_values:
        avg_goldstein = float(np.mean(goldstein_values))
        sentiment_components.append(np.tanh(avg_goldstein / 5.0))

    sentiment_score = float(np.mean(sentiment_components))
    sentiment_adjustment = SENTIMENT_WEIGHT * sentiment_score

    return {
        "sentiment_score": round(sentiment_score, 6),
        "sentiment_adjustment": round(max(-0.15, min(0.15, sentiment_adjustment)), 6),
        "sample_size": len(events_data),
        "tone_avg": round(float(np.mean(tones)), 6) if tones else None,
        "goldstein_avg": round(float(np.mean(goldstein_values)), 6) if goldstein_values else None,
        "method": "tone_goldstein_blend",
    }


def ensemble_forecast(
    lstm_result: Dict[str, Any],
    gt_bias_result: Dict[str, Any],
    sentiment_result: Dict[str, Any],
) -> Dict[str, Any]:
    baseline = float(lstm_result.get("baseline_probability", 0.5))
    gt_bias = float(gt_bias_result.get("bias_delta", 0.0))
    sentiment_adj = float(sentiment_result.get("sentiment_adjustment", 0.0))

    weighted_baseline = baseline * LSTM_WEIGHT
    weighted_gt_bias = (baseline + gt_bias) * GT_BIAS_WEIGHT
    weighted_sentiment = (baseline + sentiment_adj) * SENTIMENT_WEIGHT

    total_weight = LSTM_WEIGHT + GT_BIAS_WEIGHT + SENTIMENT_WEIGHT
    adjusted_probability = (weighted_baseline + weighted_gt_bias + weighted_sentiment) / total_weight

    adjusted_probability = max(0.01, min(0.99, adjusted_probability))

    confidence = float(lstm_result.get("model_score", 0.0)) * 0.5 + float(gt_bias_result.get("confidence", 0.0)) * 0.3 + 0.2

    return {
        "probability": round(adjusted_probability, 6),
        "baseline_probability": round(baseline, 6),
        "gt_bias_delta": round(gt_bias, 6),
        "sentiment_adjustment": round(sentiment_adj, 6),
        "weights": {
            "lstm": LSTM_WEIGHT,
            "gt_bias": GT_BIAS_WEIGHT,
            "sentiment": SENTIMENT_WEIGHT,
        },
        "confidence": round(max(0.1, min(0.95, confidence)), 6),
        "components": {
            "lstm": lstm_result,
            "gt_bias": gt_bias_result,
            "sentiment": sentiment_result,
        },
        "version": FORECAST_BIAS_VERSION,
    }


def generate_bias_adjusted_forecast(
    historical_values: List[float],
    actors: Optional[List[Dict[str, Any]]] = None,
    payoff_structure: Optional[Dict[str, Any]] = None,
    events_data: Optional[List[Dict[str, Any]]] = None,
    lookback: int = LOOKBACK_WINDOW,
) -> Dict[str, Any]:
    if len(historical_values) < MIN_TRAINING_SAMPLES:
        return {
            "probability": 0.5,
            "method": "heuristic_fallback",
            "reason": f"Insufficient training data: {len(historical_values)}/{MIN_TRAINING_SAMPLES}",
            "confidence": 0.1,
            "version": FORECAST_BIAS_VERSION,
            "components": {},
        }

    lstm_result = train_lstm_baseline(historical_values, lookback=lookback)
    gt_bias_result = compute_game_theory_bias(actors or [], payoff_structure)
    sentiment_result = compute_sentiment_overlay(events_data or [])
    ensemble = ensemble_forecast(lstm_result, gt_bias_result, sentiment_result)

    return {
        **ensemble,
        "method": "lstm_gt_bias_sentiment_ensemble",
        "historical_sample_size": len(historical_values),
    }


def compute_brier_score(forecast_probability: float, outcome: float) -> float:
    return float((forecast_probability - outcome) ** 2)


def evaluate_shadow_mode(
    historical_values: List[float],
    outcomes: List[float],
    heuristic_probabilities: List[float],
    actors: Optional[List[Dict[str, Any]]] = None,
    payoff_structure: Optional[Dict[str, Any]] = None,
    events_data: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    if len(outcomes) != len(heuristic_probabilities):
        raise ValueError("outcomes and heuristic_probabilities must have the same length")

    if len(outcomes) < MIN_TRAINING_SAMPLES:
        return {
            "evaluable": False,
            "reason": f"Need at least {MIN_TRAINING_SAMPLES} resolved outcomes; got {len(outcomes)}.",
            "version": FORECAST_BIAS_VERSION,
        }

    split = int(len(outcomes) * 0.8)
    train_values = historical_values[:split] if len(historical_values) >= split else historical_values
    eval_outcomes = outcomes[split:]
    eval_heuristic = heuristic_probabilities[split:]

    bias_adjusted_probs: List[float] = []
    for i in range(len(eval_outcomes)):
        try:
            result = generate_bias_adjusted_forecast(
                train_values,
                actors=actors,
                payoff_structure=payoff_structure,
                events_data=events_data,
            )
            bias_adjusted_probs.append(float(result.get("probability", 0.5)))
        except (InsufficientDataError, ValueError):
            bias_adjusted_probs.append(0.5)

    bias_brier = float(np.mean([compute_brier_score(p, o) for p, o in zip(bias_adjusted_probs, eval_outcomes)]))
    heuristic_brier = float(np.mean([compute_brier_score(p, o) for p, o in zip(eval_heuristic, eval_outcomes)]))

    return {
        "evaluable": True,
        "bias_adjusted_brier": round(bias_brier, 6),
        "heuristic_brier": round(heuristic_brier, 6),
        "delta": round(bias_brier - heuristic_brier, 6),
        "bias_is_better": bias_brier <= heuristic_brier,
        "evaluation_samples": len(eval_outcomes),
        "version": FORECAST_BIAS_VERSION,
    }

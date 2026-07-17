import numpy as np
import pytest
from forecast_bias import (
    compute_brier_score,
    compute_game_theory_bias,
    compute_sentiment_overlay,
    ensemble_forecast,
    evaluate_shadow_mode,
    generate_bias_adjusted_forecast,
    train_lstm_baseline,
    InsufficientDataError,
    FORECAST_BIAS_VERSION,
)


def test_train_lstm_baseline_returns_valid_prediction():
    np.random.seed(42)
    values = (np.sin(np.linspace(0, 20, 150)) * 0.3 + 0.5 + np.random.randn(150) * 0.02).tolist()
    result = train_lstm_baseline(values, lookback=14)
    assert 0.01 <= result["baseline_probability"] <= 0.99
    assert result["training_samples"] > 0
    assert result["lookback"] == 14
    assert "model_score" in result


def test_train_lstm_baseline_rejects_insufficient_data():
    with pytest.raises(InsufficientDataError):
        train_lstm_baseline([0.5, 0.6, 0.7], lookback=14)


def test_compute_game_theory_bias_cooperation_dominant():
    actors = [{"id": "a"}, {"id": "b"}]
    payoff = {"payoff_matrix": [[3, 0], [5, 1]]}
    result = compute_game_theory_bias(actors, payoff)
    assert "bias_delta" in result
    assert "method" in result
    assert "confidence" in result
    assert -0.2 <= result["bias_delta"] <= 0.2


def test_compute_game_theory_bias_no_payoff_structure():
    result = compute_game_theory_bias([], None)
    assert result["bias_delta"] == 0.0
    assert result["method"] == "no_payoff_structure"


def test_compute_sentiment_overlay_with_tone_and_goldstein():
    events = [
        {"tone": 5.0, "goldstein_scale": 3.0},
        {"tone": -2.0, "goldstein_scale": -1.0},
        {"tone": 3.0, "goldstein_scale": 2.0},
    ]
    result = compute_sentiment_overlay(events)
    assert -1.0 <= result["sentiment_score"] <= 1.0
    assert -0.15 <= result["sentiment_adjustment"] <= 0.15
    assert result["sample_size"] == 3
    assert result["method"] == "tone_goldstein_blend"


def test_compute_sentiment_overlay_no_data():
    result = compute_sentiment_overlay([])
    assert result["sentiment_score"] == 0.0
    assert result["method"] == "no_data"


def test_ensemble_forecast_blends_components():
    lstm = {"baseline_probability": 0.6, "model_score": 0.7}
    gt = {"bias_delta": 0.05, "confidence": 0.8}
    sent = {"sentiment_adjustment": 0.03}
    result = ensemble_forecast(lstm, gt, sent)
    assert 0.01 <= result["probability"] <= 0.99
    assert result["baseline_probability"] == 0.6
    assert result["gt_bias_delta"] == 0.05
    assert result["sentiment_adjustment"] == 0.03
    assert result["weights"]["lstm"] + result["weights"]["gt_bias"] + result["weights"]["sentiment"] == pytest.approx(1.0)
    assert result["version"] == FORECAST_BIAS_VERSION


def test_generate_bias_adjusted_forecast_fallback():
    result = generate_bias_adjusted_forecast(
        historical_values=[0.5, 0.6, 0.7],
        actors=[],
        payoff_structure=None,
        events_data=[],
    )
    assert result["method"] == "heuristic_fallback"
    assert result["probability"] == 0.5
    assert result["confidence"] == 0.1


def test_generate_bias_adjusted_forecast_full_ensemble():
    np.random.seed(42)
    values = (np.sin(np.linspace(0, 20, 150)) * 0.3 + 0.5 + np.random.randn(150) * 0.02).tolist()
    actors = [{"id": "a"}, {"id": "b"}]
    payoff = {"payoff_matrix": [[3, 0], [5, 1]]}
    events = [{"tone": 2.0, "goldstein_scale": 1.0}]
    result = generate_bias_adjusted_forecast(values, actors=actors, payoff_structure=payoff, events_data=events)
    assert result["method"] == "lstm_gt_bias_sentiment_ensemble"
    assert 0.01 <= result["probability"] <= 0.99
    assert "components" in result
    assert "lstm" in result["components"]
    assert "gt_bias" in result["components"]
    assert "sentiment" in result["components"]
    assert result["historical_sample_size"] == 150


def test_compute_brier_score():
    assert compute_brier_score(0.8, 1.0) == pytest.approx(0.04)
    assert compute_brier_score(0.5, 0.0) == pytest.approx(0.25)
    assert compute_brier_score(0.3, 1.0) == pytest.approx(0.49)


def test_evaluate_shadow_mode_insufficient_data():
    result = evaluate_shadow_mode(
        historical_values=[0.5, 0.6],
        outcomes=[1.0, 0.0],
        heuristic_probabilities=[0.5, 0.5],
    )
    assert result["evaluable"] is False
    assert "reason" in result


def test_evaluate_shadow_mode_returns_brier_comparison():
    np.random.seed(42)
    n = 150
    values = (np.sin(np.linspace(0, 20, n)) * 0.3 + 0.5 + np.random.randn(n) * 0.02).tolist()
    outcomes = [1.0 if v > 0.5 else 0.0 for v in values]
    heuristics = [0.5 for _ in range(n)]
    result = evaluate_shadow_mode(
        historical_values=values,
        outcomes=outcomes,
        heuristic_probabilities=heuristics,
    )
    assert result["evaluable"] is True
    assert "bias_adjusted_brier" in result
    assert "heuristic_brier" in result
    assert "delta" in result
    assert "bias_is_better" in result
    assert result["evaluation_samples"] > 0

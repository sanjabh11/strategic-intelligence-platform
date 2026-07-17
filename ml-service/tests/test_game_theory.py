from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from solvers import SolverInputError, solve_game_theory_framework


def test_shapley_majority_game_is_symmetric():
    result = solve_game_theory_framework(
        "coalitional",
        {
            "players": ["P1", "P2", "P3"],
            "coalition_values": {
                "__empty__": 0,
                "P1": 0,
                "P2": 0,
                "P3": 0,
                "P1|P2": 1,
                "P1|P3": 1,
                "P2|P3": 1,
                "P1|P2|P3": 1,
            },
        },
    )

    shapley = result["results"]["shapley_values"]
    assert shapley["P1"] == pytest.approx(1 / 3, abs=1e-6)
    assert shapley["P2"] == pytest.approx(1 / 3, abs=1e-6)
    assert shapley["P3"] == pytest.approx(1 / 3, abs=1e-6)
    assert result["results"]["core"]["is_non_empty"] is False


def test_shapley_circuit_breaker_enforces_player_limit():
    with pytest.raises(SolverInputError):
        solve_game_theory_framework(
            "coalitional",
            {
                "players": [f"P{i}" for i in range(13)],
                "coalition_values": {"|".join(f"P{i}" for i in range(13)): 1},
            },
        )


def test_pbe_off_path_message_returns_diagnostic():
    result = solve_game_theory_framework(
        "signaling",
        {
            "sender_types": ["Type_H", "Type_L"],
            "prior_probs": {"Type_H": 0.6, "Type_L": 0.4},
            "messages": ["Msg_A", "Msg_B"],
            "receiver_actions": ["Accept", "Reject"],
            "sender_strategies": {
                "Type_H": {"Msg_A": 1.0, "Msg_B": 0.0},
                "Type_L": {"Msg_A": 1.0, "Msg_B": 0.0},
            },
            "observed_message": "Msg_B",
            "sender_payoffs": {
                "Type_H": {"Msg_A": {"Accept": 3, "Reject": 0}, "Msg_B": {"Accept": 1, "Reject": 0}},
                "Type_L": {"Msg_A": {"Accept": 2, "Reject": 0}, "Msg_B": {"Accept": 1, "Reject": 0}},
            },
            "receiver_payoffs": {
                "Type_H": {"Msg_A": {"Accept": 2, "Reject": 0}, "Msg_B": {"Accept": 1, "Reject": 0}},
                "Type_L": {"Msg_A": {"Accept": -1, "Reject": 0}, "Msg_B": {"Accept": -1, "Reject": 0}},
            },
        },
    )

    assert result["results"]["posterior"]["off_path"] is True
    assert result["diagnostics"]["off_path"] is True
    assert result["warnings"]


def test_correlated_equilibrium_returns_probability_distribution():
    result = solve_game_theory_framework(
        "correlated",
        {
            "players": ["Row", "Column"],
            "actions_by_player": [["A", "B"], ["A", "B"]],
            "payoff_matrix": [
                [[4, 4], [0, 3]],
                [[3, 0], [2, 2]],
            ],
        },
    )

    distribution = result["results"]["distribution"]
    total_mass = sum(sum(row) for row in distribution)
    assert total_mass == pytest.approx(1.0, abs=1e-6)
    assert len(result["results"]["obedience_slacks"]) > 0


def test_replicator_dynamics_preserves_probability_simplex():
    result = solve_game_theory_framework(
        "evolutionary",
        {
            "strategies": ["Hawk", "Dove"],
            "payoff_matrix": [[0.0, 3.0], [1.0, 2.0]],
            "initial_shares": [0.5, 0.5],
            "steps": 20,
            "dt": 0.1,
        },
    )

    endpoint = result["results"]["endpoint_shares"]
    assert sum(endpoint.values()) == pytest.approx(1.0, abs=1e-6)
    assert len(result["results"]["trajectory"]) == 21


def test_qre_returns_mixed_profile_and_convergence_diagnostics():
    result = solve_game_theory_framework(
        "bounded_rationality",
        {
            "players": ["Row", "Column"],
            "actions_by_player": [["Cooperate", "Defect"], ["Cooperate", "Defect"]],
            "payoff_matrix": [
                [[3, 3], [0, 5]],
                [[5, 0], [1, 1]],
            ],
            "lambda": 0.4,
        },
    )

    row_profile = result["results"]["profile"]["Row"]
    assert sum(row_profile.values()) == pytest.approx(1.0, abs=1e-6)
    assert "iterations" in result["diagnostics"]
    assert len(result["results"]["sensitivity_samples"]) == 3


def test_ipd_tournament_returns_ranked_strategies():
    result = solve_game_theory_framework(
        "ipd_tournament",
        {
            "strategies": ["cooperator", "defector", "titfortat", "grudger"],
            "turns": 50,
            "repetitions": 3,
            "seed": 42,
        },
    )

    ranked = result["results"]["ranked_strategies"]
    assert len(ranked) == 4
    assert all("rank" in r and "strategy" in r and "mean_score" in r for r in ranked)
    assert ranked[0]["rank"] == 1
    assert result["results"]["strategy_names"] == ["Cooperator", "Defector", "Tit For Tat", "Grudger"]
    assert len(result["results"]["payoff_matrix"]) == 4
    assert len(result["results"]["evolutionary_trajectory"]) > 0
    assert result["results"]["evolutionary_trajectory"][0]["step"] == 0
    assert "solver_version" in result["diagnostics"]


def test_ipd_tournament_circuit_breaker_enforces_strategy_limit():
    with pytest.raises(SolverInputError):
        solve_game_theory_framework(
            "ipd_tournament",
            {
                "strategies": [f"cooperator" for _ in range(20)],
                "turns": 10,
                "repetitions": 1,
            },
        )


def test_ipd_tournament_rejects_unknown_strategy():
    with pytest.raises(SolverInputError):
        solve_game_theory_framework(
            "ipd_tournament",
            {
                "strategies": ["cooperator", "nonexistent_strategy"],
                "turns": 10,
                "repetitions": 1,
            },
        )

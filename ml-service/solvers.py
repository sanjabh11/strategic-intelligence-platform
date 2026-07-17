from __future__ import annotations

import hashlib
import json
import math
import os
from itertools import combinations
from typing import Any, Dict, Iterable, List, Sequence, Tuple

import numpy as np
from scipy.optimize import linprog


MAX_COALITION_PLAYERS = max(3, int(os.getenv("MAX_COALITION_PLAYERS", "12")))
MAX_NORMAL_FORM_PROFILES = max(4, int(os.getenv("MAX_NORMAL_FORM_PROFILES", "4096")))
MAX_SIGNAL_TYPES = max(2, int(os.getenv("MAX_SIGNAL_TYPES", "6")))
MAX_MESSAGES = max(2, int(os.getenv("MAX_MESSAGES", "8")))
MAX_RECEIVER_ACTIONS = max(2, int(os.getenv("MAX_RECEIVER_ACTIONS", "8")))
MAX_EVOLUTIONARY_STEPS = max(10, int(os.getenv("MAX_EVOLUTIONARY_STEPS", "2000")))
MAX_IPD_TURNS = max(10, int(os.getenv("MAX_IPD_TURNS", "500")))
MAX_IPD_STRATEGIES = max(2, int(os.getenv("MAX_IPD_STRATEGIES", "16")))
MAX_IPD_REPETITIONS = max(1, int(os.getenv("MAX_IPD_REPETITIONS", "50")))

SOLVER_VERSION = "game_theory_v1"


class SolverInputError(ValueError):
    pass


def _hash_payload(payload: Dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _round(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def _ensure_string_list(values: Iterable[Any], field: str) -> List[str]:
    cleaned = [str(value).strip() for value in values if str(value).strip()]
    if not cleaned:
        raise SolverInputError(f"{field} must contain at least one non-empty string")
    deduped = list(dict.fromkeys(cleaned))
    return deduped


def _ensure_probability_vector(values: Sequence[float], field: str) -> List[float]:
    cleaned = [float(value) for value in values]
    if any(value < 0 or not math.isfinite(value) for value in cleaned):
        raise SolverInputError(f"{field} contains invalid probabilities")
    total = sum(cleaned)
    if total <= 0:
        raise SolverInputError(f"{field} must sum to a positive value")
    normalized = [value / total for value in cleaned]
    return normalized


def _ensure_probability_record(record: Dict[str, Any], expected_keys: Sequence[str], field: str) -> Dict[str, float]:
    normalized = {key: float(record[key]) for key in expected_keys if key in record}
    if set(normalized.keys()) != set(expected_keys):
        raise SolverInputError(f"{field} must contain exactly these keys: {', '.join(expected_keys)}")
    values = _ensure_probability_vector(list(normalized.values()), field)
    return {key: values[index] for index, key in enumerate(expected_keys)}


def _validate_two_player_tensor(players: Sequence[str], actions_by_player: Sequence[Sequence[str]], payoff_matrix: Sequence[Sequence[Sequence[float]]]) -> Tuple[List[str], List[List[str]], np.ndarray]:
    normalized_players = _ensure_string_list(players, "players")
    if len(normalized_players) != 2:
        raise SolverInputError("This solver currently supports exactly two players")

    action_sets = [_ensure_string_list(actions, f"actions_by_player[{index}]") for index, actions in enumerate(actions_by_player)]
    if len(action_sets) != 2:
        raise SolverInputError("actions_by_player must contain exactly two action arrays")

    action_count_product = len(action_sets[0]) * len(action_sets[1])
    if action_count_product > MAX_NORMAL_FORM_PROFILES:
        raise SolverInputError(f"normal-form profile count exceeds ceiling ({MAX_NORMAL_FORM_PROFILES})")

    tensor = np.asarray(payoff_matrix, dtype=float)
    expected_shape = (len(action_sets[0]), len(action_sets[1]), 2)
    if tensor.shape != expected_shape:
        raise SolverInputError(f"payoff_matrix must have shape {expected_shape}, got {tensor.shape}")
    if not np.isfinite(tensor).all():
        raise SolverInputError("payoff_matrix contains non-finite values")

    return normalized_players, action_sets, tensor


def _all_coalitions(players: Sequence[str]) -> List[Tuple[str, ...]]:
    coalitions: List[Tuple[str, ...]] = [tuple()]
    for r in range(1, len(players) + 1):
        coalitions.extend(tuple(sorted(combo)) for combo in combinations(players, r))
    return coalitions


def _coalition_key(coalition: Sequence[str]) -> str:
    return "__empty__" if len(coalition) == 0 else "|".join(sorted(coalition))


def calculate_shapley_value(players: List[str], coalition_values: Dict[str, float]) -> Dict[str, float]:
    n = len(players)
    if n > MAX_COALITION_PLAYERS:
        raise SolverInputError(f"player count exceeds ceiling ({MAX_COALITION_PLAYERS})")

    shapley_values = {player: 0.0 for player in players}
    worth_lookup = {_coalition_key(tuple()): 0.0, **coalition_values}

    for player in players:
        others = [candidate for candidate in players if candidate != player]
        for r in range(len(others) + 1):
            for subset in combinations(others, r):
                coalition_key = _coalition_key(subset)
                coalition_plus_player = _coalition_key(tuple(sorted((*subset, player))))
                worth_subset = float(worth_lookup.get(coalition_key, 0.0))
                worth_plus_player = float(worth_lookup.get(coalition_plus_player, 0.0))
                marginal = worth_plus_player - worth_subset
                weight = (math.factorial(len(subset)) * math.factorial(n - len(subset) - 1)) / math.factorial(n)
                shapley_values[player] += weight * marginal

    return {player: _round(value) for player, value in shapley_values.items()}


def solve_core(players: List[str], coalition_values: Dict[str, float]) -> Dict[str, Any]:
    grand_key = _coalition_key(players)
    if grand_key not in coalition_values:
        raise SolverInputError("coalition_values must include the grand coalition worth")

    n = len(players)
    coalitions = [coalition for coalition in _all_coalitions(players) if 0 < len(coalition) < n]
    if not coalitions:
        return {"is_non_empty": True, "allocation": {_coalition_key(players): coalition_values[grand_key]}, "blocking_coalitions": []}

    c = np.zeros(n)
    a_ub = []
    b_ub = []
    for coalition in coalitions:
        row = np.zeros(n)
        for index, player in enumerate(players):
            if player in coalition:
                row[index] = -1
        a_ub.append(row)
        b_ub.append(-float(coalition_values.get(_coalition_key(coalition), 0.0)))

    a_eq = [np.ones(n)]
    b_eq = [float(coalition_values[grand_key])]
    result = linprog(c=c, A_ub=np.asarray(a_ub), b_ub=np.asarray(b_ub), A_eq=np.asarray(a_eq), b_eq=np.asarray(b_eq), bounds=[(None, None)] * n, method="highs")

    if result.success:
        return {
            "is_non_empty": True,
            "allocation": {player: _round(result.x[index]) for index, player in enumerate(players)},
            "blocking_coalitions": [],
        }

    blocking = [
        {
            "coalition": list(coalition),
            "worth": _round(float(coalition_values.get(_coalition_key(coalition), 0.0))),
        }
        for coalition in coalitions
        if float(coalition_values.get(_coalition_key(coalition), 0.0)) > float(coalition_values.get(grand_key, 0.0))
    ]
    return {
        "is_non_empty": False,
        "allocation": None,
        "blocking_coalitions": blocking,
        "solver_status": result.message,
    }


def solve_coalitional(payload: Dict[str, Any]) -> Dict[str, Any]:
    players = _ensure_string_list(payload.get("players", []), "players")
    if len(players) < 3:
        raise SolverInputError("coalitional solver requires at least three players")
    if len(players) > MAX_COALITION_PLAYERS:
        raise SolverInputError(f"player count exceeds ceiling ({MAX_COALITION_PLAYERS})")

    raw_values = payload.get("coalition_values")
    if not isinstance(raw_values, dict):
        raise SolverInputError("coalition_values must be an object mapping coalition keys to worths")

    coalition_values: Dict[str, float] = {}
    allowed_players = set(players)
    for raw_key, raw_value in raw_values.items():
        if not isinstance(raw_value, (int, float)) or not math.isfinite(float(raw_value)):
            raise SolverInputError(f"coalition_values[{raw_key}] is not finite")
        key = str(raw_key)
        if key != "__empty__":
            members = [member.strip() for member in key.split("|") if member.strip()]
            if not members or any(member not in allowed_players for member in members):
                raise SolverInputError(f"coalition_values contains invalid coalition key: {key}")
            key = "|".join(sorted(dict.fromkeys(members)))
        coalition_values[key] = float(raw_value)

    if "__empty__" not in coalition_values:
        coalition_values["__empty__"] = 0.0

    shapley = calculate_shapley_value(players, coalition_values)
    core = solve_core(players, coalition_values)
    grand_coalition = _coalition_key(players)

    return {
        "framework": "coalitional",
        "ok": True,
        "summary": f"Grand coalition worth {coalition_values.get(grand_coalition, 0.0)} with {'non-empty' if core['is_non_empty'] else 'empty'} core.",
        "normalized_inputs": {
            "players": players,
            "coalition_values": coalition_values,
        },
        "results": {
            "grand_coalition": players,
            "grand_coalition_worth": _round(coalition_values.get(grand_coalition, 0.0)),
            "shapley_values": shapley,
            "core": core,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({"players": players, "coalition_values": coalition_values}),
        },
        "warnings": [],
    }


def check_pbe_consistency(prior_probs: Dict[str, float], sender_strategies: Dict[str, Dict[str, float]], observed_message: str) -> Dict[str, Any]:
    total_prob_msg = 0.0
    for sender_type, prior in prior_probs.items():
        total_prob_msg += prior * sender_strategies.get(sender_type, {}).get(observed_message, 0.0)

    if total_prob_msg == 0:
        return {
            "off_path": True,
            "message_probability": 0.0,
            "posterior_beliefs": None,
            "note": "Off-path belief: unconstrained by Bayes rule.",
        }

    posterior = {
        sender_type: _round((prior * sender_strategies.get(sender_type, {}).get(observed_message, 0.0)) / total_prob_msg)
        for sender_type, prior in prior_probs.items()
    }
    return {
        "off_path": False,
        "message_probability": _round(total_prob_msg),
        "posterior_beliefs": posterior,
    }


def solve_perfect_bayesian(payload: Dict[str, Any]) -> Dict[str, Any]:
    sender_types = _ensure_string_list(payload.get("sender_types", []), "sender_types")
    messages = _ensure_string_list(payload.get("messages", []), "messages")
    receiver_actions = _ensure_string_list(payload.get("receiver_actions", []), "receiver_actions")
    if len(sender_types) > MAX_SIGNAL_TYPES:
        raise SolverInputError(f"sender_types exceeds ceiling ({MAX_SIGNAL_TYPES})")
    if len(messages) > MAX_MESSAGES:
        raise SolverInputError(f"messages exceeds ceiling ({MAX_MESSAGES})")
    if len(receiver_actions) > MAX_RECEIVER_ACTIONS:
        raise SolverInputError(f"receiver_actions exceeds ceiling ({MAX_RECEIVER_ACTIONS})")

    prior_probs = _ensure_probability_record(payload.get("prior_probs", {}), sender_types, "prior_probs")
    sender_strategies_raw = payload.get("sender_strategies") or {}
    sender_strategies = {
        sender_type: _ensure_probability_record(sender_strategies_raw.get(sender_type, {}), messages, f"sender_strategies[{sender_type}]")
        for sender_type in sender_types
    }
    sender_payoffs = payload.get("sender_payoffs") or {}
    receiver_payoffs = payload.get("receiver_payoffs") or {}
    observed_message = str(payload.get("observed_message") or messages[0])

    for sender_type in sender_types:
        if sender_type not in sender_payoffs or sender_type not in receiver_payoffs:
            raise SolverInputError(f"Missing payoff table for sender type {sender_type}")
        for message in messages:
            if message not in sender_payoffs[sender_type] or message not in receiver_payoffs[sender_type]:
                raise SolverInputError(f"Missing payoff row for message {message} and type {sender_type}")
            for action in receiver_actions:
                if action not in sender_payoffs[sender_type][message] or action not in receiver_payoffs[sender_type][message]:
                    raise SolverInputError(f"Missing payoff entry for type={sender_type}, message={message}, action={action}")

    posterior = check_pbe_consistency(prior_probs, sender_strategies, observed_message)
    receiver_expected_payoffs: Dict[str, float] = {}

    if posterior["posterior_beliefs"] is not None:
        beliefs = posterior["posterior_beliefs"]
        for action in receiver_actions:
            payoff = 0.0
            for sender_type in sender_types:
                payoff += beliefs[sender_type] * float(receiver_payoffs[sender_type][observed_message][action])
            receiver_expected_payoffs[action] = _round(payoff)
    else:
        for action in receiver_actions:
            receiver_expected_payoffs[action] = 0.0

    max_receiver_payoff = max(receiver_expected_payoffs.values()) if receiver_expected_payoffs else 0.0
    best_receiver_actions = [action for action, payoff in receiver_expected_payoffs.items() if math.isclose(payoff, max_receiver_payoff, abs_tol=1e-6)]

    sender_best_messages: Dict[str, List[str]] = {}
    sender_sequentially_rational = True
    for sender_type in sender_types:
        payoffs_by_message: Dict[str, float] = {}
        for message in messages:
            receiver_action = best_receiver_actions[0] if best_receiver_actions else receiver_actions[0]
            payoffs_by_message[message] = float(sender_payoffs[sender_type][message][receiver_action])
        best_payoff = max(payoffs_by_message.values())
        sender_best_messages[sender_type] = [message for message, payoff in payoffs_by_message.items() if math.isclose(payoff, best_payoff, abs_tol=1e-6)]
        supported_messages = [message for message, probability in sender_strategies[sender_type].items() if probability > 1e-8]
        if any(message not in sender_best_messages[sender_type] for message in supported_messages):
            sender_sequentially_rational = False

    supported_message_sets = {tuple(sorted([message for message, probability in sender_strategies[sender_type].items() if probability > 1e-8])) for sender_type in sender_types}
    equilibrium_form = "pooling" if len(supported_message_sets) == 1 else "separating"

    return {
        "framework": "signaling",
        "ok": True,
        "summary": f"{equilibrium_form.title()} signaling candidate with {'off-path' if posterior['off_path'] else 'on-path'} belief update for {observed_message}.",
        "normalized_inputs": {
            "sender_types": sender_types,
            "prior_probs": prior_probs,
            "messages": messages,
            "receiver_actions": receiver_actions,
            "sender_strategies": sender_strategies,
            "observed_message": observed_message,
        },
        "results": {
            "equilibrium_form": equilibrium_form,
            "posterior": posterior,
            "receiver_expected_payoffs": receiver_expected_payoffs,
            "best_receiver_actions": best_receiver_actions,
            "sender_best_messages": sender_best_messages,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({
                "sender_types": sender_types,
                "prior_probs": prior_probs,
                "messages": messages,
                "receiver_actions": receiver_actions,
                "sender_strategies": sender_strategies,
            }),
            "receiver_sequentially_rational": not posterior["off_path"],
            "sender_sequentially_rational": sender_sequentially_rational,
            "off_path": posterior["off_path"],
        },
        "warnings": [] if not posterior["off_path"] else ["Observed message is off-path; Bayes-consistent posterior is unavailable."],
    }


def solve_correlated_equilibrium(payload: Dict[str, Any]) -> Dict[str, Any]:
    players, actions_by_player, tensor = _validate_two_player_tensor(
        payload.get("players", []),
        payload.get("actions_by_player", []),
        payload.get("payoff_matrix", []),
    )
    objective = str(payload.get("objective") or "welfare_maximizing")
    m, n, _ = tensor.shape
    variable_count = m * n

    welfare = np.array([(tensor[i, j, 0] + tensor[i, j, 1]) for i in range(m) for j in range(n)], dtype=float)
    c = -welfare if objective == "welfare_maximizing" else np.zeros(variable_count)

    a_eq = [np.ones(variable_count)]
    b_eq = [1.0]
    a_ub: List[np.ndarray] = []
    b_ub: List[float] = []
    slacks_spec: List[Tuple[str, str, str]] = []

    for recommended_index in range(m):
        for deviation_index in range(m):
            if recommended_index == deviation_index:
                continue
            row = np.zeros(variable_count)
            for opponent_index in range(n):
                column = recommended_index * n + opponent_index
                row[column] = -(tensor[recommended_index, opponent_index, 0] - tensor[deviation_index, opponent_index, 0])
            a_ub.append(row)
            b_ub.append(0.0)
            slacks_spec.append((players[0], actions_by_player[0][recommended_index], actions_by_player[0][deviation_index]))

    for recommended_index in range(n):
        for deviation_index in range(n):
            if recommended_index == deviation_index:
                continue
            row = np.zeros(variable_count)
            for opponent_index in range(m):
                column = opponent_index * n + recommended_index
                row[column] = -(tensor[opponent_index, recommended_index, 1] - tensor[opponent_index, deviation_index, 1])
            a_ub.append(row)
            b_ub.append(0.0)
            slacks_spec.append((players[1], actions_by_player[1][recommended_index], actions_by_player[1][deviation_index]))

    result = linprog(
        c=c,
        A_ub=np.asarray(a_ub) if a_ub else None,
        b_ub=np.asarray(b_ub) if b_ub else None,
        A_eq=np.asarray(a_eq),
        b_eq=np.asarray(b_eq),
        bounds=[(0.0, 1.0)] * variable_count,
        method="highs",
    )
    if not result.success:
        raise SolverInputError(f"correlated-equilibrium LP failed: {result.message}")

    distribution = result.x.reshape((m, n))
    obedience_slacks = []
    if a_ub:
        raw_slacks = np.asarray(b_ub) - np.dot(np.asarray(a_ub), result.x)
        for index, slack in enumerate(raw_slacks):
            player, recommended, deviation = slacks_spec[index]
            obedience_slacks.append(
                {
                    "player": player,
                    "recommended_action": recommended,
                    "deviation_action": deviation,
                    "slack": _round(slack),
                }
            )

    expected_payoffs = {
        players[player_index]: _round(float(np.sum(distribution * tensor[:, :, player_index])))
        for player_index in range(2)
    }
    welfare_value = _round(float(np.sum(distribution * (tensor[:, :, 0] + tensor[:, :, 1]))))

    return {
        "framework": "correlated",
        "ok": True,
        "summary": f"Computed obedience-compatible correlated plan with total welfare {welfare_value}.",
        "normalized_inputs": {
            "players": players,
            "actions_by_player": actions_by_player,
            "objective": objective,
        },
        "results": {
            "distribution": distribution.round(6).tolist(),
            "expected_payoffs": expected_payoffs,
            "expected_welfare": welfare_value,
            "obedience_slacks": obedience_slacks,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({
                "players": players,
                "actions_by_player": actions_by_player,
                "objective": objective,
                "payoff_matrix": tensor.tolist(),
            }),
        },
        "warnings": [],
    }


def solve_evolutionary(payload: Dict[str, Any]) -> Dict[str, Any]:
    strategies = _ensure_string_list(payload.get("strategies", []), "strategies")
    payoff_matrix = np.asarray(payload.get("payoff_matrix", []), dtype=float)
    initial_shares = np.asarray(_ensure_probability_vector(payload.get("initial_shares", []), "initial_shares"), dtype=float)
    if payoff_matrix.shape != (len(strategies), len(strategies)):
        raise SolverInputError("evolutionary payoff_matrix must be square and match strategy count")
    if not np.isfinite(payoff_matrix).all():
        raise SolverInputError("evolutionary payoff_matrix contains non-finite values")
    if initial_shares.shape[0] != len(strategies):
        raise SolverInputError("initial_shares length must match strategies length")

    steps = min(MAX_EVOLUTIONARY_STEPS, max(1, int(payload.get("steps", 200))))
    dt = float(payload.get("dt", 0.1))
    if dt <= 0 or not math.isfinite(dt):
        raise SolverInputError("dt must be a positive finite number")

    shares = initial_shares.astype(float)
    trajectory: List[Dict[str, Any]] = []
    for step in range(steps + 1):
        fitness = payoff_matrix.dot(shares)
        average_fitness = float(np.dot(shares, fitness))
        trajectory.append(
            {
                "step": step,
                "shares": {strategies[index]: _round(shares[index]) for index in range(len(strategies))},
                "fitness": {strategies[index]: _round(fitness[index]) for index in range(len(strategies))},
                "average_fitness": _round(average_fitness),
            }
        )
        delta = shares * (fitness - average_fitness)
        shares = np.clip(shares + dt * delta, 1e-12, None)
        shares = shares / shares.sum()

    endpoint = trajectory[-1]["shares"]
    dominant_share = max(endpoint.values())
    ess_candidates = [strategy for strategy, share in endpoint.items() if share >= 0.5]

    return {
        "framework": "evolutionary",
        "ok": True,
        "summary": f"Replicator dynamics ran for {steps} steps; dominant endpoint share is {dominant_share:.3f}.",
        "normalized_inputs": {
            "strategies": strategies,
            "initial_shares": {strategies[index]: _round(initial_shares[index]) for index in range(len(strategies))},
            "steps": steps,
            "dt": dt,
        },
        "results": {
            "trajectory": trajectory,
            "endpoint_shares": endpoint,
            "ess_candidates": ess_candidates,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({
                "strategies": strategies,
                "payoff_matrix": payoff_matrix.tolist(),
                "initial_shares": initial_shares.tolist(),
                "steps": steps,
                "dt": dt,
            }),
        },
        "warnings": [],
    }


def _softmax(values: np.ndarray, lam: float) -> np.ndarray:
    centered = values - np.max(values)
    weights = np.exp(lam * centered)
    return weights / weights.sum()


def solve_logit_qre(payload: Dict[str, Any]) -> Dict[str, Any]:
    players, actions_by_player, tensor = _validate_two_player_tensor(
        payload.get("players", []),
        payload.get("actions_by_player", []),
        payload.get("payoff_matrix", []),
    )
    lam = float(payload.get("lambda", 0.2))
    if lam < 0 or not math.isfinite(lam):
        raise SolverInputError("lambda must be a non-negative finite number")

    sigma1 = np.ones(len(actions_by_player[0])) / len(actions_by_player[0])
    sigma2 = np.ones(len(actions_by_player[1])) / len(actions_by_player[1])
    tolerance = 1e-7
    converged = False
    iterations = 0

    for iterations in range(1, 501):
        expected1 = tensor[:, :, 0].dot(sigma2)
        expected2 = tensor[:, :, 1].T.dot(sigma1)
        next_sigma1 = _softmax(expected1, lam)
        next_sigma2 = _softmax(expected2, lam)
        delta = max(np.max(np.abs(next_sigma1 - sigma1)), np.max(np.abs(next_sigma2 - sigma2)))
        sigma1 = 0.5 * sigma1 + 0.5 * next_sigma1
        sigma2 = 0.5 * sigma2 + 0.5 * next_sigma2
        if delta < tolerance:
            converged = True
            break

    profile = {
        players[0]: {actions_by_player[0][index]: _round(sigma1[index]) for index in range(len(actions_by_player[0]))},
        players[1]: {actions_by_player[1][index]: _round(sigma2[index]) for index in range(len(actions_by_player[1]))},
    }

    sensitivity_samples = []
    for candidate_lambda in [max(0.05, lam * 0.5), lam, lam * 2 if lam > 0 else 0.5]:
        expected1 = tensor[:, :, 0].dot(sigma2)
        expected2 = tensor[:, :, 1].T.dot(sigma1)
        sensitivity_samples.append(
            {
                "lambda": _round(candidate_lambda),
                "player_profiles": {
                    players[0]: {actions_by_player[0][index]: _round(_softmax(expected1, candidate_lambda)[index]) for index in range(len(actions_by_player[0]))},
                    players[1]: {actions_by_player[1][index]: _round(_softmax(expected2, candidate_lambda)[index]) for index in range(len(actions_by_player[1]))},
                },
            }
        )

    return {
        "framework": "bounded_rationality",
        "ok": True,
        "summary": f"Computed logit-QRE with lambda={lam:.3f}; {'converged' if converged else 'reached iteration cap'}.",
        "normalized_inputs": {
            "players": players,
            "actions_by_player": actions_by_player,
            "lambda": _round(lam),
        },
        "results": {
            "profile": profile,
            "sensitivity_samples": sensitivity_samples,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({
                "players": players,
                "actions_by_player": actions_by_player,
                "lambda": lam,
                "payoff_matrix": tensor.tolist(),
            }),
            "converged": converged,
            "iterations": iterations,
        },
        "warnings": [] if converged else ["QRE solver reached the iteration cap before the tolerance threshold."],
    }


def solve_ipd_tournament(payload: Dict[str, Any]) -> Dict[str, Any]:
    import axelrod as axl

    raw_strategies = payload.get("strategies", [])
    if not isinstance(raw_strategies, list) or len(raw_strategies) < 2:
        raise SolverInputError("IPD tournament requires at least 2 strategies.")
    if len(raw_strategies) > MAX_IPD_STRATEGIES:
        raise SolverInputError(
            f"IPD tournament supports at most {MAX_IPD_STRATEGIES} strategies; got {len(raw_strategies)}."
        )

    canonical_map = {
        "cooperator": axl.Cooperator,
        "defector": axl.Defector,
        "titfortat": axl.TitForTat,
        "titfortat2": axl.TitFor2Tats,
        "grudger": axl.Grudger,
        "winstayloseshift": axl.WinStayLoseShift,
        "random": axl.Random,
        "alternator": axl.Alternator,
        "anti titfortat": axl.AntiTitForTat,
        "generous titfortat": axl.GenerousTitForTat,
        "suspicious titfortat": axl.SuspiciousTitForTat,
        "contrite": axl.ContriteTitForTat,
        "gradual": axl.Gradual,
        "goneaway": axl.GoByMajority,
        "hunter": axl.CooperatorHunter,
        "calculator": axl.Calculator,
        "mindreader": axl.MindReader,
        "punisher": axl.Punisher,
        "apologizer": axl.Apologizer,
        "oncebitten": axl.OnceBitten,
    }

    players = []
    resolved_names = []
    for raw_name in raw_strategies:
        key = str(raw_name).strip().lower().replace("_", "").replace(" ", "")
        strategy_class = canonical_map.get(key)
        if strategy_class is None:
            raise SolverInputError(
                f"Unknown IPD strategy: {raw_name}. Available: {', '.join(sorted(canonical_map.keys()))}"
            )
        players.append(strategy_class())
        resolved_names.append(strategy_class.__name__)

    turns = min(max(int(payload.get("turns", 200)), 10), MAX_IPD_TURNS)
    repetitions = min(max(int(payload.get("repetitions", 10)), 1), MAX_IPD_REPETITIONS)
    seed = int(payload.get("seed", 42))

    tournament = axl.Tournament(players, turns=turns, repetitions=repetitions, seed=seed)
    results = tournament.play(progress_bar=False)

    ranked_names = results.ranked_names
    payoff_matrix = results.payoff_matrix
    mean_scores = results.mean_scores

    ranked_strategies = []
    for rank_idx, name in enumerate(ranked_names):
        clean_name = name.strip("'")
        player_idx = next((i for i, n in enumerate(resolved_names) if n == clean_name), 0)
        ranked_strategies.append({
            "rank": rank_idx + 1,
            "strategy": clean_name,
            "mean_score": _round(float(mean_scores[player_idx])) if mean_scores else 0.0,
        })

    ecosystem_steps = min(100, MAX_EVOLUTIONARY_STEPS)
    eco = axl.Ecosystem(results)
    eco.reproduce(ecosystem_steps)

    evolutionary_trajectory = []
    population_history = eco.population_sizes
    for step_idx in range(len(population_history)):
        step_data = {
            "step": step_idx,
            "populations": [_round(float(population_history[step_idx][j])) for j in range(len(players))],
        }
        evolutionary_trajectory.append(step_data)

    return {
        "results": {
            "ranked_strategies": ranked_strategies,
            "payoff_matrix": [[_round(float(v)) for v in row] for row in payoff_matrix],
            "strategy_names": resolved_names,
            "tournament_config": {
                "turns": turns,
                "repetitions": repetitions,
                "seed": seed,
                "num_strategies": len(players),
            },
            "evolutionary_trajectory": evolutionary_trajectory,
            "ecosystem_steps": ecosystem_steps,
        },
        "diagnostics": {
            "solver_version": SOLVER_VERSION,
            "input_hash": _hash_payload({
                "strategies": resolved_names,
                "turns": turns,
                "repetitions": repetitions,
                "seed": seed,
            }),
        },
        "warnings": [],
    }


def solve_game_theory_framework(framework: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized_framework = str(framework or "").strip()
    if normalized_framework == "coalitional":
        return solve_coalitional(payload)
    if normalized_framework == "signaling":
        return solve_perfect_bayesian(payload)
    if normalized_framework == "correlated":
        return solve_correlated_equilibrium(payload)
    if normalized_framework == "evolutionary":
        return solve_evolutionary(payload)
    if normalized_framework == "bounded_rationality":
        return solve_logit_qre(payload)
    if normalized_framework == "ipd_tournament":
        return solve_ipd_tournament(payload)
    raise SolverInputError(f"Unsupported game-theory framework: {normalized_framework}")

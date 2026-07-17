# Buyer Discovery Execution Kit - 2026-06-06

## Proof Boundary

Status: `discovery_kit_ready_not_buyer_proof`.

This kit prepares approved discovery calls. It is not buyer feedback, willingness-to-pay proof, LOI evidence, paid-pilot evidence, or procurement proof.

## Success Gate

- Minimum completed calls: 10
- Qualified follow-ups: 3
- Paid pilot or LOI discussions: 1
- Required fields: buyer_role, proof_shown, objection, next_action, willingness_to_pay_signal, baseline_value_or_current_workflow, pilot_outcome_value_or_expected_delta, quality_signal, buyer_decision_event, outcome_evidence_notes

## Selected Call Slate

Selection rule: Cover each validated top-five niche with its first available target, then fill 10 slots by rank from the first 20 source-backed rows.
Validated niche coverage: 5/5. Missing priority niches: none.

| Rank | Account | Niche | Buyer Role | Validation Question | Proof Asset |
|---:|---|---|---|---|---|
| 1 | GAO Center for Strategic Foresight | Enterprise/public-sector strategic decision intelligence | Strategic foresight director or federal program-analysis lead | Would a governed evidence-to-forecast workflow improve federal trend-analysis or audit-planning exercises? | Console to strategist brief to human-review and forecast-draft handoff. |
| 2 | UK Government Office for Science Futures and Foresight | Enterprise/public-sector strategic decision intelligence | Futures, foresight, or horizon-scanning team lead | Could this pilot accelerate a cross-cutting futures workshop without weakening evidence quality? | Actor/countermove brief plus review state and forecast-governance caveats. |
| 3 | OECD Strategic Foresight Unit / Government Foresight Community | Enterprise/public-sector strategic decision intelligence | Strategic foresight unit lead or GFC program contact | Which evidence, capability, and feedback-loop requirements would make this credible for government foresight practitioners? | Public-sector scenario brief with transparent uncertainty and policy trade-off questions. |
| 4 | Policy Horizons Canada | Enterprise/public-sector strategic decision intelligence | Foresight analyst or policy innovation lead | Would the workflow help structure a foresight brief from sources into scoreable assumptions? | Evidence bundle and audience-specific briefing for a policy uncertainty. |
| 5 | Atlantic Council GeoStrategy Initiative | Executive and analyst briefing layer | Foresight, strategy, or program lead | Would the product reduce time from source pack to scenario memo while preserving analyst review? | Analyst briefing layer plus forecast-draft governance for a Global Foresight scenario. |
| 6 | CSIS Futures Lab | Executive and analyst briefing layer | Futures Lab or computational social science lead | Where would the workflow need stronger empirical rigor before it could support policy analysis? | Game-tree or countermove reasoning path with analyst review and forecast handoff. |
| 7 | World Economic Forum Strategic Intelligence | Enterprise/public-sector strategic decision intelligence | Strategic Intelligence partnerships or content lead | Is the governed forecast handoff a complementary layer to strategic-intelligence maps? | Differentiated layer: evidence-to-actor-reasoning-to-forecast draft, not trend-map replacement. |
| 8 | World Economic Forum Global Risks Initiative | Geopolitical risk radar and scenario monitor | Global risks program, community, or report team | What proof would make this useful for risk survey follow-up or scenario workshop prep? | Global-risk issue brief with source provenance, actor map, and forecast-draft scoring plan. |
| 13 | Metaculus FutureEval | Governed forecasting and research workflow | Forecasting evaluation or services lead | What comparable baseline protocol would be acceptable before accuracy claims? | Calibration ledger plus benchmark-comparison artifact, clearly marked sample-only until real data exists. |
| 20 | Michigan Ross Executive Education strategic decision-making program | Negotiation and strategic reasoning training | Executive education program director or corporate learning lead | Would an applied AI decision-workshop module be valuable if claims stay training-focused rather than predictive? | Negotiation Dojo and game-tree module with manager-ready debriefs. |

## Evidence Capture Schema

| Field | Required | Allowed Values / Proof Note |
|---|---|---|
| call_status | yes | not_contacted, contacted, replied, scheduled, completed, rejected |
| buyer_name_or_redacted_id | yes | Use a redacted identifier if the buyer name should not be stored. |
| buyer_role | yes | Decision maker, champion, evaluator, or disqualified. |
| proof_shown | yes | Specific demo, report, screenshot, or artifact shown. |
| objection | yes | Quote or concise paraphrase of the strongest buyer objection. |
| next_action | yes | Concrete next step and date, or no-fit reason. |
| willingness_to_pay_signal | yes | none, curiosity_only, qualified_followup, paid_pilot_discussion, loi_discussion, procurement_path |
| pilot_case_unit | yes | Outcome unit from the pilot outcome measurement kit for this niche. |
| baseline_measure | yes | Baseline metric definition from the pilot outcome measurement kit. |
| baseline_value_or_current_workflow | yes | Observed current workflow value, or a precise current-workflow description if numeric measurement is not possible yet. |
| target_outcome_measure | yes | Target outcome metric definition from the pilot outcome measurement kit. |
| pilot_outcome_value_or_expected_delta | yes | Observed pilot value, buyer-accepted expected delta, or explicit not-run-yet blocker. |
| quality_measure | yes | Quality metric definition from the pilot outcome measurement kit. |
| quality_signal | yes | Buyer review signal, rubric result, or specific quality blocker. |
| buyer_decision_event | yes | No fit, internal follow-up, paid pilot discussion, LOI/procurement path, or explicit blocker. |
| outcome_evidence_notes | yes | What evidence supports the before/after or expected-delta claim; keep this redacted if needed. |
| security_or_procurement_blocker | no | SOC2, RLS, DPA, SSO, procurement, hosted proof, or data-boundary blocker. |
| accuracy_or_benchmark_blocker | no | Resolved outcomes, benchmark protocol, human baseline, or calibration blocker. |
| evidence_quality | yes | low, medium, high, owner_verified, external_share_approved |

## Objection Handling

| Objection | Response Discipline |
|---|---|
| We already use another intelligence or foresight platform. | Position this as a governed handoff layer from evidence and actor reasoning into review and scoreable forecast drafts, not a replacement for their source platform. |
| Is this secure enough for enterprise or public-sector data? | Do not overclaim. Show the RLS draft and state that production security proof requires owner-approved migration, pgTAP, and hosted smoke evidence before sensitive pilots. |
| What proof do you have that predictions are accurate? | State that prediction superiority is not claimed. Show calibration and benchmark mechanics, then ask what resolved-outcome and baseline protocol they would accept. |
| Can procurement approve this? | Ask which documents are mandatory first: security summary, data boundary, pilot SOW, DPA, hosted proof, support model, and price threshold. |
| How fast can this produce value? | Offer one constrained pilot decision workflow with a before/after measure: time from source pack to reviewed decision brief and forecast-draft readiness. |

## Scripts

### 1. GAO Center for Strategic Foresight

**Email subject:** Relevance check: Enterprise/public-sector strategic decision intelligence

```text
Hi - I am validating a narrow guided pilot for Strategic foresight director or federal program-analysis lead.

The pain we are testing: Would a governed evidence-to-forecast workflow improve federal trend-analysis or audit-planning exercises?

The current proof asset is Console to strategist brief to human-review and forecast-draft handoff. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for enterprise/public-sector strategic decision intelligence. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Strategic foresight director or federal program-analysis lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For GAO Center for Strategic Foresight, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds console to strategist brief to human-review and forecast-draft handoff, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 2. UK Government Office for Science Futures and Foresight

**Email subject:** Relevance check: Enterprise/public-sector strategic decision intelligence

```text
Hi - I am validating a narrow guided pilot for Futures, foresight, or horizon-scanning team lead.

The pain we are testing: Could this pilot accelerate a cross-cutting futures workshop without weakening evidence quality?

The current proof asset is Actor/countermove brief plus review state and forecast-governance caveats. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for enterprise/public-sector strategic decision intelligence. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Futures, foresight, or horizon-scanning team lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For UK Government Office for Science Futures and Foresight, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds actor/countermove brief plus review state and forecast-governance caveats, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 3. OECD Strategic Foresight Unit / Government Foresight Community

**Email subject:** Relevance check: Enterprise/public-sector strategic decision intelligence

```text
Hi - I am validating a narrow guided pilot for Strategic foresight unit lead or GFC program contact.

The pain we are testing: Which evidence, capability, and feedback-loop requirements would make this credible for government foresight practitioners?

The current proof asset is Public-sector scenario brief with transparent uncertainty and policy trade-off questions. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for enterprise/public-sector strategic decision intelligence. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Strategic foresight unit lead or GFC program contact. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For OECD Strategic Foresight Unit / Government Foresight Community, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds public-sector scenario brief with transparent uncertainty and policy trade-off questions, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 4. Policy Horizons Canada

**Email subject:** Relevance check: Enterprise/public-sector strategic decision intelligence

```text
Hi - I am validating a narrow guided pilot for Foresight analyst or policy innovation lead.

The pain we are testing: Would the workflow help structure a foresight brief from sources into scoreable assumptions?

The current proof asset is Evidence bundle and audience-specific briefing for a policy uncertainty. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for enterprise/public-sector strategic decision intelligence. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Foresight analyst or policy innovation lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For Policy Horizons Canada, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds evidence bundle and audience-specific briefing for a policy uncertainty, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 5. Atlantic Council GeoStrategy Initiative

**Email subject:** Relevance check: Executive and analyst briefing layer

```text
Hi - I am validating a narrow guided pilot for Foresight, strategy, or program lead.

The pain we are testing: Would the product reduce time from source pack to scenario memo while preserving analyst review?

The current proof asset is Analyst briefing layer plus forecast-draft governance for a Global Foresight scenario. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for executive and analyst briefing layer. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Foresight, strategy, or program lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For Atlantic Council GeoStrategy Initiative, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds analyst briefing layer plus forecast-draft governance for a global foresight scenario, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 6. CSIS Futures Lab

**Email subject:** Relevance check: Executive and analyst briefing layer

```text
Hi - I am validating a narrow guided pilot for Futures Lab or computational social science lead.

The pain we are testing: Where would the workflow need stronger empirical rigor before it could support policy analysis?

The current proof asset is Game-tree or countermove reasoning path with analyst review and forecast handoff. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for executive and analyst briefing layer. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Futures Lab or computational social science lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For CSIS Futures Lab, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds game-tree or countermove reasoning path with analyst review and forecast handoff, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 7. World Economic Forum Strategic Intelligence

**Email subject:** Relevance check: Enterprise/public-sector strategic decision intelligence

```text
Hi - I am validating a narrow guided pilot for Strategic Intelligence partnerships or content lead.

The pain we are testing: Is the governed forecast handoff a complementary layer to strategic-intelligence maps?

The current proof asset is Differentiated layer: evidence-to-actor-reasoning-to-forecast draft, not trend-map replacement. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for enterprise/public-sector strategic decision intelligence. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Strategic Intelligence partnerships or content lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For World Economic Forum Strategic Intelligence, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds differentiated layer: evidence-to-actor-reasoning-to-forecast draft, not trend-map replacement, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 8. World Economic Forum Global Risks Initiative

**Email subject:** Relevance check: Geopolitical risk radar and scenario monitor

```text
Hi - I am validating a narrow guided pilot for Global risks program, community, or report team.

The pain we are testing: What proof would make this useful for risk survey follow-up or scenario workshop prep?

The current proof asset is Global-risk issue brief with source provenance, actor map, and forecast-draft scoring plan. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for geopolitical risk radar and scenario monitor. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Global risks program, community, or report team. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For World Economic Forum Global Risks Initiative, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds global-risk issue brief with source provenance, actor map, and forecast-draft scoring plan, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 13. Metaculus FutureEval

**Email subject:** Relevance check: Governed forecasting and research workflow

```text
Hi - I am validating a narrow guided pilot for Forecasting evaluation or services lead.

The pain we are testing: What comparable baseline protocol would be acceptable before accuracy claims?

The current proof asset is Calibration ledger plus benchmark-comparison artifact, clearly marked sample-only until real data exists. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for governed forecasting and research workflow. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Forecasting evaluation or services lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For Metaculus FutureEval, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds calibration ledger plus benchmark-comparison artifact, clearly marked sample-only until real data exists, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

### 20. Michigan Ross Executive Education strategic decision-making program

**Email subject:** Relevance check: Negotiation and strategic reasoning training

```text
Hi - I am validating a narrow guided pilot for Executive education program director or corporate learning lead.

The pain we are testing: Would an applied AI decision-workshop module be valuable if claims stay training-focused rather than predictive?

The current proof asset is Negotiation Dojo and game-tree module with manager-ready debriefs. It is explicitly pilot-only: no world-class prediction claim, no buyer-proof claim, and accuracy remains gated on resolved outcomes.

Could I get 20 minutes for a relevance check? The only goal is to learn whether this workflow fits a real decision process, what proof is missing, and whether a paid pilot or internal follow-up would ever be credible.

If this is not your area, a pointer to the right foresight, risk, forecasting, or strategy-workflow owner would be useful.
```

**LinkedIn:** I am validating a pilot for negotiation and strategic reasoning training. The workflow turns source evidence into actor reasoning, review state, and forecast-draft governance for Executive education program director or corporate learning lead. Would you be open to a 15-20 minute relevance check? I am looking for objections and proof requirements, not making a production-readiness claim.

**Demo opener:** For Michigan Ross Executive Education strategic decision-making program, I would not position this as a prediction oracle. The workflow starts with one ambiguous decision, builds negotiation dojo and game-tree module with manager-ready debriefs, flags review/uncertainty gates, and ends with what evidence would make the forecast scoreable. The ask for this call is whether that workflow maps to a real job-to-be-done, what would block adoption, and whether the next step is a second review, paid pilot discussion, or no fit.

## Use Rules

- Do not send messages or run discovery calls without owner approval.
- Do not count a target as buyer proof until a real completed interaction records the required fields.
- Keep world-class prediction language prohibited until resolved-outcome calibration and real baseline proof exist.
- Use no-fit and rejection outcomes as evidence; do not discard them.

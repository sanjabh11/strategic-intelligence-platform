# Commercial Loophole Remediation - 2026-06-06

## Decision

Status: `commercial_loophole_remediation_open_pilot_only`.

Launch decision: **pilot-only**.

Commercial/world-class confidence: **53.7%**.

Confidence gap to 95%: **41.3%**.

Pilot claim allowed: **true**.

World-class claim allowed: **false**.

Open loopholes: **8/10**.

P0 open loopholes: **5**.

Owner-gated open loopholes: **8**.

Owner approval status: **owner_approval_register_ready_no_owner_approvals**.

Owner-approved approval rows: **0/14**.

Owner approval ready for downstream evidence: **false**.

## Loophole Register

| ID | Severity | Status | Category | Evidence | Remediation |
|---|---|---|---|---|---|
| owner_approval_register_not_cleared | P0 | open_owner_evidence_required | approval_governance | owner_approval_register_ready_no_owner_approvals; approved=0/14; reviewed=0/14; claim_boundary_acknowledged=0/14; row_errors=0; ready_for_downstream_evidence=false. | Owner reviews every required approval row, acknowledges claim boundaries, approves or rejects downstream evidence execution, and reruns the owner approval register validator before downstream gates. |
| prediction_accuracy_without_resolved_outcomes | P0 | open_owner_evidence_required | prediction_science | forecast_evaluation_execution_ready_for_owner_export_no_real_outcomes; valid_resolved_forecasts=0; valid_baselines=0; scoring_chain_ready=false; leakage_real_rows=false; scoring_sample_only=true. | Run the resolved-forecast export, validate baselines, complete leakage review, compare Brier/log-loss/calibration metrics, and keep claims at mechanics-only until the gate passes. |
| buyer_validation_without_completed_calls | P0 | open_owner_evidence_required | sellability | buyer_validation_execution_ready_no_real_calls; completed_calls=0; qualified_followups=0; paid_loi_procurement=0; execution_ready=true. | Execute the 10-call buyer validation slate across the five niches and rerun buyer evidence/proof gates. |
| competitive_wedge_without_buyer_substitution_proof | P1 | open_owner_evidence_required_protocol_ready | positioning | competitive_positioning_validation_ready_pilot_only_not_buyer_validated; defensible_wedge=true; substitution_protocol_ready=true; substitution_test_rows=30; substitution_evidence_ready=false; real_substitution_interactions=0; buyer_validated=false; substitute_categories=0/0. | Execute the buyer substitution test sheet and record current tool, budget owner, replacement barrier, must-have proof, and paid pilot threshold. |
| hosted_proof_blocked_before_browser_smoke | P0 | open_runtime_access_required | runtime_readiness | hosted_smoke_execution_blocked_project_privileges_owner_unblock_ready; local_route_proof=true; owner_unblock_ready=true; hosted_smoke_ready=false; hosted_proof_complete=false. | Resolve project visibility/management access, Stripe proof values, and deploy binding, then run hosted Browser/Playwright smoke tests. |
| enterprise_trust_pack_not_approved_or_executed | P0 | open_owner_evidence_required | enterprise_trust | enterprise_trust_execution_ready_for_owner_review_no_approved_docs; procurement_docs=0/8; rls_rows=0/54; local_llm_red_team=true; hosted_access=false. | Approve trust documents, run RLS proof cases, finish hosted security proof, and keep high-impact AI actions under human review. |
| llm_governance_local_only | P1 | open_runtime_evidence_gap | ai_governance | claim_consistency_ready=true; enterprise_proof_ready=false; hosted_proof_complete=false; local_llm_red_team=true. | Run hosted LLM security smoke checks and keep refusal, provenance, tool/action, and human-review gates documented. |
| broad_worldwide_sector_claim_too_large | P1 | contained_by_claim_gate | market_scope | top_five_niches_ready=true; launch_decision=pilot-only; confidence=53.7; unsupported_claims=0. | Use the five-niche pilot narrative and prohibit world-class/accurate-prediction copy until evidence gates pass. |
| sample_fixture_score_risk | P1 | open_evaluation_gap | evaluation_integrity | forecast_scoring_evidence_validation_sample_only_not_claim_proof; sample_fixture_only=true; valid_resolved_forecasts=0; valid_baselines=0. | Use sample fixtures only for harness checks; require real resolved events before score claims. |
| claim_consistency_is_clean_but_fragile | P2 | contained_by_claim_gate | claims | claim_consistency_validation_passed_pilot_only_boundaries; scanned_files=153; high_risk_mentions=0; unsupported=0. | Rerun claim consistency after every launch-readiness, pricing, landing, or outreach language change. |

## Remediation Loop

| Rank | Lane | Action | Closes | Proof Bucket |
|---|---|---|---|---|
| 1 | owner_approval_gate | Owner reviews and approves the consolidated approval register before downstream prediction, buyer, enterprise, hosted, payment, AI-action, and claim-language proof runs. | owner_approval_register_not_cleared | owner_input |
| 2 | prediction_accuracy | Collect owner-approved resolved forecasts and baselines, then rerun leakage, scoring, science, confidence, and completion gates. | prediction_accuracy_without_resolved_outcomes; sample_fixture_score_risk | owner_input |
| 3 | buyer_validation | Execute the 10-call buyer validation slate and record willingness-to-pay/substitution evidence. | buyer_validation_without_completed_calls; competitive_wedge_without_buyer_substitution_proof | owner_input |
| 4 | enterprise_trust | Approve procurement documents, run RLS proof, and complete hosted LLM/security evidence. | enterprise_trust_pack_not_approved_or_executed; llm_governance_local_only | owner_input |
| 5 | hosted_browser_runtime | Unblock project privileges and execute hosted Browser/Playwright smoke tests. | hosted_proof_blocked_before_browser_smoke | hosted_live |
| 6 | claim_and_positioning_control | Keep all public copy constrained to pilot-only governed decision support until the completion audit passes. | broad_worldwide_sector_claim_too_large; claim_consistency_is_clean_but_fragile | repo_artifact |

## Current Source Anchors

| ID | Source | URL | Implication |
|---|---|---|---|
| nist_ai_rmf | NIST AI Risk Management Framework | https://www.nist.gov/itl/ai-risk-management-framework | Trustworthy AI posture needs governed risk management, measurement, and claim controls. |
| nist_genai_profile | NIST AI 600-1 Generative AI Profile | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | Generative-AI decision support needs explicit controls for hallucination, misuse, transparency, and security risks. |
| oecd_ai_principles_2024 | OECD AI Principles, updated 2024 | https://www.oecd.org/en/topics/ai-principles.html | AI systems should be robust, secure, safe, accountable, transparent, and human-centered. |
| iarpa_ace | IARPA ACE forecasting program | https://www.iarpa.gov/research-programs/ace | Forecasting accuracy claims need probabilistic judgment, aggregation, and empirical testing against real events. |
| metaculus_track_record | Metaculus track record and calibration evidence | https://www.metaculus.com/questions/track-record/ | Forecast platforms compete on scored resolved questions, calibration curves, and transparent track records. |
| forecastbench_dynamic_benchmark | ForecastBench dynamic forecasting benchmark | https://www.forecastbench.org/about/ | AI forecasting claims need dynamic, continuously updated benchmark comparisons rather than static fixtures alone. |
| metaculus_futureeval | Metaculus FutureEval | https://www.metaculus.com/futureeval/ | AI forecasting agents should be evaluated on real future outcomes and compared against human, community, pro-forecaster, and model baselines. |
| good_judgment_services | Good Judgment professional forecasting services | https://goodjudgment.com/services/ | Buyer-facing forecasting services sell strategic uncertainty reduction, custom forecasts, monitoring, and training. |
| palantir_aip | Palantir AIP | https://www.palantir.com/platforms/aip/ | Enterprise substitutes emphasize operational decision workflows, ontology grounding, automations, and human approval. |
| dataminr_risk_intelligence | Dataminr real-time risk intelligence | https://www.dataminr.com/ | Risk-intelligence buyers expect real-time signal detection, alerting, public-data coverage, and operational response workflows. |
| wef_global_risks_2026 | World Economic Forum Global Risks Report 2026 | https://www.weforum.org/publications/global-risks-report-2026/in-full/ | Geoeconomic confrontation, conflict, polarization, misinformation, and AI risk provide current buyer-pain context. |
| nist_csf_2 | NIST Cybersecurity Framework 2.0 | https://csrc.nist.gov/news/2024/the-nist-csf-20-is-here | Enterprise/public-sector trust claims need current cybersecurity governance, risk, and control evidence. |
| owasp_llm_top_10 | OWASP Top 10 for Large Language Model Applications | https://owasp.org/www-project-top-10-for-large-language-model-applications | LLM apps need prompt-injection, output-handling, data, supply-chain, and agent/tool security proof. |
| cisa_secure_by_design | CISA Secure by Design | https://www.cisa.gov/news-events/news/building-secure-design-ecosystem | Security posture should shift customer risk back to the software maker through secure defaults and evidence. |

## Proof Boundary

This validator consolidates loopholes and fixes. It does not create buyer calls, hosted proof, enterprise approvals, or real prediction outcomes.

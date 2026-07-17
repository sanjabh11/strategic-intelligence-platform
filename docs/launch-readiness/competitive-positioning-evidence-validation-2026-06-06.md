# Competitive Positioning Evidence Validation - 2026-06-06

## Decision

Status: `competitive_positioning_validation_ready_pilot_only_not_buyer_validated`.

Defensible competitive wedge claim allowed: **true**.

Replacement claim allowed: **false**.

Palantir-equivalence claim allowed: **false**.

Forecasting-parity claim allowed: **false**.

World-class prediction claim allowed: **false**.

## Competitor Coverage

| Substitute Category | Present | Evidence Row |
|---|---|---|
| Recorded Future / geopolitical intelligence platforms | yes | Recorded Future / Broad geopolitical and threat intelligence monitoring with alerts, country risk, and analyst support. / More explicit actor/countermove reasoning and forecast handoff in a lightweight workflow. / Far weaker data breadth, analyst bench, hosted proof, and enterprise trust center. / Buyers may already have threat-intel subscriptions. |
| Palantir AIP / operational AI platforms | yes | Palantir AIP/Ontology / Governed operational AI with enterprise data, logic, action, security, and feedback loops. / Much lighter pilot path for strategic briefs and forecasts without enterprise transformation. / Not comparable on integrations, ontology, permissions, deployment rigor, or enterprise scale. / Procurement may prefer established operational AI platforms. |
| Metaculus / Good Judgment / forecasting services | yes | Metaculus / Good Judgment / Forecasting communities, professional forecasts, custom forecasting, and training. / Connects forecasts to source-backed strategic reasoning and human review inside one app. / No real community, no pro forecaster network, no proven Brier track record. / Forecasting buyers will demand comparable accuracy evidence. |
| Control Risks / Eurasia / EIU advisory substitutes | yes | Control Risks / Eurasia Group / EIU / Expert advisory, country risk, executive briefings, and geopolitical foresight. / Faster self-serve draft workflow and repeatable evidence-to-forecast artifact generation. / Lower trust, no senior analyst access, no established advisory brand. / Buyers may see this as a tool, not a replacement. |
| FiscalNote / policy intelligence platforms | yes | FiscalNote / policy intelligence platforms / Policy/regulatory intelligence and emerging political prediction market layers. / More generalized actor-reasoning plus forecast governance for strategic questions. / Less policy data coverage, fewer integrations, no policy customer proof. / Need avoid competing head-on as policy data platform. |
| Internal analyst spreadsheets and memos | yes | Internal analyst spreadsheets and memos / Low-cost, trusted, tailored manual workflow. / Better repeatability, provenance, review states, forecast conversion, and calibration path. / Adoption requires workflow change and trust in AI-assisted output. / Teams may stay manual until a pilot proves time saved. |
| Generic LLM copilots | yes | Generic LLM copilots / Cheap broad answer generation. / Evidence-gated, domain-shaped, reviewable, and forecast-aware workflow. / Generic copilots are already embedded in buyer stacks. / Must prove differentiated workflow value, not just better prompts. |

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
| market_differentiation_artifact_present | passed | repo_artifact | docs/launch-readiness/market-differentiation-validation-2026-06-06.md length=12838. |
| source_backed_market_signals_present | passed | repo_artifact | 7 market-signal rows in Markdown; 14 current competitive-source anchors attached. |
| top_five_niche_revalidation_present | passed | repo_artifact | 5 niche rows loaded from market differentiation artifact. |
| competitor_substitute_matrix_complete | passed | repo_artifact | 7/7 required substitute categories found; 7 competitor rows loaded. |
| loopholes_and_avoid_claims_present | passed | repo_artifact | 6 loophole rows loaded; claims-to-avoid section present=true. |
| ten_call_buyer_plan_present | passed | repo_artifact | 5 buyer-validation plan rows loaded. |
| prohibited_strength_claims_absent | passed | repo_artifact | 0 prohibited equivalence/superiority patterns found in competitor strength cells. |
| pilot_substitution_matrix_consistent | passed | repo_artifact | 5 pilot-offer substitution rows, 5/5 required niches covered, and 8 source-alignment rows loaded. |
| market_niche_gate_buyer_safe | passed | repo_artifact | Market niche validation status=market_niche_evidence_validation_ready_not_buyer_validated; buyer_safe_pilot_claim_allowed=true. |
| local_route_proof_supports_demo_not_live_claim | passed | local | Local route proof status=local_route_proof_ready_not_hosted_proof; rendered_or_expected_auth_gate_count=7; hosted_live_proof=false. |
| buyer_validated_claim_blocked | passed | owner_input | Buyer proof status=buyer_proof_gate_ready_not_buyer_validation; buyer_validation_verified=false. |
| hosted_live_claim_blocked | passed | hosted_live | Hosted proof status=hosted_operational_evidence_validation_ready_no_hosted_runs; ready_for_buyer_safe_hosted_claims=false. |
| enterprise_ready_claim_blocked | passed | owner_input | Enterprise procurement status=enterprise_procurement_gate_ready_not_owner_approved_or_security_proof; enterprise_ready=false. |
| forecasting_parity_claim_blocked | passed | owner_input | Scoring status=forecast_scoring_evidence_validation_sample_only_not_claim_proof; scoring_ready=false; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false. |

## Current Competitive Sources

| Source | URL | Implication |
|---|---|---|
| Recorded Future Geopolitical Intelligence | https://www.recordedfuture.com/products/geopolitical-intelligence | Threat-intelligence incumbents win on monitoring breadth and analyst support; this app should not claim raw coverage superiority. |
| Palantir AIP and Foundry platform overview | https://www.palantir.com/docs/foundry/platform-overview | Operational AI incumbents win on data integration, ontology, security, and deployment depth; this app should sell a narrower strategic workflow pilot. |
| AlphaSense Enterprise Intelligence private-cloud documentation | https://developer.alpha-sense.com/enterprise/ | Enterprise market-intelligence incumbents compete on premium content, proprietary/internal-content search, deployment options, mTLS, certifications, and access controls. |
| Quid AI-powered consumer and market intelligence | https://www.quid.com/ | Market-intelligence incumbents compete on data coverage, proprietary NLP, context customization, and decision-ready workflows; this app should not claim data-breadth superiority. |
| World Economic Forum Strategic Intelligence | https://www.weforum.org/focus/strategic-intelligence/ | Strategic-intelligence incumbents validate the category but raise the bar for curated expert networks, maps, and foresight credibility. |
| Control Risks RiskMap 2026 | https://www.controlrisks.com/riskmap | Consulting and advisory incumbents validate buyer urgency but have trust, analyst, and briefing credibility this app has not proven. |
| Eurasia Group political risk advisory | https://www.eurasiagroup.net/services/political-risk-advisory | Political-risk advisory substitutes reinforce that buyer value is judgment, briefing, and decision context, not only event feeds. |
| Oxford Analytica advisory services | https://www.oxan.com/ | Analyst-led briefing incumbents are a substitute for executive/analyst briefing workflows. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Forecasting parity claims require resolved questions and comparable human/model baselines. |
| Metaculus forecasting platform and aggregation engine | https://www.metaculus.com/about/ | Forecasting-platform substitutes bring resolved-question history, aggregation, tournaments, private spaces, and pro forecasters. |
| ForecastBench | https://forecastingresearch.org/research/forecastbench | World-class forecasting claims need contamination-resistant benchmark discipline. |
| Good Judgment Superforecasting services | https://goodjudgment.com/ | Forecasting services and training are credible substitutes, but this app needs real outcomes before claiming performance parity. |
| FiscalNote political prediction-market expansion | https://fiscalnote.com/newsroom/fiscalnote-announces-major-expansion-into-political-prediction-markets | Policy intelligence and prediction-market expansion validate the governed forecasting wedge while raising proof and regulatory expectations. |
| World Economic Forum Strategic Intelligence | https://www.weforum.org/focus/strategic-intelligence/ | Strategic-intelligence platforms validate complexity mapping and foresight demand, but this app needs workflow proof to avoid being only a map or content layer. |

## Active Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| buyer_competitive_validation_missing | P2 | active | Run the 10-call validation plan with at least three qualified follow-ups and one paid-pilot/LOI/procurement-path signal. |
| hosted_competitive_demo_proof_missing | P2 | active | Attach hosted route/API proof before claiming live competitive demo readiness. |
| forecasting_parity_proof_missing | P1 | active | Owner-approved resolved forecasts, comparable baselines, leakage review, scoring output, and approved claim language. |
| enterprise_substitute_trust_gap_missing | P1 | active | Enterprise procurement/security proof before comparing against established operational AI or advisory substitutes. |
| owner_approved_competitive_claim_language_missing | P2 | active | Owner-approved external-share language for competitive positioning and buyer-facing proof packets. |

## Proof Boundary

This validator converts the competitive/substitute comparison into machine-checkable pilot positioning. It does not prove buyer demand, hosted live readiness, enterprise trust, data breadth superiority, expert-advisory replacement, or forecasting parity.

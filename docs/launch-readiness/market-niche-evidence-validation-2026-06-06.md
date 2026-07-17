# Market Niche Evidence Validation - 2026-06-06

## Decision

Status: `market_niche_evidence_validation_ready_not_buyer_validated`.

Buyer-safe pilot claim allowed: **true**.

Buyer-validated claim allowed: **false**.

Hosted-live claim allowed: **false**.

Enterprise-ready claim allowed: **false**.

World-class prediction claim allowed: **false**.

## Niche Checks

| Niche | Status | Local Route Signal | Readiness Score | Route Signals |
|---|---|---|---:|---|
| Enterprise/public-sector strategic decision intelligence | ready_for_pilot_positioning | yes | 80 | /console: Strategy Console; /insights: Live Geopolitical Intelligence; /labs/negotiation: Negotiation Dojo; /labs/game-tree: Sequential Game Studio |
| Governed forecasting and research workflow | ready_for_pilot_positioning | yes | 35 | /forecasts: Forecast Registry |
| Geopolitical risk radar and scenario monitor | ready_for_pilot_positioning | yes | 75 | /insights: Live Geopolitical Intelligence |
| Executive and analyst briefing layer | ready_for_pilot_positioning | yes | 78 | /war-room: War Room requires sign-in; /war-room: Corporate War Room |
| Negotiation and strategic reasoning training | ready_for_pilot_positioning | yes | 55 | /console: Strategy Console; /labs/negotiation: Negotiation Dojo; /labs/game-tree: Sequential Game Studio |

## Acceptance Gates

| Gate | Status | Proof Bucket | Evidence |
|---|---|---|---|
| five_niche_sequence_present | passed | repo_artifact | 5/5 required niches present; offer sequence length 5. |
| source_alignment_present | passed | repo_artifact | 8 pilot-pack source alignments and 13 current research anchors attached. |
| substitution_matrix_present | passed | repo_artifact | 5 substitute/competitor rows loaded; 5/5 required niches have substitute coverage. |
| niche_proof_assets_and_boundaries_present | passed | repo_artifact | 5/5 niches have buyer job, proof assets, sale boundary, and substitute coverage. |
| buyer_safe_claim_language_preserved | passed | repo_artifact | 0 prohibited claim patterns found in pilot offer name, promise, or allowed claims. |
| local_route_proof_present | passed | local | 5/5 niches have local route signals; local artifact status local_route_proof_ready_not_hosted_proof; hosted_live_proof=false. |
| hosted_live_proof_absent_boundary_preserved | passed | hosted_live | Hosted validation status hosted_operational_evidence_validation_ready_no_hosted_runs; ready_for_buyer_safe_hosted_claims=false. |
| buyer_validation_absent_boundary_preserved | passed | owner_input | Buyer validation verified=false; buyer evidence ready=false; completed calls 0. |
| accuracy_claim_blocked | passed | owner_input | Scoring status forecast_scoring_evidence_validation_sample_only_not_claim_proof; scoring_ready=false; accuracy_claim_allowed=false; world_class_prediction_claim_allowed=false. |
| enterprise_ready_claim_blocked | passed | owner_input | Enterprise procurement status enterprise_procurement_gate_ready_not_owner_approved_or_security_proof; enterprise_ready=false. |

## Current Research Anchors

| Source | URL | Implication |
|---|---|---|
| NIST AI Risk Management Framework plus Generative AI Profile | https://www.nist.gov/itl/ai-risk-management-framework | Best-practice AI claims need risk management, measurement, governance, and claim-specific proof gates before being upgraded. |
| NIST AI RMF Critical Infrastructure Profile concept note | https://www.nist.gov/itl/ai-risk-management-framework | Public-sector and critical-infrastructure positioning needs explicit trustworthy-AI and operational-risk controls, not only useful demos. |
| ISO/IEC 42001:2023 AI management system | https://www.iso.org/standard/42001 | Enterprise AI buyers increasingly expect an AI management-system posture: policies, traceability, transparency, risk treatment, and continuous improvement. |
| OWASP Top 10 for LLM Applications 2025 | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | LLM decision-support systems need prompt-injection, insecure-output, sensitive-disclosure, excessive-agency, and overreliance controls before enterprise trust claims. |
| CISA Secure by Design software manufacturer guidance | https://www.cisa.gov/news-events/news/building-secure-design-ecosystem | Security posture should be framed as secure-by-design process evidence and owner-approved operational proof, not post-hoc assurance copy. |
| ForecastBench | https://forecastingresearch.org/research/forecastbench | Forecasting claims need dynamic, contamination-resistant evaluation rather than sample fixtures. |
| Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | Forecasting accuracy should be compared against human and model baselines on resolved questions. |
| Metaculus forecasting platform and aggregation engine | https://www.metaculus.com/about/ | Forecasting products are judged by resolved-question history, aggregation quality, and organizational use cases; sample fixtures do not prove parity. |
| Good Judgment Superforecasting services | https://goodjudgment.com/ | Human forecasting services validate buyer demand for foresight but set a high bar for outcome track record and expert process credibility. |
| World Economic Forum Strategic Intelligence | https://www.weforum.org/focus/strategic-intelligence/ | Strategic-intelligence demand is real, but differentiation must be workflow/actionability proof rather than another contextual map. |
| Tradeweb ICD Portal Client Survey 2026 | https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/ | Corporate treasury buyers have a current geopolitical-risk pain signal, but this supports discovery focus rather than buyer validation. |
| McKinsey CFO Pulse Survey 2026 | https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/cfos-have-been-concerned-about-geopolitical-impacts-for-months | CFOs are spending attention on geopolitical impact, risk monitoring, and scenario planning; the pilot should sell decision workflow, not raw prediction. |
| Gartner procurement GenAI disillusionment signal | https://www.gartner.com/en/newsroom/press-releases/2025-07-30-gartner-says-generative-ai-for-procurement-has-entered-the-trough-of-disillusionment | AI buyers need process-specific proof, risk controls, and ROI evidence; broad AI-platform copy is a commercial risk. |

## Active Holds

| Hold | Severity | Status | Evidence Needed |
|---|---|---|---|
| buyer_validation_missing | P1 | active | 10 completed buyer discovery calls, three qualified follow-ups, and one paid-pilot/LOI/procurement-path signal. |
| hosted_live_claim_proof_missing | P2 | active | Validated hosted route/API proof with deploy binding, redacted logs/screenshots, and core coverage. |
| prediction_accuracy_claim_proof_missing | P1 | active | Owner-approved resolved forecasts, real comparable baselines, leakage review, scoring output, and approved claim language. |
| enterprise_security_procurement_proof_missing | P1 | active | Owner-approved privacy/support/incident evidence, RLS proof, hosted AI security proof, and external-share approvals. |
| owner_external_claim_language_approval_missing | P2 | active | Owner-approved external-share language for pilot copy, screenshots, and proof packets. |

## Proof Boundary

This validator confirms market-niche coherence, source alignment, local route evidence, and claim boundaries. It is not buyer validation, hosted proof, enterprise-security proof, or prediction-accuracy proof.

# Product Backlog

| ID | Actor | User Story | Status | Conditions of Satisfaction (CoS) |
| --- | --- | --- | --- | --- |
| PBI-06 | Analyst | As a user, I want richer visualizations and safe parsing so I can trust and interpret results. | InProgress | UI shows convergence iteration; quantum influence heatmap; API responses validated via Zod; no UI crashes on bad data. |
| PBI-01 | Platform | As a platform owner, I need a local analysis fallback so the app works in education_quick mode without backend. | InProgress | Local engine generates AnalysisResult compatible with UI and options; toggle via env; errors handled. |
| PBI-02 | Researcher | As a researcher, I want recursive Nash equilibrium computation with belief depth. | InReview | Returns mixed strategies, stability score, method, and convergenceIteration; deterministic seed supported. |
| PBI-03 | Researcher | As a researcher, I want quantum strategy modeling with decoherence and influence matrix. | Proposed | Returns collapsed distribution and influence matrix; probabilities normalized. |
| PBI-04 | Analyst | As an analyst, I want symmetric strategy mining via pgvector. | Proposed | Vector search returns pattern_matches with calibrated scores. |
| PBI-05 | Analyst | As a user, I want evidence retrieval and citations for analyses. | Proposed | retrievals populated; provenance.evidence_backed and retrieval_count accurate. |
| PBI-07 | Operator | As an operator, I need system-status and health observability. | InReview | Endpoint reports DB/edge/worker/external APIs statuses and metrics. |



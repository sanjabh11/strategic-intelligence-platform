# External Source Freshness - 2026-06-06

## Decision Boundary

Status: `external_source_freshness_needs_title_review`.

This report checks whether the current external URLs used by the launch-readiness market, competitive, AI-governance, hosted-proof, enterprise-trust, and forecasting-science artifacts are reachable from the local Codex environment. It does not prove buyer validation, hosted/live behavior, enterprise procurement readiness, or prediction accuracy.

## Summary

| Metric | Value |
|---|---:|
| Source URLs | 57 |
| Reachable | 50 |
| Access-limited/unverified | 7 |
| Timeout/unverified | 0 |
| Fetch-failed/unverified | 0 |
| Server/http unverified | 0 |
| Broken or removed | 0 |
| Suspect response titles | 7 |
| Not-found response titles | 1 |

## Source Counts By Lane

| Lane | Source URLs |
|---|---:|
| commercial_confidence_frameworks | 10 |
| competitive_positioning | 13 |
| enterprise_procurement | 5 |
| enterprise_trust | 6 |
| forecast_protocol | 5 |
| forecast_scoring | 4 |
| hosted_proof | 6 |
| loophole_remediation | 14 |
| market_niche | 12 |
| prediction_science | 5 |
| rls_proof | 5 |

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
| source_inventory_compiled_from_repo_artifacts | passed | 57 unique external URLs compiled from 11 launch-readiness source artifacts. | repo_artifact |
| current_url_reachability_attempted | passed | 57/57 URL checks completed with timeout 12000ms and concurrency 4. | local |
| broken_source_links_absent | passed | 0 URLs returned 404/410; 7 were access-limited; 0 otherwise unverified. | local |
| suspect_response_titles_flagged | needs_review | 7 URL checks returned suspect titles: 1 not-found titles, 1 access-denied titles, and 5 interstitial titles. | local |
| claim_boundary_preserved | passed | The report verifies source freshness only; it does not create buyer validation, hosted proof, enterprise proof, or forecast accuracy proof. | repo_artifact |

## Checked Sources

| Reachability | Source | URL | Lanes | HTTP | Title Warning | Title / Error |
|---|---|---|---|---:|---|---|
| reachable | NIST GenAI evaluation program | https://ai-challenges.nist.gov/genai | prediction_science | 200 | none | GenAI - Evaluating Generative AI |
| reachable | NIST AI RMF Core Measure; NIST AI RMF Measure/Manage | https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ | forecast_protocol, forecast_scoring | 200 | none | AI RMF Core - AIRC |
| reachable | ForecastBench paper | https://arxiv.org/abs/2409.19839 | prediction_science | 200 | none | [2409.19839] ForecastBench: A Dynamic Benchmark of AI Forecasting Capabilities |
| reachable | NIST Cybersecurity Framework 2.0 | https://csrc.nist.gov/news/2024/the-nist-csf-20-is-here | loophole_remediation | 200 | none | The NIST CSF 2.0 is Here! / CSRC |
| reachable | NIST SSDF SP 800-218 | https://csrc.nist.gov/pubs/sp/800/218/final | commercial_confidence_frameworks, enterprise_procurement, enterprise_trust | 200 | none | SP 800-218, Secure Software Development Framework (SSDF) Version 1.1: Recommendations for Mitigating the Risk of Software Vulnerabilities / CSRC |
| reachable | AlphaSense Enterprise Intelligence private-cloud documentation | https://developer.alpha-sense.com/enterprise/ | competitive_positioning | 200 | none | Enterprise Intelligence: Private Cloud / AlphaSense Documentation |
| reachable | Netlify deploy overview | https://docs.netlify.com/deploy/deploy-overview/ | hosted_proof | 200 | none | Deploy overview / Netlify Docs |
| reachable | Netlify Deploy Previews | https://docs.netlify.com/site-deploys/deploy-previews/ | hosted_proof | 200 | none | Deploy Previews / Netlify Docs |
| reachable | EU AI Act risk controls | https://eur-lex.europa.eu/eli/reg/2024/1689/oj | commercial_confidence_frameworks | 200 | none | Regulation - EU - 2024/1689 - EN - EUR-Lex |
| reachable | FiscalNote political prediction-market expansion | https://fiscalnote.com/newsroom/fiscalnote-announces-major-expansion-into-political-prediction-markets | competitive_positioning | 200 | none | FiscalNote Announces Major Expansion Into Political Prediction Markets |
| reachable | ForecastBench | https://forecastingresearch.org/research/forecastbench | competitive_positioning, forecast_scoring, market_niche | 200 | none | ForecastBench &#8211; Forecasting Research Institute |
| reachable | OWASP GenAI/LLM Top 10 2025 | https://genai.owasp.org/llm-top-10/ | commercial_confidence_frameworks | 200 | none | LLMRisks Archive - OWASP Gen AI Security Project |
| reachable | Good Judgment Superforecasting services | https://goodjudgment.com/ | competitive_positioning, market_niche | 200 | none | See the future sooner with Superforecasting / Good Judgment |
| reachable | Good Judgment professional forecasting services | https://goodjudgment.com/services/ | loophole_remediation | 200 | none | Accurate forecasts and training from professional Superforecasters |
| reachable | NIST AI 600-1 Generative AI Profile | https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf | loophole_remediation | 200 | none | OK |
| reachable | OWASP ASVS | https://owasp.org/www-project-application-security-verification-standard/ | rls_proof | 200 | none | OWASP Application Security Verification Standard (ASVS) / OWASP Foundation |
| reachable | OWASP GenAI Security Project / LLM Top 10; OWASP Top 10 for LLM Applications 2025; OWASP Top 10 for Large Language Model Applications | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | enterprise_trust, loophole_remediation, market_niche | 200 | none | OWASP Top 10 for Large Language Model Applications / OWASP Foundation |
| reachable | Playwright configuration | https://playwright.dev/docs/test-use-options | hosted_proof | 200 | none | Configuration (use) / Playwright |
| reachable | Playwright trace viewer | https://playwright.dev/docs/trace-viewer | hosted_proof | 200 | none | Trace viewer / Playwright |
| reachable | Supabase pgTAP docs | https://supabase.com/docs/guides/database/extensions/pgtap | rls_proof | 200 | none | pgTAP: Unit Testing / Supabase Docs |
| reachable | Supabase Row Level Security docs | https://supabase.com/docs/guides/database/postgres/row-level-security | rls_proof | 200 | none | Row Level Security / Supabase Docs |
| reachable | Supabase Edge Functions | https://supabase.com/docs/guides/functions | hosted_proof | 200 | none | Edge Functions / Supabase Docs |
| reachable | Supabase local development and CLI | https://supabase.com/docs/guides/local-development | hosted_proof | 200 | none | Local Development &amp; CLI / Supabase Docs |
| reachable | Supabase Testing overview | https://supabase.com/docs/guides/local-development/testing/overview | rls_proof | 200 | none | Testing Overview / Supabase Docs |
| reachable | CISA Secure by Design; CISA Secure by Design software manufacturer guidance | https://www.cisa.gov/news-events/news/building-secure-design-ecosystem | loophole_remediation, market_niche | 200 | none | Building a Secure by Design Ecosystem / CISA |
| reachable | CISA Secure by Demand Guide; CISA Secure by Design and Secure by Demand | https://www.cisa.gov/resources-tools/resources/secure-demand-guide | commercial_confidence_frameworks, enterprise_procurement | 200 | none | Secure by Demand Guide: How Software Customers Can Drive a Secure Technology Ecosystem / CISA |
| reachable | CISA Secure by Demand Guide | https://www.cisa.gov/sites/default/files/2024-08/SecureByDemandGuide_080624_508c.pdf | enterprise_trust | 200 | none | OK |
| reachable | Control Risks RiskMap 2026 | https://www.controlrisks.com/riskmap | competitive_positioning | 200 | none | RiskMap 2026 / Control Risks |
| reachable | Dataminr real-time risk intelligence | https://www.dataminr.com/ | loophole_remediation | 200 | none | AI-Powered Real-Time Event, Threat &amp; Risk Intelligence - Dataminr |
| reachable | Eurasia Group political risk advisory | https://www.eurasiagroup.net/services/political-risk-advisory | competitive_positioning | 200 | none | Eurasia Group / Political risk advisory |
| reachable | ForecastBench; ForecastBench dynamic forecasting benchmark | https://www.forecastbench.org/about/ | commercial_confidence_frameworks, forecast_protocol, loophole_remediation, prediction_science | 200 | none | About - ForecastBench |
| reachable | ForecastBench docs; ForecastBench documentation | https://www.forecastbench.org/docs/ | forecast_protocol, forecast_scoring | 200 | none | Docs - ForecastBench |
| access_limited_unverified | FTC AI claims substantiation guidance | https://www.ftc.gov/business-guidance/blog/2023/02/keep-your-ai-claims-check | commercial_confidence_frameworks | 403 | title_indicates_not_found | Page not found / Federal Trade Commission |
| access_limited_unverified | Gartner procurement GenAI disillusionment signal | https://www.gartner.com/en/newsroom/press-releases/2025-07-30-gartner-says-generative-ai-for-procurement-has-entered-the-trough-of-disillusionment | market_niche | 403 | title_indicates_interstitial | Just a moment... / Gartner |
| reachable | IARPA ACE forecasting program | https://www.iarpa.gov/research-programs/ace | loophole_remediation | 200 | none | IARPA - ACE |
| reachable | ISO/IEC 42001:2023; ISO/IEC 42001:2023 AI management system | https://www.iso.org/standard/42001 | enterprise_procurement, enterprise_trust, market_niche | 200 | none | ISO/IEC 42001:2023 - AI management systems |
| reachable | ISO/IEC 42001:2023 | https://www.iso.org/standard/81230.html | commercial_confidence_frameworks | 200 | none | ISO/IEC 42001:2023 - AI management systems |
| access_limited_unverified | McKinsey CFO Pulse Survey 2026 | https://www.mckinsey.com/capabilities/strategy-and-corporate-finance/our-insights/cfos-have-been-concerned-about-geopolitical-impacts-for-months | market_niche | 403 | title_indicates_access_denied | Access Denied |
| access_limited_unverified | Metaculus forecasting platform and aggregation engine | https://www.metaculus.com/about/ | competitive_positioning, market_niche | 403 | title_indicates_interstitial | Just a moment... |
| access_limited_unverified | Metaculus FutureEval | https://www.metaculus.com/futureeval/ | loophole_remediation | 403 | title_indicates_interstitial | Just a moment... |
| reachable | Metaculus FutureEval; Metaculus FutureEval methodology | https://www.metaculus.com/futureeval/methodology/ | commercial_confidence_frameworks, competitive_positioning, forecast_protocol, forecast_scoring, market_niche, prediction_science | 200 | none | Methodology / FutureEval / Metaculus |
| reachable | Metaculus scores FAQ | https://www.metaculus.com/help/scores-faq/ | forecast_protocol | 200 | none | Scores FAQ / Metaculus |
| access_limited_unverified | Metaculus track record and calibration evidence | https://www.metaculus.com/questions/track-record/ | loophole_remediation | 403 | title_indicates_interstitial | Just a moment... |
| reachable | NIST AI RMF; NIST AI RMF Critical Infrastructure Profile concept note; NIST AI Risk Management Framework; NIST AI Risk Management Framework plus Generative AI Profile | https://www.nist.gov/itl/ai-risk-management-framework | commercial_confidence_frameworks, enterprise_procurement, enterprise_trust, loophole_remediation, market_niche, prediction_science | 200 | none | AI Risk Management Framework / NIST |
| reachable | NIST Privacy Framework | https://www.nist.gov/privacy-framework/privacy-framework | enterprise_procurement | 200 | none | Privacy Framework / NIST |
| reachable | NIST AI RMF Trustworthy AI in Critical Infrastructure Profile concept note | https://www.nist.gov/system/files/documents/2026/04/08/Concept%20Note_%20Development%20of%20the%20NIST%20AI%20RMF%20Trustworthy%20Use%20of%20AI%20in%20Critical%20Infrastructure%20Profile.pdf | enterprise_trust | 200 | none | OK |
| access_limited_unverified | OECD AI Principles, updated 2024 | https://www.oecd.org/en/topics/ai-principles.html | loophole_remediation | 403 | title_indicates_interstitial | Just a moment... |
| reachable | Oxford Analytica advisory services | https://www.oxan.com/ | competitive_positioning | 200 | none | The Oxford Analytica Daily Brief |
| reachable | Palantir AIP and Foundry platform overview | https://www.palantir.com/docs/foundry/platform-overview | competitive_positioning | 200 | none | Platform overview • Overview • Palantir |
| reachable | Palantir AIP | https://www.palantir.com/platforms/aip/ | loophole_remediation | 200 | none | Palantir Artificial Intelligence Platform |
| reachable | PostgreSQL Row Security Policies | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | rls_proof | 200 | none | PostgreSQL: Documentation: 18: 5.9. Row Security Policies |
| reachable | Quid AI-powered consumer and market intelligence | https://www.quid.com/ | competitive_positioning | 200 | none | Quid / AI-Powered Consumer &amp; Market Intelligence Platform |
| reachable | Recorded Future Geopolitical Intelligence | https://www.recordedfuture.com/products/geopolitical-intelligence | competitive_positioning | 200 | none | Protect Assets with Geopolitical Intelligence / Recorded Future |
| reachable | Tradeweb ICD Portal Client Survey 2026 | https://www.tradeweb.com/newsroom/media-center/news-releases/geopolitical-risk-concerns-surge-for-corporate-treasurers-according-to-2026-tradeweb-icd-portal-client-survey/ | market_niche | 200 | none | Geopolitical Risk Concerns Surge for Corporate Treasurers, According to 2026 Tradeweb ICD Portal Client Survey |
| reachable | TRIPOD+AI reporting discipline | https://www.tripod-statement.org/ | commercial_confidence_frameworks | 200 | none | Tripod statement |
| reachable | World Economic Forum Strategic Intelligence | https://www.weforum.org/focus/strategic-intelligence/ | competitive_positioning, market_niche | 200 | none | Strategic Intelligence |
| reachable | World Economic Forum Global Risks Report 2026 | https://www.weforum.org/publications/global-risks-report-2026/in-full/ | loophole_remediation | 200 | none | Preface - Global Risks Report 2026 / World Economic Forum |

## Proof Boundary

Fresh external source anchors support desk-research freshness and framework alignment only. They do not prove buyer demand, willingness to pay, hosted runtime health, enterprise procurement readiness, or prediction accuracy.

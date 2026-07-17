# RLS Table Classification Register - 2026-06-06

## Decision

Commercial security status: `classification_required_not_enterprise_ready`.

This is a static owner-approval artifact. It does not inspect hosted Supabase state, apply policy changes, or prove deployed RLS behavior. It converts `docs/launch-readiness/rls-remediation-plan-2026-06-06.json` into the table-by-table classification register needed before safe RLS migrations.

## Summary

| Metric | Count |
|---|---:|
| Tables requiring classification | 70 |
| P1-priority tables | 44 |
| Pending owner classification | 70 |
| First fix batch candidates | 27 |
| Public/anonymous exception reviews | 38 |

## Data Categories

| Data Category | Tables |
|---|---:|
| `advanced_strategy_output_data` | 11 |
| `analysis_execution_and_public_beta_intake` | 7 |
| `authenticated_user_or_review_data` | 5 |
| `campaign_coordination_data` | 1 |
| `campaign_participant_data` | 1 |
| `education_classroom_data` | 5 |
| `evaluation_shadow_and_forecast_data` | 15 |
| `observability_and_operational_logs` | 3 |
| `ontology_and_derived_graph_data` | 4 |
| `public_catalog_candidate` | 5 |
| `retrieval_query_and_source_context` | 6 |
| `team_collaboration_data` | 7 |

## Approval Workflow

1. Assign a business/security owner for every table.
2. Confirm the data category, row owner model, and whether any public/anonymous exception is intentionally required.
3. Reject broad public or anonymous policies for private tables before drafting migrations.
4. Draft one narrow RLS migration per approved domain batch.
5. Run Supabase database tests for anon, unrelated authenticated, owner/member/reviewer, and service-role paths.
6. Attach hosted smoke logs and policy-test output before upgrading from pilot-only.

## Register

| Batch Order | Table | Batch | Priority | Data Category | Recommended Visibility | Public/Anon Exception Default | Approval Status |
|---:|---|---|---|---|---|---|---|
| 1 | `agent_beliefs` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `analysis_trajectories` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `belief_networks` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `collective_insights` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `information_value_analysis` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `insight_reactions` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `quantum_strategic_states` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `scale_invariant_adaptations` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `shared_strategies` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 1 | `strategic_patterns` | `advanced_services` | P1 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 2 | `whitebox_experiment_evaluations` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `whitebox_experiment_state` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `strategy_outcomes` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `cross_domain_transfer_results` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `dynamic_recalibration_results` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `outcome_forecasting_results` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `strategy_success_analysis` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `temporal_optimization_results` | `forecasting_and_ml_evaluation` | P1 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `calibration_models` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `community_metrics` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `drift_signals` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `forecast_scores` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `shadow_model_registry` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `shadow_predictions` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 2 | `temporal_forecasts` | `forecasting_and_ml_evaluation` | P2 | `evaluation_shadow_and_forecast_data` | `owner_reviewer_service_role_only_with_published_summary_exceptions` | only_if_published_summary | pending_owner_classification |
| 3 | `collaborative_messages` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `collaborative_sessions` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `session_participants` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `warroom_assumptions` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `warroom_comments` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `warroom_decision_logs` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 3 | `warroom_scenario_versions` | `collaboration_and_warroom` | P1 | `team_collaboration_data` | `member_creator_reviewer_service_role_only` | no | pending_owner_classification |
| 4 | `retrievals` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 4 | `retrieval_cache` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 4 | `retrieval_entity_links` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 4 | `retrieval_provider_runs` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 4 | `evidence_citations` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 4 | `evidence_sources` | `retrieval_and_evidence` | P1 | `retrieval_query_and_source_context` | `owner_analysis_service_role_only_with_published_citation_exceptions` | only_if_published_citation | pending_owner_classification |
| 5 | `analysis_runs` | `identity_and_review` | P1 | `authenticated_user_or_review_data` | `owner_reviewer_service_role_only` | no | pending_owner_classification |
| 5 | `human_reviews` | `identity_and_review` | P1 | `authenticated_user_or_review_data` | `owner_reviewer_service_role_only` | no | pending_owner_classification |
| 5 | `users` | `identity_and_review` | P1 | `authenticated_user_or_review_data` | `owner_reviewer_service_role_only` | no | pending_owner_classification |
| 5 | `asset_storage` | `identity_and_review` | P1 | `authenticated_user_or_review_data` | `owner_reviewer_service_role_only` | no | pending_owner_classification |
| 5 | `schema_failures` | `identity_and_review` | P1 | `authenticated_user_or_review_data` | `owner_reviewer_service_role_only` | no | pending_owner_classification |
| 6 | `classroom_assignments` | `classroom` | P1 | `education_classroom_data` | `teacher_student_membership_service_role_only` | no | pending_owner_classification |
| 6 | `classroom_activity` | `classroom` | P1 | `education_classroom_data` | `teacher_student_membership_service_role_only` | no | pending_owner_classification |
| 6 | `classrooms` | `classroom` | P1 | `education_classroom_data` | `teacher_student_membership_service_role_only` | no | pending_owner_classification |
| 6 | `classroom_members` | `classroom` | P2 | `education_classroom_data` | `teacher_student_membership_service_role_only` | no | pending_owner_classification |
| 7 | `monitoring_alerts` | `observability` | P1 | `observability_and_operational_logs` | `admin_reviewer_service_role_only` | no | pending_owner_classification |
| 7 | `rpc_errors` | `observability` | P1 | `observability_and_operational_logs` | `admin_reviewer_service_role_only` | no | pending_owner_classification |
| 7 | `third_party_noise` | `observability` | P1 | `observability_and_operational_logs` | `admin_reviewer_service_role_only` | no | pending_owner_classification |
| 8 | `analysis_jobs` | `analysis_execution` | P1 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `analysis_features` | `analysis_execution` | P1 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `multiplayer_participants` | `analysis_execution` | P2 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `multiplayer_sessions` | `analysis_execution` | P2 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `circuit_breaker` | `analysis_execution` | P2 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `rate_limit_tracking` | `analysis_execution` | P2 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 8 | `real_time_events` | `analysis_execution` | P2 | `analysis_execution_and_public_beta_intake` | `owner_service_role_only_with_public_status_exceptions` | only_if_public_intake_or_redacted_status | pending_owner_classification |
| 9 | `assignment_submissions` | `public_catalog_candidates` | P2 | `education_classroom_data` | `teacher_student_membership_service_role_only` | no | pending_owner_classification |
| 9 | `campaign_participants` | `public_catalog_candidates` | P2 | `campaign_participant_data` | `campaign_member_owner_service_role_only` | no | pending_owner_classification |
| 9 | `cooperation_campaigns` | `public_catalog_candidates` | P2 | `campaign_coordination_data` | `campaign_owner_member_service_role_with_published_summary_exception` | only_if_explicitly_published_summary | pending_owner_classification |
| 9 | `domain_specific_patterns` | `public_catalog_candidates` | P3 | `public_catalog_candidate` | `published_public_read_only_or_private_by_default` | only_if_explicitly_published_read_only | pending_owner_classification |
| 9 | `game_definitions` | `public_catalog_candidates` | P2 | `public_catalog_candidate` | `published_public_read_only_or_private_by_default` | only_if_explicitly_published_read_only | pending_owner_classification |
| 9 | `marketplace_scenarios` | `public_catalog_candidates` | P3 | `public_catalog_candidate` | `published_public_read_only_or_private_by_default` | only_if_explicitly_published_read_only | pending_owner_classification |
| 9 | `patterns` | `public_catalog_candidates` | P2 | `public_catalog_candidate` | `published_public_read_only_or_private_by_default` | only_if_explicitly_published_read_only | pending_owner_classification |
| 9 | `signaling_recommendations` | `public_catalog_candidates` | P2 | `advanced_strategy_output_data` | `owner_analysis_service_role_only` | no | pending_owner_classification |
| 9 | `tier_limits` | `public_catalog_candidates` | P3 | `public_catalog_candidate` | `published_public_read_only_or_private_by_default` | only_if_explicitly_published_read_only | pending_owner_classification |
| 10 | `entity_graph_edges` | `ontology_and_graph` | P2 | `ontology_and_derived_graph_data` | `service_role_owner_or_published_reference_only` | only_if_global_reference | pending_owner_classification |
| 10 | `entity_graph_nodes` | `ontology_and_graph` | P2 | `ontology_and_derived_graph_data` | `service_role_owner_or_published_reference_only` | only_if_global_reference | pending_owner_classification |
| 10 | `ontology_aliases` | `ontology_and_graph` | P2 | `ontology_and_derived_graph_data` | `service_role_owner_or_published_reference_only` | only_if_global_reference | pending_owner_classification |
| 10 | `ontology_entities` | `ontology_and_graph` | P2 | `ontology_and_derived_graph_data` | `service_role_owner_or_published_reference_only` | only_if_global_reference | pending_owner_classification |

## Generated Artifacts

- JSON register: `docs/launch-readiness/rls-table-classification-register-2026-06-06.json`
- CSV register: `docs/launch-readiness/rls-table-classification-register-2026-06-06.csv`

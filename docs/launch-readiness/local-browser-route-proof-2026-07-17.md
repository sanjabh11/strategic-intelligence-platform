# Local Browser Route Proof - 2026-07-17

## Decision Boundary

Status: `local_route_proof_ready_not_hosted_proof`.

This is local route-render proof only. The War Room workflow route uses a credential-free local enterprise auth fixture; it does not prove hosted/live behavior, real data freshness, owner-approved authenticated hosted access, buyer validation, or prediction accuracy.

## Route Map

| Niche | Route | Status | Expected Signal | Found | Proof Boundary |
|---|---|---|---|---|---|
| Enterprise/public-sector strategic decision intelligence | /console | rendered | Strategy Console | yes | local route-render proof only |
| Governed forecasting and research workflow | /forecasts | rendered | Forecast Registry | yes | local route-render proof only |
| Geopolitical risk radar/scenario monitor | /insights | rendered | Live Geopolitical Intelligence | yes | local route-render proof only |
| Executive/analyst briefing layer | /war-room | auth_gate_expected | War Room requires sign-in | yes | local route/auth-gate proof only |
| Executive/analyst briefing layer | /war-room | rendered | Corporate War Room | yes | local credential-free enterprise fixture proof only |
| Negotiation and strategic reasoning training | /labs/negotiation | rendered | Negotiation Dojo | yes | local route-render proof only |
| Negotiation and strategic reasoning training | /labs/game-tree | rendered | Sequential Game Studio | yes | local route-render proof only |

## Acceptance Gates

| Gate | Status | Evidence | Proof Bucket |
|---|---|---|---|
| full_beta_placeholder_preview_build | passed | Node 20 Vite build passed before local preview; environment used full-beta and labs bypass with placeholder Supabase values. | local |
| top_five_niche_route_capture | passed | 7 routes captured across 5 niche labels. | local |
| no_failed_or_blank_routes | passed | 0 failed routes and 0 render-problem routes. | local |
| no_unclassified_runtime_console_errors | passed | 0 runtime console/page errors after mocked placeholder Supabase boundaries. | local |
| auth_gates_are_not_false_failures | passed | Auth-gated routes observed: /war-room. | local |
| credential_free_enterprise_war_room_workflow_capture | passed | The /war-room route rendered Corporate War Room through a local enterprise auth fixture without using real credentials. | local |
| hosted_proof_boundary_preserved | passed | hosted_live_proof=false. | local |

## Loopholes

| Severity | Loophole | Status | Evidence | Fix |
|---|---|---|---|---|
| P2 | war_room_auth_gate_not_workflow_proof | mitigated_local_only | /war-room now has local credential-free enterprise fixture proof for the Corporate War Room lobby, while the anonymous auth gate remains separately captured. | Promote this to owner-approved hosted authenticated workflow smoke with screenshots and redacted logs. |
| P2 | local_null_supabase_mode_crash | mitigated_local_only | StrategyConsole, PersonalLifeCoach, and getUserAuthHeaders guard null Supabase clients; VITE_LOCAL_ANALYZE=true /console smoke rendered without auth-null errors. | Keep the local-mode guard covered by focused smoke before using VITE_LOCAL_ANALYZE=true as proof infrastructure. |
| P2 | mocked_supabase_not_live_data_proof | open | The local route smoke mocks placeholder Supabase and GDELT responses to avoid secrets and external account dependency. | Run the hosted operational proof kit against owner-approved hosted URL, smoke account, and redacted logs before live data or hosted claims. |
| P3 | browser_plugin_multi_route_timeout | open | In-app Browser connected and loaded /console, then multi-route capture timed out on browser-use page attach. | Keep Browser as a visual/manual cross-check, but use repo-native Playwright for repeatable route proof until Browser attach stabilizes. |

## Next Fixes

1. Add or approve a credential-safe test-session path for War Room and enterprise briefing workflow smoke.
2. Convert the hosted operational proof kit into an owner-approved hosted smoke run with screenshots and redacted logs.
3. Keep top-five niche route proof local-only until hosted proof and buyer validation clear.

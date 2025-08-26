# PBI-07: System Status and Health Observability

## Overview
Expose operational health endpoints consumed by the frontend to display overall system status.

## Problem Statement
Operators need visibility into runtime health without inspecting logs.

## User Stories
- As an operator, I need system-status and health observability so I can monitor the platform.

## Technical Approach
- Edge functions `system-status` and `health`.
- `system-status` returns overall status, component statuses, metrics, version.
- `health` returns schema checks (read-only).

## UX/UI Considerations
- UI must remain resilient to missing fields; periodic refresh every 30s.

## Acceptance Criteria
- `system-status` returns `overall_status`, `components.*.status`, `metrics` fields consumed by `useSystemStatus`.
- `health` returns `schema_ok`, `checks[]`, `version`.

## Dependencies
- None beyond Supabase Edge Functions.

## Open Questions
- DB live checks and RLS verification can be added later.

## Related Tasks
- See tasks index: [Tasks for PBI PBI-07](./tasks.md)

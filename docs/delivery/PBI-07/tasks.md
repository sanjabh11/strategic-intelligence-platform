# Tasks for PBI PBI-07: System Status and Health Observability

This document lists all tasks associated with PBI PBI-07.

**Parent PBI**: [PBI PBI-07: System Status and Health Observability](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| --- | --- | --- | --- |
| PBI-07-01 | [Implement system-status and health edge functions](./PBI-07-01.md) | Review | Provide endpoints returning status/health in shapes expected by `useSystemStatus`. |
| PBI-07-02 | Remove mock system status from frontend | InProgress | Replace mock data in `src/hooks/useSystemStatus.ts` with real calls to `system-status` and `health` edge functions, with local-mode safeguards. |

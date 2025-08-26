# Tasks for PBI PBI-01: Local Analysis Fallback

This document lists all tasks associated with PBI PBI-01.

**Parent PBI**: [PBI PBI-01: Local Analysis Fallback](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| --- | --- | --- | --- |
| PBI-01-1 | [Implement local analysis engine module](./PBI-01-1.md) | Review | Create deterministic local engine that returns `AnalysisResult`. |
| PBI-01-2 | [Integrate local engine into useStrategyAnalysis](./PBI-01-2.md) | Review | Short-circuit network when `mode === 'education_quick'` or `VITE_LOCAL_ANALYZE=true`. |
| PBI-01-3 | [Adjust supabase.ts for local mode](./PBI-01-3.md) | Review | Avoid throwing when local mode is enabled and env vars are missing. |
| PBI-01-4 | [Mock system status in local mode](./PBI-01-4.md) | Review | Return mock system status from `useSystemStatus` when local mode is enabled. |

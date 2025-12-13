-- Add solver integration columns to analysis_runs table
-- Migration: 20250906_0005_add_solver_integration

ALTER TABLE analysis_runs
ADD COLUMN IF NOT EXISTS solver_invocations JSONB,
ADD COLUMN IF NOT EXISTS solver_results JSONB;

-- Add index for solver invocations queries
CREATE INDEX IF NOT EXISTS idx_analysis_runs_solver_invocations
ON analysis_runs USING GIN (solver_invocations)
WHERE solver_invocations IS NOT NULL;

-- Add index for solver results queries
CREATE INDEX IF NOT EXISTS idx_analysis_runs_solver_results
ON analysis_runs USING GIN (solver_results)
WHERE solver_results IS NOT NULL;

-- Add comment
COMMENT ON COLUMN analysis_runs.solver_invocations IS 'Array of solver calls made during analysis with timing and results';
COMMENT ON COLUMN analysis_runs.solver_results IS 'Consolidated results from game theory solvers (Nashpy, Axelrod, etc.)';
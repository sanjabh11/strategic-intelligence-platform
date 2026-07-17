# ML Orchestration Target

## Current State

The May 1, 2026 remediation cutover removes `pg_net` from ML scheduling and keeps `pg_cron` in a reduced role:

- `pg_cron` only enqueues lightweight rows into `public.ml_job_queue`
- a Modal-deployed worker drains bounded queue batches on a schedule and performs heavy ML work
- a Modal ASGI endpoint preserves the existing `ML_SERVICE_URL` contract for ML-backed enrichments
- `calibration_refresh` and `drift_evaluate` are the only scheduled jobs in this stopgap

This is a 30-day rescue pattern intended to stop Postgres from holding outbound HTTP connections while keeping the existing React + Supabase shell operational.

## Why This Is Temporary

The current queue worker is intentionally minimal even after the Modal pivot:

- it has no DAG dependency management
- retries are local and exponential, not policy-driven
- it does not support backfills, partitions, or lineage views
- job fan-out and cross-job coordination are still manual

That is acceptable for the immediate I/O and calibration fixes, but it is not the long-term architecture for the platform’s ML program.

## Target State

The target orchestrator is a stateful workflow engine such as:

- Apache Airflow
- Dagster

The production orchestration target must provide:

- DAG-based dependencies across calibration, retrieval refresh, shadow scoring, and storage offload jobs
- durable retries and dead-letter handling
- backfills for historical forecast recalibration
- explicit promotion flows for shadow-to-visible model transitions
- workload isolation away from the primary Supabase Postgres instance

## Migration Trigger

Move from the queue-worker stopgap to Airflow or Dagster once these conditions are true:

- the object-storage cutover is complete for large analysis and graph artifacts
- shadow model refresh is scheduled again
- more than two recurring ML jobs require dependency ordering
- backfills or replay become operational requirements

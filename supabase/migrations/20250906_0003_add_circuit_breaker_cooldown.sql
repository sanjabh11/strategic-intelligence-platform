-- Migration: Add cooldown_until column to circuit_breaker table for enhanced circuit breaker functionality
-- Implements P3 reliability improvements with 60-second cooldown after 5 failures

ALTER TABLE public.circuit_breaker
ADD COLUMN IF NOT EXISTS cooldown_until timestamptz;
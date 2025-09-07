-- Enhance schema_failures table with debugging fields
-- Migration: 20250906_0002_enhance_schema_failures

-- Add new columns to schema_failures table
ALTER TABLE schema_failures
ADD COLUMN IF NOT EXISTS payload_preview TEXT,
ADD COLUMN IF NOT EXISTS first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored'));

-- Create index for better query performance on first_seen
CREATE INDEX IF NOT EXISTS idx_schema_failures_first_seen ON schema_failures(first_seen);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_schema_failures_status ON schema_failures(status);

-- Update existing records to set first_seen if null
UPDATE schema_failures
SET first_seen = created_at
WHERE first_seen IS NULL;

-- Add a comment to document the table enhancement
COMMENT ON TABLE schema_failures IS 'Stores schema validation failures with enhanced debugging info including payload preview, first seen timestamp, and triage status';
COMMENT ON COLUMN schema_failures.payload_preview IS 'First 2000 characters of the raw payload that caused the schema failure';
COMMENT ON COLUMN schema_failures.first_seen IS 'Timestamp when this type of failure was first encountered';
COMMENT ON COLUMN schema_failures.status IS 'Triage status: active (needs attention), resolved (fixed), ignored (acceptable)';
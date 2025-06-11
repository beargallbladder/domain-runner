-- MINIMAL JOLT METADATA EXTENSION
-- Only adds optional columns for JOLT domains - existing data unchanged
-- Run once: curl -X POST https://raw-capture-runner.onrender.com/migrate-jolt

BEGIN;

-- Add JOLT metadata to domains table (all optional, defaults safe)
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT FALSE;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_type TEXT;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_severity TEXT 
CHECK (jolt_severity IS NULL OR jolt_severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;

-- Add cost tracking to responses table (optional)
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6);

-- Create index for JOLT queries (only affects JOLT domains)
CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = TRUE;

COMMIT; 
-- Migration: Update domains table to match production schema
-- Date: 2025-07-20
-- Issue: domains table in schema files is missing many columns that exist in production

-- Add missing columns to domains table
ALTER TABLE domains ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS last_processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS process_count INTEGER DEFAULT 0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS error_count INTEGER DEFAULT 0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT false;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_type TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_severity TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT 'legacy';
ALTER TABLE domains ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS discovery_source TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS source_domain TEXT;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_activated_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE domains ADD COLUMN IF NOT EXISTS jolt_deactivated_at TIMESTAMP WITHOUT TIME ZONE;

-- Rename added_at to created_at for consistency
ALTER TABLE domains RENAME COLUMN added_at TO created_at;

-- Add unique constraint on domain
ALTER TABLE domains ADD CONSTRAINT domains_domain_key UNIQUE (domain);

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_domains_priority_status 
    ON domains(priority DESC, status, created_at);

CREATE INDEX IF NOT EXISTS idx_domains_jolt 
    ON domains(is_jolt) 
    WHERE is_jolt = true;

CREATE INDEX IF NOT EXISTS idx_domains_cohort_status 
    ON domains(cohort, status);

CREATE INDEX IF NOT EXISTS idx_domains_discovery 
    ON domains(discovery_source);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_domains_updated_at ON domains;
CREATE TRIGGER update_domains_updated_at 
    BEFORE UPDATE ON domains 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add check constraints
ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_status_valid;
ALTER TABLE domains ADD CONSTRAINT chk_status_valid 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error'));

ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_priority_valid;
ALTER TABLE domains ADD CONSTRAINT chk_priority_valid 
    CHECK (priority >= 0 AND priority <= 10);

ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_process_count_valid;
ALTER TABLE domains ADD CONSTRAINT chk_process_count_valid 
    CHECK (process_count >= 0);

ALTER TABLE domains DROP CONSTRAINT IF EXISTS chk_error_count_valid;
ALTER TABLE domains ADD CONSTRAINT chk_error_count_valid 
    CHECK (error_count >= 0);

-- Add comments for documentation
COMMENT ON TABLE domains IS 'Master table of domains to be processed by LLM APIs';
COMMENT ON COLUMN domains.id IS 'Unique identifier (UUID)';
COMMENT ON COLUMN domains.domain IS 'The domain name to analyze';
COMMENT ON COLUMN domains.status IS 'Processing status: pending, processing, completed, failed, error';
COMMENT ON COLUMN domains.created_at IS 'When the domain was added to the system';
COMMENT ON COLUMN domains.updated_at IS 'Last time any field was updated';
COMMENT ON COLUMN domains.last_processed_at IS 'Last time domain was processed by LLMs';
COMMENT ON COLUMN domains.process_count IS 'Number of times this domain has been processed';
COMMENT ON COLUMN domains.error_count IS 'Number of processing errors encountered';
COMMENT ON COLUMN domains.source IS 'Where this domain was discovered';
COMMENT ON COLUMN domains.is_jolt IS 'Whether this is a jolt event domain';
COMMENT ON COLUMN domains.jolt_type IS 'Type of jolt event if applicable';
COMMENT ON COLUMN domains.jolt_severity IS 'Severity of jolt event';
COMMENT ON COLUMN domains.cohort IS 'Domain cohort for batch processing';
COMMENT ON COLUMN domains.priority IS 'Processing priority (0-10, higher = more urgent)';
COMMENT ON COLUMN domains.discovery_source IS 'Specific source of domain discovery';
COMMENT ON COLUMN domains.source_domain IS 'Parent domain if discovered through crawling';

-- Create monitoring view
CREATE OR REPLACE VIEW domain_processing_summary AS
SELECT 
    status,
    cohort,
    COUNT(*) as count,
    AVG(process_count) as avg_process_count,
    SUM(error_count) as total_errors,
    MAX(last_processed_at) as latest_processed,
    MIN(created_at) as oldest_domain
FROM domains
GROUP BY status, cohort
ORDER BY status, cohort;

-- Verify the migration
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    -- Count columns in domains table
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'domains';
    
    IF col_count >= 18 THEN
        RAISE NOTICE '✅ domains table has all expected columns (% total)', col_count;
    ELSE
        RAISE WARNING '⚠️  domains table may be missing columns (% found)', col_count;
    END IF;
    
    -- Check for important indexes
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domains_priority_status') THEN
        RAISE NOTICE '✅ Priority status index exists';
    ELSE
        RAISE WARNING '⚠️  Priority status index missing';
    END IF;
    
    RAISE NOTICE '📊 Migration complete. Run SELECT * FROM domain_processing_summary; to verify.';
END $$;
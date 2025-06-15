-- MIGRATION: Add Domain Cohorts & Priority Support
-- 
-- Purpose: Extend existing domains table to support dynamic cohort management
-- Architecture: Preserves existing data, adds new columns with safe defaults
-- 
-- IMPORTANT: This migration is BACKWARDS COMPATIBLE
-- Existing domains will have cohort='legacy' and priority=1
-- Existing processNextBatch() will continue working unchanged

BEGIN;

-- Add cohort column for domain grouping
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS cohort TEXT DEFAULT 'legacy';

-- Add priority column for processing order (1=low, 10=high)
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;

-- Create index for efficient cohort filtering
CREATE INDEX IF NOT EXISTS idx_domains_cohort_status 
ON domains(cohort, status);

-- Create index for priority-based processing
CREATE INDEX IF NOT EXISTS idx_domains_priority_status 
ON domains(priority DESC, status, created_at);

-- Update existing domains to have 'legacy' cohort (preserves existing behavior)
UPDATE domains 
SET cohort = 'legacy' 
WHERE cohort IS NULL;

-- Add constraint to ensure priority is within valid range
ALTER TABLE domains 
ADD CONSTRAINT IF NOT EXISTS chk_priority_range 
CHECK (priority >= 1 AND priority <= 10);

-- Add constraint to ensure cohort is not empty
ALTER TABLE domains 
ADD CONSTRAINT IF NOT EXISTS chk_cohort_not_empty 
CHECK (length(trim(cohort)) > 0);

-- Create view for cohort statistics (used by replica reads)
CREATE OR REPLACE VIEW v_cohort_stats AS
SELECT 
  cohort,
  COUNT(*) as domain_count,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'processing') as processing,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'error') as errors,
  AVG(priority) as avg_priority,
  MIN(created_at) as oldest_domain,
  MAX(created_at) as newest_domain
FROM domains
GROUP BY cohort
ORDER BY domain_count DESC;

-- Grant appropriate permissions (adjust as needed for your setup)
-- GRANT SELECT ON v_cohort_stats TO replica_user;

COMMIT;

-- Migration verification queries (run these to verify migration success):
--
-- 1. Check new columns exist:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'domains' AND column_name IN ('cohort', 'priority');
--
-- 2. Check indexes were created:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'domains';
--
-- 3. Check existing data integrity:
-- SELECT cohort, COUNT(*) FROM domains GROUP BY cohort;
--
-- 4. Test cohort view:
-- SELECT * FROM v_cohort_stats;
--
-- 5. Verify constraints:
-- INSERT INTO domains (domain, cohort, priority) VALUES ('test.com', '', 15); -- Should fail 
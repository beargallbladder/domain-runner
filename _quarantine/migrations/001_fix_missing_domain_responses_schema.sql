-- Migration: Fix Missing domain_responses Schema Definition
-- Date: 2025-07-20
-- Issue: domain_responses table exists in production but not in schema files

-- Create domain_responses table if it doesn't exist
CREATE TABLE IF NOT EXISTS domain_responses (
    id SERIAL PRIMARY KEY,
    domain_id UUID NOT NULL,
    model VARCHAR(100) NOT NULL,
    prompt_type VARCHAR(100) NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key to domains table
    CONSTRAINT fk_domain_responses_domain
        FOREIGN KEY (domain_id) 
        REFERENCES domains(id) 
        ON DELETE CASCADE
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_id 
    ON domain_responses(domain_id);

CREATE INDEX IF NOT EXISTS idx_domain_responses_created_at 
    ON domain_responses(created_at);

CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_model 
    ON domain_responses(domain_id, model) 
    INCLUDE (response, created_at);

-- Add constraints for data integrity
ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_model_not_empty;
ALTER TABLE domain_responses ADD CONSTRAINT chk_model_not_empty 
    CHECK (model != '');

ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_prompt_type_not_empty;
ALTER TABLE domain_responses ADD CONSTRAINT chk_prompt_type_not_empty 
    CHECK (prompt_type != '');

ALTER TABLE domain_responses DROP CONSTRAINT IF EXISTS chk_response_not_empty;
ALTER TABLE domain_responses ADD CONSTRAINT chk_response_not_empty 
    CHECK (response != '');

-- Add comments for documentation
COMMENT ON TABLE domain_responses IS 'Stores LLM responses for each domain from various models';
COMMENT ON COLUMN domain_responses.domain_id IS 'Reference to the domain being analyzed';
COMMENT ON COLUMN domain_responses.model IS 'The LLM model used (e.g., gpt-4o-mini, gpt-3.5-turbo)';
COMMENT ON COLUMN domain_responses.prompt_type IS 'Type of analysis (e.g., business_analysis, content_strategy, technical_assessment)';
COMMENT ON COLUMN domain_responses.response IS 'The LLM response content';
COMMENT ON COLUMN domain_responses.created_at IS 'When the response was generated';

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW domain_response_stats AS
SELECT 
    d.domain,
    dr.model,
    dr.prompt_type,
    COUNT(*) as response_count,
    MAX(dr.created_at) as latest_response,
    MIN(dr.created_at) as earliest_response
FROM domain_responses dr
JOIN domains d ON d.id = dr.domain_id
GROUP BY d.domain, dr.model, dr.prompt_type
ORDER BY d.domain, dr.model, dr.prompt_type;

-- Verify the migration
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'domain_responses') THEN
        RAISE NOTICE '✅ domain_responses table exists';
    ELSE
        RAISE EXCEPTION '❌ domain_responses table creation failed';
    END IF;
    
    -- Check indexes
    IF EXISTS (SELECT 1 FROM pg_indexes 
               WHERE tablename = 'domain_responses' 
               AND indexname = 'idx_domain_responses_domain_id') THEN
        RAISE NOTICE '✅ Indexes created successfully';
    ELSE
        RAISE WARNING '⚠️  Some indexes may be missing';
    END IF;
    
    -- Report current state
    RAISE NOTICE '📊 Migration complete. Run SELECT * FROM domain_response_stats LIMIT 10; to verify.';
END $$;
-- Compatibility views to work with existing production tables
-- These are non-destructive and can be safely applied

-- Only create views if the underlying tables exist
-- This allows us to map Rust code to existing table structures

DO $$
BEGIN
    -- Check if domain_responses exists (might be named differently in prod)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'domain_responses') THEN
        -- Table exists, no view needed
        RAISE NOTICE 'domain_responses table exists, no view needed';
    ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'responses') THEN
        -- Create compatibility view
        CREATE OR REPLACE VIEW domain_responses AS
        SELECT
            id,
            domain,
            llm_model,
            llm_response,
            timestamp,
            token_count,
            response_time_ms,
            status,
            prompt_type,
            embedding
        FROM responses;
        RAISE NOTICE 'Created domain_responses view over responses table';
    END IF;

    -- Check for drift_scores table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drift_scores') THEN
        RAISE NOTICE 'drift_scores table exists, no view needed';
    ELSIF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scores') THEN
        -- Create compatibility view
        CREATE OR REPLACE VIEW drift_scores AS
        SELECT
            id AS drift_id,
            domain,
            prompt_id,
            model,
            created_at AS ts_iso,
            similarity AS similarity_prev,
            drift_score,
            status,
            explanation
        FROM scores;
        RAISE NOTICE 'Created drift_scores view over scores table';
    END IF;
END
$$;

-- Add indexes only if they don't exist (non-destructive)
CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_ts
    ON domain_responses(domain, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_drift_scores_domain_ts
    ON drift_scores(domain, ts_iso DESC);

-- Add a tracking table for the Rust service (new, won't affect existing)
CREATE TABLE IF NOT EXISTS rust_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id TEXT,
    old_value JSONB,
    new_value JSONB,
    db_readonly BOOLEAN,
    feature_flags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT DEFAULT current_user
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON rust_audit_log(created_at DESC);
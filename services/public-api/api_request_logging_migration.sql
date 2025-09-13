-- API REQUEST LOGGING SCHEMA
-- Comprehensive audit trail for all API requests

-- ============================================
-- API REQUEST LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request identification
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    api_key_prefix VARCHAR(16), -- Store prefix for deleted keys
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_path VARCHAR(500) NOT NULL,
    query_params JSONB,
    request_headers JSONB,
    request_body_size INTEGER,
    
    -- Client information
    ip_address INET NOT NULL,
    user_agent TEXT,
    referer TEXT,
    
    -- Response details
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    response_size INTEGER,
    error_message TEXT,
    
    -- Rate limiting
    rate_limit_remaining INTEGER,
    rate_limit_reset TIMESTAMP,
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    
    -- Indexing for analytics
    created_date DATE GENERATED ALWAYS AS (DATE(requested_at)) STORED
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_usage_log_api_key ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_user ON api_key_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_endpoint ON api_key_usage_log(endpoint);
CREATE INDEX IF NOT EXISTS idx_usage_log_status ON api_key_usage_log(status_code);
CREATE INDEX IF NOT EXISTS idx_usage_log_created_date ON api_key_usage_log(created_date);
CREATE INDEX IF NOT EXISTS idx_usage_log_requested_at ON api_key_usage_log(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_ip ON api_key_usage_log(ip_address);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_usage_log_key_date ON api_key_usage_log(api_key_id, created_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_user_date ON api_key_usage_log(user_id, created_date DESC);

-- ============================================
-- API USAGE SUMMARY TABLE (for fast analytics)
-- ============================================
CREATE TABLE IF NOT EXISTS api_usage_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Aggregated data
    summary_date DATE NOT NULL,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms INTEGER,
    p95_response_time_ms INTEGER,
    p99_response_time_ms INTEGER,
    
    -- Usage by endpoint
    endpoint_usage JSONB DEFAULT '{}',
    
    -- Error tracking
    error_count INTEGER DEFAULT 0,
    error_types JSONB DEFAULT '{}',
    
    -- Bandwidth
    total_request_bytes BIGINT DEFAULT 0,
    total_response_bytes BIGINT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(api_key_id, summary_date)
);

-- Indexes for summary table
CREATE INDEX IF NOT EXISTS idx_usage_summary_user_date ON api_usage_summary(user_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_summary_key_date ON api_usage_summary(api_key_id, summary_date DESC);

-- ============================================
-- LOG ROTATION/ARCHIVAL FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION archive_old_logs() RETURNS void AS $$
BEGIN
    -- Move logs older than 90 days to archive table
    INSERT INTO api_key_usage_log_archive 
    SELECT * FROM api_key_usage_log 
    WHERE created_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Delete archived logs from main table
    DELETE FROM api_key_usage_log 
    WHERE created_date < CURRENT_DATE - INTERVAL '90 days';
    
    -- Vacuum to reclaim space
    VACUUM ANALYZE api_key_usage_log;
END;
$$ LANGUAGE plpgsql;

-- Archive table (same structure as main log table)
CREATE TABLE IF NOT EXISTS api_key_usage_log_archive (
    LIKE api_key_usage_log INCLUDING ALL
);

-- ============================================
-- USAGE ANALYTICS VIEWS
-- ============================================

-- Daily usage by API key
CREATE OR REPLACE VIEW v_daily_api_usage AS
SELECT 
    l.api_key_id,
    l.user_id,
    DATE(l.requested_at) as usage_date,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE l.status_code < 400) as successful_requests,
    COUNT(*) FILTER (WHERE l.status_code >= 400) as failed_requests,
    AVG(l.response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY l.response_time_ms) as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY l.response_time_ms) as p99_response_time
FROM api_key_usage_log l
GROUP BY l.api_key_id, l.user_id, DATE(l.requested_at);

-- Endpoint usage statistics
CREATE OR REPLACE VIEW v_endpoint_usage AS
SELECT 
    l.endpoint,
    COUNT(*) as total_requests,
    AVG(l.response_time_ms) as avg_response_time,
    COUNT(DISTINCT l.api_key_id) as unique_api_keys,
    COUNT(DISTINCT l.ip_address) as unique_ips
FROM api_key_usage_log l
WHERE l.requested_at > NOW() - INTERVAL '7 days'
GROUP BY l.endpoint
ORDER BY total_requests DESC;

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update api_keys usage counters
CREATE OR REPLACE FUNCTION update_api_key_usage() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status_code < 400 THEN
        UPDATE api_keys 
        SET 
            calls_made_today = calls_made_today + 1,
            calls_made_total = calls_made_total + 1,
            last_used = NEW.requested_at
        WHERE id = NEW.api_key_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_api_key_usage
AFTER INSERT ON api_key_usage_log
FOR EACH ROW
EXECUTE FUNCTION update_api_key_usage();

-- Reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_api_counters() RETURNS void AS $$
BEGIN
    UPDATE api_keys SET calls_made_today = 0;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for daily reset (requires pg_cron extension)
-- SELECT cron.schedule('reset-api-counters', '0 0 * * *', 'SELECT reset_daily_api_counters();');

COMMENT ON TABLE api_key_usage_log IS 'Comprehensive audit trail for all API requests';
COMMENT ON TABLE api_usage_summary IS 'Pre-aggregated usage statistics for fast analytics';
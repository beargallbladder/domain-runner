-- LLM Synchronization Failsafe Database Schema
-- Tables for tracking quality, synchronization, and health metrics

-- Domain processing quality tracking
CREATE TABLE IF NOT EXISTS domain_processing_quality (
    id SERIAL PRIMARY KEY,
    domain_id UUID NOT NULL,
    batch_id VARCHAR(255) NOT NULL,
    success_rate DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
    temporal_variance_ms BIGINT NOT NULL, -- milliseconds between first and last response
    avg_response_time_ms INTEGER NOT NULL,
    synchronization_status VARCHAR(20) NOT NULL CHECK (synchronization_status IN ('synchronized', 'partial', 'failed')),
    processing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_llms_expected INTEGER NOT NULL,
    total_llms_successful INTEGER NOT NULL,
    total_llms_failed INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LLM provider health tracking
CREATE TABLE IF NOT EXISTS llm_provider_health (
    id SERIAL PRIMARY KEY,
    provider_name VARCHAR(100) NOT NULL,
    model_name VARCHAR(200) NOT NULL,
    is_healthy BOOLEAN NOT NULL DEFAULT true,
    last_successful_call TIMESTAMP WITH TIME ZONE,
    consecutive_failures INTEGER DEFAULT 0,
    circuit_breaker_open BOOLEAN DEFAULT false,
    circuit_breaker_opened_at TIMESTAMP WITH TIME ZONE,
    avg_response_time_ms INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    last_health_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint on provider/model combination
    UNIQUE(provider_name, model_name)
);

-- Batch coordination tracking
CREATE TABLE IF NOT EXISTS batch_coordination_log (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(255) NOT NULL UNIQUE,
    domain_id UUID NOT NULL,
    domain VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    expected_llms TEXT[] NOT NULL, -- Array of expected LLM provider/model combinations
    completed_llms TEXT[], -- Array of successfully completed LLMs
    failed_llms TEXT[], -- Array of failed LLMs
    batch_result VARCHAR(20) CHECK (batch_result IN ('success', 'partial', 'failed')),
    coordination_complete BOOLEAN DEFAULT false,
    processing_duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert and incident tracking
CREATE TABLE IF NOT EXISTS synchronization_alerts (
    id SERIAL PRIMARY KEY,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('info', 'warning', 'critical', 'emergency')),
    message TEXT NOT NULL,
    alert_data JSONB, -- Store additional alert metadata
    batch_id VARCHAR(255), -- Optional reference to batch
    provider_name VARCHAR(100), -- Optional reference to provider
    domain_id UUID, -- Optional reference to domain
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced domain_responses table with quality flags
-- (Assuming the table exists, we'll add columns if they don't exist)
DO $$ 
BEGIN
    -- Add quality tracking columns to existing domain_responses table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name = 'response_time_ms') THEN
        ALTER TABLE domain_responses ADD COLUMN response_time_ms INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name = 'retry_count') THEN
        ALTER TABLE domain_responses ADD COLUMN retry_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name = 'quality_flag') THEN
        ALTER TABLE domain_responses ADD COLUMN quality_flag VARCHAR(100) DEFAULT 'high_quality';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name = 'processing_timestamp') THEN
        ALTER TABLE domain_responses ADD COLUMN processing_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'domain_responses' AND column_name = 'batch_id') THEN
        ALTER TABLE domain_responses ADD COLUMN batch_id VARCHAR(255);
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_processing_quality_domain_id ON domain_processing_quality(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_processing_quality_batch_id ON domain_processing_quality(batch_id);
CREATE INDEX IF NOT EXISTS idx_domain_processing_quality_sync_status ON domain_processing_quality(synchronization_status);
CREATE INDEX IF NOT EXISTS idx_domain_processing_quality_timestamp ON domain_processing_quality(processing_timestamp);

CREATE INDEX IF NOT EXISTS idx_llm_provider_health_provider ON llm_provider_health(provider_name);
CREATE INDEX IF NOT EXISTS idx_llm_provider_health_healthy ON llm_provider_health(is_healthy);
CREATE INDEX IF NOT EXISTS idx_llm_provider_health_circuit_breaker ON llm_provider_health(circuit_breaker_open);
CREATE INDEX IF NOT EXISTS idx_llm_provider_health_last_check ON llm_provider_health(last_health_check);

CREATE INDEX IF NOT EXISTS idx_batch_coordination_batch_id ON batch_coordination_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_coordination_domain_id ON batch_coordination_log(domain_id);
CREATE INDEX IF NOT EXISTS idx_batch_coordination_result ON batch_coordination_log(batch_result);
CREATE INDEX IF NOT EXISTS idx_batch_coordination_start_time ON batch_coordination_log(start_time);

CREATE INDEX IF NOT EXISTS idx_synchronization_alerts_level ON synchronization_alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_synchronization_alerts_resolved ON synchronization_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_synchronization_alerts_created ON synchronization_alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_synchronization_alerts_batch_id ON synchronization_alerts(batch_id);
CREATE INDEX IF NOT EXISTS idx_synchronization_alerts_provider ON synchronization_alerts(provider_name);

-- Add indexes to enhanced domain_responses table
CREATE INDEX IF NOT EXISTS idx_domain_responses_quality_flag ON domain_responses(quality_flag);
CREATE INDEX IF NOT EXISTS idx_domain_responses_batch_id ON domain_responses(batch_id);
CREATE INDEX IF NOT EXISTS idx_domain_responses_processing_timestamp ON domain_responses(processing_timestamp);

-- Create a view for synchronization dashboard
CREATE OR REPLACE VIEW synchronization_dashboard AS
SELECT 
    dpq.domain_id,
    d.domain,
    dpq.batch_id,
    dpq.synchronization_status,
    dpq.success_rate,
    dpq.temporal_variance_ms,
    dpq.avg_response_time_ms,
    dpq.total_llms_expected,
    dpq.total_llms_successful,
    dpq.total_llms_failed,
    dpq.processing_timestamp,
    -- Count of quality issues
    (SELECT COUNT(*) FROM domain_responses dr 
     WHERE dr.domain_id = dpq.domain_id 
     AND dr.batch_id = dpq.batch_id 
     AND dr.quality_flag != 'high_quality') as quality_issues_count,
    -- Recent alerts for this batch
    (SELECT COUNT(*) FROM synchronization_alerts sa 
     WHERE sa.batch_id = dpq.batch_id 
     AND sa.alert_level IN ('critical', 'emergency')) as critical_alerts_count
FROM domain_processing_quality dpq
LEFT JOIN domains d ON d.id = dpq.domain_id
ORDER BY dpq.processing_timestamp DESC;

-- Create a view for provider health dashboard
CREATE OR REPLACE VIEW provider_health_dashboard AS
SELECT 
    lph.provider_name,
    lph.model_name,
    lph.is_healthy,
    lph.consecutive_failures,
    lph.circuit_breaker_open,
    lph.avg_response_time_ms,
    lph.total_calls,
    lph.total_failures,
    CASE 
        WHEN lph.total_calls > 0 THEN ROUND((lph.total_failures::DECIMAL / lph.total_calls) * 100, 2)
        ELSE 0 
    END as failure_rate_percent,
    lph.last_successful_call,
    lph.last_health_check,
    -- Recent alert count for this provider
    (SELECT COUNT(*) FROM synchronization_alerts sa 
     WHERE sa.provider_name = lph.provider_name 
     AND sa.created_at > NOW() - INTERVAL '1 hour'
     AND sa.resolved = false) as recent_unresolved_alerts
FROM llm_provider_health lph
ORDER BY lph.is_healthy DESC, lph.consecutive_failures DESC;

-- Function to automatically resolve old alerts
CREATE OR REPLACE FUNCTION resolve_old_alerts()
RETURNS void AS $$
BEGIN
    -- Auto-resolve info and warning alerts older than 24 hours
    UPDATE synchronization_alerts 
    SET resolved = true, resolved_at = NOW()
    WHERE resolved = false 
    AND alert_level IN ('info', 'warning')
    AND created_at < NOW() - INTERVAL '24 hours';
    
    -- Auto-resolve critical alerts older than 7 days if no recent similar alerts
    UPDATE synchronization_alerts 
    SET resolved = true, resolved_at = NOW()
    WHERE resolved = false 
    AND alert_level = 'critical'
    AND created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled function call (would need to be called periodically)
-- This is commented out as it requires a job scheduler
-- SELECT cron.schedule('resolve-old-alerts', '0 */6 * * *', 'SELECT resolve_old_alerts();');

-- Grant necessary permissions (adjust user as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
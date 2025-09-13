-- DRIFT MONITORING SCHEMA
-- Creates tables for tracking data quality and drift metrics

-- Drift history table for temporal tracking
CREATE TABLE IF NOT EXISTS drift_history (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    drift_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast temporal queries
CREATE INDEX IF NOT EXISTS idx_drift_history_domain_time ON drift_history(domain, created_at);
CREATE INDEX IF NOT EXISTS idx_drift_history_created_at ON drift_history(created_at);

-- Batch drift reports
CREATE TABLE IF NOT EXISTS drift_reports (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    report_data JSONB NOT NULL,
    quality_gate_passed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for batch lookups
CREATE INDEX IF NOT EXISTS idx_drift_reports_batch_id ON drift_reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_drift_reports_quality_gate ON drift_reports(quality_gate_passed, created_at);

-- Quality alerts for critical issues
CREATE TABLE IF NOT EXISTS quality_alerts (
    id SERIAL PRIMARY KEY,
    batch_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    details JSONB,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Index for alert management
CREATE INDEX IF NOT EXISTS idx_quality_alerts_batch_id ON quality_alerts(batch_id);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_severity ON quality_alerts(severity, created_at);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_unresolved ON quality_alerts(resolved, created_at) WHERE resolved = false;

-- Reference distributions for baseline comparison
CREATE TABLE IF NOT EXISTS reference_distributions (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    distribution_data JSONB NOT NULL,
    sample_count INTEGER NOT NULL DEFAULT 0,
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(domain, metric_type)
);

-- Index for reference lookups
CREATE INDEX IF NOT EXISTS idx_reference_distributions_domain_metric ON reference_distributions(domain, metric_type);
CREATE INDEX IF NOT EXISTS idx_reference_distributions_expires ON reference_distributions(expires_at);

-- Domain quality metrics tracking
CREATE TABLE IF NOT EXISTS domain_quality_metrics (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    metric_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    memory_score FLOAT,
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    drift_score FLOAT DEFAULT 0.0,
    quality_flags TEXT[],
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for time-series analysis
CREATE INDEX IF NOT EXISTS idx_domain_quality_metrics_domain_time ON domain_quality_metrics(domain, metric_timestamp);
CREATE INDEX IF NOT EXISTS idx_domain_quality_metrics_drift_score ON domain_quality_metrics(drift_score DESC);
CREATE INDEX IF NOT EXISTS idx_domain_quality_metrics_timestamp ON domain_quality_metrics(metric_timestamp);

-- Drift detection configuration
CREATE TABLE IF NOT EXISTS drift_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO drift_config (config_key, config_value, description) VALUES 
('thresholds', '{"drift_threshold": 0.1, "batch_alert_threshold": 0.1, "recrawl_threshold": 0.3}', 'Drift detection thresholds'),
('weights', '{"ks_weight": 0.3, "js_weight": 0.3, "cosine_weight": 0.2, "temporal_weight": 0.2}', 'Drift score calculation weights'),
('monitoring', '{"batch_size": 50, "parallel_workers": 4, "check_interval_seconds": 60}', 'Monitoring configuration'),
('quality_gates', '{"min_sample_size": 3, "reference_ttl_hours": 24, "alert_cooldown_minutes": 30}', 'Quality gate parameters')
ON CONFLICT (config_key) DO NOTHING;

-- Performance optimization views
CREATE OR REPLACE VIEW drift_summary_24h AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour_bucket,
    COUNT(*) as batch_count,
    AVG((report_data->>'avg_drift_score')::float) as avg_drift_score,
    AVG((report_data->>'drift_percentage')::float) as avg_drift_percentage,
    SUM(CASE WHEN quality_gate_passed THEN 1 ELSE 0 END) as passed_count,
    SUM(CASE WHEN NOT quality_gate_passed THEN 1 ELSE 0 END) as failed_count
FROM drift_reports 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour_bucket DESC;

-- Top drifting domains view
CREATE OR REPLACE VIEW top_drifting_domains AS
SELECT 
    domain,
    AVG(drift_score) as avg_drift_score,
    MAX(drift_score) as max_drift_score,
    COUNT(*) as measurement_count,
    MAX(metric_timestamp) as last_measured,
    array_agg(DISTINCT unnest(quality_flags)) FILTER (WHERE quality_flags IS NOT NULL) as common_issues
FROM domain_quality_metrics 
WHERE metric_timestamp > NOW() - INTERVAL '24 hours'
GROUP BY domain
HAVING AVG(drift_score) > 0.1
ORDER BY avg_drift_score DESC
LIMIT 100;

-- Quality trend analysis view
CREATE OR REPLACE VIEW quality_trends AS
WITH daily_stats AS (
    SELECT 
        DATE_TRUNC('day', metric_timestamp) as day,
        AVG(drift_score) as avg_drift,
        AVG(memory_score) as avg_memory_score,
        COUNT(*) as measurement_count,
        COUNT(*) FILTER (WHERE error_count > 0) as error_count
    FROM domain_quality_metrics 
    WHERE metric_timestamp > NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', metric_timestamp)
)
SELECT 
    day,
    avg_drift,
    avg_memory_score,
    measurement_count,
    error_count,
    error_count::float / measurement_count as error_rate,
    LAG(avg_drift) OVER (ORDER BY day) as prev_drift,
    avg_drift - LAG(avg_drift) OVER (ORDER BY day) as drift_change
FROM daily_stats
ORDER BY day DESC;

-- Cleanup old data function
CREATE OR REPLACE FUNCTION cleanup_drift_data() RETURNS void AS $$
BEGIN
    -- Remove old drift history (keep 30 days)
    DELETE FROM drift_history WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Remove old quality metrics (keep 90 days)
    DELETE FROM domain_quality_metrics WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Remove resolved alerts older than 7 days
    DELETE FROM quality_alerts 
    WHERE resolved = true AND resolved_at < NOW() - INTERVAL '7 days';
    
    -- Remove expired reference distributions
    DELETE FROM reference_distributions WHERE expires_at < NOW();
    
    -- Update statistics
    ANALYZE drift_history;
    ANALYZE drift_reports;
    ANALYZE quality_alerts;
    ANALYZE domain_quality_metrics;
    ANALYZE reference_distributions;
    
    RAISE NOTICE 'Drift data cleanup completed';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily (if using pg_cron extension)
-- SELECT cron.schedule('drift-cleanup', '0 2 * * *', 'SELECT cleanup_drift_data();');

-- Useful functions for drift analysis
CREATE OR REPLACE FUNCTION get_domain_drift_trend(
    domain_name VARCHAR(255),
    hours_back INTEGER DEFAULT 24
) RETURNS TABLE(
    timestamp TIMESTAMP WITH TIME ZONE,
    drift_score FLOAT,
    memory_score FLOAT,
    error_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dqm.metric_timestamp,
        dqm.drift_score,
        dqm.memory_score,
        dqm.error_count
    FROM domain_quality_metrics dqm
    WHERE dqm.domain = domain_name
    AND dqm.metric_timestamp > NOW() - (hours_back || ' hours')::INTERVAL
    ORDER BY dqm.metric_timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate statistical significance of drift
CREATE OR REPLACE FUNCTION calculate_drift_significance(
    current_scores FLOAT[],
    reference_mean FLOAT,
    reference_std FLOAT
) RETURNS JSONB AS $$
DECLARE
    z_score FLOAT;
    p_value FLOAT;
    is_significant BOOLEAN;
    result JSONB;
BEGIN
    -- Calculate z-score for current sample mean
    z_score := (
        (SELECT AVG(x) FROM unnest(current_scores) AS x) - reference_mean
    ) / (reference_std / sqrt(array_length(current_scores, 1)));
    
    -- Approximate p-value calculation (simplified)
    p_value := 2 * (1 - abs(z_score) / 3.0);  -- Rough approximation
    p_value := GREATEST(0.001, LEAST(1.0, p_value));
    
    -- Determine significance (p < 0.05)
    is_significant := p_value < 0.05;
    
    result := jsonb_build_object(
        'z_score', z_score,
        'p_value', p_value,
        'is_significant', is_significant,
        'sample_size', array_length(current_scores, 1),
        'current_mean', (SELECT AVG(x) FROM unnest(current_scores) AS x),
        'reference_mean', reference_mean,
        'reference_std', reference_std
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drift_history_updated_at
    BEFORE UPDATE ON drift_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_reports_updated_at
    BEFORE UPDATE ON drift_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_config_updated_at
    BEFORE UPDATE ON drift_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_application_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_application_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_application_user;

-- Create comments for documentation
COMMENT ON TABLE drift_history IS 'Stores temporal drift measurements for trend analysis';
COMMENT ON TABLE drift_reports IS 'Batch-level drift analysis reports with quality gates';
COMMENT ON TABLE quality_alerts IS 'Critical quality issues requiring attention';
COMMENT ON TABLE reference_distributions IS 'Baseline statistical distributions for drift detection';
COMMENT ON TABLE domain_quality_metrics IS 'Detailed quality metrics per domain over time';
COMMENT ON TABLE drift_config IS 'Configuration parameters for drift detection';

COMMENT ON VIEW drift_summary_24h IS 'Hourly aggregated drift statistics for the last 24 hours';
COMMENT ON VIEW top_drifting_domains IS 'Domains with highest drift scores in the last 24 hours';
COMMENT ON VIEW quality_trends IS 'Daily quality trends with change indicators';

COMMENT ON FUNCTION cleanup_drift_data() IS 'Removes old drift data and updates table statistics';
COMMENT ON FUNCTION get_domain_drift_trend(VARCHAR, INTEGER) IS 'Returns drift trend for a specific domain';
COMMENT ON FUNCTION calculate_drift_significance(FLOAT[], FLOAT, FLOAT) IS 'Calculates statistical significance of observed drift';
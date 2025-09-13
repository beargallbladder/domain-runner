-- Neural Pattern Detection Schema
-- Creates tables for storing and analyzing competitive intelligence patterns

-- Pattern Detections Table
CREATE TABLE IF NOT EXISTS pattern_detections (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    signals JSONB NOT NULL DEFAULT '{}',
    supporting_evidence JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one pattern per domain-type combination (latest wins)
    UNIQUE(domain, pattern_type)
);

-- Pattern Alerts Table
CREATE TABLE IF NOT EXISTS pattern_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pattern Learning Data Table (for neural learning)
CREATE TABLE IF NOT EXISTS pattern_learning_data (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    signals JSONB NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    accuracy_score DECIMAL(4,3) NULL, -- Set when pattern is validated
    feedback_type VARCHAR(20) NULL CHECK (feedback_type IN ('CORRECT', 'INCORRECT', 'PARTIAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL
);

-- Competitive Intelligence Metrics Table
CREATE TABLE IF NOT EXISTS competitive_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NULL, -- NULL for global metrics
    category VARCHAR(100) NULL,
    metric_value DECIMAL(6,4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for time-series queries
    INDEX idx_competitive_metrics_time (created_at, metric_type)
);

-- Cross-Category Analysis Table
CREATE TABLE IF NOT EXISTS cross_category_analysis (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL,
    analysis_type VARCHAR(50) NOT NULL,
    domain_count INTEGER NOT NULL DEFAULT 0,
    pattern_diversity INTEGER NOT NULL DEFAULT 0,
    avg_confidence DECIMAL(4,3) NOT NULL DEFAULT 0,
    competitive_intensity DECIMAL(4,3) NOT NULL DEFAULT 0,
    growth_signals JSONB DEFAULT '[]',
    analysis_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(category, analysis_type, DATE(created_at))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pattern_detections_domain ON pattern_detections(domain);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_type ON pattern_detections(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_confidence ON pattern_detections(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_created ON pattern_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_type_confidence ON pattern_detections(pattern_type, confidence DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_alerts_type ON pattern_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_priority ON pattern_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_acknowledged ON pattern_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_created ON pattern_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_learning_type ON pattern_learning_data(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_domain ON pattern_learning_data(domain);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_created ON pattern_learning_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cross_category_category ON cross_category_analysis(category);
CREATE INDEX IF NOT EXISTS idx_cross_category_type ON cross_category_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_cross_category_created ON cross_category_analysis(created_at DESC);

-- Views for quick analytics
CREATE OR REPLACE VIEW v_pattern_summary AS
SELECT 
    pattern_type,
    COUNT(*) as total_patterns,
    AVG(confidence) as avg_confidence,
    MAX(confidence) as max_confidence,
    COUNT(DISTINCT domain) as unique_domains,
    MAX(created_at) as latest_detection
FROM pattern_detections
GROUP BY pattern_type;

CREATE OR REPLACE VIEW v_high_confidence_patterns AS
SELECT 
    domain,
    pattern_type,
    confidence,
    supporting_evidence,
    created_at
FROM pattern_detections
WHERE confidence >= 0.8
ORDER BY confidence DESC, created_at DESC;

CREATE OR REPLACE VIEW v_competitive_alerts AS
SELECT 
    domain,
    pattern_type,
    confidence,
    message,
    priority,
    acknowledged,
    created_at
FROM pattern_alerts
WHERE acknowledged = FALSE
ORDER BY 
    CASE priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    created_at DESC;

-- Function to update pattern confidence thresholds based on learning
CREATE OR REPLACE FUNCTION update_pattern_thresholds()
RETURNS TABLE(pattern_type text, old_threshold numeric, new_threshold numeric) AS $$
DECLARE
    pattern_record RECORD;
    new_thresh numeric;
BEGIN
    FOR pattern_record IN 
        SELECT 
            pld.pattern_type,
            AVG(pld.confidence) as avg_confidence,
            COUNT(*) as sample_size
        FROM pattern_learning_data pld
        WHERE pld.feedback_type = 'CORRECT'
        AND pld.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY pld.pattern_type
        HAVING COUNT(*) >= 5
    LOOP
        -- Calculate adaptive threshold
        new_thresh := GREATEST(0.6, LEAST(0.95, pattern_record.avg_confidence - 0.05));
        
        RETURN QUERY SELECT 
            pattern_record.pattern_type::text,
            0.8::numeric as old_threshold, -- Default threshold
            new_thresh;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pattern metadata on insert
CREATE OR REPLACE FUNCTION update_pattern_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Auto-calculate some derived metrics
    IF NEW.signals IS NOT NULL THEN
        -- Extract signal strength metadata
        NEW.signals = NEW.signals || jsonb_build_object(
            'signal_count', jsonb_array_length(jsonb_object_keys(NEW.signals)),
            'signal_strength', (
                SELECT AVG(value::numeric) 
                FROM jsonb_each_text(NEW.signals) 
                WHERE value ~ '^[0-9]*\.?[0-9]+$'
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pattern_metadata
    BEFORE INSERT OR UPDATE ON pattern_detections
    FOR EACH ROW
    EXECUTE FUNCTION update_pattern_metadata();

-- Clean up old pattern data (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_patterns()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pattern_learning_data 
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Keep alerts for longer (180 days)
    DELETE FROM pattern_alerts 
    WHERE created_at < CURRENT_DATE - INTERVAL '180 days'
    AND acknowledged = TRUE;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add pattern_detections to domains table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'domains' AND column_name = 'pattern_flags'
    ) THEN
        ALTER TABLE domains ADD COLUMN pattern_flags JSONB DEFAULT '{}';
        CREATE INDEX IF NOT EXISTS idx_domains_pattern_flags ON domains USING GIN (pattern_flags);
    END IF;
END $$;

-- Initial data seeding
INSERT INTO competitive_metrics (metric_type, metric_value, metadata) VALUES
('global_threat_level', 0.0, '{"description": "Overall competitive threat level"}'),
('market_stability', 0.5, '{"description": "Market stability index"}'),
('innovation_index', 0.3, '{"description": "Innovation activity index"}'),
('competitive_intensity', 0.4, '{"description": "Overall competitive intensity"}')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE pattern_detections IS 'Stores detected competitive intelligence patterns for domains';
COMMENT ON TABLE pattern_alerts IS 'Real-time alerts for high-confidence patterns';
COMMENT ON TABLE pattern_learning_data IS 'Training data for neural pattern learning';
COMMENT ON TABLE competitive_metrics IS 'Time-series competitive intelligence metrics';
COMMENT ON TABLE cross_category_analysis IS 'Cross-category competitive analysis results';
-- Neural Pattern Detection Schema - Simplified Version
-- Creates tables for storing and analyzing competitive intelligence patterns

-- Pattern Detections Table
CREATE TABLE IF NOT EXISTS pattern_detections (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    signals JSONB NOT NULL DEFAULT '{}',
    supporting_evidence JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pattern_detections_confidence_check CHECK (confidence >= 0 AND confidence <= 1),
    CONSTRAINT pattern_detections_unique_domain_type UNIQUE(domain, pattern_type)
);

-- Pattern Alerts Table
CREATE TABLE IF NOT EXISTS pattern_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pattern_alerts_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Pattern Learning Data Table
CREATE TABLE IF NOT EXISTS pattern_learning_data (
    id SERIAL PRIMARY KEY,
    pattern_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    signals JSONB NOT NULL,
    confidence DECIMAL(4,3) NOT NULL,
    accuracy_score DECIMAL(4,3) NULL,
    feedback_type VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL,
    CONSTRAINT pattern_learning_feedback_check CHECK (feedback_type IN ('CORRECT', 'INCORRECT', 'PARTIAL'))
);

-- Competitive Intelligence Metrics Table
CREATE TABLE IF NOT EXISTS competitive_metrics (
    id SERIAL PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255) NULL,
    category VARCHAR(100) NULL,
    metric_value DECIMAL(6,4) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pattern_detections_domain ON pattern_detections(domain);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_type ON pattern_detections(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_confidence ON pattern_detections(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_created ON pattern_detections(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_alerts_type ON pattern_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_priority ON pattern_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_acknowledged ON pattern_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_created ON pattern_alerts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pattern_learning_type ON pattern_learning_data(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_domain ON pattern_learning_data(domain);
CREATE INDEX IF NOT EXISTS idx_pattern_learning_created ON pattern_learning_data(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_competitive_metrics_type ON competitive_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_competitive_metrics_created ON competitive_metrics(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cross_category_category ON cross_category_analysis(category);
CREATE INDEX IF NOT EXISTS idx_cross_category_type ON cross_category_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_cross_category_created ON cross_category_analysis(created_at DESC);
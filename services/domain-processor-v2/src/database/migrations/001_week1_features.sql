-- Migration: Week 1 Features - Consensus API, Zeitgeist Tracker, Drift Alert System
-- Date: 2025-08-04
-- Description: Add tables and indexes for LLM Consensus, AI Zeitgeist, and Memory Drift features

-- ============================================
-- 1. CONSENSUS API TABLES
-- ============================================

-- Consensus results table
CREATE TABLE IF NOT EXISTS consensus_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) NOT NULL,
    consensus_score DECIMAL(5,2) NOT NULL CHECK (consensus_score >= 0 AND consensus_score <= 100),
    aggregated_summary TEXT,
    key_themes TEXT[], -- Array of themes
    sentiment_overall DECIMAL(3,2) CHECK (sentiment_overall >= -1 AND sentiment_overall <= 1),
    sentiment_consensus VARCHAR(20) CHECK (sentiment_consensus IN ('unanimous', 'strong', 'moderate', 'weak', 'divergent')),
    technical_capabilities TEXT[],
    market_position TEXT,
    risks TEXT[],
    opportunities TEXT[],
    total_providers INTEGER NOT NULL,
    successful_responses INTEGER NOT NULL,
    failed_responses INTEGER NOT NULL,
    average_response_time INTEGER, -- milliseconds
    consensus_strength VARCHAR(20) CHECK (consensus_strength IN ('unanimous', 'strong', 'moderate', 'weak', 'divergent')),
    processing_time INTEGER, -- milliseconds
    cache_status VARCHAR(10) CHECK (cache_status IN ('hit', 'miss', 'partial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider responses table
CREATE TABLE IF NOT EXISTS consensus_provider_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consensus_id UUID NOT NULL REFERENCES consensus_results(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'timeout')),
    content TEXT,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    response_time INTEGER NOT NULL, -- milliseconds
    error_message TEXT,
    divergence_score DECIMAL(5,2) CHECK (divergence_score >= 0 AND divergence_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memory drift indicators
CREATE TABLE IF NOT EXISTS consensus_memory_drift (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consensus_id UUID NOT NULL REFERENCES consensus_results(id) ON DELETE CASCADE,
    detected BOOLEAN NOT NULL DEFAULT FALSE,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    drift_score DECIMAL(5,2) CHECK (drift_score >= 0 AND drift_score <= 100),
    affected_providers TEXT[],
    last_known_accurate TIMESTAMP WITH TIME ZONE,
    suggested_action VARCHAR(50) CHECK (suggested_action IN ('monitor', 'refresh', 'investigate', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ZEITGEIST TRACKER TABLES
-- ============================================

-- Zeitgeist trends table
CREATE TABLE IF NOT EXISTS zeitgeist_trends (
    id VARCHAR(100) PRIMARY KEY,
    topic VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('technology', 'company', 'product', 'person', 'event', 'concept', 'controversy', 'innovation', 'market_shift')),
    momentum DECIMAL(6,2) NOT NULL CHECK (momentum >= -100 AND momentum <= 100),
    velocity DECIMAL(6,2) NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    first_detected TIMESTAMP WITH TIME ZONE NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    peak_time TIMESTAMP WITH TIME ZONE,
    llm_consensus VARCHAR(20) CHECK (llm_consensus IN ('unanimous', 'strong', 'moderate', 'weak', 'divergent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Domain mentions for trends
CREATE TABLE IF NOT EXISTS zeitgeist_domain_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id VARCHAR(100) NOT NULL REFERENCES zeitgeist_trends(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    frequency INTEGER NOT NULL DEFAULT 1,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    context TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Keywords for trends
CREATE TABLE IF NOT EXISTS zeitgeist_keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id VARCHAR(100) NOT NULL REFERENCES zeitgeist_trends(id) ON DELETE CASCADE,
    keyword VARCHAR(100) NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    growth DECIMAL(10,2) DEFAULT 0,
    associations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emerging topics
CREATE TABLE IF NOT EXISTS zeitgeist_emerging_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic VARCHAR(500) NOT NULL,
    first_mention TIMESTAMP WITH TIME ZONE NOT NULL,
    growth_rate DECIMAL(10,2) NOT NULL,
    predicted_peak TIMESTAMP WITH TIME ZONE,
    related_trends TEXT[],
    early_adopters TEXT[], -- LLM providers that mentioned it first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Zeitgeist alerts/subscriptions
CREATE TABLE IF NOT EXISTS zeitgeist_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    filters JSONB,
    alert_types TEXT[] NOT NULL,
    webhook_url TEXT,
    email VARCHAR(255),
    realtime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. DRIFT ALERT SYSTEM TABLES
-- ============================================

-- Drift alerts table
CREATE TABLE IF NOT EXISTS drift_alerts (
    id VARCHAR(100) PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('temporal', 'factual', 'sentiment', 'existence', 'relationship', 'capability', 'financial', 'personnel', 'product', 'comprehensive')),
    score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
    reality_snapshot JSONB NOT NULL,
    memory_snapshot JSONB NOT NULL,
    divergence_analysis JSONB NOT NULL,
    recommended_actions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider drift details
CREATE TABLE IF NOT EXISTS drift_provider_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(100) NOT NULL REFERENCES drift_alerts(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    drift_score DECIMAL(5,2) NOT NULL CHECK (drift_score >= 0 AND drift_score <= 100),
    last_accurate_date TIMESTAMP WITH TIME ZONE,
    specific_drifts JSONB NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Drift resolutions
CREATE TABLE IF NOT EXISTS drift_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(100) NOT NULL REFERENCES drift_alerts(id) ON DELETE CASCADE,
    resolved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_by VARCHAR(255) NOT NULL,
    method VARCHAR(50) NOT NULL CHECK (method IN ('content_published', 'api_updated', 'provider_refreshed', 'manual_correction', 'auto_corrected', 'false_positive_marked')),
    verification_status VARCHAR(20) CHECK (verification_status IN ('pending', 'verified', 'failed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Domain monitoring configuration
CREATE TABLE IF NOT EXISTS drift_domain_config (
    domain VARCHAR(255) PRIMARY KEY,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    check_frequency INTEGER NOT NULL DEFAULT 900000, -- milliseconds
    specific_checks TEXT[],
    custom_thresholds JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alert subscriptions
CREATE TABLE IF NOT EXISTS drift_alert_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('webhook', 'email', 'slack', 'pagerduty', 'sms')),
    config JSONB NOT NULL,
    severity_filter TEXT[],
    type_filter TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

-- Consensus indexes
CREATE INDEX idx_consensus_domain ON consensus_results(domain);
CREATE INDEX idx_consensus_created_at ON consensus_results(created_at DESC);
CREATE INDEX idx_consensus_score ON consensus_results(consensus_score);
CREATE INDEX idx_provider_responses_consensus ON consensus_provider_responses(consensus_id);
CREATE INDEX idx_provider_responses_provider ON consensus_provider_responses(provider);

-- Zeitgeist indexes
CREATE INDEX idx_zeitgeist_trends_category ON zeitgeist_trends(category);
CREATE INDEX idx_zeitgeist_trends_momentum ON zeitgeist_trends(momentum DESC);
CREATE INDEX idx_zeitgeist_trends_updated ON zeitgeist_trends(last_updated DESC);
CREATE INDEX idx_zeitgeist_trends_topic ON zeitgeist_trends(topic);
CREATE INDEX idx_zeitgeist_domains_trend ON zeitgeist_domain_mentions(trend_id);
CREATE INDEX idx_zeitgeist_domains_domain ON zeitgeist_domain_mentions(domain);
CREATE INDEX idx_zeitgeist_keywords_trend ON zeitgeist_keywords(trend_id);
CREATE INDEX idx_zeitgeist_keywords_keyword ON zeitgeist_keywords(keyword);

-- Drift alert indexes
CREATE INDEX idx_drift_alerts_domain ON drift_alerts(domain);
CREATE INDEX idx_drift_alerts_severity ON drift_alerts(severity);
CREATE INDEX idx_drift_alerts_type ON drift_alerts(type);
CREATE INDEX idx_drift_alerts_status ON drift_alerts(status);
CREATE INDEX idx_drift_alerts_detected ON drift_alerts(detected_at DESC);
CREATE INDEX idx_drift_provider_alert ON drift_provider_details(alert_id);
CREATE INDEX idx_drift_resolutions_alert ON drift_resolutions(alert_id);

-- ============================================
-- 5. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_consensus_results_updated_at BEFORE UPDATE ON consensus_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zeitgeist_trends_updated_at BEFORE UPDATE ON zeitgeist_trends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zeitgeist_domain_mentions_updated_at BEFORE UPDATE ON zeitgeist_domain_mentions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zeitgeist_subscriptions_updated_at BEFORE UPDATE ON zeitgeist_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_alerts_updated_at BEFORE UPDATE ON drift_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_domain_config_updated_at BEFORE UPDATE ON drift_domain_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drift_alert_subscriptions_updated_at BEFORE UPDATE ON drift_alert_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. VIEWS FOR COMMON QUERIES
-- ============================================

-- Active drift alerts view
CREATE VIEW active_drift_alerts AS
SELECT 
    da.*,
    COUNT(dpd.id) as affected_provider_count,
    ARRAY_AGG(dpd.provider) as affected_providers
FROM drift_alerts da
LEFT JOIN drift_provider_details dpd ON da.id = dpd.alert_id
WHERE da.status IN ('active', 'acknowledged', 'investigating')
GROUP BY da.id;

-- Trending topics view
CREATE VIEW trending_topics AS
SELECT 
    zt.*,
    COUNT(DISTINCT zdm.domain) as domain_count,
    AVG(zdm.sentiment) as avg_domain_sentiment
FROM zeitgeist_trends zt
LEFT JOIN zeitgeist_domain_mentions zdm ON zt.id = zdm.trend_id
WHERE zt.last_updated > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY zt.id
ORDER BY zt.momentum DESC;

-- Provider accuracy view
CREATE VIEW provider_accuracy AS
SELECT 
    cpr.provider,
    COUNT(*) as total_responses,
    COUNT(CASE WHEN cpr.status = 'success' THEN 1 END) as successful_responses,
    AVG(cpr.response_time) as avg_response_time,
    AVG(cpr.confidence) as avg_confidence,
    AVG(cpr.divergence_score) as avg_divergence
FROM consensus_provider_responses cpr
GROUP BY cpr.provider;
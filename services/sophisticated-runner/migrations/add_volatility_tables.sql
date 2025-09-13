-- Migration: Add volatility tracking tables for swarm intelligence

-- Volatility scores table
CREATE TABLE IF NOT EXISTS volatility_scores (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100),
    memory_drift_velocity DECIMAL(3,2) DEFAULT 0,
    sentiment_variance DECIMAL(3,2) DEFAULT 0,
    temporal_decay_pattern DECIMAL(3,2) DEFAULT 0,
    seo_opportunity_score DECIMAL(3,2) DEFAULT 0,
    competitive_volatility DECIMAL(3,2) DEFAULT 0,
    overall_volatility DECIMAL(3,2) DEFAULT 0,
    signals JSONB DEFAULT '[]',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_volatility_scores_domain ON volatility_scores(domain);
CREATE INDEX idx_volatility_scores_overall ON volatility_scores(overall_volatility DESC);
CREATE INDEX idx_volatility_scores_category ON volatility_scores(category);
CREATE INDEX idx_volatility_scores_calculated ON volatility_scores(calculated_at DESC);

-- Swarm learning table for pattern recognition
CREATE TABLE IF NOT EXISTS swarm_learning (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    volatility_score DECIMAL(3,2),
    response_metrics JSONB,
    learning_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for learning queries
CREATE INDEX idx_swarm_learning_domain ON swarm_learning(domain);
CREATE INDEX idx_swarm_learning_created ON swarm_learning(created_at DESC);

-- Update domain_responses to include provider metadata
ALTER TABLE domain_responses 
ADD COLUMN IF NOT EXISTS provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS tier VARCHAR(20),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2);

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_domain_responses_provider ON domain_responses(provider);
CREATE INDEX IF NOT EXISTS idx_domain_responses_tier ON domain_responses(tier);

-- Pattern detections table (if not exists)
CREATE TABLE IF NOT EXISTS pattern_detections (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    confidence DECIMAL(3,2) NOT NULL,
    signals JSONB,
    supporting_evidence JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain, pattern_type)
);

-- Pattern alerts table (if not exists)
CREATE TABLE IF NOT EXISTS pattern_alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    pattern_type VARCHAR(50),
    domain VARCHAR(255),
    confidence DECIMAL(3,2),
    message TEXT,
    priority VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for pattern tables
CREATE INDEX IF NOT EXISTS idx_pattern_detections_domain ON pattern_detections(domain);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_type ON pattern_detections(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_created ON pattern_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_priority ON pattern_alerts(priority);
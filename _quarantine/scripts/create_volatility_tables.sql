-- 🧠 VOLATILITY SWARM DATABASE SCHEMA
-- Tables for tracking domain volatility and swarm learning

-- Volatility scores table
CREATE TABLE IF NOT EXISTS volatility_scores (
    id SERIAL PRIMARY KEY,
    domain_id UUID REFERENCES domains(id) UNIQUE,
    score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
    components JSONB NOT NULL,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('MAXIMUM_COVERAGE', 'HIGH_QUALITY_COVERAGE', 'BALANCED_COVERAGE', 'EFFICIENT_COVERAGE')),
    calculated_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_volatility_scores_domain_id ON volatility_scores(domain_id);
CREATE INDEX IF NOT EXISTS idx_volatility_scores_tier ON volatility_scores(tier);
CREATE INDEX IF NOT EXISTS idx_volatility_scores_score ON volatility_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_volatility_scores_calculated_at ON volatility_scores(calculated_at DESC);

-- Swarm learning table
CREATE TABLE IF NOT EXISTS swarm_learning (
    id SERIAL PRIMARY KEY,
    domain_id UUID REFERENCES domains(id),
    volatility_score DECIMAL(5,4),
    models_used INTEGER,
    response_quality DECIMAL(5,2),
    processing_time INTEGER, -- milliseconds
    cost_estimate DECIMAL(10,4),
    learned_at TIMESTAMP DEFAULT NOW()
);

-- Index for learning analytics
CREATE INDEX IF NOT EXISTS idx_swarm_learning_domain_id ON swarm_learning(domain_id);
CREATE INDEX IF NOT EXISTS idx_swarm_learning_learned_at ON swarm_learning(learned_at DESC);

-- Add memory and sentiment scores to domain_responses if not exists
ALTER TABLE domain_responses 
ADD COLUMN IF NOT EXISTS memory_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS detail_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_domain_responses_memory_score ON domain_responses(memory_score);
CREATE INDEX IF NOT EXISTS idx_domain_responses_sentiment_score ON domain_responses(sentiment_score);

-- Memory tensors table for tracking changes over time
CREATE TABLE IF NOT EXISTS memory_tensors (
    id SERIAL PRIMARY KEY,
    domain_id UUID REFERENCES domains(id),
    week_of DATE,
    memory_vector JSONB,
    consensus_score DECIMAL(5,2),
    drift_from_previous DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for tensor queries
CREATE INDEX IF NOT EXISTS idx_memory_tensors_week ON memory_tensors(week_of);
CREATE INDEX IF NOT EXISTS idx_memory_tensors_domain ON memory_tensors(domain_id);

-- Weekly intelligence summary table
CREATE TABLE IF NOT EXISTS weekly_intelligence (
    id SERIAL PRIMARY KEY,
    week_of DATE UNIQUE,
    total_domains INTEGER,
    total_responses INTEGER,
    active_llms INTEGER,
    top_gainers JSONB,
    top_losers JSONB,
    insights JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Category volatility tracking
CREATE TABLE IF NOT EXISTS category_volatility (
    id SERIAL PRIMARY KEY,
    category VARCHAR(255),
    week_of DATE,
    avg_volatility DECIMAL(5,4),
    domain_count INTEGER,
    top_volatile JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, week_of)
);

-- BrandSentiment.io integration table
CREATE TABLE IF NOT EXISTS brandsentiment_sync (
    id SERIAL PRIMARY KEY,
    domain_id UUID REFERENCES domains(id),
    external_volatility DECIMAL(5,4),
    external_sentiment DECIMAL(5,2),
    news_count INTEGER,
    social_mentions INTEGER,
    synced_at TIMESTAMP DEFAULT NOW()
);

-- Add business_category to domains if not exists
ALTER TABLE domains
ADD COLUMN IF NOT EXISTS business_category VARCHAR(255);

-- Create view for high opportunity domains
CREATE OR REPLACE VIEW high_opportunity_domains AS
SELECT 
    d.domain,
    vs.score as volatility_score,
    vs.components->>'seoOpportunity' as seo_opportunity,
    vs.components->>'memoryDrift' as memory_drift,
    vs.components->>'competitiveVolatility' as competitive_volatility,
    vs.tier,
    d.business_category,
    COUNT(DISTINCT dr.model) as current_coverage,
    MAX(dr.created_at) as last_crawled
FROM domains d
LEFT JOIN volatility_scores vs ON d.id = vs.domain_id
LEFT JOIN domain_responses dr ON d.id = dr.domain_id AND dr.created_at > NOW() - INTERVAL '7 days'
WHERE vs.score IS NOT NULL
GROUP BY d.id, d.domain, vs.score, vs.components, vs.tier, d.business_category
ORDER BY (vs.components->>'seoOpportunity')::float DESC;

-- Grant permissions (adjust based on your user)
GRANT ALL ON ALL TABLES IN SCHEMA public TO raw_capture_db_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO raw_capture_db_user;

-- Add comments for documentation
COMMENT ON TABLE volatility_scores IS 'Tracks domain volatility scores and processing tier assignments';
COMMENT ON TABLE swarm_learning IS 'Machine learning data from swarm processing patterns';
COMMENT ON TABLE memory_tensors IS 'Weekly memory vectors and consensus tracking';
COMMENT ON COLUMN volatility_scores.components IS 'JSON with memoryDrift, sentimentVariance, temporalDecay, seoOpportunity, competitiveVolatility';
COMMENT ON COLUMN volatility_scores.tier IS 'Processing tier based on volatility score';
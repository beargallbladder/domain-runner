-- Migration: Add volatility scoring tables
-- This migration adds tables for the volatility scoring system

-- Check if domain_id column is UUID type in domains table
DO $$ 
BEGIN
    -- Volatility scores table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'volatility_scores') THEN
        CREATE TABLE volatility_scores (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id) UNIQUE,
            score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
            components JSONB NOT NULL,
            tier VARCHAR(50) NOT NULL CHECK (tier IN ('MAXIMUM_COVERAGE', 'HIGH_QUALITY_COVERAGE', 'BALANCED_COVERAGE', 'EFFICIENT_COVERAGE')),
            calculated_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_volatility_scores_domain_id ON volatility_scores(domain_id);
        CREATE INDEX idx_volatility_scores_tier ON volatility_scores(tier);
        CREATE INDEX idx_volatility_scores_score ON volatility_scores(score DESC);
        CREATE INDEX idx_volatility_scores_calculated_at ON volatility_scores(calculated_at DESC);
    END IF;

    -- Swarm learning table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'swarm_learning') THEN
        CREATE TABLE swarm_learning (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id),
            volatility_score DECIMAL(5,4),
            models_used INTEGER,
            response_quality DECIMAL(5,2),
            processing_time INTEGER, -- milliseconds
            cost_estimate DECIMAL(10,4),
            learned_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_swarm_learning_domain_id ON swarm_learning(domain_id);
        CREATE INDEX idx_swarm_learning_learned_at ON swarm_learning(learned_at DESC);
    END IF;

    -- Add columns to domain_responses if they don't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='domain_responses' AND column_name='memory_score') THEN
        ALTER TABLE domain_responses ADD COLUMN memory_score DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='domain_responses' AND column_name='sentiment_score') THEN
        ALTER TABLE domain_responses ADD COLUMN sentiment_score DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='domain_responses' AND column_name='detail_score') THEN
        ALTER TABLE domain_responses ADD COLUMN detail_score DECIMAL(5,2);
    END IF;
    
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='domain_responses' AND column_name='computed_at') THEN
        ALTER TABLE domain_responses ADD COLUMN computed_at TIMESTAMP;
    END IF;

    -- Create indexes for new columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domain_responses_memory_score') THEN
        CREATE INDEX idx_domain_responses_memory_score ON domain_responses(memory_score);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_domain_responses_sentiment_score') THEN
        CREATE INDEX idx_domain_responses_sentiment_score ON domain_responses(sentiment_score);
    END IF;

    -- Memory tensors table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'memory_tensors') THEN
        CREATE TABLE memory_tensors (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id),
            week_of DATE,
            memory_vector JSONB,
            consensus_score DECIMAL(5,2),
            drift_from_previous DECIMAL(5,2),
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX idx_memory_tensors_week ON memory_tensors(week_of);
        CREATE INDEX idx_memory_tensors_domain ON memory_tensors(domain_id);
    END IF;

    -- Weekly intelligence summary table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'weekly_intelligence') THEN
        CREATE TABLE weekly_intelligence (
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
    END IF;

    -- Category volatility tracking
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'category_volatility') THEN
        CREATE TABLE category_volatility (
            id SERIAL PRIMARY KEY,
            category VARCHAR(255),
            week_of DATE,
            avg_volatility DECIMAL(5,4),
            domain_count INTEGER,
            top_volatile JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(category, week_of)
        );
    END IF;

    -- BrandSentiment.io integration table
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'brandsentiment_sync') THEN
        CREATE TABLE brandsentiment_sync (
            id SERIAL PRIMARY KEY,
            domain_id INTEGER REFERENCES domains(id),
            external_volatility DECIMAL(5,4),
            external_sentiment DECIMAL(5,2),
            news_count INTEGER,
            social_mentions INTEGER,
            synced_at TIMESTAMP DEFAULT NOW()
        );
    END IF;

    -- Add business_category to domains if not exists
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='domains' AND column_name='business_category') THEN
        ALTER TABLE domains ADD COLUMN business_category VARCHAR(255);
    END IF;

END $$;

-- Create view for high opportunity domains (drop and recreate to ensure latest version)
DROP VIEW IF EXISTS high_opportunity_domains;

CREATE VIEW high_opportunity_domains AS
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

-- Add comments for documentation
COMMENT ON TABLE volatility_scores IS 'Tracks domain volatility scores and processing tier assignments';
COMMENT ON TABLE swarm_learning IS 'Machine learning data from swarm processing patterns';
COMMENT ON TABLE memory_tensors IS 'Weekly memory vectors and consensus tracking';
COMMENT ON COLUMN volatility_scores.components IS 'JSON with memoryDrift, sentimentVariance, temporalDecay, seoOpportunity, competitiveVolatility';
COMMENT ON COLUMN volatility_scores.tier IS 'Processing tier based on volatility score';
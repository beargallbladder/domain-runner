-- Schema Evolution Manager for AI Memory Arbitrage System
-- Protects existing data while adding new insights tables

-- ============================================
-- NEW TABLES (Won't affect existing data)
-- ============================================

-- Model consensus tracking
CREATE TABLE IF NOT EXISTS model_consensus_clusters (
    id SERIAL PRIMARY KEY,
    cluster_id INTEGER NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    cluster_cohesion FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cluster_id, model_name)
);

-- Memory velocity tracking
CREATE TABLE IF NOT EXISTS domain_memory_velocity (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    velocity_score FLOAT NOT NULL,  -- Changes per week
    velocity_tier VARCHAR(20) CHECK (velocity_tier IN ('FROZEN', 'SLOW', 'MEDIUM', 'FAST')),
    measurement_window_days INTEGER DEFAULT 30,
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, measurement_window_days)
);

-- Arbitrage opportunities
CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    gap_score FLOAT NOT NULL,
    velocity FLOAT NOT NULL,
    persistence FLOAT NOT NULL,
    market_size FLOAT NOT NULL,
    risk_score FLOAT NOT NULL,
    roi_estimate FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    strategy VARCHAR(50),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    CONSTRAINT chk_roi CHECK (roi_estimate >= 0),
    CONSTRAINT chk_confidence CHECK (confidence BETWEEN 0 AND 1)
);

-- Memory cliff events
CREATE TABLE IF NOT EXISTS memory_cliff_events (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    model VARCHAR(100) NOT NULL,
    cliff_date TIMESTAMP NOT NULL,
    score_before FLOAT NOT NULL,
    score_after FLOAT NOT NULL,
    cliff_size FLOAT NOT NULL,
    cliff_direction VARCHAR(10) CHECK (cliff_direction IN ('UP', 'DOWN')),
    recovery_time_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_cliff_size CHECK (cliff_size >= 0)
);

-- Institutional friction scores
CREATE TABLE IF NOT EXISTS institutional_friction_scores (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    content_volume_force FLOAT CHECK (content_volume_force BETWEEN 0 AND 100),
    regulation_force FLOAT CHECK (regulation_force BETWEEN 0 AND 100),
    liability_force FLOAT CHECK (liability_force BETWEEN 0 AND 100),
    institutional_bias_force FLOAT CHECK (institutional_bias_force BETWEEN 0 AND 100),
    combined_friction_score FLOAT GENERATED ALWAYS AS (
        (content_volume_force + regulation_force + liability_force + institutional_bias_force) / 4
    ) STORED,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, calculated_at)
);

-- Model divergence tracking
CREATE TABLE IF NOT EXISTS model_divergence_analysis (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    analysis_date DATE NOT NULL,
    model_count INTEGER NOT NULL,
    consensus_score FLOAT CHECK (consensus_score BETWEEN 0 AND 1),
    standard_deviation FLOAT,
    score_range FLOAT,
    coefficient_variation FLOAT,
    outlier_models JSONB,  -- Array of {model, score, z_score}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(domain, analysis_date)
);

-- ============================================
-- VIEWS FOR ANALYSIS (Read-only, safe)
-- ============================================

-- Weekly arbitrage summary
CREATE OR REPLACE VIEW weekly_arbitrage_summary AS
SELECT 
    DATE_TRUNC('week', detected_at) as week,
    COUNT(*) as opportunities_found,
    AVG(gap_score) as avg_gap,
    AVG(roi_estimate) as avg_roi,
    MAX(roi_estimate) as max_roi,
    STRING_AGG(DISTINCT strategy, ', ') as strategies_used
FROM arbitrage_opportunities
WHERE detected_at > NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('week', detected_at)
ORDER BY week DESC;

-- Model consensus matrix
CREATE OR REPLACE VIEW model_consensus_matrix AS
WITH model_pairs AS (
    SELECT 
        dr1.model as model1,
        dr2.model as model2,
        COUNT(*) as comparison_count,
        AVG(
            1 - ABS(
                CAST(SUBSTRING(dr1.response FROM '\d+') AS FLOAT) - 
                CAST(SUBSTRING(dr2.response FROM '\d+') AS FLOAT)
            ) / 100
        ) as agreement_score
    FROM domain_responses dr1
    JOIN domain_responses dr2 ON dr1.domain_id = dr2.domain_id 
        AND dr1.model < dr2.model
        AND dr1.prompt_type = dr2.prompt_type
        AND dr1.prompt_type = 'memory_analysis'
    WHERE dr1.created_at > NOW() - INTERVAL '30 days'
        AND dr2.created_at > NOW() - INTERVAL '30 days'
    GROUP BY dr1.model, dr2.model
)
SELECT * FROM model_pairs
ORDER BY agreement_score DESC;

-- Domain velocity rankings
CREATE OR REPLACE VIEW domain_velocity_rankings AS
SELECT 
    dmv.domain,
    dmv.velocity_score,
    dmv.velocity_tier,
    dc.category,
    dc.market_position,
    RANK() OVER (ORDER BY dmv.velocity_score DESC) as velocity_rank,
    CASE 
        WHEN dmv.velocity_tier = 'FROZEN' THEN 'Long-term arbitrage candidate'
        WHEN dmv.velocity_tier = 'FAST' THEN 'Short-term momentum play'
        ELSE 'Standard monitoring'
    END as strategy_hint
FROM domain_memory_velocity dmv
LEFT JOIN domain_categories dc ON dc.domain = dmv.domain
WHERE dmv.last_calculated > NOW() - INTERVAL '7 days'
ORDER BY dmv.velocity_score DESC;

-- ============================================
-- FUNCTIONS FOR SAFE DATA ACCESS
-- ============================================

-- Function to safely calculate memory velocity
CREATE OR REPLACE FUNCTION calculate_memory_velocity(
    p_domain VARCHAR,
    p_window_days INTEGER DEFAULT 30
) RETURNS TABLE (
    velocity FLOAT,
    tier VARCHAR(20),
    data_points INTEGER
) AS $$
DECLARE
    v_velocity FLOAT;
    v_tier VARCHAR(20);
    v_points INTEGER;
BEGIN
    -- Calculate velocity from existing data
    WITH daily_scores AS (
        SELECT 
            DATE(created_at) as score_date,
            AVG(CAST(SUBSTRING(response FROM '\d+') AS FLOAT)) as avg_score
        FROM domain_responses dr
        JOIN domains d ON d.id = dr.domain_id
        WHERE d.domain = p_domain
            AND prompt_type = 'memory_analysis'
            AND created_at > NOW() - INTERVAL '1 day' * p_window_days
        GROUP BY DATE(created_at)
    ),
    score_changes AS (
        SELECT 
            score_date,
            avg_score,
            avg_score - LAG(avg_score) OVER (ORDER BY score_date) as daily_change
        FROM daily_scores
    )
    SELECT 
        COALESCE(AVG(ABS(daily_change)) * 7, 0),  -- Weekly velocity
        COUNT(*)
    INTO v_velocity, v_points
    FROM score_changes
    WHERE daily_change IS NOT NULL;
    
    -- Classify tier
    v_tier := CASE
        WHEN v_velocity < 1.0 THEN 'FROZEN'
        WHEN v_velocity < 5.0 THEN 'SLOW'
        WHEN v_velocity < 10.0 THEN 'MEDIUM'
        ELSE 'FAST'
    END;
    
    -- Store result
    INSERT INTO domain_memory_velocity (domain, velocity_score, velocity_tier, measurement_window_days)
    VALUES (p_domain, v_velocity, v_tier, p_window_days)
    ON CONFLICT (domain, measurement_window_days) 
    DO UPDATE SET 
        velocity_score = v_velocity,
        velocity_tier = v_tier,
        last_calculated = CURRENT_TIMESTAMP;
    
    RETURN QUERY SELECT v_velocity, v_tier, v_points;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES FOR PERFORMANCE (Non-destructive)
-- ============================================

-- Speed up arbitrage queries
CREATE INDEX IF NOT EXISTS idx_arbitrage_domain_date 
    ON arbitrage_opportunities(domain, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_arbitrage_roi 
    ON arbitrage_opportunities(roi_estimate DESC);

CREATE INDEX IF NOT EXISTS idx_arbitrage_detected 
    ON arbitrage_opportunities(detected_at DESC);

-- Speed up velocity lookups
CREATE INDEX IF NOT EXISTS idx_velocity_domain 
    ON domain_memory_velocity(domain);

-- Speed up cliff event searches
CREATE INDEX IF NOT EXISTS idx_cliff_domain_date 
    ON memory_cliff_events(domain, cliff_date DESC);

CREATE INDEX IF NOT EXISTS idx_cliff_size 
    ON memory_cliff_events(cliff_size DESC);

-- ============================================
-- SCHEDULED MAINTENANCE (Safe operations)
-- ============================================

-- Function to clean old arbitrage opportunities
CREATE OR REPLACE FUNCTION cleanup_old_arbitrage_data()
RETURNS void AS $$
BEGIN
    -- Archive opportunities older than 90 days
    DELETE FROM arbitrage_opportunities 
    WHERE detected_at < NOW() - INTERVAL '90 days'
        AND resolved_at IS NOT NULL;
        
    -- Clean up old velocity calculations
    DELETE FROM domain_memory_velocity
    WHERE last_calculated < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMISSIONS (Protect production data)
-- ============================================

-- Create read-only role for analysis
CREATE ROLE IF NOT EXISTS arbitrage_analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO arbitrage_analyst;
GRANT EXECUTE ON FUNCTION calculate_memory_velocity TO arbitrage_analyst;

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Check schema health
CREATE OR REPLACE VIEW schema_health_check AS
SELECT 
    'domains' as table_name,
    COUNT(*) as row_count,
    'CORE' as table_type
FROM domains
UNION ALL
SELECT 
    'domain_responses' as table_name,
    COUNT(*) as row_count,
    'CORE' as table_type
FROM domain_responses
UNION ALL
SELECT 
    'arbitrage_opportunities' as table_name,
    COUNT(*) as row_count,
    'ANALYSIS' as table_type
FROM arbitrage_opportunities
UNION ALL
SELECT 
    'domain_memory_velocity' as table_name,
    COUNT(*) as row_count,
    'ANALYSIS' as table_type
FROM domain_memory_velocity;

COMMENT ON TABLE arbitrage_opportunities IS 'AI memory arbitrage opportunities detected by the system';
COMMENT ON TABLE domain_memory_velocity IS 'Tracks how fast AI memory updates for each domain';
COMMENT ON TABLE memory_cliff_events IS 'Dramatic changes in memory scores';
COMMENT ON TABLE model_consensus_clusters IS 'Groups of models that tend to agree';
COMMENT ON TABLE institutional_friction_scores IS 'The four forces affecting memory update speed';
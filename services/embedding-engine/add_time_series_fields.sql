-- Add Time-Series Analysis Fields to public_domain_cache
-- Supports T1 vs T0 analysis for memory score degradation/improvement

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS memory_score_history JSONB DEFAULT '[]';

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS previous_memory_score FLOAT;

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS memory_score_trend VARCHAR(20) DEFAULT 'stable';

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS trend_percentage FLOAT DEFAULT 0.0;

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS last_measurement_date TIMESTAMP DEFAULT NOW();

ALTER TABLE public_domain_cache 
ADD COLUMN IF NOT EXISTS measurement_count INTEGER DEFAULT 1;

-- Add constraint for trend values
ALTER TABLE public_domain_cache 
ADD CONSTRAINT valid_memory_trend 
CHECK (memory_score_trend IN ('improving', 'degrading', 'stable', 'volatile'));

-- Create indexes for time-series queries  
CREATE INDEX IF NOT EXISTS idx_memory_trend ON public_domain_cache(memory_score_trend);
CREATE INDEX IF NOT EXISTS idx_trend_percentage ON public_domain_cache(trend_percentage DESC);
CREATE INDEX IF NOT EXISTS idx_last_measurement ON public_domain_cache(last_measurement_date);
CREATE INDEX IF NOT EXISTS idx_measurement_count ON public_domain_cache(measurement_count DESC);

-- Create function to update time-series data
CREATE OR REPLACE FUNCTION update_memory_score_time_series()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate trend if we have previous data
    IF OLD.memory_score IS NOT NULL THEN
        -- Update history array (keep last 10 measurements)
        NEW.memory_score_history := (
            SELECT jsonb_agg(elem)
            FROM (
                SELECT elem 
                FROM jsonb_array_elements(COALESCE(OLD.memory_score_history, '[]'::jsonb)) elem
                UNION ALL
                SELECT jsonb_build_object(
                    'score', OLD.memory_score,
                    'timestamp', OLD.updated_at,
                    'consensus', OLD.ai_consensus_score
                )
                ORDER BY (elem->>'timestamp')::timestamp DESC
                LIMIT 10
            ) subq
        );
        
        -- Store previous score
        NEW.previous_memory_score := OLD.memory_score;
        
        -- Calculate trend
        NEW.trend_percentage := ROUND(
            ((NEW.memory_score - OLD.memory_score) / OLD.memory_score * 100)::numeric, 2
        );
        
        -- Determine trend category
        NEW.memory_score_trend := CASE
            WHEN NEW.trend_percentage > 5 THEN 'improving'
            WHEN NEW.trend_percentage < -5 THEN 'degrading'
            WHEN ABS(NEW.trend_percentage) > 15 THEN 'volatile'
            ELSE 'stable'
        END;
        
        -- Update measurement count
        NEW.measurement_count := COALESCE(OLD.measurement_count, 0) + 1;
    END IF;
    
    -- Always update last measurement date
    NEW.last_measurement_date := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic time-series updates
DROP TRIGGER IF EXISTS memory_score_time_series_trigger ON public_domain_cache;
CREATE TRIGGER memory_score_time_series_trigger
    BEFORE UPDATE ON public_domain_cache
    FOR EACH ROW
    WHEN (NEW.memory_score IS DISTINCT FROM OLD.memory_score)
    EXECUTE FUNCTION update_memory_score_time_series();

-- Create view for easy time-series analysis
CREATE OR REPLACE VIEW memory_score_trends AS
SELECT 
    domain,
    memory_score,
    previous_memory_score,
    memory_score_trend,
    trend_percentage,
    measurement_count,
    last_measurement_date,
    CASE 
        WHEN memory_score_trend = 'degrading' AND trend_percentage < -10 THEN 'CRITICAL'
        WHEN memory_score_trend = 'degrading' AND trend_percentage < -5 THEN 'WARNING'
        WHEN memory_score_trend = 'improving' AND trend_percentage > 10 THEN 'BREAKTHROUGH'
        ELSE 'NORMAL'
    END as alert_level,
    memory_score_history
FROM public_domain_cache
WHERE measurement_count > 1
ORDER BY trend_percentage DESC; 
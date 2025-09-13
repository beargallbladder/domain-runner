-- Drop the failed view if it exists
DROP VIEW IF EXISTS ai_responses;

-- Create ai_responses view that matches the expected schema
CREATE OR REPLACE VIEW ai_responses AS 
SELECT 
  d.domain,
  dr.model as provider,
  dr.memory_score,
  CASE 
    WHEN dr.sentiment_score >= 80 THEN 'positive'
    WHEN dr.sentiment_score >= 60 THEN 'neutral'
    WHEN dr.sentiment_score >= 40 THEN 'mixed'
    ELSE 'negative'
  END as sentiment,
  dr.created_at as last_updated,
  dr.response as response_text,
  COALESCE(dr.sentiment_score / 100.0, 0.8) as confidence,
  dr.model,
  '{}' as metadata
FROM domain_responses dr
JOIN domains d ON dr.domain_id = d.id;

-- Grant permissions
GRANT SELECT ON ai_responses TO raw_capture_db_user;
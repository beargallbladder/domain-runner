-- Create ai_responses as an alias/view to domain_responses
CREATE OR REPLACE VIEW ai_responses AS 
SELECT 
  domain,
  provider_id as provider,
  memory_score,
  sentiment,
  updated_at as last_updated,
  response_text,
  confidence_score as confidence,
  model_used as model,
  metadata
FROM domain_responses;

-- Create zeitgeist-specific tables
CREATE TABLE IF NOT EXISTS zeitgeist_trends (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  viral_score FLOAT DEFAULT 0,
  momentum_score FLOAT DEFAULT 0,
  momentum_direction VARCHAR(20) CHECK (momentum_direction IN ('rising', 'falling', 'stable', 'volatile')),
  engagement_potential FLOAT DEFAULT 0,
  social_signals JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viral_content_cache (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  viral_score FLOAT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_zeitgeist_trends_domain ON zeitgeist_trends(domain);
CREATE INDEX IF NOT EXISTS idx_zeitgeist_trends_viral_score ON zeitgeist_trends(viral_score DESC);
CREATE INDEX IF NOT EXISTS idx_zeitgeist_trends_momentum ON zeitgeist_trends(momentum_direction, momentum_score DESC);
CREATE INDEX IF NOT EXISTS idx_viral_content_domain_platform ON viral_content_cache(domain, platform);
CREATE INDEX IF NOT EXISTS idx_viral_content_expires ON viral_content_cache(expires_at);

-- Add some initial test data
INSERT INTO zeitgeist_trends (domain, viral_score, momentum_score, momentum_direction, engagement_potential)
VALUES 
  ('openai.com', 95.5, 12.3, 'rising', 0.89),
  ('anthropic.com', 88.2, 8.7, 'rising', 0.82),
  ('mistral.ai', 72.1, -3.2, 'falling', 0.65),
  ('deepseek.ai', 68.5, 15.8, 'volatile', 0.71),
  ('llmrank.io', 82.4, 5.2, 'stable', 0.77)
ON CONFLICT DO NOTHING;
-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  source TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create raw_responses table with proper timestamp
CREATE TABLE IF NOT EXISTS raw_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_template_id TEXT NOT NULL,
  interpolated_prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  latency_ms INT,
  token_usage JSONB,
  cost_estimate FLOAT,
  -- Index on timestamp and domain for time series queries
  CONSTRAINT idx_responses_domain_time UNIQUE (domain, captured_at)
);

-- Create prompt_templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
  id TEXT PRIMARY KEY,
  template TEXT NOT NULL,
  category TEXT
);

-- Create indexes for time series queries
CREATE INDEX IF NOT EXISTS idx_raw_responses_captured_at ON raw_responses(captured_at);
CREATE INDEX IF NOT EXISTS idx_raw_responses_domain_captured ON raw_responses(domain, captured_at);
CREATE INDEX IF NOT EXISTS idx_raw_responses_model_captured ON raw_responses(model, captured_at); 
-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_processed_at TIMESTAMP WITH TIME ZONE,
  process_count INTEGER DEFAULT 0 CHECK (process_count >= 0),
  error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
  source TEXT,
  is_jolt BOOLEAN DEFAULT false,
  jolt_type TEXT,
  jolt_severity TEXT,
  jolt_additional_prompts INTEGER DEFAULT 0,
  cohort TEXT DEFAULT 'legacy',
  priority INTEGER DEFAULT 1 CHECK (priority >= 0 AND priority <= 10),
  discovery_source TEXT,
  source_domain TEXT,
  jolt_activated_at TIMESTAMP WITHOUT TIME ZONE,
  jolt_deactivated_at TIMESTAMP WITHOUT TIME ZONE
);

-- Create indexes for domains table
CREATE INDEX IF NOT EXISTS idx_domains_priority_status ON domains(priority DESC, status, created_at);
CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = true;
CREATE INDEX IF NOT EXISTS idx_domains_cohort_status ON domains(cohort, status);
CREATE INDEX IF NOT EXISTS idx_domains_discovery ON domains(discovery_source);

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

-- Create domain_responses table for LLM processing results
CREATE TABLE IF NOT EXISTS domain_responses (
  id SERIAL PRIMARY KEY,
  domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  prompt_type VARCHAR(100) NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for domain_responses
CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_id ON domain_responses(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_responses_created_at ON domain_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_domain_responses_domain_model ON domain_responses(domain_id, model) INCLUDE (response, created_at); 
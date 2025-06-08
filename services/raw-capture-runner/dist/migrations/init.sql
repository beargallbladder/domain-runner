-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create responses table with temporal support
CREATE TABLE IF NOT EXISTS responses (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER REFERENCES domains(id),
    model_name VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    raw_response TEXT NOT NULL,
    token_count INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_cost_usd DECIMAL(10,6),
    latency_ms INTEGER,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Remove unique constraint to allow temporal data
    -- Add indices for efficient temporal queries
    CONSTRAINT responses_domain_model_prompt_time UNIQUE (domain_id, model_name, prompt_type, captured_at)
);

-- Create indices for temporal queries
CREATE INDEX IF NOT EXISTS idx_responses_captured_at ON responses(captured_at);
CREATE INDEX IF NOT EXISTS idx_responses_domain_time ON responses(domain_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_responses_model_time ON responses(model_name, captured_at);
CREATE INDEX IF NOT EXISTS idx_responses_prompt_time ON responses(prompt_type, captured_at); 
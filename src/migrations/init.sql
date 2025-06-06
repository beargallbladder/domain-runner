-- Create domains table
CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER REFERENCES domains(id),
    model_name VARCHAR(50) NOT NULL,
    prompt_type VARCHAR(50) NOT NULL,
    raw_response TEXT NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_domain_model_prompt UNIQUE (domain_id, model_name, prompt_type)
); 
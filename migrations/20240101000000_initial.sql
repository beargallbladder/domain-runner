-- Initial migration: Create core tables

CREATE TABLE IF NOT EXISTS domains (
    domain TEXT PRIMARY KEY,
    category TEXT,
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domain_responses (
    id UUID PRIMARY KEY,
    domain TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    llm_response TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    token_count INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status TEXT NOT NULL,
    prompt_type TEXT NOT NULL,
    embedding REAL[]
);

CREATE TABLE IF NOT EXISTS drift_scores (
    drift_id UUID PRIMARY KEY,
    domain TEXT NOT NULL,
    prompt_id TEXT NOT NULL,
    model TEXT NOT NULL,
    ts_iso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    similarity_prev REAL NOT NULL,
    drift_score REAL NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('stable', 'drifting', 'decayed')),
    explanation TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_responses_domain ON domain_responses(domain);
CREATE INDEX IF NOT EXISTS idx_domain_responses_timestamp ON domain_responses(timestamp);
CREATE INDEX IF NOT EXISTS idx_domain_responses_model ON domain_responses(llm_model);

CREATE INDEX IF NOT EXISTS idx_drift_scores_domain ON drift_scores(domain);
CREATE INDEX IF NOT EXISTS idx_drift_scores_timestamp ON drift_scores(ts_iso);
CREATE INDEX IF NOT EXISTS idx_drift_scores_status ON drift_scores(status);

-- Insert sample domains
INSERT INTO domains (domain, category, priority)
VALUES
    ('example.com', 'technology', 10),
    ('test.org', 'education', 8),
    ('demo.net', 'business', 5)
ON CONFLICT (domain) DO NOTHING;
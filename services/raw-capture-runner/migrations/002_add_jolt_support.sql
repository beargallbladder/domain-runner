-- MIGRATION: Add JOLT (Jump Or Loss Transition) Support
-- 
-- Purpose: Extend database to support JOLT domain metadata and enhanced cost tracking
-- Compatible with: sophisticated-runner JOLT system
-- Date: 2025-06-11

BEGIN;

-- Add JOLT metadata to domains table
ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS is_jolt BOOLEAN DEFAULT FALSE;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_type TEXT;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_severity TEXT 
CHECK (jolt_severity IS NULL OR jolt_severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_description TEXT;

ALTER TABLE domains 
ADD COLUMN IF NOT EXISTS jolt_additional_prompts INTEGER DEFAULT 0;

-- Add cost tracking to responses table
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6);

ALTER TABLE responses
ADD COLUMN IF NOT EXISTS pricing_model TEXT;

ALTER TABLE responses
ADD COLUMN IF NOT EXISTS latency_ms INTEGER;

-- Add JOLT-specific indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_domains_jolt ON domains(is_jolt) WHERE is_jolt = TRUE;
CREATE INDEX IF NOT EXISTS idx_domains_jolt_severity ON domains(jolt_severity) WHERE is_jolt = TRUE;
CREATE INDEX IF NOT EXISTS idx_responses_cost ON responses(cost_usd) WHERE cost_usd IS NOT NULL;

-- Create JOLT analysis view for cost comparison
CREATE OR REPLACE VIEW v_jolt_analysis AS
SELECT 
  d.domain,
  d.is_jolt,
  d.jolt_type,
  d.jolt_severity,
  d.jolt_additional_prompts,
  COUNT(r.id) as total_responses,
  COUNT(DISTINCT r.model) as models_used,
  COUNT(DISTINCT r.prompt_type) as prompt_types_used,
  SUM(r.cost_usd) as total_cost_usd,
  AVG(r.cost_usd) as avg_cost_per_response,
  SUM(r.token_count) as total_tokens,
  AVG(r.latency_ms) as avg_latency_ms
FROM domains d
LEFT JOIN responses r ON d.id = r.domain_id
GROUP BY d.id, d.domain, d.is_jolt, d.jolt_type, d.jolt_severity, d.jolt_additional_prompts
ORDER BY d.is_jolt DESC, total_cost_usd DESC;

-- Create cost efficiency view
CREATE OR REPLACE VIEW v_cost_efficiency AS
SELECT 
  is_jolt,
  jolt_severity,
  COUNT(*) as domain_count,
  SUM(total_cost_usd) as total_cost,
  AVG(total_cost_usd) as avg_cost_per_domain,
  SUM(total_responses) as total_responses,
  AVG(total_responses) as avg_responses_per_domain,
  AVG(avg_cost_per_response) as avg_cost_per_response
FROM v_jolt_analysis
GROUP BY is_jolt, jolt_severity
ORDER BY is_jolt DESC, avg_cost_per_domain DESC;

COMMIT;

-- Insert test JOLT domains (matches sophisticated-runner embedded data)
INSERT INTO domains (domain, is_jolt, jolt_type, jolt_severity, jolt_description, jolt_additional_prompts)
VALUES 
  ('apple.com', TRUE, 'leadership_change', 'critical', 'Steve Jobs death transition - Ultimate brand memory test', 8),
  ('theranos.com', TRUE, 'corporate_collapse', 'critical', 'Complete fraud scandal collapse', 7),
  ('facebook.com', TRUE, 'brand_transition', 'high', 'Facebook to Meta rebranding', 6),
  ('twitter.com', TRUE, 'brand_transition', 'critical', 'Twitter to X transformation under Musk', 8),
  ('ftx.com', TRUE, 'corporate_collapse', 'critical', 'Crypto exchange fraud collapse', 7),
  ('tesla.com', TRUE, 'leadership_controversy', 'high', 'Elon Musk controversies and brand impact', 6),
  ('enron.com', TRUE, 'corporate_collapse', 'critical', 'Historic corporate fraud collapse', 7),
  ('wework.com', TRUE, 'leadership_scandal', 'high', 'WeWork Adam Neumann scandal', 5),
  ('uber.com', TRUE, 'leadership_scandal', 'medium', 'Travis Kalanick scandals', 4),
  ('lehman.com', TRUE, 'corporate_collapse', 'critical', '2008 financial crisis collapse', 7)
ON CONFLICT (domain) DO UPDATE SET
  is_jolt = EXCLUDED.is_jolt,
  jolt_type = EXCLUDED.jolt_type,
  jolt_severity = EXCLUDED.jolt_severity,
  jolt_description = EXCLUDED.jolt_description,
  jolt_additional_prompts = EXCLUDED.jolt_additional_prompts; 
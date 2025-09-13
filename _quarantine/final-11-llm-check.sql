-- FINAL CHECK: ARE ALL 11 LLMs WORKING?
-- Run this in your PostgreSQL client

-- 1. First, check what columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'domain_responses' 
AND column_name LIKE '%provider%' OR column_name LIKE '%llm%'
LIMIT 10;

-- 2. Check recent activity (adjust column name as needed)
-- Replace 'llm_provider' with actual column name from above
SELECT 
    llm_provider,  -- or whatever the column is called
    COUNT(*) as response_count,
    COUNT(DISTINCT domain_id) as domains_processed,
    MAX(created_at) as last_success,
    MIN(created_at) as first_success
FROM domain_responses
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY llm_provider
ORDER BY response_count DESC;

-- 3. CRITICAL: Check if Cohere and Groq have EVER responded
SELECT 
    llm_provider,
    COUNT(*) as all_time_responses,
    MAX(created_at) as last_response
FROM domain_responses
WHERE llm_provider IN ('cohere', 'groq')
GROUP BY llm_provider;

-- 4. Show all unique LLM providers in the system
SELECT DISTINCT llm_provider 
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY llm_provider;

-- 5. Check today's processing
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(DISTINCT llm_provider) as unique_providers,
    COUNT(*) as total_responses
FROM domain_responses
WHERE created_at > NOW() - INTERVAL '12 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
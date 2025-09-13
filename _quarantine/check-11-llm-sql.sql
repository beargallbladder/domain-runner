-- CHECK 11 LLM STATUS IN DATABASE
-- Run this query to see which LLMs have been working today

-- First, check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
LIMIT 10;

-- Check domain_responses table (the actual table name)
SELECT 
    provider,
    COUNT(*) as response_count,
    COUNT(DISTINCT domain_id) as domains_processed,
    MAX(created_at) as last_response,
    CASE 
        WHEN MAX(created_at) > NOW() - INTERVAL '1 hour' THEN '✅ ACTIVE NOW'
        WHEN MAX(created_at) > NOW() - INTERVAL '6 hours' THEN '⚠️ RECENT'
        ELSE '❌ INACTIVE'
    END as status
FROM domain_responses
WHERE created_at > NOW() - INTERVAL '6 hours'
    AND response IS NOT NULL
    AND response != ''
GROUP BY provider
ORDER BY response_count DESC;

-- Show all 11 expected providers and their status
WITH expected_providers AS (
    SELECT unnest(ARRAY['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']) as provider
),
actual_responses AS (
    SELECT 
        provider,
        COUNT(*) as responses,
        MAX(created_at) as last_success
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
        AND response IS NOT NULL
    GROUP BY provider
)
SELECT 
    e.provider,
    COALESCE(a.responses, 0) as responses_24h,
    COALESCE(a.last_success::text, 'NEVER') as last_success,
    CASE 
        WHEN a.responses > 0 THEN '✅ WORKING'
        ELSE '❌ NOT WORKING'
    END as status
FROM expected_providers e
LEFT JOIN actual_responses a ON e.provider = a.provider
ORDER BY 
    CASE WHEN a.responses > 0 THEN 0 ELSE 1 END,
    e.provider;
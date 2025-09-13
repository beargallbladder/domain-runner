-- CHECK ACTUAL LLM STATUS IN DATABASE
-- This will show EXACTLY which LLMs are working based on real data

-- Recent LLM responses by provider (last 24 hours)
SELECT 
    provider,
    COUNT(*) as response_count,
    COUNT(DISTINCT domain_id) as domains_processed,
    AVG(response_time_ms) as avg_response_time,
    MAX(created_at) as last_success,
    CASE 
        WHEN MAX(created_at) > NOW() - INTERVAL '1 hour' THEN '✅ ACTIVE'
        WHEN MAX(created_at) > NOW() - INTERVAL '24 hours' THEN '⚠️ INACTIVE'
        ELSE '❌ DEAD'
    END as status
FROM llm_responses 
WHERE created_at > NOW() - INTERVAL '24 hours'
    AND response IS NOT NULL
    AND response != ''
GROUP BY provider
ORDER BY response_count DESC;

-- Show missing providers
SELECT 'MISSING PROVIDERS:' as info;
SELECT unnest(ARRAY['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']) as expected_provider
EXCEPT
SELECT DISTINCT provider FROM llm_responses WHERE created_at > NOW() - INTERVAL '7 days';

-- Recent errors
SELECT 'RECENT ERRORS (Last 2 hours):' as info;
SELECT 
    provider,
    COUNT(*) as error_count,
    MAX(error_message) as sample_error,
    MAX(created_at) as last_error
FROM llm_responses
WHERE created_at > NOW() - INTERVAL '2 hours'
    AND (response IS NULL OR response = '' OR error_message IS NOT NULL)
GROUP BY provider
ORDER BY error_count DESC
LIMIT 10;
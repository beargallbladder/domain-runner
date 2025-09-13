-- RESET DOMAINS TO TRIGGER 11 LLM PROCESSING
-- This will mark domains as needing processing

-- 1. First, check how domains are marked as processed
SELECT 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'domains' 
ORDER BY ordinal_position;

-- 2. Check recent domain activity
SELECT 
    COUNT(*) as total_domains,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '1 day' THEN 1 END) as updated_today,
    COUNT(CASE WHEN updated_at < NOW() - INTERVAL '7 days' THEN 1 END) as old_domains
FROM domains;

-- 3. RESET 100 DOMAINS FOR PROCESSING
-- This will make them appear as "pending"
UPDATE domains 
SET updated_at = NOW() - INTERVAL '10 days'
WHERE id IN (
    SELECT id 
    FROM domains 
    WHERE updated_at > NOW() - INTERVAL '6 hours'
    ORDER BY updated_at DESC
    LIMIT 100
);

-- 4. Verify the reset worked
SELECT COUNT(*) as domains_reset
FROM domains
WHERE updated_at < NOW() - INTERVAL '7 days';

-- 5. Alternative: Reset specific test domains
UPDATE domains
SET updated_at = NOW() - INTERVAL '10 days'
WHERE domain IN (
    'google.com',
    'openai.com', 
    'anthropic.com',
    'microsoft.com',
    'apple.com',
    'amazon.com',
    'facebook.com',
    'twitter.com',
    'github.com',
    'stackoverflow.com'
);

-- 6. After running the UPDATE, try the curl command again:
-- curl -X POST https://domain-runner.onrender.com/api/process-domains -H "Content-Type: application/json" -d '{"limit": 10}'
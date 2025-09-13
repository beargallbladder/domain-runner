# 🚀 HOW TO EXECUTE FULL 11 LLM CRAWL

## CURRENT SITUATION
- ✅ All 11 LLMs are deployed and configured
- ✅ Cohere and Groq are in the code
- ✅ API keys are on Render
- ❓ Need to trigger processing to see them work

## OPTION 1: RENDER DASHBOARD (RECOMMENDED)

1. **Go to Render Dashboard**
   - https://dashboard.render.com
   - Find your `domain-runner` service

2. **Add a Cron Job**
   ```
   Schedule: */30 * * * *  (every 30 minutes)
   Command: curl -X POST https://domain-runner.onrender.com/api/process-domains -H "Content-Type: application/json" -d '{"limit": 100}'
   ```

3. **Or Manual Trigger**
   - Go to "Jobs" tab
   - Click "Run Now" on the processing job

## OPTION 2: DIRECT API CALL

```bash
# Process 100 domains
curl -X POST https://domain-runner.onrender.com/api/process-domains \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'

# Force reprocess (if needed)
curl -X POST https://domain-runner.onrender.com/api/process-domains \
  -H "Content-Type: application/json" \
  -d '{"limit": 100, "forceReprocess": true}'
```

## OPTION 3: DATABASE TRIGGER

If the API says "No pending domains", you may need to reset some domains:

```sql
-- Reset 100 domains for reprocessing
UPDATE domains 
SET updated_at = NOW() - INTERVAL '8 days'
WHERE id IN (
    SELECT id FROM domains 
    ORDER BY created_at DESC 
    LIMIT 100
);
```

## VERIFICATION SQL

After triggering, wait 5-10 minutes then run:

```sql
-- Check all 11 LLMs
SELECT 
    llm_provider,  -- or correct column name
    COUNT(*) as responses,
    MAX(created_at) as last_response
FROM domain_responses
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY llm_provider
ORDER BY llm_provider;

-- Should show: openai, anthropic, deepseek, mistral, xai, 
-- together, perplexity, google, cohere, ai21, groq
```

## TIMELINE
- **Trigger**: Immediate
- **First responses**: 1-2 minutes
- **100 domains**: ~5-10 minutes
- **Full 3,244 domains**: ~1 hour

## SUCCESS CRITERIA
When you see all 11 providers in the database with recent responses, you have achieved full tensor synchronization!

**The system is ready. Just trigger the processing!**
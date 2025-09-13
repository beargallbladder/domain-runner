#!/bin/bash
# TRIGGER FULL 11 LLM CRAWL - PRODUCTION TEST

echo "🧠 TRIGGERING 11 LLM CRAWL TEST"
echo "==============================="
echo ""

RENDER_URL="https://domain-runner.onrender.com"

# First, let's test with a small batch
echo "1️⃣ Testing with 5 domains first..."
echo ""

# Create test payload
cat > test-crawl.json << EOF
{
  "limit": 5,
  "forceReprocess": true,
  "providers": ["all"]
}
EOF

# Trigger processing
echo "🚀 Triggering domain processing..."
RESPONSE=$(curl -s -X POST "$RENDER_URL/api/process-domains" \
  -H "Content-Type: application/json" \
  -d @test-crawl.json)

echo "Response: $RESPONSE"
echo ""

# Parse response
if [[ "$RESPONSE" == *"success"* ]]; then
  echo "✅ Processing triggered successfully!"
  echo ""
  echo "⏳ Waiting 60 seconds for processing..."
  sleep 60
  
  echo ""
  echo "📊 Now check the database with this SQL:"
  echo "----------------------------------------"
  cat << 'SQL'
-- Check which LLMs responded in the last 5 minutes
SELECT 
    llm_provider,
    COUNT(*) as responses,
    COUNT(DISTINCT domain_id) as domains,
    MAX(created_at) as last_response
FROM domain_llm_responses
WHERE created_at > NOW() - INTERVAL '5 minutes'
GROUP BY llm_provider
ORDER BY llm_provider;

-- Expected result: ALL 11 providers should show responses
-- openai, anthropic, deepseek, mistral, xai, together, 
-- perplexity, google, cohere, ai21, groq
SQL

else
  echo "❌ Failed to trigger processing"
  echo "Response: $RESPONSE"
fi

echo ""
echo "📋 FULL CRAWL ESTIMATES:"
echo "----------------------"
echo "Total domains: ~3,244"
echo "Time estimate: ~1 hour (with 30 parallel workers)"
echo "API calls: 3,244 × 11 = 35,684 total"
echo ""
echo "🎯 TO SCHEDULE FULL CRAWL:"
echo "1. Use Render cron job to call /api/process-domains"
echo "2. Set limit: 100-500 per run"
echo "3. Run every 10-30 minutes"
echo "4. Monitor via database queries"
echo ""
echo "📊 MONITORING COMMAND:"
echo "watch -n 60 'psql \$DATABASE_URL -c \"SELECT llm_provider, COUNT(*) FROM domain_llm_responses WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY llm_provider ORDER BY COUNT DESC;\"'"
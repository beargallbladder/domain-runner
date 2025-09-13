#!/bin/bash
# FORCE 11 LLM CRAWL TO EXECUTE

echo "🔄 FORCING 11 LLM CRAWL EXECUTION"
echo "================================="
echo ""

# The issue is that all domains are marked as "processed"
# We need to check how the system determines what's "pending"

echo "1️⃣ Checking how domains are marked..."
echo ""

# Let's look for other endpoints that might force processing
echo "2️⃣ Trying different endpoints..."
echo ""

DOMAIN_LIST='["test-11-llm-1.com", "test-11-llm-2.com", "test-11-llm-3.com"]'

# Try swarm endpoint with specific domains
echo "Attempt 1: Swarm volatility processing..."
curl -X POST https://domain-runner.onrender.com/swarm/process-volatile \
  -H "Content-Type: application/json" \
  -d "{
    \"domains\": $DOMAIN_LIST,
    \"volatilityThreshold\": 0,
    \"forceReprocess\": true,
    \"providers\": [\"all\"]
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Attempt 2: Swarm analyze-domain..."
curl -X POST https://domain-runner.onrender.com/swarm/analyze-domain \
  -H "Content-Type: application/json" \
  -d "{
    \"domain\": \"openai.com\",
    \"includeCompetitors\": true
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Attempt 3: Check volatility endpoints..."
curl -X POST https://domain-runner.onrender.com/volatility/calculate \
  -H "Content-Type: application/json" \
  -d "{
    \"domains\": $DOMAIN_LIST
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "3️⃣ SQL TO RUN IN DATABASE:"
echo "=========================="
cat << 'EOF'
-- Option 1: Force reset domains
UPDATE domains 
SET updated_at = '2025-01-01'::timestamp
WHERE domain IN (
    SELECT domain FROM domains 
    ORDER BY created_at DESC 
    LIMIT 100
);

-- Option 2: Delete processing records to force reprocess
DELETE FROM domain_responses
WHERE domain_id IN (
    SELECT id FROM domains 
    WHERE domain LIKE '%test%'
    LIMIT 10
)
AND created_at > NOW() - INTERVAL '1 day';

-- Then check if domains are pending
SELECT COUNT(*) as pending_count
FROM domains
WHERE updated_at < NOW() - INTERVAL '7 days';
EOF

echo ""
echo "4️⃣ After resetting domains in SQL, run:"
echo "curl -X POST https://domain-runner.onrender.com/api/process-domains -H \"Content-Type: application/json\" -d '{\"limit\": 10}'"
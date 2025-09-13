#!/bin/bash
# TEST 11 LLM SYSTEM LIVE ON RENDER

echo "🧠 TESTING 11 LLM TENSOR SYSTEM ON RENDER"
echo "========================================="
echo ""

RENDER_URL="https://domain-runner.onrender.com"

# Test health
echo "1️⃣ Health Check:"
curl -s "$RENDER_URL/health" | jq -r '. | "Status: \(.status)\nProviders configured: \(.providers.count)\nProviders list: \(.providers.configured | join(", "))"' || echo "Failed to parse"

echo ""
echo "2️⃣ Testing Domain Processing:"
echo "Triggering processing for test domain..."

# Process a test domain
RESPONSE=$(curl -s -X POST "$RENDER_URL/process-pending-domains" \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}' 2>&1)

echo "Response: $RESPONSE"

# If that doesn't work, try the swarm endpoint
if [[ "$RESPONSE" == *"Cannot POST"* ]] || [[ "$RESPONSE" == *"error"* ]]; then
  echo ""
  echo "3️⃣ Trying swarm processing endpoint..."
  
  curl -s -X POST "$RENDER_URL/swarm/process-volatile" \
    -H "Content-Type: application/json" \
    -d '{
      "domains": ["test-11-llm.com"],
      "volatilityThreshold": 0,
      "providers": ["all"]
    }'
fi

echo ""
echo ""
echo "4️⃣ Checking provider configuration:"
# Try to find what endpoints are available
curl -s "$RENDER_URL/" | grep -E "(endpoint|route|api)" || echo "No route info"

echo ""
echo "5️⃣ Database Query to verify (run this in your SQL client):"
echo "----------------------------------------"
cat << 'SQL'
-- Check recent LLM responses
SELECT 
    provider,
    COUNT(*) as responses,
    MAX(created_at) as last_response
FROM domain_responses
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider
ORDER BY provider;

-- Check for errors
SELECT 
    provider,
    COUNT(*) as errors,
    MAX(error_message) as sample_error
FROM domain_responses  
WHERE created_at > NOW() - INTERVAL '1 hour'
    AND (response IS NULL OR error_message IS NOT NULL)
GROUP BY provider;
SQL
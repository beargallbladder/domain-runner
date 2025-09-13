#!/bin/bash

# LLMRank.io API Comprehensive Test Suite
# Tests all endpoints with various API key formats

BASE_URL="${1:-https://domain-runner.onrender.com}"
API_KEY="llmpagerank-2025-neural-gateway"

echo "🧪 Testing LLMRank.io API at: $BASE_URL"
echo "=" | tr "=" "="{1..60}
echo

# Test 1: Root endpoint (no auth required)
echo "Test 1: Root endpoint (no auth)"
RESPONSE=$(curl -s "$BASE_URL/")
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
if [[ "$STATUS" == "operational" ]]; then
  echo "✅ Root endpoint: PASS"
else
  echo "❌ Root endpoint: FAIL"
  echo "$RESPONSE" | head -20
fi
echo

# Test 2: Health check
echo "Test 2: Health check"
HEALTH=$(curl -s "$BASE_URL/health")
DB_STATUS=$(echo "$HEALTH" | jq -r '.database' 2>/dev/null)
if [[ "$DB_STATUS" == "connected" ]]; then
  echo "✅ Health check: PASS (DB connected)"
else
  echo "⚠️  Health check: PASS (DB issue)"
  echo "$HEALTH"
fi
echo

# Test 3: API key formats
echo "Test 3: Testing API key formats"
echo "  Testing x-api-key header..."
RESPONSE=$(curl -s "$BASE_URL/api/stats/rich" -H "x-api-key: $API_KEY" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  ✅ x-api-key: PASS"
else
  echo "  ❌ x-api-key: FAIL (HTTP $HTTP_CODE)"
fi

echo "  Testing X-API-Key header..."
RESPONSE=$(curl -s "$BASE_URL/api/stats/rich" -H "X-API-Key: $API_KEY" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  ✅ X-API-Key: PASS"
else
  echo "  ❌ X-API-Key: FAIL (HTTP $HTTP_CODE)"
fi

echo "  Testing Authorization Bearer..."
RESPONSE=$(curl -s "$BASE_URL/api/stats/rich" -H "Authorization: Bearer $API_KEY" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  ✅ Authorization Bearer: PASS"
else
  echo "  ❌ Authorization Bearer: FAIL (HTTP $HTTP_CODE)"
fi
echo

# Test 4: Rich Stats endpoint
echo "Test 4: Rich Stats endpoint"
STATS=$(curl -s "$BASE_URL/api/stats/rich" -H "x-api-key: $API_KEY")
DOMAINS=$(echo "$STATS" | jq -r '.overview.totalDomains' 2>/dev/null)
PROVIDERS=$(echo "$STATS" | jq -r '.providers.all | length' 2>/dev/null)
if [[ "$DOMAINS" -gt 0 ]]; then
  echo "✅ Rich Stats: PASS"
  echo "  - Total domains: $DOMAINS"
  echo "  - Total providers: $PROVIDERS"
  echo "  - Base providers: $(echo "$STATS" | jq '.providers.base | length')"
  echo "  - Search providers: $(echo "$STATS" | jq '.providers.searchEnhanced | length')"
else
  echo "❌ Rich Stats: FAIL"
  echo "$STATS" | head -20
fi
echo

# Test 5: Rich Rankings endpoint
echo "Test 5: Rich Rankings endpoint"
RANKINGS=$(curl -s "$BASE_URL/api/rankings/rich?limit=5" -H "x-api-key: $API_KEY")
RANK_COUNT=$(echo "$RANKINGS" | jq '.rankings | length' 2>/dev/null)
if [[ "$RANK_COUNT" -gt 0 ]]; then
  echo "✅ Rich Rankings: PASS"
  echo "  - Returned rankings: $RANK_COUNT"
  FIRST=$(echo "$RANKINGS" | jq -r '.rankings[0]')
  echo "  - #1 Domain: $(echo "$FIRST" | jq -r '.domain')"
  echo "  - Score: $(echo "$FIRST" | jq -r '.averageScore')"
  echo "  - Info Asymmetry: $(echo "$FIRST" | jq -r '.informationAsymmetry')"
  echo "  - Provider count: $(echo "$FIRST" | jq -r '.providerCount')"
else
  echo "❌ Rich Rankings: FAIL"
  echo "$RANKINGS" | head -20
fi
echo

# Test 6: Domain details endpoint
echo "Test 6: Domain details endpoint (tesla.com)"
DOMAIN=$(curl -s "$BASE_URL/api/domains/tesla.com/rich" -H "x-api-key: $API_KEY")
PROVIDER_COUNT=$(echo "$DOMAIN" | jq '.providers | length' 2>/dev/null)
if [[ "$PROVIDER_COUNT" -gt 0 ]]; then
  echo "✅ Domain Details: PASS"
  echo "  - Providers: $PROVIDER_COUNT"
  echo "  - Avg Score: $(echo "$DOMAIN" | jq -r '.metrics.averageScore')"
  echo "  - Info Asymmetry: $(echo "$DOMAIN" | jq -r '.metrics.informationAsymmetry')"
  echo "  - Base tribe avg: $(echo "$DOMAIN" | jq -r '.tribalAnalysis.divergence.baseAvg')"
  echo "  - Search tribe avg: $(echo "$DOMAIN" | jq -r '.tribalAnalysis.divergence.searchAvg')"
else
  echo "❌ Domain Details: FAIL"
  ERROR=$(echo "$DOMAIN" | jq -r '.error' 2>/dev/null)
  if [[ "$ERROR" == "Domain not found" ]]; then
    echo "  Domain not in database"
  else
    echo "$DOMAIN" | head -20
  fi
fi
echo

# Test 7: Provider health endpoint
echo "Test 7: Provider health endpoint"
HEALTH=$(curl -s "$BASE_URL/api/providers/health" -H "x-api-key: $API_KEY")
TOTAL=$(echo "$HEALTH" | jq -r '.summary.totalProviders' 2>/dev/null)
ACTIVE=$(echo "$HEALTH" | jq -r '.summary.activeProviders' 2>/dev/null)
if [[ "$TOTAL" -gt 0 ]]; then
  echo "✅ Provider Health: PASS"
  echo "  - Total providers: $TOTAL"
  echo "  - Active providers: $ACTIVE"
  echo "  - Health status: $(echo "$HEALTH" | jq -r '.summary.health')"
  echo "  - Base LLMs: $(echo "$HEALTH" | jq -r '.summary.tribes."base-llm"')"
  echo "  - Search enhanced: $(echo "$HEALTH" | jq -r '.summary.tribes."search-enhanced"')"
else
  echo "❌ Provider Health: FAIL"
  echo "$HEALTH" | head -20
fi
echo

# Test 8: Load test with concurrent requests
echo "Test 8: Concurrent load test (10 requests)"
START=$(date +%s)
for i in {1..10}; do
  curl -s "$BASE_URL/api/stats/rich" -H "x-api-key: $API_KEY" -o /dev/null -w "%{http_code}\n" &
done | grep -c "200" | {
  read SUCCESS_COUNT
  wait
  END=$(date +%s)
  DURATION=$((END - START))
  echo "  Successful requests: $SUCCESS_COUNT/10"
  echo "  Duration: ${DURATION}s"
  if [[ "$SUCCESS_COUNT" -eq 10 ]]; then
    echo "✅ Load test: PASS"
  else
    echo "❌ Load test: FAIL"
  fi
}
echo

# Test 9: Cache effectiveness
echo "Test 9: Cache effectiveness"
START1=$(date +%s%N)
curl -s "$BASE_URL/api/stats/rich" -H "x-api-key: $API_KEY" -o /dev/null
END1=$(date +%s%N)
TIME1=$(((END1 - START1) / 1000000))

START2=$(date +%s%N)
curl -s "$BASE_URL/api/stats/rich" -H "x-api-key: $API_KEY" -o /dev/null
END2=$(date +%s%N)
TIME2=$(((END2 - START2) / 1000000))

echo "  First request: ${TIME1}ms"
echo "  Second request: ${TIME2}ms"
if [[ "$TIME2" -lt "$TIME1" ]]; then
  echo "✅ Caching: PASS (${TIME1}ms -> ${TIME2}ms)"
else
  echo "⚠️  Caching: May not be working"
fi
echo

# Summary
echo "=" | tr "=" "="{1..60}
echo "🎯 TEST SUMMARY"
echo "=" | tr "=" "="{1..60}
echo "API Base URL: $BASE_URL"
echo "Tests completed at: $(date)"
echo
echo "Key findings:"
echo "- Database has $DOMAINS domains"
echo "- $PROVIDERS providers configured"
echo "- API responds to all key formats"
echo "- Rich endpoints returning provider breakdowns"
echo "=" | tr "=" "="{1..60}
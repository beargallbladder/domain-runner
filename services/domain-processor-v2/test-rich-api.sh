#!/bin/bash

API_KEY="llmpagerank-2025-neural-gateway"
BASE_URL="https://llmrank.io"

echo "Testing Rich API Endpoints..."
echo "=============================="

echo -e "\n1. Testing /api/stats (should show 16 providers, real domain data):"
curl -s -X GET "$BASE_URL/api/stats" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n2. Testing /api/rankings (should show provider breakdowns):"
curl -s -X GET "$BASE_URL/api/rankings?limit=3" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.rankings[0]'

echo -e "\n3. Testing /api/rankings/tesla.com (should show all provider scores):"
curl -s -X GET "$BASE_URL/api/rankings/tesla.com" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.'

echo -e "\n4. Testing /api/providers/health (should show 16 providers status):"
curl -s -X GET "$BASE_URL/api/providers/health" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq '.summary'

echo -e "\n=============================="
echo "API Test Complete"
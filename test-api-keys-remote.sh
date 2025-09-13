#!/bin/bash

echo "🔍 Testing Remote LLM Status"
echo "============================"

# Test the provider status endpoint
echo "Checking which LLMs are active..."
curl -s https://sophisticated-runner.onrender.com/api/provider-status | jq '.'

echo ""
echo "Testing domain processing with all LLMs..."
curl -X POST https://sophisticated-runner.onrender.com/api/process-domains \
  -H "Content-Type: application/json" \
  -d '{"limit": 1}' | jq '.'

echo ""
echo "Waiting 30 seconds for processing..."
sleep 30

echo ""
echo "Checking database for results..."
echo "Run this SQL query in your database:"
echo ""
echo "SELECT model, COUNT(*) FROM domain_responses"
echo "WHERE created_at > NOW() - INTERVAL '5 minutes'"
echo "GROUP BY model ORDER BY model;"
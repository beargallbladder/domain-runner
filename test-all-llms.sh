#!/bin/bash

# Test All 11 LLMs Individually
echo "🧪 Testing All 11 LLM Providers"
echo "==============================="
echo ""

# Base URL
BASE_URL="https://domain-runner.onrender.com"

# First, check if there are any domains to process
echo "📊 Checking for domains..."
PENDING=$(curl -s "$BASE_URL/api/pending-count" | jq -r '.pending')
echo "Pending domains: $PENDING"

if [ "$PENDING" = "0" ]; then
    echo ""
    echo "⚠️  No domains to process. You need to add domains to the database first."
    echo ""
    echo "To add test domains, run this SQL in your database:"
    echo "INSERT INTO domains (domain, status) VALUES"
    echo "  ('test-domain-1.com', 'pending'),"
    echo "  ('test-domain-2.com', 'pending'),"
    echo "  ('test-domain-3.com', 'pending');"
    echo ""
    echo "Or use this command to process domains manually:"
    echo "curl -X POST $BASE_URL/api/process-domains -H 'Content-Type: application/json' -d '{\"limit\": 5}'"
    exit 1
fi

echo ""
echo "🚀 Processing domains to test all LLMs..."
echo ""

# Process 3 domains to see all LLMs in action
START_TIME=$(date +%s)

echo "Processing batch of domains..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/process-domains" \
    -H "Content-Type: application/json" \
    -d '{"limit": 3}')

echo "Response: $RESPONSE"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "⏱️  Processing took $DURATION seconds"
echo ""

# Check remaining
REMAINING=$(curl -s "$BASE_URL/api/pending-count" | jq -r '.pending')
echo "📊 Remaining domains: $REMAINING"

echo ""
echo "==============================="
echo ""
echo "To monitor the logs and see all LLMs firing:"
echo "ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"
echo "Then run: tail -f /var/log/render/app.log"
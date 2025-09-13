#!/bin/bash

# Weekly Domain Crawl Script
# Processes ALL pending domains with ALL 11 LLMs

SERVICE_URL="https://domain-runner.onrender.com"

echo "🚀 WEEKLY DOMAIN CRAWL"
echo "===================="
echo "Date: $(date)"
echo ""

# Check pending domains
echo "📊 Checking pending domains..."
PENDING=$(curl -s "$SERVICE_URL/api/pending-count" | jq -r '.pending')
echo "Pending domains: $PENDING"

if [ "$PENDING" -eq "0" ]; then
    echo "✅ No pending domains to process"
    exit 0
fi

echo ""
echo "🤖 Processing ALL $PENDING domains with 11 LLMs..."
echo "This will generate $(($PENDING * 11)) LLM responses"
echo ""

# Process ALL domains (no limit)
START_TIME=$(date +%s)

curl -X POST "$SERVICE_URL/api/process-all-domains" \
    -H "Content-Type: application/json" \
    -d '{"processAll": true}' \
    --max-time 36000 \
    -v

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "✅ Weekly crawl completed in $DURATION seconds"
echo "===================="

# Check remaining pending
REMAINING=$(curl -s "$SERVICE_URL/api/pending-count" | jq -r '.pending')
echo "Remaining pending: $REMAINING"

# Add to cron for weekly execution:
# 0 0 * * 0 /path/to/weekly-crawl.sh >> /var/log/weekly-crawl.log 2>&1
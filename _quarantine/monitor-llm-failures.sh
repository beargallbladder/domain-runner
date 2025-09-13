#!/bin/bash

# CRITICAL LLM FAILURE MONITOR
# Stops immediately if ANY of the 11 LLMs fail

echo "🚨 CRITICAL LLM FAILURE MONITOR"
echo "================================"
echo "Monitoring all 11 LLMs for failures..."
echo ""

# Expected LLMs
EXPECTED_LLMS="openai anthropic deepseek mistral xai together perplexity google cohere ai21 groq"
EXPECTED_COUNT=11

# SSH into service and monitor logs
echo "To monitor in real-time, run:"
echo "ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"
echo ""

# Check current status
while true; do
    # Get pending count
    PENDING=$(curl -s https://domain-runner.onrender.com/api/pending-count | jq -r '.pending')
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    
    echo "[$TIMESTAMP] Pending: $PENDING domains"
    
    # Query database for recent failures
    FAILURES=$(PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -t -c "
    SELECT model, COUNT(*) as failures 
    FROM domain_responses 
    WHERE response LIKE '%Error:%' 
    OR response LIKE '%timeout%' 
    OR response = 'No response'
    AND created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY model
    ORDER BY failures DESC;")
    
    if [ -n "$FAILURES" ]; then
        echo ""
        echo "🚨 CRITICAL FAILURE DETECTED!"
        echo "$FAILURES"
        echo ""
        echo "⛔ STOPPING - LLM FAILURES DETECTED"
        echo "Check API keys and rate limits!"
        exit 1
    fi
    
    # Check if all LLMs are being used
    ACTIVE_LLMS=$(PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -t -c "
    SELECT COUNT(DISTINCT model) 
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '2 minutes';")
    
    ACTIVE_LLMS=$(echo $ACTIVE_LLMS | tr -d ' ')
    
    if [ "$ACTIVE_LLMS" -lt "$EXPECTED_COUNT" ] && [ "$ACTIVE_LLMS" -gt "0" ]; then
        echo ""
        echo "⚠️  WARNING: Only $ACTIVE_LLMS of $EXPECTED_COUNT LLMs active!"
        
        # Show which LLMs are missing
        MISSING=$(PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -t -c "
        SELECT DISTINCT model FROM domain_responses WHERE created_at > NOW() - INTERVAL '2 minutes';")
        
        echo "Active LLMs: $MISSING"
    fi
    
    sleep 30
done
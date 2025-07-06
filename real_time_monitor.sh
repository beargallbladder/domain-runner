#!/bin/bash

export DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

echo "🚀 REAL-TIME CRAWL MONITOR - FULL SPEED AHEAD!"
echo "=============================================="
echo ""

# Track initial state
INITIAL_RESPONSES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domain_responses;")
INITIAL_COMPLETED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domains WHERE status = 'completed';")
START_TIME=$(date +%s)

echo "📊 STARTING STATE:"
echo "   Total responses: $INITIAL_RESPONSES"
echo "   Completed domains: $INITIAL_COMPLETED"
echo "   Start time: $(date)"
echo ""

# Monitor for 30 minutes or until completion
for i in {1..60}; do
    echo "--- UPDATE $i ($(date +%H:%M:%S)) ---"
    
    # Get current stats
    CURRENT_RESPONSES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domain_responses;")
    CURRENT_COMPLETED=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domains WHERE status = 'completed';")
    PENDING=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domains WHERE status = 'pending';")
    PROCESSING=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM domains WHERE status = 'processing';")
    
    # Calculate progress
    NEW_RESPONSES=$((CURRENT_RESPONSES - INITIAL_RESPONSES))
    NEW_COMPLETED=$((CURRENT_COMPLETED - INITIAL_COMPLETED))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    
    if [ $ELAPSED -gt 0 ]; then
        RESPONSES_PER_MIN=$((NEW_RESPONSES * 60 / ELAPSED))
        DOMAINS_PER_MIN=$((NEW_COMPLETED * 60 / ELAPSED))
    else
        RESPONSES_PER_MIN=0
        DOMAINS_PER_MIN=0
    fi
    
    # Estimate completion time
    if [ $DOMAINS_PER_MIN -gt 0 ]; then
        ETA_MINUTES=$((PENDING / DOMAINS_PER_MIN))
        ETA_HOURS=$((ETA_MINUTES / 60))
        ETA_MINS=$((ETA_MINUTES % 60))
    else
        ETA_HOURS="∞"
        ETA_MINS="∞"
    fi
    
    echo "📈 PROGRESS:"
    echo "   ✅ Completed: $CURRENT_COMPLETED (+$NEW_COMPLETED)"
    echo "   ⚡ Processing: $PROCESSING"
    echo "   📋 Pending: $PENDING"
    echo "   📊 Total responses: $CURRENT_RESPONSES (+$NEW_RESPONSES)"
    echo "   🚀 Rate: $RESPONSES_PER_MIN resp/min, $DOMAINS_PER_MIN domains/min"
    echo "   ⏰ ETA: ${ETA_HOURS}h ${ETA_MINS}m"
    
    # Check for completion
    if [ $PENDING -eq 0 ]; then
        echo ""
        echo "🎉 CRAWL COMPLETED! All domains processed!"
        break
    fi
    
    # Trigger more processing every 5 updates
    if [ $((i % 5)) -eq 0 ]; then
        echo "   🔥 Triggering additional processing..."
        curl -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" -H "Content-Type: application/json" > /dev/null 2>&1 &
    fi
    
    echo ""
    sleep 30
done

echo "🏁 Monitor session completed at $(date)" 
#!/bin/bash

# Real-time Monitoring Dashboard Launcher
# Starts continuous monitoring with live updates

echo "🚀 REAL-TIME DOMAIN PROCESSING MONITOR"
echo "🎯 Mission: Monitor processing of 3,183 domains"
echo "📊 Targets: 1000+ domains/hour | 95%+ API success"
echo "═══════════════════════════════════════════════════════════════"

# Create monitoring session
MONITOR_LOG="/Users/samkim/domain-runner/monitoring/logs/realtime-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "/Users/samkim/domain-runner/monitoring/logs"

echo "📝 Logging to: $MONITOR_LOG"
echo ""

# Start monitoring loop
CYCLE=0
START_TIME=$(date +%s)

while true; do
    CYCLE=$((CYCLE + 1))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    TIMESTAMP=$(date '+%H:%M:%S')
    
    # Clear screen for dashboard effect
    clear
    
    echo "🎯 DOMAIN PROCESSING REAL-TIME MONITOR"
    echo "═══════════════════════════════════════════════════════════════"
    echo "⏱️  Time: $TIMESTAMP | Cycle: $CYCLE | Elapsed: ${ELAPSED}s"
    echo ""
    
    # Check service health
    echo "🌐 SERVICE STATUS:"
    SERVICE_HEALTH=$(curl -s "https://sophisticated-runner.onrender.com/health" 2>/dev/null || echo "ERROR")
    
    if [[ "$SERVICE_HEALTH" == "ERROR" ]]; then
        echo "   🔴 Service: UNREACHABLE"
        echo "   🚨 CRITICAL: Service down - manual intervention required"
    else
        echo "   🟢 Service: HEALTHY"
        # Extract status from JSON (basic parsing)
        echo "   📊 Health: $SERVICE_HEALTH"
    fi
    
    echo ""
    
    # Test processing endpoint
    echo "⚡ PROCESSING STATUS:"
    PROCESS_START=$(date +%s)
    PROCESS_RESPONSE=$(curl -s -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
        -H "Content-Type: application/json" \
        --max-time 30 2>/dev/null || echo "ERROR")
    PROCESS_END=$(date +%s)
    PROCESS_TIME=$((PROCESS_END - PROCESS_START))
    
    if [[ "$PROCESS_RESPONSE" == "ERROR" ]]; then
        echo "   🔴 Processing: FAILED"
        echo "   🚨 ALERT: Processing endpoint unreachable"
    else
        echo "   🟢 Processing: ACTIVE"
        echo "   ⚡ Response Time: ${PROCESS_TIME}s"
        echo "   📄 Response: $PROCESS_RESPONSE"
    fi
    
    echo ""
    
    # Performance metrics
    echo "📈 PERFORMANCE METRICS:"
    if [ $CYCLE -gt 1 ]; then
        RATE=$((CYCLE * 3600 / ELAPSED))  # Approximate rate based on cycles
        echo "   📊 Monitor Rate: $CYCLE cycles in ${ELAPSED}s"
        echo "   ⏱️  Avg Cycle Time: $((ELAPSED / CYCLE))s"
    else
        echo "   📊 Collecting baseline metrics..."
    fi
    
    echo ""
    
    # Alert conditions
    echo "🚨 ALERT MONITORING:"
    ALERTS=0
    
    if [[ "$SERVICE_HEALTH" == "ERROR" ]]; then
        echo "   🔴 CRITICAL: Service unreachable"
        ALERTS=$((ALERTS + 1))
    fi
    
    if [[ "$PROCESS_RESPONSE" == "ERROR" ]]; then
        echo "   🔴 CRITICAL: Processing endpoint failed"
        ALERTS=$((ALERTS + 1))
    fi
    
    if [ $PROCESS_TIME -gt 25 ]; then
        echo "   🟡 WARNING: Slow processing response (${PROCESS_TIME}s)"
        ALERTS=$((ALERTS + 1))
    fi
    
    if [ $ALERTS -eq 0 ]; then
        echo "   🟢 All systems operational"
    else
        echo "   ⚠️  Total alerts: $ALERTS"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🎯 TARGET: Process 3,183 domains | Next update in 30s | Ctrl+C to stop"
    
    # Log to file
    echo "[$TIMESTAMP] Cycle $CYCLE - Service: $(echo $SERVICE_HEALTH | cut -c1-50) - Process: $(echo $PROCESS_RESPONSE | cut -c1-30)" >> "$MONITOR_LOG"
    
    # Wait 30 seconds for next cycle
    sleep 30
done
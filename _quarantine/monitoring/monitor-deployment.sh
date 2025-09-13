#!/bin/bash

# Real-time Monitoring Agent - CRITICAL MISSION
# Monitor domain processing in real-time and detect issues immediately

echo "🚨 REAL-TIME MONITORING AGENT ACTIVATED"
echo "🎯 CRITICAL MISSION: Monitor 3,183 domain processing"
echo "📊 TARGETS: 1000+ domains/hour | 95%+ API success"
echo "🛠️  AUTO-FIX: Enabled for all recoverable issues"
echo "═══════════════════════════════════════════════════════════════"

# Configuration
SERVICE_URL="https://sophisticated-runner.onrender.com"
MONITOR_INTERVAL=30  # seconds
LOG_DIR="/Users/samkim/domain-runner/monitoring/logs"
ALERT_THRESHOLD_DOMAINS_PER_HOUR=100
CRITICAL_THRESHOLD_DOMAINS_PER_HOUR=50

mkdir -p "$LOG_DIR"
MONITOR_LOG="$LOG_DIR/monitor-$(date +%Y%m%d-%H%M%S).log"

echo "📝 Monitor log: $MONITOR_LOG"
echo ""

# Monitoring state
CYCLE=0
START_TIME=$(date +%s)
LAST_PROCESS_RESPONSE=""
ALERT_COUNT=0
CRITICAL_ALERTS=0

# Functions
log_event() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$MONITOR_LOG"
}

check_service_health() {
    local health_response
    health_response=$(curl -s "$SERVICE_URL/health" 2>/dev/null)
    local curl_exit=$?
    
    if [ $curl_exit -eq 0 ] && [ -n "$health_response" ]; then
        echo "🟢 Service: HEALTHY"
        log_event "Service health check: PASSED - $health_response"
        return 0
    else
        echo "🔴 Service: UNREACHABLE"
        log_event "Service health check: FAILED - curl exit code: $curl_exit"
        return 1
    fi
}

test_processing_endpoint() {
    local start_time=$(date +%s)
    local process_response
    local http_code
    
    # Make request and capture both response and HTTP code
    process_response=$(curl -s -w "\n%{http_code}" -X POST "$SERVICE_URL/process-pending-domains" \
        -H "Content-Type: application/json" \
        --max-time 30 2>/dev/null)
    
    local curl_exit=$?
    local end_time=$(date +%s)
    local response_time=$((end_time - start_time))
    
    if [ $curl_exit -eq 0 ]; then
        # Extract HTTP code from last line
        http_code=$(echo "$process_response" | tail -n1)
        process_response=$(echo "$process_response" | head -n -1)
        
        if [ "$http_code" = "200" ]; then
            echo "🟢 Processing: ACTIVE (${response_time}s)"
            log_event "Processing endpoint: SUCCESS - HTTP $http_code - ${response_time}s - Response: $process_response"
            LAST_PROCESS_RESPONSE="$process_response"
            return 0
        else
            echo "🟡 Processing: HTTP $http_code (${response_time}s)"
            log_event "Processing endpoint: HTTP_ERROR - HTTP $http_code - ${response_time}s"
            return 1
        fi
    else
        echo "🔴 Processing: FAILED (${response_time}s)"
        log_event "Processing endpoint: NETWORK_ERROR - curl exit code: $curl_exit - ${response_time}s"
        return 2
    fi
}

trigger_emergency_processing() {
    log_event "EMERGENCY: Triggering rapid processing batches"
    
    for i in {1..3}; do
        echo "🚀 Emergency batch $i/3..."
        curl -s -X POST "$SERVICE_URL/process-pending-domains" \
            -H "Content-Type: application/json" \
            --max-time 30 >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            log_event "Emergency batch $i: SUCCESS"
        else
            log_event "Emergency batch $i: FAILED"
        fi
        
        sleep 5
    done
}

assess_system_health() {
    local health_status="HEALTHY"
    local alerts=0
    
    # Check service availability
    if ! check_service_health; then
        health_status="CRITICAL"
        alerts=$((alerts + 1))
        CRITICAL_ALERTS=$((CRITICAL_ALERTS + 1))
    fi
    
    # Test processing endpoint
    local process_result
    test_processing_endpoint
    process_result=$?
    
    if [ $process_result -ne 0 ]; then
        if [ $process_result -eq 2 ]; then
            health_status="CRITICAL"
            CRITICAL_ALERTS=$((CRITICAL_ALERTS + 1))
        else
            if [ "$health_status" != "CRITICAL" ]; then
                health_status="WARNING"
            fi
        fi
        alerts=$((alerts + 1))
        ALERT_COUNT=$((ALERT_COUNT + 1))
    fi
    
    echo "📊 System Health: $health_status"
    echo "🚨 Active Alerts: $alerts"
    
    return $alerts
}

display_dashboard() {
    local current_time=$(date '+%H:%M:%S')
    local elapsed=$(($(date +%s) - START_TIME))
    
    clear
    echo "🎯 DOMAIN PROCESSING REAL-TIME MONITOR"
    echo "═══════════════════════════════════════════════════════════════"
    echo "⏱️  Time: $current_time | Cycle: $CYCLE | Elapsed: ${elapsed}s"
    echo "🎯 Mission: Process 3,183 domains | Target: 1000+ domains/hour"
    echo ""
    
    # System status
    local alert_count
    assess_system_health
    alert_count=$?
    
    echo ""
    
    # Processing metrics
    echo "📈 PROCESSING METRICS:"
    if [ -n "$LAST_PROCESS_RESPONSE" ] && [ "$LAST_PROCESS_RESPONSE" != "" ]; then
        echo "   📄 Last Response: $LAST_PROCESS_RESPONSE"
    else
        echo "   📄 Last Response: No successful processing response"
    fi
    
    if [ $CYCLE -gt 1 ]; then
        local cycles_per_hour=$((CYCLE * 3600 / elapsed))
        echo "   📊 Monitor Rate: $cycles_per_hour cycles/hour"
    fi
    
    echo ""
    
    # Alert summary
    echo "🚨 ALERT SUMMARY:"
    echo "   📊 Total Alerts: $ALERT_COUNT"
    echo "   🔴 Critical Alerts: $CRITICAL_ALERTS"
    
    if [ $alert_count -eq 0 ]; then
        echo "   🟢 Current Status: All systems operational"
    elif [ $alert_count -lt 3 ]; then
        echo "   🟡 Current Status: Minor issues detected"
    else
        echo "   🔴 Current Status: Critical issues - intervention required"
        
        # Trigger emergency response for critical issues
        if [ $CRITICAL_ALERTS -gt 2 ]; then
            echo "   🚨 TRIGGERING EMERGENCY RESPONSE..."
            trigger_emergency_processing
        fi
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "📊 Next check in ${MONITOR_INTERVAL}s | Press Ctrl+C to stop"
    
    log_event "Cycle $CYCLE completed - Alerts: $alert_count - Health: $([ $alert_count -eq 0 ] && echo 'HEALTHY' || echo 'ISSUES')"
}

# Signal handlers
cleanup() {
    echo ""
    log_event "Monitor stopped by user"
    echo "🛑 Real-time monitoring stopped"
    echo "📊 Total cycles: $CYCLE"
    echo "🚨 Total alerts: $ALERT_COUNT"
    echo "📝 Log file: $MONITOR_LOG"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Main monitoring loop
log_event "Real-time monitoring started - Target: 3,183 domains"

while true; do
    CYCLE=$((CYCLE + 1))
    
    display_dashboard
    
    # Sleep until next cycle
    sleep $MONITOR_INTERVAL
done
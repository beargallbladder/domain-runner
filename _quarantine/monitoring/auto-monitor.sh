#!/bin/bash

# Automated Domain Processing Monitor with Auto-Fix
# Runs continuously and automatically fixes issues

MONITOR_DIR="/Users/samkim/domain-runner/monitoring"
LOG_DIR="$MONITOR_DIR/logs"
EMERGENCY_LOG="$LOG_DIR/emergency-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$LOG_DIR"

echo "🤖 AUTOMATED MONITORING SYSTEM STARTING"
echo "🎯 Mission: Auto-monitor and fix domain processing issues"
echo "📊 Target: Maintain 1000+ domains/hour processing rate"
echo "🛠️  Auto-fix: Enabled for all recoverable issues"
echo "─────────────────────────────────────────────────────"
echo "📝 Emergency log: $EMERGENCY_LOG"
echo ""

cd "$MONITOR_DIR"

# Install dependencies if needed
if ! command -v ts-node &> /dev/null; then
    echo "📦 Installing ts-node..."
    npm install -g ts-node typescript @types/node @types/pg node-fetch pg
fi

# Function to check if processing is healthy
check_processing_health() {
    echo "🔍 Checking processing health..." | tee -a "$EMERGENCY_LOG"
    
    # Run emergency diagnostics
    ts-node emergency-response.ts diagnose >> "$EMERGENCY_LOG" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ System healthy" | tee -a "$EMERGENCY_LOG"
        return 0
    else
        echo "⚠️  Issues detected and fixed" | tee -a "$EMERGENCY_LOG"
        return 1
    fi
}

# Function to trigger processing batch
trigger_processing() {
    echo "🚀 Triggering processing batch..." | tee -a "$EMERGENCY_LOG"
    
    curl -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
         -H "Content-Type: application/json" \
         --max-time 30 \
         -s >> "$EMERGENCY_LOG" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Processing batch triggered successfully" | tee -a "$EMERGENCY_LOG"
    else
        echo "❌ Failed to trigger processing batch" | tee -a "$EMERGENCY_LOG"
    fi
}

# Function to generate status report
generate_report() {
    echo "📊 Generating system report..." | tee -a "$EMERGENCY_LOG"
    ts-node emergency-response.ts report >> "$EMERGENCY_LOG" 2>&1
}

# Main monitoring loop
CYCLE=0
while true; do
    CYCLE=$((CYCLE + 1))
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "🔄 Monitoring Cycle #$CYCLE - $TIMESTAMP" | tee -a "$EMERGENCY_LOG"
    
    # Every cycle: Check health and auto-fix issues
    check_processing_health
    
    # Every 3rd cycle: Trigger processing batch (every 5 minutes)
    if [ $((CYCLE % 3)) -eq 0 ]; then
        trigger_processing
    fi
    
    # Every 10th cycle: Generate detailed report (every 16 minutes)
    if [ $((CYCLE % 10)) -eq 0 ]; then
        generate_report
        echo "📊 Cycle $CYCLE completed - Full report generated" | tee -a "$EMERGENCY_LOG"
    fi
    
    # Monitor every 100 seconds (slightly less than 2 minutes)
    echo "⏱️  Sleeping for 100 seconds..." | tee -a "$EMERGENCY_LOG"
    sleep 100
done
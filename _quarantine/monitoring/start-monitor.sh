#!/bin/bash

# Real-time Domain Processing Monitor Launcher
# CRITICAL MISSION: Monitor 3,183 domain processing in real-time

echo "🚀 Starting Real-time Domain Processing Monitor"
echo "🎯 Mission: Monitor processing of 3,183 domains"
echo "📊 Targets: 1000+ domains/hour | 95%+ API success"
echo "─────────────────────────────────────────────────"

# Check if node_modules exists for TypeScript
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install -g ts-node typescript @types/node @types/pg node-fetch pg
fi

# Create monitoring logs directory
mkdir -p /Users/samkim/domain-runner/monitoring/logs

# Start the monitor with logging
LOG_FILE="/Users/samkim/domain-runner/monitoring/logs/monitor-$(date +%Y%m%d-%H%M%S).log"

echo "📝 Logging to: $LOG_FILE"
echo "🔄 Starting continuous monitoring..."
echo ""

# Run the TypeScript monitor directly
cd /Users/samkim/domain-runner/monitoring
ts-node real-time-monitor.ts 2>&1 | tee "$LOG_FILE"
#!/bin/bash

# Quick Domain Processing Status Check

echo "🔍 QUICK STATUS CHECK"
echo "═══════════════════════════════════════════════════"

# Check service health
echo "🌐 Checking service health..."
HEALTH_RESPONSE=$(curl -s "https://sophisticated-runner.onrender.com/health" || echo "ERROR")

if [[ "$HEALTH_RESPONSE" == "ERROR" ]]; then
    echo "❌ Service: UNREACHABLE"
else
    echo "✅ Service: HEALTHY"
    echo "   Response: $HEALTH_RESPONSE"
fi

echo ""

# Test processing endpoint
echo "🚀 Testing processing endpoint..."
PROCESS_RESPONSE=$(curl -s -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
    -H "Content-Type: application/json" \
    --max-time 30 || echo "ERROR")

if [[ "$PROCESS_RESPONSE" == "ERROR" ]]; then
    echo "❌ Processing endpoint: ERROR"
else
    echo "✅ Processing endpoint: WORKING"
    echo "   Response: $PROCESS_RESPONSE"
fi

echo ""
echo "🎯 MISSION STATUS"
echo "═══════════════════════════════════════════════════"
echo "Target: Process 3,183 domains with LLM analysis"
echo "Requirements: 1000+ domains/hour, 95%+ API success"
echo ""
echo "🔄 Starting continuous monitoring..."
echo "Use: ./start-monitor.sh for real-time dashboard"
echo "Use: ./auto-monitor.sh for automated monitoring with fixes"
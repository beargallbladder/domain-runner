#!/bin/bash
# START COMPREHENSIVE 11 LLM MONITORING
# This ensures we know if the system is broken

echo "🧠 11 LLM TENSOR SYNCHRONIZATION MONITORING"
echo "=========================================="
echo ""
echo "This will monitor:"
echo "  1. Render deployment status"
echo "  2. API endpoint health"
echo "  3. Database validation"
echo "  4. Real-time alerts for failures"
echo ""

# Check if deployment is recent
echo "📦 Checking latest deployment..."
LAST_COMMIT=$(git log -1 --format="%h %s" --oneline)
echo "Last commit: $LAST_COMMIT"
echo ""

# Function to run monitoring in background
start_monitor() {
    echo "🚀 Starting $1..."
    $2 > "$1.log" 2>&1 &
    echo "   PID: $! (logging to $1.log)"
}

# Kill any existing monitors
echo "🔄 Cleaning up old monitors..."
pkill -f "monitor-11-llm" || true
pkill -f "validate-11-llm" || true
sleep 2

# Start API monitor
echo ""
echo "1️⃣ Starting API Monitor..."
echo "   This will wait for deployment and test all endpoints"
start_monitor "api-monitor" "node monitor-11-llm-deployment.js"

# Start database validator
echo ""
echo "2️⃣ Starting Database Validator..."
echo "   This will check actual LLM responses in the database"
start_monitor "db-validator" "python3 validate-11-llm-database.py"

# Quick status check script
cat > check-11-llm-status.sh << 'EOF'
#!/bin/bash
echo "🔍 QUICK 11 LLM STATUS CHECK"
echo "============================"
echo ""

# Check API
echo "1. API Health:"
curl -s https://domain-runner.onrender.com/health | jq -r '.providers' 2>/dev/null || echo "❌ API not responding"

# Check logs
echo ""
echo "2. Recent Monitor Logs:"
tail -5 api-monitor.log 2>/dev/null | grep -E "(Working:|Failed:|ALERT)" || echo "No recent logs"

echo ""
echo "3. Database Status:"
tail -5 db-validator.log 2>/dev/null | grep -E "(Working:|Failed:|ALERT)" || echo "No recent logs"

# Check status file
echo ""
echo "4. Last Known Status:"
if [ -f "11-llm-status.json" ]; then
    cat 11-llm-status.json | jq -r '"Working: \(.working_count)/11 (\(.working_providers | join(", ")))"'
else
    echo "No status file yet"
fi
EOF

chmod +x check-11-llm-status.sh

echo ""
echo "✅ Monitoring Started!"
echo ""
echo "📊 MONITORING COMMANDS:"
echo "  ./check-11-llm-status.sh     - Quick status check"
echo "  tail -f api-monitor.log      - Watch API monitor"
echo "  tail -f db-validator.log     - Watch database validator"
echo "  ps aux | grep monitor        - Check monitor processes"
echo ""
echo "🚨 You will receive ALERTS if:"
echo "  - Any of the 11 LLMs fail"
echo "  - Less than 8/11 LLMs are working"
echo "  - Deployment fails"
echo ""
echo "⏰ Expected Timeline:"
echo "  - Deployment: 5-10 minutes"
echo "  - First validation: 10-15 minutes"
echo "  - Full 11/11 confirmation: 15-20 minutes"
echo ""
echo "🎯 SUCCESS CRITERIA: All 11 LLMs responding in database"

# Run initial check
echo ""
echo "Running initial status check..."
sleep 5
./check-11-llm-status.sh
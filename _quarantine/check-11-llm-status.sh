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

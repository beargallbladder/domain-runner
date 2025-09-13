#!/bin/bash
# Continuous deployment check

echo "🔄 CHECKING DEPLOYMENT EVERY 30 SECONDS"
echo "======================================="
echo "Latest commits pushed:"
git log --oneline -5

while true; do
    echo -e "\n⏰ $(date +%H:%M:%S)"
    
    # Check services
    SR=$(curl -s -o /dev/null -w "%{http_code}" https://sophisticated-runner.onrender.com/health 2>/dev/null)
    DP=$(curl -s -o /dev/null -w "%{http_code}" https://domain-processor-v2.onrender.com/health 2>/dev/null)
    
    echo "sophisticated-runner: $SR"
    echo "domain-processor-v2: $DP"
    
    if [ "$SR" = "200" ]; then
        echo "✅ sophisticated-runner is UP!"
        
        # Test endpoint
        echo "Testing process endpoint..."
        curl -X POST https://sophisticated-runner.onrender.com/api/process-domains-synchronized \
             -H "Content-Type: application/json" \
             -d '{"limit": 1}' \
             -w "\nHTTP: %{http_code}\n"
        break
    fi
    
    sleep 30
done
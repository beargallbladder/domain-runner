#!/bin/bash
# Monitor deployment continuously

echo "🚀 DEPLOYMENT MONITOR - 11 LLM FIX"
echo "=================================="
echo "Started at: $(date)"
echo ""
echo "Latest commits:"
git log --oneline -3
echo ""

CHECK=0
while true; do
    CHECK=$((CHECK + 1))
    echo -e "\n⏰ Check #$CHECK at $(date +%H:%M:%S)"
    
    # Check services
    SR=$(curl -s -o /dev/null -w "%{http_code}" https://sophisticated-runner.onrender.com/health 2>/dev/null)
    DP=$(curl -s -o /dev/null -w "%{http_code}" https://domain-processor-v2.onrender.com/health 2>/dev/null)
    DR=$(curl -s -o /dev/null -w "%{http_code}" https://domain-runner.onrender.com/health 2>/dev/null)
    
    echo "sophisticated-runner: $SR"
    echo "domain-processor-v2: $DP"
    echo "domain-runner: $DR"
    
    if [ "$SR" = "200" ]; then
        echo -e "\n✅ sophisticated-runner is UP!"
        echo "Testing health endpoint..."
        curl -s https://sophisticated-runner.onrender.com/health | python3 -m json.tool | head -20
        
        echo -e "\nTesting 11 LLMs..."
        python3 final_11_llm_test.py
        break
    fi
    
    if [ "$DP" = "200" ]; then
        echo -e "\n✅ domain-processor-v2 is UP!"
    fi
    
    # Max 30 checks (15 minutes)
    if [ $CHECK -ge 30 ]; then
        echo -e "\n❌ Timeout after 15 minutes"
        break
    fi
    
    sleep 30
done
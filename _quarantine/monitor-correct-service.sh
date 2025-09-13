#!/bin/bash

echo "🚀 MONITORING SOPHISTICATED-RUNNER DEPLOYMENT"
echo "==========================================="
echo ""
echo "Service URL: https://sophisticated-runner.onrender.com"
echo "Monitoring deployment..."
echo ""

# Wait for deployment
attempt=1
max_attempts=20

while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts..."
    
    # Check if service is responding with new code
    response=$(curl -s https://sophisticated-runner.onrender.com/swarm/metrics 2>/dev/null)
    
    if [[ ! "$response" =~ "Cannot GET" ]] && [[ ! -z "$response" ]]; then
        echo ""
        echo "✅ SWARM DEPLOYED SUCCESSFULLY!"
        echo ""
        echo "📊 Swarm Metrics:"
        echo "$response" | jq '.' || echo "$response"
        
        echo ""
        echo "🎯 Testing volatility for tesla.com:"
        curl -s https://sophisticated-runner.onrender.com/swarm/volatility/tesla.com | jq '.' || echo "Failed"
        
        echo ""
        echo "🔍 Finding high opportunity domains:"
        curl -s https://sophisticated-runner.onrender.com/swarm/opportunities | jq '.' || echo "Failed"
        
        exit 0
    fi
    
    sleep 30
    ((attempt++))
done

echo "❌ Deployment timed out"
exit 1
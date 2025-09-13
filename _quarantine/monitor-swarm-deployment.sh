#!/bin/bash

echo "🐝 MONITORING SWARM DEPLOYMENT"
echo "============================="
echo ""
echo "Waiting for deployment to complete (usually 3-5 minutes)..."
echo "Check status at: https://dashboard.render.com/web/srv-d1lfb8ur433s73dm0pi0"
echo ""

# Wait a bit for initial deployment
sleep 30

# Function to test endpoint
test_endpoint() {
    local url=$1
    local description=$2
    echo -n "$description: "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "200" ]; then
        echo "✅ OK"
        return 0
    else
        echo "❌ Failed (HTTP $response)"
        return 1
    fi
}

# Test loop
attempt=1
max_attempts=20

while [ $attempt -le $max_attempts ]; do
    echo ""
    echo "Attempt $attempt/$max_attempts:"
    echo "------------------------"
    
    # Test health endpoint
    if test_endpoint "https://sophisticated-runner.onrender.com/health" "Health check"; then
        echo ""
        echo "✅ Service is up! Testing swarm endpoints..."
        
        # Test swarm metrics
        echo ""
        echo "📊 Swarm Metrics:"
        curl -s https://sophisticated-runner.onrender.com/swarm/metrics | jq '.' || echo "Failed to get metrics"
        
        # Test opportunities
        echo ""
        echo "🎯 High Opportunity Domains:"
        curl -s https://sophisticated-runner.onrender.com/swarm/opportunities | jq '.opportunities[:3]' || echo "Failed to get opportunities"
        
        echo ""
        echo "🎉 SWARM DEPLOYMENT SUCCESSFUL!"
        echo ""
        echo "Next steps:"
        echo "1. Add missing API keys (AI21, Perplexity, XAI) in Render dashboard"
        echo "2. Process volatile domains: curl -X POST https://sophisticated-runner.onrender.com/swarm/process-volatile -d '{\"limit\": 50}'"
        echo "3. Monitor at: https://sophisticated-runner.onrender.com/swarm/metrics"
        
        exit 0
    fi
    
    echo "Service not ready yet..."
    sleep 30
    ((attempt++))
done

echo ""
echo "❌ Deployment monitoring timed out after $max_attempts attempts"
echo "Check Render logs for issues: https://dashboard.render.com/web/srv-d1lfb8ur433s73dm0pi0/logs"
exit 1
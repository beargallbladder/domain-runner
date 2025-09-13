#!/bin/bash

# Quick deployment status checker
# Uses curl to check deployment status without needing API keys

SERVICE_URL="https://sophisticated-runner.onrender.com"
CHECK_INTERVAL=10
MAX_ATTEMPTS=60  # 10 minutes

echo "🔍 Checking deployment status for sophisticated-runner..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

attempt=1
while [ $attempt -le $MAX_ATTEMPTS ]; do
    echo -n "🔄 Attempt $attempt/$MAX_ATTEMPTS: "
    
    # Check health endpoint
    response=$(curl -s -w "\n%{http_code}" "$SERVICE_URL/health" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Service is UP!"
        echo ""
        echo "📊 Health Response:"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        
        # Check provider status
        echo ""
        echo "🤖 Checking LLM providers..."
        provider_response=$(curl -s "$SERVICE_URL/provider-status" 2>/dev/null)
        if [ $? -eq 0 ]; then
            echo "$provider_response" | jq '.' 2>/dev/null || echo "$provider_response"
            
            # Count active providers
            active_count=$(echo "$provider_response" | jq -r '.active_providers | length' 2>/dev/null)
            if [ -n "$active_count" ]; then
                echo ""
                echo "📈 Active LLMs: $active_count/10"
                
                if [ "$active_count" -lt 10 ]; then
                    echo "⚠️  Warning: Not all LLMs are active. Check API keys in Render dashboard."
                fi
            fi
        else
            echo "Provider status endpoint not available yet"
        fi
        
        # Check metrics
        echo ""
        echo "📊 Service Metrics:"
        curl -s "$SERVICE_URL/metrics" 2>/dev/null | jq '.' || echo "Metrics not available"
        
        exit 0
    else
        echo "❌ Service returned HTTP $http_code"
        
        if [ "$http_code" = "503" ]; then
            echo "   Service is starting up..."
        elif [ "$http_code" = "502" ]; then
            echo "   Service is deploying..."
        elif [ "$http_code" = "000" ]; then
            echo "   Connection failed (service might be restarting)"
        fi
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -le $MAX_ATTEMPTS ]; then
        sleep $CHECK_INTERVAL
    fi
done

echo ""
echo "⏰ Timeout: Service did not become healthy after 10 minutes"
echo ""
echo "🔍 Troubleshooting steps:"
echo "1. Check Render dashboard: https://dashboard.render.com"
echo "2. Look for deployment errors in the Events tab"
echo "3. Verify all environment variables are set"
echo "4. Run: ./render-ssh-monitor.sh stream (after adding SSH key)"
exit 1
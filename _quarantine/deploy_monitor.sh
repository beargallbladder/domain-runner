#!/bin/bash

# Render Deployment Monitor
# Monitors deployment status and alerts on failures

SERVICE_NAME="sophisticated-runner"
CHECK_INTERVAL=10
MAX_WAIT_TIME=600  # 10 minutes

echo "🚀 Monitoring Render deployment for $SERVICE_NAME..."

# Install render CLI if not present
if ! command -v render &> /dev/null; then
    echo "📦 Installing Render CLI..."
    curl -fsSL https://render.com/install.sh | sh
fi

# Function to get deployment status
check_deployment_status() {
    # Get latest deployment
    DEPLOY_ID=$(render deploys list --service-name $SERVICE_NAME --limit 1 --json | jq -r '.[0].id' 2>/dev/null)
    
    if [ -z "$DEPLOY_ID" ]; then
        echo "❌ Failed to get deployment ID"
        return 1
    fi
    
    # Get deployment details
    STATUS=$(render deploys get $DEPLOY_ID --json | jq -r '.status' 2>/dev/null)
    
    echo "📊 Deployment $DEPLOY_ID status: $STATUS"
    
    case $STATUS in
        "live")
            echo "✅ Deployment successful!"
            return 0
            ;;
        "failed")
            echo "❌ Deployment FAILED!"
            echo "🔍 Getting error logs..."
            render logs --service-name $SERVICE_NAME --tail 50
            return 1
            ;;
        "canceled")
            echo "⚠️ Deployment was canceled"
            return 1
            ;;
        *)
            # Still in progress
            return 2
            ;;
    esac
}

# Function to check service health
check_service_health() {
    echo "🏥 Checking service health..."
    
    # Get service URL
    SERVICE_URL=$(render services get $SERVICE_NAME --json | jq -r '.url' 2>/dev/null)
    
    if [ -z "$SERVICE_URL" ]; then
        echo "❌ Failed to get service URL"
        return 1
    fi
    
    # Check health endpoint
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health")
    
    if [ "$HEALTH_STATUS" = "200" ]; then
        echo "✅ Service is healthy!"
        
        # Get metrics
        echo "📈 Service metrics:"
        curl -s "$SERVICE_URL/metrics" | jq '.' 2>/dev/null || echo "No metrics available"
    else
        echo "❌ Service health check failed (HTTP $HEALTH_STATUS)"
        return 1
    fi
}

# Main monitoring loop
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT_TIME ]; do
    check_deployment_status
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
        # Deployment successful, check health
        sleep 10  # Give service time to start
        check_service_health
        exit 0
    elif [ $RESULT -eq 1 ]; then
        # Deployment failed
        exit 1
    fi
    
    # Still deploying
    echo "⏳ Waiting for deployment to complete... ($ELAPSED seconds elapsed)"
    sleep $CHECK_INTERVAL
    ELAPSED=$((ELAPSED + CHECK_INTERVAL))
done

echo "⏰ Deployment monitoring timed out after $MAX_WAIT_TIME seconds"
exit 1
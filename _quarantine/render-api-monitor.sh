#!/bin/bash

# Render API Monitor - Programmatic deployment monitoring
# Uses Render API instead of CLI for better automation

RENDER_API_KEY="${RENDER_API_KEY}"
SERVICE_ID="${SERVICE_ID:-srv-ct67jm0gph6c73ciq1kg}"  # sophisticated-runner service ID
API_BASE="https://api.render.com/v1"

if [ -z "$RENDER_API_KEY" ]; then
    echo "❌ RENDER_API_KEY not set. Get it from https://dashboard.render.com/account/api-keys"
    exit 1
fi

# Function to make API calls
render_api() {
    local endpoint=$1
    curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
         -H "Accept: application/json" \
         "$API_BASE$endpoint"
}

# Get latest deployment
get_latest_deployment() {
    render_api "/services/$SERVICE_ID/deploys?limit=1" | jq -r '.[0]'
}

# Get deployment logs
get_deployment_logs() {
    local deploy_id=$1
    render_api "/services/$SERVICE_ID/deploys/$deploy_id/logs" | jq -r '.[] | .message'
}

# Monitor deployment
monitor_deployment() {
    echo "🚀 Monitoring Render deployment..."
    
    local deploy=$(get_latest_deployment)
    local deploy_id=$(echo "$deploy" | jq -r '.id')
    local status=$(echo "$deploy" | jq -r '.status')
    local created_at=$(echo "$deploy" | jq -r '.createdAt')
    
    echo "📊 Deployment: $deploy_id"
    echo "📅 Started: $created_at"
    echo "📈 Initial Status: $status"
    
    # Monitor until complete
    while true; do
        deploy=$(render_api "/services/$SERVICE_ID/deploys/$deploy_id")
        status=$(echo "$deploy" | jq -r '.status')
        
        case $status in
            "created"|"build_in_progress"|"update_in_progress")
                echo "⏳ Status: $status - waiting..."
                sleep 10
                ;;
            "live")
                echo "✅ Deployment successful!"
                echo "🔍 Final logs:"
                get_deployment_logs "$deploy_id" | tail -20
                return 0
                ;;
            "deactivated"|"build_failed"|"update_failed"|"canceled")
                echo "❌ Deployment failed with status: $status"
                echo "🔍 Error logs:"
                get_deployment_logs "$deploy_id" | tail -50
                return 1
                ;;
            *)
                echo "❓ Unknown status: $status"
                sleep 10
                ;;
        esac
    done
}

# Check service health
check_service_health() {
    local service=$(render_api "/services/$SERVICE_ID")
    local url=$(echo "$service" | jq -r '.service.url')
    
    echo "🏥 Checking service health at $url..."
    
    # Check health endpoint
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "$url/health")
    
    if [ "$health_status" = "200" ]; then
        echo "✅ Service is healthy!"
        
        # Check provider status
        echo "🤖 Active LLM providers:"
        curl -s "$url/provider-status" | jq '.'
        
        # Get metrics
        echo "📈 Service metrics:"
        curl -s "$url/metrics" | jq '.'
    else
        echo "❌ Service health check failed (HTTP $health_status)"
        return 1
    fi
}

# Main execution
echo "🔧 Render API Monitor for sophisticated-runner"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check current service status
service_info=$(render_api "/services/$SERVICE_ID")
service_name=$(echo "$service_info" | jq -r '.service.name')
service_url=$(echo "$service_info" | jq -r '.service.url')

echo "📦 Service: $service_name"
echo "🌐 URL: $service_url"
echo ""

# Monitor deployment
monitor_deployment

# If successful, check health
if [ $? -eq 0 ]; then
    echo ""
    sleep 15  # Give service time to fully start
    check_service_health
fi
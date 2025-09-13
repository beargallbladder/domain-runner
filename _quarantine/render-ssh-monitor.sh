#!/bin/bash

# Render SSH Log Monitor - Real-time deployment monitoring
# Uses SSH connection for live log streaming

SERVICE_NAME="sophisticated-runner"
RENDER_USER="render"
LOG_LINES=100

echo "🚀 Render SSH Log Monitor for $SERVICE_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Add this SSH key to Render:"
echo "   1. Go to https://dashboard.render.com/account/ssh-keys"
echo "   2. Click 'Add SSH Key'"
echo "   3. Paste this key:"
echo ""
cat ~/.ssh/id_ed25519.pub
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Function to stream logs via SSH
stream_logs() {
    echo "📡 Connecting to Render logs via SSH..."
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ${RENDER_USER}@ssh.${SERVICE_NAME}.onrender.com \
        "tail -f /var/log/render/*.log" 2>/dev/null | while IFS= read -r line; do
        
        # Color code the output based on content
        if [[ "$line" =~ "error"|"ERROR"|"failed"|"FAILED" ]]; then
            echo -e "\033[31m❌ $line\033[0m"  # Red for errors
        elif [[ "$line" =~ "warning"|"WARNING"|"warn"|"WARN" ]]; then
            echo -e "\033[33m⚠️  $line\033[0m"  # Yellow for warnings
        elif [[ "$line" =~ "success"|"SUCCESS"|"deployed"|"live" ]]; then
            echo -e "\033[32m✅ $line\033[0m"  # Green for success
        elif [[ "$line" =~ "Building"|"Deploying"|"Starting" ]]; then
            echo -e "\033[36m🔨 $line\033[0m"  # Cyan for build steps
        else
            echo "   $line"
        fi
        
        # Check for deployment completion
        if [[ "$line" =~ "Deploy live for" ]]; then
            echo ""
            echo "🎉 Deployment completed successfully!"
            check_service_health
        elif [[ "$line" =~ "Deploy failed" ]]; then
            echo ""
            echo "💥 Deployment FAILED!"
            echo "🔍 Check recent errors above"
            return 1
        fi
    done
}

# Function to check service health
check_service_health() {
    local url="https://${SERVICE_NAME}.onrender.com"
    
    echo ""
    echo "🏥 Checking service health..."
    
    # Check health endpoint
    local health_status=$(curl -s -o /dev/null -w "%{http_code}" "$url/health")
    
    if [ "$health_status" = "200" ]; then
        echo "✅ Service is healthy!"
        
        # Check provider status
        echo ""
        echo "🤖 Active LLM providers:"
        curl -s "$url/provider-status" 2>/dev/null | jq '.' || echo "Provider status endpoint not available"
        
        # Get metrics
        echo ""
        echo "📈 Service metrics:"
        curl -s "$url/metrics" 2>/dev/null | jq '.' || echo "Metrics endpoint not available"
    else
        echo "❌ Service health check failed (HTTP $health_status)"
        echo "🔍 This might be normal if the service is still starting..."
    fi
}

# Function to get recent logs
get_recent_logs() {
    echo "📜 Fetching recent logs..."
    ssh -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        ${RENDER_USER}@ssh.${SERVICE_NAME}.onrender.com \
        "tail -n $LOG_LINES /var/log/render/*.log" 2>/dev/null
}

# Main execution
case "${1:-stream}" in
    "stream")
        echo "🔄 Streaming live logs (Ctrl+C to stop)..."
        stream_logs
        ;;
    "recent")
        get_recent_logs
        ;;
    "health")
        check_service_health
        ;;
    *)
        echo "Usage: $0 [stream|recent|health]"
        echo "  stream - Stream live logs (default)"
        echo "  recent - Show recent logs"
        echo "  health - Check service health"
        exit 1
        ;;
esac
#!/bin/bash
# Real-time deployment monitoring

WEB_URL="https://domain-runner-rust-web.onrender.com"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 MONITORING RUST DEPLOYMENT"
echo "============================="
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2

    echo -n "$description: "

    response=$(curl -s -o /dev/null -w "%{http_code}" ${WEB_URL}${endpoint} 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK (200)${NC}"
        return 0
    elif [ "$response" = "000" ]; then
        echo -e "${YELLOW}⏳ Not deployed yet${NC}"
        return 1
    else
        echo -e "${RED}❌ Error ($response)${NC}"
        return 1
    fi
}

# Continuous monitoring
while true; do
    clear
    echo "🔍 MONITORING RUST DEPLOYMENT"
    echo "============================="
    echo "Time: $(date)"
    echo ""

    # Check basic endpoints
    check_endpoint "/healthz" "Health Check"
    check_endpoint "/readyz" "Readiness"
    check_endpoint "/status" "Status API"

    echo ""

    # If health check passes, get detailed status
    if curl -s ${WEB_URL}/healthz > /dev/null 2>&1; then
        echo "📊 DETAILED STATUS:"
        echo "-------------------"

        # Get status data
        status=$(curl -s ${WEB_URL}/status 2>/dev/null)

        if [ ! -z "$status" ]; then
            # Parse key metrics
            echo "$status" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)

    # Environment info
    env = data.get('environment', {})
    print(f\"🔐 Read-only mode: {env.get('db_readonly', 'unknown')}\")
    print(f\"📝 Drift writes: {env.get('features', {}).get('write_drift', False)}\")
    print(f\"⚙️ Worker writes: {env.get('features', {}).get('worker_writes', False)}\")
    print(f\"⏰ Cron enabled: {env.get('features', {}).get('cron', False)}\")
    print()

    # Data metrics
    data_info = data.get('data', {})
    print(f\"📈 Total domains: {data_info.get('domains', 0):,}\")
    print(f\"📊 Drift rows (7d): {data_info.get('drift_rows_7d', 0):,}\")

    last_obs = data_info.get('last_observation')
    if last_obs:
        print(f\"🕒 Last observation: {last_obs}\")

    models = data_info.get('models_seen', [])
    if models:
        print(f\"🤖 Models seen: {', '.join(models[:3])}\")
        if len(models) > 3:
            print(f\"   (+{len(models)-3} more)\")

    # Database info
    db_info = data.get('database', {})
    if db_info:
        print()
        print(f\"🗄️ Database: {db_info.get('status', 'unknown')}\")
        pool = db_info.get('pool', {})
        if pool:
            print(f\"   Connections: {pool.get('size', 0)}/{pool.get('max_size', 0)}\")
            print(f\"   Idle: {pool.get('idle_connections', 0)}\")

except Exception as e:
    print(f\"Error parsing status: {e}\")
" 2>/dev/null || echo "Could not parse status JSON"
        fi

        echo ""
        echo "🔗 ENDPOINTS TO TEST:"
        echo "---------------------"
        echo "Web UI:     ${WEB_URL}"
        echo "Domains:    ${WEB_URL}/domains"
        echo "Models:     ${WEB_URL}/models"
        echo "Drift:      ${WEB_URL}/drift/example.com"

    else
        echo -e "${YELLOW}⏳ Waiting for deployment...${NC}"
        echo ""
        echo "This usually takes 5-10 minutes on first deploy."
        echo "The Dockerfile needs to:"
        echo "1. Build Rust dependencies (2-3 min)"
        echo "2. Compile the application (1-2 min)"
        echo "3. Create the final image (1 min)"
        echo "4. Deploy and start (1 min)"
    fi

    echo ""
    echo "---"
    echo "Press Ctrl+C to stop monitoring"
    echo "Refreshing in 10 seconds..."

    sleep 10
done
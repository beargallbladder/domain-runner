#!/bin/bash
# Force deployment through Render

echo "🚀 FORCING RENDER DEPLOYMENT"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Opening Render deployment page...${NC}"
echo ""

# Open deployment URL
DEPLOY_URL="https://render.com/deploy?repo=https://github.com/beargallbladder/domain-runner"
echo "Deploy URL: $DEPLOY_URL"
echo ""

# Try to open in browser
if command -v open &> /dev/null; then
    open "$DEPLOY_URL"
    echo -e "${GREEN}✅ Deployment page opened in browser${NC}"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$DEPLOY_URL"
    echo -e "${GREEN}✅ Deployment page opened in browser${NC}"
else
    echo -e "${YELLOW}Please open this URL manually:${NC}"
    echo "$DEPLOY_URL"
fi

echo ""
echo "INSTRUCTIONS:"
echo "1. Click 'Create Services' button"
echo "2. Sign in if prompted"
echo "3. Services will start building"
echo ""
echo -e "${YELLOW}Starting monitoring in 30 seconds...${NC}"
sleep 30

# Monitor deployment
echo ""
echo "📊 MONITORING DEPLOYMENT"
echo "========================"

WEB_URL="https://domain-runner-rust-web.onrender.com"
MAX_ATTEMPTS=40
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # Progress bar
    PROGRESS=$((ATTEMPT * 100 / MAX_ATTEMPTS))
    printf "\rAttempt %02d/%02d [" $ATTEMPT $MAX_ATTEMPTS

    # Draw progress bar
    FILLED=$((PROGRESS / 5))
    for ((i=0; i<20; i++)); do
        if [ $i -lt $FILLED ]; then
            printf "="
        else
            printf " "
        fi
    done
    printf "] %d%% " $PROGRESS

    # Check service
    response=$(curl -s -o /dev/null -w "%{http_code}" ${WEB_URL}/healthz 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo ""
        echo ""
        echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL!${NC}"
        echo ""

        # Get detailed status
        echo "📊 Service Status:"
        status=$(curl -s ${WEB_URL}/status 2>/dev/null)

        if [ ! -z "$status" ]; then
            echo "$status" | python3 -c "
import json
import sys

try:
    data = json.load(sys.stdin)

    # Environment
    env = data.get('environment', {})
    print(f'  Read-only mode: {env.get(\"db_readonly\", \"unknown\")}')

    # Data
    data_info = data.get('data', {})
    domains = data_info.get('domains', 0)
    print(f'  Total domains: {domains:,}')

    # Database
    db = data.get('database', {})
    print(f'  Database: {db.get(\"status\", \"unknown\")}')

    if env.get('db_readonly', False):
        print()
        print('✅ SAFE MODE ACTIVE - No writes possible')
    else:
        print()
        print('⚠️ Write mode enabled')

except Exception as e:
    print(f'Error parsing status: {e}')
" 2>/dev/null
        fi

        echo ""
        echo "🔗 Service Endpoints:"
        echo "  Web UI:  ${WEB_URL}"
        echo "  Health:  ${WEB_URL}/healthz"
        echo "  Status:  ${WEB_URL}/status"
        echo "  Domains: ${WEB_URL}/domains"
        echo ""
        echo -e "${GREEN}Deployment complete!${NC}"
        exit 0

    elif [ "$response" = "404" ]; then
        printf " HTTP 404 - Not deployed yet"
    elif [ "$response" = "000" ]; then
        printf " No response"
    else
        printf " HTTP $response"
    fi

    sleep 30
done

echo ""
echo ""
echo -e "${RED}❌ Deployment timeout after 20 minutes${NC}"
echo ""
echo "Possible issues:"
echo "1. Services not created in Render yet"
echo "2. Build failed - check Render dashboard"
echo "3. Repository access issues"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Check if services exist"
echo "3. Check build logs if they do"
exit 1
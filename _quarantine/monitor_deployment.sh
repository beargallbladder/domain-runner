#!/bin/bash

echo "🔍 Monitoring Sophisticated Runner Deployment"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Service URL
SERVICE_URL="https://sophisticated-runner.onrender.com"

echo -e "${YELLOW}Checking deployment status...${NC}"
echo ""

# Loop to check health
MAX_ATTEMPTS=30
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo -ne "Attempt $ATTEMPT/$MAX_ATTEMPTS: "
    
    # Try health check
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/health" 2>/dev/null)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo -e "${GREEN}✅ Service is UP!${NC}"
        echo ""
        echo -e "${GREEN}Deployment successful!${NC}"
        echo ""
        
        # Get full health status
        echo "Health Status:"
        curl -s "$SERVICE_URL/health" | jq '.' || curl -s "$SERVICE_URL/health"
        echo ""
        
        # Get pending count
        echo "Pending Domains:"
        curl -s "$SERVICE_URL/api/pending-count" | jq '.' || curl -s "$SERVICE_URL/api/pending-count"
        echo ""
        
        echo -e "${GREEN}🎉 Service is ready to process domains!${NC}"
        exit 0
    else
        echo -e "${RED}Service not ready (HTTP $HTTP_STATUS)${NC}"
        sleep 10
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
done

echo ""
echo -e "${RED}❌ Deployment timeout - check Render dashboard${NC}"
echo "Visit: https://dashboard.render.com/web/srv-crqepfdds78s73a3qgfg"
exit 1
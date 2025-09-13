#!/bin/bash

# Check Deployment Status of Enterprise Neural Gateway
echo "🔍 Checking Enterprise Neural Gateway Deployment Status"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check endpoint
check_endpoint() {
    local url=$1
    local name=$2
    local api_key=$3
    
    if [ -z "$api_key" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -H "X-API-Key: $api_key" "$url" 2>/dev/null)
    fi
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ $name: Online (HTTP 200)${NC}"
        return 0
    elif [ "$response" = "401" ] || [ "$response" = "403" ]; then
        echo -e "${YELLOW}⚠ $name: Protected (HTTP $response) - Auth required${NC}"
        return 0
    elif [ "$response" = "404" ]; then
        echo -e "${RED}✗ $name: Not found (HTTP 404)${NC}"
        return 1
    else
        echo -e "${RED}✗ $name: Offline or error (HTTP $response)${NC}"
        return 1
    fi
}

echo "1. Core Services:"
echo "-----------------"
check_endpoint "https://llmrank.io/api/stats" "llmrank.io API"
check_endpoint "https://domain-runner.onrender.com/health" "domain-runner" 
check_endpoint "https://sophisticated-runner.onrender.com/health" "sophisticated-runner"

echo ""
echo "2. Partner API (llmpagerank.com):"
echo "----------------------------------"
check_endpoint "https://domain-runner.onrender.com/api/stats" "Stats endpoint" "llmpagerank-2025-neural-gateway"
check_endpoint "https://domain-runner.onrender.com/api/rankings" "Rankings endpoint" "llmpagerank-2025-neural-gateway"

echo ""
echo "3. Premium API (brandsentiment.io):"
echo "------------------------------------"
check_endpoint "https://domain-runner.onrender.com/api/v2/juice-feedback" "Juice feedback" "brandsentiment-premium-2025"
check_endpoint "https://domain-runner.onrender.com/api/v2/crawl-priorities" "Crawl priorities" "brandsentiment-premium-2025"

echo ""
echo "4. Database & Redis:"
echo "--------------------"
# Check if we can connect to database (this would need actual DB client)
echo -e "${YELLOW}⚠ Database: Check via Render dashboard${NC}"
echo -e "${YELLOW}⚠ Redis: Check via Render dashboard${NC}"

echo ""
echo "========================================================"
echo "Deployment Summary:"
echo ""

# Check GitHub repo for latest commit
latest_commit=$(git log --oneline -1 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "Latest commit: $latest_commit"
fi

echo ""
echo "Next Steps:"
echo "1. Monitor Render dashboard: https://dashboard.render.com"
echo "2. Check service logs for any errors"
echo "3. Update llmpagerank.com with new API endpoints"
echo "4. Configure brandsentiment.io juice feedback"
echo ""
echo -e "${GREEN}Enterprise Neural Gateway deployment check complete!${NC}"
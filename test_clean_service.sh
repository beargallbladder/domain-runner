#!/bin/bash

echo "🧪 Testing Clean Node.js Service"
echo "================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Service URL (update with your actual Render URL)
SERVICE_URL="${1:-https://sophisticated-runner.onrender.com}"

echo -e "${YELLOW}Testing: $SERVICE_URL${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}1. Health Check${NC}"
curl -s "$SERVICE_URL/health" | jq '.' || echo -e "${RED}Health check failed${NC}"
echo ""

# Test 2: Pending Count
echo -e "${YELLOW}2. Pending Domains Count${NC}"
curl -s "$SERVICE_URL/api/pending-count" | jq '.' || echo -e "${RED}Pending count failed${NC}"
echo ""

# Test 3: Process Domains (small batch)
echo -e "${YELLOW}3. Process 2 Domains${NC}"
curl -s -X POST "$SERVICE_URL/api/process-domains" \
  -H "Content-Type: application/json" \
  -d '{"limit": 2}' | jq '.' || echo -e "${RED}Process domains failed${NC}"
echo ""

echo -e "${GREEN}✅ Tests complete!${NC}"
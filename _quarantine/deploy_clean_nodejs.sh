#!/bin/bash

echo "🚀 CLEAN NODE.JS DEPLOYMENT SCRIPT"
echo "=================================="
echo ""
echo "This script will deploy a working Node.js service to Render"
echo "with all 11 LLM providers configured."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "render.yaml" ]; then
    echo -e "${RED}Error: render.yaml not found. Run this from the project root.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Cleaning up any previous builds${NC}"
rm -rf services/sophisticated-runner/dist
rm -rf services/sophisticated-runner/node_modules

echo -e "${YELLOW}Step 2: Testing the build locally${NC}"
cd services/sophisticated-runner
npm install
npm run build
cd ../..

echo -e "${YELLOW}Step 3: Checking git status${NC}"
git status

echo -e "${YELLOW}Step 4: Committing changes${NC}"
git add .
git commit -m "Deploy clean Node.js service with 11 LLM providers

- Replaced Rust service with clean Node.js implementation
- All 11 LLM providers configured (OpenAI, Anthropic, DeepSeek, Mistral, xAI, Together, Perplexity, Google, Cohere, AI21, Groq)
- Auto-processing loop every 30 seconds
- Health check endpoint with provider status
- Simple, maintainable code that works on Render's Node.js runtime"

echo -e "${YELLOW}Step 5: Pushing to GitHub${NC}"
git push origin main

echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Check the 'sophisticated-runner' service"
echo "3. Monitor the deployment logs"
echo "4. Once deployed, test the endpoints:"
echo "   - /health - Check service health"
echo "   - POST /api/process-domains - Process domains manually"
echo "   - GET /api/pending-count - Check pending domains"
echo ""
echo "The service will automatically process domains every 30 seconds."
echo ""
echo -e "${GREEN}🎉 Clean deployment complete!${NC}"
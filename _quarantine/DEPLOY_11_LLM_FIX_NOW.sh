#!/bin/bash
# DEPLOY 11 LLM FIX TO RENDER

echo "🚀 DEPLOYING 11 LLM FIX TO RENDER"
echo "=================================="
echo ""
echo "This will:"
echo "1. Commit the AI21 provider fix"
echo "2. Push to GitHub"
echo "3. Trigger Render deployment"
echo ""

# Check git status
echo "📋 Current git status:"
git status --short

# Stage the fix
echo ""
echo "📦 Staging AI21 fix..."
git add services/sophisticated-runner/src/index.ts
git add services/sophisticated-runner/dist/

# Commit
echo ""
echo "💾 Committing..."
git commit -m "Add AI21 provider support for 11 LLM tensor synchronization

- Added AI21 provider configuration to MEDIUM_PROVIDERS
- Updated callLLMWithKey to handle AI21's API format
- AI21 uses 'prompt' instead of 'messages' format
- Response parsing for AI21's completion format
- All 11 LLMs now configured in code"

# Push
echo ""
echo "🔧 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ DEPLOYMENT TRIGGERED!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Go to https://dashboard.render.com"
echo "2. Check these services are deploying:"
echo "   - domain-runner (this runs the sophisticated-runner code)"
echo "   - domain-processor-v2 (has all the API keys)"
echo ""
echo "3. Add the missing API keys:"
echo "   - XAI_API_KEY (get from https://console.x.ai/)"
echo "   - PERPLEXITY_API_KEY (get from https://www.perplexity.ai/settings/api)"
echo "   - GOOGLE_API_KEY (check https://console.cloud.google.com/apis/credentials)"
echo "   - AI21_API_KEY (get from https://studio.ai21.com/account/api-keys)"
echo ""
echo "4. Once deployed, test with:"
echo "   python3 no_bullshit_llm_validator.py"
echo ""
echo "🎯 TARGET: 11/11 LLMs responding!"
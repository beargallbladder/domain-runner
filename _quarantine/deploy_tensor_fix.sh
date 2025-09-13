#!/bin/bash
# EMERGENCY TENSOR FIX DEPLOYMENT
# Fix the REAL missing LLMs: AI21, Perplexity, xAI

echo "🚨 EMERGENCY TENSOR FIX DEPLOYMENT"
echo "================================="
echo "Missing LLMs: AI21, Perplexity, xAI"
echo "Working LLMs: OpenAI, Anthropic, DeepSeek, Mistral, Together, Google, Cohere, Groq"
echo ""

# Step 1: Commit and push the render.yaml updates
echo "📝 Step 1: Committing render.yaml updates..."
git add -A
git commit -m "CRITICAL: Fix tensor synchronization - add AI21, restore Perplexity/xAI

- Added AI21_API_KEY placeholders (provider never worked before)
- Perplexity and xAI keys already in place (need new keys - old ones expired)
- Cohere and Groq are WORKING FINE (test scripts were wrong)
- Only 8/11 LLMs currently working, breaking tensor integrity

After deployment:
1. Add API keys for AI21, Perplexity, xAI in Render dashboard
2. All 11 LLMs must work for tensor synchronization"

# Step 2: Push to trigger deployment
echo "🚀 Step 2: Pushing to main branch..."
git push origin main

echo ""
echo "✅ Deployment triggered on Render!"
echo ""
echo "🔑 Step 3: GET API KEYS IMMEDIATELY:"
echo "===================================="
echo ""
echo "1. PERPLEXITY (was working until July 9):"
echo "   👉 Go to: https://www.perplexity.ai/settings/api"
echo "   - Sign in with Google/GitHub"
echo "   - Generate API key"
echo "   - Copy the key starting with 'pplx-'"
echo ""
echo "2. xAI (was working until July 10):"
echo "   👉 Go to: https://console.x.ai/"
echo "   - Sign in with X/Twitter account"
echo "   - Create new API key"
echo "   - Copy the key starting with 'xai-'"
echo ""
echo "3. AI21 (never worked - new setup):"
echo "   👉 Go to: https://studio.ai21.com/account/api-keys"
echo "   - Sign up for free account"
echo "   - Go to API Keys section"
echo "   - Create new API key"
echo "   - Copy the key"
echo ""
echo "📌 Step 4: ADD TO RENDER ENVIRONMENT:"
echo "===================================="
echo "Go to: https://dashboard.render.com"
echo ""
echo "Update BOTH services:"
echo "- sophisticated-runner"
echo "- domain-processor-v2"
echo ""
echo "Add these environment variables:"
echo "PERPLEXITY_API_KEY=<your-perplexity-key>"
echo "PERPLEXITY_API_KEY_2=<same-key>"
echo "XAI_API_KEY=<your-xai-key>"
echo "XAI_API_KEY_2=<same-key>"
echo "AI21_API_KEY=<your-ai21-key>"
echo "AI21_API_KEY_2=<same-key>"
echo ""
echo "⚠️  CRITICAL: After adding keys, services will auto-redeploy"
echo ""
echo "📊 Step 5: MONITOR DEPLOYMENT:"
echo "=============================="
echo "Watch these services redeploy:"
echo "- https://dashboard.render.com/web/srv-ct67jm0gph6c73ciq1kg (sophisticated-runner)"
echo "- https://dashboard.render.com/web/srv-[domain-processor-id]"
echo ""
echo "Once deployed, test with:"
echo "python3 test_production_llms.py"
echo ""
echo "🧮 TENSOR INTEGRITY REQUIREMENT:"
echo "================================"
echo "ALL 11 LLMs MUST WORK or the tensor breaks!"
echo "Current: 8/11 ❌"
echo "Target: 11/11 ✅"
#!/bin/bash

echo "🚀 DEPLOYING 16+ LLM VOLATILITY SWARM"
echo "====================================="

# Check current API keys
echo "Checking available API keys..."
env | grep -E "_API_KEY" | grep -E "(OPENAI|ANTHROPIC|TOGETHER|COHERE|MISTRAL|GOOGLE|GROQ|DEEPSEEK|PERPLEXITY|XAI|AI21)" | sed 's/=.*/=<present>/' | sort

echo ""
echo "📊 Expected Model Coverage:"
echo "=========================="
echo "✅ OpenAI: 4 models (gpt-4-turbo, gpt-4o, gpt-4o-mini, gpt-3.5-turbo)"
echo "✅ Anthropic: 3 models (claude-3-opus, claude-3.5-sonnet, claude-3-haiku)"
echo "✅ Together: 4 models (llama-3.1-70b, mixtral-8x22b, qwen-2.5-72b, llama-3-8b)"
echo "✅ Cohere: 3 models (command-r-plus, command-r, command-light)"
echo "✅ Mistral: 3 models (mistral-large, mistral-medium, mistral-small)"
echo "✅ Google: 3 models (gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro)"
echo "✅ Groq: 2 models (llama-3.1-70b-versatile, mixtral-8x7b)"
echo "✅ DeepSeek: 2 models (deepseek-chat, deepseek-coder)"
echo "❓ Perplexity: 2 models (sonar-large, sonar-small) - needs API key"
echo "❓ X.AI: 1 model (grok-beta) - needs API key"
echo "❓ AI21: 1 model (j2-light) - needs API key"
echo "---"
echo "TOTAL: 26+ model variants available"

echo ""
echo "🔨 Building service..."
cd services/sophisticated-runner
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "📦 Committing changes..."
git add -A
git commit -m "Deploy 16+ LLM volatility swarm with intelligent tiering

- Added VolatilitySwarm engine with 26+ model support
- Intelligent tiering based on domain volatility scores
- SEO opportunity detection and competitive analysis
- BrandSentiment.io integration ready
- Database tables for ML learning patterns
- Processing tiers: MAXIMUM (all models), HIGH, BALANCED, EFFICIENT

This will revolutionize our brand intelligence gathering!"

echo ""
echo "🚀 Pushing to production..."
git push origin main

echo ""
echo "⏳ Waiting for Render deployment (this takes 3-5 minutes)..."
echo "Monitor at: https://dashboard.render.com/web/srv-d1lfb8ur433s73dm0pi0"

echo ""
echo "📋 Test Commands:"
echo "================"
echo ""
echo "1. Check swarm metrics:"
echo "   curl https://sophisticated-runner.onrender.com/swarm/metrics"
echo ""
echo "2. Process domains with volatility tiering:"
echo "   curl -X POST https://sophisticated-runner.onrender.com/swarm/process-volatile -d '{\"limit\": 10}'"
echo ""
echo "3. Find high SEO opportunity domains:"
echo "   curl https://sophisticated-runner.onrender.com/swarm/opportunities"
echo ""
echo "4. Check specific domain volatility:"
echo "   curl https://sophisticated-runner.onrender.com/swarm/volatility/tesla.com"
echo ""
echo "5. Analyze category volatility:"
echo "   curl https://sophisticated-runner.onrender.com/swarm/category-volatility/technology"

echo ""
echo "🎯 REMEMBER TO ADD MISSING API KEYS:"
echo "- AI21_API_KEY"
echo "- PERPLEXITY_API_KEY  "
echo "- XAI_API_KEY"
echo ""
echo "Once added, you'll have 26+ models in your swarm!"
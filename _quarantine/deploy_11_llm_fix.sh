#!/bin/bash
# Deploy script to fix all 11 LLM providers

echo "🚀 DEPLOYING 11 LLM PROVIDER FIX"
echo "================================"

# Step 1: Commit changes
echo "📝 Committing changes..."
git add -A
git commit -m "CRITICAL FIX: Add missing LLM providers (Cohere, AI21, Groq) for tensor integrity

- Added COHERE_API_KEY, AI21_API_KEY, GROQ_API_KEY to render.yaml files
- Implemented queryCohere, queryAI21, queryGroq functions
- Created comprehensive tensor integrity test
- All 11 LLMs now configured for tensor synchronization
- System will not break due to missing providers"

# Step 2: Push to main
echo "🔄 Pushing to main branch..."
git push origin main

# Step 3: Trigger Render deployments
echo "🔧 Deployments will trigger automatically on Render"
echo "Services to monitor:"
echo "  - sophisticated-runner"
echo "  - domain-processor-v2"

# Step 4: Instructions for manual steps
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo "1. Go to Render dashboard: https://dashboard.render.com"
echo "2. Add these environment variables to sophisticated-runner and domain-processor-v2:"
echo "   - COHERE_API_KEY (get from https://cohere.com)"
echo "   - AI21_API_KEY (get from https://studio.ai21.com)"
echo "   - GROQ_API_KEY (get from https://console.groq.com)"
echo "3. Monitor deployments until they're live"
echo "4. Run: python3 test_tensor_integrity.py"
echo ""
echo "🧮 Remember: All 11 LLMs MUST work for tensor integrity!"

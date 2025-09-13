#!/bin/bash
# Deploy TypeScript service with all 8 LLMs

echo "🚀 DEPLOYING 8 LLM SERVICE"
echo "========================="

# Step 1: Disable Rust service
echo "1️⃣ Disabling Rust service..."
if [ -f "services/sophisticated-runner-rust/render.yaml" ]; then
    mv services/sophisticated-runner-rust/render.yaml services/sophisticated-runner-rust/render.yaml.disabled
    echo "   ✅ Rust service disabled"
fi

# Step 2: Ensure main render.yaml uses TypeScript service
echo "2️⃣ Updating main render.yaml..."
# The main render.yaml already has sophisticated-runner configured

# Step 3: Commit and push changes
echo "3️⃣ Committing changes..."
git add .
git commit -m "Enable TypeScript service with 8 LLMs - disable Rust service"
git push origin main

echo ""
echo "✅ DEPLOYMENT INITIATED!"
echo ""
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "1. Go to Render Dashboard"
echo "2. Add these missing API keys to sophisticated-runner service:"
echo "   - GOOGLE_API_KEY"
echo "   - XAI_API_KEY" 
echo "   - ANTHROPIC_API_KEY"
echo "   - TOGETHER_API_KEY"
echo "   - PERPLEXITY_API_KEY"
echo ""
echo "3. Service will auto-redeploy after adding keys"
echo "4. Monitor at: https://sophisticated-runner.onrender.com/health"
echo ""
echo "🎯 Expected result: All 8 LLMs processing in parallel!"
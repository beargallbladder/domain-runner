#!/bin/bash
# Deploy script for 11 LLM services

echo "🚀 DEPLOYING 11 LLM SERVICES"
echo "============================"
echo "Time: $(date)"
echo ""

# Show recent commits
echo "📝 Recent commits:"
git log --oneline -5
echo ""

# Add timestamp to force new deployment
echo "⏰ Adding deployment timestamp..."
echo "// Deployment trigger: $(date +%s)" >> services/sophisticated-runner/src/index.ts

# Commit and push
echo "📤 Committing and pushing..."
git add services/sophisticated-runner/src/index.ts
git commit -m "Deploy: Trigger deployment for 11 LLM fix - $(date +%s)"
git push

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "To monitor deployment status, run:"
echo "  ./deployment_monitor.sh"
echo ""
echo "Once deployed, test with:"
echo "  python3 final_11_llm_test.py"
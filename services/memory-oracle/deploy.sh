#!/bin/bash

# Memory Oracle Tensor Service Deployment Script
echo "🧠 Deploying Memory Oracle Tensor Service..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the memory-oracle directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Dependency installation failed"
    exit 1
fi

# Build the service
echo "🔨 Building Memory Oracle Tensor Service..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Render (if using Render)
if [ -f "render.yaml" ]; then
    echo "🚀 Deploying to Render..."
    # Render deployment happens automatically on git push
    echo "✅ Render deployment configured"
fi

# Test deployment locally before pushing
echo "🧪 Testing deployment locally..."
npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006/health)

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $HEALTH_CHECK)"
fi

# Stop test server
kill $SERVER_PID 2>/dev/null

echo "🎉 Memory Oracle Tensor Service deployment preparation complete!"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add . && git commit -m 'Deploy Memory Oracle Tensor Service'"
echo "2. Push to main: git push origin main"
echo "3. Monitor deployment at: https://dashboard.render.com"
echo ""
echo "Memory Oracle Tensor Service endpoints will be available at:"
echo "- Health: GET /health"
echo ""
echo "Tensor Endpoints:"
echo "- Compute All: POST /tensors/compute"
echo "- Memory Tensor: GET /tensors/memory/:domainId"
echo "- Sentiment Tensor: GET /tensors/sentiment/:domainId"
echo "- Grounding Tensor: GET /tensors/grounding/:domainId"
echo ""
echo "Algorithm Endpoints:"
echo "- Drift Detection: GET /drift/detect/:domainId"
echo "- Drift Alerts: GET /drift/alerts"
echo "- Consensus Score: GET /consensus/compute/:domainId"
echo "- Consensus Insights: GET /consensus/insights"
echo ""
echo "Analysis Endpoints:"
echo "- Domain Analysis: GET /analysis/domain/:domainId"
echo "- Batch Analysis: POST /analysis/batch"

# Make script executable
chmod +x deploy.sh
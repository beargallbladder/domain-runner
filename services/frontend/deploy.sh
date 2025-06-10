#!/bin/bash

echo "🚀 Deploying LLM PageRank Frontend to Render"
echo "============================================="

# Build the project
echo "📦 Building frontend..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📁 Built files are in ./dist/"
    echo ""
    echo "🌐 Ready for Render deployment!"
    echo "   - Service type: Static Site"
    echo "   - Build command: npm install && npm run build"
    echo "   - Publish directory: ./dist"
    echo "   - Environment: VITE_API_BASE_URL=https://llm-pagerank-public-api.onrender.com"
    echo ""
    echo "🔗 Connect your GitHub repo to Render and deploy!"
else
    echo "❌ Build failed!"
    exit 1
fi 
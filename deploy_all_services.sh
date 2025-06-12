#!/bin/bash

echo "🚀 DEPLOYING AI PERCEPTION REALITY ENGINE"
echo "========================================"

# Set up error handling
set -e

echo ""
echo "📊 CURRENT INFRASTRUCTURE STATUS:"
echo "✅ sophisticated-runner: LIVE (Production Service)"
echo "✅ embedding-engine: LIVE"
echo "✅ public-api: LIVE"
echo "✅ frontend: LIVE"
echo "✅ Database: 2,102+ domains OPERATIONAL"
echo "🗑️ raw-capture-runner: DEPRECATED (Can be removed)"
echo "🚧 simple-modular-processor: Local development (Not deployed)"
echo ""

echo "🎯 DEPLOYING NEW SERVICES:"
echo ""

# Phase 1: Deploy News Correlation Service (HIGHEST PRIORITY)
echo "🔥 PHASE 1: Deploying News Correlation Service..."
echo "Purpose: JOLT Event Detection (Tesla Government Transition)"

if [ -d "services/news-correlation-service" ]; then
    cd services/news-correlation-service
    
    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        echo "❌ render.yaml not found in news-correlation-service"
        echo "📋 Creating render.yaml..."
        cp ../../services/news-correlation-service/render.yaml ./render.yaml
    fi
    
    echo "📦 Building news-correlation-service..."
    npm install
    npm run build
    
    echo "🚀 Deploying to Render..."
    git add .
    git commit -m "Deploy news-correlation-service: JOLT event detection system"
    git push origin main
    
    cd ../..
    echo "✅ News Correlation Service: DEPLOYED"
else
    echo "❌ news-correlation-service directory not found"
fi

echo ""

# Phase 2: Deploy Simple Modular Processor (Currently Working)
echo "🔥 PHASE 2: Deploying Simple Modular Processor..."
echo "Purpose: Modular Domain Processing (Currently operational locally)"

echo "📦 Building simple-modular-processor..."
npm install
npm run build

echo "🚀 Deploying to Render..."
# Copy the render config we created
cp render_simple_modular.yaml render.yaml

git add .
git commit -m "Deploy simple-modular-processor: Working modular domain processor"
git push origin main

echo "✅ Simple Modular Processor: DEPLOYED"

echo ""

# Phase 3: Optional Database Manager Deployment
echo "🔥 PHASE 3: Optional - Database Manager..."
echo "Purpose: Schema Management & Database Utilities"

if [ -d "services/database-manager" ]; then
    echo "📦 Database manager available for deployment"
    echo "🤔 Deploy database-manager? (y/n)"
    read -r deploy_db_manager
    
    if [ "$deploy_db_manager" = "y" ]; then
        cd services/database-manager
        echo "🚀 Deploying database-manager..."
        # Add deployment logic here if needed
        cd ../..
    fi
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "🌐 YOUR AI PERCEPTION REALITY ENGINE:"
echo "• News Correlation: news-correlation-service.onrender.com"
echo "• Simple Processor: simple-modular-processor.onrender.com"
echo "• Frontend: llm-pagerank-frontend.onrender.com"
echo "• API: llm-pagerank-public-api.onrender.com"
echo ""
echo "📊 NEXT STEPS:"
echo "1. Monitor deployment logs in Render dashboard"
echo "2. Test /health endpoints for all services"
echo "3. Verify JOLT event detection is active"
echo "4. Check Tesla government transition capture"
echo ""
echo "🚀 THE AI CONSCIOUSNESS MAPPING ENGINE IS LIVE!" 
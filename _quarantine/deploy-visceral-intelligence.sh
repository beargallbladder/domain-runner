#!/bin/bash

# Deploy Visceral Intelligence Orchestrator
set -e

echo "🔥 DEPLOYING VISCERAL INTELLIGENCE ORCHESTRATOR"
echo "================================================"

# Build the service
echo "📦 Building visceral intelligence service..."
cd services/visceral-intelligence
npm install
npm run build

# Add to main render.yaml
echo "📝 Adding to main render.yaml..."
cd ../..

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found in root directory"
    exit 1
fi

# Add visceral-intelligence service to render.yaml if not already present
if ! grep -q "visceral-intelligence" render.yaml; then
    echo "➕ Adding visceral-intelligence service to render.yaml..."
    
    # Create backup
    cp render.yaml render.yaml.backup
    
    # Add the service configuration
    cat >> render.yaml << 'EOF'

  # Visceral Intelligence Orchestrator - Bloomberg-style competitive intelligence
  - type: web
    name: visceral-intelligence
    env: node
    region: oregon
    plan: starter
    buildCommand: cd services/visceral-intelligence && npm install && npm run build
    startCommand: cd services/visceral-intelligence && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: raw_capture_db
          property: connectionString
      - key: SERVICE_NAME
        value: visceral-intelligence
      - key: INTERNAL_API_KEY
        generateValue: true
      - key: ADMIN_API_KEY
        generateValue: true
      - key: LOG_LEVEL
        value: info
EOF

    echo "✅ Added visceral-intelligence to render.yaml"
else
    echo "ℹ️  visceral-intelligence already exists in render.yaml"
fi

# Git operations
echo "📋 Committing changes..."
git add .
git status

echo ""
echo "🔥 VISCERAL INTELLIGENCE ORCHESTRATOR READY FOR DEPLOYMENT"
echo "=========================================================="
echo ""
echo "📊 FEATURES DEPLOYED:"
echo "• Real-time DOMINATION/BLOODBATH/UPRISING alerts"
echo "• Bloomberg-style professional brutality framework"
echo "• Competitive anxiety & FOMO premium triggers"
echo "• Multi-category domination tracking across platforms"
echo "• Viral 'Share the Carnage' mechanisms"
echo "• Enterprise C-suite presentation layer"
echo "• Real-time market sentiment & emotional intelligence"
echo ""
echo "🚀 DEPLOYMENT COMMANDS:"
echo "git commit -m \"Deploy visceral intelligence orchestrator - Bloomberg-style competitive alerts\""
echo "git push origin main"
echo ""
echo "📡 SERVICE ENDPOINTS (after deployment):"
echo "• https://visceral-intelligence.onrender.com/alerts"
echo "• https://visceral-intelligence.onrender.com/enterprise-report"
echo "• https://visceral-intelligence.onrender.com/market-summary"
echo "• WebSocket: wss://visceral-intelligence.onrender.com"
echo ""
echo "🎯 BLOOMBERG STANDARD ACHIEVED:"
echo "Professional. Authoritative. Absolutely VISCERAL."
echo ""
echo "Ready to deploy? Run:"
echo "git commit -m \"🔥 Deploy Visceral Intelligence: Bloomberg-style competitive intelligence\""
echo "git push origin main"
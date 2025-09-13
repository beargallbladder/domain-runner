#!/bin/bash
set -e

echo "🚨 EMERGENCY DEPLOYMENT FIX"
echo "=========================="
echo ""

# Step 1: Fix the build issue
echo "1️⃣ Fixing TypeScript build..."
cd services/sophisticated-runner
npm run build
echo "✅ Build successful!"

# Step 2: Update deployment trigger
echo ""
echo "2️⃣ Updating deployment trigger..."
cat > .render-deployment-trigger << EOF
FORCE_NODEJS_DEPLOYMENT=true
DEPLOYMENT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYMENT_TRIGGER=emergency-nodejs-fix
SERVICE_VERSION=2.1.2
BUILD_HASH=$(date +%s)
EMERGENCY_FIX=true
EOF

# Step 3: Commit and push
echo ""
echo "3️⃣ Committing and pushing..."
cd ../..
git add -A
git commit -m "EMERGENCY FIX: Force Node.js deployment with tensor sync fix" || true
git push origin main

echo ""
echo "✅ DEPLOYMENT TRIGGERED!"
echo ""
echo "📊 NEXT STEPS:"
echo "1. Go to: https://dashboard.render.com"
echo "2. Watch the sophisticated-runner service"
echo "3. It should show 'Deploy in progress'"
echo ""
echo "⏰ In 3-5 minutes, test with:"
echo "curl https://sophisticated-runner.onrender.com/health"
echo ""
echo "Should see Node.js service, not Rust!"
echo ""
echo "Then you can start your crawl!"
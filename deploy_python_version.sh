#!/bin/bash
# Deploy the Python version of domain-runner

echo "🐍 DEPLOYING PYTHON VERSION"
echo "==========================="
echo ""

# Python deployment uses render.yaml (not render-rust.yaml)
DEPLOY_URL="https://render.com/deploy?repo=https://github.com/beargallbladder/domain-runner"
WEB_URL="https://domain-runner-web.onrender.com"  # Note: Python version uses different name

echo "Repository is now PUBLIC ✅"
echo ""
echo "Python version configuration:"
echo "  - Web service: domain-runner-web"
echo "  - Worker service: domain-runner-worker"
echo "  - Database: domain-runner-db (user: nexus)"
echo "  - Blueprint: render.yaml"
echo ""
echo "Opening deployment URL..."
open "$DEPLOY_URL" 2>/dev/null || echo "Open: $DEPLOY_URL"

echo ""
echo "📋 DEPLOYMENT STEPS:"
echo "1. Click 'Create Services' in Render dashboard"
echo "2. Services will use render.yaml (Python version)"
echo "3. Wait 3-5 minutes for deployment"
echo ""
echo "Monitoring Python deployment..."

attempts=0
max_attempts=40

while [ $attempts -lt $max_attempts ]; do
    attempts=$((attempts + 1))
    echo -n "Check $attempts/$max_attempts: "

    # Check Python web service
    response=$(curl -s -o /dev/null -w "%{http_code}" ${WEB_URL}/healthz 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo "✅ PYTHON SERVICE IS LIVE!"
        echo ""
        echo "Getting status..."
        curl -s ${WEB_URL}/status | python3 -m json.tool || echo "Status endpoint not ready yet"

        echo ""
        echo "🎉 Python deployment successful!"
        echo "Endpoints:"
        echo "  Web: ${WEB_URL}"
        echo "  Health: ${WEB_URL}/healthz"
        echo "  Status: ${WEB_URL}/status"
        exit 0
    else
        echo "HTTP $response - waiting 30s..."
    fi

    sleep 30
done

echo "Deployment monitoring timeout"
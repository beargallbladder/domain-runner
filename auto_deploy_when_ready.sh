#!/bin/bash
# Auto-deploy the moment repository becomes accessible

echo "🔥 AUTO-DEPLOY WHEN READY"
echo "========================="
echo ""
echo "FOUND THE ISSUE: Repository is PRIVATE!"
echo ""
echo "To fix, do ONE of these:"
echo ""
echo "1️⃣  Make repo PUBLIC:"
echo "   👉 https://github.com/beargallbladder/domain-runner/settings"
echo "   Scroll to 'Danger Zone' → 'Change visibility' → 'Public'"
echo ""
echo "2️⃣  Connect GitHub to Render:"
echo "   👉 https://dashboard.render.com/account/github"
echo "   Click 'Connect GitHub Account'"
echo ""
echo "Monitoring repository accessibility..."
echo ""

REPO_API="https://api.github.com/repos/beargallbladder/domain-runner"
DEPLOY_URL="https://render.com/deploy?repo=https://github.com/beargallbladder/domain-runner"
WEB_URL="https://domain-runner-rust-web.onrender.com"

# Monitor repo accessibility
while true; do
    echo -n "$(date '+%H:%M:%S') - Checking repo: "

    # Check if repo is accessible
    status=$(curl -s -o /dev/null -w "%{http_code}" $REPO_API)

    if [ "$status" = "200" ]; then
        echo "✅ REPO IS PUBLIC! Deploying..."

        # Open deployment URL
        if command -v open &> /dev/null; then
            open "$DEPLOY_URL"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "$DEPLOY_URL"
        fi

        echo ""
        echo "🚀 DEPLOYMENT TRIGGERED!"
        echo "Deploy URL opened: $DEPLOY_URL"
        echo ""
        echo "Waiting 2 minutes for deployment to start..."
        sleep 120

        # Monitor deployment
        echo "Monitoring deployment progress..."
        attempts=0
        max_attempts=30

        while [ $attempts -lt $max_attempts ]; do
            attempts=$((attempts + 1))
            echo -n "Check $attempts/$max_attempts: "

            health=$(curl -s -o /dev/null -w "%{http_code}" ${WEB_URL}/healthz)

            if [ "$health" = "200" ]; then
                echo "✅ SERVICE IS LIVE!"
                echo ""
                echo "🎉 DEPLOYMENT SUCCESSFUL!"
                echo ""

                # Get status
                echo "Service Status:"
                curl -s ${WEB_URL}/status | python3 -m json.tool | head -20

                echo ""
                echo "Endpoints:"
                echo "  Web: ${WEB_URL}"
                echo "  Health: ${WEB_URL}/healthz"
                echo "  Status: ${WEB_URL}/status"

                exit 0
            else
                echo "HTTP $health - waiting 30s..."
            fi

            sleep 30
        done

        echo "Deployment monitoring timeout"
        exit 1
    else
        echo "Still private (HTTP $status)"
    fi

    sleep 10
done
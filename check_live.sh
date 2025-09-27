#!/bin/bash
# Check deployment status

URL="https://domain-runner-rust-web.onrender.com"

echo "🔍 Checking deployment status..."
echo ""

for i in {1..20}; do
    echo -n "Attempt $i/20: "

    response=$(curl -s -o /dev/null -w "%{http_code}" ${URL}/healthz 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo "✅ SERVICE IS LIVE!"
        echo ""
        echo "📊 Service Status:"
        curl -s ${URL}/status | python3 -m json.tool
        echo ""
        echo "🎯 Deployment successful!"
        echo "Web UI: ${URL}"
        echo "Health: ${URL}/healthz"
        echo "Ready: ${URL}/readyz"
        echo "Status: ${URL}/status"
        exit 0
    else
        echo "HTTP $response - Service not ready. Waiting 30s..."
    fi

    sleep 30
done

echo "❌ Deployment timeout after 10 minutes"
exit 1
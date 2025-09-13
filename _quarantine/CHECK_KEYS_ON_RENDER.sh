#!/bin/bash
# CHECK WHAT KEYS ACTUALLY EXIST ON RENDER

echo "🔑 CHECKING API KEYS ON RENDER"
echo "=============================="
echo ""
echo "Wait ~5 mins for deployment, then this will show:"
echo "- Which providers have keys"
echo "- Which keys actually work"
echo "- Exact error messages"
echo ""

# Check if endpoint exists
echo "Testing if deployment is ready..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://domain-runner.onrender.com/test-all-keys)

if [ "$STATUS" = "200" ]; then
    echo "✅ Endpoint ready! Testing all keys..."
    echo ""
    curl -s https://domain-runner.onrender.com/test-all-keys | jq '.'
else
    echo "❌ Endpoint not ready yet (HTTP $STATUS)"
    echo ""
    echo "Deployment still in progress. Try again in a few minutes."
    echo "Or check deployment status at: https://dashboard.render.com"
fi
#!/bin/bash
# TEST WHAT KEYS ACTUALLY EXIST ON RENDER

echo "🔑 TESTING API KEYS ON RENDER"
echo "============================"
echo ""
echo "This will show you EXACTLY what's configured on Render"
echo ""

# Test the endpoint
echo "📡 Calling https://domain-runner.onrender.com/test-all-keys"
echo ""

curl -s https://domain-runner.onrender.com/test-all-keys | jq '.'

echo ""
echo "👆 This shows:"
echo "- Which providers have keys configured"
echo "- Which keys actually work when called"
echo "- The exact error messages for broken ones"
echo ""
echo "If this endpoint doesn't exist yet, deploy first with:"
echo "git add . && git commit -m 'Add key testing endpoint' && git push"
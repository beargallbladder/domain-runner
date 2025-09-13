#!/bin/bash

echo "🔍 Verifying sophisticated-runner deployment..."
echo "=============================================="

# Check health endpoint
echo "1. Checking health endpoint..."
response=$(curl -s https://sophisticated-runner.onrender.com/health)
echo "$response" | jq . 2>/dev/null || echo "$response"

# Check if it's the new Node.js service
if echo "$response" | grep -q "providers"; then
    echo ""
    echo "✅ NEW Node.js service is deployed!"
    echo ""
    echo "2. Checking LLM providers..."
    providers=$(echo "$response" | jq -r '.providers[]' 2>/dev/null)
    if [ -n "$providers" ]; then
        echo "$providers"
        count=$(echo "$providers" | wc -l)
        echo ""
        echo "Total active providers: $count"
    fi
elif echo "$response" | grep -q "sophisticated-runner-rust"; then
    echo ""
    echo "❌ OLD Rust service is still running"
    echo "The new Node.js deployment hasn't completed yet."
    echo ""
    echo "Check deployment status at:"
    echo "https://dashboard.render.com"
else
    echo ""
    echo "⚠️  Unknown service response"
fi

echo ""
echo "3. Checking pending domains..."
curl -s https://sophisticated-runner.onrender.com/api/pending-count | jq . 2>/dev/null || echo "Endpoint not available"

echo ""
echo "=============================================="
echo "Latest commit: $(git log --oneline -1)"
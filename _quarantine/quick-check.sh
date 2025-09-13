#!/bin/bash

# Quick service status checker
echo "🔍 Checking sophisticated-runner status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check health
echo -n "Health: "
curl -s https://sophisticated-runner.onrender.com/health | jq -r '.status' || echo "FAILED"

# Check provider status
echo ""
echo "LLM Providers:"
response=$(curl -s https://sophisticated-runner.onrender.com/provider-status 2>/dev/null)

if [ -n "$response" ]; then
    active=$(echo "$response" | jq -r '.active_providers[]' 2>/dev/null | wc -l)
    echo "✅ Active: $active providers"
    echo "$response" | jq -r '.active_providers[]' 2>/dev/null | sed 's/^/  - /'
    
    inactive=$(echo "$response" | jq -r '.inactive_providers[]' 2>/dev/null | wc -l)
    if [ "$inactive" -gt 0 ]; then
        echo ""
        echo "❌ Inactive: $inactive providers"
        echo "$response" | jq -r '.inactive_providers[]' 2>/dev/null | sed 's/^/  - /'
    fi
else
    echo "Provider status endpoint not available"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Latest commit: $(git log --oneline -1)"
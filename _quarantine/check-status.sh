#!/bin/bash

echo "🔍 Domain Runner Status Check"
echo "============================"
echo ""

# Service health
echo "1️⃣ Service Health:"
HEALTH=$(curl -s https://domain-runner.onrender.com/health)
if [ $? -eq 0 ]; then
    echo "✅ Service is UP"
    echo "$HEALTH" | jq -r '.providers[]' | sed 's/^/   - /' | head -5
    PROVIDER_COUNT=$(echo "$HEALTH" | jq -r '.providers | length')
    echo "   ... and $(($PROVIDER_COUNT - 5)) more providers"
else
    echo "❌ Service is DOWN"
fi

echo ""
echo "2️⃣ Pending Domains:"
PENDING=$(curl -s https://domain-runner.onrender.com/api/pending-count | jq -r '.pending')
echo "   Pending: $PENDING domains"
if [ "$PENDING" -gt 0 ]; then
    HOURS=$(echo "scale=1; $PENDING / 600" | bc)
    echo "   Est. time: $HOURS hours at current speed"
fi

echo ""
echo "3️⃣ Processing Speed:"
echo "   Current: 5 domains/30 seconds"
echo "   Rate: 600 domains/hour"

echo ""
echo "4️⃣ Latest Code:"
LATEST=$(git log --oneline -1)
echo "   $LATEST"

echo ""
echo "============================"
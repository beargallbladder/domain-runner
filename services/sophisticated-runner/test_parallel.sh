#!/bin/bash

# ============================================================================
# PARALLEL SERVICE VALIDATION SCRIPT
# ============================================================================
# Test both sophisticated-runner and raw-capture-runner in parallel
# ============================================================================

echo "🧪 TESTING PARALLEL SERVICES"
echo "============================================"

# Service URLs (update these based on actual deployment)
SOPHISTICATED_URL="https://sophisticated-runner.onrender.com"
RAW_CAPTURE_URL="https://raw-capture-runner.onrender.com"

echo "🔍 Testing Service Health..."

# Test sophisticated-runner
echo "📊 Sophisticated Runner:"
curl -s "$SOPHISTICATED_URL/" | python3 -m json.tool 2>/dev/null || echo "❌ Service not responding"

echo ""
echo "📊 Raw Capture Runner:"
curl -s "$RAW_CAPTURE_URL/" | python3 -m json.tool 2>/dev/null || echo "❌ Service not responding"

echo ""
echo "🔍 Comparing Service Status..."

# Get status from both services
echo "📊 Sophisticated Runner Status:"
curl -s "$SOPHISTICATED_URL/status" | python3 -m json.tool 2>/dev/null || echo "❌ Status not available"

echo ""
echo "📊 Raw Capture Runner Status:"
curl -s "$RAW_CAPTURE_URL/status" | python3 -m json.tool 2>/dev/null || echo "❌ Status not available"

echo ""
echo "✅ Parallel testing complete!"
echo ""
echo "🎯 Key Validation Points:"
echo "   1. Both services should be healthy"
echo "   2. Different processor_ids (sophisticated_v1 vs default)"
echo "   3. Different domain counts (500+ vs 351)"
echo "   4. Same database connection"
echo "   5. Independent processing loops"
echo ""
echo "🔄 Monitor both services to prove equivalence!" 
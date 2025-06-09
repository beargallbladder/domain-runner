#!/bin/bash

echo "🧪 TESTING PARALLEL SERVICES DEPLOYMENT"
echo "========================================"

echo "📊 Testing Sophisticated Runner..."
curl -s https://sophisticated-runner.onrender.com/ | python3 -m json.tool 2>/dev/null || echo "❌ Not responding yet"

echo ""
echo "📊 Testing Raw Capture Runner (existing)..."  
curl -s https://raw-capture-runner.onrender.com/ | python3 -m json.tool 2>/dev/null || echo "❌ Not responding"

echo ""
echo "🔍 Comparing Status..."
echo "Sophisticated Runner Status:"
curl -s https://sophisticated-runner.onrender.com/status | python3 -m json.tool 2>/dev/null || echo "❌ Status not ready"

echo ""
echo "Raw Capture Runner Status:"
curl -s https://raw-capture-runner.onrender.com/status | python3 -m json.tool 2>/dev/null || echo "❌ Status not available"

echo ""
echo "🎯 SUCCESS CRITERIA:"
echo "✅ Both services should respond with 200 OK"
echo "✅ Different processor_ids (sophisticated_v1 vs default)"  
echo "✅ Same database connection"
echo "✅ Sophisticated runner: 500+ domains"
echo "✅ Raw capture runner: ~351 domains" 
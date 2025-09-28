#!/bin/bash
# Comprehensive deployment validation

echo "🔍 DEPLOYMENT VALIDATION"
echo "========================"
echo ""

# Service URLs
PYTHON_WEB="https://domain-runner-web.onrender.com"
RUST_WEB="https://domain-runner-rust-web.onrender.com"

echo "Checking which services are responding..."
echo ""

# Function to test endpoint
test_endpoint() {
    local url=$1
    local desc=$2

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo "✅ $desc: $url (HTTP $response)"
        return 0
    elif [ "$response" = "502" ] || [ "$response" = "503" ]; then
        echo "⚠️ $desc: $url (HTTP $response - Starting up)"
        return 1
    elif [ "$response" = "404" ]; then
        echo "❌ $desc: $url (HTTP $response - Not deployed)"
        return 1
    else
        echo "❓ $desc: $url (HTTP $response)"
        return 1
    fi
}

# Test Python services
echo "PYTHON SERVICES:"
echo "----------------"
test_endpoint "$PYTHON_WEB/healthz" "Health Check"
PYTHON_HEALTH=$?

if [ $PYTHON_HEALTH -eq 0 ]; then
    test_endpoint "$PYTHON_WEB/readyz" "Readiness"
    test_endpoint "$PYTHON_WEB/status" "Status"

    echo ""
    echo "📊 Python Service Status:"
    curl -s "$PYTHON_WEB/status" 2>/dev/null | python3 -m json.tool | head -20 || echo "  Could not get status"
fi

echo ""

# Test Rust services
echo "RUST SERVICES:"
echo "--------------"
test_endpoint "$RUST_WEB/healthz" "Health Check"
RUST_HEALTH=$?

if [ $RUST_HEALTH -eq 0 ]; then
    test_endpoint "$RUST_WEB/readyz" "Readiness"
    test_endpoint "$RUST_WEB/status" "Status"

    echo ""
    echo "📊 Rust Service Status:"
    curl -s "$RUST_WEB/status" 2>/dev/null | python3 -m json.tool | head -20 || echo "  Could not get status"
fi

echo ""
echo "DEPLOYMENT STATUS:"
echo "==================="

if [ $PYTHON_HEALTH -eq 0 ]; then
    echo "✅ Python services are LIVE at: $PYTHON_WEB"
elif [ $RUST_HEALTH -eq 0 ]; then
    echo "✅ Rust services are LIVE at: $RUST_WEB"
else
    echo "⏳ Services are still deploying..."
    echo ""
    echo "This is normal for first deployment. Rust compilation takes 10-15 minutes."
    echo "Python services should be faster (3-5 minutes)."
    echo ""
    echo "Check Render dashboard for build logs."
fi

echo ""
echo "Monitoring will continue in background..."
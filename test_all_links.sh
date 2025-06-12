#!/bin/bash

echo "🔗 COMPREHENSIVE LINK TESTING - LLM PageRank"
echo "=============================================="

API_BASE="https://llm-pagerank-public-api.onrender.com"
FRONTEND_BASE="https://llmpagerank.com"

echo ""
echo "📡 Testing API Endpoints..."

# Test Health Check
echo -n "Health Check: "
if curl -s "$API_BASE/health" | grep -q "healthy"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test Ticker
echo -n "Ticker API: "
if curl -s "$API_BASE/api/ticker?limit=5" | grep -q "topDomains"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test Categories
echo -n "Categories API: "
if curl -s "$API_BASE/api/categories" | grep -q "categories"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test Rankings
echo -n "Rankings API: "
if curl -s "$API_BASE/api/rankings?limit=5" | grep -q "domains"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test Shadows
echo -n "Shadows API: "
if curl -s "$API_BASE/api/shadows" | grep -q "declining"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

# Test Domain Details (use a known domain)
echo -n "Domain Details API: "
if curl -s "$API_BASE/api/domains/facebook.com/public" | grep -q "memory_score"; then
    echo "✅ PASS"
else
    echo "❌ FAIL"
fi

echo ""
echo "🎯 Testing Frontend Routes..."

# Test main routes by checking if they return HTML (not 404)
routes=(
    "/"
    "/categories"
    "/rankings"
    "/shadows"
    "/about"
    "/domain/facebook.com"
    "/domain/google.com"
    "/domain/apple.com"
)

for route in "${routes[@]}"; do
    echo -n "Route $route: "
    status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_BASE$route")
    if [ "$status" = "200" ]; then
        echo "✅ PASS ($status)"
    else
        echo "❌ FAIL ($status)"
    fi
done

echo ""
echo "🔍 Testing Specific Domain Pages..."

# Test domain pages for various companies
domains=(
    "openai.com"
    "microsoft.com"
    "apple.com"
    "tesla.com"
    "facebook.com"
    "google.com"
    "amazon.com"
    "netflix.com"
)

for domain in "${domains[@]}"; do
    echo -n "Domain $domain: "
    if curl -s "$API_BASE/api/domains/$domain/public" | grep -q "memory_score"; then
        echo "✅ API OK"
    else
        echo "❌ API FAIL"
    fi
done

echo ""
echo "📊 API Performance Check..."

start_time=$(date +%s.%N)
curl -s "$API_BASE/api/ticker?limit=10" > /dev/null
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
echo "Ticker API Response Time: ${duration}s"

start_time=$(date +%s.%N)
curl -s "$API_BASE/api/rankings?limit=20" > /dev/null
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
echo "Rankings API Response Time: ${duration}s"

echo ""
echo "✅ Link Testing Complete!"
echo ""
echo "📈 Recommendations:"
echo "1. All main navigation routes should return 200"
echo "2. All API endpoints should return valid JSON"
echo "3. Domain pages should work for major brands"
echo "4. API response times should be under 2 seconds"
echo "" 
#!/bin/bash

# ============================================================================
# INDUSTRY INTELLIGENCE - FOUNDATIONAL TEST SCRIPT
# ============================================================================

echo "🔬 Testing Industry Intelligence Foundation"
echo "=========================================="

BASE_URL="http://localhost:10001"
if [ "$1" != "" ]; then
    BASE_URL="$1"
fi

echo "🎯 Testing against: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Test helper function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    print_test "$description"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$BASE_URL$endpoint" \
                   -H "Content-Type: application/json" \
                   -d "$data")
    fi
    
    http_code=$(echo "$response" | grep -o 'HTTPSTATUS:[0-9]*' | cut -d: -f2)
    response_body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$http_code" -eq 200 ]; then
        print_success "✅ HTTP $http_code - Success"
        echo "$response_body" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))" 2>/dev/null | head -15
        echo "..."
    else
        print_error "❌ HTTP $http_code - Failed"
        echo "$response_body" | head -5
    fi
    
    echo ""
}

echo -e "${BLUE}🏥 FOUNDATION HEALTH TESTS${NC}"
echo "============================="

test_endpoint "GET" "/health" "" "Service Health Check"
test_endpoint "GET" "/" "" "Service Information"

echo -e "${BLUE}🏭 INDUSTRY CONFIGURATION TESTS${NC}"
echo "==============================="

test_endpoint "GET" "/industries" "" "Get All Industries"
test_endpoint "GET" "/industries/technology" "" "Get Technology Industry"
test_endpoint "GET" "/industries/financial_services" "" "Get Financial Services Industry"
test_endpoint "GET" "/industries/nonexistent" "" "Get Non-existent Industry (should 404)"

echo -e "${BLUE}⚡ JOLT BENCHMARK TESTS${NC}"
echo "======================"

test_endpoint "GET" "/benchmarks" "" "Get All JOLT Benchmarks"
test_endpoint "GET" "/benchmarks/industry/technology" "" "Get Technology Industry Benchmarks"
test_endpoint "GET" "/jolt/domains" "" "Get All JOLT Domains"
test_endpoint "GET" "/jolt/check/facebook.com" "" "Check Facebook.com (should be JOLT)"
test_endpoint "GET" "/jolt/check/google.com" "" "Check Google.com (should be JOLT)"
test_endpoint "GET" "/jolt/check/twitter.com" "" "Check Twitter.com (should be JOLT)"
test_endpoint "GET" "/jolt/check/random-domain.com" "" "Check Random Domain (should not be JOLT)"

echo -e "${BLUE}📊 ANALYSIS TESTS${NC}"
echo "=================="

test_endpoint "POST" "/analysis/compare" '{
  "domain": "test-company.com",
  "current_score": 75,
  "industry": "technology"
}' "Compare Domain to Technology Benchmarks"

test_endpoint "POST" "/analysis/compare" '{
  "domain": "financial-test.com", 
  "current_score": 68,
  "industry": "financial_services"
}' "Compare Domain to Financial Services Benchmarks"

test_endpoint "POST" "/analysis/compare" '{
  "domain": "invalid-test.com",
  "current_score": 50
}' "Compare Domain Without Industry (should 400)"

echo -e "${GREEN}🎉 FOUNDATION TESTING COMPLETE${NC}"
echo "================================"

print_info "All foundational tests completed!"
print_info "Key endpoints tested:"
print_info "• Health check: $BASE_URL/health"
print_info "• Industries: $BASE_URL/industries"
print_info "• JOLT domains: $BASE_URL/jolt/domains"
print_info "• JOLT check: $BASE_URL/jolt/check/{domain}"
print_info "• Benchmarks: $BASE_URL/benchmarks"
print_info "• Analysis: POST $BASE_URL/analysis/compare"

echo ""
print_info "Foundation service is ready for feature development! 🚀" 
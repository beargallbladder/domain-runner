#!/bin/bash

# 🔬 JOLT FUNCTIONALITY TEST SCRIPT
# Tests the new ground truth benchmarking features in sophisticated-runner

echo "🔬 Testing Jolt Functionality in Sophisticated Runner"
echo "===================================================="

BASE_URL="http://localhost:10000"
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

# Test 1: Service Health
print_test "1. Service Health Check"
response=$(curl -s "$BASE_URL/health")
if [[ $response == *"healthy"* ]]; then
    print_success "Service is healthy"
else
    print_error "Service health check failed"
    echo "$response"
fi
echo ""

# Test 2: Jolt Domains Overview
print_test "2. Jolt Domains Overview"
response=$(curl -s "$BASE_URL/jolt")
if [[ $response == *"Ground Truth Benchmarking"* ]]; then
    print_success "Jolt endpoint responding"
    echo "$response" | jq '.total_jolt_domains, .schema_support' 2>/dev/null || echo "$response" | head -5
else
    print_error "Jolt endpoint failed"
    echo "$response"
fi
echo ""

# Test 3: Brand Transitions
print_test "3. Brand Transition Analysis"
response=$(curl -s "$BASE_URL/jolt/transitions")
if [[ $response == *"transitions"* ]]; then
    print_success "Transition analysis working"
    echo "$response" | jq '.total_transitions' 2>/dev/null || echo "$response" | head -3
else
    print_error "Transition analysis failed"
    echo "$response"
fi
echo ""

# Test 4: Schema Migration (Optional - only if you want to test)
if [ "$2" == "--migrate" ]; then
    print_test "4. Schema Migration (OPTIONAL)"
    response=$(curl -s -X POST "$BASE_URL/migrate/jolt-schema")
    if [[ $response == *"migration"* ]]; then
        print_success "Schema migration completed"
        echo "$response" | jq '.message' 2>/dev/null || echo "$response" | head -3
    else
        print_error "Schema migration failed"
        echo "$response"
    fi
    echo ""
fi

# Test 5: Status Check
print_test "5. Service Status"
response=$(curl -s "$BASE_URL/status")
if [[ $response == *"sophisticated-runner"* ]]; then
    print_success "Status endpoint working"
    echo "$response" | jq '.service, .mode' 2>/dev/null || echo "$response" | head -3
else
    print_error "Status endpoint failed"
    echo "$response"
fi
echo ""

echo "🎉 Jolt Testing Complete!"
echo ""
echo "📖 Jolt Endpoints:"
echo "• Jolt Overview: $BASE_URL/jolt"
echo "• Transitions: $BASE_URL/jolt/transitions"
echo "• Schema Migration: POST $BASE_URL/migrate/jolt-schema"
echo ""
echo "🔬 Jolt Domains Included:"
echo "• facebook.com → meta.com (Meta rebrand)"
echo "• google.com → alphabet.com (Alphabet restructure)"
echo "• twitter.com → x.com (X rebrand)"
echo "• weightwatchers.com → ww.com (WW simplification)"
echo "• dunkindonuts.com → dunkin.com (Dunkin simplification)"
echo ""
echo "✅ Ready for ground truth benchmarking!" 
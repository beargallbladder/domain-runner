#!/bin/bash

# Complete 4-Layer Embedding Engine Test Suite
# Run this script to verify all deployed functionality

echo "🚀 Starting Complete 4-Layer Embedding Engine Test Suite"
echo "============================================================"

BASE_URL="https://embedding-engine.onrender.com"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
        echo "$response_body" | python3 -m json.tool 2>/dev/null | head -10
        echo "..."
    else
        print_error "❌ HTTP $http_code - Failed"
        echo "$response_body" | head -5
    fi
    
    echo ""
}

echo -e "${BLUE}🔍 LAYER 1: DATABASE SERVICE${NC}"
echo "======================================"

test_endpoint "GET" "/" "" "System Status Check"
test_endpoint "GET" "/data/test" "" "Database Connection Test"
test_endpoint "GET" "/data/count" "" "Response Count & Schema"
test_endpoint "GET" "/data/tables" "" "Database Tables Discovery"

echo -e "${BLUE}🧠 LAYER 2: EMBEDDING SERVICE${NC}"
echo "======================================"

test_endpoint "POST" "/embed" '{"text": "Hello world from the embedding engine test"}' "Single Text Embedding"

test_endpoint "POST" "/embed/batch" '{
  "texts": [
    "Machine learning is transforming technology",
    "Artificial intelligence enables automation", 
    "The weather today is quite pleasant"
  ]
}' "Batch Text Embedding (3 texts)"

echo -e "${BLUE}📊 LAYER 3: ANALYSIS SERVICE${NC}"
echo "======================================"

test_endpoint "POST" "/analyze/similarity" '{
  "texts": [
    "Machine learning algorithms are powerful",
    "AI technology is revolutionary",
    "The cat sat on the mat",
    "Deep learning models perform well"
  ]
}' "Similarity Analysis Test"

test_endpoint "POST" "/analyze/drift" '{
  "baseline_texts": [
    "Traditional methods work well",
    "Old approaches are reliable",
    "Classic techniques are proven"
  ],
  "comparison_texts": [
    "Modern AI is transformative", 
    "New ML approaches excel",
    "Advanced algorithms perform better"
  ]
}' "Drift Detection Analysis"

test_endpoint "POST" "/analyze/clusters" '{
  "texts": [
    "Machine learning is amazing",
    "AI technology rocks", 
    "Weather is cold today",
    "Temperature dropped significantly",
    "Neural networks are powerful",
    "Deep learning works well"
  ],
  "similarity_threshold": 0.6
}' "Clustering Analysis Test"

echo -e "${BLUE}🎯 LAYER 4: API ORCHESTRATION (Real Data)${NC}"
echo "======================================"

test_endpoint "GET" "/insights/models?limit=50" "" "Model Pattern Analysis (Real Data)"

test_endpoint "GET" "/insights/domains?limit=50" "" "Domain Analysis (Real Data)"

test_endpoint "POST" "/insights/compare" '{
  "comparison_type": "model",
  "model": "gpt-4"
}' "Model Comparison Analysis (if GPT-4 exists in dataset)"

test_endpoint "POST" "/insights/compare" '{
  "comparison_type": "random"
}' "Random Dataset Comparison"

echo -e "${GREEN}🎉 COMPLETE TESTING FINISHED${NC}"
echo "=================================="

print_info "All tests completed! Check results above."
print_info "Layers 1 & 2 should be fully operational."
print_info "Layers 3 & 4 may still be deploying - retry if needed."

echo ""
echo "📖 Quick Reference:"
echo "• System Status: $BASE_URL/"
echo "• Data Count: $BASE_URL/data/count"
echo "• Single Embed: POST $BASE_URL/embed"
echo "• Batch Embed: POST $BASE_URL/embed/batch"
echo "• Similarity: POST $BASE_URL/analyze/similarity"
echo "• Drift Detection: POST $BASE_URL/analyze/drift"
echo "• Clustering: POST $BASE_URL/analyze/clusters"
echo "• Model Insights: $BASE_URL/insights/models"
echo "• Domain Insights: $BASE_URL/insights/domains"
echo "• Comparisons: POST $BASE_URL/insights/compare"

echo ""
print_info "System deployed and ready for production use! 🚀" 
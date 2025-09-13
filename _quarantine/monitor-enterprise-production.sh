#!/bin/bash

# ENTERPRISE PRODUCTION MONITORING SCRIPT
# =======================================
# Real-time monitoring of enterprise features and performance

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Function to print colored output
print_status() {
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_metric() {
    echo -e "${CYAN}[METRIC]${NC} $1"
}

print_enterprise() {
    echo -e "${PURPLE}[ENTERPRISE]${NC} $1"
}

# Clear screen and show header
clear
cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🚀 ENTERPRISE PRODUCTION MONITOR 🚀                      ║
║                           Real-time System Health                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF

echo ""
print_status "Starting comprehensive monitoring of enterprise features..."
echo ""

# Function to test API endpoint
test_endpoint() {
    local url="$1"
    local name="$2"
    local expected_status="${3:-200}"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" "$url" 2>/dev/null || echo "HTTPSTATUS:000;TIME:999")
    
    http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    response_time=$(echo "$response" | grep -o "TIME:[0-9.]*" | cut -d: -f2)
    
    if [ "$http_status" = "$expected_status" ]; then
        print_success "$name - ${response_time}s"
        return 0
    else
        print_error "$name - HTTP $http_status in ${response_time}s"
        return 1
    fi
}

# Function to get API data
get_api_data() {
    local url="$1"
    curl -s "$url" 2>/dev/null || echo "{}"
}

# Monitor function
monitor_loop() {
    local iteration=1
    
    while true; do
        # Header for this iteration
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Monitoring Cycle #$iteration"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # 1. CORE SERVICES HEALTH
        print_status "Checking core services..."
        
        test_endpoint "https://llmrank.io/health" "🏥 Main API Health"
        test_endpoint "https://llmrank.io/api/stats" "📊 Stats Endpoint"
        test_endpoint "https://sophisticated-runner.onrender.com/" "🤖 Sophisticated Runner"
        test_endpoint "https://domain-runner.onrender.com/health" "🔄 Domain Runner"
        
        echo ""
        
        # 2. ENTERPRISE FEATURES
        print_enterprise "Testing enterprise features..."
        
        test_endpoint "https://llmrank.io/api/domains/apple.com/public" "🍎 Public Domain Pages"
        test_endpoint "https://llmrank.io/api/rankings" "🏆 Rankings API"
        test_endpoint "https://llmrank.io/api/categories" "📑 Categories API"
        test_endpoint "https://llmrank.io/api/fire-alarm-dashboard" "🚨 Crisis Dashboard"
        
        echo ""
        
        # 3. PERFORMANCE METRICS
        print_status "Collecting performance metrics..."
        
        # Get platform stats
        stats_data=$(get_api_data "https://llmrank.io/api/stats")
        
        if [ "$stats_data" != "{}" ]; then
            total_domains=$(echo "$stats_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('platform_stats', {}).get('total_domains', 'N/A'))
except:
    print('N/A')
")
            
            avg_score=$(echo "$stats_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('platform_stats', {}).get('average_memory_score', 'N/A'))
except:
    print('N/A')
")
            
            critical_risk=$(echo "$stats_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('platform_stats', {}).get('critical_risk_domains', 'N/A'))
except:
    print('N/A')
")
            
            print_metric "📈 Total Domains: $total_domains"
            print_metric "📊 Average Score: $avg_score"
            print_metric "🚨 High Risk Domains: $critical_risk"
        else
            print_warning "Could not retrieve platform stats"
        fi
        
        echo ""
        
        # 4. ENTERPRISE ANALYTICS TEST
        print_enterprise "Testing enterprise analytics..."
        
        # Test domain analysis depth
        domain_data=$(get_api_data "https://llmrank.io/api/domains/google.com/public")
        
        if [ "$domain_data" != "{}" ]; then
            has_ai_intelligence=$(echo "$domain_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅' if 'ai_intelligence' in data else '❌')
except:
    print('❌')
")
            
            has_business_profile=$(echo "$domain_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅' if 'business_profile' in data else '❌')
except:
    print('❌')
")
            
            has_competitive_analysis=$(echo "$domain_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print('✅' if 'competitive_analysis' in data else '❌')
except:
    print('❌')
")
            
            print_enterprise "AI Intelligence: $has_ai_intelligence"
            print_enterprise "Business Profile: $has_business_profile"
            print_enterprise "Competitive Analysis: $has_competitive_analysis"
        else
            print_warning "Could not test domain analytics"
        fi
        
        echo ""
        
        # 5. FREEMIUM MODEL VALIDATION
        print_enterprise "Validating freemium model..."
        
        # Check that public endpoints don't expose premium features
        rankings_data=$(get_api_data "https://llmrank.io/api/rankings?limit=5")
        
        if [ "$rankings_data" != "{}" ]; then
            domains_count=$(echo "$rankings_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(len(data.get('domains', [])))
except:
    print(0)
")
            
            has_premium_fields=$(echo "$rankings_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    domains = data.get('domains', [])
    if domains:
        domain = domains[0]
        # Check for premium fields that shouldn't be in public API
        premium_fields = ['sentiment_analysis', 'crisis_prediction', 'competitive_intelligence_deep']
        has_premium = any(field in domain for field in premium_fields)
        print('❌ EXPOSED' if has_premium else '✅ PROTECTED')
    else:
        print('N/A')
except:
    print('N/A')
")
            
            print_enterprise "Public API Data: $domains_count domains"
            print_enterprise "Premium Features: $has_premium_fields"
        else
            print_warning "Could not validate freemium model"
        fi
        
        echo ""
        
        # 6. CRISIS MONITORING
        print_status "Checking crisis monitoring..."
        
        crisis_data=$(get_api_data "https://llmrank.io/api/fire-alarm-dashboard?limit=5")
        
        if [ "$crisis_data" != "{}" ]; then
            high_risk_count=$(echo "$crisis_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(len(data.get('high_risk_domains', [])))
except:
    print('N/A')
")
            
            dashboard_type=$(echo "$crisis_data" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('dashboard_type', 'unknown'))
except:
    print('unknown')
")
            
            print_metric "🚨 Crisis Dashboard Type: $dashboard_type"
            print_metric "⚠️  High Risk Domains Detected: $high_risk_count"
        else
            print_warning "Could not check crisis monitoring"
        fi
        
        echo ""
        
        # 7. LOAD TEST
        if [ $((iteration % 5)) -eq 0 ]; then
            print_status "Running mini load test (every 5th cycle)..."
            
            # Concurrent requests test
            python3 << 'EOF'
import concurrent.futures
import requests
import time
import statistics

def make_request():
    start_time = time.time()
    try:
        response = requests.get('https://llmrank.io/api/stats', timeout=10)
        end_time = time.time()
        return end_time - start_time, response.status_code == 200
    except:
        return None, False

# Make 10 concurrent requests
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(make_request) for _ in range(10)]
    results = [future.result() for future in concurrent.futures.as_completed(futures)]

response_times = [r[0] for r in results if r[0] is not None and r[1]]
success_count = len(response_times)

if response_times:
    avg_time = statistics.mean(response_times)
    max_time = max(response_times)
    print(f"📊 Load Test: {success_count}/10 success, avg={avg_time:.3f}s, max={max_time:.3f}s")
    
    if avg_time < 1.0 and success_count >= 8:
        print("✅ Load test passed")
    else:
        print("⚠️  Load test concerns detected")
else:
    print("❌ Load test failed - no successful requests")
EOF
            echo ""
        fi
        
        # 8. ENTERPRISE SALES METRICS
        print_enterprise "Enterprise readiness check..."
        
        # Check key URLs that enterprise customers would use
        enterprise_urls=(
            "https://llmrank.io/api/domains/tesla.com/public|Tesla Analysis"
            "https://llmrank.io/api/jolt-benchmark/facebook.com|Crisis Benchmark"
            "https://llmrank.io/api/time-series/twitter.com|Trend Analysis"
        )
        
        enterprise_health=0
        total_enterprise_checks=${#enterprise_urls[@]}
        
        for url_info in "${enterprise_urls[@]}"; do
            IFS='|' read -r url name <<< "$url_info"
            if test_endpoint "$url" "$name" 200 >/dev/null 2>&1; then
                ((enterprise_health++))
            fi
        done
        
        enterprise_percentage=$((enterprise_health * 100 / total_enterprise_checks))
        
        if [ $enterprise_percentage -ge 90 ]; then
            print_enterprise "🎯 Enterprise Readiness: ${enterprise_percentage}% ✅ READY FOR SALES"
        elif [ $enterprise_percentage -ge 70 ]; then
            print_enterprise "🎯 Enterprise Readiness: ${enterprise_percentage}% ⚠️  MOSTLY READY"
        else
            print_enterprise "🎯 Enterprise Readiness: ${enterprise_percentage}% ❌ NEEDS ATTENTION"
        fi
        
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        
        # Overall status
        print_status "Monitoring cycle #$iteration complete"
        print_status "Next check in 30 seconds... (Ctrl+C to stop)"
        
        echo ""
        sleep 30
        
        # Clear for next iteration
        clear
        cat << 'EOF'
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🚀 ENTERPRISE PRODUCTION MONITOR 🚀                      ║
║                           Real-time System Health                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
        echo ""
        
        ((iteration++))
    done
}

# Trap Ctrl+C
trap 'echo -e "\n${GREEN}[MONITOR]${NC} Monitoring stopped by user. Enterprise systems remain active."; exit 0' INT

# Start monitoring
monitor_loop
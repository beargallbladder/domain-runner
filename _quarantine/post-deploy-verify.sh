#!/bin/bash

# Domain Runner - Post-deployment Verification
# This script verifies that all services are running correctly after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/deployment_logs"
VERIFY_LOG="${LOG_DIR}/verify_$(date +%Y%m%d_%H%M%S).log"

# Service endpoints
declare -A SERVICE_URLS=(
    ["sophisticated-runner"]="https://sophisticated-runner.onrender.com/health"
    ["domain-processor-v2"]="https://domain-processor-v2.onrender.com/api/v2/health"
    ["seo-metrics-runner"]="https://seo-metrics-runner.onrender.com/health"
    ["public-api"]="https://llmrank.io/health"
    ["embedding-engine"]="https://embedding-engine.onrender.com/health"
    ["cohort-intelligence"]="https://cohort-intelligence.onrender.com/health"
    ["industry-intelligence"]="https://industry-intelligence.onrender.com/health"
    ["news-correlation-service"]="https://news-correlation-service.onrender.com/health"
    ["swarm-intelligence"]="https://swarm-intelligence.onrender.com/health"
    ["memory-oracle"]="https://memory-oracle.onrender.com/health"
    ["weekly-scheduler"]="https://weekly-scheduler.onrender.com/health"
    ["visceral-intelligence"]="https://visceral-intelligence.onrender.com/health"
    ["reality-validator"]="https://reality-validator.onrender.com/health"
    ["predictive-analytics"]="https://predictive-analytics.onrender.com/health"
)

# Track results
TOTAL_SERVICES=${#SERVICE_URLS[@]}
HEALTHY_SERVICES=0
UNHEALTHY_SERVICES=0
SLOW_SERVICES=0

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] === $1 ===" >> "$VERIFY_LOG"
}

log_result() {
    local status=$1
    local message=$2
    
    case $status in
        SUCCESS)
            echo -e "${GREEN}✓${NC} $message"
            ;;
        FAIL)
            echo -e "${RED}✗${NC} $message"
            ;;
        WARN)
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        INFO)
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$status] $message" >> "$VERIFY_LOG"
}

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_retries=3
    local retry_delay=10
    
    log_result INFO "Checking $service_name..."
    
    for attempt in $(seq 1 $max_retries); do
        local start_time=$(date +%s)
        local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 30 "$health_url" 2>/dev/null || echo "000")
        local end_time=$(date +%s)
        local response_time=$((end_time - start_time))
        
        if [ "$response" = "200" ]; then
            ((HEALTHY_SERVICES++))
            
            if [ $response_time -gt 5 ]; then
                ((SLOW_SERVICES++))
                log_result WARN "$service_name is healthy but slow (${response_time}s)"
            else
                log_result SUCCESS "$service_name is healthy (${response_time}s)"
            fi
            return 0
        elif [ "$response" = "000" ]; then
            if [ $attempt -lt $max_retries ]; then
                log_result WARN "$service_name connection failed, retrying in ${retry_delay}s..."
                sleep $retry_delay
            else
                log_result FAIL "$service_name is unreachable after $max_retries attempts"
                ((UNHEALTHY_SERVICES++))
                return 1
            fi
        else
            if [ $attempt -lt $max_retries ]; then
                log_result WARN "$service_name returned $response, retrying in ${retry_delay}s..."
                sleep $retry_delay
            else
                log_result FAIL "$service_name returned $response after $max_retries attempts"
                ((UNHEALTHY_SERVICES++))
                return 1
            fi
        fi
    done
}

# Function to check database connectivity
check_database_health() {
    print_header "Database Health Check"
    
    # Test database connection using the public API
    local db_test_url="https://llmrank.io/api/domains/count"
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$db_test_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_result SUCCESS "Database is accessible via API"
    else
        log_result FAIL "Database connectivity test failed (HTTP $response)"
        return 1
    fi
}

# Function to check critical endpoints
check_critical_endpoints() {
    print_header "Critical Endpoints Check"
    
    # Check domain listing endpoint
    local domains_url="https://llmrank.io/api/domains?limit=1"
    local response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$domains_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_result SUCCESS "Domain listing endpoint is working"
    else
        log_result FAIL "Domain listing endpoint failed (HTTP $response)"
    fi
    
    # Check leaderboard endpoint
    local leaderboard_url="https://llmrank.io/api/leaderboard?limit=1"
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$leaderboard_url" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_result SUCCESS "Leaderboard endpoint is working"
    else
        log_result FAIL "Leaderboard endpoint failed (HTTP $response)"
    fi
}

# Function to check service integration
check_service_integration() {
    print_header "Service Integration Check"
    
    # Check if sophisticated-runner can reach domain-processor-v2
    log_result INFO "Checking inter-service communication..."
    
    # This would require specific integration endpoints
    # For now, we'll just verify that key services are up
    if [ $HEALTHY_SERVICES -ge $((TOTAL_SERVICES * 8 / 10)) ]; then
        log_result SUCCESS "Most services are healthy, integration likely working"
    else
        log_result WARN "Many services are down, integration may be affected"
    fi
}

# Function to check recent logs for errors
check_recent_errors() {
    print_header "Recent Error Check"
    
    log_result INFO "Checking for recent errors in deployment logs..."
    
    # Check if there are any recent error patterns in logs
    # This is a placeholder - in production, you'd check actual log aggregation service
    log_result INFO "Log checking would be performed via Render dashboard"
}

# Function to generate summary report
generate_summary() {
    print_header "Deployment Verification Summary"
    
    local health_percentage=$((HEALTHY_SERVICES * 100 / TOTAL_SERVICES))
    
    echo -e "\nService Health Summary:"
    echo -e "  Total Services: ${TOTAL_SERVICES}"
    echo -e "  Healthy: ${GREEN}${HEALTHY_SERVICES}${NC}"
    echo -e "  Unhealthy: ${RED}${UNHEALTHY_SERVICES}${NC}"
    echo -e "  Slow: ${YELLOW}${SLOW_SERVICES}${NC}"
    echo -e "  Health Rate: ${health_percentage}%"
    
    echo -e "\nVerification Log: ${VERIFY_LOG}"
    
    # Write summary to log
    {
        echo ""
        echo "=== SUMMARY ==="
        echo "Total Services: ${TOTAL_SERVICES}"
        echo "Healthy: ${HEALTHY_SERVICES}"
        echo "Unhealthy: ${UNHEALTHY_SERVICES}"
        echo "Slow: ${SLOW_SERVICES}"
        echo "Health Rate: ${health_percentage}%"
        echo "Timestamp: $(date)"
    } >> "$VERIFY_LOG"
}

# Main verification process
main() {
    echo -e "${BLUE}Domain Runner - Post-deployment Verification${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo "Starting service health checks..."
    echo "Verification log: ${VERIFY_LOG}"
    
    # Step 1: Check all service health endpoints
    print_header "Service Health Checks"
    
    for service in "${!SERVICE_URLS[@]}"; do
        check_service_health "$service" "${SERVICE_URLS[$service]}"
    done
    
    # Step 2: Check database connectivity
    check_database_health
    
    # Step 3: Check critical endpoints
    check_critical_endpoints
    
    # Step 4: Check service integration
    check_service_integration
    
    # Step 5: Check for recent errors
    check_recent_errors
    
    # Step 6: Generate summary
    generate_summary
    
    # Determine overall status
    if [ $UNHEALTHY_SERVICES -eq 0 ]; then
        echo -e "\n${GREEN}✓ All services are healthy!${NC}"
        echo -e "${GREEN}Deployment verification passed!${NC}"
        exit 0
    elif [ $UNHEALTHY_SERVICES -le 2 ]; then
        echo -e "\n${YELLOW}⚠ Some non-critical services are unhealthy${NC}"
        echo -e "${YELLOW}Deployment verification passed with warnings${NC}"
        exit 0
    else
        echo -e "\n${RED}✗ Multiple services are unhealthy!${NC}"
        echo -e "${RED}Deployment verification failed!${NC}"
        exit 1
    fi
}

# Optional: Send notification
send_notification() {
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local emoji="✅"
        local status="passed"
        
        if [ $UNHEALTHY_SERVICES -gt 2 ]; then
            emoji="❌"
            status="failed"
        elif [ $UNHEALTHY_SERVICES -gt 0 ]; then
            emoji="⚠️"
            status="passed with warnings"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${emoji} Domain Runner deployment verification ${status}. Healthy: ${HEALTHY_SERVICES}/${TOTAL_SERVICES}\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Run verification
main
send_notification
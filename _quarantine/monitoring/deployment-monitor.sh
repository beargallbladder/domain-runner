#!/bin/bash

# Deployment-Aware Monitoring System
# Detects which service version is deployed and adapts monitoring accordingly

echo "🚨 DEPLOYMENT-AWARE MONITORING SYSTEM"
echo "🎯 CRITICAL MISSION: Monitor domain processing deployment"
echo "═══════════════════════════════════════════════════════════════"

SERVICE_URL="https://sophisticated-runner.onrender.com"
LOG_FILE="/Users/samkim/domain-runner/monitoring/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "/Users/samkim/domain-runner/monitoring/logs"

log_event() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

detect_deployed_service() {
    echo "🔍 Detecting deployed service version..."
    
    local health_response
    health_response=$(curl -s "$SERVICE_URL/health" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$health_response" ]; then
        local service_name=$(echo "$health_response" | grep -o '"service":"[^"]*"' | cut -d'"' -f4)
        local service_version=$(echo "$health_response" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        
        echo "📊 Detected Service: $service_name v$service_version"
        log_event "Service detection: $service_name v$service_version"
        
        case "$service_name" in
            "sophisticated-runner-rust")
                echo "⚠️  DEPLOYMENT MISMATCH: Rust service deployed, but TypeScript service with domain processing needed"
                log_event "CRITICAL: Deployment mismatch - Rust service lacks domain processing endpoint"
                return 1
                ;;
            "sophisticated-runner")
                echo "✅ Correct TypeScript service deployed"
                log_event "Service check: Correct TypeScript service deployed" 
                return 0
                ;;
            *)
                echo "❓ Unknown service: $service_name"
                log_event "WARNING: Unknown service type detected: $service_name"
                return 2
                ;;
        esac
    else
        echo "❌ Cannot detect service - health endpoint unreachable"
        log_event "CRITICAL: Health endpoint unreachable"
        return 3
    fi
}

test_domain_processing_endpoints() {
    echo ""
    echo "🧪 Testing domain processing endpoints..."
    
    local endpoints=(
        "process-pending-domains"
        "domains"
        "api/domains"
        "process"
        "trigger-processing"
    )
    
    local working_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        echo "   Testing /$endpoint..."
        
        local response
        local http_code
        response=$(curl -s -w "%{http_code}" -X POST "$SERVICE_URL/$endpoint" \
            -H "Content-Type: application/json" \
            --max-time 10 2>/dev/null)
        
        http_code="${response: -3}"
        response="${response%???}"
        
        case "$http_code" in
            "200"|"201"|"202")
                echo "   ✅ /$endpoint: Working (HTTP $http_code)"
                working_endpoints+=("$endpoint")
                log_event "Endpoint test: /$endpoint SUCCESS - HTTP $http_code"
                ;;
            "404")
                echo "   ❌ /$endpoint: Not found (HTTP $http_code)"
                ;;
            "405")
                echo "   🟡 /$endpoint: Method not allowed (HTTP $http_code)"
                # Try GET request
                response=$(curl -s -w "%{http_code}" "$SERVICE_URL/$endpoint" --max-time 10 2>/dev/null)
                http_code="${response: -3}"
                if [ "$http_code" = "200" ]; then
                    echo "   ✅ /$endpoint: Available via GET (HTTP $http_code)"
                    working_endpoints+=("$endpoint")
                fi
                ;;
            *)
                echo "   ⚠️  /$endpoint: HTTP $http_code"
                ;;
        esac
    done
    
    echo ""
    if [ ${#working_endpoints[@]} -eq 0 ]; then
        echo "❌ No working domain processing endpoints found"
        log_event "CRITICAL: No domain processing endpoints available"
        return 1
    else
        echo "✅ Working endpoints: ${working_endpoints[*]}"
        log_event "Endpoints available: ${working_endpoints[*]}"
        return 0
    fi
}

check_database_connectivity() {
    echo ""
    echo "🗄️  Testing database connectivity..."
    
    # We can't directly test the database from here, but we can look for endpoints that use it
    local db_endpoints=(
        "health"
        "status" 
        "domains/count"
        "api/status"
    )
    
    for endpoint in "${db_endpoints[@]}"; do
        local response
        response=$(curl -s "$SERVICE_URL/$endpoint" --max-time 5 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$response" ]; then
            echo "   📊 /$endpoint response: $response"
            
            # Look for database-related information
            if echo "$response" | grep -q -i "database\|domains\|pending\|completed"; then
                echo "   ✅ Database connectivity likely working"
                log_event "Database check: Endpoint /$endpoint suggests DB connectivity"
                return 0
            fi
        fi
    done
    
    echo "   ⚠️  Cannot verify database connectivity from available endpoints"
    log_event "WARNING: Cannot verify database connectivity"
    return 1
}

generate_deployment_report() {
    echo ""
    echo "📋 DEPLOYMENT ANALYSIS REPORT"
    echo "═══════════════════════════════════════════════════════════════"
    
    # Service detection
    detect_deployed_service
    local service_status=$?
    
    # Endpoint testing
    test_domain_processing_endpoints
    local endpoint_status=$?
    
    # Database check
    check_database_connectivity
    local db_status=$?
    
    echo ""
    echo "📊 DEPLOYMENT STATUS SUMMARY:"
    
    case $service_status in
        0) echo "   🟢 Service: Correct TypeScript version deployed" ;;
        1) echo "   🔴 Service: CRITICAL - Wrong version deployed (Rust instead of TypeScript)" ;;
        2) echo "   🟡 Service: Unknown version detected" ;;
        3) echo "   🔴 Service: CRITICAL - Unreachable" ;;
    esac
    
    case $endpoint_status in
        0) echo "   🟢 Endpoints: Domain processing endpoints available" ;;
        1) echo "   🔴 Endpoints: CRITICAL - No domain processing endpoints found" ;;
    esac
    
    case $db_status in
        0) echo "   🟢 Database: Connectivity appears functional" ;;
        1) echo "   🟡 Database: Cannot verify connectivity" ;;
    esac
    
    echo ""
    
    # Overall assessment
    if [ $service_status -eq 1 ] || [ $endpoint_status -eq 1 ]; then
        echo "🚨 CRITICAL DEPLOYMENT ISSUE DETECTED"
        echo ""
        echo "🛠️  REQUIRED ACTIONS:"
        echo "   1. Deploy TypeScript service with domain processing endpoint"
        echo "   2. Ensure /process-pending-domains endpoint is available"
        echo "   3. Verify database connectivity in deployed service"
        echo "   4. Test domain processing functionality"
        echo ""
        echo "💡 DEPLOYMENT COMMANDS:"
        echo "   cd services/sophisticated-runner"
        echo "   npm run build"
        echo "   git add . && git commit -m 'Deploy TypeScript service with domain processing'"
        echo "   git push origin main"
        
        log_event "CRITICAL: Deployment issue detected - TypeScript service needed"
        return 1
    else
        echo "✅ DEPLOYMENT STATUS: READY FOR MONITORING"
        echo "🚀 Domain processing monitoring can begin"
        
        log_event "Deployment check: PASSED - Ready for domain processing"
        return 0
    fi
}

# Main execution
log_event "Deployment monitoring started"

generate_deployment_report
deployment_status=$?

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📝 Full report logged to: $LOG_FILE"

if [ $deployment_status -eq 0 ]; then
    echo ""
    echo "🎯 NEXT STEPS:"
    echo "   1. Run: ./monitor-deployment.sh (for continuous monitoring)"  
    echo "   2. Run: ./start-dashboard.sh (for real-time dashboard)"
    echo "   3. Run: ./auto-monitor.sh (for automated monitoring with fixes)"
else
    echo ""
    echo "⚠️  DEPLOYMENT MUST BE FIXED BEFORE MONITORING CAN BEGIN"
    echo "   Use the deployment commands above to deploy the correct service"
fi

exit $deployment_status
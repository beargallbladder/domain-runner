#!/bin/bash
set -euo pipefail

# Production Health Monitoring Script
# Monitors all services and sends alerts if issues are detected

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
HEALTH_CHECK_INTERVAL=60  # seconds
MAX_FAILURES=3
ALERT_COOLDOWN=300  # 5 minutes between alerts for same service

# Service endpoints to monitor
declare -A SERVICES=(
    ["sophisticated-runner"]="https://sophisticated-runner.onrender.com/health"
    ["public-api"]="https://llmrank.io/health"
    ["seo-metrics-runner"]="https://seo-metrics-runner.onrender.com/health"
    ["cohort-intelligence"]="https://cohort-intelligence.onrender.com/health"
    ["industry-intelligence"]="https://industry-intelligence.onrender.com/health"
    ["news-correlation-service"]="https://news-correlation-service.onrender.com/health"
    ["swarm-intelligence"]="https://swarm-intelligence.onrender.com/health"
)

# Failure tracking
declare -A FAILURE_COUNT
declare -A LAST_ALERT_TIME

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $1"
}

# Initialize failure counters
init_failure_tracking() {
    for service in "${!SERVICES[@]}"; do
        FAILURE_COUNT[$service]=0
        LAST_ALERT_TIME[$service]=0
    done
}

# Check service health
check_service_health() {
    local service=$1
    local url=${SERVICES[$service]}
    local timeout=10
    
    log_info "Checking health for $service..."
    
    # Perform health check with timeout
    if curl -sf --max-time $timeout "$url" >/dev/null 2>&1; then
        # Service is healthy
        if [ "${FAILURE_COUNT[$service]}" -gt 0 ]; then
            log_success "$service recovered (was failing ${FAILURE_COUNT[$service]} times)"
            send_recovery_alert "$service"
        else
            log_success "$service is healthy"
        fi
        FAILURE_COUNT[$service]=0
        return 0
    else
        # Service is unhealthy
        ((FAILURE_COUNT[$service]++))
        log_error "$service health check failed (failure ${FAILURE_COUNT[$service]}/$MAX_FAILURES)"
        
        # Check if we should send an alert
        if [ "${FAILURE_COUNT[$service]}" -ge $MAX_FAILURES ]; then
            local current_time=$(date +%s)
            local last_alert=${LAST_ALERT_TIME[$service]}
            
            if [ $((current_time - last_alert)) -gt $ALERT_COOLDOWN ]; then
                send_failure_alert "$service"
                LAST_ALERT_TIME[$service]=$current_time
            fi
        fi
        
        return 1
    fi
}

# Get detailed service metrics
get_service_metrics() {
    local service=$1
    local url=${SERVICES[$service]}
    local metrics_url=""
    
    # Try to get detailed metrics if available
    case $service in
        "sophisticated-runner")
            metrics_url="https://sophisticated-runner.onrender.com/provider-usage"
            ;;
        "public-api")
            metrics_url="https://llmrank.io/api/stats"
            ;;
    esac
    
    if [ -n "$metrics_url" ]; then
        curl -sf --max-time 10 "$metrics_url" 2>/dev/null || echo "{\"error\": \"metrics unavailable\"}"
    else
        echo "{\"metrics\": \"not_available\"}"
    fi
}

# Send failure alert
send_failure_alert() {
    local service=$1
    local failure_count=${FAILURE_COUNT[$service]}
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    
    log_error "🚨 ALERT: $service has failed $failure_count consecutive health checks"
    
    # Slack notification (if webhook URL is configured)
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local slack_payload=$(cat <<EOF
{
    "text": "🚨 PRODUCTION ALERT",
    "attachments": [
        {
            "color": "danger",
            "title": "Service Health Check Failed",
            "fields": [
                {
                    "title": "Service",
                    "value": "$service",
                    "short": true
                },
                {
                    "title": "Failure Count",
                    "value": "$failure_count/$MAX_FAILURES",
                    "short": true
                },
                {
                    "title": "Timestamp",
                    "value": "$timestamp",
                    "short": false
                },
                {
                    "title": "Action Required",
                    "value": "Check service logs and consider manual intervention",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log_warning "Failed to send Slack alert"
    fi
    
    # Email notification (if configured)
    if [ -n "${ALERT_EMAIL:-}" ] && command -v mail >/dev/null 2>&1; then
        local subject="🚨 Production Alert: $service Health Check Failed"
        local body="Service: $service
Failure Count: $failure_count/$MAX_FAILURES
Timestamp: $timestamp
URL: ${SERVICES[$service]}

Please check the service logs and take appropriate action."
        
        echo "$body" | mail -s "$subject" "$ALERT_EMAIL" || log_warning "Failed to send email alert"
    fi
    
    # Log to file
    local log_file="$PROJECT_ROOT/monitoring/alerts.log"
    echo "[$timestamp] ALERT: $service failed $failure_count times" >> "$log_file"
}

# Send recovery alert
send_recovery_alert() {
    local service=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    
    log_success "✅ RECOVERY: $service has recovered"
    
    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        local slack_payload=$(cat <<EOF
{
    "text": "✅ SERVICE RECOVERED",
    "attachments": [
        {
            "color": "good",
            "title": "Service Health Restored",
            "fields": [
                {
                    "title": "Service",
                    "value": "$service",
                    "short": true
                },
                {
                    "title": "Status",
                    "value": "Healthy",
                    "short": true
                },
                {
                    "title": "Recovery Time",
                    "value": "$timestamp",
                    "short": false
                }
            ]
        }
    ]
}
EOF
)
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK_URL" >/dev/null 2>&1 || log_warning "Failed to send Slack recovery alert"
    fi
    
    # Log recovery
    local log_file="$PROJECT_ROOT/monitoring/alerts.log"
    echo "[$timestamp] RECOVERY: $service recovered" >> "$log_file"
}

# Generate health report
generate_health_report() {
    local report_file="$PROJECT_ROOT/monitoring/health_report_$(date +%Y%m%d_%H%M%S).json"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S UTC')
    
    log_info "Generating health report..."
    
    local report=$(cat <<EOF
{
    "timestamp": "$timestamp",
    "overall_status": "unknown",
    "services": {},
    "summary": {
        "total_services": ${#SERVICES[@]},
        "healthy_services": 0,
        "unhealthy_services": 0,
        "degraded_services": 0
    }
}
EOF
)
    
    # Check each service and build report
    local healthy_count=0
    local unhealthy_count=0
    
    for service in "${!SERVICES[@]}"; do
        local status="unknown"
        local metrics="{}"
        
        if check_service_health "$service" >/dev/null 2>&1; then
            status="healthy"
            ((healthy_count++))
            metrics=$(get_service_metrics "$service")
        else
            status="unhealthy"
            ((unhealthy_count++))
        fi
        
        # Update report with service status
        report=$(echo "$report" | jq ".services[\"$service\"] = {
            \"status\": \"$status\",
            \"url\": \"${SERVICES[$service]}\",
            \"failure_count\": ${FAILURE_COUNT[$service]},
            \"metrics\": $metrics
        }")
    done
    
    # Determine overall status
    local overall_status="healthy"
    if [ $unhealthy_count -gt 0 ]; then
        overall_status="degraded"
    fi
    if [ $unhealthy_count -gt $((${#SERVICES[@]} / 2)) ]; then
        overall_status="critical"
    fi
    
    # Update summary
    report=$(echo "$report" | jq ".overall_status = \"$overall_status\" | 
        .summary.healthy_services = $healthy_count |
        .summary.unhealthy_services = $unhealthy_count")
    
    echo "$report" > "$report_file"
    log_success "Health report generated: $report_file"
    
    # Also create a latest report
    echo "$report" > "$PROJECT_ROOT/monitoring/latest_health_report.json"
}

# Main monitoring loop
monitoring_loop() {
    log_info "Starting health monitoring loop (interval: ${HEALTH_CHECK_INTERVAL}s)"
    
    while true; do
        log_info "Starting health check cycle..."
        
        local cycle_start=$(date +%s)
        local all_healthy=true
        
        # Check each service
        for service in "${!SERVICES[@]}"; do
            if ! check_service_health "$service"; then
                all_healthy=false
            fi
            sleep 2  # Small delay between service checks
        done
        
        # Generate periodic health report
        if [ $(($(date +%s) % 300)) -lt $HEALTH_CHECK_INTERVAL ]; then
            generate_health_report
        fi
        
        local cycle_duration=$(($(date +%s) - cycle_start))
        log_info "Health check cycle completed in ${cycle_duration}s"
        
        if [ "$all_healthy" = true ]; then
            log_success "All services are healthy ✅"
        else
            log_warning "Some services are unhealthy ⚠️"
        fi
        
        # Calculate sleep time
        local sleep_time=$((HEALTH_CHECK_INTERVAL - cycle_duration))
        if [ $sleep_time -gt 0 ]; then
            sleep $sleep_time
        fi
    done
}

# One-time health check
run_health_check() {
    log_info "Running one-time health check..."
    
    init_failure_tracking
    
    local all_healthy=true
    for service in "${!SERVICES[@]}"; do
        if ! check_service_health "$service"; then
            all_healthy=false
        fi
    done
    
    generate_health_report
    
    if [ "$all_healthy" = true ]; then
        log_success "✅ All services are healthy"
        exit 0
    else
        log_error "❌ Some services are unhealthy"
        exit 1
    fi
}

# Main execution
main() {
    local mode="${1:-monitor}"
    
    case $mode in
        "monitor"|"--monitor")
            init_failure_tracking
            monitoring_loop
            ;;
        "check"|"--check")
            run_health_check
            ;;
        "report"|"--report")
            init_failure_tracking
            generate_health_report
            ;;
        *)
            echo "Usage: $0 [monitor|check|report]"
            echo "  monitor: Run continuous monitoring (default)"
            echo "  check:   Run one-time health check"
            echo "  report:  Generate health report"
            exit 1
            ;;
    esac
}

# Ensure monitoring directory exists
mkdir -p "$PROJECT_ROOT/monitoring"

# Run main function
main "$@"
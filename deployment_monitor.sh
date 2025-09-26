#!/bin/bash

# Autonomous Render Deployment Monitor
# This script monitors the deployment status and health of domain-runner services

set -euo pipefail

# Configuration
WEB_SERVICE_URL="https://domain-runner-rust-web.onrender.com"
HEALTH_ENDPOINT="/healthz"
CHECK_INTERVAL=30
MAX_DEPLOYMENT_WAIT=1800  # 30 minutes
LOG_FILE="deployment_monitor.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to check if service is healthy
check_health() {
    local url="$1"
    local response_code
    local response_body

    if response_code=$(curl -s -o /tmp/health_response -w "%{http_code}" --max-time 10 "${url}${HEALTH_ENDPOINT}" 2>/dev/null); then
        response_body=$(cat /tmp/health_response 2>/dev/null || echo "")
        if [[ "$response_code" == "200" ]]; then
            log "INFO" "${GREEN}✓${NC} Health check passed for ${url} (HTTP ${response_code})"
            return 0
        else
            log "WARN" "${YELLOW}!${NC} Health check failed for ${url} (HTTP ${response_code}): ${response_body}"
            return 1
        fi
    else
        log "ERROR" "${RED}✗${NC} Health check failed for ${url} - connection error"
        return 1
    fi
}

# Function to check if service is responding at all
check_connectivity() {
    local url="$1"
    local response_code

    if response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${url}" 2>/dev/null); then
        log "INFO" "Service ${url} is responding (HTTP ${response_code})"
        return 0
    else
        log "WARN" "Service ${url} is not responding"
        return 1
    fi
}

# Function to get deployment status via Render API (if API key is available)
check_deployment_status() {
    if [[ -n "${RENDER_API_KEY:-}" && -n "${RENDER_SERVICE_ID:-}" ]]; then
        local status_response
        if status_response=$(curl -s -H "Authorization: Bearer ${RENDER_API_KEY}" \
            "https://api.render.com/v1/services/${RENDER_SERVICE_ID}" 2>/dev/null); then
            local deployment_status
            deployment_status=$(echo "${status_response}" | grep -o '"serviceDetails":{"buildCommand"[^}]*"deployStatus":"[^"]*"' | grep -o 'deployStatus":"[^"]*"' | cut -d'"' -f3 || echo "unknown")
            log "INFO" "Deployment status: ${deployment_status}"
            echo "${deployment_status}"
        else
            log "WARN" "Failed to get deployment status from Render API"
            echo "api_error"
        fi
    else
        echo "no_api_key"
    fi
}

# Function to wait for deployment to complete
wait_for_deployment() {
    local start_time=$(date +%s)
    local end_time=$((start_time + MAX_DEPLOYMENT_WAIT))

    log "INFO" "${BLUE}Waiting for deployment to complete...${NC}"

    while [[ $(date +%s) -lt $end_time ]]; do
        local deployment_status
        deployment_status=$(check_deployment_status)

        case "$deployment_status" in
            "live"|"ready")
                log "INFO" "${GREEN}✓${NC} Deployment completed successfully!"
                return 0
                ;;
            "build_failed"|"deploy_failed")
                log "ERROR" "${RED}✗${NC} Deployment failed with status: ${deployment_status}"
                return 1
                ;;
            "building"|"deploying")
                log "INFO" "${YELLOW}⏳${NC} Deployment in progress (${deployment_status})..."
                ;;
            "no_api_key")
                log "INFO" "API credentials not available, checking service connectivity instead..."
                if check_connectivity "${WEB_SERVICE_URL}"; then
                    log "INFO" "${GREEN}✓${NC} Service is responding!"
                    return 0
                fi
                ;;
        esac

        sleep 30
    done

    log "ERROR" "${RED}✗${NC} Deployment wait timeout after ${MAX_DEPLOYMENT_WAIT} seconds"
    return 1
}

# Function to start continuous monitoring
start_monitoring() {
    log "INFO" "${BLUE}Starting continuous health monitoring...${NC}"
    log "INFO" "Monitoring URL: ${WEB_SERVICE_URL}${HEALTH_ENDPOINT}"
    log "INFO" "Check interval: ${CHECK_INTERVAL} seconds"

    local consecutive_failures=0
    local max_consecutive_failures=3

    while true; do
        if check_health "${WEB_SERVICE_URL}"; then
            consecutive_failures=0
        else
            consecutive_failures=$((consecutive_failures + 1))

            if [[ $consecutive_failures -ge $max_consecutive_failures ]]; then
                log "ERROR" "${RED}Service has failed health checks ${consecutive_failures} times consecutively${NC}"
                # Could trigger alerts here
            fi
        fi

        sleep "${CHECK_INTERVAL}"
    done
}

# Function to display help
show_help() {
    cat << EOF
Autonomous Render Deployment Monitor

Usage: $0 [OPTIONS] [COMMAND]

Commands:
  monitor     Start continuous health monitoring (default)
  deploy      Wait for deployment completion then start monitoring
  health      Perform a single health check
  status      Check deployment status via API

Options:
  -h, --help  Show this help message
  -u, --url   Override web service URL (default: ${WEB_SERVICE_URL})
  -i, --interval  Override check interval in seconds (default: ${CHECK_INTERVAL})

Environment Variables:
  RENDER_API_KEY     - Render API key for deployment status checks
  RENDER_SERVICE_ID  - Render service ID for API calls

Examples:
  $0 deploy                    # Wait for deployment then monitor
  $0 monitor                   # Start continuous monitoring
  $0 health                    # Single health check
  $0 -u https://custom.url -i 60 monitor  # Custom URL and interval

EOF
}

# Main function
main() {
    local command="monitor"

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -u|--url)
                WEB_SERVICE_URL="$2"
                shift 2
                ;;
            -i|--interval)
                CHECK_INTERVAL="$2"
                shift 2
                ;;
            deploy|monitor|health|status)
                command="$1"
                shift
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    log "INFO" "${BLUE}Domain Runner Deployment Monitor${NC}"
    log "INFO" "Target URL: ${WEB_SERVICE_URL}"
    log "INFO" "Command: ${command}"

    # Create log file
    touch "${LOG_FILE}"

    case "$command" in
        "health")
            if check_health "${WEB_SERVICE_URL}"; then
                echo "Service is healthy"
                exit 0
            else
                echo "Service is unhealthy"
                exit 1
            fi
            ;;
        "status")
            status=$(check_deployment_status)
            echo "Deployment status: ${status}"
            ;;
        "deploy")
            if wait_for_deployment; then
                log "INFO" "${GREEN}Deployment completed successfully, starting monitoring...${NC}"
                start_monitoring
            else
                log "ERROR" "${RED}Deployment failed or timed out${NC}"
                exit 1
            fi
            ;;
        "monitor")
            start_monitoring
            ;;
        *)
            log "ERROR" "Invalid command: ${command}"
            exit 1
            ;;
    esac
}

# Trap signals for graceful shutdown
trap 'log "INFO" "Monitoring stopped by user"; exit 0' SIGINT SIGTERM

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    log "ERROR" "curl is required but not installed"
    exit 1
fi

# Run main function with all arguments
main "$@"
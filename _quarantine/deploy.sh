#!/bin/bash

# Domain Runner - Main Deployment Script
# This script orchestrates the full deployment process with rollback capabilities

set -e  # Exit on error
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/deployment_logs"
DEPLOYMENT_LOG="${LOG_DIR}/deployment_$(date +%Y%m%d_%H%M%S).log"
ROLLBACK_POINT=""

# Create log directory
mkdir -p "$LOG_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
    esac
    
    echo "[${timestamp}] [${level}] ${message}" >> "$DEPLOYMENT_LOG"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create rollback point
create_rollback_point() {
    log INFO "Creating rollback point..."
    ROLLBACK_POINT=$(git rev-parse HEAD)
    echo "$ROLLBACK_POINT" > "${LOG_DIR}/last_stable_deployment.txt"
    log SUCCESS "Rollback point created: ${ROLLBACK_POINT}"
}

# Function to perform rollback
rollback() {
    log ERROR "Deployment failed! Initiating rollback..."
    
    if [ -f "${LOG_DIR}/last_stable_deployment.txt" ]; then
        local last_stable=$(cat "${LOG_DIR}/last_stable_deployment.txt")
        log INFO "Rolling back to commit: ${last_stable}"
        
        git checkout "$last_stable"
        
        log WARNING "Rollback complete. You may need to:"
        log WARNING "  1. Push the rollback: git push origin main --force"
        log WARNING "  2. Manually trigger Render redeploy"
        log WARNING "  3. Check service health after rollback"
    else
        log ERROR "No rollback point found. Manual intervention required."
    fi
}

# Trap errors and perform rollback
trap 'if [ $? -ne 0 ]; then rollback; fi' EXIT

# Main deployment process
main() {
    log INFO "Starting Domain Runner deployment process..."
    log INFO "Deployment log: ${DEPLOYMENT_LOG}"
    
    # Step 1: Run pre-deployment checks
    log INFO "Running pre-deployment checks..."
    if [ -f "${SCRIPT_DIR}/pre-deploy-checks.sh" ]; then
        if ! bash "${SCRIPT_DIR}/pre-deploy-checks.sh"; then
            log ERROR "Pre-deployment checks failed!"
            exit 1
        fi
    else
        log WARNING "pre-deploy-checks.sh not found, skipping..."
    fi
    
    # Step 2: Create rollback point
    create_rollback_point
    
    # Step 3: Build all services
    log INFO "Building all services..."
    
    # List of services to build
    declare -a services=(
        "services/domain-processor-v2"
        "services/sophisticated-runner"
        "services/seo-metrics-runner"
        "services/cohort-intelligence"
        "services/industry-intelligence"
        "services/news-correlation-service"
        "services/swarm-intelligence"
        "services/memory-oracle"
        "services/weekly-scheduler"
        "services/visceral-intelligence"
        "services/reality-validator"
        "services/predictive-analytics"
        "services/database-manager"
    )
    
    for service in "${services[@]}"; do
        if [ -d "$service" ]; then
            log INFO "Building ${service}..."
            (
                cd "$service"
                if [ -f "package.json" ]; then
                    npm cache clean --force
                    npm install
                    if [ -f "tsconfig.json" ]; then
                        npm run build
                    fi
                fi
            ) || {
                log ERROR "Failed to build ${service}"
                exit 1
            }
            log SUCCESS "Built ${service}"
        else
            log WARNING "Service directory not found: ${service}"
        fi
    done
    
    # Step 4: Run tests (optional, can be enabled)
    if [ "${RUN_TESTS:-false}" == "true" ]; then
        log INFO "Running tests..."
        npm test || {
            log ERROR "Tests failed!"
            exit 1
        }
    fi
    
    # Step 5: Commit changes if any
    if ! git diff-index --quiet HEAD --; then
        log INFO "Committing deployment changes..."
        git add -A
        git commit -m "Deploy: Update services $(date +%Y-%m-%d_%H:%M:%S)"
    fi
    
    # Step 6: Push to GitHub
    log INFO "Pushing to GitHub..."
    git push origin main || {
        log ERROR "Failed to push to GitHub!"
        exit 1
    }
    
    log SUCCESS "Code pushed to GitHub successfully"
    
    # Step 7: Trigger Render deployment
    log INFO "Render will automatically deploy from the pushed changes..."
    log INFO "Monitor deployment at: https://dashboard.render.com"
    
    # Step 8: Wait for deployment to complete
    log INFO "Waiting for deployment to stabilize (60 seconds)..."
    sleep 60
    
    # Step 9: Run post-deployment verification
    log INFO "Running post-deployment verification..."
    if [ -f "${SCRIPT_DIR}/post-deploy-verify.sh" ]; then
        if ! bash "${SCRIPT_DIR}/post-deploy-verify.sh"; then
            log ERROR "Post-deployment verification failed!"
            exit 1
        fi
    else
        log WARNING "post-deploy-verify.sh not found, skipping..."
    fi
    
    # Clear the trap since deployment succeeded
    trap - EXIT
    
    log SUCCESS "Deployment completed successfully!"
    log INFO "Deployment summary:"
    log INFO "  - Services built: ${#services[@]}"
    log INFO "  - Commit: $(git rev-parse HEAD)"
    log INFO "  - Timestamp: $(date)"
    log INFO "  - Log file: ${DEPLOYMENT_LOG}"
    
    # Optional: Send notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"✅ Domain Runner deployment completed successfully!\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Script execution
log INFO "Domain Runner Deployment Script v1.0"
log INFO "========================================="

# Check prerequisites
if ! command_exists git; then
    log ERROR "git is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    log ERROR "npm is required but not installed"
    exit 1
fi

if ! command_exists node; then
    log ERROR "node is required but not installed"
    exit 1
fi

# Run main deployment
main

exit 0
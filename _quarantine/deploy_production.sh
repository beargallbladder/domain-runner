#!/bin/bash

# Production Deployment Script for Domain Runner
# This script handles the deployment with all safety checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_BRANCH="main"
SERVICE_NAME="domain-processor-v2"
HEALTH_CHECK_URL="https://domain-processor-v2.onrender.com/api/v2/health"
ROLLBACK_TRIGGER_ERROR_RATE=5
ROLLBACK_TRIGGER_RESPONSE_TIME=2000

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Starting pre-deployment checks..."
    
    # Check git status
    if [[ -n $(git status -s) ]]; then
        log_error "Working directory not clean. Please commit or stash changes."
        exit 1
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" != "$DEPLOYMENT_BRANCH" ]]; then
        log_warning "Not on $DEPLOYMENT_BRANCH branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue deployment from $CURRENT_BRANCH? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Run tests
    log_info "Running test suite..."
    npm test || {
        log_error "Tests failed. Aborting deployment."
        exit 1
    }
    
    # Build check
    log_info "Testing build process..."
    npm run build || {
        log_error "Build failed. Aborting deployment."
        exit 1
    }
    
    log_success "Pre-deployment checks passed!"
}

# Check service health
check_health() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    log_info "Checking health at $url"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null; then
            log_success "Health check passed!"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed"
        sleep 10
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Monitor deployment
monitor_deployment() {
    log_info "Monitoring deployment for 5 minutes..."
    
    local start_time=$(date +%s)
    local monitoring_duration=300 # 5 minutes
    
    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [ $elapsed -ge $monitoring_duration ]; then
            break
        fi
        
        # Check health
        if ! curl -sf "$HEALTH_CHECK_URL" > /dev/null; then
            log_error "Health check failed during monitoring!"
            return 1
        fi
        
        # Check metrics (would integrate with monitoring API)
        log_info "Health check passed. Elapsed: ${elapsed}s/${monitoring_duration}s"
        
        sleep 30
    done
    
    log_success "Monitoring completed successfully!"
    return 0
}

# Create deployment tag
create_deployment_tag() {
    local tag="deploy-$(date +%Y%m%d-%H%M%S)"
    git tag -a "$tag" -m "Production deployment $tag"
    git push origin "$tag"
    log_success "Created deployment tag: $tag"
    echo "$tag"
}

# Main deployment flow
main() {
    log_info "Starting production deployment..."
    
    # Pre-deployment checks
    pre_deployment_checks
    
    # Create deployment tag
    DEPLOYMENT_TAG=$(create_deployment_tag)
    
    # Backup notification
    log_warning "Ensure database backup is complete before proceeding!"
    read -p "Has the database been backed up? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment aborted. Please backup database first."
        exit 1
    fi
    
    # Deploy to Render
    log_info "Triggering deployment on Render..."
    log_warning "Please go to Render dashboard and:"
    echo "  1. Navigate to $SERVICE_NAME service"
    echo "  2. Click 'Manual Deploy'"
    echo "  3. Select branch: $DEPLOYMENT_BRANCH"
    echo "  4. Confirm deployment"
    
    read -p "Press enter when deployment is triggered on Render..."
    
    # Wait for deployment
    log_info "Waiting for deployment to complete..."
    sleep 60 # Initial wait
    
    # Check health
    if ! check_health "$HEALTH_CHECK_URL"; then
        log_error "Deployment health check failed!"
        log_warning "Consider rolling back in Render dashboard"
        exit 1
    fi
    
    # Monitor deployment
    if ! monitor_deployment; then
        log_error "Deployment monitoring detected issues!"
        log_warning "Consider rolling back in Render dashboard"
        exit 1
    fi
    
    # Success
    log_success "Deployment completed successfully!"
    log_info "Deployment tag: $DEPLOYMENT_TAG"
    log_info "Please update deployment log with:"
    echo "  - Deployment Date: $(date)"
    echo "  - Version: $DEPLOYMENT_TAG"
    echo "  - Deployed By: $(git config user.name)"
    
    # Post-deployment reminders
    echo
    log_info "Post-deployment checklist:"
    echo "  [ ] Monitor error rates for next 2 hours"
    echo "  [ ] Check all 11 LLM providers are functional"
    echo "  [ ] Verify queue processing speed"
    echo "  [ ] Update status page if needed"
    echo "  [ ] Notify team in Slack"
}

# Rollback helper
rollback() {
    log_error "ROLLBACK PROCEDURE:"
    echo "1. Go to Render dashboard"
    echo "2. Navigate to $SERVICE_NAME service"
    echo "3. Go to 'Deploys' tab"
    echo "4. Find the previous successful deployment"
    echo "5. Click 'Rollback to this deploy'"
    echo "6. Confirm rollback"
    echo "7. Monitor health check: $HEALTH_CHECK_URL"
    echo "8. Create incident report"
}

# Handle script interruption
trap 'log_error "Deployment interrupted!"; rollback; exit 1' INT TERM

# Check if running in CI/CD or manual
if [ "${CI:-}" = "true" ]; then
    log_error "This script is for manual deployment only. Use CI/CD pipeline for automated deployments."
    exit 1
fi

# Confirmation
echo -e "${YELLOW}=== PRODUCTION DEPLOYMENT ===${NC}"
echo "Service: $SERVICE_NAME"
echo "Branch: $DEPLOYMENT_BRANCH"
echo "Health Check: $HEALTH_CHECK_URL"
echo
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no) " -r
if [[ ! $REPLY == "yes" ]]; then
    log_info "Deployment cancelled."
    exit 0
fi

# Run main deployment
main
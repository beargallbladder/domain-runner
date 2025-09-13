#!/bin/bash
set -euo pipefail

# Production Deployment Script with Rollback Capabilities
# Usage: ./scripts/deploy-production.sh [service] [--rollback]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="$PROJECT_ROOT/backups/deployment_$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Service configurations
declare -A SERVICES=(
    ["sophisticated-runner"]="services/sophisticated-runner"
    ["public-api"]="services/public-api"
    ["seo-metrics-runner"]="services/seo-metrics-runner"
    ["cohort-intelligence"]="services/cohort-intelligence"
    ["industry-intelligence"]="services/industry-intelligence"
    ["news-correlation-service"]="services/news-correlation-service"
    ["swarm-intelligence"]="services/swarm-intelligence"
)

# Function to create backup
create_backup() {
    local service=$1
    local service_path=${SERVICES[$service]}
    
    log_info "Creating backup for $service..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup current deployment state
    if [ -d "$PROJECT_ROOT/$service_path" ]; then
        cp -r "$PROJECT_ROOT/$service_path" "$BACKUP_DIR/"
        log_success "Backup created at $BACKUP_DIR/$service"
    fi
    
    # Backup current git commit
    git rev-parse HEAD > "$BACKUP_DIR/git_commit_$service.txt"
    
    # Backup environment variables (if configured)
    if command -v render >/dev/null 2>&1; then
        render env list --service="$service" > "$BACKUP_DIR/env_vars_$service.txt" 2>/dev/null || true
    fi
}

# Function to validate service health
validate_service_health() {
    local service=$1
    local health_url=""
    
    case $service in
        "sophisticated-runner")
            health_url="https://sophisticated-runner.onrender.com/health"
            ;;
        "public-api")
            health_url="https://llmrank.io/health"
            ;;
        "seo-metrics-runner")
            health_url="https://seo-metrics-runner.onrender.com/health"
            ;;
        *)
            health_url="https://$service.onrender.com/health"
            ;;
    esac
    
    log_info "Validating health for $service at $health_url"
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$health_url" >/dev/null 2>&1; then
            log_success "$service is healthy"
            return 0
        fi
        
        log_warning "Health check attempt $attempt/$max_attempts failed for $service"
        sleep 30
        ((attempt++))
    done
    
    log_error "Health check failed for $service after $max_attempts attempts"
    return 1
}

# Function to deploy service
deploy_service() {
    local service=$1
    local service_path=${SERVICES[$service]}
    
    log_info "Starting deployment for $service..."
    
    # Create backup before deployment
    create_backup "$service"
    
    # Validate service configuration
    if [ ! -d "$PROJECT_ROOT/$service_path" ]; then
        log_error "Service directory not found: $service_path"
        return 1
    fi
    
    # Build and test locally first
    log_info "Building $service locally..."
    cd "$PROJECT_ROOT/$service_path"
    
    # Install dependencies and build
    if [ -f "package.json" ]; then
        npm cache clean --force
        npm ci
        if [ -f "tsconfig.json" ]; then
            npm run build
        fi
        
        # Run tests if available
        if npm run test --silent >/dev/null 2>&1; then
            log_info "Running tests for $service..."
            npm test
        fi
    elif [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
    fi
    
    cd "$PROJECT_ROOT"
    
    # Deploy to production
    log_info "Deploying $service to production..."
    
    # Commit current changes
    git add .
    git commit -m "Production deployment: $service - $TIMESTAMP" || true
    
    # Push to trigger deployment
    git push origin main
    
    # Wait for deployment to complete
    log_info "Waiting for deployment to complete..."
    sleep 60
    
    # Validate deployment
    if validate_service_health "$service"; then
        log_success "✅ Deployment successful for $service"
        
        # Store successful deployment info
        echo "DEPLOYMENT_SUCCESS: $service at $TIMESTAMP" >> "$BACKUP_DIR/deployment_status.log"
        return 0
    else
        log_error "❌ Deployment validation failed for $service"
        return 1
    fi
}

# Function to rollback service
rollback_service() {
    local service=$1
    
    log_warning "Starting rollback for $service..."
    
    # Find latest backup
    local latest_backup=$(find "$PROJECT_ROOT/backups" -name "deployment_*" -type d | sort -r | head -1)
    
    if [ -z "$latest_backup" ]; then
        log_error "No backup found for rollback"
        return 1
    fi
    
    log_info "Rolling back using backup: $latest_backup"
    
    # Restore from backup
    if [ -f "$latest_backup/git_commit_$service.txt" ]; then
        local previous_commit=$(cat "$latest_backup/git_commit_$service.txt")
        log_info "Rolling back to commit: $previous_commit"
        
        git reset --hard "$previous_commit"
        git push origin main --force
        
        # Wait for rollback deployment
        sleep 60
        
        if validate_service_health "$service"; then
            log_success "✅ Rollback successful for $service"
            return 0
        else
            log_error "❌ Rollback validation failed for $service"
            return 1
        fi
    else
        log_error "No git commit info found in backup"
        return 1
    fi
}

# Function to deploy all services
deploy_all() {
    log_info "Starting deployment of all services..."
    
    local failed_services=()
    
    for service in "${!SERVICES[@]}"; do
        if deploy_service "$service"; then
            log_success "✅ $service deployed successfully"
        else
            log_error "❌ $service deployment failed"
            failed_services+=("$service")
        fi
        
        # Wait between deployments to avoid overwhelming Render
        sleep 30
    done
    
    if [ ${#failed_services[@]} -eq 0 ]; then
        log_success "🎉 All services deployed successfully!"
        
        # Send notification if configured
        if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
            curl -X POST -H 'Content-type: application/json' \
                --data "{\"text\":\"✅ Production deployment completed successfully at $TIMESTAMP\"}" \
                "$SLACK_WEBHOOK_URL"
        fi
    else
        log_error "❌ Deployment failed for services: ${failed_services[*]}"
        exit 1
    fi
}

# Main execution
main() {
    local service="${1:-all}"
    local action="${2:-deploy}"
    
    log_info "Production Deployment Script"
    log_info "Timestamp: $TIMESTAMP"
    log_info "Service: $service"
    log_info "Action: $action"
    
    # Validate git repository
    if ! git status >/dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        log_warning "Uncommitted changes detected. Proceeding with deployment..."
    fi
    
    case $action in
        "deploy"|"--deploy")
            if [ "$service" = "all" ]; then
                deploy_all
            elif [ -n "${SERVICES[$service]:-}" ]; then
                deploy_service "$service"
            else
                log_error "Unknown service: $service"
                log_info "Available services: ${!SERVICES[*]}"
                exit 1
            fi
            ;;
        "rollback"|"--rollback")
            if [ "$service" = "all" ]; then
                log_error "Rollback for all services not supported. Specify a service."
                exit 1
            elif [ -n "${SERVICES[$service]:-}" ]; then
                rollback_service "$service"
            else
                log_error "Unknown service: $service"
                exit 1
            fi
            ;;
        *)
            log_error "Unknown action: $action"
            log_info "Usage: $0 [service] [deploy|rollback]"
            log_info "Available services: ${!SERVICES[*]}"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
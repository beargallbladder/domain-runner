#!/bin/bash
# Production Deployment Script
# Ensures zero-downtime deployment with health checks and rollback capability

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV="${DEPLOY_ENV:-production}"
ROLLBACK_ON_FAILURE="${ROLLBACK_ON_FAILURE:-true}"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_DELAY=30
DEPLOYMENT_TIMEOUT=600

# Services to deploy
SERVICES=(
  "sophisticated-runner"
  "domain-runner"
  "llmrank-api"
  "seo-metrics-runner"
  "cohort-intelligence"
  "industry-intelligence"
  "news-correlation-service"
  "swarm-intelligence"
)

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
pre_deployment_checks() {
  log_info "Running pre-deployment checks..."
  
  # Check Node.js version
  local node_version=$(node --version | cut -d'v' -f2)
  local required_version="18.0.0"
  if ! printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1 | grep -q "$required_version"; then
    log_error "Node.js version $node_version is below required version $required_version"
    exit 1
  fi
  
  # Check if all required environment variables are set
  local required_vars=(
    "DATABASE_URL"
    "OPENAI_API_KEYS"
    "ANTHROPIC_API_KEYS"
    "DEEPSEEK_API_KEYS"
  )
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
      log_error "Required environment variable $var is not set"
      exit 1
    fi
  done
  
  # Run tests
  log_info "Running test suite..."
  npm test || {
    log_error "Tests failed. Aborting deployment."
    exit 1
  }
  
  # Check database connectivity
  log_info "Checking database connectivity..."
  npm run db:health || {
    log_error "Database health check failed"
    exit 1
  }
  
  log_info "Pre-deployment checks passed ✓"
}

# Build services
build_services() {
  log_info "Building services..."
  
  for service in "${SERVICES[@]}"; do
    log_info "Building $service..."
    
    if [ -d "services/$service" ]; then
      (
        cd "services/$service"
        npm ci
        npm run build
      ) || {
        log_error "Failed to build $service"
        return 1
      }
    else
      log_warning "Service directory services/$service not found, skipping..."
    fi
  done
  
  log_info "All services built successfully ✓"
}

# Deploy single service
deploy_service() {
  local service=$1
  local deployment_id=$(date +%s)
  
  log_info "Deploying $service (deployment ID: $deployment_id)..."
  
  # Tag current version for rollback
  git tag -a "deploy-$service-$deployment_id" -m "Deployment of $service at $(date)"
  
  # Deploy to Render
  if [ "$service" == "llmrank-api" ]; then
    # Special handling for Python service
    (
      cd services/llmrank-api
      render deploy --service llmrank-api
    )
  else
    # Node.js services
    (
      cd services/$service
      render deploy --service $service
    )
  fi
  
  # Wait for deployment to complete
  log_info "Waiting for $service deployment to complete..."
  sleep 30
  
  # Perform health check
  if ! health_check_service "$service"; then
    log_error "Health check failed for $service"
    if [ "$ROLLBACK_ON_FAILURE" == "true" ]; then
      rollback_service "$service" "$deployment_id"
    fi
    return 1
  fi
  
  log_info "$service deployed successfully ✓"
  return 0
}

# Health check for service
health_check_service() {
  local service=$1
  local attempt=0
  
  log_info "Running health checks for $service..."
  
  # Get service URL
  local service_url=""
  case $service in
    "sophisticated-runner")
      service_url="https://sophisticated-runner.onrender.com/health"
      ;;
    "domain-runner")
      service_url="https://domain-runner.onrender.com/health"
      ;;
    "llmrank-api")
      service_url="https://llmrank.io/health"
      ;;
    *)
      service_url="https://$service.onrender.com/health"
      ;;
  esac
  
  while [ $attempt -lt $HEALTH_CHECK_RETRIES ]; do
    attempt=$((attempt + 1))
    log_info "Health check attempt $attempt/$HEALTH_CHECK_RETRIES for $service..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$service_url" || echo "000")
    
    if [ "$response" == "200" ]; then
      log_info "Health check passed for $service ✓"
      return 0
    else
      log_warning "Health check failed for $service (HTTP $response), retrying in ${HEALTH_CHECK_DELAY}s..."
      sleep $HEALTH_CHECK_DELAY
    fi
  done
  
  log_error "Health check failed for $service after $HEALTH_CHECK_RETRIES attempts"
  return 1
}

# Rollback service
rollback_service() {
  local service=$1
  local deployment_id=$2
  
  log_warning "Rolling back $service deployment..."
  
  # Find previous deployment tag
  local previous_tag=$(git tag -l "deploy-$service-*" | grep -v "$deployment_id" | tail -n 1)
  
  if [ -n "$previous_tag" ]; then
    log_info "Rolling back to $previous_tag..."
    git checkout "$previous_tag"
    deploy_service "$service" || {
      log_error "Rollback failed for $service"
      return 1
    }
  else
    log_error "No previous deployment found for rollback"
    return 1
  fi
}

# Run database migrations
run_migrations() {
  log_info "Running database migrations..."
  
  npm run db:migrate || {
    log_error "Database migrations failed"
    return 1
  }
  
  log_info "Database migrations completed ✓"
}

# Deploy all services with blue-green strategy
deploy_all_services() {
  log_info "Starting production deployment..."
  
  local failed_services=()
  
  # Deploy services in order
  for service in "${SERVICES[@]}"; do
    if ! deploy_service "$service"; then
      failed_services+=("$service")
      log_error "Deployment failed for $service"
      
      # Stop deployment if critical service fails
      if [[ "$service" == "sophisticated-runner" || "$service" == "domain-runner" ]]; then
        log_error "Critical service deployment failed. Stopping deployment."
        break
      fi
    fi
  done
  
  if [ ${#failed_services[@]} -eq 0 ]; then
    log_info "All services deployed successfully! 🎉"
    return 0
  else
    log_error "Deployment failed for services: ${failed_services[*]}"
    return 1
  fi
}

# Post-deployment verification
post_deployment_verification() {
  log_info "Running post-deployment verification..."
  
  # Test critical endpoints
  local endpoints=(
    "https://sophisticated-runner.onrender.com/health"
    "https://domain-runner.onrender.com/health"
    "https://llmrank.io/api/v1/stats"
  )
  
  for endpoint in "${endpoints[@]}"; do
    log_info "Testing $endpoint..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
    
    if [ "$response" != "200" ]; then
      log_error "Post-deployment check failed for $endpoint (HTTP $response)"
      return 1
    fi
  done
  
  # Run smoke tests
  log_info "Running smoke tests..."
  npm run test:smoke || {
    log_error "Smoke tests failed"
    return 1
  }
  
  log_info "Post-deployment verification passed ✓"
  return 0
}

# Send deployment notification
send_notification() {
  local status=$1
  local message=$2
  
  # Send Slack notification if webhook is configured
  if [ -n "${SLACK_WEBHOOK:-}" ]; then
    local color="good"
    local emoji="✅"
    
    if [ "$status" == "failure" ]; then
      color="danger"
      emoji="❌"
    fi
    
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"$emoji Production Deployment $status\",
          \"text\": \"$message\",
          \"fields\": [
            {
              \"title\": \"Environment\",
              \"value\": \"$DEPLOY_ENV\",
              \"short\": true
            },
            {
              \"title\": \"Timestamp\",
              \"value\": \"$(date)\",
              \"short\": true
            }
          ]
        }]
      }"
  fi
}

# Main deployment flow
main() {
  local start_time=$(date +%s)
  
  log_info "=== Starting Production Deployment ==="
  log_info "Environment: $DEPLOY_ENV"
  log_info "Timestamp: $(date)"
  
  # Create deployment backup
  log_info "Creating deployment backup..."
  git tag -a "backup-$(date +%Y%m%d-%H%M%S)" -m "Pre-deployment backup"
  
  # Execute deployment steps
  if pre_deployment_checks && \
     build_services && \
     run_migrations && \
     deploy_all_services && \
     post_deployment_verification; then
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log_info "=== Deployment Completed Successfully ==="
    log_info "Duration: ${duration}s"
    
    send_notification "success" "Production deployment completed successfully in ${duration}s"
    exit 0
  else
    log_error "=== Deployment Failed ==="
    send_notification "failure" "Production deployment failed. Check logs for details."
    exit 1
  fi
}

# Run main function
main "$@"
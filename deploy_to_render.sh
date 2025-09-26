#!/bin/bash

# Autonomous Render Deployment Script
# This script provides multiple approaches to deploy to Render autonomously

set -euo pipefail

# Configuration
REPO_URL="https://github.com/beargallbladder/domain-runner"
BLUEPRINT_FILE="render-rust.yaml"
RENDER_DASHBOARD_URL="https://dashboard.render.com"
LOG_FILE="deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

# Function to check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        return 1
    fi

    local remote_url
    remote_url=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ "$remote_url" != *"domain-runner"* ]]; then
        log "ERROR" "Not in the domain-runner repository"
        return 1
    fi

    log "INFO" "Git repository verified: ${remote_url}"
    return 0
}

# Function to check if Blueprint file exists and is valid
check_blueprint() {
    if [[ ! -f "$BLUEPRINT_FILE" ]]; then
        log "ERROR" "Blueprint file not found: $BLUEPRINT_FILE"
        return 1
    fi

    # Validate YAML syntax
    if command -v python3 >/dev/null 2>&1; then
        if ! python3 -c "import yaml; yaml.safe_load(open('$BLUEPRINT_FILE', 'r'))" 2>/dev/null; then
            log "ERROR" "Invalid YAML syntax in $BLUEPRINT_FILE"
            return 1
        fi
    fi

    log "INFO" "Blueprint file validated: $BLUEPRINT_FILE"
    return 0
}

# Function to create Render Blueprint deployment URL
create_blueprint_url() {
    local encoded_repo
    local blueprint_url

    # URL encode the repository URL
    encoded_repo=$(printf '%s' "$REPO_URL" | sed 's/:/%3A/g; s/\//%2F/g')

    # Create the Blueprint deployment URL
    blueprint_url="https://render.com/deploy?repo=${encoded_repo}&blueprint=${BLUEPRINT_FILE}"

    log "INFO" "Generated Blueprint deployment URL:"
    log "INFO" "${BLUE}${blueprint_url}${NC}"

    return 0
}

# Function to push changes to trigger GitHub auto-deploy
trigger_github_deploy() {
    log "INFO" "Checking for changes to push..."

    # Check if there are any changes
    if git diff-index --quiet HEAD --; then
        log "INFO" "No changes to commit, creating deployment trigger commit..."

        # Create a deployment trigger file
        echo "Deployment triggered at $(date -u)" > .render-deploy-trigger
        git add .render-deploy-trigger

        git commit -m "trigger: Deploy to Render

🚀 Autonomous deployment initiated

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    else
        log "INFO" "Changes detected, committing and pushing..."
        git add -A
        git commit -m "deploy: Update configuration for Render deployment

- Updated render-rust.yaml with DB_READONLY=true
- Added deployment monitoring and automation scripts
- Configured read-only mode for production safety

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
    fi

    log "INFO" "Pushing changes to trigger deployment..."
    git push origin main

    log "INFO" "${GREEN}✓${NC} Changes pushed to GitHub, auto-deployment should be triggered"
    return 0
}

# Function to check deployment API options
check_render_api() {
    if [[ -n "${RENDER_API_KEY:-}" ]]; then
        log "INFO" "Render API key found, API deployment possible"
        return 0
    else
        log "WARN" "No Render API key found in environment"
        log "INFO" "Set RENDER_API_KEY environment variable for API deployment"
        return 1
    fi
}

# Function to deploy via Render API
deploy_via_api() {
    if ! check_render_api; then
        return 1
    fi

    local web_service_id="${RENDER_WEB_SERVICE_ID:-}"
    local worker_service_id="${RENDER_WORKER_SERVICE_ID:-}"

    if [[ -z "$web_service_id" || -z "$worker_service_id" ]]; then
        log "ERROR" "Service IDs required: RENDER_WEB_SERVICE_ID and RENDER_WORKER_SERVICE_ID"
        return 1
    fi

    log "INFO" "Deploying web service via API..."
    local web_deploy_response
    web_deploy_response=$(curl -s -X POST \
        -H "Authorization: Bearer ${RENDER_API_KEY}" \
        -H "Content-Type: application/json" \
        "https://api.render.com/v1/services/${web_service_id}/deploys" \
        -d '{"clearCache": false}' || echo "")

    if [[ -n "$web_deploy_response" ]]; then
        log "INFO" "${GREEN}✓${NC} Web service deployment triggered"
    else
        log "ERROR" "Failed to trigger web service deployment"
        return 1
    fi

    log "INFO" "Deploying worker service via API..."
    local worker_deploy_response
    worker_deploy_response=$(curl -s -X POST \
        -H "Authorization: Bearer ${RENDER_API_KEY}" \
        -H "Content-Type: application/json" \
        "https://api.render.com/v1/services/${worker_service_id}/deploys" \
        -d '{"clearCache": false}' || echo "")

    if [[ -n "$worker_deploy_response" ]]; then
        log "INFO" "${GREEN}✓${NC} Worker service deployment triggered"
    else
        log "ERROR" "Failed to trigger worker service deployment"
        return 1
    fi

    return 0
}

# Function to create deployment instructions
create_deployment_instructions() {
    local instructions_file="RENDER_DEPLOYMENT_INSTRUCTIONS.md"

    cat > "$instructions_file" << 'EOF'
# Render Deployment Instructions

## Automated Deployment Options

### Option 1: GitHub Integration (Recommended)
1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub account if not already connected
4. Select the `beargallbladder/domain-runner` repository
5. The Blueprint file (`render-rust.yaml`) will be automatically detected
6. Click "Apply" to deploy both services

### Option 2: Direct Blueprint URL
Click this link to deploy directly:
EOF

    # Add the Blueprint URL to the file
    local encoded_repo blueprint_url
    encoded_repo=$(printf '%s' "$REPO_URL" | sed 's/:/%3A/g; s/\//%2F/g')
    blueprint_url="https://render.com/deploy?repo=${encoded_repo}&blueprint=${BLUEPRINT_FILE}"

    echo "" >> "$instructions_file"
    echo "\`${blueprint_url}\`" >> "$instructions_file"

    cat >> "$instructions_file" << 'EOF'

### Option 3: API Deployment (if credentials available)
Set environment variables and run:
```bash
export RENDER_API_KEY="your_api_key"
export RENDER_WEB_SERVICE_ID="your_web_service_id"
export RENDER_WORKER_SERVICE_ID="your_worker_service_id"
./deploy_to_render.sh api
```

## Services Configuration

### Web Service (domain-runner-rust-web)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `Dockerfile.rust`
- **Command**: `web`
- **Plan**: Starter
- **Health Check**: `/healthz`
- **Read-only Mode**: Enabled (`DB_READONLY=true`)

### Worker Service (domain-runner-rust-worker)
- **Type**: Worker Service
- **Environment**: Docker
- **Dockerfile**: `Dockerfile.rust`
- **Command**: `worker`
- **Plan**: Starter
- **Read-only Mode**: Enabled (`DB_READONLY=true`)

## Environment Variables
Both services will have `DB_READONLY=true` set for production safety.
API keys are configured but require manual setup in Render dashboard.

## Monitoring
After deployment, run:
```bash
./deployment_monitor.sh monitor
```

This will monitor the health endpoint every 30 seconds and report status.

## Expected URLs
- Web Service: https://domain-runner-rust-web.onrender.com
- Health Check: https://domain-runner-rust-web.onrender.com/healthz
EOF

    log "INFO" "Deployment instructions created: ${instructions_file}"
    return 0
}

# Function to show deployment summary
show_deployment_summary() {
    log "INFO" "${PURPLE}=== DEPLOYMENT SUMMARY ===${NC}"
    log "INFO" "Repository: ${REPO_URL}"
    log "INFO" "Blueprint: ${BLUEPRINT_FILE}"
    log "INFO" "Read-only mode: Enabled (DB_READONLY=true)"
    log "INFO" ""
    log "INFO" "Expected service URLs:"
    log "INFO" "  Web Service: https://domain-runner-rust-web.onrender.com"
    log "INFO" "  Health Check: https://domain-runner-rust-web.onrender.com/healthz"
    log "INFO" ""
    log "INFO" "Monitoring command:"
    log "INFO" "  ./deployment_monitor.sh monitor"
}

# Function to run autonomous deployment
run_autonomous_deployment() {
    log "INFO" "${BLUE}Starting autonomous Render deployment...${NC}"

    # Step 1: Validate environment
    if ! check_git_repo || ! check_blueprint; then
        log "ERROR" "Environment validation failed"
        return 1
    fi

    # Step 2: Try API deployment first
    if deploy_via_api; then
        log "INFO" "${GREEN}✓${NC} API deployment successful"
    else
        log "INFO" "API deployment not available, using GitHub integration"

        # Step 3: Trigger GitHub deployment
        if trigger_github_deploy; then
            log "INFO" "${GREEN}✓${NC} GitHub deployment triggered"
        else
            log "ERROR" "Failed to trigger GitHub deployment"
            return 1
        fi
    fi

    # Step 4: Create deployment instructions
    create_deployment_instructions

    # Step 5: Show summary
    show_deployment_summary

    # Step 6: Start monitoring
    if [[ -f "deployment_monitor.sh" ]]; then
        log "INFO" "${BLUE}Starting deployment monitoring...${NC}"
        ./deployment_monitor.sh deploy
    else
        log "WARN" "Deployment monitor not found, skipping monitoring"
    fi

    return 0
}

# Function to display help
show_help() {
    cat << EOF
Autonomous Render Deployment Script

Usage: $0 [COMMAND]

Commands:
  auto        Run fully autonomous deployment (default)
  api         Deploy via Render API (requires credentials)
  github      Trigger GitHub-based deployment
  blueprint   Generate Blueprint deployment URL
  monitor     Start deployment monitoring only
  help        Show this help message

Environment Variables:
  RENDER_API_KEY           - Render API key for API deployment
  RENDER_WEB_SERVICE_ID    - Web service ID for API deployment
  RENDER_WORKER_SERVICE_ID - Worker service ID for API deployment

Examples:
  $0                    # Run autonomous deployment
  $0 auto              # Same as above
  $0 api               # Deploy via API (requires credentials)
  $0 github            # Trigger GitHub deployment
  $0 blueprint         # Generate Blueprint URL
  $0 monitor           # Start monitoring only

EOF
}

# Main function
main() {
    local command="${1:-auto}"

    case "$command" in
        "auto")
            run_autonomous_deployment
            ;;
        "api")
            deploy_via_api
            ;;
        "github")
            trigger_github_deploy
            ;;
        "blueprint")
            create_blueprint_url
            ;;
        "monitor")
            if [[ -f "deployment_monitor.sh" ]]; then
                ./deployment_monitor.sh monitor
            else
                log "ERROR" "Deployment monitor script not found"
                exit 1
            fi
            ;;
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        *)
            log "ERROR" "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Create log file
touch "${LOG_FILE}"

# Run main function
main "$@"
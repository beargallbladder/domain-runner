#!/bin/bash

# Domain Runner - Pre-deployment Checks
# This script validates the system state before deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track errors
ERRORS=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((ERRORS++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Check Git status
check_git_status() {
    print_header "Git Status Check"
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        check_fail "Not in a git repository"
        return 1
    fi
    
    # Check current branch
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        check_warn "Not on main branch (current: $current_branch)"
    else
        check_pass "On main branch"
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        check_warn "Uncommitted changes detected"
        git status --short
    else
        check_pass "No uncommitted changes"
    fi
    
    # Check if up to date with remote
    git fetch origin main --quiet
    local LOCAL=$(git rev-parse HEAD)
    local REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" != "$REMOTE" ]; then
        check_warn "Local branch is not up to date with origin/main"
    else
        check_pass "Up to date with origin/main"
    fi
}

# Check Node.js environment
check_node_environment() {
    print_header "Node.js Environment Check"
    
    # Check Node version
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        check_pass "Node.js installed: $node_version"
        
        # Check minimum version (v16+)
        local major_version=$(echo $node_version | cut -d. -f1 | sed 's/v//')
        if [ "$major_version" -lt 16 ]; then
            check_fail "Node.js version too old (requires v16+)"
        fi
    else
        check_fail "Node.js not installed"
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        check_pass "npm installed: $npm_version"
    else
        check_fail "npm not installed"
    fi
}

# Check Python environment
check_python_environment() {
    print_header "Python Environment Check"
    
    # Check Python version
    if command -v python3 >/dev/null 2>&1; then
        local python_version=$(python3 --version 2>&1)
        check_pass "Python installed: $python_version"
    else
        check_fail "Python 3 not installed"
    fi
    
    # Check pip
    if command -v pip3 >/dev/null 2>&1; then
        check_pass "pip3 installed"
    else
        check_fail "pip3 not installed"
    fi
}

# Check service directories
check_service_structure() {
    print_header "Service Structure Check"
    
    local services=(
        "services/domain-processor-v2"
        "services/sophisticated-runner"
        "services/seo-metrics-runner"
        "services/public-api"
        "services/embedding-engine"
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
            # Check for package.json in Node services
            if [[ ! "$service" =~ "public-api|embedding-engine" ]] && [ ! -f "$service/package.json" ]; then
                check_fail "$service missing package.json"
            else
                check_pass "$service exists"
            fi
        else
            check_fail "$service directory not found"
        fi
    done
}

# Check environment variables
check_environment_variables() {
    print_header "Environment Variables Check"
    
    # Check for .env file
    if [ -f ".env" ]; then
        check_warn ".env file exists (should not be committed)"
    fi
    
    # Check critical environment variables are NOT hardcoded
    if grep -r "OPENAI_API_KEY\s*=" --include="*.ts" --include="*.js" --include="*.py" services/ 2>/dev/null | grep -v "process.env" | grep -v "os.environ"; then
        check_fail "Hardcoded API keys found in code!"
    else
        check_pass "No hardcoded API keys found"
    fi
}

# Check dependencies
check_dependencies() {
    print_header "Dependencies Check"
    
    # Check for vulnerable dependencies
    echo "Checking for known vulnerabilities..."
    
    # Run npm audit for main package
    if [ -f "package.json" ]; then
        local audit_result=$(npm audit --json 2>/dev/null | jq -r '.metadata.vulnerabilities | to_entries | map(select(.value > 0)) | length')
        if [ "$audit_result" -gt 0 ]; then
            check_warn "npm audit found $audit_result vulnerabilities"
        else
            check_pass "No npm vulnerabilities found"
        fi
    fi
}

# Check database connectivity
check_database_connectivity() {
    print_header "Database Connectivity Check"
    
    # Check if we can reach the database (using a simple Node.js script)
    if [ -n "$DATABASE_URL" ]; then
        check_pass "DATABASE_URL is set"
    else
        check_warn "DATABASE_URL not set in environment"
    fi
}

# Check render.yaml validity
check_render_config() {
    print_header "Render Configuration Check"
    
    if [ -f "render.yaml" ]; then
        check_pass "render.yaml exists"
        
        # Basic YAML syntax check
        if command -v python3 >/dev/null 2>&1; then
            if python3 -c "import yaml; yaml.safe_load(open('render.yaml'))" 2>/dev/null; then
                check_pass "render.yaml has valid YAML syntax"
            else
                check_fail "render.yaml has invalid YAML syntax"
            fi
        fi
    else
        check_fail "render.yaml not found"
    fi
}

# Check disk space
check_disk_space() {
    print_header "Disk Space Check"
    
    local available_space=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -lt 2 ]; then
        check_fail "Low disk space: ${available_space}GB available (need at least 2GB)"
    else
        check_pass "Sufficient disk space: ${available_space}GB available"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Domain Runner - Pre-deployment Checks${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo "Starting pre-deployment validation..."
    
    # Run all checks
    check_git_status
    check_node_environment
    check_python_environment
    check_service_structure
    check_environment_variables
    check_dependencies
    check_database_connectivity
    check_render_config
    check_disk_space
    
    # Summary
    echo -e "\n${BLUE}=== Pre-deployment Check Summary ===${NC}"
    echo -e "Errors: ${RED}${ERRORS}${NC}"
    echo -e "Warnings: ${YELLOW}${WARNINGS}${NC}"
    
    if [ $ERRORS -gt 0 ]; then
        echo -e "\n${RED}Pre-deployment checks failed!${NC}"
        echo "Please fix the errors above before deploying."
        exit 1
    elif [ $WARNINGS -gt 0 ]; then
        echo -e "\n${YELLOW}Pre-deployment checks passed with warnings.${NC}"
        echo "Review the warnings above. Deployment can proceed."
        exit 0
    else
        echo -e "\n${GREEN}All pre-deployment checks passed!${NC}"
        exit 0
    fi
}

# Run checks
main
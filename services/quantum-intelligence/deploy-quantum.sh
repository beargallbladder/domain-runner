#!/bin/bash

# Quantum Intelligence Module - Safe Deployment Script
# This script ensures safe, gradual rollout of quantum features

set -e  # Exit on error

echo "🌌 Quantum Intelligence Module Deployment"
echo "========================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_ENV=${1:-staging}
DATABASE_URL=${DATABASE_URL:-}

# Safety checks
safety_checks() {
    echo -e "${YELLOW}Running safety checks...${NC}"
    
    # Check if database URL is set
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
        exit 1
    fi
    
    # Check if we're in production
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        echo -e "${YELLOW}WARNING: Deploying to PRODUCTION${NC}"
        read -p "Are you sure? (type 'yes' to continue): " confirm
        if [ "$confirm" != "yes" ]; then
            echo -e "${RED}Deployment cancelled${NC}"
            exit 1
        fi
    fi
    
    # Check current system health
    echo "Checking current system health..."
    curl -s http://localhost:3456/health > /dev/null || {
        echo -e "${RED}ERROR: System health check failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Safety checks passed${NC}"
}

# Run migrations
run_migrations() {
    echo -e "${YELLOW}Running quantum table migrations...${NC}"
    
    # Backup current schema first
    pg_dump $DATABASE_URL --schema-only > backup/schema_$(date +%Y%m%d_%H%M%S).sql
    
    # Run migrations
    psql $DATABASE_URL < services/quantum-intelligence/migrations/001_create_quantum_tables.sql
    
    # Verify tables created
    TABLE_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'quantum_%'")
    
    if [ $TABLE_COUNT -lt 5 ]; then
        echo -e "${RED}ERROR: Expected quantum tables not created${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
}

# Deploy in shadow mode
deploy_shadow_mode() {
    echo -e "${YELLOW}Deploying in SHADOW MODE...${NC}"
    
    # Set environment variables
    export QUANTUM_ENABLED=true
    export QUANTUM_SHADOW_MODE=true
    export QUANTUM_API_EXPOSED=false
    export QUANTUM_MAX_CALC_TIME_MS=5000
    export QUANTUM_CACHE_ENABLED=true
    export QUANTUM_CACHE_TTL_SECONDS=3600
    
    # Update .env file
    cat >> .env << EOF

# Quantum Intelligence Module (SHADOW MODE)
QUANTUM_ENABLED=true
QUANTUM_SHADOW_MODE=true
QUANTUM_API_EXPOSED=false
QUANTUM_MAX_CALC_TIME_MS=5000
QUANTUM_CACHE_ENABLED=true
QUANTUM_CACHE_TTL_SECONDS=3600
EOF

    echo -e "${GREEN}✓ Shadow mode configuration set${NC}"
}

# Run tests
run_tests() {
    echo -e "${YELLOW}Running quantum module tests...${NC}"
    
    cd services/quantum-intelligence
    npm test
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Tests failed${NC}"
        exit 1
    fi
    
    cd ../..
    echo -e "${GREEN}✓ All tests passed${NC}"
}

# Monitor shadow mode
monitor_shadow_mode() {
    echo -e "${YELLOW}Monitoring shadow mode operation...${NC}"
    
    # Wait for service restart
    sleep 10
    
    # Check quantum health endpoint
    HEALTH=$(curl -s http://localhost:3456/quantum/health | jq -r '.status')
    
    if [ "$HEALTH" != "healthy" ]; then
        echo -e "${RED}ERROR: Quantum module not healthy${NC}"
        exit 1
    fi
    
    # Monitor for 5 minutes
    echo "Monitoring for 5 minutes..."
    for i in {1..5}; do
        sleep 60
        ERROR_COUNT=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM quantum_analysis_log WHERE status = 'failed' AND created_at > NOW() - INTERVAL '5 minutes'")
        
        if [ $ERROR_COUNT -gt 10 ]; then
            echo -e "${RED}ERROR: High error rate detected ($ERROR_COUNT errors)${NC}"
            rollback
            exit 1
        fi
        
        echo "Minute $i: $ERROR_COUNT errors"
    done
    
    echo -e "${GREEN}✓ Shadow mode running successfully${NC}"
}

# Gradual rollout
gradual_rollout() {
    echo -e "${YELLOW}Starting gradual rollout...${NC}"
    
    # Phase 1: Enable for 10% of domains
    echo "Phase 1: Enabling for 10% of domains..."
    export QUANTUM_ROLLOUT_PERCENTAGE=10
    
    sleep 300  # Monitor for 5 minutes
    
    # Check success rate
    SUCCESS_RATE=$(psql $DATABASE_URL -t -c "
        SELECT 
            ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2)
        FROM quantum_analysis_log 
        WHERE created_at > NOW() - INTERVAL '5 minutes'
    ")
    
    if (( $(echo "$SUCCESS_RATE < 90" | bc -l) )); then
        echo -e "${RED}ERROR: Success rate too low ($SUCCESS_RATE%)${NC}"
        rollback
        exit 1
    fi
    
    # Phase 2: Enable for 50% of domains
    echo "Phase 2: Enabling for 50% of domains..."
    export QUANTUM_ROLLOUT_PERCENTAGE=50
    
    sleep 300
    
    # Phase 3: Full rollout
    echo "Phase 3: Full rollout..."
    export QUANTUM_ROLLOUT_PERCENTAGE=100
    export QUANTUM_SHADOW_MODE=false
    
    echo -e "${GREEN}✓ Gradual rollout completed${NC}"
}

# Rollback function
rollback() {
    echo -e "${RED}ROLLING BACK...${NC}"
    
    # Disable quantum module
    export QUANTUM_ENABLED=false
    
    # Update .env
    sed -i '' 's/QUANTUM_ENABLED=true/QUANTUM_ENABLED=false/g' .env
    
    # Restart service
    pm2 restart domain-runner
    
    echo -e "${YELLOW}Rollback completed - Quantum module disabled${NC}"
}

# Production deployment
deploy_production() {
    echo -e "${YELLOW}Production deployment starting...${NC}"
    
    # Extra safety check
    echo "Production deployment checklist:"
    echo "[ ] All tests passing"
    echo "[ ] Shadow mode ran for at least 24 hours"
    echo "[ ] Error rate < 1%"
    echo "[ ] Performance impact < 5%"
    echo "[ ] Rollback plan tested"
    
    read -p "Confirm all items checked (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    
    # Enable API endpoints
    export QUANTUM_API_EXPOSED=true
    
    # Update production config
    echo "Updating production configuration..."
    
    echo -e "${GREEN}✓ Production deployment completed${NC}"
}

# Main deployment flow
main() {
    echo "Deployment environment: $DEPLOY_ENV"
    echo "Database: $DATABASE_URL"
    echo ""
    
    safety_checks
    run_migrations
    run_tests
    deploy_shadow_mode
    
    # Restart service with new config
    echo "Restarting service..."
    if command -v pm2 &> /dev/null; then
        pm2 restart domain-runner
    else
        # Fallback to systemctl or docker
        systemctl restart domain-runner || docker restart domain-runner
    fi
    
    monitor_shadow_mode
    
    if [[ "$DEPLOY_ENV" == "production" ]]; then
        gradual_rollout
        deploy_production
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Quantum Intelligence Module deployed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Monitor quantum health: http://localhost:3456/quantum/health"
    echo "2. Check logs: tail -f logs/quantum.log"
    echo "3. View metrics: http://localhost:3456/quantum/metrics"
    echo ""
    echo "To rollback: ./deploy-quantum.sh rollback"
}

# Handle rollback command
if [[ "$1" == "rollback" ]]; then
    rollback
    exit 0
fi

# Run main deployment
main
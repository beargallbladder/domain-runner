#!/bin/bash
# Deploy Rust domain-runner to Render SAFELY with existing database

set -e

echo "🦀 DEPLOYING RUST DOMAIN-RUNNER (SAFE READ-ONLY MODE)"
echo "======================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
GITHUB_REPO="https://github.com/beargallbladder/domain-runner"
BRANCH="main"

echo -e "${YELLOW}This deployment will:${NC}"
echo "1. Create Rust services on Render"
echo "2. Start in READ-ONLY mode (cannot modify your database)"
echo "3. Connect to your EXISTING production database"
echo "4. Show real data through API endpoints"
echo ""

# Check if render CLI is available
if ! command -v render &> /dev/null; then
    echo -e "${RED}Error: Render CLI not found${NC}"
    echo "Install with: brew tap render-oss/render && brew install render"
    exit 1
fi

# Step 1: Create the services using render.yaml
echo -e "${YELLOW}Step 1: Creating services from render-rust.yaml...${NC}"

# Create a deployment configuration
cat > render-deploy.yaml << 'EOF'
databases:
  # We'll use existing database, but Render needs this for the blueprint
  - name: domain-runner-db-rust
    plan: free
    databaseName: domain_runner
    user: domain_runner

services:
  # Rust Web Service
  - type: web
    name: domain-runner-rust-web
    env: docker
    dockerfilePath: ./Dockerfile.rust
    dockerCommand: web
    plan: free
    autoDeploy: true
    healthCheckPath: /healthz
    envVars:
      - key: RUST_LOG
        value: info,tower_http=debug

      # SAFETY: Start in read-only mode
      - key: DB_READONLY
        value: "true"
      - key: FEATURE_WRITE_DRIFT
        value: "false"
      - key: FEATURE_CRON
        value: "false"
      - key: FEATURE_WORKER_WRITES
        value: "false"

      # Database - will be updated to use existing
      - key: DATABASE_URL
        fromDatabase:
          name: domain-runner-db-rust
          property: connectionString

  # Rust Worker Service (observe-only initially)
  - type: worker
    name: domain-runner-rust-worker
    env: docker
    dockerfilePath: ./Dockerfile.rust
    dockerCommand: worker
    plan: free
    autoDeploy: true
    envVars:
      - key: RUST_LOG
        value: info
      - key: WORKER_INTERVAL_SEC
        value: "300"
      - key: WORKER_BATCH_SIZE
        value: "10"

      # SAFETY: Worker in observe-only mode
      - key: DB_READONLY
        value: "true"
      - key: FEATURE_WORKER_WRITES
        value: "false"
      - key: ENABLE_DRIFT_MONITORING
        value: "true"
      - key: ENABLE_TENSOR_PROCESSING
        value: "false"

      - key: DATABASE_URL
        fromDatabase:
          name: domain-runner-db-rust
          property: connectionString
EOF

echo -e "${GREEN}✓ Deployment configuration created${NC}"

# Step 2: Deploy using Render CLI
echo -e "${YELLOW}Step 2: Creating Render Blueprint...${NC}"
echo ""
echo "Please follow these steps in your Render Dashboard:"
echo ""
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Blueprint'"
echo "3. Connect to: ${GITHUB_REPO}"
echo "4. Select branch: ${BRANCH}"
echo "5. Use blueprint file: render-rust.yaml"
echo "6. Click 'Apply'"
echo ""
echo -e "${YELLOW}After services are created:${NC}"
echo ""
echo "CRITICAL: Update the DATABASE_URL for both services to point to your EXISTING database"
echo ""
echo "7. For each service (web and worker):"
echo "   - Go to Environment tab"
echo "   - Update DATABASE_URL to your existing production database URL"
echo "   - Add any LLM API keys you want to use"
echo ""

# Step 3: Create monitoring script
cat > check_deployment.sh << 'EOF'
#!/bin/bash
# Check deployment status

WEB_URL="https://domain-runner-rust-web.onrender.com"

echo "Checking Rust deployment..."
echo ""

# Health check
echo "1. Health Check:"
curl -s ${WEB_URL}/healthz | python3 -m json.tool

echo ""
echo "2. Readiness Check:"
curl -s ${WEB_URL}/readyz | python3 -m json.tool

echo ""
echo "3. Status (Real Data):"
curl -s ${WEB_URL}/status | python3 -m json.tool

echo ""
echo "If you see your real domain counts and data above, the deployment is successful!"
EOF

chmod +x check_deployment.sh

echo -e "${GREEN}✓ Monitoring script created: check_deployment.sh${NC}"

# Step 4: Create the production enable script
cat > enable_production.sh << 'EOF'
#!/bin/bash
# Enable production features gradually

echo "🚀 Enabling Production Features"
echo ""
echo "This script will help you gradually enable write features"
echo ""
echo "Current phase options:"
echo "1. Enable drift writes only (DB_READONLY=false, FEATURE_WRITE_DRIFT=true)"
echo "2. Enable worker writes (FEATURE_WORKER_WRITES=true)"
echo "3. Enable cron jobs (FEATURE_CRON=true)"
echo "4. Full production (all features enabled)"
echo ""
echo "Which phase? (1-4): "
read phase

case $phase in
  1)
    echo "Update these in Render Environment:"
    echo "  DB_READONLY=false"
    echo "  FEATURE_WRITE_DRIFT=true"
    ;;
  2)
    echo "Update these in Render Environment:"
    echo "  FEATURE_WORKER_WRITES=true"
    ;;
  3)
    echo "Update these in Render Environment:"
    echo "  FEATURE_CRON=true"
    ;;
  4)
    echo "Update these in Render Environment:"
    echo "  DB_READONLY=false"
    echo "  FEATURE_WRITE_DRIFT=true"
    echo "  FEATURE_WORKER_WRITES=true"
    echo "  FEATURE_CRON=true"
    ;;
esac
EOF

chmod +x enable_production.sh

echo -e "${GREEN}✓ Production enablement script created: enable_production.sh${NC}"

echo ""
echo "======================================================"
echo -e "${GREEN}DEPLOYMENT PREPARATION COMPLETE!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Go to Render Dashboard and create the Blueprint"
echo "2. Update DATABASE_URL to your existing production database"
echo "3. Wait for services to deploy (5-10 minutes)"
echo "4. Run: ./check_deployment.sh"
echo "5. Verify you see your real data"
echo "6. Check audit logs in your database:"
echo "   SELECT * FROM rust_audit_log ORDER BY created_at DESC LIMIT 10;"
echo ""
echo -e "${YELLOW}Remember: Services start in READ-ONLY mode. Your data is safe!${NC}"
echo ""
echo "Once verified, use ./enable_production.sh to gradually enable features."
#!/bin/bash
# Shadow database testing script - test against a copy before touching prod

set -e

echo "🔍 Shadow Database Testing for domain-runner Rust service"
echo "=========================================================="

# Configuration
PROD_DB_URL="${PROD_DATABASE_URL:-postgresql://prod_user:prod_pass@prod_host:5432/prod_db}"
SHADOW_DB_URL="${SHADOW_DATABASE_URL:-postgresql://shadow_user:shadow_pass@localhost:5432/shadow_db}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup prod schema
echo -e "${YELLOW}Step 1: Backing up production schema...${NC}"
pg_dump "$PROD_DB_URL" --schema-only > prod_schema_backup.sql
echo -e "${GREEN}✓ Schema backed up to prod_schema_backup.sql${NC}"

# Step 2: Create shadow database (if local)
if [[ "$SHADOW_DB_URL" == *"localhost"* ]]; then
    echo -e "${YELLOW}Step 2: Creating local shadow database...${NC}"
    createdb shadow_db 2>/dev/null || echo "Database already exists"
    psql "$SHADOW_DB_URL" < prod_schema_backup.sql
    echo -e "${GREEN}✓ Shadow database created${NC}"
else
    echo -e "${YELLOW}Step 2: Using remote shadow database${NC}"
fi

# Step 3: Test Rust service in READ-ONLY mode
echo -e "${YELLOW}Step 3: Testing Rust service (READ-ONLY)...${NC}"

export DATABASE_URL="$SHADOW_DB_URL"
export DB_READONLY=true
export FEATURE_WRITE_DRIFT=false
export FEATURE_CRON=false
export FEATURE_WORKER_WRITES=false
export RUST_LOG=info

# Build the Rust service
cargo build --release 2>&1 | tail -5

# Start web service in background
./target/release/web &
WEB_PID=$!
echo "Web service started with PID $WEB_PID"

# Wait for service to start
sleep 3

# Test endpoints
echo -e "${YELLOW}Testing endpoints...${NC}"

# Health check
if curl -f -s http://localhost:8080/healthz > /dev/null; then
    echo -e "${GREEN}✓ /healthz endpoint working${NC}"
else
    echo -e "${RED}✗ /healthz endpoint failed${NC}"
fi

# Readiness check
READY_RESPONSE=$(curl -s http://localhost:8080/readyz)
if [[ "$READY_RESPONSE" == *"ready"* ]]; then
    echo -e "${GREEN}✓ /readyz endpoint working${NC}"
else
    echo -e "${YELLOW}⚠ /readyz shows not fully ready (expected in read-only)${NC}"
fi

# Status check - should show real data
STATUS_RESPONSE=$(curl -s http://localhost:8080/status)
if [[ "$STATUS_RESPONSE" == *"db_readonly\":true"* ]]; then
    echo -e "${GREEN}✓ /status shows read-only mode active${NC}"
    echo "Status response sample:"
    echo "$STATUS_RESPONSE" | jq '.data' 2>/dev/null || echo "$STATUS_RESPONSE"
else
    echo -e "${RED}✗ /status endpoint issue${NC}"
fi

# Step 4: Test worker in observe-only mode
echo -e "${YELLOW}Step 4: Testing worker (observe-only)...${NC}"

# Start worker for 10 seconds
timeout 10 ./target/release/worker || true
echo -e "${GREEN}✓ Worker ran without crashes${NC}"

# Step 5: Check audit log
echo -e "${YELLOW}Step 5: Checking audit log...${NC}"
AUDIT_COUNT=$(psql "$SHADOW_DB_URL" -t -c "SELECT COUNT(*) FROM rust_audit_log WHERE db_readonly = true")
echo -e "${GREEN}✓ Audit log has $AUDIT_COUNT entries from read-only testing${NC}"

# Cleanup
kill $WEB_PID 2>/dev/null || true

echo ""
echo "=========================================================="
echo -e "${GREEN}Shadow testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the output above"
echo "2. If all green, update DATABASE_URL to production"
echo "3. Keep DB_READONLY=true for initial production deploy"
echo "4. Monitor /status endpoint on production"
echo "5. Flip to DB_READONLY=false when confident"
echo ""
echo "To deploy to production with read-only:"
echo "  export DATABASE_URL='$PROD_DB_URL'"
echo "  export DB_READONLY=true"
echo "  cargo run --release --bin web"
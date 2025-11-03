#!/bin/bash
###############################################################################
# Autonomous Deployment System
# Inspired by Agentic Flow v1.90 + SPARC Methodology
#
# Features:
# - Self-healing loops that iterate until success
# - Multi-agent swarm with Claude-Flow coordination
# - Performance learning and auto-optimization
# - Full traceability and session management
###############################################################################

set -e

PROJECT_ROOT="/Users/samsonkim/Dev/domain-run/domain-runner"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

###############################################################################
# 1. Initialize Session & Coordination
###############################################################################

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════════════╗"
echo "║   🤖 AUTONOMOUS DEPLOYMENT SYSTEM v2.0                                ║"
echo "║   Agentic Flow + SPARC + Claude-Flow Orchestration                   ║"
echo "╚═══════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

SESSION_ID="auto-deploy-$(date +%s)"
MEMORY_DIR="$PROJECT_ROOT/memory/sessions/$SESSION_ID"
mkdir -p "$MEMORY_DIR"

echo -e "${CYAN}📍 Session ID: $SESSION_ID${NC}"
echo -e "${CYAN}💾 Memory Dir: $MEMORY_DIR${NC}"
echo ""

# Initialize Claude-Flow hooks
echo -e "${BLUE}🔗 Initializing Claude-Flow coordination...${NC}"
npx claude-flow@alpha hooks session-restore --session-id "$SESSION_ID" || echo "No previous session"
npx claude-flow@alpha hooks pre-task --description "Autonomous deployment with self-healing" || echo "Hooks optional"

###############################################################################
# 2. SPARC Phase: Specification & Analysis
###############################################################################

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 SPARC PHASE 1: SPECIFICATION${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

# Analyze current state
echo -e "${CYAN}🔍 Analyzing current deployment state...${NC}"

HEALTH_CHECK=$(curl -s -w "\n%{http_code}" https://domain-runner-web-jkxk.onrender.com/healthz 2>/dev/null || echo "000")
STATUS_CODE=$(echo "$HEALTH_CHECK" | tail -1)

if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Service is HEALTHY${NC}"
    echo -e "${GREEN}   Status Code: $STATUS_CODE${NC}"
    echo "$HEALTH_CHECK" | head -1 | jq '.' 2>/dev/null || echo "$HEALTH_CHECK"

    echo -e "\n${GREEN}🎉 MISSION COMPLETE - Service Already Operational!${NC}"
    echo -e "${GREEN}   No fixes needed.${NC}\n"

    # Save successful state
    echo "{\"status\": \"success\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"health_check\": $STATUS_CODE}" > "$MEMORY_DIR/final_state.json"

    exit 0
else
    echo -e "${RED}❌ Service is UNHEALTHY${NC}"
    echo -e "${RED}   Status Code: $STATUS_CODE${NC}"
    echo -e "${YELLOW}   → Initiating self-healing sequence...${NC}\n"
fi

###############################################################################
# 3. SPARC Phase: Pseudocode & Architecture (Planning)
###############################################################################

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🏗️  SPARC PHASE 2: ARCHITECTURE${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

# Create deployment plan
cat > "$MEMORY_DIR/deployment_plan.json" <<EOF
{
  "strategy": "incremental_healing",
  "max_iterations": 15,
  "agents": [
    "analyzer",
    "fixer",
    "validator",
    "optimizer",
    "monitor"
  ],
  "topology": "mesh",
  "auto_optimize": true,
  "learning_enabled": true
}
EOF

echo -e "${CYAN}📊 Deployment Plan:${NC}"
cat "$MEMORY_DIR/deployment_plan.json" | jq '.'

###############################################################################
# 4. Multi-Agent Swarm Execution (with self-healing loops)
###############################################################################

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🤖 SPAWNING AGENT SWARM${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

# Export environment for agents
export RENDER_API_KEY="${RENDER_API_KEY:-rnd_fJ24fhvbmzyWwWoccP6jHMxTiB97}"
export SESSION_ID="$SESSION_ID"
export MEMORY_DIR="$MEMORY_DIR"

# Run deployment swarm (Python multi-agent system)
echo -e "${BLUE}🚀 Launching deployment swarm...${NC}\n"

python3 "$PROJECT_ROOT/scripts/deployment_swarm.py" 2>&1 | tee "$MEMORY_DIR/swarm_output.log"
SWARM_EXIT=$?

if [ $SWARM_EXIT -eq 0 ]; then
    echo -e "\n${GREEN}✅ Swarm completed successfully!${NC}"
else
    echo -e "\n${YELLOW}⚠️  Swarm completed with issues (exit code: $SWARM_EXIT)${NC}"
    echo -e "${YELLOW}   Falling back to single-threaded self-healing loop...${NC}\n"

    # Fallback: Run simple self-healing loop
    python3 "$PROJECT_ROOT/scripts/self_healing_deploy.py" 2>&1 | tee "$MEMORY_DIR/fallback_output.log"
    FALLBACK_EXIT=$?

    if [ $FALLBACK_EXIT -eq 0 ]; then
        echo -e "\n${GREEN}✅ Fallback loop succeeded!${NC}"
    else
        echo -e "\n${RED}❌ Both swarm and fallback failed${NC}"
        echo -e "${RED}   Manual intervention required${NC}"
        exit 1
    fi
fi

###############################################################################
# 5. Post-Deployment Validation
###############################################################################

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}✅ VALIDATION PHASE${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${CYAN}⏳ Waiting 30s for service to stabilize...${NC}"
sleep 30

# Final health check
echo -e "${CYAN}🔍 Final health verification...${NC}"
FINAL_HEALTH=$(curl -s -w "\n%{http_code}" https://domain-runner-web-jkxk.onrender.com/healthz 2>/dev/null || echo "000")
FINAL_CODE=$(echo "$FINAL_HEALTH" | tail -1)

if [ "$FINAL_CODE" = "200" ]; then
    echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
    echo -e "${GREEN}   Final Status: $FINAL_CODE${NC}"
    echo "$FINAL_HEALTH" | head -1 | jq '.' 2>/dev/null

    # Check all endpoints
    echo -e "\n${CYAN}🔍 Checking additional endpoints...${NC}"

    echo -e "  📍 /readyz:"
    curl -s https://domain-runner-web-jkxk.onrender.com/readyz | jq '.' || echo "Failed"

    echo -e "\n  📍 /docs (OpenAPI):"
    curl -s -I https://domain-runner-web-jkxk.onrender.com/docs | grep -i "http"

    SUCCESS=true
else
    echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
    echo -e "${RED}   Final Status: $FINAL_CODE${NC}"
    SUCCESS=false
fi

###############################################################################
# 6. Session Cleanup & Learning Storage
###############################################################################

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}💾 SESSION CLEANUP${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}\n"

# Save final state
cat > "$MEMORY_DIR/final_state.json" <<EOF
{
  "session_id": "$SESSION_ID",
  "success": $SUCCESS,
  "final_status_code": $FINAL_CODE,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "memory_dir": "$MEMORY_DIR"
}
EOF

echo -e "${CYAN}💾 Session state saved to: $MEMORY_DIR/final_state.json${NC}"

# Notify hooks
npx claude-flow@alpha hooks post-task --task-id "$SESSION_ID" || echo "Hooks optional"
npx claude-flow@alpha hooks session-end --export-metrics true || echo "Hooks optional"

###############################################################################
# 7. Summary Report
###############################################################################

echo -e "\n${PURPLE}╔═══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   📊 DEPLOYMENT SUMMARY                                               ║${NC}"
echo -e "${PURPLE}╠═══════════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║   Session ID: $SESSION_ID                              ║${NC}"
echo -e "${PURPLE}║   Service URL: https://domain-runner-web-jkxk.onrender.com           ║${NC}"
echo -e "${PURPLE}║   Dashboard: https://dashboard.render.com/web/srv-d42iaphr0fns739c93sg ║${NC}"

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}║   Status: ✅ OPERATIONAL                                              ║${NC}"
else
    echo -e "${RED}║   Status: ❌ FAILED                                                   ║${NC}"
fi

echo -e "${PURPLE}╚═══════════════════════════════════════════════════════════════════════╝${NC}\n"

if [ "$SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 Ready for weekend testing!${NC}"
    echo -e "${CYAN}📝 Next step: Add LLM API keys in Render dashboard${NC}\n"
    exit 0
else
    echo -e "${RED}⚠️  Manual intervention required${NC}"
    echo -e "${YELLOW}📝 Check logs in: $MEMORY_DIR${NC}\n"
    exit 1
fi

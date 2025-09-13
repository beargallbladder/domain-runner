#!/bin/bash
# Sentinel Smoke Test - Complete verification script

set -e  # Exit on any error

echo "================================================"
echo "🚀 SENTINEL SMOKE TEST - Starting"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check current directory
if [ ! -f "specs/sentinel.prd.md" ]; then
    echo -e "${RED}❌ Error: Not in sentinel directory${NC}"
    echo "Please run from sentinel/ directory"
    exit 1
fi

# Step 1: Environment Setup
echo -e "\n${YELLOW}Step 1: Setting up environment...${NC}"

# Check for required commands
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js is required but not installed.${NC}"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}❌ Python 3 is required but not installed.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ npm is required but not installed.${NC}"; exit 1; }

# Copy example files if needed
if [ ! -f "specs/targets.json" ]; then
    cp specs/targets.example.json specs/targets.json
    echo "✓ Created specs/targets.json from example"
fi

if [ ! -f "specs/models.json" ]; then
    cp specs/models.example.json specs/models.json
    echo "✓ Created specs/models.json from example"
fi

# Create minimal test data
cat > specs/targets.test.json << 'EOF'
{
  "brands": [
    {
      "name": "Tesla",
      "domain": "tesla.com",
      "category": "automotive",
      "priority": "high"
    },
    {
      "name": "Nike",
      "domain": "nike.com",
      "category": "apparel",
      "priority": "high"
    }
  ],
  "prompt_templates": [
    "What do you know about {brand}?"
  ]
}
EOF

cat > specs/models.test.json << 'EOF'
{
  "models": [
    {
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "endpoint": "https://api.openai.com/v1/chat/completions",
      "max_tokens": 200,
      "temperature": 0.7
    }
  ]
}
EOF

echo "✓ Created minimal test configs"

# Set run ID
export RUN_ID="smoke-$(date -u +%Y%m%dT%H%M%SZ)"
export SERVICE_IMPL=node

echo "✓ Run ID: $RUN_ID"

# Check for API keys
if [ -z "$OPENAI_API_KEY" ]; then
    if [ -f ".env" ]; then
        source .env
        echo "✓ Loaded environment from .env"
    else
        echo -e "${RED}❌ OPENAI_API_KEY not set and no .env file found${NC}"
        echo "Please set: export OPENAI_API_KEY=your_key_here"
        exit 1
    fi
fi

# Step 2: Install Dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"

# Install Node dependencies
if [ ! -d "services/runner-node/node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm ci --prefix services/runner-node
else
    echo "✓ Node.js dependencies already installed"
fi

if [ ! -d "services/api/node_modules" ]; then
    echo "Installing API dependencies..."
    npm ci --prefix services/api
else
    echo "✓ API dependencies already installed"
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r scripts/requirements.txt --quiet || pip install -r scripts/requirements.txt --quiet
echo "✓ Python dependencies installed"

# Step 3: Run Plan
echo -e "\n${YELLOW}Step 3: Creating execution plan...${NC}"

node services/runner-node/src/plan.js \
  --spec specs/sentinel.prd.md \
  --targets specs/targets.test.json \
  --models specs/models.test.json \
  --out runs/$RUN_ID/plan.json

if [ ! -f "runs/$RUN_ID/plan.json" ]; then
    echo -e "${RED}❌ Plan creation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Plan created successfully${NC}"

# Step 4: Run Crawl
echo -e "\n${YELLOW}Step 4: Executing crawl (calling LLMs)...${NC}"

node services/runner-node/src/crawl.js \
  --plan runs/$RUN_ID/plan.json \
  --out runs/$RUN_ID/crawl.jsonl \
  --parallel 1

if [ ! -f "runs/$RUN_ID/crawl.jsonl" ]; then
    echo -e "${RED}❌ Crawl failed${NC}"
    exit 1
fi

# Check if crawl has data
CRAWL_LINES=$(wc -l < runs/$RUN_ID/crawl.jsonl)
if [ "$CRAWL_LINES" -eq 0 ]; then
    echo -e "${RED}❌ Crawl produced no data${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Crawl completed: $CRAWL_LINES queries${NC}"

# Step 5: Calculate Scores
echo -e "\n${YELLOW}Step 5: Calculating scores...${NC}"

node services/runner-node/src/score.js \
  --in runs/$RUN_ID/crawl.jsonl \
  --out runs/$RUN_ID/score.json

if [ ! -f "runs/$RUN_ID/score.json" ]; then
    echo -e "${RED}❌ Score calculation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Scores calculated${NC}"

# Step 6: Generate Metrics
echo -e "\n${YELLOW}Step 6: Generating metrics...${NC}"

python3 scripts/parse_metrics.py \
  --crawl runs/$RUN_ID/crawl.jsonl \
  --score runs/$RUN_ID/score.json \
  --out runs/$RUN_ID/metrics.json

if [ ! -f "runs/$RUN_ID/metrics.json" ]; then
    echo -e "${RED}❌ Metrics generation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Metrics generated${NC}"

# Step 7: Classify Errors
echo -e "\n${YELLOW}Step 7: Classifying errors...${NC}"

python3 scripts/classify_errors.py \
  --crawl runs/$RUN_ID/crawl.jsonl \
  --buckets "timeout,rate_limit,auth,parse,network,unknown" \
  --out runs/$RUN_ID/error_buckets.json

echo -e "${GREEN}✓ Errors classified${NC}"

# Step 8: Create Envelope
echo -e "\n${YELLOW}Step 8: Creating run envelope...${NC}"

python3 scripts/collect_logs.py \
  --run-id $RUN_ID \
  --spec-version "v1.0.0-test" \
  --run-root runs/$RUN_ID \
  --out runs/$RUN_ID/run.envelope.json

if [ ! -f "runs/$RUN_ID/run.envelope.json" ]; then
    echo -e "${RED}❌ Envelope creation failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Envelope created${NC}"

# Step 9: Validate Artifacts
echo -e "\n${YELLOW}Step 9: Validating artifacts...${NC}"

# Check all expected files exist
EXPECTED_FILES="plan.json crawl.jsonl score.json metrics.json error_buckets.json run.envelope.json"
MISSING_FILES=""

for file in $EXPECTED_FILES; do
    if [ ! -f "runs/$RUN_ID/$file" ]; then
        MISSING_FILES="$MISSING_FILES $file"
    fi
done

if [ -n "$MISSING_FILES" ]; then
    echo -e "${RED}❌ Missing files:$MISSING_FILES${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All artifacts present${NC}"

# Check envelope status
ENVELOPE_STATUS=$(python3 -c "import json; print(json.load(open('runs/$RUN_ID/run.envelope.json'))['status'])")

if [ "$ENVELOPE_STATUS" == "failed" ]; then
    echo -e "${RED}❌ Run status is 'failed'${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Run status: $ENVELOPE_STATUS${NC}"

# Step 10: Display Summary
echo -e "\n${YELLOW}Step 10: Summary${NC}"

# Extract key metrics
python3 << EOF
import json
import sys

with open('runs/$RUN_ID/metrics.json', 'r') as f:
    metrics = json.load(f)

with open('runs/$RUN_ID/score.json', 'r') as f:
    scores = json.load(f)

print("\n📊 METRICS:")
print(f"  • Brands queried: {metrics.get('brands_queried', 0)}")
print(f"  • LLM calls: {metrics.get('llm_calls', 0)}")
print(f"  • Success rate: {metrics.get('success_rate', 0):.1%}")
print(f"  • Error rate: {metrics.get('error_rate', 0):.1%}")
print(f"  • Avg Memory Score: {metrics.get('memory_score_avg', 0):.3f}")
print(f"  • Avg Consensus Score: {metrics.get('consensus_score_avg', 0):.3f}")

print("\n📁 ARTIFACTS:")
print(f"  • Location: runs/$RUN_ID/")
print(f"  • Files: {len(['plan.json', 'crawl.jsonl', 'score.json', 'metrics.json', 'error_buckets.json', 'run.envelope.json'])}")
EOF

# Create symlink to latest
ln -sfn $RUN_ID runs/latest
echo -e "\n✓ Created runs/latest symlink"

# Optional: Compare with previous run
if [ -d "runs" ] && [ $(ls -d runs/*/ 2>/dev/null | wc -l) -gt 1 ]; then
    echo -e "\n${YELLOW}Optional: Comparing with previous run...${NC}"
    PREVIOUS=$(ls -dt runs/*/ | grep -v "$RUN_ID" | head -n 1)
    if [ -n "$PREVIOUS" ] && [ -f "$PREVIOUS/metrics.json" ]; then
        python3 scripts/diff_runs.py \
          --current runs/$RUN_ID \
          --previous $PREVIOUS \
          --format text 2>/dev/null || echo "  (No previous run to compare)"
    fi
fi

echo -e "\n================================================"
echo -e "${GREEN}✅ SMOKE TEST PASSED!${NC}"
echo -e "================================================"
echo ""
echo "Next steps:"
echo "1. Review the results in: runs/$RUN_ID/"
echo "2. Check the scores: cat runs/$RUN_ID/score.json | python3 -m json.tool"
echo "3. Deploy to Render: git push origin main"
echo "4. Enable GitHub Actions for automation"
echo ""
echo "To run with your full brand list:"
echo "  • Edit specs/targets.json with all brands"
echo "  • Edit specs/models.json with all models"
echo "  • Re-run this script"

exit 0
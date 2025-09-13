# Sentinel v1 - AI Brand Memory Monitoring System

A continuous-improvement loop system that measures how well AI services remember brands, with immutable run artifacts, schema-enforced contracts, and automated parameter tuning.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Git
- Render account (for API deployment)
- RuvNet CLI (optional, for orchestration)

### Initial Setup

1. **Install Dependencies**
```bash
cd sentinel

# Node.js dependencies
npm ci --prefix services/runner-node
npm ci --prefix services/api

# Python dependencies
pip install -r scripts/requirements.txt
```

2. **Configure Your Data**
```bash
# Copy and customize example files
cp specs/targets.example.json specs/targets.json
cp specs/models.example.json specs/models.json

# Edit with your brands and models
vim specs/targets.json
vim specs/models.json
```

3. **Set Environment Variables (for local testing)**
```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
RENDER_SERVICE_URL=https://your-service.onrender.com
SERVICE_IMPL=node
EOF
```

### Running Locally

1. **Validate Inputs**
```bash
python scripts/validate_inputs.py \
  --targets specs/targets.json \
  --models specs/models.json
```

2. **Create Execution Plan**
```bash
node services/runner-node/src/plan.js \
  --spec specs/sentinel.prd.md \
  --targets specs/targets.json \
  --models specs/models.json \
  --out runs/test/plan.json
```

3. **Execute Crawl**
```bash
node services/runner-node/src/crawl.js \
  --plan runs/test/plan.json \
  --out runs/test/crawl.jsonl \
  --parallel 4
```

4. **Calculate Scores**
```bash
node services/runner-node/src/score.js \
  --in runs/test/crawl.jsonl \
  --out runs/test/score.json
```

5. **Generate Metrics**
```bash
python scripts/parse_metrics.py \
  --crawl runs/test/crawl.jsonl \
  --score runs/test/score.json \
  --out runs/test/metrics.json
```

## 📁 Project Structure

```
sentinel/
├── specs/                      # Source of truth
│   ├── sentinel.prd.md        # Authoritative PRD
│   ├── targets.json           # Brands to monitor
│   └── models.json            # LLM models to test
├── interfaces/                 # Schema contracts (immutable)
│   ├── job.schema.json
│   ├── artifact.schema.json
│   └── run.schema.json
├── orchestration/             # RuvNet swarm configs
│   └── ruvnet/
│       ├── hive.yml
│       └── swarms/
├── services/                  # Implementation
│   ├── runner-node/          # Node.js crawler
│   ├── runner-rust/          # Rust crawler (future)
│   └── api/                  # REST API
├── scripts/                   # Python utilities
│   ├── collect_logs.py
│   ├── parse_metrics.py
│   ├── diff_runs.py
│   └── propose_spec_update.py
├── runs/                      # Immutable artifacts
│   ├── 2025-01-17T03-00Z/
│   └── latest -> (symlink)
└── .github/workflows/         # CI/CD automation
```

## 🔄 Continuous Improvement Loop

### How It Works

1. **Nightly Run** (03:00 UTC)
   - Crawls all brands × models
   - Calculates MemoryScore and ConsensusScore
   - Compares with previous run
   - Auto-proposes parameter adjustments

2. **Auto-Tuning** (Low-Risk Only)
   - Adjusts: timeout_ms, retry_count, batch_size
   - Creates PR for human review
   - Never changes contracts or core logic

3. **Immutable Artifacts**
   - Each run stored in `/runs/{timestamp}/`
   - All outputs validated against schemas
   - Complete audit trail maintained

## 📊 Metrics & Scoring

### MemoryScore (0-1)
Measures how much an LLM "remembers" about a brand:
- Response length and detail
- Specific facts mentioned
- Absence of uncertainty

### ConsensusScore (0-1)
Measures agreement across different models:
- Common facts mentioned
- Consistency of information
- Cross-model validation

### Volatility
Measures variation in responses:
- Standard deviation of scores
- Identifies unstable knowledge

## 🚢 Deployment on Render

### Deploy API Service

1. **Create Render Web Service**
   - Connect your GitHub repo
   - Root directory: `sentinel/services/api`
   - Build: `npm install`
   - Start: `npm start`

2. **Set Environment Variables in Render**
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `VERCEL_TOKEN` (if using Vercel)
   - `VERCEL_BUILD_HOOK` (if using Vercel)

3. **Note Your Service URL**
   - Example: `https://sentinel-api.onrender.com`
   - Add to GitHub repository variables as `RENDER_SERVICE_URL`

## 🤖 GitHub Actions Setup

### Enable Workflows

1. Push this code to your repository
2. Go to Settings → Actions → General
3. Enable "Allow all actions"

### Configure Repository Variables

Go to Settings → Secrets and variables → Actions → Variables:
- `RENDER_SERVICE_URL`: Your Render service URL

### Manual Triggers

- **Run Now**: Actions → "Nightly Loop" → Run workflow
- **Orchestrate**: Comment `/orchestrate` on any issue
- **Release**: Actions → "Release & Rollback" → Run workflow

## 🔧 Manual Operations

### Run Complete Loop
```bash
# Set run ID
export RUN_ID=$(date -u +'%Y-%m-%dT%H-%MZ')

# Execute all steps
cd sentinel
bash -c "
  node services/runner-node/src/plan.js \
    --spec specs/sentinel.prd.md \
    --targets specs/targets.json \
    --models specs/models.json \
    --out runs/$RUN_ID/plan.json &&
  
  node services/runner-node/src/crawl.js \
    --plan runs/$RUN_ID/plan.json \
    --out runs/$RUN_ID/crawl.jsonl &&
  
  node services/runner-node/src/score.js \
    --in runs/$RUN_ID/crawl.jsonl \
    --out runs/$RUN_ID/score.json &&
  
  python scripts/parse_metrics.py \
    --crawl runs/$RUN_ID/crawl.jsonl \
    --score runs/$RUN_ID/score.json \
    --out runs/$RUN_ID/metrics.json &&
  
  python scripts/collect_logs.py \
    --run-id $RUN_ID \
    --spec-version v1.0.0 \
    --run-root runs/$RUN_ID \
    --out runs/$RUN_ID/run.envelope.json &&
  
  ln -sfn $RUN_ID runs/latest
"
```

### Compare Runs
```bash
python scripts/diff_runs.py \
  --current runs/latest \
  --previous runs/2025-01-16T03-00Z \
  --format both
```

### Propose Spec Updates
```bash
python scripts/propose_spec_update.py \
  --from-runs runs/latest \
  --spec specs/sentinel.prd.md \
  --mode low-risk \
  --dry-run
```

## 🦀 Rust Migration (Future)

The system is designed for gradual Rust migration:

1. **Feature Flag**: `SERVICE_IMPL=rust`
2. **Canary Testing**: 5% → 25% → 100%
3. **Same Contracts**: Both implementations use identical schemas
4. **Success Criteria**: <2% error rate, p95 latency within 15%

## 📈 SLOs & Monitoring

### Key Metrics
- Error rate < 2%
- Timeout rate < 5%
- p95 response time < 10s
- All runs produce valid artifacts

### Alerts
- 2 consecutive degraded runs → GitHub issue
- Error rate spike → Slack notification (if configured)
- Schema validation failure → Immediate alert

## 🔍 Troubleshooting

### Common Issues

**Problem**: API keys not working
- Solution: Verify keys are set in Render environment
- Test: `curl $RENDER_SERVICE_URL/health`

**Problem**: Crawl timeouts
- Solution: Increase timeout_ms in sentinel.prd.md
- Auto-tuning will adjust based on metrics

**Problem**: No data in /api/v1/leaderboard
- Solution: Ensure runs/latest symlink exists
- Check: `ls -la runs/latest`

### Debug Commands

```bash
# Check latest run status
cat runs/latest/run.envelope.json | jq .status

# View error buckets
cat runs/latest/error_buckets.json | jq .counts

# Check metrics
cat runs/latest/metrics.json | jq .

# Validate schemas
python -m jsonschema interfaces/run.schema.json --version
```

## 📝 Next Steps

After setup:

1. **Customize Targets**: Add your brands to `specs/targets.json`
2. **Add Models**: Configure additional LLMs in `specs/models.json`
3. **Enable Nightly Runs**: Activate the GitHub Action schedule
4. **Set Up Dashboard**: Configure RuvNet dashboard (optional)
5. **Monitor First Week**: Review auto-proposed PRs daily

## 🤝 Contributing

1. Changes to `/interfaces/*.json` require major version bump
2. Auto-tuning PRs should be reviewed before merging
3. Add tests for new scoring algorithms
4. Document any new parameters in sentinel.prd.md

## 📄 License

MIT

---

**Remember**: The system is designed to be self-improving. Let it run for a week, review the auto-proposed changes, and watch as it optimizes itself for your specific use case.
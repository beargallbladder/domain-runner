# Production Deployment Guide

## 🚀 Quick Start

### 1. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

**Required API Keys:**
- `DATABASE_URL` - PostgreSQL connection string
- At least one LLM provider key:
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `DEEPSEEK_API_KEY`
  - etc.

### 2. Database Setup

#### Option A: Use Existing Database
```bash
# Your existing database should have these tables:
# - domains
# - domain_responses
# - (others as needed)

# Update DATABASE_URL in .env:
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

#### Option B: New Database with Docker
```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Run migrations (if needed)
psql $DATABASE_URL < migrations/001_initial_schema.sql
```

### 3. Install Dependencies

```bash
# Python dependencies
pip3 install -r requirements.txt

# Or use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Test Configuration

```bash
# Test database connection
python3 agents/database-connector/src/connector.py

# Test orchestrator (dry run)
python3 orchestrator_demo.py

# Test with real LLMs (uses API keys)
python3 orchestrator.py --live
```

## 🐳 Docker Deployment

### Full Stack with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f orchestrator

# Stop services
docker-compose down
```

### Individual Services

```bash
# Build image
docker build -t nexus-orchestrator .

# Run orchestrator
docker run -d \
  --name nexus \
  --env-file .env \
  -v $(pwd)/artifacts:/app/artifacts \
  nexus-orchestrator

# Run specific component
docker run nexus-orchestrator python3 agents/pmr/src/registry.py
```

## 📊 Database Migration

### Migrate Existing Data

```python
from agents.database_connector.src.connector import DatabaseConnector

# Connect to database
db = DatabaseConnector()

# Migrate legacy data to Nexus format
results = db.migrate_legacy_data(batch_size=1000)
print(f"Migrated {results['total_migrated']} records")

# Check coverage
coverage = db.get_domain_coverage()
print(f"Coverage: {coverage['coverage']:.1%}")
```

### Database Schema

The system expects these tables:

```sql
-- Existing tables (your data)
CREATE TABLE domains (
    domain VARCHAR(255) PRIMARY KEY,
    category VARCHAR(100),
    priority INTEGER,
    active BOOLEAN DEFAULT true
);

CREATE TABLE domain_responses (
    id SERIAL PRIMARY KEY,
    domain VARCHAR(255),
    llm_model VARCHAR(100),
    llm_response TEXT,
    timestamp TIMESTAMPTZ,
    token_count INTEGER,
    response_time_ms INTEGER,
    status VARCHAR(50)
);

-- New tables (created automatically)
CREATE TABLE nexus_observations (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255),
    domain VARCHAR(255),
    prompt_id VARCHAR(255),
    model VARCHAR(255),
    status VARCHAR(50),
    response_tokens INTEGER,
    latency_ms INTEGER,
    error TEXT,
    created_at TIMESTAMPTZ
);

CREATE TABLE run_manifests (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) UNIQUE,
    window_start TIMESTAMPTZ,
    window_end TIMESTAMPTZ,
    expected_combos INTEGER,
    observed_ok INTEGER,
    observed_fail INTEGER,
    coverage FLOAT,
    tier VARCHAR(50),
    checkpoint_data JSONB,
    created_at TIMESTAMPTZ
);
```

## 🔑 Environment Variables

### LLM Provider Keys

Add your API keys to `.env`:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# DeepSeek
DEEPSEEK_API_KEY=...

# Mistral
MISTRAL_API_KEY=...

# Add others as needed
```

### Configuration Options

```bash
# Nexus Configuration
MIN_FLOOR=0.70              # Minimum acceptable coverage
TARGET_COVERAGE=0.95         # Target coverage goal
MAX_RETRIES=3               # Retry failed operations

# Run Configuration
WINDOW_HOURS=1              # Time window for analysis
DRY_RUN=false              # Set to true for testing

# Performance
MAX_CONCURRENT_QUERIES=10   # Parallel query limit
QUERY_TIMEOUT_MS=30000      # Query timeout

# Monitoring
ENABLE_DRIFT_DETECTION=true # Enable drift monitoring
DRIFT_THRESHOLD=0.15        # Drift alert threshold
```

## 🏃 Running in Production

### Systemd Service (Linux)

```ini
# /etc/systemd/system/nexus.service
[Unit]
Description=Nexus Orchestrator
After=network.target postgresql.service

[Service]
Type=simple
User=nexus
WorkingDirectory=/opt/nexus
Environment="PATH=/usr/local/bin:/usr/bin"
EnvironmentFile=/opt/nexus/.env
ExecStart=/usr/bin/python3 /opt/nexus/orchestrator.py --live
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable nexus
sudo systemctl start nexus
sudo systemctl status nexus
```

### Cron Job

```bash
# Run every hour
0 * * * * cd /path/to/domain-runner && python3 orchestrator.py --live >> logs/nexus.log 2>&1

# Run PMR discovery daily
0 2 * * * cd /path/to/domain-runner && python3 tools/pmr_demo.py >> logs/pmr.log 2>&1
```

### Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start orchestrator
pm2 start orchestrator.py --interpreter python3 --name nexus

# Save configuration
pm2 save
pm2 startup
```

## 📈 Monitoring

### Health Check Endpoints

```python
# Check system health
from agents.database_connector.src.connector import DatabaseConnector
db = DatabaseConnector()
health = db.health_check()
print(f"Database: {health['healthy']}")
```

### Metrics Collection

The system automatically exports metrics to `artifacts/`:
- `pipeline_results.json` - Execution results
- `model_portfolio.json` - MPM analysis
- `mii_calculation.json` - MII scores
- `provider_registry.json` - Model registry

### Log Files

```bash
# View logs
tail -f logs/nexus.log

# With Docker
docker-compose logs -f orchestrator

# Check errors
grep ERROR logs/nexus.log
```

## 🔧 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check PostgreSQL logs
docker-compose logs postgres

# Verify environment variable
echo $DATABASE_URL
```

### LLM Provider Issues

```python
# Test provider individually
from agents.llm_query_runner.src.providers.openai_client import OpenAIClient
client = OpenAIClient()
response = client.call("Test message", timeout=30)
print(response)
```

### Coverage Below Target

```bash
# Check which domains are missing
python3 -c "
from agents.database_connector.src.connector import DatabaseConnector
db = DatabaseConnector()
coverage = db.get_domain_coverage()
print(f'Coverage: {coverage}')
"
```

## 🚢 Production Checklist

- [ ] Environment variables configured in `.env`
- [ ] Database connection tested
- [ ] At least 3 LLM provider keys added
- [ ] Dependencies installed (`requirements.txt`)
- [ ] Database migrated (if using existing data)
- [ ] Dry run successful (`orchestrator_demo.py`)
- [ ] Live test successful (`orchestrator.py --live`)
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Service/cron configured for automation

## 📞 Support

- Check `SYSTEM_SUMMARY.md` for architecture overview
- Review `artifacts/` for execution logs
- Database issues: Check `agents/database-connector/`
- LLM issues: Check `agents/llm-query-runner/src/providers/`

---

*Version: 1.1.0*
*Status: Production Ready*
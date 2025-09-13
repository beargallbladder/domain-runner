# Render Environment Variables for sophisticated-runner

## Required Variables (copy from raw-capture-runner):

```bash
# Database Connection
DATABASE_URL = [copy from raw-capture-runner]

# API Keys  
OPENAI_API_KEY = [copy from raw-capture-runner]
ANTHROPIC_API_KEY = [copy from raw-capture-runner]

# Service Configuration (NEW for sophisticated-runner)
NODE_ENV = production
PROCESSOR_ID = sophisticated_v1
SERVICE_MODE = sophisticated_parallel
DOMAINS_SOURCE = premium_500_plus
CACHE_BUST = SOPHISTICATED_2025_06_09_PARALLEL
BUILD_ID = SOPHISTICATED_RUNNER_500_DOMAINS
```

## Database Connection:
- **IMPORTANT**: Connect to the SAME database as raw-capture-runner
- Database name: `raw-capture-db` 
- Do NOT create a new database - use existing connection

## After Deployment URLs:
- Sophisticated Runner: https://sophisticated-runner.onrender.com
- Raw Capture Runner: https://raw-capture-runner.onrender.com (unchanged)

## Success Check:
Both services should show healthy status and process different domain sets in the same database. 
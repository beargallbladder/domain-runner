# 🚨 EXPLICIT SETUP INSTRUCTIONS - DO NOT SKIP ANY STEP

## Pre-flight Checks

First, let's verify you're in the right directory:
```bash
pwd
# Should show: /Users/samkim/domain-runner
```

Check that key files exist:
```bash
ls -la .env.example scripts/dev_bootstrap.sh Makefile
# All three files should exist
```

---

## STEP 1: Create Your Environment File

### 1.1 Copy the template (DO NOT EDIT .env.example)
```bash
cp .env.example .env
```

### 1.2 Open .env in your editor
```bash
nano .env
# or
code .env
# or
vim .env
```

### 1.3 Add your ACTUAL credentials

You need to replace these placeholders with REAL values:

```bash
# --- Database ---
# ⚠️ REPLACE THIS WITH YOUR ACTUAL DATABASE URL
DATABASE_URL=postgresql://username:password@localhost:5432/domain_runner

# Example real URLs:
# DATABASE_URL=postgresql://samkim:mypass123@localhost:5432/domain_runner
# DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/domain_runner
# DATABASE_URL=postgres://user:pass@db.example.com:5432/domain_runner?sslmode=require

# --- LLM Providers (enable as needed) ---
# ⚠️ ADD YOUR ACTUAL API KEYS (at minimum, add OpenAI OR Anthropic)

# OpenAI (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic (get from https://console.anthropic.com/settings/keys)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# DeepSeek (optional - get from https://platform.deepseek.com/api_keys)
DEEPSEEK_API_KEY=

# Leave others blank if you don't have them
MISTRAL_API_KEY=
COHERE_API_KEY=
AI21_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
PERPLEXITY_API_KEY=
XAI_API_KEY=
```

### 1.4 Verify your .env is correct
```bash
# Check that .env exists and has content
cat .env | head -5

# Test that environment variables load
source .env
echo $DATABASE_URL
# Should print your database URL

echo $OPENAI_API_KEY
# Should print sk-proj-xxx... (or your key)
```

---

## STEP 2: Bootstrap the Environment

### 2.1 Check Python version
```bash
python3 --version
# Should be 3.9 or higher (ideally 3.11)
```

### 2.2 Run the bootstrap script
```bash
bash scripts/dev_bootstrap.sh
```

**What this does:**
1. Creates Python virtual environment (.venv)
2. Installs all dependencies
3. Creates database tables (if PostgreSQL is accessible)

### 2.3 If bootstrap fails at database step

If you see an error like `psql: error: connection refused`, that's OK for now:

```bash
# The virtual environment and packages are still installed
# You can continue, but database features won't work
```

To fix database connection:
```bash
# Option A: Start PostgreSQL locally
brew services start postgresql@14  # Mac
# or
sudo systemctl start postgresql    # Linux

# Option B: Use Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=domain_runner \
  -p 5432:5432 \
  postgres:15

# Then update .env with:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/domain_runner
```

---

## STEP 3: Test with Demo (No API Keys Required)

### 3.1 Activate the virtual environment
```bash
source .venv/bin/activate
# Your prompt should change to show (.venv)
```

### 3.2 Run the demo pipeline
```bash
make run.pipeline.demo
```

**Expected output:**
```
🚀 NEXUS ORCHESTRATOR - Live Demo
======================================================================
📦 [1/7] PMR: Provider & Model Registry
✅ Discovered 14 models across 5 providers
...
✅ ALL COMPONENTS RUNNING ON RUVNET FRAMEWORK
```

If this works, your code is set up correctly!

---

## STEP 4: Go Live with Real LLMs

### 4.1 Verify API keys are set
```bash
# Check that at least one key is configured
source .env
if [ -n "$OPENAI_API_KEY" ] || [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ API keys found"
else
    echo "❌ No API keys - add them to .env first!"
fi
```

### 4.2 Check which providers are enabled
```bash
cat config/runtime.yml | grep -A1 "enabled: true"
# Should show openai and/or anthropic enabled
```

### 4.3 Run the REAL pipeline

**Option A: Full orchestrator (recommended for first test)**
```bash
make run.pipeline.live
```

**Option B: Hourly pipeline (what runs in production)**
```bash
python scripts/hourly_pipeline.py
```

**Expected output:**
```json
{
  "tier": "Degraded",
  "coverage": 0.87,
  "run_id": "abc-123-def-456"
}
```

**Exit codes:**
- `0` = Success (tier is Healthy or Degraded)
- `2` = BLOCKED (tier is Invalid, coverage < 70%)

---

## STEP 5: Verify Everything Works

### 5.1 Check database (if connected)
```bash
python3 -c "
from infra.db import get_conn
try:
    conn = get_conn()
    print('✅ Database connection OK')
except Exception as e:
    print(f'❌ Database error: {e}')
"
```

### 5.2 Check LLM providers
```bash
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv()

providers = []
if os.getenv('OPENAI_API_KEY'): providers.append('OpenAI')
if os.getenv('ANTHROPIC_API_KEY'): providers.append('Anthropic')
if os.getenv('DEEPSEEK_API_KEY'): providers.append('DeepSeek')

if providers:
    print(f'✅ Active providers: {', '.join(providers)}')
else:
    print('❌ No LLM providers configured')
"
```

### 5.3 Test a single LLM call (uses real API)
```bash
python3 -c "
from agents.llm_query_runner.src.runner import LLMQueryRunner
runner = LLMQueryRunner()
rows, errors = runner.run_batch(
    ['test.com'],
    [{'prompt_id': 'test', 'text': 'Say hello'}],
    ['gpt-4o']  # or 'claude-3-5-sonnet-20240620'
)
print(f'Success: {len(rows)}, Errors: {len(errors)}')
"
```

---

## 🚨 TROUBLESHOOTING

### "No module named 'psycopg2'"
```bash
source .venv/bin/activate
pip install psycopg2-binary
```

### "DATABASE_URL not found"
```bash
# Make sure .env exists and is loaded
source .env
echo $DATABASE_URL
```

### "API key not valid"
```bash
# Verify your key format:
# OpenAI: starts with sk-proj- or sk-
# Anthropic: starts with sk-ant-api03-
```

### "Connection refused" for database
```bash
# Database not running. Either:
# 1. Start PostgreSQL locally
# 2. Use Docker (see Step 2.3)
# 3. Skip DB features for now
```

---

## ✅ SUCCESS CHECKLIST

You know it's working when:

- [ ] `make run.pipeline.demo` shows all 7 components
- [ ] `echo $DATABASE_URL` shows your database connection
- [ ] `echo $OPENAI_API_KEY` shows sk-proj-xxx...
- [ ] `python scripts/hourly_pipeline.py` returns JSON with tier/coverage
- [ ] Exit code is 0 (not 2)

---

## 🎯 WHAT YOU'VE ACHIEVED

Once this works, you have:

1. **Single source of truth**: `config/runtime.yml` controls everything
2. **Database persistence**: All results saved to PostgreSQL
3. **Hard gates**: Invalid coverage blocks execution (exit code 2)
4. **Clean pipeline**: A1→A3→A5→MII with no hallucinations
5. **Production ready**: Can run via cron/systemd/docker

---

**NEED HELP?**

If something fails, run this diagnostic:
```bash
python3 -c "
import os, sys
from dotenv import load_dotenv
load_dotenv()

print('=== DIAGNOSTICS ===')
print(f'Python: {sys.version}')
print(f'Working dir: {os.getcwd()}')
print(f'DATABASE_URL set: {'✅' if os.getenv('DATABASE_URL') else '❌'}')
print(f'OPENAI_API_KEY set: {'✅' if os.getenv('OPENAI_API_KEY') else '❌'}')
print(f'ANTHROPIC_API_KEY set: {'✅' if os.getenv('ANTHROPIC_API_KEY') else '❌'}')

import importlib
for module in ['psycopg2', 'yaml', 'dotenv', 'openai', 'anthropic']:
    try:
        importlib.import_module(module)
        print(f'{module}: ✅')
    except:
        print(f'{module}: ❌ (run: pip install {module})')
"
```

Then share the output and I'll help fix it.
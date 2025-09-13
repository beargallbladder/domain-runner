# ✅ Build 7 Orchestration - COMPLETE

## What Was Just Implemented

### ⛳️ Single-Source Handoff Achieved

Created a **tight, guard-railed loop** that stitches everything together:
```
.env → runtime.yml → DB → A1→A3→A5→MII
```

With hard gates that block on invalid coverage.

## Files Created/Modified

### 1️⃣ Environment & Runtime Contracts
- ✅ `.env.example` - Simplified to essentials only
- ✅ `config/runtime.yml` - Single source of truth for providers
- ✅ `.python-version` - Python 3.11.9 for SSL compatibility

### 2️⃣ Database Persistence Layer
- ✅ `infra/db.py` - DB adapters with connection pooling
- ✅ `migrations/20250913_core_tables.sql` - Core tables for A1/A3/A5

### 3️⃣ Agent DB Integration
- ✅ `agents/llm-query-runner/src/runner.py` - Added `persist_rows()` method
- ✅ `agents/response-normalizer/src/run_normalizer_job.py` - DB-backed normalizer
- ✅ `agents/sentinel/src/run_sentinel_job_db.py` - DB-backed drift detector

### 4️⃣ Orchestration Scripts
- ✅ `scripts/hourly_pipeline.py` - Main pipeline that runs A1→A3→A5 with manifest
- ✅ `scripts/dev_bootstrap.sh` - One-command bootstrap for development
- ✅ `Makefile` - Added run targets: `run.a1`, `run.pipeline.demo`, `run.pipeline.live`

### 5️⃣ CI/CD Guardrails
- ✅ `.github/workflows/ci.yml` - CI workflow that runs `make ci`
- ✅ `requirements.txt` - Added urllib3 pin for SSL compatibility

## 👩‍✈️ Operator Checklist

### Quick Start

1. **Setup environment:**
```bash
cp .env.example .env
# Edit .env and add:
# - DATABASE_URL
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
```

2. **Bootstrap:**
```bash
bash scripts/dev_bootstrap.sh
```

3. **Run tests:**
```bash
# Demo (no real LLM calls)
make run.pipeline.demo

# Live (uses real LLMs)
make run.pipeline.live

# Hourly pipeline (exits non-zero if tier=invalid)
python scripts/hourly_pipeline.py
```

## Key Features

### ✅ Guardrails Implemented

1. **Manifest Tiers** - Blocks on invalid coverage (<70%)
2. **DB Persistence** - All A1/A3/A5 outputs persisted
3. **Single Runtime Config** - `config/runtime.yml` is truth
4. **CI Always Runs** - `make ci` with existing tests
5. **Exit Codes** - Pipeline exits 2 when tier=invalid

### 🔄 Data Flow

```
1. runtime.yml enables providers
2. A1 executes (domain × prompt × model)
3. Rows persist to responses_raw table
4. A3 normalizes from DB → responses_normalized
5. A5 detects drift from DB → drift_scores
6. Manifest calculates coverage & tier
7. Exit non-zero if tier=invalid
```

## Production Usage

### Cron (Hourly)
```bash
0 * * * * cd /path/to/domain-runner && python scripts/hourly_pipeline.py
```

### Systemd
```bash
# See PRODUCTION_SETUP.md for full systemd config
systemctl start nexus
```

### Docker
```bash
docker-compose up -d
```

## Verification

To verify everything works:

```bash
# 1. Check environment
echo $DATABASE_URL

# 2. Test DB connection
python -c "from infra.db import get_conn; conn = get_conn(); print('DB OK')"

# 3. Run pipeline
python scripts/hourly_pipeline.py

# 4. Check tier (should print JSON with tier/coverage)
# Exit code 2 = invalid tier
# Exit code 0 = valid tier
```

## Notes

- **State is now fixed**: `.env` → `runtime.yml` → DB → Agents → Manifest
- **No code sprawl**: Minimal changes to existing agents
- **DB-backed**: Everything persists for auditability
- **Hard gates**: Invalid tier blocks execution

---

**Status**: ✅ READY FOR PRODUCTION
**Next**: Run `bash scripts/dev_bootstrap.sh` then `make run.pipeline.live`
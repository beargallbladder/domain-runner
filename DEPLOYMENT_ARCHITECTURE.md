# DEPLOYMENT ARCHITECTURE - READ THIS FIRST

## 🚨 CRITICAL: READ BEFORE ANY CHANGES

**Current Production Status (as of June 2025):**
- ✅ **sophisticated-runner** - ONLY production service on Render
- ❌ **raw-capture-runner** - DELETED from Render (DO NOT REFERENCE)
- ✅ **llm-pagerank-public-api** - Python API on Render
- ✅ **Frontend** - Deployed on Vercel (separate)

## 📊 DATABASE FACTS
- **Production DB**: `postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db`
- **Domain Count**: 2,102 domains
- **Status**: 0 pending domains (ALL PROCESSED)
- **Connection**: Both sophisticated-runner and public-api use EXPLICIT DATABASE_URL

## 🏗️ RENDER SERVICES

### sophisticated-runner
- **Runtime**: Node.js
- **Purpose**: Main domain processing service
- **Database**: Uses explicit DATABASE_URL (NOT fromDatabase reference)
- **Status**: Active and processing

### llm-pagerank-public-api  
- **Runtime**: Python
- **Purpose**: Public API endpoints
- **Database**: Uses explicit DATABASE_URL
- **Status**: Active

## ⚠️ WHAT NOT TO DO
1. **NEVER** reference `raw-capture-db` in fromDatabase
2. **NEVER** add database section to render.yaml
3. **NEVER** assume raw-capture-runner exists
4. **ALWAYS** use explicit DATABASE_URL values
5. **ALWAYS** check this file before making deployment changes

## 🔄 DEPLOYMENT PROCESS
1. Changes pushed to main branch
2. Render auto-deploys sophisticated-runner
3. Render auto-deploys llm-pagerank-public-api
4. Frontend is separate Vercel deployment

## 📁 DIRECTORY STRUCTURE
```
/Users/samkim/newdev/
├── services/
│   ├── sophisticated-runner/     # ACTIVE - Main processor
│   ├── public-api/              # ACTIVE - Python API
│   ├── frontend/                # Deployed on Vercel
│   ├── raw-capture-runner/      # LEGACY - Not deployed
│   └── modular-domain-processor/ # LOCAL TESTING ONLY
├── render.yaml                  # Render deployment config
└── DEPLOYMENT_ARCHITECTURE.md   # THIS FILE
```

## 🎯 CURRENT WORKING STATE
- All 2,102 domains processed
- sophisticated-runner connected to correct database
- **DATA COLLECTION**: Use `node trigger_weekly_premium_runs.js` to trigger runs
- System is stable and complete

## 🚀 HOW TO TRIGGER DATA COLLECTION
**CRITICAL**: To run weekly/premium data collection:
```bash
node trigger_weekly_premium_runs.js
```
This adds domains with `status = 'pending'` and sophisticated-runner processes them automatically.

**Last Updated**: June 27, 2025
**Status**: Production Stable + Data Collection Active 
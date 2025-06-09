# Deploy Sophisticated Runner to Render

## 🎯 Objective
Deploy `sophisticated-runner` as a **separate service** on Render, running parallel to `raw-capture-runner`.

## 📋 Deployment Steps

### 1. Create New Render Service
```bash
# In Render Dashboard:
# 1. Click "New +" → "Web Service"
# 2. Connect your GitHub repo
# 3. Choose "services/sophisticated-runner" as root directory
```

### 2. Configure Service Settings
```
Service Name: sophisticated-runner
Environment: Node
Branch: main (or your main branch)
Build Command: npm cache clean --force && npm install && npm run build
Start Command: node dist/index.js
```

### 3. Set Environment Variables
```bash
NODE_ENV=production
SERVICE_MODE=sophisticated_parallel
PROCESSOR_ID=sophisticated_v1
DOMAINS_SOURCE=premium_500_plus
CACHE_BUST=SOPHISTICATED_2025_06_09_PARALLEL
BUILD_ID=SOPHISTICATED_RUNNER_500_DOMAINS

# API Keys (copy from your existing raw-capture-runner service)
OPENAI_API_KEY=[your_openai_key]
ANTHROPIC_API_KEY=[your_anthropic_key]

# Database (SAME as raw-capture-runner)
DATABASE_URL=[connect_to_existing_raw-capture-db]
```

### 4. Database Connection
**CRITICAL**: Connect to the **same database** as `raw-capture-runner`:
- Database Name: `raw-capture-db`
- Connection: Use existing database (don't create new one)

### 5. Deploy & Monitor
```bash
# After deployment, test both services:
curl https://sophisticated-runner.onrender.com/
curl https://raw-capture-runner.onrender.com/

# Compare status:
curl https://sophisticated-runner.onrender.com/status
curl https://raw-capture-runner.onrender.com/status
```

## 🔍 Expected Results

### Service URLs
- **Existing**: `https://raw-capture-runner.onrender.com`
- **New**: `https://sophisticated-runner.onrender.com`

### Database Behavior
- Both services write to same `raw-capture-db`
- Different `processor_id` values prevent conflicts
- Direct comparison of processing results

### Parallel Processing
- `raw-capture-runner`: Processes ~351 original domains
- `sophisticated-runner`: Processes 500+ premium domains
- Both populate same database tables with different `processor_id`

## ✅ Success Criteria
1. Both services show "healthy" status
2. Database shows domains with different `processor_id` values
3. No conflicts or interference between services
4. Independent scaling and monitoring

## 🎯 Next Phase
Once both services are proven equivalent:
1. Gradually shift traffic to `sophisticated-runner`
2. Deprecate `raw-capture-runner`
3. Full migration to sophisticated architecture

This approach provides **zero-risk parallel testing** with the ability to compare performance, reliability, and results directly. 
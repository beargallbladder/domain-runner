# 🚀 Embedding Engine Deployment Guide

## Quick Deploy to Render

### 1. Create New Web Service
- Go to [Render Dashboard](https://dashboard.render.com)
- Click **"New +"** → **"Web Service"**
- Connect your GitHub repository: `https://github.com/beargallbladder/domain-runner`
- Set **Root Directory**: `services/embedding-engine`

### 2. Service Configuration
```yaml
Name: embedding-engine
Environment: Python 3
Build Command: pip install -r requirements.txt
Start Command: python embedding_runner.py
Plan: Starter ($7/month)
```

### 3. Environment Variables
Set these in Render dashboard:
```
ENVIRONMENT=production
PYTHON_VERSION=3.9

# PRIMARY DATABASE (for writes)
DATABASE_URL=postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db

# READ REPLICA (for analysis queries)
READ_REPLICA_URL=postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-b/raw_capture_db
```

### 4. Health Check
- Health Check Path: `/health`
- The service will respond at: `https://your-service.onrender.com/health`

## Database Strategy

✅ **READ OPERATIONS** → Read Replica (`-b` endpoint)
- Analyzing 36,120+ responses
- No impact on your raw-capture-runner
- Optimized for large queries

✅ **WRITE OPERATIONS** → Primary Database (`-a` endpoint)  
- Only writes to `drift_scores` table
- Separate from your core data
- No interference with collection

## API Endpoints

### Health Check
```bash
GET /health
# Returns: {"status": "healthy", "service": "embedding-engine", "timestamp": "2025-06-07T..."}
```

### Service Status
```bash
GET /status  
# Returns: {"status": "completed", "last_run": "2025-06-07T...", "is_running": false}
```

### Trigger Analysis
```bash
POST /run
# Returns: {"message": "Analysis started"}
```

## Usage

### Manual Trigger
```bash
curl -X POST https://your-embedding-engine.onrender.com/run
```

### Check Status
```bash
curl https://your-embedding-engine.onrender.com/status
```

## Monitoring

- Service logs available in Render dashboard
- Health endpoint for uptime monitoring
- Status endpoint for analysis progress
- Read replica prevents performance impact on data collection

## Cost Estimate

- **Render Starter Plan**: $7/month
- **Compute**: Minimal (runs on-demand)
- **Total**: ~$7/month

## Next Steps

1. Deploy service ✅
2. Test health endpoint ✅
3. Trigger first analysis ✅
4. Monitor logs and performance ✅ 
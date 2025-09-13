# 🚀 Render + Vercel Deployment Guide

## Your Current Setup (from old code)

### Render Services:
- **Database**: `dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com`
- **API Service**: `domain-runner.onrender.com`
- **Service ID**: `srv-ct67jm0gph6c73ciq1kg` (sophisticated-runner)

### What We're Deploying:

```
Vercel (Frontend)          Render (Backend)
│                          │
├── Dashboard UI           ├── PostgreSQL Database
├── Metrics Display        ├── API Service (Flask/FastAPI)
└── Status Page            ├── Hourly Pipeline (Cron)
                          └── Background Workers
```

---

## Step 1: Prepare for Deployment

### 1.1 Update .gitignore (CRITICAL - Don't commit secrets!)
```bash
cat >> .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.production
*.env

# Python
.venv/
venv/
__pycache__/
*.pyc

# Logs
*.log
logs/

# Artifacts (too large)
artifacts/*.json
artifacts/*.csv

# Database
*.db
*.sqlite

# Quarantine (don't deploy old code)
_quarantine/

# Node modules (if any)
node_modules/
EOF
```

### 1.2 Create API endpoints for Vercel
```bash
# Create the API service file
cat > api_service.py << 'EOF'
from flask import Flask, jsonify, request
import os
import json
from datetime import datetime
from agents.database_connector.src.connector import DatabaseConnector

app = Flask(__name__)

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'nexus-api'
    })

@app.route('/api/status')
def status():
    """Get system status"""
    try:
        db = DatabaseConnector()
        coverage = db.get_domain_coverage()
        return jsonify({
            'coverage': coverage['coverage'],
            'expected': coverage['expected'],
            'observed': coverage['observed'],
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/metrics')
def metrics():
    """Get performance metrics"""
    try:
        db = DatabaseConnector()
        stats = db.get_model_performance_stats()
        return jsonify({
            'models': stats,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/trigger-pipeline', methods=['POST'])
def trigger_pipeline():
    """Manually trigger the pipeline"""
    try:
        # Import and run the pipeline
        from scripts.hourly_pipeline import main
        result = main()
        return jsonify({
            'status': 'triggered',
            'result': result,
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 10000))
    app.run(host='0.0.0.0', port=port)
EOF
```

---

## Step 2: Deploy to Render

### 2.1 Add Render requirements
```bash
echo "flask==3.0.0" >> requirements.txt
echo "gunicorn==21.2.0" >> requirements.txt
```

### 2.2 Create Render build script
```bash
cat > build.sh << 'EOF'
#!/usr/bin/env bash
set -e

# Install Python dependencies
pip install -r requirements.txt

# Run database migrations
python -c "
import os
import psycopg2
from psycopg2.extras import execute_values

url = os.environ['DATABASE_URL']
conn = psycopg2.connect(url)
cur = conn.cursor()

# Create tables if not exist
with open('migrations/20250913_core_tables.sql', 'r') as f:
    cur.execute(f.read())

conn.commit()
print('✅ Database migrations complete')
"
EOF
chmod +x build.sh
```

### 2.3 Connect to YOUR Render Database
```bash
# Your ACTUAL Render database URL (from old code)
export DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Test connection
python3 -c "
import psycopg2
conn = psycopg2.connect('$DATABASE_URL')
print('✅ Connected to Render database')
"
```

### 2.4 Deploy to Render (Manual Steps)

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Create New Web Service**:
   - **Repository**: Connect your GitHub repo
   - **Branch**: `main` (or your branch)
   - **Root Directory**: Leave blank
   - **Environment**: Python 3
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn api_service:app`

3. **Add Environment Variables** (in Render dashboard):
   ```
   DATABASE_URL = [your existing Render database URL]
   OPENAI_API_KEY = sk-proj-xxx...
   ANTHROPIC_API_KEY = sk-ant-api03-xxx...
   PYTHON_VERSION = 3.11.9
   ```

4. **Create Cron Job** (for hourly runs):
   - **Schedule**: `0 * * * *`
   - **Command**: `python scripts/hourly_pipeline.py`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create minimal dashboard
```bash
mkdir -p dashboard
cat > dashboard/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Nexus Dashboard</title>
    <style>
        body { font-family: monospace; background: #1a1a1a; color: #0f0; padding: 20px; }
        .metric { background: #000; padding: 20px; margin: 10px; border: 1px solid #0f0; }
        h1 { color: #0f0; }
        .status { font-size: 24px; }
        .error { color: #f00; }
    </style>
</head>
<body>
    <h1>🚀 NEXUS SYSTEM STATUS</h1>
    <div id="status" class="metric">Loading...</div>
    <div id="coverage" class="metric">Coverage: Loading...</div>
    <div id="models" class="metric">Models: Loading...</div>

    <script>
        const API_URL = 'https://domain-runner.onrender.com';

        async function fetchStatus() {
            try {
                const res = await fetch(`${API_URL}/api/status`);
                const data = await res.json();
                document.getElementById('coverage').innerHTML =
                    `Coverage: ${(data.coverage * 100).toFixed(1)}% (${data.observed}/${data.expected})`;
            } catch (e) {
                document.getElementById('coverage').innerHTML =
                    `<span class="error">Error: ${e.message}</span>`;
            }
        }

        async function fetchMetrics() {
            try {
                const res = await fetch(`${API_URL}/api/metrics`);
                const data = await res.json();
                const models = data.models.slice(0, 5);
                document.getElementById('models').innerHTML =
                    '<h3>Top Models</h3>' +
                    models.map(m => `${m.llm_model}: ${m.total_calls} calls`).join('<br>');
            } catch (e) {
                document.getElementById('models').innerHTML =
                    `<span class="error">Error: ${e.message}</span>`;
            }
        }

        // Initial load
        fetchStatus();
        fetchMetrics();

        // Refresh every 60 seconds
        setInterval(fetchStatus, 60000);
        setInterval(fetchMetrics, 60000);
    </script>
</body>
</html>
EOF
```

### 3.2 Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
cd dashboard
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? nexus-dashboard
# - Which directory is code in? ./
# - Want to modify settings? No
```

---

## Step 4: Git Commit Strategy

### 4.1 Commit the clean code (NOT secrets!)
```bash
# Stage only the clean code
git add -A
git reset .env  # UNSTAGE .env if accidentally added

# Review what will be committed
git status

# Commit with clear message
git commit -m "feat: Build 7 - Orchestration with DB persistence

- Added database connector for PostgreSQL
- Implemented A1→A3→A5→MII pipeline
- Created hourly pipeline script
- Added Render/Vercel deployment configs
- Integrated MPM and MII components
- Set up hard gates on coverage tiers
- Single source of truth via runtime.yml"

# Push to your branch
git push origin main
```

---

## Step 5: Verify Deployment

### 5.1 Check Render Service
```bash
curl https://domain-runner.onrender.com/health
# Should return: {"status": "healthy", ...}
```

### 5.2 Check Vercel Dashboard
```bash
# Visit your Vercel URL
open https://nexus-dashboard.vercel.app
```

### 5.3 Check Database
```bash
# Connect to Render database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM domain_responses;"
```

---

## 🚨 IMPORTANT NOTES

1. **NEVER commit .env file** - Contains secrets
2. **Your Render database** is at: `dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com`
3. **API endpoint** will be: `https://domain-runner.onrender.com`
4. **Dashboard** will be: `https://nexus-dashboard.vercel.app`

---

## Environment Variables Summary

### For Render (set in dashboard):
```
DATABASE_URL = postgresql://raw_capture_db_user:xxx@dpg-xxx.render.com/raw_capture_db
OPENAI_API_KEY = sk-proj-xxx
ANTHROPIC_API_KEY = sk-ant-api03-xxx
PYTHON_VERSION = 3.11.9
```

### For Vercel (set in dashboard):
```
NEXT_PUBLIC_API_URL = https://domain-runner.onrender.com
```

---

**Ready to deploy!** Follow steps 1-5 in order.
# 🚨 EXACT GO TO PRODUCTION DIRECTIONS

## STEP 1: Local Setup (5 minutes)

### 1.1 Create your environment file
```bash
cd /Users/samkim/domain-runner
cp .env.example .env
```

### 1.2 Edit .env with YOUR credentials
```bash
nano .env
```

**PASTE EXACTLY THIS** (replace with YOUR real values):
```bash
# YOUR RENDER DATABASE (from your old code)
DATABASE_URL=postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db

# YOUR API KEYS (get from providers)
OPENAI_API_KEY=sk-proj-[YOUR-ACTUAL-KEY-HERE]
ANTHROPIC_API_KEY=sk-ant-api03-[YOUR-ACTUAL-KEY-HERE]

# Leave others blank if you don't have them
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=
COHERE_API_KEY=
AI21_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
PERPLEXITY_API_KEY=
XAI_API_KEY=
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

### 1.3 Install dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install flask gunicorn
```

### 1.4 Test connection to YOUR database
```bash
source .env
python3 -c "
import psycopg2
conn = psycopg2.connect('$DATABASE_URL')
print('✅ Connected to Render database')
"
```

**If this fails**, your DATABASE_URL is wrong. Check it.

### 1.5 Create database tables
```bash
psql "$DATABASE_URL" -f migrations/20250913_core_tables.sql
```

**If psql not found**:
```bash
brew install postgresql  # Mac
# or
sudo apt-get install postgresql-client  # Linux
```

### 1.6 Test locally
```bash
python3 orchestrator_demo.py
```

**You should see**:
```
🚀 NEXUS ORCHESTRATOR - Live Demo
✅ ALL COMPONENTS RUNNING ON RUVNET FRAMEWORK
```

---

## STEP 2: Push to GitHub (2 minutes)

### 2.1 Add git remote (if not set)
```bash
git remote -v
```

**If no remote**, add it:
```bash
git remote add origin https://github.com/YOUR_USERNAME/domain-runner.git
```

### 2.2 Push code
```bash
git push origin main
```

**If it fails** with "no branch":
```bash
git push -u origin main
```

---

## STEP 3: Deploy to Render (10 minutes)

### 3.1 Go to Render Dashboard
```bash
open https://dashboard.render.com
```

### 3.2 Click "New +" → "Web Service"

### 3.3 Connect your GitHub repo
- **If first time**: Click "Connect GitHub" and authorize
- **Select**: `YOUR_USERNAME/domain-runner`
- **Branch**: `main`

### 3.4 Configure the service

**EXACT SETTINGS TO USE**:

| Setting | Value |
|---------|-------|
| **Name** | `nexus-api` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | (leave blank) |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn api_service:app` |
| **Plan** | Free |

### 3.5 Add Environment Variables

Click "Advanced" → "Add Environment Variable"

**ADD THESE EXACTLY**:

```
DATABASE_URL = postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db
OPENAI_API_KEY = [YOUR-OPENAI-KEY]
ANTHROPIC_API_KEY = [YOUR-ANTHROPIC-KEY]
PYTHON_VERSION = 3.11.9
```

### 3.6 Click "Create Web Service"

**WAIT** 5-10 minutes for deployment

### 3.7 Test your API
```bash
# Your service URL will be shown in Render
curl https://nexus-api.onrender.com/health
```

**Should return**:
```json
{"status": "healthy", "timestamp": "...", "service": "nexus-api"}
```

---

## STEP 4: Create Cron Job on Render (5 minutes)

### 4.1 In Render Dashboard
Click "New +" → "Cron Job"

### 4.2 Configure cron job

| Setting | Value |
|---------|-------|
| **Name** | `nexus-hourly-pipeline` |
| **Command** | `python scripts/hourly_pipeline.py` |
| **Schedule** | `0 * * * *` (every hour) |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |

### 4.3 Add same environment variables
```
DATABASE_URL = [same as above]
OPENAI_API_KEY = [same as above]
ANTHROPIC_API_KEY = [same as above]
```

### 4.4 Click "Create Cron Job"

---

## STEP 5: Deploy Frontend to Vercel (5 minutes)

### 5.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 5.2 Create dashboard
```bash
cd /Users/samkim/domain-runner
mkdir -p dashboard
cat > dashboard/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Nexus Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
            color: #00ff41;
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 {
            font-size: 2.5em;
            margin-bottom: 30px;
            text-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #00ff41;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
        }
        .card h3 {
            margin-bottom: 15px;
            color: #00ff41;
        }
        .metric {
            font-size: 2em;
            font-weight: bold;
            margin: 10px 0;
        }
        .status-healthy { color: #00ff41; }
        .status-degraded { color: #ffaa00; }
        .status-invalid { color: #ff0041; }
        .error { color: #ff0041; }
        button {
            background: #00ff41;
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-weight: bold;
            margin-top: 10px;
        }
        button:hover {
            box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
        }
        .log {
            background: #000;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            max-height: 200px;
            overflow-y: auto;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 NEXUS SYSTEM DASHBOARD</h1>

        <div class="grid">
            <div class="card">
                <h3>📊 Coverage</h3>
                <div id="coverage" class="metric">---%</div>
                <div id="coverage-details">Loading...</div>
            </div>

            <div class="card">
                <h3>🎯 System Tier</h3>
                <div id="tier" class="metric">---</div>
                <div id="tier-details">Checking...</div>
            </div>

            <div class="card">
                <h3>🤖 Active Models</h3>
                <div id="models" class="metric">0</div>
                <div id="models-list" class="log">Loading...</div>
            </div>

            <div class="card">
                <h3>⚡ Actions</h3>
                <button onclick="triggerPipeline()">Run Pipeline Now</button>
                <button onclick="refreshStatus()">Refresh Status</button>
                <div id="action-result" class="log"></div>
            </div>
        </div>

        <div class="card" style="margin-top: 20px;">
            <h3>📜 Recent Activity</h3>
            <div id="activity" class="log">Connecting to API...</div>
        </div>
    </div>

    <script>
        // CHANGE THIS TO YOUR RENDER SERVICE URL
        const API_URL = 'https://nexus-api.onrender.com';

        async function fetchStatus() {
            try {
                const res = await fetch(`${API_URL}/api/status`);
                const data = await res.json();

                const coverage = (data.coverage * 100).toFixed(1);
                document.getElementById('coverage').textContent = coverage + '%';
                document.getElementById('coverage-details').textContent =
                    `${data.observed} / ${data.expected} domains`;

                // Set tier color
                let tierClass = 'status-healthy';
                let tier = 'Healthy';
                if (coverage < 70) {
                    tierClass = 'status-invalid';
                    tier = 'Invalid';
                } else if (coverage < 95) {
                    tierClass = 'status-degraded';
                    tier = 'Degraded';
                }

                const tierEl = document.getElementById('tier');
                tierEl.textContent = tier;
                tierEl.className = 'metric ' + tierClass;
                document.getElementById('tier-details').textContent =
                    tier === 'Invalid' ? '⚠️ BLOCKED - Coverage too low!' : '✅ Pipeline enabled';

                updateActivity(`Coverage updated: ${coverage}% (${tier})`);
            } catch (e) {
                document.getElementById('coverage').innerHTML =
                    '<span class="error">ERROR</span>';
                updateActivity(`Error fetching status: ${e.message}`);
            }
        }

        async function fetchMetrics() {
            try {
                const res = await fetch(`${API_URL}/api/metrics`);
                const data = await res.json();

                const models = data.models || [];
                document.getElementById('models').textContent = models.length;

                const modelsList = models.slice(0, 5).map(m =>
                    `${m.llm_model}: ${m.total_calls} calls (${(m.success_rate * 100).toFixed(0)}% success)`
                ).join('\\n');

                document.getElementById('models-list').textContent = modelsList || 'No models active';
                updateActivity(`Metrics updated: ${models.length} models active`);
            } catch (e) {
                document.getElementById('models').innerHTML =
                    '<span class="error">ERROR</span>';
                updateActivity(`Error fetching metrics: ${e.message}`);
            }
        }

        async function triggerPipeline() {
            const resultEl = document.getElementById('action-result');
            resultEl.textContent = 'Triggering pipeline...';

            try {
                const res = await fetch(`${API_URL}/api/trigger-pipeline`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'}
                });
                const data = await res.json();

                if (data.error) {
                    resultEl.innerHTML = `<span class="error">Error: ${data.error}</span>`;
                } else {
                    resultEl.textContent = `Pipeline triggered! Tier: ${data.result?.tier || 'Unknown'}`;
                }
                updateActivity('Pipeline manually triggered');
            } catch (e) {
                resultEl.innerHTML = `<span class="error">Failed: ${e.message}</span>`;
                updateActivity(`Pipeline trigger failed: ${e.message}`);
            }
        }

        function refreshStatus() {
            fetchStatus();
            fetchMetrics();
            updateActivity('Manual refresh');
        }

        function updateActivity(message) {
            const activity = document.getElementById('activity');
            const timestamp = new Date().toLocaleTimeString();
            activity.textContent = `[${timestamp}] ${message}\\n` + activity.textContent;

            // Keep only last 10 lines
            const lines = activity.textContent.split('\\n');
            if (lines.length > 10) {
                activity.textContent = lines.slice(0, 10).join('\\n');
            }
        }

        // Initial load
        fetchStatus();
        fetchMetrics();

        // Auto-refresh every 60 seconds
        setInterval(() => {
            fetchStatus();
            fetchMetrics();
        }, 60000);
    </script>
</body>
</html>
EOF
```

### 5.3 Deploy to Vercel
```bash
cd dashboard
vercel --prod
```

**When prompted**:
- Set up and deploy? **Y**
- Which scope? **[Your account]**
- Link to existing project? **N**
- Project name? **nexus-dashboard**
- Directory? **./** (current)
- Override settings? **N**

### 5.4 Update API URL in dashboard
After deployment, Vercel will show your URL (like `nexus-dashboard.vercel.app`)

**Edit the dashboard to use YOUR Render URL**:
```bash
# Edit line 132 in dashboard/index.html
const API_URL = 'https://nexus-api.onrender.com';  # YOUR actual Render URL
```

**Redeploy**:
```bash
vercel --prod
```

---

## STEP 6: Verify Everything Works

### 6.1 Check API
```bash
curl https://nexus-api.onrender.com/health
```
**Should return**: `{"status": "healthy"...}`

### 6.2 Check Dashboard
```bash
open https://nexus-dashboard.vercel.app
```
**Should show**: Coverage %, Tier, Active Models

### 6.3 Test Pipeline
```bash
curl -X POST https://nexus-api.onrender.com/api/trigger-pipeline
```
**Should return**: Pipeline result with tier

---

## 🚨 TROUBLESHOOTING

### "Connection refused" on Render
- Check DATABASE_URL is correct in Render env vars
- Make sure you're using the Render database URL

### "No API keys" error
- Add OPENAI_API_KEY and ANTHROPIC_API_KEY in Render

### Dashboard shows "ERROR"
- Check browser console (F12)
- Verify API_URL in dashboard matches your Render service

### Cron job not running
- Check Render logs
- Make sure environment variables are set

---

## ✅ SUCCESS CHECKLIST

- [ ] Local test works (`python3 orchestrator_demo.py`)
- [ ] Code pushed to GitHub
- [ ] Render service deployed and healthy
- [ ] Cron job created on Render
- [ ] Dashboard deployed to Vercel
- [ ] API returns data
- [ ] Dashboard shows coverage %

---

## 🎯 YOU'RE LIVE WHEN:

1. Visit: `https://nexus-dashboard.vercel.app`
2. See: Coverage percentage and tier
3. Click: "Run Pipeline Now" works
4. Cron: Runs every hour automatically

**Total time: ~30 minutes**

---

**NEED HELP?** Check Render logs:
```bash
open https://dashboard.render.com/web/[your-service]/logs
```
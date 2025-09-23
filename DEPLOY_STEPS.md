# 🚀 IMMEDIATE DEPLOYMENT STEPS

## ✅ What's Ready
- ✅ Code pushed to GitHub
- ✅ FastAPI web service with real database queries
- ✅ Worker service with drift monitoring
- ✅ Docker configuration
- ✅ render.yaml blueprint

## 📋 Quick Deploy (5 minutes)

### Step 1: Login to Render Dashboard
Go to https://dashboard.render.com

### Step 2: Create New Blueprint Instance
1. Click "New +" → "Blueprint"
2. Connect GitHub repo: `https://github.com/beargallbladder/domain-runner`
3. Name: `domain-runner`
4. Branch: `main`
5. Click "Apply"

### Step 3: Set Environment Variables
Once services are created, for EACH service (web and worker):

1. Click on the service
2. Go to "Environment" tab
3. Add these variables:

```env
# Database (should auto-connect from render.yaml)
DATABASE_URL=(auto-filled)

# LLM API Keys (add what you have)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=...
MISTRAL_API_KEY=...
COHERE_API_KEY=...
AI21_API_KEY=...
GOOGLE_API_KEY=...
GROQ_API_KEY=...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=...
XAI_API_KEY=...

# Worker Settings (for worker service only)
WORKER_INTERVAL_SEC=300
WORKER_BATCH_SIZE=10
ENABLE_DRIFT_MONITORING=true
ENABLE_TENSOR_PROCESSING=true
```

### Step 4: Deploy
1. Services will auto-deploy after environment variables are set
2. Wait 5-10 minutes for build and deploy

### Step 5: Verify

Test the endpoints:

```bash
# Health check
curl https://domain-runner-web.onrender.com/healthz

# Status with real database stats
curl https://domain-runner-web.onrender.com/status

# List domains
curl https://domain-runner-web.onrender.com/domains

# Model performance
curl https://domain-runner-web.onrender.com/models

# Drift analysis for specific domain
curl https://domain-runner-web.onrender.com/drift/example.com
```

## 🔍 What You'll See

### Web Service Dashboard
- Green health check ✅
- Logs showing: `[API] Orchestrator and database initialized`
- Memory usage < 512MB

### Worker Service Dashboard
- Logs showing: `[Worker] Starting domain-runner worker`
- Periodic heartbeats every 5 minutes
- Drift monitoring results

### Database Dashboard
- Connection count (should be 2-4)
- Tables: domains, domain_responses, drift_scores, responses_raw, responses_normalized

## 🚨 If Something Goes Wrong

### Build Fails
- Check logs for missing dependencies
- Verify requirements.txt has all packages

### Health Check Fails
- Check DATABASE_URL is connected
- Verify port 8080 is used
- Check logs for startup errors

### Worker Crashes
- Check API keys are set
- Verify database connection
- Look for error messages in logs

## 📊 Next Steps After Deploy

1. **Monitor Initial Run**
   - Watch worker logs for first processing cycle
   - Check /status endpoint for coverage metrics

2. **Add Domains**
   - Use existing scripts to populate domain list
   - Trigger initial crawl

3. **Set Up Alerts**
   - Configure Render notifications for failures
   - Set up Slack/email alerts for drift detection

## 💰 Cost Estimate
- Web Service (Starter): $7/month
- Worker (Starter): $7/month
- Database (Free tier): $0
- **Total: $14/month**

LLM API costs are separate and depend on usage.

---

**Ready? Go to https://dashboard.render.com and start with Step 2!**
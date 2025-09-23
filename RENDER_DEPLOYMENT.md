# Domain Runner - Render Deployment Guide

This guide helps you deploy the domain-runner application to Render.com using the provided automation scripts and configuration.

## 🚀 Quick Start

1. **Prerequisites Check:**
   - GitHub repository: https://github.com/beargallbladder/domain-runner
   - Render account with CLI access
   - LLM API keys ready

2. **Deploy to Render:**
   ```bash
   python deploy_to_render.py
   ```

3. **Set Environment Variables:**
   Follow instructions in `render_env_setup.md`

4. **Verify Deployment:**
   ```bash
   python verify_deployment.py --url https://domain-runner-web.onrender.com
   ```

## 📋 What Gets Deployed

### Services Created:
- **domain-runner-web**: API service with health checks (`/healthz`)
- **domain-runner-worker**: Background processing service
- **domain-runner-db**: PostgreSQL database (free tier)

### Configuration:
- Uses `render.yaml` blueprint for infrastructure as code
- Docker-based deployment with health checks
- Auto-deploy enabled from main branch
- Environment variables for 11 LLM providers

## 🔧 Files Created

| File | Purpose |
|------|---------|
| `deploy_to_render.py` | Automated deployment script |
| `verify_deployment.py` | Health check and verification script |
| `render_env_setup.md` | Environment variables setup guide |
| `deployment_monitoring.md` | Comprehensive monitoring guide |

## 📖 Step-by-Step Deployment

### Step 1: Authenticate with Render
```bash
# Install Render CLI (if not installed)
npm install -g @render-com/cli

# Login to Render
render login
```

### Step 2: Run Deployment Script
```bash
./deploy_to_render.py
```

The script will:
- ✅ Check Render CLI authentication
- ✅ List existing services
- ✅ Create services from render.yaml blueprint
- ✅ Set up environment variables
- ✅ Wait for deployment completion
- ✅ Test health endpoints

### Step 3: Configure Environment Variables

**Critical**: Set all required LLM API keys. See `render_env_setup.md` for detailed instructions.

Required keys:
```
OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY,
DEEPSEEK_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY,
AI21_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY,
PERPLEXITY_API_KEY, XAI_API_KEY
```

### Step 4: Verify Deployment
```bash
./verify_deployment.py
```

Expected output:
```
🔍 Verifying deployment at: https://domain-runner-web.onrender.com
1. Testing basic connectivity...
   ✅ Service reachable (HTTP 200)
2. Testing health endpoint...
   ✅ Health endpoint responding
3. Testing database connectivity...
   ✅ Database connected
4. Testing API endpoints...
   ✅ /: OK (HTTP 200)
   ✅ /healthz: OK (HTTP 200)
5. Testing LLM provider availability...
   ✅ openai: Available
   ✅ anthropic: Available

🎉 Overall Status: HEALTHY ✅
```

## 🏥 Health Monitoring

### Quick Health Check:
```bash
curl https://domain-runner-web.onrender.com/healthz
```

### Detailed Monitoring:
- Follow procedures in `deployment_monitoring.md`
- Set up automated health checks
- Monitor service logs regularly

### Service URLs:
- **Web API**: `https://domain-runner-web.onrender.com`
- **Health Check**: `https://domain-runner-web.onrender.com/healthz`
- **API Docs**: `https://domain-runner-web.onrender.com/docs`

## 🔧 Configuration Details

### render.yaml Blueprint:
```yaml
databases:
  - name: domain-runner-db
    plan: free

services:
  - type: web
    name: domain-runner-web
    env: docker
    healthCheckPath: /healthz

  - type: worker
    name: domain-runner-worker
    env: docker
    dockerCommand: python -m src.worker
```

### Docker Configuration:
- Base image: `python:3.11-slim`
- Health check: `/healthz` endpoint
- Port: 8080
- Auto-scaling: Enabled

## 🚨 Troubleshooting

### Common Issues:

1. **Authentication Error:**
   ```bash
   render login
   ```

2. **Environment Variables Missing:**
   ```bash
   render service env set --service domain-runner-web OPENAI_API_KEY=your-key
   ```

3. **Service Won't Start:**
   ```bash
   render service logs --service domain-runner-web --tail
   ```

4. **Health Check Failing:**
   ```bash
   python verify_deployment.py --url https://domain-runner-web.onrender.com
   ```

### Getting Help:
- Check logs: `render service logs --service domain-runner-web --tail`
- Review `deployment_monitoring.md` for detailed troubleshooting
- Contact Render support: https://render.com/docs/support

## 📊 Success Checklist

- [ ] Services created and deployed successfully
- [ ] All environment variables configured
- [ ] Health endpoint returning 200 OK
- [ ] Database connected
- [ ] Worker service processing tasks
- [ ] LLM providers responding
- [ ] API endpoints accessible
- [ ] Monitoring set up

## 🔄 Ongoing Maintenance

### Daily:
- Check service health: `python verify_deployment.py`
- Monitor error logs
- Verify API functionality

### Weekly:
- Review resource usage
- Check for failed background tasks
- Update API keys if needed

### Monthly:
- Review and optimize configuration
- Check for platform updates
- Backup environment variables

## 📞 Support Resources

- **Documentation**: `deployment_monitoring.md`
- **Render Status**: https://status.render.com/
- **Community**: https://community.render.com/
- **GitHub Issues**: https://github.com/beargallbladder/domain-runner/issues

---

🎉 **Your domain-runner application is now deployed and ready to process domain analysis requests on Render!**
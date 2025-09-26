# Render Deployment Instructions

## Automated Deployment Options

### Option 1: GitHub Integration (Recommended)
1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Connect your GitHub account if not already connected
4. Select the `beargallbladder/domain-runner` repository
5. The Blueprint file (`render-rust.yaml`) will be automatically detected
6. Click "Apply" to deploy both services

### Option 2: Direct Blueprint URL
Click this link to deploy directly:

`https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fbeargallbladder%2Fdomain-runner&blueprint=render-rust.yaml`

### Option 3: API Deployment (if credentials available)
Set environment variables and run:
```bash
export RENDER_API_KEY="your_api_key"
export RENDER_WEB_SERVICE_ID="your_web_service_id"
export RENDER_WORKER_SERVICE_ID="your_worker_service_id"
./deploy_to_render.sh api
```

## Services Configuration

### Web Service (domain-runner-rust-web)
- **Type**: Web Service
- **Environment**: Docker
- **Dockerfile**: `Dockerfile.rust`
- **Command**: `web`
- **Plan**: Starter
- **Health Check**: `/healthz`
- **Read-only Mode**: Enabled (`DB_READONLY=true`)

### Worker Service (domain-runner-rust-worker)
- **Type**: Worker Service
- **Environment**: Docker
- **Dockerfile**: `Dockerfile.rust`
- **Command**: `worker`
- **Plan**: Starter
- **Read-only Mode**: Enabled (`DB_READONLY=true`)

## Environment Variables
Both services will have `DB_READONLY=true` set for production safety.
API keys are configured but require manual setup in Render dashboard.

## Monitoring
After deployment, run:
```bash
./deployment_monitor.sh monitor
```

This will monitor the health endpoint every 30 seconds and report status.

## Expected URLs
- Web Service: https://domain-runner-rust-web.onrender.com
- Health Check: https://domain-runner-rust-web.onrender.com/healthz

# Domain Runner Deployment Guide

## Overview

This guide covers deployment strategies for the Domain Runner platform across different environments, from local development to production. The platform uses a microservices architecture with services deployed primarily on Render.com and Vercel.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Staging Environment](#staging-environment)
4. [Production Deployment](#production-deployment)
5. [Environment-Specific Configurations](#environment-specific-configurations)
6. [Database Setup](#database-setup)
7. [Service-by-Service Deployment](#service-by-service-deployment)
8. [Monitoring and Health Checks](#monitoring-and-health-checks)
9. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- PostgreSQL 14+
- Git
- Render.com account
- Vercel account (for frontend)

### 1-Minute Deploy to Production

```bash
# Clone the repository
git clone https://github.com/your-org/domain-runner.git
cd domain-runner

# Set up environment variables (see Environment section)
cp .env.example .env
# Edit .env with your configuration

# Deploy all services to Render
./scripts/deploy_all_services.sh

# Deploy frontend to Vercel
cd services/frontend
vercel --prod
```

## Local Development

### System Requirements

- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **CPU**: 4 cores recommended for concurrent processing

### Database Setup

```bash
# Using Docker (recommended)
docker run --name domain-runner-db \
  -e POSTGRES_DB=domain_runner \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:14

# Or install PostgreSQL locally
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql postgresql-contrib

# Create database
createdb domain_runner

# Run migrations
cd schemas
psql -d domain_runner -f init.sql
```

### Environment Configuration

Create `.env` file in project root:

```bash
# Database
DATABASE_URL=postgresql://admin:your_password@localhost:5432/domain_runner

# API Keys (get from respective providers)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
MISTRAL_API_KEY=...
XAI_API_KEY=xai-...
TOGETHER_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_API_KEY=...

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### Running Services Locally

#### Option 1: Individual Services

```bash
# Terminal 1: Public API
cd services/public-api
pip install -r requirements.txt
uvicorn production_api:app --reload --port 8000

# Terminal 2: Sophisticated Runner
cd services/sophisticated-runner
npm install
npm run dev

# Terminal 3: Frontend
cd services/frontend
npm install
npm run dev

# Terminal 4: SEO Metrics Runner
cd services/seo-metrics-runner
npm install
npm run dev
```

#### Option 2: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# Stop services
docker-compose down
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: domain_runner
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./schemas/init.sql:/docker-entrypoint-initdb.d/init.sql

  public-api:
    build: ./services/public-api
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://admin:password@database:5432/domain_runner
    depends_on:
      - database

  sophisticated-runner:
    build: ./services/sophisticated-runner
    ports:
      - "3003:3003"
    environment:
      DATABASE_URL: postgresql://admin:password@database:5432/domain_runner
      NODE_ENV: development
    depends_on:
      - database

  frontend:
    build: ./services/frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_BASE_URL: http://localhost:8000

volumes:
  postgres_data:
```

## Staging Environment

### Purpose
- Pre-production testing
- Performance validation
- Integration testing
- User acceptance testing

### Configuration

```bash
# Staging environment variables
NODE_ENV=staging
DATABASE_URL=postgresql://staging_user:pass@staging-db:5432/domain_runner_staging
API_BASE_URL=https://domain-runner-staging.onrender.com

# Reduced processing limits for staging
BATCH_SIZE=10
MAX_CONCURRENT_REQUESTS=5
RATE_LIMIT_DELAY=1000
```

### Deployment

```bash
# Deploy to staging
git checkout staging
git merge main
git push origin staging

# Render will auto-deploy staging environment
# Monitor at: https://domain-runner-staging.onrender.com/health
```

## Production Deployment

### Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                         │
├─────────────────────────────────────────────────────────────┤
│ Frontend (Vercel)                                           │
│ ├─── React SPA (domain-runner.vercel.app)                  │
│ └─── Next.js App (llmrank.io)                              │
├─────────────────────────────────────────────────────────────┤
│ API Layer (Render.com)                                     │
│ ├─── Public API (llmrank.io)                               │
│ ├─── Sophisticated Runner (sophisticated-runner.onrender.com)│
│ ├─── SEO Metrics (seo-metrics-runner.onrender.com)         │
│ └─── Other Microservices                                   │
├─────────────────────────────────────────────────────────────┤
│ Database (Render.com)                                      │
│ └─── PostgreSQL 14 (managed)                               │
└─────────────────────────────────────────────────────────────┘
```

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Health checks implemented
- [ ] Error monitoring setup
- [ ] Performance tests passed
- [ ] Security review completed
- [ ] Backup strategy verified
- [ ] DNS configuration ready

### Production Environment Variables

```bash
# Core Configuration
NODE_ENV=production
DATABASE_URL=postgresql://prod_user:secure_pass@prod-db:5432/domain_runner
PORT=8000

# API Configuration
API_RATE_LIMIT=100
MAX_CONNECTIONS=100
CONNECTION_TIMEOUT=30000
BATCH_SIZE=50
MAX_BATCH_SIZE=100

# Monitoring
LOG_LEVEL=info
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true

# Security
CORS_ORIGINS=https://llmrank.io,https://domain-runner.vercel.app
SESSION_SECRET=your-secure-session-secret
```

### Deployment Steps

#### 1. Database Deployment

```bash
# Create production database on Render
# Navigate to Render Dashboard → Databases → New PostgreSQL

# Database Configuration:
Name: raw-capture-db
Plan: Standard ($7/month)
Region: Oregon (US West)
PostgreSQL Version: 14

# Run initial schema
psql $DATABASE_URL -f schemas/init.sql

# Run migrations
for migration in migrations/*.sql; do
  psql $DATABASE_URL -f "$migration"
done
```

#### 2. Core Services Deployment

```bash
# Deploy Public API
cd services/public-api
git add .
git commit -m "Production deployment"
git push origin main
# Render auto-deploys from main branch

# Deploy Sophisticated Runner
cd ../sophisticated-runner
npm run build
git add .
git commit -m "Production deployment"
git push origin main

# Deploy SEO Metrics Runner
cd ../seo-metrics-runner
npm run build
git add .
git commit -m "Production deployment"
git push origin main
```

#### 3. Frontend Deployment

```bash
# Deploy to Vercel
cd services/frontend
npm run build
vercel --prod

# Set up custom domain
vercel domains add llmrank.io
vercel domains add www.llmrank.io
```

#### 4. DNS Configuration

```bash
# Configure DNS records
# A record: llmrank.io → Render IP
# CNAME: www.llmrank.io → llmrank.io
# CNAME: api.llmrank.io → llm-pagerank-public-api.onrender.com
```

### Zero-Downtime Deployment Strategy

```bash
#!/bin/bash
# deploy.sh - Zero-downtime deployment script

set -e

echo "🚀 Starting zero-downtime deployment..."

# 1. Health check before deployment
echo "Checking current health..."
curl -f https://llmrank.io/health || exit 1

# 2. Deploy database migrations
echo "Running database migrations..."
psql $DATABASE_URL -f migrations/latest.sql

# 3. Deploy services one by one
services=("public-api" "sophisticated-runner" "seo-metrics-runner")

for service in "${services[@]}"; do
  echo "Deploying $service..."
  
  # Build and test
  cd "services/$service"
  npm run build
  npm run test
  
  # Deploy
  git add .
  git commit -m "Deployment: $(date)"
  git push origin main
  
  # Wait for deployment
  sleep 60
  
  # Health check
  curl -f "https://$service.onrender.com/health" || exit 1
  
  cd ../..
done

echo "✅ Zero-downtime deployment completed!"
```

## Environment-Specific Configurations

### Development

```javascript
// config/development.js
module.exports = {
  database: {
    maxConnections: 10,
    idleTimeout: 10000
  },
  processing: {
    batchSize: 5,
    concurrentRequests: 3,
    rateLimitDelay: 2000
  },
  logging: {
    level: 'debug',
    enableConsole: true
  }
};
```

### Staging

```javascript
// config/staging.js
module.exports = {
  database: {
    maxConnections: 20,
    idleTimeout: 20000
  },
  processing: {
    batchSize: 10,
    concurrentRequests: 10,
    rateLimitDelay: 1000
  },
  logging: {
    level: 'info',
    enableConsole: true
  }
};
```

### Production

```javascript
// config/production.js
module.exports = {
  database: {
    maxConnections: 100,
    idleTimeout: 30000
  },
  processing: {
    batchSize: 50,
    maxBatchSize: 100,
    concurrentRequests: 30,
    rateLimitDelay: 500
  },
  logging: {
    level: 'info',
    enableConsole: false,
    enableFile: true
  }
};
```

## Service-by-Service Deployment

### Public API (FastAPI)

#### Render Configuration

```yaml
# services/public-api/render.yaml
services:
  - type: web
    name: llm-pagerank-public-api
    env: python
    plan: starter
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn production_api:app --host 0.0.0.0 --port $PORT"
    healthCheckPath: /health
    domains:
      - llmrank.io
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: raw-capture-db
          property: connectionString
      - key: ENVIRONMENT
        value: production
```

#### Deployment Commands

```bash
cd services/public-api

# Install dependencies
pip install -r requirements.txt

# Run tests
python -m pytest tests/

# Deploy to Render
git add .
git commit -m "Deploy public API"
git push origin main
```

### Sophisticated Runner (TypeScript)

#### Render Configuration

```yaml
# services/sophisticated-runner/render.yaml
services:
  - type: web
    name: sophisticated-runner
    runtime: node
    plan: starter
    buildCommand: "npm install && npm run build"
    startCommand: "npm start"
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: raw-capture-db
          property: connectionString
```

#### Deployment Commands

```bash
cd services/sophisticated-runner

# Install and build
npm install
npm run build

# Run tests
npm test

# Deploy
git add .
git commit -m "Deploy sophisticated runner"
git push origin main
```

### Frontend (React)

#### Vercel Configuration

```json
{
  "name": "domain-runner-frontend",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ],
  "env": {
    "VITE_API_BASE_URL": "https://llmrank.io"
  }
}
```

#### Deployment Commands

```bash
cd services/frontend

# Install and build
npm install
npm run build

# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add VITE_API_BASE_URL production
```

## Monitoring and Health Checks

### Health Check Endpoints

All services implement standardized health checks:

```bash
# Check all services
curl https://llmrank.io/health
curl https://sophisticated-runner.onrender.com/health
curl https://seo-metrics-runner.onrender.com/health

# Expected response
{
  "status": "healthy",
  "service": "service-name",
  "timestamp": "2025-07-20T17:30:00.000Z",
  "database": "connected"
}
```

### Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Service monitoring script

services=(
  "https://llmrank.io/health"
  "https://sophisticated-runner.onrender.com/health"
  "https://seo-metrics-runner.onrender.com/health"
)

for service in "${services[@]}"; do
  echo "Checking $service..."
  
  if curl -f -s "$service" > /dev/null; then
    echo "✅ $service is healthy"
  else
    echo "❌ $service is down"
    # Send alert (email, Slack, etc.)
  fi
done
```

### Automated Monitoring with GitHub Actions

```yaml
# .github/workflows/health-check.yml
name: Health Check

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Public API
        run: |
          curl -f https://llmrank.io/health
      
      - name: Check Sophisticated Runner
        run: |
          curl -f https://sophisticated-runner.onrender.com/health
      
      - name: Check SEO Metrics
        run: |
          curl -f https://seo-metrics-runner.onrender.com/health
      
      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          text: "Health check failed!"
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Rollback Procedures

### Database Rollback

```bash
# Create backup before migrations
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Rollback to specific migration
psql $DATABASE_URL -f migrations/rollback_to_001.sql
```

### Service Rollback

```bash
# Rollback via Render Dashboard
# 1. Go to service → Deploys
# 2. Click "Redeploy" on previous successful deployment

# Or via CLI
render deploy rollback --service-id=srv-xyz --deploy-id=dep-abc
```

### Frontend Rollback

```bash
# Rollback Vercel deployment
vercel rollback --scope=your-team

# Or redeploy specific commit
git checkout <previous-commit>
vercel --prod
```

## Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database status
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
curl https://llmrank.io/health | jq '.database'

# Reset connections
sudo systemctl restart postgresql  # local
# Or restart service on Render
```

#### Service Not Starting

```bash
# Check logs
render logs --service=sophisticated-runner --tail

# Check environment variables
render env:get --service=sophisticated-runner

# Test locally
NODE_ENV=production npm start
```

#### High Memory Usage

```bash
# Monitor memory
curl https://sophisticated-runner.onrender.com/health | jq '.memory'

# Restart service if needed
render services:restart sophisticated-runner
```

#### API Rate Limiting

```bash
# Check rate limit status
curl -I https://llmrank.io/api/rankings

# Headers will show:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1721493600
```

### Emergency Procedures

#### Service Down

```bash
# 1. Check health endpoints
./scripts/health-check.sh

# 2. Check Render status page
curl https://status.render.com/api/v2/status.json

# 3. Restart services
render services:restart sophisticated-runner

# 4. Check logs
render logs --service=sophisticated-runner --tail=100
```

#### Database Issues

```bash
# 1. Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# 2. Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Kill long-running queries
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '10 minutes';"
```

#### Performance Issues

```bash
# 1. Check API response times
time curl https://llmrank.io/api/stats

# 2. Monitor database performance
psql $DATABASE_URL -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Check processing queue
curl https://sophisticated-runner.onrender.com/provider-usage
```

---

*Deployment Guide version 2.1 - Last updated: July 20, 2025*
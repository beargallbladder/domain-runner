# Domain Runner - Render Deployment Monitoring Guide

This guide provides comprehensive instructions for monitoring and maintaining your domain-runner deployment on Render.

## Quick Deployment Summary

Your application consists of three main components:
- **Web Service**: `domain-runner-web` (API endpoints, health checks)
- **Worker Service**: `domain-runner-worker` (background processing)
- **Database**: `domain-runner-db` (PostgreSQL database)

## Deployment Process

### 1. Initial Deployment

Run the deployment script:
```bash
python deploy_to_render.py
```

Or manually deploy using Render CLI:
```bash
# Create from blueprint
render blueprint create --repo https://github.com/beargallbladder/domain-runner --branch main --blueprint-path render.yaml

# Wait for deployment
render service get --service domain-runner-web -o json
render service get --service domain-runner-worker -o json
```

### 2. Environment Variables Setup

Follow the instructions in `render_env_setup.md` to configure all required LLM API keys.

### 3. Verification

Run the verification script:
```bash
python verify_deployment.py --url https://domain-runner-web.onrender.com
```

## Monitoring Procedures

### Daily Health Checks

**Automated Health Monitoring:**
```bash
# Check service status
render service get --service domain-runner-web
render service get --service domain-runner-worker

# Quick health check
curl -f https://domain-runner-web.onrender.com/healthz

# Detailed verification
python verify_deployment.py
```

**Expected Health Response:**
```json
{
  "status": "healthy",
  "service": "domain-runner",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "database": "connected",
  "components": {
    "worker": "active",
    "api": "running"
  },
  "providers": {
    "configured": ["openai", "anthropic", "google"],
    "available": ["openai", "anthropic", "google"]
  }
}
```

### Log Monitoring

**Web Service Logs:**
```bash
# Real-time logs
render service logs --service domain-runner-web --tail

# Recent logs
render service logs --service domain-runner-web --num 100

# Error filtering
render service logs --service domain-runner-web --tail | grep -i error
```

**Worker Service Logs:**
```bash
# Real-time worker logs
render service logs --service domain-runner-worker --tail

# Check for processing errors
render service logs --service domain-runner-worker --tail | grep -i "failed\|error\|exception"
```

**Key Log Patterns to Monitor:**

✅ **Healthy Patterns:**
```
INFO: Application startup complete
INFO: Worker started successfully
INFO: Database connection established
INFO: Health check passed
```

❌ **Error Patterns:**
```
ERROR: Database connection failed
ERROR: API key invalid
CRITICAL: Worker crashed
ERROR: Health check failed
```

### Performance Monitoring

**Service Metrics:**
```bash
# Service details with metrics
render service get --service domain-runner-web -o json | jq '.metrics'

# Resource usage
render service get --service domain-runner-web -o json | jq '.plan'
```

**Database Monitoring:**
```bash
# Database status
render database get --name domain-runner-db

# Connection info
render database get --name domain-runner-db -o json | jq '.connectionInfo'
```

### Alert Conditions

Set up monitoring for these conditions:

**Critical Alerts:**
- Service status: `failed`, `cancelled`, `error`
- Health endpoint returning non-200 status
- Database connection failures
- Worker service stopped unexpectedly

**Warning Alerts:**
- High response times (>5 seconds)
- Increased error rates (>5% of requests)
- LLM provider API errors
- Memory usage approaching limits

## Troubleshooting Common Issues

### Service Won't Start

**Symptoms:**
- Service status shows `failed` or `build_failed`
- Logs show startup errors

**Solutions:**
```bash
# Check deployment logs
render service logs --service domain-runner-web | head -50

# Common fixes:
# 1. Verify Dockerfile syntax
# 2. Check requirements.txt dependencies
# 3. Ensure all required files are in repository
# 4. Verify environment variables are set

# Redeploy if needed
render service deploy --service domain-runner-web
```

### Database Connection Issues

**Symptoms:**
- Health endpoint reports database errors
- API requests failing with database errors

**Solutions:**
```bash
# Check database status
render database get --name domain-runner-db

# Verify DATABASE_URL is set correctly
render service env list --service domain-runner-web | grep DATABASE_URL

# Restart services to refresh connections
render service restart --service domain-runner-web
render service restart --service domain-runner-worker
```

### LLM Provider Errors

**Symptoms:**
- Health endpoint shows providers as unavailable
- API requests failing with authentication errors

**Solutions:**
```bash
# Check environment variables
render service env list --service domain-runner-web | grep -E "API_KEY"

# Verify API keys are valid and have quota
python verify_deployment.py --url https://domain-runner-web.onrender.com

# Update invalid keys
render service env set --service domain-runner-web OPENAI_API_KEY=new-key-here
```

### High Memory Usage

**Symptoms:**
- Service restarting frequently
- Performance degradation

**Solutions:**
```bash
# Check current plan limits
render service get --service domain-runner-web -o json | jq '.plan'

# Consider upgrading plan:
# - Starter: 512MB RAM
# - Standard: 2GB RAM
# - Pro: 4GB RAM

# Optimize worker batch size
render service env set --service domain-runner-worker WORKER_BATCH_SIZE=5
```

### Worker Not Processing

**Symptoms:**
- Worker logs show no activity
- Background tasks not completing

**Solutions:**
```bash
# Check worker logs
render service logs --service domain-runner-worker --tail

# Verify worker configuration
render service env list --service domain-runner-worker | grep WORKER

# Restart worker service
render service restart --service domain-runner-worker

# Check database for pending tasks
# (requires database connection)
```

## Maintenance Procedures

### Regular Updates

**Weekly:**
- Review service logs for recurring errors
- Check health endpoint trends
- Verify all LLM providers are responding
- Monitor resource usage

**Monthly:**
- Update dependencies if needed
- Review and rotate API keys
- Check for Render platform updates
- Optimize configuration based on usage patterns

### Scaling Considerations

**When to Scale Up:**
- Consistent high CPU/memory usage (>80%)
- Response times increasing
- Health checks occasionally failing
- Queue of unprocessed tasks growing

**Scaling Options:**
```bash
# Upgrade service plan
render service update --service domain-runner-web --plan standard

# Add more worker instances (if supported)
render service update --service domain-runner-worker --plan standard
```

### Backup and Recovery

**Database Backups:**
- Render automatically creates daily backups
- Access backups via Render dashboard
- Test restore procedures periodically

**Configuration Backups:**
```bash
# Export environment variables
render service env list --service domain-runner-web -o json > env-backup.json

# Export service configuration
render service get --service domain-runner-web -o json > service-config.json
```

## Monitoring Scripts

### Automated Health Check Script

Create a monitoring script that runs every 5 minutes:

```bash
#!/bin/bash
# health_monitor.sh

URL="https://domain-runner-web.onrender.com"
SLACK_WEBHOOK="your-slack-webhook-url"  # Optional

# Check health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" "$URL/healthz")

if [ "$response" != "200" ]; then
    echo "ALERT: Health check failed with status $response at $(date)"

    # Optional: Send Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Domain Runner health check failed: HTTP $response\"}" \
            "$SLACK_WEBHOOK"
    fi
else
    echo "✅ Health check passed at $(date)"
fi
```

### Log Analysis Script

```python
# log_analyzer.py
import subprocess
import re
from collections import Counter

def analyze_logs():
    # Get recent logs
    result = subprocess.run([
        'render', 'service', 'logs', '--service', 'domain-runner-web', '--num', '1000'
    ], capture_output=True, text=True)

    logs = result.stdout

    # Count error patterns
    errors = re.findall(r'ERROR:.*', logs)
    warnings = re.findall(r'WARNING:.*', logs)

    print(f"Recent errors: {len(errors)}")
    print(f"Recent warnings: {len(warnings)}")

    # Most common errors
    error_types = Counter([e.split(':')[1].strip() if ':' in e else e for e in errors])
    print("Top errors:", error_types.most_common(5))

if __name__ == "__main__":
    analyze_logs()
```

## Emergency Procedures

### Service Down

1. **Immediate Actions:**
   ```bash
   # Check service status
   render service get --service domain-runner-web

   # Check recent logs
   render service logs --service domain-runner-web --num 50

   # Attempt restart
   render service restart --service domain-runner-web
   ```

2. **If restart fails:**
   ```bash
   # Force redeploy
   render service deploy --service domain-runner-web --clear-cache

   # Check for platform issues
   curl -s https://status.render.com/api/v2/status.json
   ```

### Database Issues

1. **Connection problems:**
   ```bash
   # Check database status
   render database get --name domain-runner-db

   # Restart dependent services
   render service restart --service domain-runner-web
   render service restart --service domain-runner-worker
   ```

2. **Performance issues:**
   - Review recent database queries in logs
   - Consider upgrading database plan
   - Check for long-running transactions

### Contact Information

- **Render Support**: https://render.com/docs/support
- **Status Page**: https://status.render.com/
- **Community**: https://community.render.com/

## Success Metrics

Track these metrics to ensure healthy deployment:

- **Uptime**: >99.5% availability
- **Response Time**: <2 seconds average
- **Error Rate**: <1% of requests
- **Health Check**: 100% success rate
- **Worker Processing**: Tasks completing within expected timeframes

Regular monitoring of these metrics will help ensure your domain-runner deployment stays healthy and performant on Render.
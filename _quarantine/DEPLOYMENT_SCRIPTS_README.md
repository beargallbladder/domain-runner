# Domain Runner Deployment Scripts

This directory contains automated deployment scripts for the Domain Runner system.

## Scripts Overview

### 1. deploy.sh - Main Deployment Script
The primary deployment orchestrator that handles the complete deployment process.

**Features:**
- Full deployment pipeline with rollback capabilities
- Automated service building for all 13+ services
- Git integration with automatic commits
- Deployment logging with timestamps
- Color-coded output for better visibility
- Optional Slack notifications
- Automatic rollback on failure

**Usage:**
```bash
./deploy.sh
```

**Environment Variables:**
- `RUN_TESTS=true` - Enable test execution before deployment (default: false)
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications (optional)

### 2. pre-deploy-checks.sh - Pre-deployment Validation
Validates system state before deployment to prevent common issues.

**Checks performed:**
- Git repository status and branch verification
- Node.js and Python environment validation
- Service directory structure verification
- Environment variable security checks
- Dependencies vulnerability scanning
- Database connectivity verification
- Render.yaml configuration validation
- Disk space availability

**Usage:**
```bash
./pre-deploy-checks.sh
```

### 3. post-deploy-verify.sh - Post-deployment Verification
Verifies all services are running correctly after deployment.

**Verifications:**
- Health endpoint checks for all services
- Response time monitoring
- Database connectivity testing
- Critical API endpoint validation
- Inter-service communication checks
- Deployment success metrics

**Usage:**
```bash
./post-deploy-verify.sh
```

## Deployment Process

The complete deployment flow:

1. **Pre-deployment Phase**
   - Run pre-deployment checks
   - Create rollback point
   - Validate environment

2. **Build Phase**
   - Clean npm cache
   - Install dependencies
   - Build TypeScript services
   - Prepare Python services

3. **Deploy Phase**
   - Commit changes
   - Push to GitHub
   - Trigger Render deployment
   - Wait for stabilization

4. **Verification Phase**
   - Check service health
   - Validate endpoints
   - Generate report

5. **Rollback (if needed)**
   - Automatic rollback on failure
   - Restore to last stable commit
   - Notification of rollback

## Service List

The scripts handle deployment for:

**Node.js Services:**
- domain-processor-v2
- sophisticated-runner
- seo-metrics-runner
- cohort-intelligence
- industry-intelligence
- news-correlation-service
- swarm-intelligence
- memory-oracle
- weekly-scheduler
- visceral-intelligence
- reality-validator
- predictive-analytics
- database-manager

**Python Services:**
- public-api
- embedding-engine

## Logging

All deployment activities are logged to:
- `deployment_logs/deployment_YYYYMMDD_HHMMSS.log`
- `deployment_logs/verify_YYYYMMDD_HHMMSS.log`
- `deployment_logs/last_stable_deployment.txt` (rollback point)

## Rollback Process

If deployment fails:
1. Script automatically initiates rollback
2. Restores to last stable commit
3. Provides manual instructions for:
   - Force pushing rollback
   - Triggering Render redeploy
   - Verifying service health

## Best Practices

1. Always run pre-deployment checks first
2. Ensure you're on the main branch
3. Commit or stash local changes
4. Monitor Render dashboard during deployment
5. Check logs if issues occur
6. Keep deployment logs for audit trail

## Troubleshooting

**Pre-deployment check failures:**
- Fix any reported errors before proceeding
- Warnings can be reviewed but won't block deployment

**Build failures:**
- Check npm/node versions
- Clear npm cache: `npm cache clean --force`
- Verify dependencies in package.json

**Deployment failures:**
- Check Render dashboard for detailed logs
- Verify API keys are set in Render
- Ensure database is accessible

**Post-deployment failures:**
- Allow time for services to start (60s+)
- Check individual service logs in Render
- Verify health endpoints are implemented

## Quick Deployment

For a standard deployment:
```bash
# Full deployment with all checks
./deploy.sh

# Skip tests for faster deployment
RUN_TESTS=false ./deploy.sh

# Just run checks
./pre-deploy-checks.sh

# Just verify deployment
./post-deploy-verify.sh
```

## Notes

- The scripts use bash and require Unix-like environment
- Designed for Render.com deployment platform
- Assumes git repository with main branch
- Requires proper environment variables in Render
# Production Infrastructure Guide

## Overview

This directory contains all production-grade infrastructure components for the Domain Runner AI Brand Intelligence System. The infrastructure is designed to be:

- **Resilient**: Circuit breakers, retry logic, and failover mechanisms
- **Observable**: Comprehensive monitoring and alerting
- **Scalable**: Handles 3,200+ domains with 26+ LLM models
- **Zero-downtime**: Blue-green deployments with health checks

## Components

### 1. Production Configuration (`production-config.ts`)
Centralized configuration for all services, LLM providers, and system settings.

**Key Features:**
- Service-specific resource limits and retry policies
- LLM provider rate limits and API key management
- Database connection pooling configuration
- Feature flags for gradual rollouts

### 2. Health Check System (`health-check-system.ts`)
Real-time health monitoring for all services and dependencies.

**Monitors:**
- Service endpoints (HTTP health checks)
- Database connectivity and query performance
- LLM provider availability
- System resource usage

**Usage:**
```typescript
const healthSystem = createHealthCheckSystem(pool);
healthSystem.startMonitoring();
```

### 3. Error Recovery System (`error-recovery-system.ts`)
Implements resilience patterns for production reliability.

**Features:**
- Circuit breakers with configurable thresholds
- Exponential backoff retry logic
- Automatic recovery strategies
- Error tracking and alerting

**Usage:**
```typescript
const result = await errorRecoverySystem.executeWithFullProtection(
  'service-name',
  async () => await riskyOperation(),
  { timeout: 30000 }
);
```

### 4. Monitoring Dashboard (`monitoring-dashboard.ts`)
Real-time observability dashboard with metrics and alerts.

**Endpoints:**
- `/dashboard` - Main dashboard with all metrics
- `/metrics/stream` - Real-time metrics stream (SSE)
- `/metrics/service/:name` - Service-specific metrics
- `/alerts` - Active alerts management

**Start Dashboard:**
```bash
npm run monitoring:start
```

### 5. Deployment Script (`deploy-production.sh`)
Zero-downtime deployment with comprehensive checks.

**Features:**
- Pre-deployment validation
- Health check verification
- Automatic rollback on failure
- Slack/PagerDuty notifications

**Usage:**
```bash
./infrastructure/deploy-production.sh
```

## Deployment Process

### Prerequisites
1. Node.js 18+ installed
2. All environment variables set
3. Database migrations up to date
4. All tests passing

### Deployment Steps
1. **Pre-deployment Checks**
   - Environment validation
   - Test suite execution
   - Database connectivity

2. **Build Phase**
   - TypeScript compilation
   - Dependency installation
   - Asset optimization

3. **Deployment**
   - Tag current version
   - Deploy to Render
   - Health check validation

4. **Post-deployment**
   - Smoke tests
   - Performance verification
   - Alert configuration

### Rollback Process
If deployment fails:
1. Automatic rollback triggered
2. Previous version restored
3. Alerts sent to operations team
4. Incident report generated

## Monitoring & Alerts

### Key Metrics
- **Service Health**: Uptime, latency, error rates
- **LLM Usage**: Token consumption, API limits
- **Database**: Connection pool, query performance
- **System**: CPU, memory, disk usage

### Alert Thresholds
- Error rate > 5%
- P99 latency > 5000ms
- CPU usage > 80%
- Memory usage > 85%

### Alert Channels
- Slack webhooks
- PagerDuty integration
- Email notifications
- Dashboard UI alerts

## Testing

### Production Readiness Test
Run comprehensive tests before deployment:
```bash
./test-production-ready.sh
```

### Load Testing
Verify system can handle expected load:
```bash
npm run test:load
```

### Smoke Tests
Quick validation after deployment:
```bash
npm run test:smoke:production
```

## CI/CD Pipeline

GitHub Actions workflow handles:
1. Code quality checks
2. Security scanning
3. Unit/integration tests
4. Load testing
5. Staging deployment
6. Production deployment
7. Post-deployment verification

## Security

### API Key Management
- Rotate keys every 30 days
- Store in environment variables
- Never commit to repository
- Use multiple keys per provider

### Database Security
- SSL connections required
- Connection pooling limits
- Prepared statement usage
- Regular backups

## Troubleshooting

### Common Issues

1. **Circuit Breaker Open**
   - Check service logs
   - Verify external dependencies
   - Manual reset if needed

2. **High Error Rate**
   - Check monitoring dashboard
   - Review recent deployments
   - Scale resources if needed

3. **Database Connection Issues**
   - Verify connection string
   - Check pool configuration
   - Review pg_stat_activity

### Debug Commands
```bash
# Check service health
curl https://sophisticated-runner.onrender.com/health

# View logs
render logs --service sophisticated-runner --tail

# Database diagnostics
npm run db:diagnostics

# System metrics
npm run metrics:collect
```

## Best Practices

1. **Always run tests before deployment**
2. **Monitor dashboards during deployment**
3. **Have rollback plan ready**
4. **Document any manual changes**
5. **Keep dependencies updated**
6. **Review security advisories**

## Emergency Procedures

### Service Outage
1. Check monitoring dashboard
2. Review error logs
3. Initiate failover if needed
4. Notify stakeholders

### Database Issues
1. Check connection pool
2. Review slow query log
3. Scale resources if needed
4. Restore from backup if critical

### LLM Provider Failure
1. Circuit breaker will activate
2. Fallback to other providers
3. Monitor rate limits
4. Contact provider support

## Contact

For production issues:
- Slack: #domain-runner-ops
- Email: ops@domain-runner.com
- PagerDuty: Use escalation policy

## Version History

- v2.1.1 - Current production version
- v2.1.0 - Added volatility swarm
- v2.0.0 - Migrated to Node.js
- v1.0.0 - Initial release
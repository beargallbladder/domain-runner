# Production Deployment Checklist

## Pre-Deployment Verification ✓

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] ESLint passes with no warnings
- [ ] No TODO comments in critical paths
- [ ] Code coverage > 80%

### Testing
- [ ] Unit tests passing (100%)
- [ ] Integration tests passing
- [ ] Load tests confirm 1000+ domains/hour capability
- [ ] Security audit shows no high vulnerabilities

### Infrastructure
- [ ] Production config validated
- [ ] Health check endpoints implemented for all services
- [ ] Circuit breakers configured for external dependencies
- [ ] Monitoring dashboard accessible

### Database
- [ ] Migrations up to date
- [ ] Backup strategy implemented
- [ ] Connection pooling optimized
- [ ] Indexes created for performance

### Security
- [ ] All API keys in environment variables
- [ ] No secrets in codebase
- [ ] SSL/TLS enabled
- [ ] Rate limiting configured

## Deployment Steps ✓

### 1. Pre-flight Checks
```bash
# Run production readiness test
./test-production-ready.sh

# Verify all services build
npm run build:all

# Check database health
npm run db:health
```

### 2. Backup Current State
```bash
# Tag current production
git tag -a "backup-$(date +%Y%m%d-%H%M%S)" -m "Pre-deployment backup"

# Backup database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
```

### 3. Deploy Services
```bash
# Run deployment script
./infrastructure/deploy-production.sh

# Or deploy individually:
cd services/sophisticated-runner && npm run deploy
cd services/domain-runner && npm run deploy
# ... repeat for each service
```

### 4. Verify Deployment
```bash
# Check health endpoints
curl https://sophisticated-runner.onrender.com/health
curl https://domain-runner.onrender.com/health
curl https://llmrank.io/health

# Run smoke tests
npm run test:smoke:production

# Monitor dashboard
open http://monitoring.domain-runner.com/dashboard
```

## Post-Deployment Monitoring ✓

### First Hour
- [ ] Monitor error rates < 5%
- [ ] Check P99 latency < 5s
- [ ] Verify all circuit breakers closed
- [ ] Confirm no memory leaks

### First 24 Hours
- [ ] Review performance metrics
- [ ] Check LLM token usage
- [ ] Verify database performance
- [ ] Monitor user feedback

### First Week
- [ ] Analyze usage patterns
- [ ] Review cost metrics
- [ ] Plan optimizations
- [ ] Document lessons learned

## Rollback Procedure ✓

If issues detected:

1. **Immediate Rollback**
```bash
# Use deployment script rollback
./infrastructure/deploy-production.sh --rollback

# Or manual rollback
git checkout [previous-tag]
npm run deploy:emergency
```

2. **Database Rollback**
```bash
# Restore from backup
psql $DATABASE_URL < backup-[timestamp].sql
```

3. **Notify Team**
- Send alert to Slack
- Create incident report
- Schedule post-mortem

## Service-Specific Checks ✓

### sophisticated-runner
- [ ] Volatility swarm active (26+ models)
- [ ] Tensor processing operational
- [ ] Clean index running
- [ ] All LLM providers connected

### domain-runner
- [ ] 11 LLM providers configured
- [ ] Parallel processing enabled
- [ ] Health endpoint responsive
- [ ] Database connections stable

### llmrank-api
- [ ] Public API accessible
- [ ] Stats endpoint working
- [ ] 3,235 domains tracked
- [ ] Response times < 500ms

## Critical Metrics to Monitor ✓

### Performance
- Domain processing rate: **1000+/hour**
- API response time: **< 500ms**
- Database query time: **< 100ms**
- Memory usage: **< 85%**

### Reliability
- Uptime target: **99.9%**
- Error rate: **< 1%**
- Circuit breaker trips: **< 5/day**
- Failed API calls: **< 0.1%**

### Business Metrics
- Domains processed: **3,239**
- Active LLM models: **26+**
- SEO opportunities detected: **Track daily**
- Volatility alerts: **Monitor hourly**

## Emergency Contacts ✓

### On-Call Rotation
- Primary: [Name] - [Phone]
- Secondary: [Name] - [Phone]
- Escalation: [Manager] - [Phone]

### External Support
- Render Support: support@render.com
- Database Admin: [Contact]
- Security Team: [Contact]

## Final Checks ✓

- [ ] All items above completed
- [ ] Team notified of deployment
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Celebration planned! 🎉

---

**Deployment Approved By:** _________________ **Date:** _________________

**Notes:**
_Use this section for any deployment-specific notes or issues encountered_
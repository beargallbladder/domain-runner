# QUEEN-CHARTER Quick Reference Guide

## System Overview
The QUEEN-CHARTER deployment has successfully deployed an 8-agent hive coordination system monitoring your production API at domain-runner.onrender.com serving 3,249 domains with 35 AI providers.

## Quick Commands

### Start 8-Agent Monitoring System
```bash
cd /Users/samkim/domain-runner
node hive/deployment-watchdog-execution.js
```

### Check Real-Time Logs
```bash
tail -f hive-coordination.log
```

### Manual API Health Check
```bash
curl -s https://domain-runner.onrender.com/health
```

### Check API Stats (with authentication)
```bash
curl -s -H "x-api-key: llmpagerank-2025-neural-gateway" \
  "https://domain-runner.onrender.com/api/stats/rich"
```

### Test All Endpoints
```bash
# Health (no auth)
curl -s https://domain-runner.onrender.com/health

# Rich Stats (requires auth)
curl -s -H "x-api-key: llmpagerank-2025-neural-gateway" \
  "https://domain-runner.onrender.com/api/stats/rich"

# Rankings (requires auth)
curl -s -H "x-api-key: llmpagerank-2025-neural-gateway" \
  "https://domain-runner.onrender.com/api/rankings/rich"
```

## 8-Agent Status

| Agent | Role | Status | Action Required |
|-------|------|--------|-----------------|
| Agent 1 | System Health Monitor | ✅ ACTIVE | None |
| Agent 2 | Data Integrity Validator | ✅ ACTIVE | None |
| Agent 3 | API Endpoint Guardian | ✅ ACTIVE | None |
| Agent 4 | Render Deployment Watcher | ✅ ACTIVE | None |
| Agent 5 | DNS & Domain Coordinator | 🟠 PENDING | Configure DNS |
| Agent 6 | Provider Fleet Analyzer | ✅ ACTIVE | None |
| Agent 7 | Performance Optimization Engine | ✅ ACTIVE | None |
| Agent 8 | Strategic Intelligence Coordinator | ✅ ACTIVE | None |

## Current System Metrics

- **Domain Count**: 3,249 ✅
- **Provider Count**: 35 ✅
- **Response Time**: ~360ms (EXCELLENT) ✅
- **Health Status**: HEALTHY ✅
- **Database**: CONNECTED ✅

## Immediate Action Required

### DNS Configuration for llmrank.io
```
Record Type: CNAME
Name: llmrank.io (or @)
Value: domain-runner.onrender.com
```

## Key Files Created

1. **`QUEEN-CHARTER.md`** - Master coordination document
2. **`hive/templates/deployment-watchdog.md`** - Template framework
3. **`hive/deployment-watchdog-execution.js`** - Active monitoring system
4. **`hive-coordination.log`** - Real-time system logs
5. **`QUEEN-CHARTER-DEPLOYMENT-REPORT.md`** - Complete deployment report

## Alert Thresholds

- **Response Time > 2000ms**: WARNING
- **Response Time > 5000ms**: CRITICAL  
- **Health Check Failure**: IMMEDIATE ALERT
- **Database Disconnect**: CRITICAL
- **API Endpoint Failure**: HIGH PRIORITY

## Emergency Commands

### Stop All Monitoring
```bash
pkill -f "deployment-watchdog-execution"
```

### Check Process Status
```bash
ps aux | grep "deployment-watchdog"
```

### View Recent Alerts
```bash
grep -E "(WARNING|ERROR|CRITICAL)" hive-coordination.log | tail -10
```

## Production API Information

- **Base URL**: https://domain-runner.onrender.com
- **Service ID**: srv-d1lfb8ur433s73dm0pi0
- **API Keys**: 
  - `llmpagerank-2025-neural-gateway`
  - `brandsentiment-premium-2025`

## Success Criteria ✅

- [x] 8-agent system deployed and operational
- [x] API health monitoring active (every 30s)
- [x] Data validation passing (3,249 domains, 35 providers)
- [x] Performance monitoring excellent (<500ms)
- [x] All endpoints operational with authentication
- [x] Provider fleet analysis complete
- [x] Strategic intelligence coordinating
- [ ] DNS configuration for llmrank.io (PENDING)

## Next Steps

1. **Configure DNS** for llmrank.io domain
2. **Monitor system** for 24-48 hours to establish baselines
3. **Implement dashboard** for visual monitoring
4. **Scale testing** under production load

---

The QUEEN-CHARTER hive coordination system is now providing comprehensive monitoring and validation of your production deployment with 8 specialized agents ensuring optimal performance and system health.
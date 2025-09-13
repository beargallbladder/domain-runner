# Real-time Domain Processing Monitor

## 🎯 MISSION CRITICAL
Monitor the processing of 3,183 pending domains with LLM APIs to generate brand intelligence data in real-time.

## 🚀 MONITORING TOOLS

### 1. Quick Status Check
```bash
./quick-check.sh
```
- Instant health check of service and processing endpoint
- Basic connectivity test
- Quick mission status overview

### 2. Real-time Dashboard
```bash
./start-dashboard.sh
```
- Live updating dashboard (updates every 30 seconds)
- Service health monitoring
- Processing endpoint testing
- Performance metrics
- Alert detection
- Continuous logging

### 3. Automated Monitor with Auto-Fix
```bash
./auto-monitor.sh
```
- Continuous monitoring with automatic issue detection
- Auto-fixes for common problems
- Emergency response system
- Detailed logging
- Runs indefinitely until all domains processed

### 4. Emergency Response System
```bash
npx ts-node emergency-response.ts [command]
```
Commands:
- `diagnose` - Full system diagnostics with auto-fix
- `report` - Generate detailed system status report
- `reset-stuck` - Reset domains stuck in processing state
- `boost` - Trigger multiple processing batches

## 📊 MONITORING TARGETS

- **Processing Rate**: 1000+ domains/hour
- **API Success Rate**: 95%+ for all LLM providers
- **Service Uptime**: 99%+ availability
- **Response Time**: <30s for processing endpoint

## 🚨 ALERT CONDITIONS

### Critical Alerts (Immediate Action Required)
- Service unreachable
- Processing endpoint failing
- Database connection errors
- Processing rate <50 domains/hour

### Warning Alerts (Monitor Closely)
- Processing rate 50-999 domains/hour
- API success rate 90-94%
- Slow response times >25s
- Domains stuck in processing >15 minutes

## 🛠️ AUTOMATED FIXES

The monitoring system can automatically:
1. **Reset Stuck Domains** - Domains stuck in processing state
2. **Trigger Processing Batches** - When processing rate is low
3. **Service Health Checks** - Verify service availability
4. **Database Recovery** - Retry database connections

## 📈 REAL-TIME METRICS

- Total domains remaining
- Processing rate (domains/hour)
- Estimated completion time
- Service health status
- API response times
- Error counts and patterns

## 🔍 MONITORING ARCHITECTURE

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Quick Check   │    │  Real-time       │    │   Auto Monitor  │
│   (Instant)     │    │  Dashboard       │    │   (Continuous)  │
│                 │    │  (30s updates)   │    │   (100s cycles) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │  Emergency       │
                    │  Response        │
                    │  System          │
                    └──────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Service       │    │   Database       │    │   Processing    │
│   Health        │    │   Monitoring     │    │   Endpoint      │
│   Check         │    │                  │    │   Testing       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 QUICK START

1. **Start Basic Monitoring**:
   ```bash
   cd /Users/samkim/domain-runner/monitoring
   ./quick-check.sh
   ```

2. **Launch Real-time Dashboard**:
   ```bash
   ./start-dashboard.sh
   ```

3. **Run Continuous Auto-Monitor**:
   ```bash
   ./auto-monitor.sh
   ```

## 📝 LOG FILES

All monitoring activities are logged to:
- `/Users/samkim/domain-runner/monitoring/logs/`
- Real-time logs: `realtime-YYYYMMDD-HHMMSS.log`
- Emergency logs: `emergency-YYYYMMDD-HHMMSS.log`
- Monitor logs: Auto-generated with timestamps

## 🎯 SUCCESS CRITERIA

✅ All 3,183 domains processed with real LLM responses  
✅ Data stored in domain_responses table  
✅ Domains marked as completed  
✅ Processing rate maintained above 1000 domains/hour  
✅ API success rate above 95%  
✅ Zero data loss or corruption  

## 🔧 TROUBLESHOOTING

### Service Unreachable
```bash
# Check service status
curl -s https://sophisticated-runner.onrender.com/health

# Trigger processing to wake up service
curl -X POST https://sophisticated-runner.onrender.com/process-pending-domains
```

### Low Processing Rate
```bash
# Run emergency boost
npx ts-node emergency-response.ts boost

# Reset stuck domains
npx ts-node emergency-response.ts reset-stuck
```

### Database Issues
```bash
# Run full diagnostics
npx ts-node emergency-response.ts diagnose

# Generate status report
npx ts-node emergency-response.ts report
```
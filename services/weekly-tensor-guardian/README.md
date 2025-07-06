# 🛡️ Weekly Tensor Guardian

**Mission-Critical AI Memory Data Protection System**

The Weekly Tensor Guardian is your bulletproof solution for consistent, reliable AI brand memory data collection. It prevents the infrastructure failures that were causing 99.4% data drops and ensures temporal decay analysis integrity.

## 🎯 Core Mission

**Protect the data that is your reason for existing.**

- **Weekly Full Crawls**: Scheduled crawl of ALL domains with ALL 8 AI models
- **Infrastructure Monitoring**: Real-time health checks and failure detection
- **Anomaly Detection**: Distinguish system failures from true memory decay
- **Automatic Recovery**: Self-healing from common failure modes

## 🏗️ Architecture

```
📅 SCHEDULER (Central Control)
├── 🔍 Health Checker (Pre-flight validation)
├── 🗓️ Weekly Crawler (Mission-critical data collection)
├── 🚨 Anomaly Detector (Failure vs decay classification)
└── 📢 Notification System (Alerts and reporting)
```

## 📋 Schedule

| Component | Frequency | Purpose |
|-----------|-----------|---------|
| **Weekly Crawl** | Sundays 2 AM UTC | Full domain/model matrix collection |
| **Daily Health Check** | 6 AM UTC | System validation |
| **Anomaly Detection** | Hourly | Data quality monitoring |
| **Emergency Check** | Every 15 min | Critical failure detection |

## 🚀 Quick Start

### 1. Installation
```bash
cd services/weekly-tensor-guardian
npm install
npm run build
```

### 2. Configuration
```bash
export DATABASE_URL="your_postgresql_connection_string"
export NODE_ENV="production"
```

### 3. Start Guardian
```bash
# Start the scheduler (runs continuously)
npm start

# Or run individual components
npm run health-check
npm run weekly-crawl
npm run anomaly-detect
```

## 🔧 Components

### 🔍 Health Checker (`health-checker.ts`)
**Pre-flight validation before crawls**

- Database connectivity
- Recent response volume (>1000 in 7 days)
- AI model coverage (≥6 active models)
- Domain coverage (≥100 domains)
- Response quality (≥500 char average)
- Infrastructure endpoints
- Rate limit status

**Usage:**
```bash
npm run health-check
# Exit code 0 = healthy, 1 = failed
```

### 🗓️ Weekly Crawler (`weekly-crawler.ts`)
**Mission-critical weekly data collection**

- Pre-flight health validation
- Reset all domains to pending
- Process in batches of 100 domains
- Require 8/8 model responses per domain
- Automatic retry with exponential backoff
- Progress tracking and completion validation

**Usage:**
```bash
npm run weekly-crawl
# Processes ALL domains with ALL models
```

### 🚨 Anomaly Detector (`anomaly-detector.ts`)
**Distinguish infrastructure failures from memory decay**

- Volume drop detection (z-score analysis)
- Model failure identification
- Response quality degradation
- Coverage gap analysis
- Classification: `system_failure` vs `memory_decay`

**Usage:**
```bash
npm run anomaly-detect
# Generates anomaly report with recommendations
```

### ⏰ Scheduler (`scheduler.ts`)
**Orchestrates all components on schedule**

- Cron-based scheduling
- Graceful error handling
- Notification system
- Emergency monitoring

## 📊 Data Quality Safeguards

### ✅ Quality Gates
- **95% completion rate** required for successful crawl
- **8/8 AI model coverage** mandatory
- **Batch retry logic** for failed processing
- **Real-time progress tracking**

### 🚨 Failure Detection
- **Volume drops >50%** = Critical alert
- **Model count <6** = Warning
- **Response quality drops >30%** = Investigation
- **Coverage gaps >7 days** = System failure

### 🏥 Recovery Actions
- Automatic retry of failed batches
- AI provider connection restart
- Domain queue rehydration
- Backup processing nodes

## 📈 Monitoring & Alerts

### 🎯 System Health Levels
- **HEALTHY**: All systems operational
- **DEGRADED**: Minor issues detected
- **CRITICAL**: Immediate intervention required

### 📢 Notification Types
- **SUCCESS**: Weekly crawl completed (≥95%)
- **WARNING**: Health check issues
- **ERROR**: Component failures
- **CRITICAL**: System-wide failures

## 🔒 Data Integrity

### 📅 Temporal Analysis Protection
- **Flag unreliable periods** during infrastructure failures
- **Separate clean vs questionable** datasets
- **Metadata tagging** for drift source classification
- **Week-to-week consistency** validation

### 🧠 Memory vs System Classification
```typescript
interface Anomaly {
  classification: 'system_failure' | 'memory_decay' | 'mixed' | 'unknown';
  // Enables proper temporal decay analysis
}
```

## 🛠️ Troubleshooting

### Common Issues

**Health Check Fails**
```bash
# Check database connectivity
npm run health-check

# Review logs
tail -f logs/health-check.log
```

**Weekly Crawl Incomplete**
```bash
# Check anomaly report
npm run anomaly-detect

# Review crawl logs
tail -f logs/weekly-crawl.log
```

**High Failure Rate**
```bash
# Check AI provider status
curl https://sophisticated-runner.onrender.com/health

# Validate API keys and rate limits
```

### Log Files
- `logs/scheduler.log` - Main scheduler activity
- `logs/health-check.log` - System health validation
- `logs/weekly-crawl.log` - Crawl execution details
- `logs/anomaly-detection.log` - Data quality analysis

## 🎯 Success Metrics

### Weekly Crawl Success
- **≥95% domain completion rate**
- **8/8 AI model coverage**
- **<5% failed responses**
- **Consistent response quality**

### System Reliability
- **<1% infrastructure downtime**
- **Zero data loss incidents**
- **<24h failure recovery time**
- **Proactive issue detection**

## 🚀 Production Deployment

### Environment Variables
```bash
DATABASE_URL=postgresql://...
NODE_ENV=production
LOG_LEVEL=info
NOTIFICATION_EMAIL=your@email.com
SLACK_WEBHOOK_URL=https://...
```

### Process Management
```bash
# Using PM2 for production
pm2 start dist/scheduler.js --name tensor-guardian
pm2 save
pm2 startup
```

### Monitoring
```bash
# Check status
pm2 status tensor-guardian

# View logs
pm2 logs tensor-guardian

# Restart if needed
pm2 restart tensor-guardian
```

## 🎉 Expected Results

With the Weekly Tensor Guardian active, you should see:

1. **Consistent weekly data collection** - No more 99.4% drops
2. **Reliable temporal analysis** - Clean week-to-week comparisons
3. **Proactive failure detection** - Issues caught before data loss
4. **Automated recovery** - Self-healing from common failures
5. **Data quality confidence** - Know when data is reliable

## 📞 Support

The Weekly Tensor Guardian is designed to be your **data lifeline**. It ensures that your AI brand intelligence system maintains the consistent, high-quality data collection necessary for meaningful temporal decay analysis.

**Your data is your reason for existing - this system protects it.** 
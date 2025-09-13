# Quick Reference Guide - AI Brand Intelligence Data Collection

## 🚀 Starting a New Data Collection Run

### 1. Reset All Domains to Pending
```bash
node trigger_full_crawl.js
# Sets ~3,000+ domains to 'pending' status
```

### 2. Trigger Processing Batches
```bash
curl -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
  -H "Content-Type: application/json"
# Processes 5 domains per batch with real LLM calls
```

### 3. Monitor Progress
```javascript
// Check status distribution
SELECT status, COUNT(*) FROM domains GROUP BY status;

// Check recent responses
SELECT COUNT(*) FROM domain_responses WHERE created_at > NOW() - INTERVAL '1 hour';
```

## 📊 Data Quality Verification

### Quick Status Check
```bash
export DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Check response count
node -e "
const { Pool } = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}});
pool.query('SELECT COUNT(*) FROM domain_responses').then(r => {
  console.log('Total responses:', r.rows[0].count);
  pool.end();
});
"
```

### Detailed Verification
```bash
# Run comprehensive check (create script when needed)
node verify_data_quality.js
```

## 🔧 System Health Checks

### Service Status
```bash
curl "https://sophisticated-runner.onrender.com/health"
# Should return: {"status":"healthy","service":"sophisticated-runner"}
```

### Database Connection
```bash
# Test database connectivity
curl -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
  -H "Content-Type: application/json" --max-time 5
# Timeout = working, immediate response = check logs
```

## 🐛 Common Issues & Solutions

### "No pending domains found"
```bash
# Solution: Reset domains to pending
node trigger_full_crawl.js
```

### "Invalid input syntax for type UUID"
```bash
# Check if domain_responses.domain_id is UUID type
# Solution documented in DOMAIN_PROCESSING_ARCHITECTURE.md
```

### Processing appears stuck
```bash
# Check Render logs via SSH
# Look for error messages or API rate limiting
```

## 📈 Performance Metrics

### Current Baseline (2025-06-29)
- **Processing Rate**: 35 domains/day
- **Batch Size**: 5 domains per request
- **Success Rate**: 99.78% (7 errors out of 3190)
- **Response Quality**: 1955 avg chars per response
- **Models Active**: gpt-4o-mini, gpt-3.5-turbo
- **Prompt Types**: business_analysis, content_strategy, technical_assessment

### Scaling Calculations
- **Full Portfolio**: ~3,000 domains
- **Estimated Time**: 83 days at current rate
- **API Calls**: 18,000 total (3000 domains × 2 models × 3 prompts)

## 🔑 Critical Environment Variables

### Render Service: sophisticated-runner
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Valid OpenAI API key
- `NODE_ENV`: production

### Verify API Keys
```bash
# Check if API key is working
curl "https://api.openai.com/v1/models" \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## 📁 Key Files & Locations

### Processing Logic
- `services/sophisticated-runner/src/index.ts` - Main processing service
- `/process-pending-domains` endpoint - Real LLM processing
- `processRealDomain()` function - Core domain analysis

### Database Schema
- `domains` table - UUID primary key, status field
- `domain_responses` table - UUID foreign key to domains

### Documentation
- `DOMAIN_PROCESSING_ARCHITECTURE.md` - Complete system documentation
- `CODE_QUALITY_ASSESSMENT.md` - Architecture and quality analysis
- `QUICK_REFERENCE.md` - This file

## 🚨 Emergency Procedures

### Stop Processing
```bash
# No built-in stop - processing will complete current batch
# Set domains to 'completed' status to prevent further processing
```

### Reset Failed Domains
```bash
# Reset error domains to pending
UPDATE domains SET status = 'pending' WHERE status = 'error';
```

### Clear All Responses (Nuclear Option)
```bash
# WARNING: This deletes all collected data
DELETE FROM domain_responses;
UPDATE domains SET status = 'pending';
```

## 📞 System Endpoints

- **Health**: `GET /health`
- **Real Processing**: `POST /process-pending-domains`
- **Cache Fix**: `GET /emergency-fix-scores`
- **Cache Regen**: `GET /trigger-cache-regen`

---

**Last Updated**: 2025-06-29  
**System Status**: ✅ OPERATIONAL  
**Next Review**: Monitor processing progress and expand model coverage 
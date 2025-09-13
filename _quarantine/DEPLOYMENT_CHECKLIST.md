# Production Deployment Checklist

## Pre-Deployment Requirements

### ✅ Code Quality & Security
- [x] All Python modules reviewed and secured
- [x] SQL schema validated for PostgreSQL compatibility
- [x] All hardcoded credentials removed
- [x] Environment variables implemented
- [x] SQL injection vulnerabilities fixed
- [x] Memory leak issues resolved
- [x] API backward compatibility maintained

### ⚠️ Critical Actions Before Deployment

1. **ROTATE ALL CREDENTIALS IMMEDIATELY**
   - Database password (exposed in code)
   - OpenAI API key (exposed in code)
   - Deepseek API key (exposed in code)  
   - Mistral API key (exposed in code)

2. **Environment Setup**
   ```bash
   # Production environment variables required:
   DATABASE_URL=<new_secure_connection_string>
   OPENAI_API_KEY=<new_api_key>
   DEEPSEEK_API_KEY=<new_api_key>
   MISTRAL_API_KEY=<new_api_key>
   ANTHROPIC_API_KEY=<your_key>
   COHERE_API_KEY=<your_key>
   PERPLEXITY_API_KEY=<your_key>
   XAI_API_KEY=<your_key>
   NODE_ENV=production
   ```

3. **Database Schema Updates**
   ```bash
   # Run schema evolution (non-destructive)
   psql $DATABASE_URL < schema_evolution_manager.sql
   ```

## Deployment Steps

### 1. Prepare Codebase
```bash
# Install dependencies
npm install --production
pip install -r requirements.txt

# Build assets
npm run build
```

### 2. Deploy Services

#### Sophisticated Runner Service
```bash
cd services/sophisticated-runner
npm run build
git add .
git commit -m "Deploy secured arbitrage system with QA fixes"
git push origin main
```

#### Python Services
```bash
# Ensure Python environment
python3 -m venv venv
source venv/bin/activate
pip install psycopg2-binary pandas numpy scikit-learn scipy

# Test arbitrage detection
python3 arbitrage_detection_system.py

# Test category grading
python3 llm_category_grading_system.py
```

### 3. Start Background Services
```bash
# Start arbitrage swarm orchestrator
node arbitrage_swarm_orchestrator.js &

# Start category routing service
node category_routing_orchestrator.js &
```

### 4. Verify Deployment
```bash
# Check service health
curl https://sophisticated-runner.onrender.com/health

# Test arbitrage endpoint
curl https://sophisticated-runner.onrender.com/arbitrage-status

# Monitor logs
tail -f logs/arbitrage.log
```

## Post-Deployment Monitoring

### Key Metrics to Track
- Arbitrage opportunities found per hour
- Memory velocity changes detected
- Model consensus divergences
- API response times
- Error rates by endpoint

### Alert Thresholds
- Database connection failures > 5/minute
- API errors > 10% of requests
- Memory usage > 80% of allocated
- Response time > 2 seconds

## Rollback Plan

If issues occur:
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Restore database if needed
psql $DATABASE_URL < backups/pre_deployment_backup.sql
```

## Customer Communication

### API Changes (All Backward Compatible)
- New endpoints added:
  - `/arbitrage-opportunities` - Get current arbitrage data
  - `/category-grades` - Get LLM performance by category
  - `/memory-velocity` - Get domain update speeds
  
- Existing endpoints unchanged
- No breaking changes
- Authentication can be added in future without breaking current integrations

## Security Notes

1. **All exposed credentials have been removed from code**
2. **Database now requires environment variable**
3. **API keys now require environment variables**
4. **SQL injection vulnerabilities fixed**
5. **Memory leaks prevented with cache limits**

## Success Criteria

- [ ] All services deployed and running
- [ ] No errors in first 30 minutes
- [ ] Arbitrage detection producing results
- [ ] Category routing functioning
- [ ] Database queries performant (<100ms)
- [ ] All credentials rotated
- [ ] Monitoring active

## Contact for Issues

- Engineering Team: [Your contact]
- Database Admin: [Your contact]
- Security Team: [Your contact]

---

**CRITICAL REMINDER**: Do not deploy until all credentials are rotated!
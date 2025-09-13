# Domain Runner - Comprehensive System Analysis Report

## Executive Summary

After 2 months of struggling with weekly crawls, this analysis reveals that the domain-runner system is a sophisticated **AI Brand Intelligence Platform** that uses multiple LLMs to build three key tensors for tracking brand perception and market dynamics. While the system has collected 128,983 responses from 3,239 domains, it faces critical issues with incomplete LLM coverage, lack of automated scheduling, and broken tensor computation pipelines.

## System Overview

### Core Concept: "We measure the shadows (LLM memory) so you can shape the light (public sentiment)"

The system operates on the principle that LLM responses about brands reflect collective human knowledge and perception. By tracking how different LLMs "remember" and describe brands over time, the system can detect:
- Memory decay (brands losing mindshare)
- Drift in perception (sentiment changes)
- Consensus patterns (cross-LLM agreement)
- Market movements (competitive dynamics)

## The Three Tensors

### 1. **SentimentTensor[Brand × Source × Sentiment × Time]**
- Tracks sentiment evolution across different sources
- Measures public perception drift
- Currently: NOT BEING COMPUTED (no sentiment analysis in collected data)

### 2. **GroundingTensor[Brand × Category × SignalType × Time]**
- Categorizes brands by industry/sector
- Tracks signal strength over time
- Currently: PARTIALLY IMPLEMENTED (categories exist but signals not extracted)

### 3. **MemoryTensor[Brand × LLM × MemoryScore × Time]**
- Core innovation of the system
- Tracks how well each LLM "remembers" each brand
- Memory decay over time indicates brand salience
- Currently: NOT BEING COMPUTED (memory-oracle service not deployed)

## Database Analysis

### Current State (as of 2025-07-26):
- **Total responses**: 128,983
- **Unique domains**: 3,239
- **Unique models**: 25 (but many are duplicates with different naming)
- **Date range**: 2025-06-29 to 2025-07-24
- **Status**: NO ACTIVITY IN LAST 48+ HOURS

### LLM Coverage Issues:
Only 8 of 11 intended LLMs are working:
- ✅ Working: OpenAI, Mistral, DeepSeek, Together, Anthropic, Google, Perplexity, xAI
- ❌ Missing: Groq, Cohere, Gemini (appears to have auth issues)

### Response Quality:
- Average response length varies from 251 chars (xAI/grok-beta) to 4,069 chars (Google Gemini)
- Most domains have incomplete responses (expecting 24 per domain, many have only 17-18)
- Prompt types heavily skewed: 95,144 memory_analysis vs only 1,507 technical_assessment

## Service Architecture

### Deployed Services:
1. **sophisticated-runner** (✅ Working)
   - Main API service with LLM endpoints
   - Has API keys configured
   - Can process domains but needs manual triggering

2. **seo-metrics-runner** (✅ Working)
   - Provides SEO metrics for domains
   
3. **public-api** (✅ Working)
   - Python FastAPI service at llmrank.io
   - Serves processed data to frontend

4. **cohort-intelligence** (✅ Working)
   - Analyzes cohorts of brands

5. **industry-intelligence** (✅ Working)
   - Industry-level analysis

### Critical Missing Services:
1. **memory-oracle** (❌ NOT DEPLOYED)
   - Required for tensor computation
   - Would calculate memory scores, drift, and decay
   - Has code but not in production

2. **predictive-analytics** (❌ NOT DEPLOYED)
   - Would generate predictions from tensor data

3. **weekly-domain-scheduler** (❌ NOT DEPLOYED)
   - Exists but not actively running
   - Would automate weekly crawls

## Why Weekly Crawls Keep Failing

### 1. **No Automated Scheduling**
- The `weekly_domain_scheduler.py` exists but is not deployed as a service
- Render doesn't support cron jobs directly
- Current solution requires manual triggering

### 2. **Service Crashes After ~3000 Domains**
- No robust error handling for API rate limits
- Memory issues with large batches
- No automatic restart on failure

### 3. **Incomplete API Key Configuration**
- Missing keys for Groq, Cohere, and some Gemini variants
- No key rotation or fallback mechanisms
- Rate limiting not properly implemented

### 4. **Broken Data Pipeline**
The intended flow is:
```
Domain → LLM APIs → Responses → Memory Scores → Tensors → Insights
                                       ↑
                                   BROKEN HERE
```

Memory scores are never calculated because memory-oracle is not deployed.

## Critical Issues Identified

### 1. **Tensor Computation Not Running**
- Raw LLM responses are collected but never processed into tensors
- Memory decay calculations don't exist
- No drift detection or consensus analysis

### 2. **Simultaneous LLM Responses Not Achieved**
- Current implementation is sequential with delays
- True parallel processing would require 24 simultaneous API calls per domain
- This is critical for accurate consensus detection

### 3. **No Continuous Monitoring**
- System processes all domains once then stops
- No health checks or automatic restarts
- No alerting when processing fails

### 4. **Resource Utilization**
- Database has collected 128k responses but they're not being used
- Sophisticated tensor algorithms exist but aren't running
- Premium features (Bloomberg Terminal mode) implemented but not accessible

## Data Flow Analysis

### Current (Broken) Flow:
1. Manual trigger to sophisticated-runner
2. Domains fetched from database
3. LLM APIs called (8 working providers)
4. Responses stored in domain_responses table
5. ❌ Processing stops here

### Intended Flow:
1. Weekly automated trigger
2. Domains processed in parallel batches
3. All 11 LLMs respond simultaneously
4. Responses stored
5. Memory-oracle computes memory scores
6. Tensor calculations update the three core tensors
7. Drift/decay analysis runs
8. Predictive analytics generate insights
9. Alerts created for significant changes
10. Public API serves tensor data

## Recommendations

### Immediate Actions (Week 1):

1. **Deploy memory-oracle service**
   ```bash
   cd services/memory-oracle
   render deploy
   ```

2. **Add missing API keys to sophisticated-runner**
   - GROQ_API_KEY
   - COHERE_API_KEY
   - Fix GOOGLE_API_KEY authentication

3. **Implement automated scheduling**
   - Option 1: Use Render's background workers
   - Option 2: Deploy weekly-domain-scheduler as a web service
   - Option 3: Use external cron service to trigger endpoints

### System Improvements (Week 2-3):

1. **Implement true parallel processing**
   - Use the tensor_parallel_processor.py approach
   - Process 50-100 domains simultaneously
   - Implement proper semaphores for rate limiting

2. **Add comprehensive monitoring**
   - Health checks every 5 minutes
   - Alert on processing failures
   - Track API usage and costs

3. **Fix data pipeline**
   - Ensure memory-oracle processes all responses
   - Implement tensor calculations
   - Enable drift detection

### Long-term Strategy (Month 2):

1. **Optimize for scale**
   - Target: 10,000+ domains per week
   - Implement distributed processing
   - Use queue-based architecture

2. **Enhance tensor accuracy**
   - Add more LLM providers
   - Implement weighted consensus
   - Add temporal smoothing

3. **Productize insights**
   - Dashboard for tensor visualization
   - API for real-time queries
   - Automated reports

## Cost Analysis

Current weekly run estimate:
- 3,239 domains × 8 LLMs × 3 prompts = 77,736 API calls
- Estimated cost: $150-200 per week (depending on model mix)
- With all 11 LLMs: $200-250 per week

## Conclusion

The domain-runner system is architecturally sophisticated but operationally broken. The core innovation—using LLM memory as a proxy for brand perception—is sound, but the implementation has critical gaps:

1. **Data collection works** (128k responses collected)
2. **Tensor computation doesn't exist** (memory-oracle not deployed)
3. **Automation is missing** (manual triggers only)
4. **Scale is limited** (crashes after 3k domains)

The system has been "struggling for 2 months" because it's trying to run a complex multi-stage pipeline with key components missing. It's like having a sophisticated factory where the raw materials arrive but the assembly line is turned off.

**Priority**: Deploy memory-oracle and implement automated scheduling. Without these, the system is just collecting data without generating intelligence.

## Appendix: Quick Fixes

### Fix 1: Deploy Memory Oracle
```bash
cd services/memory-oracle
npm install
npm run build
# Add to render.yaml and deploy
```

### Fix 2: Simple Cron Alternative
```python
# Add to sophisticated-runner/src/index.ts
setInterval(async () => {
  if (new Date().getDay() === 0) { // Sunday
    await processDomainsAsync();
  }
}, 3600000); // Check every hour
```

### Fix 3: Add Missing LLMs
```typescript
// Add to sophisticated-runner
const GROQ_PROVIDER = {
  name: 'groq',
  model: 'llama-3.1-70b',
  keys: [process.env.GROQ_API_KEY],
  endpoint: 'https://api.groq.com/v1/chat/completions',
  tier: 'fast'
};
```

---

*Report generated: 2025-07-26*
*System version: Domain Runner v2.0*
*Analysis depth: Comprehensive*
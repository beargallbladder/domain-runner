# 🎯 Sentinel v2.0 PRD - Production-Informed Continuous Improvement System

## Executive Summary

Based on production analysis, we discovered the existing crawler system is **functionally complete but operationally broken**. The code works perfectly (processed 11,182 responses on Aug 6) but lacks automated triggers. Sentinel v2.0 bridges this gap by wrapping the working crawler with intelligent orchestration.

## 🔍 Key Discoveries from Production Analysis

### What's Actually Working
1. **Multi-Provider Tensor Crawling**: 16 providers × 3 prompts × 3,249 domains
2. **Database Schema**: Solid PostgreSQL schema with proper indexes
3. **API Layer**: Production API at llmrank.io serving real data
4. **Provider Integration**: 9+ confirmed working LLM providers with API keys on Render

### What's Actually Broken
1. **No Automatic Triggers**: Crawler exists but never runs
2. **No Monitoring**: No visibility into when/why crawling stops
3. **No Error Recovery**: 32 domains stuck in "processing" for 12+ days
4. **No Learning**: Same prompts, same batch sizes, no optimization

## 📐 Sentinel v2.0 Architecture

### Core Principle: "Wrap, Don't Replace"
Instead of rebuilding, Sentinel wraps the existing working crawler with intelligent orchestration.

```yaml
architecture:
  layers:
    existing_core:
      - crawler-tensor.js (WORKS - DON'T CHANGE)
      - PostgreSQL database (WORKS - DON'T CHANGE)
      - API endpoints (WORKS - DON'T CHANGE)
    
    sentinel_wrapper:
      - Automatic triggers (CRON + event-based)
      - Health monitoring
      - Error recovery
      - Performance optimization
      - Learning system
    
    ruvnet_orchestration:
      - Swarm coordination
      - Neural consensus
      - Distributed memory
      - Self-healing
```

## 🚀 Implementation Phases

### Phase 1: Immediate Fix (Day 1)
**Goal**: Get crawling running TODAY

```javascript
// 1. Add trigger endpoint to existing API
app.post('/api/trigger-crawl', async (req, res) => {
  // Check if already running (lock file)
  // Spawn crawler-tensor.js
  // Return status
});

// 2. Add simple CRON
setInterval(() => {
  if (!isRunning()) {
    triggerCrawl();
  }
}, 3600000); // Every hour
```

### Phase 2: Sentinel Wrapper (Week 1)
**Goal**: Add monitoring and recovery

```yaml
sentinel_wrapper:
  monitors:
    - crawler_health:
        check_interval: 60s
        metrics:
          - domains_per_minute
          - api_success_rate
          - stuck_domains
        
    - auto_recovery:
        triggers:
          - no_activity_for: 5m
          - stuck_domains > 10
          - error_rate > 0.3
        actions:
          - reset_stuck_domains
          - restart_crawler
          - notify_operators
```

### Phase 3: RuvNet Intelligence (Week 2)
**Goal**: Add learning and optimization

```yaml
ruvnet_swarm:
  agents:
    - performance_analyzer:
        learns:
          - optimal_batch_size per provider
          - best_times_to_crawl
          - rate_limit_patterns
        
    - prompt_optimizer:
        learns:
          - which_prompts_get_best_responses
          - provider_specific_prompts
          - domain_specific_prompts
    
    - cost_optimizer:
        learns:
          - cheapest_provider_for_quality
          - optimal_provider_mix
          - when_to_use_expensive_models
```

## 📊 Operational Metrics

### Current State (Discovered)
```yaml
current_performance:
  last_successful_run: 2025-08-15
  best_day: 2025-08-06
  domains_processed: 11,182
  providers_used: 7
  processing_time: 587 minutes
  success_rate: ~90%
  
problems:
  - manual_trigger_required: true
  - monitoring: none
  - error_recovery: none
  - optimization: none
```

### Target State (With Sentinel)
```yaml
target_performance:
  automatic_runs: 24/day
  domains_per_hour: 1,500+
  providers_used: 16
  success_rate: 99%+
  
features:
  - automatic_triggers: cron + event
  - real_time_monitoring: true
  - self_healing: true
  - continuous_optimization: true
```

## 🔄 Migration Strategy

### Step 1: Preserve Working Code
```bash
# DON'T modify these files - they work!
services/domain-processor-v2/crawler-tensor.js
services/domain-processor-v2/final-tensor-crawler.js

# Instead, wrap them
services/domain-processor-v2/sentinel-wrapper.js
```

### Step 2: Add Triggers
```javascript
// sentinel-wrapper.js
const { spawn } = require('child_process');

class SentinelWrapper {
  constructor() {
    this.crawlerProcess = null;
    this.stats = { started: 0, completed: 0, failed: 0 };
  }
  
  async triggerCrawl() {
    if (this.isRunning()) return;
    
    // Use the EXISTING working crawler
    this.crawlerProcess = spawn('node', ['crawler-tensor.js']);
    this.monitorProgress();
  }
  
  monitorProgress() {
    // Watch database for activity
    // Detect stuck domains
    // Restart if needed
  }
}
```

### Step 3: Layer Intelligence
```yaml
nexus_enhancement:
  learn_from_production:
    - track: which_providers_succeed
    - track: optimal_batch_sizes
    - track: best_prompt_patterns
  
  apply_learnings:
    - adjust: batch_size_per_provider
    - adjust: retry_strategies
    - adjust: prompt_templates
```

## 🎯 Success Criteria

### Week 1: Operational Success
- [ ] Crawler runs automatically every hour
- [ ] No domains stuck in "processing"
- [ ] 90%+ success rate
- [ ] Alerts on failures

### Week 2: Optimization Success
- [ ] 20% improvement in crawl speed
- [ ] 15% reduction in API costs
- [ ] Provider-specific optimizations applied
- [ ] Learning system storing patterns

### Month 1: Intelligence Success
- [ ] Self-tuning batch sizes
- [ ] Predictive failure prevention
- [ ] Optimal provider selection per domain
- [ ] 99%+ uptime with self-healing

## 🚨 Critical Insights

### Don't Break What Works
```yaml
working_components:
  - crawler_code: "16 providers with correct API calls"
  - database_schema: "Proper tables and indexes"
  - api_endpoints: "Production traffic at llmrank.io"
  - render_deployment: "API keys properly configured"

broken_components:
  - triggers: "No automatic execution"
  - monitoring: "No visibility"
  - recovery: "No error handling"
  - optimization: "No learning"
```

### The Real Problem
**It's not a code problem, it's an operations problem.** The crawler works perfectly when triggered manually but never runs automatically.

## 📝 Technical Specifications

### Trigger System
```javascript
// Multiple trigger mechanisms for reliability
triggers:
  cron:
    - schedule: "0 * * * *"  # Every hour
    - command: "node crawler-tensor.js"
  
  event_based:
    - on: "new_domains_added"
    - on: "manual_api_call"
    - on: "health_check_failure"
  
  intelligent:
    - on: "low_api_usage_detected"
    - on: "optimal_time_window"
    - on: "cost_threshold_not_met"
```

### Monitoring System
```javascript
monitoring:
  real_time:
    - domains_per_minute
    - api_calls_per_provider
    - success_rate_by_provider
    - cost_accumulation
  
  alerts:
    - no_activity_5min: "severity: high"
    - stuck_domains > 50: "severity: critical"
    - api_key_failure: "severity: critical"
    - cost_overrun: "severity: medium"
```

### Recovery System
```javascript
recovery:
  automatic:
    stuck_domains:
      - detect: "status='processing' AND updated_at < NOW() - INTERVAL '10 minutes'"
      - action: "UPDATE domains SET status='pending' WHERE ..."
    
    failed_provider:
      - detect: "3 consecutive failures"
      - action: "disable provider for 1 hour"
    
    rate_limit:
      - detect: "429 response"
      - action: "exponential backoff with jitter"
```

## 🔮 RuvNet Nexus Integration

### Swarm Configuration
```yaml
nexus_swarms:
  crawler_swarm:
    topology: adaptive_mesh
    agents:
      - trigger_coordinator: "Decides when to crawl"
      - performance_monitor: "Tracks efficiency"
      - error_handler: "Manages failures"
      - cost_optimizer: "Minimizes API costs"
    
  analysis_swarm:
    topology: hierarchical
    agents:
      - pattern_recognizer: "Learns from successes"
      - failure_predictor: "Prevents issues"
      - optimization_suggester: "Improves efficiency"
```

### Learning System
```yaml
learning_patterns:
  provider_behavior:
    - success_rate_by_time_of_day
    - optimal_batch_size
    - rate_limit_patterns
    - cost_per_quality_ratio
  
  domain_patterns:
    - provider_accuracy_by_domain_type
    - prompt_effectiveness_by_industry
    - response_quality_indicators
  
  operational_patterns:
    - peak_performance_windows
    - failure_prediction_signals
    - cost_optimization_opportunities
```

## 🚀 Deployment Plan

### Day 1: Stop the Bleeding
1. Deploy trigger endpoint
2. Add basic CRON job
3. Clear stuck domains
4. Verify crawling resumes

### Week 1: Add Monitoring
1. Deploy Sentinel wrapper
2. Add health checks
3. Implement auto-recovery
4. Set up alerts

### Week 2: Add Intelligence
1. Deploy RuvNet swarms
2. Enable learning system
3. Implement optimizations
4. Monitor improvements

### Month 1: Full Automation
1. Self-tuning parameters
2. Predictive maintenance
3. Cost optimization
4. Complete autonomy

## 📈 Expected Outcomes

### Immediate (Day 1)
- Crawling resumes after 12-day gap
- 1,602 pending domains processed
- Fresh data flowing to llmrank.io

### Short-term (Week 1)
- 99% uptime achieved
- No stuck domains
- Automatic error recovery

### Medium-term (Month 1)
- 30% performance improvement
- 20% cost reduction
- Self-optimizing system

### Long-term (Quarter 1)
- Fully autonomous operation
- Predictive optimization
- Industry-leading efficiency

## 🔑 Key Decisions

### Build vs Wrap
**Decision**: WRAP the existing working system
**Rationale**: The crawler works perfectly; it just needs operational support

### Replace vs Enhance
**Decision**: ENHANCE with Sentinel layer
**Rationale**: Preserve working code, add missing capabilities

### Manual vs Automatic
**Decision**: AUTOMATIC with manual override
**Rationale**: Eliminate human dependency while maintaining control

## 📚 Appendix: Working Code Reference

### Confirmed Working Files
```
services/domain-processor-v2/
├── crawler-tensor.js          # Main crawler (16 providers)
├── final-tensor-crawler.js    # Optimized version (9 providers)
├── server.js                  # API server
└── package.json              # Dependencies
```

### Database Schema (Working)
```sql
domains: id, domain, status, created_at, updated_at
domain_responses: id, domain_id, model, response, sentiment_score, memory_score, created_at
```

### API Endpoints (Working)
```
https://www.llmrank.io/api/stats/rich
https://www.llmrank.io/api/rankings/rich
https://www.llmrank.io/api/domains/:domain/rich
```

---

**The crawler isn't broken. It's just sleeping. Sentinel wakes it up and keeps it running.**
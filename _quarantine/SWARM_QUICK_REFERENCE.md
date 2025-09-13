# Domain Runner Swarm Architecture - Quick Reference

## 🎯 System Mission
**Measure how LLMs perceive and remember brands over time**
- Weekly processing of 3,239 domains
- 11 LLM providers × 3 prompts = 33 responses per domain
- Target: 1000+ domains/hour throughput

## 🏗️ Six Core Pillars

### 1️⃣ Raw Data Collection
**Purpose**: Gather LLM responses efficiently
- **Topology**: Hierarchical (clear command chain)
- **Agents**: 5 (Orchestrator, Health Monitor, Validator, Retry Manager, Batch Optimizer)
- **Key Metrics**: 100% coverage, <1% failure rate, 1000+ domains/hour

### 2️⃣ Intelligence Generation  
**Purpose**: Transform responses into insights
- **Topology**: Mesh (complex analysis)
- **Agents**: 6 (Orchestrator, Memory Calculator, Drift Analyzer, Consensus Analyzer, Competitive Intel, Tensor Engine)
- **Key Output**: MemoryTensor, SentimentTensor, GroundingTensor

### 3️⃣ API Services
**Purpose**: Deliver intelligence to consumers
- **Topology**: Star (central gateway)
- **Agents**: 5 (Gateway Manager, Cache Optimizer, Response Formatter, Usage Analytics, SLA Monitor)
- **Key Metrics**: <100ms response, 99.95% uptime

### 4️⃣ Security & Authentication
**Purpose**: Protect system integrity
- **Topology**: Ring (distributed monitoring)
- **Agents**: 5 (Orchestrator, Access Validator, Anomaly Detector, Audit Logger, Key Manager)
- **Key Focus**: Zero breaches, real-time detection

### 5️⃣ Operations & Monitoring
**Purpose**: Ensure reliability
- **Topology**: Hierarchical (escalation paths)
- **Agents**: 5 (SRE Orchestrator, Health Monitor, Performance Analyzer, Cost Optimizer, Capacity Planner)
- **Key Metrics**: 99.9% uptime, <5min incident response

### 6️⃣ Processing Pipeline
**Purpose**: Scale processing capacity
- **Topology**: Mesh (dynamic distribution)
- **Agents**: 4 (Pipeline Orchestrator, Batch Manager, Worker Coordinator, Resource Optimizer)
- **Key Goal**: 10x throughput improvement

## 🚀 Quick Start Commands

### Initialize All Swarms
```bash
npx claude-flow@alpha hive-mind spawn "Initialize master coordinator for domain-runner multi-swarm system" --topology hierarchical --agents 6
```

### Start Weekly Processing
```bash
npx claude-flow@alpha task orchestrate "Execute weekly brand intelligence cycle" --swarm-id master-coordinator
```

### Monitor Status
```bash
npx claude-flow@alpha swarm monitor --real-time
```

## 📊 Key Data Structures

### Database Tables
- `domains` - Brand domains to analyze
- `domain_responses` - Raw LLM responses  
- `volatility_scores` - Computed volatility metrics
- `partner_api_keys` - API authentication

### Redis Topics
- `data.collection.complete`
- `intelligence.insight.generated`
- `api.request.received`
- `security.threat.detected`
- `operations.alert.raised`
- `pipeline.batch.processed`

## 🔄 Processing Flow
```
1. Collection Swarm → Gathers LLM responses
2. Intelligence Swarm → Computes tensors & insights
3. API Swarm → Serves data to consumers
   ↓
Security & Operations monitor all activities
Pipeline Swarm optimizes throughput
```

## 📈 Success Metrics

| Pillar | Key Metric | Target |
|--------|-----------|--------|
| Collection | Coverage | 100% weekly |
| Collection | Throughput | 1000+ domains/hour |
| Intelligence | Processing Time | <5 minutes |
| API | Response Time | <100ms (cached) |
| Security | Breaches | Zero |
| Operations | Uptime | 99.9% |
| Pipeline | Improvement | 10x throughput |

## 🛠️ Implementation Phases

**Phase 1 (Weeks 1-2)**: Foundation
- Deploy Collection Swarm
- Basic Intelligence Swarm
- Operations monitoring

**Phase 2 (Weeks 3-4)**: Enhancement
- Advanced intelligence agents
- Security swarm
- Pipeline optimization

**Phase 3 (Weeks 5-6)**: Optimization
- Inter-swarm communication
- Predictive capabilities
- Full monitoring

**Phase 4 (Weeks 7-8)**: Scale
- Distributed processing
- Auto-scaling
- Advanced caching

## 🚨 Emergency Commands

```bash
# Pause all operations
npx claude-flow@alpha swarm pause --all

# Check health
npx claude-flow@alpha swarm health-check --all

# Failover
npx claude-flow@alpha swarm failover --primary [swarm-id] --backup [backup-id]
```

## 💡 Key Insights Generated

1. **Memory Decay** - How quickly brands are forgotten
2. **Perception Drift** - Changes in brand sentiment
3. **LLM Consensus** - Agreement across models
4. **Competitive Position** - Relative brand strength
5. **Volatility Scores** - Brand stability metrics

## 🔗 Integration Points

- **Frontend**: llmpagerank.com (Vercel)
- **Database**: PostgreSQL on Render
- **Cache**: Redis for pub/sub and caching
- **APIs**: 11 LLM providers
- **Monitoring**: Winston logging + custom metrics

## 📝 Remember

- Swarms coordinate, Claude Code executes
- All swarms use persistent memory
- Inter-swarm communication via Redis
- Each swarm scales independently
- Automatic failure recovery built-in

---

**Quick Health Check**: 
```bash
curl https://sophisticated-runner.onrender.com/health
curl https://llmrank.io/health
```
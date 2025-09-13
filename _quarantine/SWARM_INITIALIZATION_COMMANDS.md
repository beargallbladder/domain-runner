# Swarm Initialization Commands for Domain Runner

This document provides ready-to-use commands for initializing each specialized swarm using Claude Flow.

## Prerequisites

```bash
# Ensure Claude Flow is installed
npm install -g claude-flow@alpha

# Verify MCP server is configured
claude mcp list
```

## 1. Raw Data Collection Swarm

### Initialize Collection Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize a Raw Data Collection Swarm for domain-runner. \
  This swarm must coordinate the collection of LLM responses from 11 providers \
  (OpenAI, Anthropic, DeepSeek, Mistral, xAI, Together, Perplexity, Google, Cohere, AI21, Groq). \
  
  Create these specialized agents:
  1. Collection Orchestrator - Manages weekly collection cycles, domain allocation, and progress tracking
  2. Provider Health Monitor - Monitors API availability, rate limits, and performs health checks
  3. Data Validator - Validates response quality, completeness, and flags re-processing needs
  4. Retry Manager - Handles failures with exponential backoff and provider rotation
  5. Batch Optimizer - Optimizes batch sizes based on memory usage and provider capacity
  
  Use hierarchical topology for clear command chain. The swarm must process 3,239 domains weekly \
  with 3 prompt types each, targeting 1000+ domains/hour throughput. Implement parallel processing \
  and automatic error recovery. Store results in PostgreSQL domain_responses table." \
  --topology hierarchical \
  --agents 5 \
  --strategy parallel
```

### Start Weekly Collection Cycle
```bash
npx claude-flow@alpha task orchestrate \
  "Execute weekly domain collection cycle. \
  Fetch all domains from database, distribute across providers, \
  ensure 100% completion with full error recovery." \
  --swarm-id collection-swarm \
  --priority critical
```

## 2. Intelligence Generation Swarm

### Initialize Intelligence Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize an Intelligence Generation Swarm for domain-runner. \
  This swarm transforms raw LLM responses into actionable brand intelligence using tensor computations. \
  
  Create these specialized agents:
  1. Intelligence Orchestrator - Coordinates tensor computations and insight aggregation
  2. Memory Score Calculator - Computes brand memory persistence and decay patterns
  3. Drift Pattern Analyzer - Detects perception changes over time using semantic analysis
  4. Consensus Analyzer - Measures agreement patterns across LLMs
  5. Competitive Intelligence Agent - Analyzes relative brand positioning
  6. Tensor Computation Engine - Builds MemoryTensor, SentimentTensor, and GroundingTensor
  
  Use mesh topology for complex inter-agent communication. Generate insights within 5 minutes \
  of data collection completion. Implement drift detection, consensus scoring, and competitive analysis. \
  Store computed tensors and insights in dedicated tables." \
  --topology mesh \
  --agents 6 \
  --strategy adaptive
```

### Compute Weekly Intelligence
```bash
npx claude-flow@alpha task orchestrate \
  "Generate comprehensive brand intelligence from latest LLM responses. \
  Compute all tensor dimensions, identify significant drifts, \
  measure consensus patterns, generate executive alerts." \
  --swarm-id intelligence-swarm \
  --memory-key "tensors/weekly/$(date +%Y%m%d)"
```

## 3. API Services Swarm

### Initialize API Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize an API Services Swarm for domain-runner. \
  This swarm manages the public API at llmrank.io serving brand intelligence data. \
  
  Create these specialized agents:
  1. API Gateway Manager - Routes requests, manages authentication, enforces rate limits
  2. Cache Optimization Agent - Implements intelligent caching with Redis, predictive pre-caching
  3. Response Formatter - Transforms data for different tiers (enterprise/standard)
  4. Usage Analytics Agent - Tracks consumption patterns and generates billing data
  5. SLA Monitor - Ensures <100ms response times and 99.95% uptime
  
  Use star topology with central gateway. Implement tier-based access control, \
  domain restrictions, and comprehensive usage tracking. Support JSON/GraphQL formats." \
  --topology star \
  --agents 5 \
  --strategy balanced
```

### Optimize API Performance
```bash
npx claude-flow@alpha task orchestrate \
  "Optimize API performance for high-traffic endpoints. \
  Analyze usage patterns, implement predictive caching, \
  ensure SLA compliance across all tiers." \
  --swarm-id api-swarm \
  --continuous true
```

## 4. Security & Authentication Swarm

### Initialize Security Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize a Security & Authentication Swarm for domain-runner. \
  This swarm maintains system security, access control, and compliance. \
  
  Create these specialized agents:
  1. Security Orchestrator - Coordinates security policies and incident response
  2. Access Validator - Validates API keys, domain restrictions, and permissions
  3. Anomaly Detector - Identifies suspicious patterns using ML models
  4. Audit Logger - Maintains tamper-proof audit trails
  5. Key Lifecycle Manager - Handles key generation, rotation, and revocation
  
  Use ring topology for distributed security monitoring. Implement real-time threat detection, \
  comprehensive audit logging, and automated key rotation. Ensure zero security breaches." \
  --topology ring \
  --agents 5 \
  --strategy defensive
```

### Security Monitoring Mode
```bash
npx claude-flow@alpha task orchestrate \
  "Activate continuous security monitoring. \
  Monitor all access patterns, detect anomalies in real-time, \
  maintain audit trails, rotate compromised keys." \
  --swarm-id security-swarm \
  --mode continuous-monitoring
```

## 5. Operations & Monitoring Swarm

### Initialize Operations Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize an Operations & Monitoring Swarm for domain-runner. \
  This swarm ensures system reliability, performance, and operational efficiency. \
  
  Create these specialized agents:
  1. Site Reliability Orchestrator - Oversees health, incidents, and deployments
  2. Health Monitor - Tracks service availability and dependencies
  3. Performance Analyzer - Identifies bottlenecks and optimization opportunities
  4. Cost Optimizer - Monitors and reduces operational costs
  5. Capacity Planner - Predicts and plans for scaling needs
  
  Use hierarchical topology for clear escalation. Target 99.9% uptime, \
  <5 minute incident response, and 20% cost optimization." \
  --topology hierarchical \
  --agents 5 \
  --strategy proactive
```

### Enable 24/7 Monitoring
```bash
npx claude-flow@alpha task orchestrate \
  "Enable comprehensive 24/7 system monitoring. \
  Track all services, analyze performance metrics, \
  predict capacity needs, optimize costs continuously." \
  --swarm-id operations-swarm \
  --alert-threshold critical
```

## 6. Processing Pipeline Swarm

### Initialize Pipeline Swarm
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize a Processing Pipeline Swarm for domain-runner. \
  This swarm optimizes data processing efficiency and enables massive scale. \
  
  Create these specialized agents:
  1. Pipeline Orchestrator - Manages end-to-end processing flow
  2. Batch Manager - Optimizes batch sizes and scheduling
  3. Worker Coordinator - Distributes work across processing nodes
  4. Resource Optimizer - Manages memory, CPU, and prevents exhaustion
  
  Use mesh topology for dynamic work distribution. Achieve 10x throughput improvement, \
  implement automatic failure recovery, and enable distributed processing." \
  --topology mesh \
  --agents 4 \
  --strategy scalable
```

### Scale Processing Pipeline
```bash
npx claude-flow@alpha task orchestrate \
  "Scale processing pipeline for maximum throughput. \
  Implement parallel processing, optimize batch sizes, \
  distribute load across workers, monitor resource usage." \
  --swarm-id pipeline-swarm \
  --target-throughput 5000
```

## Master Swarm Coordination

### Initialize All Swarms Together
```bash
npx claude-flow@alpha hive-mind spawn \
  "Initialize master coordinator for domain-runner multi-swarm system. \
  Coordinate 6 specialized swarms: Collection, Intelligence, API, Security, Operations, Pipeline. \
  
  Implement inter-swarm communication via Redis pub/sub with topics:
  - data.collection.complete
  - intelligence.insight.generated  
  - api.request.received
  - security.threat.detected
  - operations.alert.raised
  - pipeline.batch.processed
  
  Ensure seamless data flow: Collection → Intelligence → API, \
  with Security and Operations monitoring all activities. \
  Target: 3,239 domains weekly, 1000+ domains/hour, <100ms API response, 99.9% uptime." \
  --topology hierarchical \
  --agents 6 \
  --strategy orchestrated
```

### Weekly Master Orchestration
```bash
npx claude-flow@alpha task orchestrate \
  "Execute complete weekly brand intelligence cycle. \
  1. Collection Swarm: Gather responses from all LLMs \
  2. Intelligence Swarm: Compute tensors and insights \
  3. API Swarm: Update caches with fresh data \
  4. Security Swarm: Audit all operations \
  5. Operations Swarm: Generate performance reports \
  6. Pipeline Swarm: Optimize for next cycle \
  
  Ensure 100% completion with full monitoring and alerting." \
  --swarm-id master-coordinator \
  --schedule "0 0 * * 0"  # Weekly on Sunday
```

## Monitoring Commands

### View Swarm Status
```bash
# Check individual swarm status
npx claude-flow@alpha swarm status --swarm-id collection-swarm
npx claude-flow@alpha swarm status --swarm-id intelligence-swarm
npx claude-flow@alpha swarm status --swarm-id api-swarm

# View all swarms
npx claude-flow@alpha swarm list --detailed
```

### Monitor Real-time Activity
```bash
# Watch swarm coordination in real-time
npx claude-flow@alpha swarm monitor --real-time

# View inter-swarm communication
npx claude-flow@alpha swarm monitor --topic "data.collection.*"
```

### Performance Metrics
```bash
# Get swarm performance metrics
npx claude-flow@alpha metrics show --swarm-id collection-swarm --period 1h

# Compare swarm efficiency
npx claude-flow@alpha metrics compare --swarms all --metric throughput
```

## Emergency Commands

### Pause All Swarms
```bash
npx claude-flow@alpha swarm pause --all --reason "Emergency maintenance"
```

### Resume Operations
```bash
npx claude-flow@alpha swarm resume --all --verify-health
```

### Failover Mode
```bash
npx claude-flow@alpha swarm failover --primary collection-swarm --backup collection-swarm-2
```

## Best Practices

1. **Always verify swarm health before major operations**
   ```bash
   npx claude-flow@alpha swarm health-check --all
   ```

2. **Store swarm configurations for reproducibility**
   ```bash
   npx claude-flow@alpha swarm export --swarm-id collection-swarm > swarm-configs/collection.json
   ```

3. **Use memory keys for coordination state**
   ```bash
   npx claude-flow@alpha memory store --key "swarm/state/$(date +%Y%m%d)" --value "..."
   ```

4. **Monitor resource usage continuously**
   ```bash
   npx claude-flow@alpha swarm resources --watch
   ```

5. **Implement gradual rollouts**
   ```bash
   npx claude-flow@alpha swarm update --swarm-id api-swarm --canary 10%
   ```

## Integration with Existing Code

Each swarm should integrate with existing services:

- **Collection Swarm** → sophisticated-runner service
- **Intelligence Swarm** → memory-oracle, tensor computation  
- **API Swarm** → public-api service at llmrank.io
- **Security Swarm** → Authentication middleware
- **Operations Swarm** → Monitoring service
- **Pipeline Swarm** → All processing services

## Notes

- All swarms use persistent memory for state management
- Swarms automatically recover from failures
- Inter-swarm communication is asynchronous via Redis
- Each swarm maintains its own performance metrics
- Swarms can be scaled independently based on load

Remember: The swarms coordinate the work, but Claude Code executes the actual implementation!
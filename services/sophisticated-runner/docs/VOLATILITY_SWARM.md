# Volatility Swarm Intelligence System

## Overview

The Volatility Swarm is an aggressive, monster-level domain processing system that dynamically allocates 16+ LLM models based on domain volatility scores. It's designed to identify and exploit high-value opportunities in the AI perception landscape.

## Key Features

### 1. 16+ LLM Model Support
- **OpenAI**: gpt-4-turbo-preview, gpt-4, gpt-4o, gpt-3.5-turbo
- **Anthropic**: claude-3-opus, claude-3.5-sonnet, claude-3-haiku
- **Together AI**: Llama-3.1-70B, Mixtral-8x22B, Qwen-2.5-72B
- **Cohere**: command-r-plus, command-r
- **Mistral**: mistral-large, mistral-medium
- **Google**: gemini-1.5-pro, gemini-1.5-flash
- **Groq**: llama-3.1-70b, mixtral-8x7b (ultra-fast)
- **DeepSeek**: deepseek-chat (ultra-fast)
- **Perplexity**: llama-3.1-sonar (with web search)
- **X.AI**: grok-beta

### 2. Volatility Scoring System
Tracks multiple dimensions:
- **Memory Drift Velocity**: How fast AI perception changes
- **Sentiment Variance**: Disagreement across models
- **Temporal Decay**: How quickly relevance fades
- **SEO Opportunity**: Arbitrage potential
- **Competitive Volatility**: Market position instability

### 3. Dynamic LLM Allocation
Based on volatility scores:
- **Ultra-High (≥0.9)**: Deploy all 16+ models (MAXIMUM_COVERAGE)
- **High (≥0.7)**: Premium + fast providers (HIGH_QUALITY_COVERAGE)
- **Medium (≥0.5)**: Balanced approach (BALANCED_COVERAGE)
- **Low (<0.5)**: Fast/cheap providers (EFFICIENT_COVERAGE)

### 4. Learning & Pattern Recognition
- Identifies "juice worth squeezing" opportunities
- Learns from processing patterns
- Adapts thresholds based on performance
- Tracks category-level volatility trends

## API Endpoints

### Process Domains with Volatility Tiering
```bash
POST /swarm/process-volatile
Authorization: Bearer YOUR_API_KEY

{
  "batch_size": 20
}
```

### Get High-Value Opportunities
```bash
GET /swarm/opportunities
```

### Check Domain Volatility
```bash
GET /swarm/volatility/{domain}
```

### Get Swarm Metrics
```bash
GET /swarm/metrics
```

### Analyze Specific Domain
```bash
POST /swarm/analyze-domain
Authorization: Bearer YOUR_API_KEY

{
  "domain": "example.com",
  "force_reanalysis": false
}
```

### Category Volatility Analysis
```bash
GET /swarm/category-volatility/{category}
```

## Database Schema

### volatility_scores
- Stores volatility metrics for each domain
- Tracks multiple volatility dimensions
- Records signals and evidence

### swarm_learning
- Machine learning data from processing
- Provider performance metrics
- Pattern recognition data

## Configuration

Set these environment variables to enable providers:
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Together AI
TOGETHER_API_KEY=...

# Cohere
COHERE_API_KEY=...

# Mistral
MISTRAL_API_KEY=...

# Google
GOOGLE_API_KEY=...

# Groq (ultra-fast)
GROQ_API_KEY=...

# DeepSeek
DEEPSEEK_API_KEY=...

# Perplexity
PERPLEXITY_API_KEY=...

# X.AI
XAI_API_KEY=...

# BrandSentiment.io Integration (optional)
BRANDSENTIMENT_API_ENDPOINT=https://api.brandsentiment.io
BRANDSENTIMENT_API_KEY=...
```

## Usage Examples

### 1. Process High-Volatility Domains
```bash
curl -X POST https://sophisticated-runner.onrender.com/swarm/process-volatile \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"batch_size": 50}'
```

### 2. Find Opportunities
```bash
curl https://sophisticated-runner.onrender.com/swarm/opportunities
```

### 3. Deep Analysis of Specific Domain
```bash
curl -X POST https://sophisticated-runner.onrender.com/swarm/analyze-domain \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "openai.com", "force_reanalysis": true}'
```

## Performance Metrics

- **Models**: 16+ LLMs across 10 providers
- **Parallel Calls**: Up to 80+ simultaneous API calls per domain
- **Processing Speed**: 100-1000+ domains/hour depending on volatility
- **Cost Optimization**: Tiered approach minimizes API costs
- **Quality**: Premium models for high-volatility domains

## Monster-Level Features

1. **Aggressive Crawling**: High-volatility domains get hit with all 16+ models
2. **Memory Drift Detection**: Identifies when AI perception is shifting
3. **SEO Arbitrage**: Finds forgotten brands and domain opportunities
4. **Category Disruption**: Detects market shifts before competitors
5. **Continuous Learning**: Improves targeting with every processed domain

## Integration with BrandSentiment.io

When configured, automatically pushes volatility data to BrandSentiment.io for:
- Real-time sentiment tracking
- Cross-platform volatility monitoring
- Market intelligence aggregation

## Monitoring

Check swarm health:
```bash
curl https://sophisticated-runner.onrender.com/health
```

View real-time metrics:
```bash
curl https://sophisticated-runner.onrender.com/swarm/metrics
```

## Future Enhancements

1. **Predictive Volatility**: Forecast future volatility based on patterns
2. **Auto-Scaling**: Dynamically add/remove providers based on load
3. **Cost Optimization**: ML-based provider selection for cost/quality balance
4. **Real-Time Alerts**: WebSocket support for volatility spikes
5. **Historical Analysis**: Time-series volatility tracking
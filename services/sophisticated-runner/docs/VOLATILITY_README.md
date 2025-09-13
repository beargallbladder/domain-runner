# Volatility Scoring System

## Overview

The Volatility Scoring System analyzes domain intelligence data to determine how volatile a domain's AI perception is across different LLMs. This helps optimize resource allocation by using more LLMs for volatile domains and fewer for stable ones.

## Components

### 1. Volatility Score Calculation

The system calculates an overall volatility score (0-1) based on five components:

- **Memory Drift (25%)**: How fast AI perception changes over time
- **Sentiment Variance (20%)**: Agreement/disagreement between different LLMs
- **Temporal Decay (15%)**: How quickly the domain is forgotten by AIs
- **SEO Opportunity (25%)**: Potential for improving AI visibility
- **Competitive Volatility (15%)**: Category disruption and competition

### 2. Processing Tiers

Based on volatility scores, domains are assigned to processing tiers:

- **MAXIMUM_COVERAGE** (0.9+): Use all 16+ LLMs
- **HIGH_QUALITY_COVERAGE** (0.7-0.9): Premium + fast models
- **BALANCED_COVERAGE** (0.5-0.7): One model per provider
- **EFFICIENT_COVERAGE** (<0.5): Fast/cheap models only

### 3. API Endpoints

#### Calculate Volatility Scores
```bash
POST /volatility/calculate
Authorization: Bearer YOUR_API_KEY

{
  "domains": ["example.com", "test.com"],  // Optional, specific domains
  "batch_size": 10  // Optional, default 10
}
```

#### Get Volatility Rankings
```bash
GET /volatility/rankings?limit=50&tier=HIGH_QUALITY_COVERAGE&sort_by=seo
```

Query parameters:
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `tier`: Filter by processing tier
- `category`: Filter by business category
- `min_score`: Minimum volatility score
- `sort_by`: Sort option (score, seo, memory_drift, competitive, coverage)

#### Get Domain Volatility
```bash
GET /volatility/domain/example.com?history=true
```

Returns volatility score and optional historical data for a specific domain.

### 4. Database Tables

- `volatility_scores`: Current volatility scores and tier assignments
- `swarm_learning`: Machine learning from processing patterns
- `memory_tensors`: Weekly memory tracking
- `weekly_intelligence`: Aggregated weekly insights
- `category_volatility`: Category-level volatility metrics

### 5. Integration with Processing Pipeline

The volatility system integrates with the main processing pipeline:

1. When processing domains, check volatility score
2. Allocate LLMs based on assigned tier
3. Update learning data based on results
4. Recalculate volatility periodically

## Usage Example

```typescript
// Calculate volatility for pending domains
const response = await fetch('https://sophisticated-runner.onrender.com/volatility/calculate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ batch_size: 20 })
});

// Get high-volatility domains needing attention
const rankings = await fetch('https://sophisticated-runner.onrender.com/volatility/rankings?min_score=0.8&sort_by=seo');
```

## Migration

To set up the volatility tables:

```bash
cd scripts
./run_volatility_migration.sh
```

## Monitoring

Monitor volatility patterns through:
- `/swarm/metrics` - Overall swarm performance
- `/swarm/opportunities` - High-opportunity domains
- `/pattern-monitor` - Pattern detection insights
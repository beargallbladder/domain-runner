# New Advanced Analytics Endpoints

## Overview

The production API has been enhanced with four new advanced analytics endpoints that provide enterprise-grade insights into AI brand perception:

1. **Tensor Analysis** - Memory, sentiment, and grounding metrics
2. **Drift Detection** - Perception changes over time
3. **Consensus Scoring** - LLM model agreement analysis
4. **Volatility Metrics** - Risk and stability assessment

## Architecture

These endpoints implement a dual-mode architecture:
- **Primary**: Proxy to memory-oracle service when available (for real-time tensor computations)
- **Fallback**: Direct calculation from domain_responses table (for reliability)

## Endpoints

### 1. GET /api/tensors/{brand}

Returns memory, sentiment, and grounding tensor scores for a brand.

**Response Format:**
```json
{
  "brand": "apple.com",
  "tensors": {
    "memory": {
      "score": 0.85,
      "retention_strength": "high",
      "access_frequency": 85
    },
    "sentiment": {
      "score": 0.72,
      "market_sentiment": "positive",
      "confidence": 0.9
    },
    "grounding": {
      "score": 0.78,
      "strength": "strong",
      "verified_facts": 15
    }
  },
  "composite_score": 0.783,
  "insights": ["Strong memory patterns established"],
  "recommendations": ["Leverage positive sentiment"],
  "computed_at": "2025-01-29T12:00:00Z"
}
```

### 2. GET /api/drift/{brand}

Analyzes perception drift over time periods.

**Response Format:**
```json
{
  "brand": "apple.com",
  "drift": {
    "drift_score": 0.15,
    "drift_direction": "stable",
    "drift_type": "perception",
    "periods": {
      "current": {"count": 45, "avg_length": 350.5, "unique_models": 12},
      "previous": {"count": 42, "avg_length": 345.2, "unique_models": 11},
      "baseline": {"count": 40, "avg_length": 340.0, "unique_models": 10}
    },
    "severity": "low"
  },
  "historical_trend": {
    "7_day_change": 3,
    "30_day_trend": "stable"
  },
  "computed_at": "2025-01-29T12:00:00Z"
}
```

### 3. GET /api/consensus/{brand}

Measures agreement levels across different AI models.

**Response Format:**
```json
{
  "brand": "apple.com",
  "consensus": {
    "consensus_score": 0.82,
    "agreement_level": "strong",
    "model_agreement": {
      "gpt-4": 0.85,
      "claude-3": 0.83,
      "gemini-pro": 0.80
    },
    "divergent_models": [],
    "total_models": 15,
    "total_responses": 150
  },
  "insights": [
    "Models show strong agreement",
    "15 unique models analyzed",
    "Consensus score: 0.82"
  ],
  "computed_at": "2025-01-29T12:00:00Z"
}
```

### 4. GET /api/volatility/{brand}

Calculates volatility and risk metrics.

**Response Format:**
```json
{
  "brand": "apple.com",
  "volatility": {
    "volatility_score": 0.23,
    "volatility_level": "medium",
    "trend": "stable",
    "risk_level": "medium",
    "data_points": 30,
    "period": "30_days",
    "metrics": {
      "avg_daily_responses": 5.2,
      "max_daily_responses": 12,
      "min_daily_responses": 2,
      "std_deviation": 2.45
    }
  },
  "recommendations": [
    "Standard monitoring",
    "Current trend: stable",
    "Risk level: medium"
  ],
  "computed_at": "2025-01-29T12:00:00Z"
}
```

## Implementation Details

### Memory Oracle Integration

When available, the endpoints connect to the memory-oracle service at:
- URL: `https://memory-oracle.onrender.com`
- Timeout: 30 seconds
- Endpoints used:
  - `/analysis/domain/{domain_id}` - Comprehensive analysis
  - `/drift/detect/{domain_id}` - Drift detection
  - `/consensus/compute/{domain_id}` - Consensus computation

### Fallback Calculations

When memory-oracle is unavailable, metrics are calculated locally:

1. **Memory Score**: Based on response frequency and model diversity
2. **Sentiment Score**: Simple keyword analysis (positive/negative words)
3. **Grounding Score**: Consistency of themes across models
4. **Drift Score**: Comparison of response patterns over time periods
5. **Consensus Score**: Standard deviation of model sentiments
6. **Volatility Score**: Standard deviation of daily response counts

### Caching

- Tensor results are cached for 5 minutes
- Cache key format: `tensors_{domain_id}`
- Cache helps reduce load on memory-oracle service

### Error Handling

All endpoints include comprehensive error handling:
- 404: Brand not found
- 500: Calculation errors (with fallback to default values)
- Timeout handling for memory-oracle calls
- Graceful degradation when data is insufficient

## Testing

Use the provided test scripts:

1. **validate_new_endpoints.py** - Tests calculation logic directly
2. **test_new_endpoints.py** - Tests HTTP endpoints
3. **test_db_connection.py** - Validates database connectivity

## Dependencies Added

- `aiohttp==3.9.1` - For async HTTP calls to memory-oracle
- `numpy==1.26.2` - For statistical calculations

## Future Enhancements

1. **Enhanced Sentiment Analysis**: Integrate with specialized NLP models
2. **Real-time Updates**: WebSocket support for live tensor updates
3. **Historical API**: Detailed historical data access
4. **Batch Processing**: Multiple brands in single request
5. **Custom Time Ranges**: User-defined analysis periods
6. **Export Functionality**: CSV/JSON export of analytics data
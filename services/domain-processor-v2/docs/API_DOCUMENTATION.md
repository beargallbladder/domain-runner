# Domain Processor v2 API Documentation

## Overview

Domain Processor v2 provides three major new API services:

1. **LLM Consensus API** - Get unified responses from all LLM providers
2. **AI Zeitgeist Tracker** - Monitor trending topics in AI consciousness
3. **Memory Drift Alert System** - Detect when LLM memories diverge from reality

Base URL: `https://api.yourdomain.com/api/v1`

## Authentication

All API endpoints require authentication via API key:

```bash
Authorization: Bearer YOUR_API_KEY
```

## LLM Consensus API

### Get Consensus

Get consensus from all LLM providers about a domain.

```http
POST /consensus
```

#### Request Body

```json
{
  "domain": "openai.com",
  "promptType": "all", // Options: brand, technical, financial, sentiment, all
  "includeProviders": ["openai", "anthropic"], // Optional: specific providers
  "excludeProviders": ["groq"], // Optional: exclude providers
  "timeout": 30000, // Optional: max time in ms (default: 30000)
  "includeMetadata": true, // Optional: include detailed metadata
  "realtime": false // Optional: force fresh responses vs cached
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "domain": "openai.com",
    "timestamp": "2025-08-04T12:00:00Z",
    "consensusScore": 85.5,
    "aggregatedContent": {
      "summary": "OpenAI is a leading AI research company...",
      "keyThemes": ["AI research", "GPT models", "AGI development"],
      "sentiment": {
        "overall": 0.8,
        "breakdown": {
          "positive": 80,
          "neutral": 15,
          "negative": 5
        },
        "consensus": "strong"
      },
      "technicalCapabilities": ["Large language models", "Computer vision"],
      "marketPosition": "Industry leader",
      "risks": ["Regulatory challenges"],
      "opportunities": ["Enterprise adoption"]
    },
    "providers": [
      {
        "provider": "openai",
        "model": "gpt-4",
        "status": "success",
        "content": "...",
        "sentiment": 0.85,
        "confidence": 0.9,
        "responseTime": 1234,
        "divergenceScore": 5.2
      }
    ],
    "metadata": {
      "totalProviders": 11,
      "successfulResponses": 10,
      "failedResponses": 1,
      "averageResponseTime": 1500,
      "consensusStrength": "strong",
      "processingTime": 2100,
      "cacheStatus": "miss",
      "version": "1.0.0"
    },
    "memoryDrift": {
      "detected": true,
      "severity": "low",
      "driftScore": 15.5,
      "affectedProviders": ["llama-3"],
      "lastKnownAccurate": "2025-07-15T00:00:00Z",
      "suggestedAction": "monitor"
    }
  }
}
```

### Get Provider Status

Get current status of all LLM providers.

```http
GET /consensus/providers/status
```

#### Response

```json
{
  "success": true,
  "timestamp": "2025-08-04T12:00:00Z",
  "providers": [
    {
      "name": "openai",
      "available": true,
      "healthScore": 95,
      "lastSuccess": "2025-08-04T11:59:00Z",
      "averageResponseTime": 1200,
      "reliabilityScore": 98
    }
  ]
}
```

### Batch Consensus

Get consensus for multiple domains in one request.

```http
POST /consensus/batch
```

#### Request Body

```json
{
  "domains": [
    {"domain": "openai.com", "promptType": "technical"},
    {"domain": "anthropic.com", "promptType": "brand"}
  ]
}
```

## AI Zeitgeist Tracker API

### Get Current Zeitgeist

Get the current AI zeitgeist snapshot.

```http
GET /zeitgeist/snapshot
```

#### Response

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-08-04T12:00:00Z",
    "totalTrends": 42,
    "risingTrends": [
      {
        "id": "trend_123",
        "topic": "AI Safety",
        "category": "concept",
        "momentum": 78.5,
        "velocity": 12.3,
        "volume": 1523,
        "sentiment": 0.6,
        "firstDetected": "2025-08-01T00:00:00Z",
        "lastUpdated": "2025-08-04T12:00:00Z",
        "domains": [
          {
            "domain": "openai.com",
            "frequency": 45,
            "sentiment": 0.7
          }
        ],
        "keywords": [
          {
            "keyword": "alignment",
            "count": 234,
            "growth": 45.2
          }
        ],
        "llmConsensus": "strong"
      }
    ],
    "decliningTrends": [],
    "emergingTopics": [
      {
        "topic": "Multimodal AI",
        "firstMention": "2025-08-03T00:00:00Z",
        "growthRate": 125.5,
        "relatedTrends": ["Computer Vision", "Voice AI"],
        "earlyAdopters": ["openai", "google"]
      }
    ],
    "dominantThemes": ["AI Safety", "Open Source", "Enterprise AI"],
    "globalSentiment": {
      "overall": 0.65,
      "byCategory": {
        "technology": 0.8,
        "company": 0.6,
        "controversy": -0.2
      },
      "volatility": 0.15
    }
  }
}
```

### Query Trends

Search for specific trends.

```http
GET /zeitgeist/trends?timeRange=day&categories=technology,company&minMomentum=50&sentiment=positive&limit=20
```

#### Query Parameters

- `timeRange`: hour, day, week, month, all
- `categories`: Comma-separated list of categories
- `minMomentum`: Minimum momentum score (0-100)
- `sentiment`: positive, negative, neutral, all
- `keywords`: Comma-separated keywords to filter
- `limit`: Maximum results to return
- `includeVisualization`: Include visualization data

### Get Emerging Topics

Get newly emerging topics in AI consciousness.

```http
GET /zeitgeist/emerging?limit=10
```

### Analyze Trend Trajectory

Get predictive analysis for a specific trend.

```http
GET /zeitgeist/trends/{trendId}/trajectory
```

#### Response

```json
{
  "success": true,
  "data": {
    "trendId": "trend_123",
    "currentMomentum": 78.5,
    "predictedPeak": "2025-08-10T00:00:00Z",
    "peakValue": 92.3,
    "confidence": 0.85,
    "factors": [
      "Rapid growth velocity",
      "Strong positive sentiment",
      "Wide domain coverage"
    ],
    "recommendations": [
      "Monitor for peak timing",
      "Prepare content for trend peak"
    ]
  }
}
```

### Subscribe to Alerts

Subscribe to zeitgeist alerts.

```http
POST /zeitgeist/subscribe
```

#### Request Body

```json
{
  "filters": {
    "categories": ["technology", "innovation"],
    "minMomentum": 60
  },
  "alertTypes": ["rapid_rise", "consensus_shift", "new_emergence"],
  "webhookUrl": "https://your-webhook.com/zeitgeist",
  "realtime": true
}
```

## Memory Drift Alert API

### Check Domain for Drift

Check a specific domain for memory drift.

```http
POST /drift/check/{domain}
```

#### Response

```json
{
  "success": true,
  "data": {
    "domain": "openai.com",
    "timestamp": "2025-08-04T12:00:00Z",
    "driftDetected": true,
    "driftScore": 35.5,
    "alerts": [
      {
        "id": "drift_123",
        "severity": "medium",
        "type": "temporal",
        "score": 35.5,
        "detectedAt": "2025-08-04T12:00:00Z",
        "affectedProviders": [
          {
            "provider": "llama-3",
            "driftScore": 45.2,
            "specificDrifts": [
              {
                "type": "temporal",
                "description": "Outdated leadership information",
                "llmBelief": "Sam Altman is CEO",
                "reality": "New CEO announced",
                "evidence": ["https://official-source.com"],
                "severity": "medium"
              }
            ]
          }
        ],
        "recommendedActions": [
          {
            "type": "content_update",
            "priority": "high",
            "description": "Publish updated content with current information",
            "automatable": false,
            "estimatedTime": "2-4 hours"
          }
        ]
      }
    ],
    "performanceMetrics": {
      "checkDuration": 3421,
      "providersChecked": 11,
      "realitySourcesUsed": 3
    }
  }
}
```

### Get Active Alerts

Get all active drift alerts.

```http
GET /drift/alerts
```

### Acknowledge Alert

Acknowledge a drift alert.

```http
POST /drift/alerts/{alertId}/acknowledge
```

#### Request Body

```json
{
  "acknowledgedBy": "user@example.com"
}
```

### Resolve Alert

Mark an alert as resolved.

```http
POST /drift/alerts/{alertId}/resolve
```

#### Request Body

```json
{
  "resolvedBy": "user@example.com",
  "method": "content_published",
  "notes": "Updated website with current information"
}
```

### Add Domain to Monitoring

Add a domain to drift monitoring.

```http
POST /drift/domains
```

#### Request Body

```json
{
  "domain": "example.com",
  "priority": "high",
  "checkFrequency": 300000,
  "specificChecks": ["temporal", "financial"]
}
```

### Get Drift Trends

Get historical drift trends for a domain.

```http
GET /drift/trends/{domain}?days=30
```

### Get Drift Report

Generate a drift report for a time period.

```http
GET /drift/report?startDate=2025-07-01&endDate=2025-08-01
```

## WebSocket Endpoints

All three APIs support real-time updates via WebSocket:

### Consensus WebSocket

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/api/v1/consensus/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle consensus updates
});

// Subscribe to domain updates
ws.send(JSON.stringify({
  type: 'subscribe:priority',
  domain: 'openai.com'
}));
```

### Zeitgeist WebSocket

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/api/v1/zeitgeist/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle trend updates
});
```

### Drift Alert WebSocket

```javascript
const ws = new WebSocket('wss://api.yourdomain.com/api/v1/drift/ws');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle drift alerts
});
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE" // Optional error code
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Rate Limiting

API rate limits:
- **Consensus API**: 100 requests per minute
- **Zeitgeist API**: 1000 requests per minute
- **Drift Alert API**: 500 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1628856000
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { DomainProcessorClient } from '@yourdomain/sdk';

const client = new DomainProcessorClient({
  apiKey: 'YOUR_API_KEY'
});

// Get consensus
const consensus = await client.consensus.get({
  domain: 'openai.com',
  includeMetadata: true
});

// Monitor zeitgeist
const trends = await client.zeitgeist.getTrends({
  timeRange: 'day',
  minMomentum: 50
});

// Check for drift
const driftCheck = await client.drift.checkDomain('openai.com');
```

### Python

```python
from domain_processor import Client

client = Client(api_key='YOUR_API_KEY')

# Get consensus
consensus = client.consensus.get(
    domain='openai.com',
    include_metadata=True
)

# Subscribe to drift alerts
subscription = client.drift.subscribe(
    webhook_url='https://your-webhook.com',
    severity_filter=['high', 'critical']
)
```

## Best Practices

1. **Caching**: Consensus responses are cached for 1 hour by default. Use `realtime: true` only when necessary.

2. **Batch Requests**: Use batch endpoints when checking multiple domains to reduce API calls.

3. **WebSocket Connections**: Maintain persistent WebSocket connections for real-time updates instead of polling.

4. **Error Handling**: Implement exponential backoff for retries on 5xx errors.

5. **Monitoring**: Subscribe to drift alerts for critical domains to maintain data accuracy.

## Support

For API support:
- Email: api-support@yourdomain.com
- Documentation: https://docs.yourdomain.com
- Status Page: https://status.yourdomain.com
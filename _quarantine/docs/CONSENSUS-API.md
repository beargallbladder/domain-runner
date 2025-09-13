# LLM Consensus API Documentation

## Overview

The LLM Consensus API provides aggregated opinions from 11+ LLM providers about any domain. It calculates consensus scores, detects outliers, and measures convergence to give you a comprehensive view of what AI collectively thinks.

**Base URL:** `https://domain-runner.onrender.com`

## Authentication

All requests require API key authentication:
```
X-API-Key: YOUR_API_KEY
```

### Access Tiers
- **Partner** (Free tier): 100 requests/day, basic consensus only
- **Premium**: 5,000 requests/day, full analysis
- **Enterprise**: Unlimited, real-time WebSocket updates

## Endpoints

### 1. Get Domain Consensus

Get consensus analysis for a specific domain across all LLM providers.

```
GET /api/v2/consensus/{domain}
```

#### Parameters
- `domain` (path, required): Domain to analyze (e.g., "openai.com")
- `forceRefresh` (query, optional): Skip cache and recalculate (true/false)
- `includeResponseText` (query, optional): Include raw LLM responses (true/false)
- `providers` (query, optional): Comma-separated list of specific providers

#### Example Request
```bash
curl -X GET "https://domain-runner.onrender.com/api/v2/consensus/openai.com" \
  -H "X-API-Key: YOUR_API_KEY"
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "domain": "openai.com",
    "consensusScore": 95.8,
    "confidence": 0.92,
    "sentiment": "positive",
    "totalProviders": 11,
    "respondingProviders": 11,
    "opinions": [
      {
        "provider": "anthropic",
        "model": "claude-3",
        "score": 94.5,
        "sentiment": "positive",
        "confidence": 0.95,
        "lastUpdated": "2025-08-04T23:30:00Z"
      },
      {
        "provider": "google",
        "model": "gemini-1.5",
        "score": 96.2,
        "sentiment": "positive",
        "confidence": 0.93,
        "lastUpdated": "2025-08-04T23:30:00Z"
      }
    ],
    "outliers": [
      {
        "provider": "groq",
        "deviation": 8.3,
        "zScore": 2.1,
        "isOutlier": false,
        "reason": "Within normal range"
      }
    ],
    "convergence": 0.88,
    "lastUpdated": "2025-08-04T23:30:00Z",
    "metadata": {
      "calculationTime": 125,
      "cacheHit": false,
      "version": "1.0.0"
    }
  },
  "meta": {
    "api_version": "2.0",
    "endpoint": "consensus"
  }
}
```

### 2. Batch Consensus

Get consensus for multiple domains in a single request.

```
POST /api/v2/consensus/batch
```

#### Request Body
```json
{
  "domains": ["openai.com", "anthropic.com", "google.com"],
  "forceRefresh": false,
  "includeResponseText": false
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "openai.com": { /* consensus result */ },
    "anthropic.com": { /* consensus result */ },
    "google.com": { /* consensus result */ }
  },
  "meta": {
    "requested": 3,
    "successful": 3,
    "failed": 0
  }
}
```

### 3. Consensus Trend

Get historical consensus trend for a domain.

```
GET /api/v2/consensus/{domain}/trend
```

#### Parameters
- `domain` (path, required): Domain to analyze
- `days` (query, optional): Number of days to look back (default: 30, max: 365)

#### Example Response
```json
{
  "success": true,
  "data": {
    "domain": "openai.com",
    "period": "30 days",
    "trend": [
      {
        "date": "2025-08-04",
        "avg_score": 95.8,
        "providers": 11,
        "score_variance": 2.3
      },
      {
        "date": "2025-08-03",
        "avg_score": 95.2,
        "providers": 11,
        "score_variance": 2.1
      }
    ]
  }
}
```

### 4. List Providers

Get list of all LLM providers and their weights in consensus calculation.

```
GET /api/v2/consensus/providers
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "active": [
      {
        "id": "openai",
        "name": "OpenAI",
        "weight": 1.2,
        "status": "active"
      },
      {
        "id": "anthropic",
        "name": "Anthropic",
        "weight": 1.2,
        "status": "active"
      }
    ],
    "planned": [
      {
        "id": "meta-llama",
        "name": "Meta Llama 3.1",
        "status": "planned"
      }
    ]
  },
  "meta": {
    "total_active": 11,
    "total_planned": 5,
    "consensus_algorithm": "weighted_mean_with_outlier_detection"
  }
}
```

### 5. Search with Consensus

Search domains by name with consensus filtering.

```
GET /api/v2/consensus/search
```

#### Parameters
- `q` (query, required): Search query
- `limit` (query, optional): Max results (default: 50, max: 100)
- `minScore` (query, optional): Minimum consensus score (0-100)
- `sentiment` (query, optional): Filter by sentiment (positive/negative/neutral/mixed)

#### Example Request
```bash
curl -X GET "https://domain-runner.onrender.com/api/v2/consensus/search?q=ai&minScore=80" \
  -H "X-API-Key: YOUR_API_KEY"
```

## Response Fields

### ConsensusResult Object

| Field | Type | Description |
|-------|------|-------------|
| `domain` | string | The analyzed domain |
| `consensusScore` | number | Weighted average score (0-100) |
| `confidence` | number | Confidence in consensus (0-1) |
| `sentiment` | string | Overall sentiment: positive/negative/neutral/mixed |
| `totalProviders` | number | Total number of LLM providers |
| `respondingProviders` | number | Providers that had data for this domain |
| `convergence` | number | How much LLMs agree (0-1, higher = more agreement) |
| `opinions` | array | Individual LLM opinions |
| `outliers` | array | Statistical outlier analysis |

### Opinion Object

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | LLM provider ID |
| `model` | string | Specific model used |
| `score` | number | Provider's score (0-100) |
| `sentiment` | string | Provider's sentiment |
| `confidence` | number | Provider's confidence (0-1) |
| `lastUpdated` | string | ISO timestamp of last update |

### Outlier Object

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider ID |
| `deviation` | number | Absolute deviation from consensus |
| `zScore` | number | Statistical z-score |
| `isOutlier` | boolean | Whether this is a statistical outlier |
| `reason` | string | Human-readable explanation |

## WebSocket Real-Time Updates

Enterprise customers can receive real-time consensus updates via WebSocket.

```javascript
const ws = new WebSocket('wss://domain-runner.onrender.com/ws/realtime');

ws.on('open', () => {
  // Subscribe to consensus updates for specific domain
  ws.send(JSON.stringify({
    type: 'subscribe:consensus',
    domain: 'openai.com'
  }));
});

ws.on('message', (data) => {
  const update = JSON.parse(data);
  if (update.type === 'consensus:update') {
    console.log('New consensus:', update.data);
  }
});
```

## Rate Limits

| Tier | Requests/Hour | Requests/Day | Batch Size |
|------|---------------|--------------|------------|
| Partner | 100 | 1,000 | 10 domains |
| Premium | 1,000 | 10,000 | 50 domains |
| Enterprise | Unlimited | Unlimited | 100 domains |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request parameters |
| 401 | Missing or invalid API key |
| 403 | Exceeded tier limits |
| 404 | Domain not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

## Code Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

async function getConsensus(domain) {
  try {
    const response = await axios.get(
      `https://domain-runner.onrender.com/api/v2/consensus/${domain}`,
      {
        headers: {
          'X-API-Key': 'YOUR_API_KEY'
        }
      }
    );
    
    const consensus = response.data.data;
    console.log(`${domain} consensus: ${consensus.consensusScore}`);
    console.log(`Confidence: ${consensus.confidence}`);
    console.log(`${consensus.respondingProviders}/${consensus.totalProviders} LLMs responded`);
    
    // Check for outliers
    const outliers = consensus.outliers.filter(o => o.isOutlier);
    if (outliers.length > 0) {
      console.log('Outlier opinions detected:', outliers);
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python
```python
import requests

def get_consensus(domain):
    url = f"https://domain-runner.onrender.com/api/v2/consensus/{domain}"
    headers = {"X-API-Key": "YOUR_API_KEY"}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()["data"]
        print(f"{domain} consensus: {data['consensusScore']}")
        print(f"Convergence: {data['convergence']}")
        
        # Show individual opinions
        for opinion in data["opinions"]:
            print(f"  {opinion['provider']}: {opinion['score']} ({opinion['sentiment']})")
    else:
        print(f"Error: {response.status_code}")
```

### React Hook
```jsx
import { useState, useEffect } from 'react';

function useConsensus(domain) {
  const [consensus, setConsensus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!domain) return;
    
    fetch(`/api/v2/consensus/${domain}`, {
      headers: { 'X-API-Key': process.env.REACT_APP_API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        setConsensus(data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [domain]);
  
  return { consensus, loading, error };
}
```

## Use Cases

1. **Brand Monitoring**: Track what AI collectively thinks about your brand
2. **Competitive Analysis**: Compare consensus scores across competitors
3. **Market Research**: Identify sentiment trends in industries
4. **Risk Detection**: Spot outlier opinions that might indicate issues
5. **Investment Analysis**: Monitor AI perception of companies

## Best Practices

1. **Cache responses** for at least 1 hour to reduce API calls
2. **Use batch endpoint** when analyzing multiple domains
3. **Monitor outliers** - they often indicate emerging issues
4. **Track convergence** - low convergence means LLMs disagree
5. **Subscribe to WebSocket** for real-time monitoring (Enterprise)

---

The Consensus API is the only way to understand what AI collectively thinks about any domain. No single LLM tells the whole story - true intelligence emerges from the consensus.
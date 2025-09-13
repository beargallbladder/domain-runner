# Domain Runner API Documentation

## Overview

The Domain Runner platform provides AI-powered brand intelligence through a comprehensive API ecosystem. This documentation covers all available endpoints, authentication methods, and integration patterns.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Public API     │    │   Database      │
│   (React)       │◄──►│   (FastAPI)      │◄──►│   (PostgreSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservices Layer                          │
├─────────────────┬─────────────────┬─────────────────┬──────────┤
│ Domain          │ Embedding       │ Intelligence    │ Monitoring│
│ Processor       │ Engine          │ Services        │ Services  │
│ (TypeScript)    │ (Python)        │ (TypeScript)    │ (Various) │
└─────────────────┴─────────────────┴─────────────────┴──────────┘
```

## Base URLs

- **Production**: `https://llmrank.io`
- **Development**: `https://llm-pagerank-public-api.onrender.com`

## Authentication

Currently, the public API endpoints do not require authentication. Premium features will require API keys in future versions.

## Public API Endpoints

### Health Check

```http
GET /health
```

Returns the health status of the API and database.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "monitoring_stats": {
    "domains_monitored": 3235,
    "high_risk_domains": 42,
    "low_memory_domains": 156,
    "declining_domains": 23,
    "last_update": "2025-07-20T17:30:00.000Z"
  }
}
```

### Domain Intelligence

```http
GET /api/domains/{domain}/public
```

Get comprehensive AI intelligence data for a specific domain.

**Parameters:**
- `domain` (string): The domain name (e.g., "google.com")
- `include_alerts` (boolean, optional): Include risk alerts (default: true)

**Example Request:**
```bash
curl "https://llmrank.io/api/domains/google.com/public?include_alerts=true"
```

**Response:**
```json
{
  "domain": "google.com",
  "ai_intelligence": {
    "memory_score": 89.2,
    "ai_consensus": 85.7,
    "cohesion": 0.92,
    "models_tracking": 15,
    "response_count": 450,
    "trend": "improving"
  },
  "business_profile": {
    "category": "technology",
    "market_position": "market_leader",
    "key_themes": ["search", "cloud", "ai", "productivity", "innovation"],
    "reputation": "low"
  },
  "competitive_analysis": {
    "ai_visibility_rank": "top_25%",
    "brand_clarity": "high",
    "perception_stability": "stable"
  },
  "updated_at": "2025-07-20T17:15:00.000Z"
}
```

### Domain Rankings

```http
GET /api/rankings
```

Get paginated domain rankings with search and sorting capabilities.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Results per page (max: 100, default: 50)
- `search` (string): Search term to filter domains
- `sort` (string): Sort by "score", "domain", or "consensus" (default: "score")

**Example Request:**
```bash
curl "https://llmrank.io/api/rankings?page=1&limit=10&sort=score&search=tech"
```

**Response:**
```json
{
  "domains": [
    {
      "domain": "google.com",
      "score": 89.2,
      "trend": "+2.3%",
      "modelsPositive": 12,
      "modelsNeutral": 2,
      "modelsNegative": 1
    }
  ],
  "totalDomains": 3235,
  "totalPages": 324,
  "currentPage": 1
}
```

### Domain Categories

```http
GET /api/categories
```

Get domain performance organized by business categories.

**Response:**
```json
{
  "categories": [
    {
      "name": "Technology",
      "totalDomains": 15,
      "averageScore": 82.4,
      "topDomains": [
        {
          "domain": "google.com",
          "score": 89.2,
          "modelsPositive": 12,
          "modelsNeutral": 2,
          "modelsNegative": 1
        }
      ]
    }
  ]
}
```

### Risk Dashboard

```http
GET /api/fire-alarm-dashboard
```

Get high-risk domains for monitoring.

**Query Parameters:**
- `limit` (integer): Maximum domains to return (max: 100, default: 20)

**Response:**
```json
{
  "dashboard_type": "risk_monitoring",
  "total_domains": 42,
  "scan_time": "2025-07-20T17:30:00.000Z",
  "high_risk_domains": [
    {
      "domain": "risky-domain.com",
      "memory_score": 23.1,
      "reputation_risk": "high",
      "ai_consensus": 15.2,
      "models_tracking": 8,
      "trend": "declining"
    }
  ]
}
```

### Platform Statistics

```http
GET /api/stats
```

Get overall platform statistics and performance metrics.

**Response:**
```json
{
  "platform_stats": {
    "total_domains": 3235,
    "average_memory_score": 67.3,
    "total_ai_responses": 145125,
    "critical_risk_domains": 42,
    "high_risk_domains": 42,
    "last_updated": "2025-07-20T17:30:00.000Z"
  },
  "top_performers": [
    {
      "domain": "google.com",
      "memory_score": 89.2,
      "models_tracking": 15,
      "reputation_risk": "low"
    }
  ],
  "data_freshness": "Updated every 6 hours",
  "coverage": "3235 domains across 35+ AI models"
}
```

## Internal Service APIs

### Sophisticated Runner Service

**Base URL**: `https://sophisticated-runner.onrender.com`

#### Process Pending Domains

```http
POST /process-pending-domains
```

Triggers processing of pending domains through all LLM providers.

**Response:**
```json
{
  "message": "Processing started",
  "status": "accepted",
  "timestamp": "2025-07-20T17:30:00.000Z",
  "batchSize": 50
}
```

#### Ultra-Fast Processing

```http
POST /ultra-fast-process
```

High-performance batch processing endpoint for rapid domain analysis.

**Headers:**
- `x-worker-index` (optional): Worker identifier for load balancing
- `x-batch-size` (optional): Custom batch size (max: 100)

**Response:**
```json
{
  "processed": 47,
  "total": 50,
  "timestamp": "2025-07-20T17:30:00.000Z",
  "message": "Ultra-fast processing completed: 47/50 domains"
}
```

#### API Key Status

```http
GET /api-keys
```

Check the status of configured LLM provider API keys.

**Response:**
```json
{
  "keys": {
    "openai": true,
    "anthropic": true,
    "deepseek": true,
    "mistral": true,
    "xai": true,
    "together": true,
    "perplexity": true,
    "google": true
  },
  "workingKeys": 8,
  "timestamp": "2025-07-20T17:30:00.000Z"
}
```

#### Provider Usage

```http
GET /provider-usage
```

Monitor LLM provider usage statistics and performance.

**Response:**
```json
{
  "usage": {
    "openai": {
      "calls": 1250,
      "errors": 3,
      "lastCall": 1721493000000
    },
    "anthropic": {
      "calls": 890,
      "errors": 0,
      "lastCall": 1721492850000
    }
  },
  "timestamp": "2025-07-20T17:30:00.000Z"
}
```

## Error Handling

### Standard Error Response

All endpoints return errors in the following format:

```json
{
  "detail": "Error description",
  "status_code": 400
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `202 Accepted`: Request accepted for processing
- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Public endpoints**: 100 requests per minute per IP
- **Processing endpoints**: 10 requests per minute per IP
- **Search endpoints**: 50 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1721493600
```

## Data Models

### Domain Intelligence Object

```typescript
interface DomainIntelligence {
  domain: string;
  ai_intelligence: {
    memory_score: number;        // 0-100 scale
    ai_consensus: number;        // Percentage agreement across models
    cohesion: number;           // 0-1 scale for response consistency
    models_tracking: number;     // Number of AI models tracking this domain
    response_count: number;      // Total AI responses collected
    trend: "improving" | "declining" | "stable";
  };
  business_profile: {
    category: string;           // Business category
    market_position: string;    // Market position assessment
    key_themes: string[];       // Key themes identified by AI
    reputation: "low" | "medium" | "high"; // Risk level
  };
  competitive_analysis: {
    ai_visibility_rank: string;     // Ranking tier
    brand_clarity: "high" | "low";  // Brand message clarity
    perception_stability: "stable" | "volatile"; // Perception consistency
  };
  updated_at: string; // ISO timestamp
}
```

### Processing Configuration

```typescript
interface ProcessingConfig {
  BATCH_SIZE: 50;              // Standard batch size
  MAX_BATCH_SIZE: 100;         // Maximum batch size for ultra-fast processing
  TIMEOUT_MS: 300000;          // Request timeout (5 minutes)
  MAX_RETRIES: 3;              // Maximum retry attempts
  RATE_LIMIT_DELAY: 500;       // Delay between requests (ms)
  CONCURRENT_REQUESTS: 30;      // Maximum concurrent workers
}
```

## SDKs and Integration Examples

### JavaScript/TypeScript

```javascript
class DomainRunnerClient {
  constructor(baseUrl = 'https://llmrank.io') {
    this.baseUrl = baseUrl;
  }

  async getDomainIntelligence(domain) {
    const response = await fetch(`${this.baseUrl}/api/domains/${domain}/public`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  async getRankings(options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      sort: options.sort || 'score',
      ...(options.search && { search: options.search })
    });
    
    const response = await fetch(`${this.baseUrl}/api/rankings?${params}`);
    return response.json();
  }
}

// Usage
const client = new DomainRunnerClient();
const intel = await client.getDomainIntelligence('google.com');
```

### Python

```python
import requests
from typing import Dict, Any, Optional

class DomainRunnerClient:
    def __init__(self, base_url: str = "https://llmrank.io"):
        self.base_url = base_url
        self.session = requests.Session()
    
    def get_domain_intelligence(self, domain: str, include_alerts: bool = True) -> Dict[str, Any]:
        url = f"{self.base_url}/api/domains/{domain}/public"
        params = {"include_alerts": include_alerts}
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_rankings(self, page: int = 1, limit: int = 50, 
                    sort: str = "score", search: Optional[str] = None) -> Dict[str, Any]:
        url = f"{self.base_url}/api/rankings"
        params = {
            "page": page,
            "limit": limit,
            "sort": sort
        }
        if search:
            params["search"] = search
        
        response = self.session.get(url, params=params)
        response.raise_for_status()
        return response.json()

# Usage
client = DomainRunnerClient()
intel = client.get_domain_intelligence("google.com")
```

### cURL Examples

```bash
# Get domain intelligence
curl -X GET "https://llmrank.io/api/domains/google.com/public" \
  -H "Accept: application/json"

# Search rankings
curl -X GET "https://llmrank.io/api/rankings?search=tech&sort=score&limit=10" \
  -H "Accept: application/json"

# Get platform stats
curl -X GET "https://llmrank.io/api/stats" \
  -H "Accept: application/json"

# Trigger domain processing (internal)
curl -X POST "https://sophisticated-runner.onrender.com/process-pending-domains" \
  -H "Content-Type: application/json"
```

## WebSocket Support (Future)

Real-time updates for domain scores and risk alerts will be available via WebSocket:

```javascript
const ws = new WebSocket('wss://llmrank.io/ws');
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Domain update:', update);
};
```

## Webhooks (Future)

Register webhooks to receive notifications for domain events:

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["domain_risk_alert", "score_change"],
  "secret": "your-webhook-secret"
}
```

## Support

- **Documentation**: [GitHub Wiki](https://github.com/samkim/domain-runner/wiki)
- **Issues**: [GitHub Issues](https://github.com/samkim/domain-runner/issues)
- **Email**: support@llmrank.io

---

*Last updated: July 20, 2025*
# 🚀 Domain Intelligence API - Complete Documentation

## 🎯 Overview
Complete API documentation for the Domain Intelligence System with tensor analysis, sentiment data, and real-time monitoring capabilities.

**Base URL**: `https://llm-pagerank-public-api.onrender.com`  
**Authentication**: API Key required in header
**Rate Limit**: 1000 requests/hour per key
**Response Format**: JSON

---

## 🔑 Authentication

All API requests require an API key in the header:

```bash
curl -H "X-API-Key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     "https://llm-pagerank-public-api.onrender.com/api/endpoint"
```

---

## 📊 Core Endpoints

### 1. **Domain Analysis**

#### Get Domain Intelligence
```http
GET /api/domains/{domain}
```

**Parameters:**
- `domain` (string): Domain name (e.g., "google.com")

**Response:**
```json
{
  "domain": "google.com",
  "status": "completed",
  "last_updated": "2025-07-10T05:25:44Z",
  "intelligence": {
    "business_analysis": "Leading technology company...",
    "content_strategy": "Focus on user experience...",
    "technical_assessment": "Advanced infrastructure..."
  },
  "sentiment_data": {
    "overall_score": 0.85,
    "positive_indicators": ["innovation", "user-friendly", "reliable"],
    "negative_indicators": ["privacy concerns"],
    "confidence": 0.92
  },
  "tensor_features": {
    "embedding_vector": [0.123, 0.456, ...],
    "similarity_cluster": 3,
    "quality_score": 0.94
  },
  "metadata": {
    "processing_time_ms": 1250,
    "model_used": "gpt-4o-mini",
    "data_freshness": "recent"
  }
}
```

#### Batch Domain Analysis
```http
POST /api/domains/batch
```

**Request Body:**
```json
{
  "domains": ["google.com", "microsoft.com", "apple.com"],
  "include_sentiment": true,
  "include_tensors": true
}
```

**Response:**
```json
{
  "results": [
    {
      "domain": "google.com",
      "status": "success",
      "data": { /* domain analysis */ }
    }
  ],
  "summary": {
    "total_requested": 3,
    "successful": 3,
    "failed": 0,
    "processing_time_ms": 3450
  }
}
```

### 2. **Sentiment Analysis**

#### Domain Sentiment Score
```http
GET /api/sentiment/{domain}
```

**Response:**
```json
{
  "domain": "google.com",
  "sentiment": {
    "overall_score": 0.85,
    "sentiment_breakdown": {
      "positive": 0.70,
      "neutral": 0.25,
      "negative": 0.05
    },
    "key_themes": {
      "innovation": 0.92,
      "user_experience": 0.88,
      "privacy": 0.23
    },
    "sentiment_trends": {
      "last_7_days": 0.83,
      "last_30_days": 0.81,
      "trend": "improving"
    },
    "confidence_score": 0.94,
    "analysis_depth": "comprehensive"
  }
}
```

#### Bulk Sentiment Analysis
```http
POST /api/sentiment/bulk
```

**Request Body:**
```json
{
  "domains": ["domain1.com", "domain2.com"],
  "analysis_type": "comprehensive",
  "include_trends": true
}
```

#### Sentiment Comparison
```http
GET /api/sentiment/compare?domains=google.com,microsoft.com
```

**Response:**
```json
{
  "comparison": {
    "google.com": 0.85,
    "microsoft.com": 0.82
  },
  "relative_analysis": {
    "leader": "google.com",
    "difference": 0.03,
    "significance": "moderate"
  }
}
```

### 3. **Tensor & AI Analysis**

#### Tensor Similarity
```http
GET /api/tensors/similarity/{domain1}/{domain2}
```

**Response:**
```json
{
  "domain1": "google.com",
  "domain2": "microsoft.com",
  "similarity_score": 0.78,
  "similarity_metrics": {
    "cosine_similarity": 0.78,
    "euclidean_distance": 0.45,
    "pearson_correlation": 0.82
  },
  "cluster_analysis": {
    "same_cluster": true,
    "cluster_id": 3,
    "cluster_confidence": 0.91
  }
}
```

#### Domain Clustering
```http
GET /api/tensors/clusters
```

**Response:**
```json
{
  "clusters": [
    {
      "cluster_id": 1,
      "cluster_name": "Technology Giants",
      "domains": ["google.com", "microsoft.com", "apple.com"],
      "centroid_features": [0.123, 0.456, ...],
      "coherence_score": 0.89
    }
  ],
  "clustering_metadata": {
    "algorithm": "k-means",
    "num_clusters": 8,
    "silhouette_score": 0.72
  }
}
```

#### Nearest Neighbors
```http
GET /api/tensors/neighbors/{domain}?limit=5
```

**Response:**
```json
{
  "domain": "google.com",
  "neighbors": [
    {
      "domain": "microsoft.com",
      "similarity": 0.78,
      "distance": 0.22
    },
    {
      "domain": "apple.com", 
      "similarity": 0.74,
      "distance": 0.26
    }
  ]
}
```

### 4. **Search & Discovery**

#### Search Domains
```http
GET /api/search?q=technology&sentiment_min=0.7&limit=20
```

**Parameters:**
- `q`: Search query
- `sentiment_min`: Minimum sentiment score (0-1)
- `sentiment_max`: Maximum sentiment score (0-1)
- `cluster_id`: Specific cluster
- `limit`: Results limit (default: 10, max: 100)

**Response:**
```json
{
  "query": "technology",
  "results": [
    {
      "domain": "google.com",
      "relevance_score": 0.95,
      "sentiment_score": 0.85,
      "match_reasons": ["business focus", "content themes"]
    }
  ],
  "pagination": {
    "total": 1247,
    "page": 1,
    "per_page": 20,
    "has_next": true
  }
}
```

#### Advanced Filters
```http
POST /api/search/advanced
```

**Request Body:**
```json
{
  "filters": {
    "sentiment_range": [0.7, 1.0],
    "cluster_ids": [1, 3, 5],
    "keywords": ["innovation", "technology"],
    "exclude_domains": ["example.com"],
    "data_freshness": "recent"
  },
  "sort": {
    "field": "sentiment_score",
    "order": "desc"
  },
  "pagination": {
    "page": 1,
    "limit": 50
  }
}
```

### 5. **Rankings & Leaderboards**

#### Top Domains by Sentiment
```http
GET /api/rankings/sentiment?limit=100&category=technology
```

#### Trending Domains
```http
GET /api/rankings/trending?timeframe=7d
```

#### Custom Rankings
```http
POST /api/rankings/custom
```

**Request Body:**
```json
{
  "metrics": ["sentiment_score", "tensor_quality"],
  "weights": [0.7, 0.3],
  "filters": {
    "min_sentiment": 0.6
  },
  "limit": 50
}
```

### 6. **Real-time Data**

#### Live Processing Status
```http
GET /api/status/processing
```

**Response:**
```json
{
  "status": "active",
  "queue": {
    "pending": 13,
    "processing": 5,
    "completed_today": 3226
  },
  "performance": {
    "domains_per_minute": 100,
    "avg_processing_time_ms": 1250,
    "success_rate": 0.97
  },
  "last_updated": "2025-07-10T05:25:44Z"
}
```

#### System Health
```http
GET /api/status/health
```

**Response:**
```json
{
  "status": "healthy",
  "components": {
    "database": "operational",
    "ai_models": "operational", 
    "tensor_engine": "operational",
    "sentiment_analyzer": "operational"
  },
  "performance_metrics": {
    "response_time_ms": 245,
    "memory_usage": "1.2GB/2.0GB",
    "cache_hit_rate": 0.78
  }
}
```

### 7. **Webhooks & Notifications**

#### Register Webhook
```http
POST /api/webhooks
```

**Request Body:**
```json
{
  "url": "https://yourapi.com/webhook",
  "events": ["domain_processed", "sentiment_updated"],
  "secret": "your_webhook_secret"
}
```

#### Webhook Payload Example
```json
{
  "event": "domain_processed",
  "timestamp": "2025-07-10T05:25:44Z",
  "data": {
    "domain": "google.com",
    "sentiment_score": 0.85,
    "processing_time_ms": 1250
  },
  "signature": "sha256=..."
}
```

---

## 📊 Data Export Formats

### CSV Export
```http
GET /api/export/csv?domains=google.com,microsoft.com&fields=domain,sentiment_score,tensor_quality
```

### JSON Export
```http
GET /api/export/json?format=detailed&limit=1000
```

### Real-time Stream
```http
GET /api/stream/domains
```
WebSocket connection for real-time domain processing updates.

---

## 🔧 Advanced Features

### 1. **Custom Analysis**
```http
POST /api/analysis/custom
```

**Request Body:**
```json
{
  "domain": "google.com",
  "analysis_types": ["sentiment", "tensor", "competitive"],
  "custom_prompts": {
    "business_focus": "Analyze the company's AI strategy",
    "market_position": "Compare with top 3 competitors"
  }
}
```

### 2. **Batch Processing**
```http
POST /api/batch/process
```

**Request Body:**
```json
{
  "domains": ["domain1.com", "domain2.com", ...],
  "priority": "high",
  "notification_webhook": "https://yourapi.com/webhook",
  "analysis_depth": "comprehensive"
}
```

### 3. **Analytics Dashboard Data**
```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "summary": {
    "total_domains": 3226,
    "avg_sentiment": 0.72,
    "processing_rate": "100 domains/minute"
  },
  "charts": {
    "sentiment_distribution": { /* chart data */ },
    "cluster_breakdown": { /* chart data */ },
    "processing_trends": { /* chart data */ }
  }
}
```

---

## 📈 Rate Limits & Quotas

| Endpoint Type | Rate Limit | Burst Limit |
|---------------|------------|-------------|
| Domain Analysis | 100/hour | 10/minute |
| Sentiment Analysis | 200/hour | 20/minute |
| Tensor Operations | 50/hour | 5/minute |
| Search | 500/hour | 50/minute |
| Exports | 20/hour | 2/minute |

---

## 🔐 API Key Management

### Generate New Key
```http
POST /api/auth/keys
```

### List Keys
```http
GET /api/auth/keys
```

### Revoke Key
```http
DELETE /api/auth/keys/{key_id}
```

---

## 📚 SDKs & Libraries

### Python SDK
```python
from domain_intelligence import DomainAPI

client = DomainAPI(api_key="your_key")
result = client.get_domain_analysis("google.com", include_sentiment=True)
```

### JavaScript SDK
```javascript
import { DomainAPI } from '@domain-intelligence/api';

const client = new DomainAPI({ apiKey: 'your_key' });
const result = await client.getDomainAnalysis('google.com');
```

### cURL Examples
```bash
# Get domain analysis
curl -H "X-API-Key: your_key" \
     "https://llm-pagerank-public-api.onrender.com/api/domains/google.com"

# Bulk sentiment analysis
curl -X POST \
     -H "X-API-Key: your_key" \
     -H "Content-Type: application/json" \
     -d '{"domains":["google.com","microsoft.com"]}' \
     "https://llm-pagerank-public-api.onrender.com/api/sentiment/bulk"
```

---

## 🚨 Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "DOMAIN_NOT_FOUND",
    "message": "Domain not found in our database",
    "details": {
      "domain": "nonexistent.com",
      "suggestion": "Try triggering analysis first"
    }
  },
  "request_id": "req_123456789"
}
```

### Common Error Codes
- `INVALID_API_KEY` - API key invalid or expired
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `DOMAIN_NOT_FOUND` - Domain not in database
- `PROCESSING_IN_PROGRESS` - Domain currently being processed
- `INSUFFICIENT_DATA` - Not enough data for analysis

---

## 🎯 Best Practices

1. **Use batch endpoints** for multiple domains
2. **Cache responses** when possible (data updates every 24h)
3. **Handle rate limits** with exponential backoff
4. **Use webhooks** for real-time updates
5. **Include sentiment analysis** for comprehensive insights

---

## 📞 Support & Resources

- **API Status**: https://status.domain-intelligence.com
- **Documentation**: https://docs.domain-intelligence.com
- **Support**: api-support@domain-intelligence.com
- **Rate Limit Help**: Check headers `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

**This API provides complete access to our domain intelligence database with 3,200+ analyzed domains, real-time sentiment analysis, and advanced tensor-based similarity matching.**
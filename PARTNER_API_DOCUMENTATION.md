# 🔑 LLM PageRank Partner API Documentation

## 🎯 Overview

You now have **enterprise-level API access** to the LLM PageRank intelligence platform. This API provides real-time AI brand perception data, domain intelligence, and competitive analysis.

## 🔐 Your API Key

```
API Key: llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9
```

**⚠️ IMPORTANT**: Keep this API key secure. It provides access to your 70,000+ response dataset.

## 🚀 Quick Start

### Authentication
Include your API key in the `X-API-Key` header:

```bash
curl -H 'X-API-Key: llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9' \
     https://www.llmrank.io/api/domains/apple.com/public
```

### JavaScript Example
```javascript
const API_KEY = 'llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9';
const BASE_URL = 'https://www.llmrank.io';

fetch(`${BASE_URL}/api/domains/apple.com/public`, {
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## 📊 Available Endpoints

### 1. Domain Intelligence
**Endpoint**: `GET /api/domains/{domain}/public`

**Description**: Get comprehensive AI brand intelligence for any domain

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     https://www.llmrank.io/api/domains/tesla.com/public
```

**Response**:
```json
{
  "domain": "tesla.com",
  "domain_id": "uuid",
  "ai_intelligence": {
    "memory_score": 85.2,
    "ai_consensus": 0.891,
    "models_tracking": 19,
    "trend": "improving"
  },
  "reputation_alerts": {
    "risk_score": 23.5,
    "threat_level": "low",
    "active_alerts": []
  },
  "brand_intelligence": {
    "primary_focus": "Electric Vehicles",
    "market_position": "Innovation Leader",
    "key_strengths": ["technology", "sustainability", "innovation"]
  },
  "competitive_analysis": {
    "ai_visibility_rank": "top_25%",
    "brand_clarity": "high",
    "perception_stability": "stable"
  }
}
```

### 2. Real-Time Ticker
**Endpoint**: `GET /api/ticker`

**Description**: Live brand volatility feed with temporal derivatives

**Parameters**:
- `limit` (optional): Number of domains to return (default: 5, max: 20)

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     https://www.llmrank.io/api/ticker?limit=10
```

**Response**:
```json
{
  "topDomains": [
    {
      "domain": "openai.com",
      "score": 89.3,
      "trend": [85.1, 86.7, 88.2, 89.3],
      "change": "+4.2%",
      "modelsPositive": 17,
      "modelsNeutral": 2,
      "modelsNegative": 0
    }
  ],
  "lastUpdate": "2025-06-20T20:36:30Z",
  "totalDomains": 1913
}
```

### 3. Domain Rankings
**Endpoint**: `GET /api/rankings`

**Description**: Comprehensive domain rankings with filtering and search

**Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)
- `sort` (optional): Sort by `score`, `consensus`, `trend`, `alphabetical`, `domain`
- `search` (optional): Search term to filter domains

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     'https://www.llmrank.io/api/rankings?limit=20&sort=score'
```

### 4. Fire Alarm Dashboard
**Endpoint**: `GET /api/fire-alarm-dashboard`

**Description**: High-risk domains with active reputation threats

**Parameters**:
- `limit` (optional): Number of domains (default: 20, max: 100)

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     https://www.llmrank.io/api/fire-alarm-dashboard
```

**Response**:
```json
{
  "dashboard_type": "fire_alarm_monitoring",
  "total_alerts": 636,
  "scan_time": "2025-06-20T20:36:30Z",
  "high_risk_domains": [
    {
      "domain": "example.com",
      "reputation_risk": 85.3,
      "threat_level": "high",
      "active_alerts": ["brand_confusion", "perception_decline"],
      "ai_visibility": 45.2,
      "brand_clarity": 0.234
    }
  ]
}
```

### 5. Industry Categories
**Endpoint**: `GET /api/categories`

**Description**: Available industry categories and domain classifications

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     https://www.llmrank.io/api/categories
```

### 6. Health Check
**Endpoint**: `GET /health`

**Description**: API health and system status

**Example**:
```bash
curl -H 'X-API-Key: YOUR_KEY' \
     https://www.llmrank.io/health
```

## 🔒 Security & Rate Limits

### Your API Key Details
- **Tier**: Enterprise
- **Rate Limit**: 50,000 requests/hour
- **Domain Restriction**: llmpagerank.com
- **Expires**: 2026-06-20
- **Usage Tracking**: Enabled

### Security Features
- ✅ API key hashed in database
- ✅ Usage tracking and analytics
- ✅ HTTPS-only endpoints
- ✅ CORS configured for your domains
- ✅ Rate limiting protection

### CORS Domains
Your API key works from these domains:
- `https://llmpagerank.com`
- `https://www.llmpagerank.com`
- `https://app.llmpagerank.com`

## 🏗️ Frontend Integration Guide

### React Example
```jsx
import React, { useState, useEffect } from 'react';

const API_KEY = 'llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9';
const BASE_URL = 'https://www.llmrank.io';

function DomainIntelligence({ domain }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/api/domains/${domain}/public`, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      setData(data);
      setLoading(false);
    })
    .catch(error => {
      console.error('Error:', error);
      setLoading(false);
    });
  }, [domain]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>{data.domain}</h2>
      <p>Memory Score: {data.ai_intelligence.memory_score}</p>
      <p>AI Consensus: {data.ai_intelligence.ai_consensus}</p>
      <p>Models Tracking: {data.ai_intelligence.models_tracking}</p>
    </div>
  );
}
```

### Next.js API Route Example
```javascript
// pages/api/domain/[domain].js
export default async function handler(req, res) {
  const { domain } = req.query;
  
  const response = await fetch(
    `https://www.llmrank.io/api/domains/${domain}/public`,
    {
      headers: {
        'X-API-Key': 'llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9'
      }
    }
  );
  
  const data = await response.json();
  res.status(200).json(data);
}
```

## 📈 Data Overview

### Dataset Statistics
- **70,711 total responses** analyzed
- **3,186 domains** processed
- **19+ AI models** per domain
- **1,913 domains** actively monitored
- **Enterprise-grade** tensor data quality

### Update Frequency
- **Real-time**: Ticker data updates every 30 seconds
- **Daily**: Domain scores and rankings refresh
- **Weekly**: Comprehensive model re-analysis
- **Fresh Data**: Last updated 2025-06-20

## 🎯 Use Cases

### Marketing Website
- Display real-time brand intelligence
- Show competitive rankings
- Fire alarm alerts for reputation risks
- Industry category analysis

### SaaS Dashboard
- User domain tracking
- Competitive analysis tools
- Brand monitoring alerts
- API usage analytics

### Partner Integration
- White-label domain intelligence
- Custom brand monitoring
- Competitive intelligence feeds
- Real-time reputation alerts

## 🛠️ Error Handling

### HTTP Status Codes
- `200`: Success
- `401`: Invalid API key
- `403`: Rate limit exceeded
- `404`: Domain not found
- `429`: Too many requests
- `500`: Server error

### Error Response Format
```json
{
  "error": "Invalid API key",
  "code": "INVALID_API_KEY",
  "timestamp": "2025-06-20T20:36:30Z"
}
```

## 📞 Support

### API Issues
- Check API key in request headers
- Verify domain is in our dataset
- Monitor rate limits (50k/hour)
- Ensure HTTPS requests

### Data Questions
- 70K+ response dataset
- 19+ models per domain
- Real-time processing pipeline
- Enterprise-grade accuracy

### Integration Help
- CORS configured for your domains
- Full REST API compatibility
- JSON response format
- Comprehensive error handling

---

**Your API Base URL**: `https://www.llmrank.io`
**Your API Key**: `llmpr_4e8cba54e2b91212a81243d0463133cc1fb2a682d5e911c6417b67e9cbddf8b9`
**Rate Limit**: 50,000 requests/hour
**Expires**: June 20, 2026

🚀 **Ready to build your marketing site with enterprise AI intelligence!** 
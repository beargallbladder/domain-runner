# API Integration Guide for www.llmpagerank.com

## 🔑 Authentication

**Your API Key:** `llmpagerank-2025-neural-gateway`

All API requests must include this key in the header:
```
X-API-Key: llmpagerank-2025-neural-gateway
```

## 🌐 Base URL

```
https://domain-runner.onrender.com
```

## 📊 Available Endpoints

### 1. Get Overall Statistics
**Endpoint:** `GET /api/stats`

**Description:** Returns LIMITED statistics about AI memory rankings. Deep tensor data is NOT included (premium only).

**Request:**
```javascript
fetch('https://domain-runner.onrender.com/api/stats', {
  method: 'GET',
  headers: {
    'X-API-Key': 'llmpagerank-2025-neural-gateway'
  }
})
```

**Response:**
```json
{
  "overview": {
    "totalDomains": 3239,
    "totalProviders": 11,
    "rankingsAvailable": true
  },
  "topDomains": [
    { "domain": "openai.com", "score": "95.8" },
    { "domain": "anthropic.com", "score": "94.2" },
    { "domain": "google.com", "score": "93.5" },
    { "domain": "microsoft.com", "score": "92.1" },
    { "domain": "huggingface.co", "score": "91.7" }
  ],
  "notice": "Full tensor analysis available via premium API"
}
```

### 2. Get Domain Rankings (List)
**Endpoint:** `GET /api/rankings`

**Query Parameters:**
- `search` (optional): Search for specific domains
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Request:**
```javascript
// Get top 50 rankings
fetch('https://domain-runner.onrender.com/api/rankings', {
  method: 'GET',
  headers: {
    'X-API-Key': 'llmpagerank-2025-neural-gateway'
  }
})

// Search for AI-related domains
fetch('https://domain-runner.onrender.com/api/rankings?search=ai', {
  method: 'GET',
  headers: {
    'X-API-Key': 'llmpagerank-2025-neural-gateway'
  }
})
```

**Response:**
```json
{
  "rankings": [
    {
      "rank": 1,
      "domain": "openai.com",
      "score": 95.8,
      "trend": "stable",
      "lastUpdated": "2025-08-04T12:00:00Z"
    },
    {
      "rank": 2,
      "domain": "anthropic.com",
      "score": 94.2,
      "trend": "rising",
      "lastUpdated": "2025-08-04T12:00:00Z"
    }
  ],
  "total": 3239,
  "limit": 50,
  "offset": 0,
  "notice": "Deep analysis requires premium access"
}
```

### 3. Get Specific Domain Ranking
**Endpoint:** `GET /api/rankings/{domain}`

**Request:**
```javascript
fetch('https://domain-runner.onrender.com/api/rankings/openai.com', {
  method: 'GET',
  headers: {
    'X-API-Key': 'llmpagerank-2025-neural-gateway'
  }
})
```

**Response:**
```json
{
  "domain": "openai.com",
  "rank": 1,
  "score": 95.8,
  "trend": "stable",
  "percentile": 99.9,
  "category": "AI/ML",
  "lastUpdated": "2025-08-04T12:00:00Z",
  "historicalRanks": [
    { "date": "2025-08-03", "rank": 1 },
    { "date": "2025-08-02", "rank": 1 },
    { "date": "2025-08-01", "rank": 2 }
  ],
  "competitors": [
    { "domain": "anthropic.com", "rank": 2 },
    { "domain": "google.com", "rank": 3 }
  ],
  "dataLimitation": "Full tensor analysis available with premium API"
}
```

## 🎨 Frontend Implementation Examples

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

const API_KEY = 'llmpagerank-2025-neural-gateway';
const BASE_URL = 'https://domain-runner.onrender.com';

function DomainRankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/rankings`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      const data = await response.json();
      setRankings(data.rankings);
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchDomain = async (query) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/rankings?search=${encodeURIComponent(query)}`,
        {
          headers: {
            'X-API-Key': API_KEY
          }
        }
      );
      const data = await response.json();
      setRankings(data.rankings);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rankings-container">
      <h2>AI Memory Rankings</h2>
      {loading ? (
        <div>Loading rankings...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Domain</th>
              <th>Score</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map(item => (
              <tr key={item.domain}>
                <td>#{item.rank}</td>
                <td>{item.domain}</td>
                <td>{item.score}</td>
                <td className={`trend-${item.trend}`}>
                  {item.trend === 'rising' ? '📈' : 
                   item.trend === 'falling' ? '📉' : '➡️'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### Vanilla JavaScript Example
```html
<!DOCTYPE html>
<html>
<head>
  <title>LLM Page Rank</title>
</head>
<body>
  <div id="stats-container"></div>
  <input type="text" id="search-input" placeholder="Search domain...">
  <button onclick="searchDomain()">Search</button>
  <div id="rankings-container"></div>

  <script>
    const API_KEY = 'llmpagerank-2025-neural-gateway';
    const BASE_URL = 'https://domain-runner.onrender.com';

    // Load initial stats
    async function loadStats() {
      const response = await fetch(`${BASE_URL}/api/stats`, {
        headers: { 'X-API-Key': API_KEY }
      });
      const data = await response.json();
      
      document.getElementById('stats-container').innerHTML = `
        <h2>Platform Statistics</h2>
        <p>Total Domains: ${data.overview.totalDomains}</p>
        <p>LLM Providers: ${data.overview.totalProviders}</p>
      `;
    }

    // Search for domain
    async function searchDomain() {
      const query = document.getElementById('search-input').value;
      const response = await fetch(
        `${BASE_URL}/api/rankings?search=${encodeURIComponent(query)}`,
        { headers: { 'X-API-Key': API_KEY } }
      );
      const data = await response.json();
      
      const html = data.rankings.map(r => `
        <div class="ranking-item">
          <span>#${r.rank}</span>
          <span>${r.domain}</span>
          <span>Score: ${r.score}</span>
        </div>
      `).join('');
      
      document.getElementById('rankings-container').innerHTML = html;
    }

    // Load on page ready
    loadStats();
  </script>
</body>
</html>
```

## 🚫 Data Limitations (Partner Tier)

As a partner site, you have access to:
- ✅ Basic rankings and scores
- ✅ Domain search functionality
- ✅ Historical rank trends
- ✅ Category classifications

You do NOT have access to:
- ❌ Deep tensor analysis (11 LLM consensus data)
- ❌ Memory drift metrics
- ❌ Timeline analysis
- ❌ Juice scores
- ❌ Crawl priorities
- ❌ Real-time WebSocket updates

## 📈 Rate Limits

- **Requests per hour:** 1000
- **Requests per minute:** 20
- **Burst limit:** 50 requests in 10 seconds

If you exceed these limits, you'll receive a `429 Too Many Requests` response.

## 🔍 Error Handling

```javascript
async function apiRequest(endpoint) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'X-API-Key': API_KEY }
    });
    
    if (response.status === 401) {
      console.error('Invalid API key');
      return null;
    }
    
    if (response.status === 429) {
      console.error('Rate limit exceeded. Please wait.');
      return null;
    }
    
    if (response.status === 404) {
      console.error('Domain not found');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return null;
  }
}
```

## 💡 Best Practices

1. **Cache responses** client-side for at least 5 minutes to reduce API calls
2. **Implement pagination** for large result sets
3. **Show loading states** during API calls
4. **Handle errors gracefully** with user-friendly messages
5. **Use debouncing** for search inputs to avoid excessive API calls

## 🎯 Premium Upsell Opportunities

When displaying LIMITED data, include prompts like:
- "🔒 Deep tensor analysis available with premium access"
- "📊 See how all 11 LLMs rank this domain - Upgrade to Premium"
- "🚀 Get real-time updates with WebSocket access - Premium only"
- "💎 Unlock memory drift analysis - Contact for enterprise access"

## 📞 Support

For technical issues or to upgrade to premium access:
- Email: support@llmrank.io
- Premium access: Visit brandsentiment.io
- Enterprise inquiries: enterprise@llmrank.io

## 🔄 Changelog

- **2025-08-04**: Initial partner API release
- **2025-08-04**: Added search functionality
- **2025-08-04**: Implemented rate limiting

---

**Remember:** This is LIMITED data access only. The deep tensor intelligence and memory drift analysis that makes our system valuable is reserved for premium and enterprise tiers. Your role is to showcase the surface-level rankings and drive interest in the deeper insights available through brandsentiment.io.
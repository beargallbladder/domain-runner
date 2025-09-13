# 🏗️ BACKEND API ARCHITECTURE: Domain Runner as Intelligence Service

## The Complete Picture

Domain Runner is a **backend intelligence engine** that:
1. Crawls 3,239 domains with 11 LLMs weekly
2. Computes memory scores, consensus, and drift
3. Exposes intelligence via REST API
4. Powers the frontend at llmpagerank.com

## 🔐 Current API Architecture

### Public API Service
- **URL**: https://llmrank.io (custom domain)
- **Service**: `/services/public-api/production_api.py`
- **Status**: ✅ RUNNING
- **Database**: Connected, serving data

### Available Endpoints

```bash
# Public Intelligence Endpoints
GET /api/domains/{domain}/public     # Domain intelligence
GET /api/rankings                     # Domain rankings  
GET /api/categories                   # Industry categories
GET /api/fire-alarm-dashboard         # High risk domains
GET /api/ticker                       # Real-time volatility
GET /api/shadows                      # Low memory domains
GET /api/stats                        # Platform statistics

# Health & Status
GET /health                           # Service health
GET /                                 # API status
```

### API Key System

```python
# Partner API keys stored in database
partner_api_keys table:
- api_key_hash (SHA256)
- partner_email 
- partner_domain (llmpagerank.com)
- tier (enterprise)
- rate_limit_per_hour (50,000)
- usage tracking
```

### Authentication
- Header: `X-API-Key: llmpr_[64-char-hex]`
- Domain restriction: Validates requesting domain
- Rate limiting: Per-key limits enforced

## 📊 Current Data Flow

```
Domain Runner Backend                    llmpagerank.com Frontend
┌─────────────────────┐                 ┌──────────────────────┐
│ Weekly Crawl        │                 │                      │
│ (3,239 domains)     │                 │  React/Next.js App   │
│ ↓                   │                 │  ↓                   │
│ 11 LLMs Process     │                 │  API Key Auth        │
│ ↓                   │    REST API    │  ↓                   │
│ Memory Oracle       │◄────────────────│  Fetch Intelligence  │
│ ↓                   │                 │  ↓                   │
│ Tensor Computation  │                 │  Display Dashboard   │
│ ↓                   │                 │                      │
│ PostgreSQL Storage  │                 │                      │
└─────────────────────┘                 └──────────────────────┘
         │
         │ Public API
         ▼
┌─────────────────────┐
│ https://llmrank.io  │
│ FastAPI Service     │
│ - Domain intel      │
│ - Rankings          │
│ - Categories        │
│ - Risk alerts       │
└─────────────────────┘
```

## 🚨 Current Issues for API Consumers

### 1. Stale Data
- Last update: July 9, 2025
- No weekly crawls running
- Memory scores not being recomputed

### 2. Incomplete Intelligence
- Only 8/11 LLMs contributing
- No drift calculations
- No tensor computations

### 3. Missing Advanced Features
```python
# These endpoints should exist but don't:
GET /api/domains/{domain}/drift       # Memory drift over time
GET /api/domains/{domain}/consensus   # LLM agreement analysis  
GET /api/domains/{domain}/tensor      # Raw tensor data
GET /api/intelligence/weekly          # Weekly intelligence report
POST /api/domains/analyze             # On-demand analysis
```

## 🔧 Backend Services Status

| Service | Purpose | Status |
|---------|---------|--------|
| sophisticated-runner | Domain crawling | ✅ Running (8/11 LLMs) |
| public-api | REST API | ✅ Running |
| memory-oracle | Tensor computation | ❌ Not deployed |
| scheduler | Weekly automation | ❌ Not configured |
| drift-detector | Change analysis | ❌ Not built |

## 📈 What the API Should Provide

### Complete Domain Intelligence
```json
{
  "domain": "tesla.com",
  "timestamp": "2025-07-24T08:00:00Z",
  "memory_tensor": {
    "scores": {
      "openai": 95.2,
      "anthropic": 94.8,
      "deepseek": 93.1,
      // ... all 11 LLMs
    },
    "consensus": 0.92,
    "variance": 2.3
  },
  "drift_analysis": {
    "weekly_change": +2.3,
    "monthly_trend": "rising",
    "acceleration": 0.5
  },
  "competitive_position": {
    "category_rank": 1,
    "mindshare": 0.34,
    "competitors": ["rivian.com", "lucidmotors.com"]
  },
  "alerts": [
    {
      "type": "consensus_divergence",
      "severity": "medium",
      "message": "GPT-4 and Claude disagree on recent developments"
    }
  ]
}
```

### Weekly Intelligence Reports
```json
{
  "week_of": "2025-07-21",
  "summary": {
    "domains_analyzed": 3239,
    "llms_active": 11,
    "total_responses": 35629
  },
  "top_movers": {
    "gainers": [
      {"domain": "x.ai", "change": +15.2},
      {"domain": "perplexity.ai", "change": +12.8}
    ],
    "losers": [
      {"domain": "clubhouse.com", "change": -23.4},
      {"domain": "quibi.com", "change": -19.7}
    ]
  },
  "insights": [
    "AI tools showing strongest memory persistence",
    "Social platforms experiencing rapid decay",
    "EV sector maintaining stable mindshare"
  ]
}
```

## 🎯 To Fix the Backend Service

### 1. Complete LLM Coverage
```bash
# Add missing API keys
AI21_API_KEY
PERPLEXITY_API_KEY  
XAI_API_KEY
```

### 2. Deploy Memory Oracle
```yaml
# Add to render.yaml
- type: worker
  name: memory-oracle
  runtime: node
  buildCommand: cd coordination/memory_bank && npm install
  startCommand: node memory-oracle-service.js
```

### 3. Implement Missing Endpoints
```python
@app.get("/api/domains/{domain}/drift")
async def get_domain_drift(domain: str, weeks: int = 4):
    """Get memory drift analysis over time"""
    
@app.get("/api/intelligence/weekly")  
async def get_weekly_intelligence():
    """Get latest weekly intelligence report"""
    
@app.post("/api/domains/analyze")
async def analyze_domain_on_demand(domain: str):
    """Trigger immediate analysis of a domain"""
```

## 💰 The Business Model

The backend service enables:
1. **Enterprise API Access** - Companies monitor their AI perception
2. **Competitive Intelligence** - Track competitor mindshare
3. **SEO/Marketing Tools** - Optimize for AI memory
4. **Risk Monitoring** - Alert on perception shifts

All powered by the weekly crawls and tensor computations that should be running automatically.

## The Bottom Line

You have a working API serving stale data. The frontend at llmpagerank.com is consuming this API but not getting the fresh, complete intelligence it needs because:
- Weekly crawls aren't automated
- 3 LLMs are missing  
- Memory oracle isn't computing tensors
- Advanced endpoints aren't implemented

Fix these backend issues and the API becomes a powerful B2B intelligence service.
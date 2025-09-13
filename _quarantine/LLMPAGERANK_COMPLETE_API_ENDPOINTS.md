# LLMPageRank.com - Complete API Endpoints

## 🚀 **Current Production API Base URL**
- **Primary:** `https://llm-pagerank-public-api.onrender.com`
- **Domain:** `https://llmrank.io` (custom domain)

## 📊 **Core Domain Intelligence Endpoints**

### 1. Domain Intelligence
- **GET** `/api/domains/{domain}/public` - Complete domain intelligence
- **GET** `/api/domains/{domain}/competitive` - Competitive analysis
- **GET** `/api/domains/{domain}/alerts` - Reputation alerts
- **GET** `/api/time-series/{domain}` - Historical trend data
- **GET** `/api/jolt-benchmark/{domain}` - Crisis scenario analysis

### 2. Rankings & Leaderboards
- **GET** `/api/rankings` - Complete domain rankings (paginated, searchable)
- **GET** `/api/fire-alarm-dashboard` - High-risk domains dashboard
- **GET** `/api/ticker` - Real-time top domains ticker
- **GET** `/api/categories` - Industry category groupings
- **GET** `/api/domains` - Domain listing with sorting options

### 3. Trend Analysis
- **GET** `/api/trends/degradation` - Domains losing AI memory
- **GET** `/api/trends/improvement` - Domains gaining AI memory
- **GET** `/api/shadows` - Memory shadows analysis

## 🧠 **NEW: Memory Velocity Intelligence (MUV) Endpoints**

### 4. Memory Update Velocity Analysis
- **GET** `/api/muv/analysis/{domain}` - Memory Update Velocity for specific domain
- **GET** `/api/muv/categories` - MUV categories (fast/slow memory)
- **GET** `/api/muv/arbitrage-opportunities` - Top arbitrage opportunities
- **GET** `/api/muv/institutional-latency` - Institutional bias detection

### 5. Sentiment & Reality Gap Analysis
- **GET** `/api/sentiment/{domain}/enhanced` - AI memory vs reality gap
- **GET** `/api/sentiment/stats` - Sentiment analysis statistics
- **GET** `/api/reality-gap/top-opportunities` - Biggest perception gaps
- **GET** `/api/decay-adjusted-scores` - Decay-adjusted reality gap scores

### 6. Institutional Bias Detection
- **GET** `/api/bias/content-volume-force` - Content volume impact analysis
- **GET** `/api/bias/regulation-force` - Regulatory impact on AI memory
- **GET** `/api/bias/liability-force` - Liability impact on memory updates
- **GET** `/api/bias/institutional-force` - Elite source bias detection

## 🔐 **Authentication & User Management**

### 7. User Authentication
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/login` - User login
- **GET** `/api/auth/profile` - User profile
- **POST** `/api/auth/logout` - User logout

### 8. API Key Management
- **POST** `/api/create-partner-key` - Create partner API key
- **GET** `/api/validate-key` - Validate API key
- **GET** `/api/usage-stats` - API usage statistics

## 📈 **Advanced Analytics Endpoints**

### 9. Competitive Intelligence
- **GET** `/api/competitive/stack-ranking` - Competitive stack ranking
- **GET** `/api/competitive/threat-analysis` - Threat analysis
- **GET** `/api/competitive/market-positioning` - Market position analysis

### 10. Memory Forensics
- **GET** `/api/forensics/memory-drift/{domain}` - Memory drift forensics
- **GET** `/api/forensics/citation-decay/{domain}` - Citation decay analysis
- **GET** `/api/forensics/semantic-fingerprint/{domain}` - Semantic fingerprinting

## 🎯 **Specialized Endpoints**

### 11. Crisis & Risk Management
- **GET** `/api/crisis/fire-alarm-score/{domain}` - Fire alarm scoring
- **GET** `/api/crisis/reputation-alerts` - Real-time reputation alerts
- **GET** `/api/crisis/brand-confusion-alerts` - Brand confusion detection

### 12. Market Intelligence
- **GET** `/api/market/cohort-analysis` - Business model cohorts
- **GET** `/api/market/industry-insights` - Industry-specific insights
- **GET** `/api/market/emergence-detection` - Emerging company detection

## 🔧 **System & Health Endpoints**

### 13. System Status
- **GET** `/health` - System health check
- **GET** `/api/status` - API status with capabilities
- **GET** `/api/cors-test` - CORS testing
- **GET** `/test-working` - Simple functionality test

### 14. Database & Performance
- **GET** `/api/test-db-permissions` - Database permission test
- **POST** `/api/migrate-timeseries` - Time series migration
- **GET** `/api/create-users-table` - User table creation

## 🚀 **Frontend Integration Endpoints**

### 15. Dashboard Data
- **GET** `/api/dashboard/overview` - Dashboard overview stats
- **GET** `/api/dashboard/alerts-summary` - Alerts summary
- **GET** `/api/dashboard/trending-domains` - Trending domains widget

### 16. Search & Discovery
- **GET** `/api/search/domains` - Domain search
- **GET** `/api/search/similar-companies` - Similar company discovery
- **GET** `/api/search/industry-peers` - Industry peer analysis

## 📊 **Usage Examples**

### Basic Domain Intelligence
```bash
curl -H "X-API-Key: your-key" \
  "https://llm-pagerank-public-api.onrender.com/api/domains/apple.com/public"
```

### Memory Velocity Analysis
```bash
curl -H "X-API-Key: your-key" \
  "https://llm-pagerank-public-api.onrender.com/api/muv/analysis/apple.com"
```

### Arbitrage Opportunities
```bash
curl -H "X-API-Key: your-key" \
  "https://llm-pagerank-public-api.onrender.com/api/muv/arbitrage-opportunities?limit=10"
```

### Reality Gap Analysis
```bash
curl -H "X-API-Key: your-key" \
  "https://llm-pagerank-public-api.onrender.com/api/sentiment/apple.com/enhanced"
```

## 🔑 **API Key Tiers**

### Free Tier ($0/month)
- 1,000 requests/month
- Basic domain intelligence
- Standard rankings

### Pro Tier ($7/month)
- 10,000 requests/month
- Memory velocity analysis
- Sentiment integration
- Competitive intelligence

### Enterprise Tier ($2,000/month)
- 100,000 requests/month
- Full MUV analysis
- Custom arbitrage detection
- White-label API access
- Priority support

## 📈 **New Capabilities Summary**

1. **Memory Update Velocity (MUV)** - Measure how fast AI models update brand memory
2. **Institutional Bias Detection** - Identify systematic biases in AI memory
3. **Reality Gap Analysis** - Compare AI perception vs real-world sentiment
4. **Arbitrage Opportunity Detection** - Find perception-reality gaps for advantage
5. **Decay-Adjusted Scoring** - Weight reality gaps by memory update velocity
6. **Forensic Memory Analysis** - Deep dive into memory drift patterns

## 🎯 **Next Phase Endpoints (Coming Soon)**

- **GET** `/api/swarm/cohort-intelligence` - Swarm intelligence analysis
- **GET** `/api/swarm/insight-discovery` - Automated insight discovery
- **GET** `/api/patent/sentinel-plus` - Patent-protected drift detection
- **GET** `/api/regulatory/compliance-check` - Regulatory compliance analysis
- **GET** `/api/litigation/risk-assessment` - Litigation risk from memory drift 
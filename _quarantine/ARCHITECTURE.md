# LLM Memory Ecosystem Architecture

## System Overview
llmrank.io (domain-runner) serves as the core backend API and intelligence engine for a 3-property ecosystem focused on LLM memory and brand perception.

## 🏗️ Architecture Stack

```
┌─────────────────────────────────────────────────────────────┐
│                     llmrank.io (Core Engine)                 │
│                                                               │
│  • 11 LLM Provider Integration (Tensor Synchronization)      │
│  • Memory Drift Detection & Scoring                          │
│  • Domain Processing Pipeline (3,239 domains)                │
│  • PostgreSQL Database (Truth Source)                        │
│  • API Layer (domain-runner.onrender.com)                    │
│                                                               │
└──────────────────┬────────────────┬──────────────────────────┘
                   │                │
         Public API │                │ Premium API
                   ▼                ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │  llmpagerank.com     │  │  brandsentiment.io   │
    │                       │  │                      │
    │  Frontend Demo        │  │  Strategic Portal    │
    │  • Brand Rankings     │  │  • Timeline Drift    │
    │  • Memory Scores      │  │  • Reality vs AI     │
    │  • Viral Tool         │  │  • Sentiment Analysis│
    │  • Lead Generation    │  │  • Premium Insights  │
    └───────────────────────┘  └──────────────────────┘
```

## 🔌 API Endpoints & Service Coordination

### Public API (llmpagerank.com)
- `GET /api/stats` - Overview statistics
- `GET /api/rankings` - Domain rankings with search
- `GET /api/rankings/:domain` - Domain detail view
- No authentication required
- CORS enabled for llmpagerank.com

### Premium API (brandsentiment.io)
- `POST /api/v2/analyze` - Deep brand analysis
- `GET /api/v2/timeline/:domain` - Timeline drift analysis
- `GET /api/v2/sentiment/:domain` - Sentiment vs reality
- `POST /api/v2/corrections` - Memory correction workflows
- Requires API key authentication
- Rate limited for premium tier

### Internal API (llmrank.io)
- `POST /api/v2/process-pending-domains` - Batch processing
- `GET /api/v2/provider-usage` - LLM provider metrics
- `GET /api/v2/metrics` - System health
- `POST /api/v2/orchestrate` - Swarm orchestration
- Admin API key required

## 🎯 GTM Integration Points

### Data Flow
1. **Collection**: llmrank.io continuously crawls 3,239 domains across 11 LLMs
2. **Processing**: Memory scores, drift detection, tensor analysis
3. **Distribution**: 
   - llmpagerank.com gets simplified scores for viral sharing
   - brandsentiment.io gets deep analytics for strategic decisions

### User Journey
```
Discovery → Awareness → Insight → Action
    │           │          │         │
llmpagerank → Stats → brandsentiment → API/Services
```

### Monetization Funnel
- **Free Tier**: llmpagerank.com (brand lookup, basic score)
- **Premium**: brandsentiment.io ($499/mo dashboard)
- **Enterprise**: llmrank.io API ($2,999/mo data access)

## 🔐 Security & Access Control

### API Keys Structure
```
INTERNAL_API_KEY     → Full system access (llmrank.io admin)
PAGERANK_API_KEY     → Read-only public data (llmpagerank.com)
SENTIMENT_API_KEY    → Premium data access (brandsentiment.io)
PARTNER_API_KEY_1-10 → External integrations
```

### Rate Limits
- Public (llmpagerank): 1000 req/hour
- Premium (brandsentiment): 5000 req/hour  
- Enterprise (API): Unlimited

## 📊 Database Schema Coordination

### Shared Tables
- `domains` - Master domain list
- `domain_responses` - LLM responses (11 providers)
- `domain_scores` - Computed memory scores

### Service-Specific Tables
- `pagerank_cache` - Cached rankings for performance
- `sentiment_analysis` - Reality vs AI comparison
- `timeline_drift` - Historical accuracy tracking
- `correction_campaigns` - Memory fix workflows

## 🚀 Deployment Architecture

### Current Infrastructure
- **Backend**: domain-runner.onrender.com (Node.js)
- **Database**: PostgreSQL on Render
- **Frontends**: 
  - llmpagerank.com (Vercel/Next.js)
  - brandsentiment.io (TBD)

### Scaling Plan
1. **Phase 1**: Current monolith serves all properties
2. **Phase 2**: Microservices for sentiment analysis
3. **Phase 3**: Edge caching for pagerank queries

## 📈 Metrics & KPIs

### System Health
- API uptime: 99.9% target
- Response time: <200ms for rankings
- Processing throughput: 1000+ domains/hour

### Business Metrics
- llmpagerank.com: Daily active lookups
- brandsentiment.io: MRR from subscriptions
- llmrank.io: API call volume

## 🔄 Coordination Requirements

### Real-time Updates
- When new domains are processed, update:
  - llmpagerank rankings
  - brandsentiment timelines
  - API webhooks for subscribers

### Cache Invalidation
- Rankings cache: 1 hour TTL
- Domain details: 6 hours TTL
- Sentiment analysis: 24 hours TTL

### Cross-Property Messaging
- Consistent brand terminology
- Unified scoring methodology
- Synchronized data updates

## 🛠️ Next Implementation Steps

1. **Immediate**
   - [x] Public API for llmpagerank.com
   - [ ] Premium endpoints for brandsentiment.io
   - [ ] Webhook system for real-time updates

2. **Week 1**
   - [ ] Sentiment analysis pipeline
   - [ ] Timeline drift calculator
   - [ ] Memory correction API

3. **Week 2**
   - [ ] Premium authentication system
   - [ ] Usage analytics dashboard
   - [ ] Billing integration

## 📝 Service Level Agreements

### llmpagerank.com
- Availability: 99.5%
- Data freshness: 24 hours
- Support: Community

### brandsentiment.io
- Availability: 99.9%
- Data freshness: 6 hours
- Support: Priority email

### llmrank.io API
- Availability: 99.99%
- Data freshness: Real-time
- Support: Dedicated account manager

---

*This architecture document defines how llmrank.io serves as the core engine for the LLM memory ecosystem, coordinating data and functionality across multiple consumer-facing properties.*
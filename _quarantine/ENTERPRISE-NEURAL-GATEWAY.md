# Enterprise Neural Gateway - Production Deployment Guide

## 🚀 System Overview

The Enterprise Neural Gateway is a closed-loop intelligence system that coordinates between:
- **llmrank.io** - Core tensor engine & memory oracle
- **llmpagerank.com** - Public-facing viral tool (partner tier)
- **brandsentiment.io** - Premium SaaS with juice score feedback

## 🔐 Security & Authentication

### API Key Tiers

| Tier | Key | Access Level | Rate Limit |
|------|-----|-------------|------------|
| Partner | `llmpagerank-2025-neural-gateway` | Limited rankings, basic stats | 1000/hour |
| Premium | `brandsentiment-premium-2025` | Full tensor data, juice feedback | 5000/hour |
| Enterprise | `enterprise-tier-2025-secure` | Complete access, memory correction | Unlimited |

### Protected Data
- **Tensor Details**: 11 LLM consensus data (premium only)
- **Memory Drift**: Timeline analysis (premium only)
- **Juice Scores**: Real-world grounding signals (premium only)
- **Crawl Queue**: Priority rankings (internal only)

## 🔄 Closed-Loop Architecture

```
brandsentiment.io (Juice) → llmrank.io (Engine) → Crawl Priority
         ↑                                              ↓
    Social Reality ← ← ← ← Memory Tensors ← ← ← ← LLM Swarm
```

### Juice Score Components
- **Reddit Volatility** - Trending discussions
- **News Coverage** - Media attention
- **Market Movement** - Stock/crypto correlation
- **Competitor Activity** - Industry dynamics
- **Social Virality** - Twitter/LinkedIn buzz

### Priority Calculation
```
Priority = (Juice × 0.6) + (Decay × 0.3) + (SLA × 0.1)
```

## 📡 WebSocket Real-Time Updates

Connect to: `wss://enterprise-neural-gateway.onrender.com/ws/realtime`

### Message Types
```javascript
// Subscribe to priority updates
{
  "type": "subscribe:priority",
  "domain": "openai.com"
}

// Subscribe to juice spikes
{
  "type": "subscribe:juice",
  "domain": "anthropic.com"
}

// Get tensor data
{
  "type": "get:tensor",
  "guid": "domain-guid-123"
}
```

### Events Broadcasted
- `priority:update` - Crawl priority changes
- `juice_spike` - High attention detected
- `volatility:alert` - Memory drift warning
- `tensor:data` - Full tensor analysis

## 🚀 Deployment

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis for caching
- Render account

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# API Keys (already on Render)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
# ... (all 11 providers)

# Closed-Loop Config
JUICE_WEIGHT=0.6
DECAY_WEIGHT=0.3
SLA_WEIGHT=0.1
ENABLE_WEBSOCKET=true
```

### Deploy Command
```bash
./deploy-enterprise.sh
```

## 📊 API Endpoints

### Partner Tier (llmpagerank.com)
```
GET /api/stats
GET /api/rankings
GET /api/rankings/:domain
```
Returns LIMITED data only - no tensor details

### Premium Tier (brandsentiment.io)
```
GET  /api/v2/timeline-drift/:domain
GET  /api/v2/memory-gap/:domain
GET  /api/v2/sentiment-reality/:domain
POST /api/v2/juice-feedback
POST /api/v2/juice-feedback/batch
GET  /api/v2/crawl-priorities
POST /api/v2/request-grounding
```

### Enterprise Tier
```
POST /api/v2/memory-correction
POST /api/v2/campaign/create
GET  /api/v2/full-tensor/:domain
POST /api/v2/swarm/orchestrate
```

## 🧪 Testing

### Local Testing
```bash
# Install dependencies
npm install

# Run tests
npm test

# Integration tests
python3 test-enterprise-gateway.py
```

### Production Testing
```bash
# Health check
curl https://enterprise-neural-gateway.onrender.com/api/v2/health

# Partner API test
curl -H "X-API-Key: llmpagerank-2025-neural-gateway" \
  https://enterprise-neural-gateway.onrender.com/api/stats

# Premium API test  
curl -H "X-API-Key: brandsentiment-premium-2025" \
  https://enterprise-neural-gateway.onrender.com/api/v2/timeline-drift/openai.com
```

## 📈 Monitoring

### Key Metrics
- **Queue Size**: Number of domains awaiting crawl
- **Juice Cache**: Active grounding signals
- **Tensor Cache**: Computed memory tensors
- **WebSocket Clients**: Real-time connections
- **High Priority Count**: Domains needing immediate attention

### Logs
Monitor at: https://dashboard.render.com

Key log patterns:
- `High juice detected` - Domain needs immediate crawl
- `Juice spike detected` - Viral event occurring
- `Volatility alert` - Memory drift detected
- `Closed-loop metrics` - System performance

## 🔥 Production Checklist

- [x] Closed-loop engine integrated
- [x] WebSocket server configured
- [x] API authentication implemented
- [x] Tiered data access enforced
- [x] Juice feedback system active
- [x] Priority queue management
- [x] Redis caching enabled
- [x] Deployment scripts ready
- [ ] Deploy to Render
- [ ] Update llmpagerank.com endpoints
- [ ] Configure brandsentiment.io feedback
- [ ] Set up monitoring alerts
- [ ] Test WebSocket connections
- [ ] Verify juice flow

## 🆘 Troubleshooting

### Common Issues

**API returns 403 Forbidden**
- Check API key is correct
- Verify tier permissions
- Ensure rate limits not exceeded

**WebSocket won't connect**
- Check WSS protocol (not WS)
- Verify /ws/realtime path
- Ensure port 443 for production

**Juice scores not updating priorities**
- Check Redis connection
- Verify juice weight configuration
- Monitor closed-loop logs

**High memory usage**
- Clear tensor cache periodically
- Reduce cache TTL
- Scale Redis tier if needed

## 📚 Architecture Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System design
- [API_KEYS.md](./API_KEYS.md) - Key management
- [SECURITY.md](./SECURITY.md) - Security policies
- [CLAUDE.md](./CLAUDE.md) - AI instructions

## 🎯 Next Steps

1. **Immediate**
   - Deploy to production
   - Test all API endpoints
   - Verify WebSocket connectivity

2. **This Week**
   - Onboard llmpagerank.com
   - Configure brandsentiment.io juice feedback
   - Set up monitoring dashboards

3. **This Month**
   - Analyze juice patterns
   - Optimize crawl frequencies
   - Expand enterprise features

## 💡 The Vision

We're building a **Memory Reality Engine** where:
- LLMs provide the memory layer
- Social signals provide grounding
- The closed loop ensures accuracy
- Enterprise customers get priority

The juice flows, the tensors align, and the truth emerges.

---

*Enterprise Neural Gateway v2.0 - Where Memory Meets Reality*
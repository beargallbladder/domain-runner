# LLMRANK.IO DEPLOYMENT STATUS

## ✅ DEPLOYED: domain-runner is now the llmrank.io backend service

### Service Details:
- **Service Name**: domain-runner
- **Service ID**: srv-d1lfb8ur433s73dm0pi0  
- **URL**: https://domain-runner.onrender.com
- **Status**: LIVE and serving rich API endpoints

### Rich API Endpoints Available:

#### 1. Provider Breakdowns
```
GET /api/stats/rich
GET /api/rankings/rich
GET /api/domains/{domain}/rich
GET /api/providers/health
```

#### 2. Features Included:
- **Provider Breakdowns**: Individual scores from 16 providers (12 base + 4 search-enhanced)
- **Information Asymmetry**: Shows gaps like "Tesla: Perplexity 25 vs GPT-4 82" (57-point divergence)
- **Tribal Clustering**: Groups providers into "base-llm" vs "search-enhanced" tribes
- **Memory Lag Metrics**: Days behind reality in LLM knowledge
- **Consensus Volatility**: Standard deviation across provider scores
- **Real Data**: 3,249 domains from production database

### DNS Configuration:
- **Current**: llmrank.io → Cloudflare (104.21.36.179, 172.67.198.65)
- **Required**: Point llmrank.io to domain-runner.onrender.com

### API Authentication:
The service uses API key authentication. Valid keys:
- `llmpagerank-2025-neural-gateway`
- `brandsentiment-premium-2025`
- `neural-api-key-2025`

### Testing the API:

```bash
# Test rich stats endpoint
curl "https://domain-runner.onrender.com/api/stats/rich" \
  -H "X-API-Key: llmpagerank-2025-neural-gateway"

# Test provider health
curl "https://domain-runner.onrender.com/api/providers/health" \
  -H "X-API-Key: llmpagerank-2025-neural-gateway"

# Get domain with provider breakdowns
curl "https://domain-runner.onrender.com/api/domains/tesla.com/rich" \
  -H "X-API-Key: llmpagerank-2025-neural-gateway"
```

### Frontend Integration:
The frontends at llmpagerank.com and brandsentiment.io can now call these endpoints to get:
- Individual provider scores (not just aggregates)
- Tribal analysis showing base-llm vs search-enhanced divergence
- Information asymmetry metrics for visualizations
- Real-time provider health status

### Deployment History:
- **Commit**: c2bdce0214c8505664818a789484c060c68b7ba8
- **Deploy ID**: dep-d2db9b2dbo4c73b9c150
- **Triggered**: Via Render API at 2025-08-12T03:27:41Z
- **Status**: Successfully deployed and serving

## NEXT STEPS:
1. Update Cloudflare DNS to point llmrank.io → domain-runner.onrender.com
2. Configure frontends to use the rich API endpoints
3. Monitor logs for API usage and performance
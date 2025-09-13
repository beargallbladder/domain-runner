# 🌐 DNS CONFIGURATION FOR LLMRANK.IO

## Current Status
✅ **API Service**: `domain-runner` is live at https://domain-runner.onrender.com
❌ **Domain**: llmrank.io not pointing to our service

## Required DNS Changes

### Option 1: Direct CNAME (Simplest)
```
Type: CNAME
Name: @  (or llmrank.io)
Value: domain-runner.onrender.com
TTL: Auto or 300
```

### Option 2: Subdomain API
```
Type: CNAME
Name: api
Value: domain-runner.onrender.com
TTL: Auto or 300
```
Then use: `https://api.llmrank.io`

### Option 3: Cloudflare Proxy (If using Cloudflare)
1. Add CNAME record as above
2. Enable "Proxied" (orange cloud)
3. Create Page Rule:
   - URL: `llmrank.io/*`
   - Forward to: `https://domain-runner.onrender.com/$1`

## Verification
After DNS propagation (5-30 minutes), test:
```bash
curl https://llmrank.io/
# Should return: {"service":"LLMRank.io API","status":"operational"...}
```

## Current Working Endpoints
Until DNS is configured, use these directly:

- **Base URL**: https://domain-runner.onrender.com
- **Stats**: https://domain-runner.onrender.com/api/stats/rich
- **Rankings**: https://domain-runner.onrender.com/api/rankings/rich
- **Domain Details**: https://domain-runner.onrender.com/api/domains/{domain}/rich

## API Keys
- `llmpagerank-2025-neural-gateway`
- `brandsentiment-premium-2025`
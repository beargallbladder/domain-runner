# 🚦 Rate Limiting Documentation

## Overview

The LLM PageRank API implements comprehensive rate limiting to ensure fair usage and prevent abuse. Rate limits are applied based on authentication method and subscription tier.

## Rate Limit Tiers

### 🆓 Free Tier (Unauthenticated)
- **Per Hour**: 100 requests
- **Per Minute**: 10 requests
- **Burst**: 5 requests/second
- **Daily**: 1,000 requests

### 💼 Pro Tier
- **Per Hour**: 5,000 requests
- **Per Minute**: 100 requests
- **Burst**: 20 requests/second
- **Daily**: 50,000 requests

### 🏢 Enterprise Tier
- **Per Hour**: 50,000 requests
- **Per Minute**: 1,000 requests
- **Burst**: 100 requests/second
- **Daily**: 500,000 requests

## Rate Limit Headers

All API responses include rate limit headers:

```
X-RateLimit-Limit: 100        # Your rate limit
X-RateLimit-Remaining: 75     # Remaining requests
X-RateLimit-Reset: 1640995200  # Unix timestamp when limit resets
X-RateLimit-Tier: free         # Your current tier
```

## Rate Limit Exceeded Response

When rate limits are exceeded, the API returns HTTP 429:

```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded: per_hour",
  "retry_after": 3600
}
```

Response headers will include:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 3600
```

## Authentication Methods

### 1. Public Endpoints (No Auth)
Default rate limits apply to all unauthenticated requests.

```bash
curl https://api.llmpagerank.com/api/domains/google.com/public
```

### 2. API Key Authentication
Use your API key to access higher rate limits:

```bash
curl https://api.llmpagerank.com/api/v1/domains/google.com?api_key=YOUR_API_KEY
```

### 3. JWT Bearer Token
For authenticated users with active sessions:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.llmpagerank.com/api/premium/dashboard
```

## Endpoint-Specific Limits

Some endpoints have additional rate limits:

| Endpoint | Additional Limit |
|----------|-----------------|
| `/api/domains/{domain}/public` | 100/hour, 10/minute |
| `/api/fire-alarm-dashboard` | 100/hour, 20/minute |
| `/api/rankings` | 200/hour, 30/minute |
| `/api/stats` | 300/hour, 50/minute |

## Best Practices

1. **Handle 429 Responses**: Implement exponential backoff when receiving 429 errors
2. **Monitor Headers**: Track your remaining quota using response headers
3. **Cache Responses**: Cache API responses to reduce unnecessary requests
4. **Use Webhooks**: For real-time updates, use webhooks instead of polling

## Example: Handling Rate Limits

### Python Example
```python
import requests
import time

def make_api_request(url, api_key):
    headers = {'X-API-Key': api_key}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 429:
        retry_after = int(response.headers.get('Retry-After', 60))
        print(f"Rate limited. Waiting {retry_after} seconds...")
        time.sleep(retry_after)
        return make_api_request(url, api_key)  # Retry
    
    # Check remaining quota
    remaining = response.headers.get('X-RateLimit-Remaining')
    if remaining and int(remaining) < 10:
        print(f"Warning: Only {remaining} requests remaining")
    
    return response
```

### JavaScript Example
```javascript
async function makeApiRequest(url, apiKey) {
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey }
  });
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || 60;
    console.log(`Rate limited. Waiting ${retryAfter} seconds...`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return makeApiRequest(url, apiKey); // Retry
  }
  
  // Check remaining quota
  const remaining = response.headers.get('X-RateLimit-Remaining');
  if (remaining && parseInt(remaining) < 10) {
    console.warn(`Warning: Only ${remaining} requests remaining`);
  }
  
  return response;
}
```

## Redis-Based Distributed Rate Limiting

For production deployments with multiple servers, rate limiting uses Redis for distributed state management. This ensures rate limits are enforced consistently across all API servers.

### Features:
- Distributed state across multiple servers
- Atomic increment operations
- Automatic key expiration
- Fallback to in-memory limiting if Redis is unavailable

## Rate Limit Bypass

Enterprise customers can request rate limit bypass for specific use cases. Contact support@llmpagerank.com with your requirements.

## Monitoring and Alerts

Set up monitoring for your API usage:

1. Track `X-RateLimit-Remaining` header
2. Alert when remaining < 20% of limit
3. Monitor 429 response rates
4. Use the `/api/user/api-keys` endpoint to check daily usage

## FAQ

**Q: How are rate limits calculated?**
A: Rate limits use a fixed-window algorithm with elastic expiry. Each window (minute/hour/day) has independent counters.

**Q: Can I increase my rate limits?**
A: Yes, upgrade to Pro or Enterprise tier for higher limits.

**Q: What happens when I exceed limits?**
A: You'll receive a 429 response with retry information. Your access is not permanently blocked.

**Q: Are rate limits per API key or per account?**
A: Rate limits are per API key. Enterprise accounts can have multiple API keys.

**Q: Is there a sandbox for testing?**
A: Yes, use the `/api/sandbox/*` endpoints which have relaxed rate limits for testing.
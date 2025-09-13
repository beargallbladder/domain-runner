# Security Documentation - Domain Runner API

## Overview
This document outlines the security measures implemented in the Domain Runner API to ensure production readiness.

## Authentication & Authorization

### API Key Authentication
- All protected endpoints require a valid API key
- API keys must be provided via `X-API-Key` header or `Authorization: Bearer <key>`
- Three types of API keys:
  - **Internal API Key**: For internal services
  - **Admin API Key**: For administrative access
  - **Partner API Keys**: For external partners (up to 10 keys supported)

### Endpoint Security Levels

| Endpoint | Auth Required | Rate Limit | Description |
|----------|--------------|------------|-------------|
| `/health` | No | 60/min | Health check |
| `/api/v2/health` | No | 60/min | Health check |
| `/api/v2/api-keys` | No | 100/15min | API key status (public) |
| `/api/v2/process-pending-domains` | Yes | 100/hour | Domain processing |
| `/api/v2/ultra-fast-process` | Yes | 100/hour | Fast processing |
| `/api/v2/domains/*` | Yes | 1000/15min | Domain operations |
| `/api/v2/stats` | Optional | 1000/15min | Statistics |
| `/api/v2/provider-usage` | Optional | 1000/15min | Provider metrics |
| `/api/v2/metrics` | Yes | 1000/15min | System metrics |
| `/api/v2/alerts` | Admin | 5000/15min | Alert management |

## Rate Limiting

### Configuration
- **Public endpoints**: 100 requests per 15 minutes
- **Authenticated API**: 1000 requests per 15 minutes
- **Processing endpoints**: 100 requests per hour (resource intensive)
- **Admin endpoints**: 5000 requests per 15 minutes
- **Health checks**: 60 requests per minute

### Headers
Rate limit information is provided in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Window reset time
- `Retry-After`: Seconds until retry (on 429 response)

## Security Headers

All responses include the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`

## CORS Configuration

- Allowed origins configured via `ALLOWED_ORIGINS` environment variable
- Default: `https://llmrank.io`
- Credentials supported for authenticated requests
- Preflight caching: 24 hours

## Input Validation

### Domain Validation
- Domains must match valid format regex
- Maximum 1000 domains per request
- Each domain object must have a "domain" field

### Request Size Limits
- JSON body: 10MB maximum
- URL-encoded body: 10MB maximum
- Requests exceeding limits receive 413 response

### Prompt Sanitization
- Script tags automatically removed from prompts
- SQL injection patterns detected and blocked

## SQL Injection Prevention

Requests are scanned for suspicious patterns including:
- SQL keywords (UNION, SELECT, INSERT, etc.)
- Comment sequences (`--`, `/*`, `*/`)
- Common injection patterns

Suspicious requests receive 400 response.

## Error Handling

### Production Mode
- Generic error messages returned to clients
- No stack traces or sensitive information exposed
- All errors logged internally with full details

### Development Mode
- Detailed error messages for debugging
- Stack traces included in responses

## Request Logging

All requests are logged with:
- Method and path
- Status code
- Response time
- Client IP
- User agent
- API key presence (not the key itself)

## Environment Variables

Required security-related environment variables:
```bash
# API Keys
INTERNAL_API_KEY=<internal-key>
ADMIN_API_KEY=<admin-key>
PARTNER_API_KEY_1=<partner-key-1>
# ... up to PARTNER_API_KEY_10

# CORS
ALLOWED_ORIGINS=https://llmrank.io,https://app.llmrank.io

# Environment
NODE_ENV=production
```

## Best Practices

1. **API Key Rotation**: Rotate API keys regularly
2. **HTTPS Only**: Always use HTTPS in production
3. **Monitoring**: Monitor rate limit violations and authentication failures
4. **Logging**: Review security logs regularly
5. **Updates**: Keep dependencies updated for security patches

## Security Incident Response

1. **Detection**: Monitor logs for suspicious activity
2. **Investigation**: Review request patterns and affected endpoints
3. **Mitigation**: Block malicious IPs, rotate compromised keys
4. **Documentation**: Document incidents and responses
5. **Prevention**: Update security measures based on incidents

## Deployment Security

### Render.com Deployment
- Environment variables stored securely
- HTTPS enforced by default
- DDoS protection provided by platform
- Auto-scaling for availability

### Database Security
- Connection string stored as environment variable
- SSL/TLS encryption for database connections
- Query parameterization prevents SQL injection

## API Usage Example

```bash
# Authenticated request
curl -X POST https://domain-runner.onrender.com/api/v2/process-pending-domains \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "domainCount": 10,
    "domains": [{"domain": "example.com", "prompts": {...}}]
  }'

# Response includes rate limit headers
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 2024-07-28T10:00:00Z
```

## Contact

For security concerns or vulnerabilities, please contact:
- Email: security@llmrank.io
- Response time: Within 24 hours
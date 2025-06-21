# 🌐 llmrank.io Custom Domain Migration

## Overview
Migrating from `llm-pagerank-public-api.onrender.com` to the professional custom domain `llmrank.io`.

## ✅ Changes Made

### 1. Backend Configuration Updated
- ✅ **Render.yaml**: Added custom domain configuration
- ✅ **CORS Policy**: Added llmrank.io domains to allowed origins
- ✅ **SSL**: Will be automatically handled by Render

### 2. Frontend URLs Updated
- ✅ **AuthContext**: Updated default API URL
- ✅ **useMemoryAPI**: Updated API base URL
- ✅ **Component Files**: Updated hardcoded URLs to use environment variables

### 3. Environment Variables
All frontend deployments need these updated:
```bash
VITE_API_BASE_URL=https://llmrank.io
REACT_APP_API_URL=https://llmrank.io
```

## 🚀 Deployment Steps

### Step 1: DNS Configuration
Add these DNS records at your domain registrar:

```
Type: CNAME
Name: @ (root domain)
Value: llm-pagerank-public-api.onrender.com
TTL: 300

Type: CNAME  
Name: www
Value: llm-pagerank-public-api.onrender.com
TTL: 300
```

### Step 2: Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find service: `llm-pagerank-public-api`
3. Settings → Custom Domains
4. Add domains:
   - `llmrank.io`
   - `www.llmrank.io`
5. Wait for SSL certificate (green checkmark)

### Step 3: Deploy Backend
```bash
./deploy_custom_domain.sh
```

### Step 4: Update Frontend Environment
Update your frontend deployment (Vercel/Netlify) with:
- `VITE_API_BASE_URL=https://llmrank.io`

## 🧪 Testing Endpoints

Once DNS propagates (5-60 minutes):

```bash
# Health check
curl https://llmrank.io/health

# API status  
curl https://llmrank.io/api/status

# Domain intelligence
curl https://llmrank.io/api/domains/apple.com/public

# Real-time ticker
curl https://llmrank.io/api/ticker

# Authentication test
curl -X POST https://llmrank.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","full_name":"Test User"}'
```

## 📊 API Structure

Your new API will be available at:

### Core Intelligence
- `GET /api/domains/{domain}/public` - Domain analysis
- `GET /api/ticker` - Real-time brand volatility
- `GET /api/rankings` - Domain rankings
- `GET /api/fire-alarm-dashboard` - Risk alerts

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user info

### Premium Features
- `GET /api/premium/dashboard` - Premium dashboard
- `POST /api/premium/track-domain` - Track domains
- `GET /api/user/api-keys` - API key management

## 🔒 Security Features

### CORS Configuration
```python
allow_origins=[
    "https://llmrank.io",
    "https://www.llmrank.io", 
    "https://app.llmrank.io",
    # Legacy domains for transition
    "https://llmpagerank.com",
    "https://domain-runner.vercel.app"
]
```

### SSL/TLS
- Automatic SSL certificate via Render
- HTTPS-only API access
- Secure cookie handling

## 🎯 Benefits of llmrank.io

1. **Professional Branding**: Clean, memorable domain
2. **SEO Friendly**: Better for search engine ranking
3. **Enterprise Ready**: Credible for B2B clients
4. **API Structure**: Clean `/api/*` endpoints
5. **Scalability**: Easy to add subdomains (api.llmrank.io, app.llmrank.io)

## 🔄 Migration Timeline

- **Phase 1**: DNS + Render setup (Today)
- **Phase 2**: Frontend deployment updates (Today)
- **Phase 3**: Test all endpoints (Within 1 hour)
- **Phase 4**: Update documentation/marketing (This week)
- **Phase 5**: Deprecate old URLs (Next month)

## 🚨 Rollback Plan

If issues occur:
1. Remove custom domain from Render
2. Revert frontend environment variables
3. Old `llm-pagerank-public-api.onrender.com` will still work

## 📞 Support

All endpoints will be backward compatible during transition period.

**New Primary URL**: `https://llmrank.io`
**Status Page**: `https://llmrank.io/health`
**API Docs**: `https://llmrank.io/docs` (if enabled)

---

**Next Steps**: Run `./deploy_custom_domain.sh` to begin deployment! 
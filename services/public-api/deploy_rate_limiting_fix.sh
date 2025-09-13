#!/bin/bash
# Deploy script for rate limiting fix

echo "🚀 Deploying Rate Limiting Fix"
echo "================================"

# Navigate to project root
cd /Users/samkim/domain-runner

# Show git status
echo "📋 Git Status:"
git status

echo ""
echo "📝 Changes made:"
echo "1. Added rate limiter import and initialization"
echo "2. Added SlowAPIMiddleware to the app"
echo "3. Added rate limit decorators to all API endpoints"
echo "4. Fixed parameter order for rate limiting to work"
echo ""

# Create commit
echo "💾 Creating commit..."
git add services/public-api/production_api.py
git add services/public-api/test_rate_limiting_fix.py
git add services/public-api/debug_rate_limiting.py
git add services/public-api/deploy_rate_limiting_fix.sh

git commit -m "Fix rate limiting: Add SlowAPI middleware and decorators to all endpoints

- Import rate limiter and exception handler from rate_limiter.py
- Add SlowAPIMiddleware immediately after app creation
- Add @limiter.limit decorators to all API endpoints with appropriate limits:
  - /api/stats: 300/hour, 50/minute
  - /api/rankings: 200/hour, 30/minute
  - /api/domains/{domain}/public: 100/hour, 10/minute
  - Other endpoints: 100/hour, 20/minute
- Fix parameter order (Request must be first after path params)
- Add test scripts to verify rate limiting is working

This fixes the vulnerability where 150 rapid requests succeeded without limiting."

echo ""
echo "🔄 Pushing to main branch..."
git push origin main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "⏳ Render will automatically deploy the changes."
echo "   Monitor the deployment at: https://dashboard.render.com"
echo ""
echo "🧪 After deployment, test with:"
echo "   python3 services/public-api/test_rate_limiting_fix.py"
echo ""
echo "📊 Monitor rate limiting effectiveness with:"
echo "   - Check X-RateLimit-* headers in responses"
echo "   - Monitor 429 response codes in logs"
echo "   - Use the debug script to verify configuration"
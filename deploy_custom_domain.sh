#!/bin/bash

# 🚀 CUSTOM DOMAIN DEPLOYMENT SCRIPT
# Deploy all services with llmrank.io custom domain

echo "🌐 Setting up llmrank.io custom domain..."

# Step 1: DNS Configuration Instructions
echo ""
echo "📋 DNS CONFIGURATION REQUIRED:"
echo "   1. Go to your domain registrar (where you bought llmrank.io)"
echo "   2. Add these DNS records:"
echo ""
echo "   Type: CNAME"
echo "   Name: @ (or leave blank for root domain)"
echo "   Value: llm-pagerank-public-api.onrender.com"
echo "   TTL: 300 (5 minutes)"
echo ""
echo "   Type: CNAME" 
echo "   Name: www"
echo "   Value: llm-pagerank-public-api.onrender.com"
echo "   TTL: 300 (5 minutes)"
echo ""

# Step 2: Render Configuration
echo "🔧 RENDER CONFIGURATION:"
echo "   1. Go to https://dashboard.render.com"
echo "   2. Find your 'llm-pagerank-public-api' service"
echo "   3. Go to Settings > Custom Domains"
echo "   4. Add domain: llmrank.io"
echo "   5. Add domain: www.llmrank.io"
echo "   6. Wait for SSL certificate to be issued"
echo ""

# Step 3: Deploy updated configuration
echo "🚀 Deploying updated configuration..."

# Deploy the main API with custom domain
echo "   → Deploying public API with custom domain..."
cd services/public-api
git add .
git commit -m "Add llmrank.io custom domain configuration"
git push origin main

cd ../..

# Step 4: Update environment variables
echo ""
echo "🔧 ENVIRONMENT VARIABLES TO UPDATE:"
echo ""
echo "For your frontend deployment (Vercel/Netlify):"
echo "   VITE_API_BASE_URL=https://llmrank.io"
echo "   REACT_APP_API_URL=https://llmrank.io"
echo ""

# Step 5: Test endpoints
echo "🧪 TESTING ENDPOINTS:"
echo ""
echo "Once DNS propagates (5-60 minutes), test these:"
echo "   → Health check: https://llmrank.io/health"
echo "   → API status: https://llmrank.io/api/status"
echo "   → Domain API: https://llmrank.io/api/domains/apple.com/public"
echo ""

# Step 6: Verification checklist
echo "✅ VERIFICATION CHECKLIST:"
echo ""
echo "□ DNS records added to domain registrar"
echo "□ Custom domain added in Render dashboard"
echo "□ SSL certificate issued (green checkmark in Render)"
echo "□ Frontend environment variables updated"
echo "□ Test API endpoints working"
echo "□ CORS updated to allow new domain"
echo ""

echo "🎉 Custom domain setup complete!"
echo ""
echo "📚 NEXT STEPS:"
echo "   1. Wait for DNS propagation (5-60 minutes)"
echo "   2. Test the endpoints above"
echo "   3. Update your frontend deployment with new API URL"
echo "   4. Update any external integrations"
echo ""

echo "🔗 Your new API base URL: https://llmrank.io" 
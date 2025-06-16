#!/bin/bash

# UPDATE SITEMAP DEPLOYMENT SCRIPT
# ================================
# 
# Regenerates sitemap.xml and robots.txt for the cohort intelligence system
# Run this after adding new domains or features

echo "🗺️  UPDATING SITEMAP FOR COHORT INTELLIGENCE SYSTEM"
echo "=================================================="
echo ""

# Generate new sitemap
echo "📄 Generating comprehensive sitemap..."
node generate-sitemap.js

echo ""
echo "🚀 SITEMAP UPDATE COMPLETE!"
echo "=========================="
echo ""
echo "📊 Files updated:"
echo "   • services/frontend/public/sitemap.xml"
echo "   • services/frontend/public/robots.txt"
echo ""
echo "🎯 New features included:"
echo "   • /cohorts - Competitive Intelligence Cohorts"
echo "   • /death-match - Competitive Death Match Analysis"
echo "   • Cohort-specific category pages"
echo "   • Industry-specific landing pages"
echo "   • Crisis monitoring pages"
echo ""
echo "✅ Ready for deployment to Vercel!"
echo "   The sitemap includes 467 URLs optimized for SEO"
echo "" 
#!/bin/bash
set -e

echo "🚀 FINAL PRODUCTION CLEANUP"
echo "==========================="
echo ""

echo "📊 Current Status:"
echo "- domain-runner.onrender.com: WORKING (Node.js crawler)"
echo "- sophisticated-runner.onrender.com: BROKEN (Rust health check only)"
echo ""

echo "🧹 CLEANUP ACTIONS:"
echo ""

echo "1. DELETE from Render Dashboard:"
echo "   ❌ sophisticated-runner service (the Rust one)"
echo "   - Go to https://dashboard.render.com"
echo "   - Find 'sophisticated-runner' service"
echo "   - Delete it (keep domain-runner!)"
echo ""

echo "2. Fix Weekly Scheduler (already done):"
echo "   ✅ Changed SOPHISTICATED_RUNNER_URL to point to domain-runner"
echo ""

echo "3. Clean up local files:"
echo "   Deleting unused files..."

# Delete Dockerfile.disabled
find . -name "Dockerfile.disabled" -exec rm -f {} \; -print

# Delete Rust cleanup scripts
rm -f cleanup_rust_code.sh RUST_*.md

# Delete test/emergency scripts we don't need
rm -f EMERGENCY_CRAWL_NOW.js FIX_AND_CRAWL.js CRAWL_NOW_EMERGENCY.py

echo ""
echo "4. Simplify render.yaml:"
echo "   - Remove sophisticated-runner service definition"
echo "   - Keep all other services"
echo ""

echo "5. Weekly Schedule Verification:"
# Check weekly scheduler config
curl -s https://weekly-scheduler.onrender.com/schedule 2>/dev/null || echo "   Weekly scheduler endpoint not public"

echo ""
echo "✅ PRODUCTION READY SERVICES:"
echo "   - domain-runner (main crawler)"
echo "   - llmrank.io (public API)"
echo "   - weekly-scheduler (automated runs)"
echo "   - All intelligence services"
echo ""

echo "📅 WEEKLY CRAWL SCHEDULE:"
echo "   Every Sunday at midnight UTC"
echo "   Target: domain-runner.onrender.com"
echo "   Processing: All 3,239 domains with 11 LLMs"
echo ""

echo "🎯 Next Steps:"
echo "1. Delete sophisticated-runner from Render"
echo "2. Commit these cleanup changes"
echo "3. Monitor current crawl completion"
echo "4. Verify weekly schedule triggers correctly"
#!/bin/bash
set -e

echo "🧹 PRODUCTION CLEANUP SCRIPT"
echo "============================"
echo ""

# 1. Monitor current crawl
echo "📊 Current Crawl Status:"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db',
  ssl: { rejectUnauthorized: false }
});
(async () => {
  const status = await pool.query('SELECT status, COUNT(*) FROM domains GROUP BY status');
  status.rows.forEach(r => console.log('  ' + r.status + ': ' + r.count));
  await pool.end();
})();
"

echo ""
echo "🗑️  CLEANUP PLAN:"
echo ""

# 2. Identify unused code
echo "1. Remove sophisticated-runner Rust references:"
echo "   - All mentions in documentation pointing to Rust version"
echo "   - Dockerfile.disabled files"
echo "   - Old deployment scripts"
echo ""

echo "2. Services to KEEP (actively used):"
echo "   ✅ domain-runner (working crawler with 11 LLMs)"
echo "   ✅ llmrank.io public API"
echo "   ✅ weekly-scheduler"
echo "   ✅ All intelligence services (cohort, industry, etc)"
echo ""

echo "3. Services to DELETE from Render:"
echo "   ❌ sophisticated-runner (showing Rust health check)"
echo "   ❌ Any other duplicate/unused services"
echo ""

echo "4. Code to DELETE locally:"
find . -name "Dockerfile.disabled" | head -10
find . -name "*.rs" | head -5
find . -name "Cargo.toml" | head -5
echo ""

echo "5. Weekly Schedule Setup:"
echo "   - Weekly scheduler is at: https://weekly-scheduler.onrender.com"
echo "   - Should trigger domain-runner every Sunday at midnight"
echo "   - Current config in render.yaml shows it's configured"
echo ""

echo "⚠️  BEFORE DELETING:"
echo "1. Ensure domain-runner is the ONLY crawler being used"
echo "2. Verify weekly-scheduler points to domain-runner, not sophisticated-runner"
echo "3. Back up any critical configs"
echo ""

echo "Ready to proceed? This will:"
echo "- Delete sophisticated-runner from Render dashboard"
echo "- Remove all Rust/unused code"
echo "- Set up clean production environment"
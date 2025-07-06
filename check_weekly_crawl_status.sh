#!/bin/bash

echo "🛡️ WEEKLY TENSOR GUARDIAN STATUS CHECK"
echo "======================================"
echo ""

# Check if Guardian is running
if pgrep -f "weekly-tensor-guardian" > /dev/null; then
    echo "✅ Guardian Process: RUNNING"
else
    echo "❌ Guardian Process: NOT RUNNING"
fi

echo ""
echo "📊 LAST NIGHT'S CRAWL RESULTS:"
echo "------------------------------"

cd services/weekly-tensor-guardian

# Check latest logs
echo "🔍 Latest Health Check:"
tail -n 3 logs/health-check.log | grep -E "(PASSED|FAILED|HEALTHY)" || echo "No recent health checks"

echo ""
echo "🗓️ Latest Weekly Crawl:"
tail -n 5 logs/weekly-crawl.log | grep -E "(COMPLETED|FAILED|Progress)" || echo "No crawl activity found"

echo ""
echo "🚨 Any Critical Issues:"
tail -n 10 logs/scheduler.log | grep -E "(CRITICAL|ERROR|FAILED)" || echo "No critical issues"

echo ""
echo "📈 Quick Database Check:"
export DATABASE_URL="postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Quick response count check
psql $DATABASE_URL -c "
SELECT 
    COUNT(*) as responses_last_24h,
    COUNT(DISTINCT domain_id) as domains_processed,
    COUNT(DISTINCT model) as active_models
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '24 hours';" 2>/dev/null || echo "Database connection failed"

echo ""
echo "🎯 TO INVESTIGATE FURTHER:"
echo "- View full logs: tail -f services/weekly-tensor-guardian/logs/weekly-crawl.log"
echo "- Run health check: cd services/weekly-tensor-guardian && npm run health-check"
echo "- Check anomalies: cd services/weekly-tensor-guardian && npm run anomaly-detect" 
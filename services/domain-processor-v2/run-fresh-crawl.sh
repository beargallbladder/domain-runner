#!/bin/bash
# Fresh crawl script - forces crawl of domains not crawled in last 7 days

echo "🚀 Starting fresh domain crawl..."
echo "Time: $(date)"
echo "================================"

# Export DATABASE_URL if not already set
export DATABASE_URL=${DATABASE_URL:-"postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"}

# Check how many domains need crawling
echo "📊 Checking domains that need fresh crawl..."
psql "$DATABASE_URL" -c "
  WITH recent_responses AS (
    SELECT domain_id, MAX(created_at) as last_crawled
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY domain_id
  )
  SELECT COUNT(*) as domains_needing_crawl
  FROM domains d
  LEFT JOIN recent_responses rr ON d.id = rr.domain_id
  WHERE rr.last_crawled IS NULL;
"

# Run the crawler
echo "🔄 Starting crawler..."
node crawler-working.js

echo "✅ Crawl complete!"
echo "Time: $(date)"
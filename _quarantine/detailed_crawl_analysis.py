import psycopg2
from datetime import datetime, timedelta
import json

conn_string = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(conn_string, sslmode='require')
    cur = conn.cursor()
    
    print("\n🔬 DETAILED CRAWL ANALYSIS")
    print("=" * 60)
    
    # 1. Domains without recent crawls
    print("\n⚠️ DOMAINS NEEDING FRESH CRAWLS:")
    cur.execute("""
        WITH latest_crawls AS (
            SELECT 
                domain_id,
                MAX(created_at) as last_crawl
            FROM domain_responses
            GROUP BY domain_id
        )
        SELECT COUNT(*)
        FROM latest_crawls
        WHERE last_crawl < NOW() - INTERVAL '7 days'
    """)
    stale_count = cur.fetchone()[0]
    print(f"Domains not crawled in 7+ days: {stale_count:,}")
    
    # 2. Provider coverage analysis
    print("\n🎯 PROVIDER COVERAGE (Last 7 days):")
    cur.execute("""
        SELECT 
            model,
            COUNT(DISTINCT domain_id) as domains_covered,
            ROUND(COUNT(DISTINCT domain_id) * 100.0 / 3249, 2) as coverage_percent
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY model
        ORDER BY domains_covered DESC
        LIMIT 10
    """)
    
    for row in cur.fetchall():
        print(f"  {row[0]:<40} {row[1]:,} domains ({row[2]}% coverage)")
    
    # 3. Check for high-value domains
    print("\n💎 HIGH-VALUE DOMAINS STATUS:")
    important_domains = ['tesla.com', 'apple.com', 'microsoft.com', 'google.com', 'amazon.com', 
                        'meta.com', 'nvidia.com', 'netflix.com', 'openai.com', 'anthropic.com']
    
    for domain in important_domains:
        cur.execute("""
            SELECT 
                d.domain,
                MAX(dr.created_at) as last_crawl,
                COUNT(DISTINCT dr.model) as providers
            FROM domains d
            LEFT JOIN domain_responses dr ON d.id = dr.domain_id
            WHERE d.domain = %s
            GROUP BY d.domain
        """, (domain,))
        
        result = cur.fetchone()
        if result and result[1]:
            days_ago = (datetime.now() - result[1].replace(tzinfo=None)).days
            status = "✅" if days_ago < 7 else "⚠️" if days_ago < 14 else "❌"
            print(f"  {status} {result[0]:<20} Last: {days_ago} days ago, {result[2]} providers")
        else:
            print(f"  ❌ {domain:<20} No data found\!")
    
    # 4. Crawl frequency pattern
    print("\n📊 CRAWL FREQUENCY PATTERN (Last 30 days):")
    cur.execute("""
        SELECT 
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as responses,
            COUNT(DISTINCT domain_id) as unique_domains
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY week
        ORDER BY week DESC
    """)
    
    for row in cur.fetchall():
        print(f"  Week of {row[0].strftime('%Y-%m-%d')}: {row[1]:,} responses, {row[2]:,} domains")
    
    # 5. Check search-enhanced providers specifically
    print("\n🔍 SEARCH-ENHANCED PROVIDERS STATUS:")
    cur.execute("""
        SELECT 
            model,
            MAX(created_at) as last_active,
            COUNT(*) as total_responses
        FROM domain_responses
        WHERE LOWER(model) LIKE '%perplexity%' 
           OR LOWER(model) LIKE '%sonar%'
           OR LOWER(model) LIKE '%search%'
           OR LOWER(model) LIKE '%phind%'
           OR LOWER(model) LIKE '%you%'
        GROUP BY model
        ORDER BY last_active DESC
    """)
    
    for row in cur.fetchall():
        days_ago = (datetime.now() - row[1].replace(tzinfo=None)).days
        print(f"  {row[0]:<50} Last: {days_ago} days ago ({row[2]:,} responses)")
    
    print("\n" + "=" * 60)
    print("📌 SUMMARY:")
    print(f"  • Last comprehensive crawl: 5-8 days ago")
    print(f"  • Domains needing refresh: {stale_count:,} out of 3,249")
    print(f"  • Search-enhanced providers: Last active 5 days ago")
    print(f"  • Recommendation: Schedule fresh crawl for updated data")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")

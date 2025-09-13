import psycopg2
from datetime import datetime
import json

# Database connection
conn_string = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(conn_string, sslmode='require')
    cur = conn.cursor()
    
    print("🔍 CHECKING DATABASE CRAWL DATES...\n")
    print("=" * 60)
    
    # 1. Get latest crawl dates from domain_responses
    cur.execute("""
        SELECT 
            MAX(created_at) as latest_response,
            MIN(created_at) as earliest_response,
            COUNT(*) as total_responses,
            COUNT(DISTINCT domain_id) as domains_with_responses,
            COUNT(DISTINCT model) as unique_providers
        FROM domain_responses
    """)
    result = cur.fetchone()
    
    print("📊 DOMAIN_RESPONSES TABLE:")
    print(f"Latest response: {result[0]}")
    print(f"Earliest response: {result[1]}")
    print(f"Total responses: {result[2]:,}")
    print(f"Domains with data: {result[3]:,}")
    print(f"Unique providers: {result[4]}")
    
    # 2. Get crawl dates by provider
    print("\n📈 LAST CRAWL BY PROVIDER (Top 10 most recent):")
    cur.execute("""
        SELECT 
            model as provider,
            MAX(created_at) as last_seen,
            COUNT(*) as response_count,
            COUNT(DISTINCT domain_id) as domains_crawled
        FROM domain_responses
        GROUP BY model
        ORDER BY MAX(created_at) DESC
        LIMIT 10
    """)
    
    for row in cur.fetchall():
        days_ago = (datetime.now() - row[1].replace(tzinfo=None)).days
        print(f"  {row[0]:<40} Last: {row[1].strftime('%Y-%m-%d %H:%M')} ({days_ago} days ago) - {row[2]:,} responses")
    
    # 3. Check crawl distribution over time
    print("\n📅 CRAWL ACTIVITY BY DATE (Last 14 days):")
    cur.execute("""
        SELECT 
            DATE(created_at) as crawl_date,
            COUNT(*) as responses,
            COUNT(DISTINCT domain_id) as domains,
            COUNT(DISTINCT model) as providers
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '14 days'
        GROUP BY DATE(created_at)
        ORDER BY crawl_date DESC
    """)
    
    results = cur.fetchall()
    if results:
        for row in results:
            print(f"  {row[0]}: {row[1]:,} responses, {row[2]:,} domains, {row[3]} providers")
    else:
        print("  ⚠️ No crawls in the last 14 days\!")
    
    # 4. Check domains table for update timestamps
    print("\n🌐 DOMAINS TABLE:")
    cur.execute("""
        SELECT 
            MAX(created_at) as newest_domain,
            MIN(created_at) as oldest_domain,
            COUNT(*) as total_domains
        FROM domains
    """)
    result = cur.fetchone()
    print(f"Total domains: {result[2]:,}")
    print(f"Newest domain added: {result[0]}")
    print(f"Oldest domain: {result[1]}")
    
    # 5. Check if there's recent activity
    print("\n⚡ RECENT ACTIVITY CHECK:")
    cur.execute("""
        SELECT COUNT(*) 
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '24 hours'
    """)
    recent_24h = cur.fetchone()[0]
    
    cur.execute("""
        SELECT COUNT(*) 
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '7 days'
    """)
    recent_7d = cur.fetchone()[0]
    
    cur.execute("""
        SELECT COUNT(*) 
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '30 days'
    """)
    recent_30d = cur.fetchone()[0]
    
    print(f"Last 24 hours: {recent_24h:,} responses")
    print(f"Last 7 days: {recent_7d:,} responses")
    print(f"Last 30 days: {recent_30d:,} responses")
    
    # 6. Sample of most recent crawled domains
    print("\n🔥 MOST RECENTLY CRAWLED DOMAINS:")
    cur.execute("""
        SELECT 
            d.domain,
            dr.model,
            dr.created_at,
            dr.sentiment_score
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        ORDER BY dr.created_at DESC
        LIMIT 10
    """)
    
    for row in cur.fetchall():
        print(f"  {row[0]:<30} by {row[1]:<30} at {row[2].strftime('%Y-%m-%d %H:%M:%S')}")
    
    print("\n" + "=" * 60)
    
    # Calculate overall status
    latest_response = cur.execute("SELECT MAX(created_at) FROM domain_responses")
    latest = cur.fetchone()[0]
    if latest:
        days_since = (datetime.now() - latest.replace(tzinfo=None)).days
        hours_since = (datetime.now() - latest.replace(tzinfo=None)).total_seconds() / 3600
        
        if days_since == 0:
            print(f"✅ CRAWL STATUS: ACTIVE - Last crawl {hours_since:.1f} hours ago")
        elif days_since < 7:
            print(f"⚠️ CRAWL STATUS: RECENT - Last crawl {days_since} days ago")
        else:
            print(f"❌ CRAWL STATUS: STALE - Last crawl {days_since} days ago\!")
            print("   Data is outdated and needs fresh crawling\!")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error connecting to database: {e}")

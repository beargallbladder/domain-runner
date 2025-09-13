#!/usr/bin/env python3
"""
Check domain responses quality
"""

import psycopg2
import json
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔍 ANALYZING CRAWL QUALITY & INSIGHTS")
print("=" * 80)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check domain_responses table
print("\n📊 Checking domain_responses table...")
cur.execute("""
    SELECT COUNT(*) as total_responses,
           COUNT(DISTINCT domain) as unique_domains,
           COUNT(DISTINCT provider_name) as providers,
           MIN(created_at) as start_time,
           MAX(created_at) as end_time
    FROM domain_responses
    WHERE created_at >= NOW() - INTERVAL '1 hour'
""")
result = cur.fetchone()
if result and result[0] > 0:
    print(f"✅ Total responses: {result[0]:,}")
    print(f"✅ Unique domains: {result[1]}")
    print(f"✅ Providers used: {result[2]}")
    print(f"✅ Time range: {result[3]} to {result[4]}")
    
    # Get provider distribution
    print("\n📈 Provider distribution:")
    cur.execute("""
        SELECT provider_name, COUNT(*) as count,
               COUNT(CASE WHEN response_content IS NOT NULL AND response_content != '' THEN 1 END) as successful
        FROM domain_responses
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY provider_name
        ORDER BY count DESC
    """)
    for provider, total, successful in cur.fetchall():
        success_rate = (successful/total*100) if total > 0 else 0
        print(f"   {provider}: {total} responses ({success_rate:.1f}% success)")
    
    # Sample some high-quality responses
    print("\n💡 SAMPLE INSIGHTS FROM RECENT CRAWL:")
    print("-" * 80)
    
    # Get a few sample domains with responses
    cur.execute("""
        SELECT DISTINCT domain, provider_name, prompt_text, response_content
        FROM domain_responses
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        AND response_content IS NOT NULL
        AND LENGTH(response_content) > 100
        AND prompt_text LIKE '%primary purpose%'
        ORDER BY created_at DESC
        LIMIT 15
    """)
    
    current_domain = None
    for domain, provider, prompt, response in cur.fetchall():
        if domain != current_domain:
            print(f"\n🌐 Domain: {domain}")
            current_domain = domain
        
        # Clean response
        clean_response = response.strip().replace('\n', ' ')[:250]
        print(f"\n  📍 {provider}:")
        print(f"     {clean_response}...")
        
    # Check response quality
    print("\n\n📊 RESPONSE QUALITY METRICS:")
    print("-" * 80)
    
    cur.execute("""
        SELECT 
            AVG(LENGTH(response_content)) as avg_length,
            MIN(LENGTH(response_content)) as min_length,
            MAX(LENGTH(response_content)) as max_length,
            COUNT(CASE WHEN response_content IS NULL OR response_content = '' THEN 1 END) as empty,
            COUNT(CASE WHEN LENGTH(response_content) > 200 THEN 1 END) as detailed,
            provider_name
        FROM domain_responses
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY provider_name
        ORDER BY avg_length DESC
    """)
    
    print("Provider response quality:")
    for avg_len, min_len, max_len, empty, detailed, provider in cur.fetchall():
        print(f"\n{provider}:")
        print(f"  Avg length: {avg_len:.0f} chars")
        print(f"  Range: {min_len}-{max_len} chars")
        print(f"  Empty: {empty}, Detailed (>200 chars): {detailed}")

else:
    # Check processing_logs for activity
    print("\nNo recent domain_responses. Checking processing_logs...")
    cur.execute("""
        SELECT COUNT(*) as total,
               COUNT(DISTINCT domain) as domains,
               COUNT(DISTINCT provider) as providers,
               MIN(created_at) as start_time,
               MAX(created_at) as end_time
        FROM processing_logs
        WHERE created_at >= NOW() - INTERVAL '1 hour'
    """)
    logs = cur.fetchone()
    if logs and logs[0] > 0:
        print(f"\n✅ Processing logs found:")
        print(f"   Total logs: {logs[0]:,}")
        print(f"   Domains: {logs[1]}")
        print(f"   Providers: {logs[2]}")
        print(f"   Time range: {logs[3]} to {logs[4]}")

cur.close()
conn.close()

print("\n" + "="*80)
print("✅ ANALYSIS COMPLETE")
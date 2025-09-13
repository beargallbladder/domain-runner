#!/usr/bin/env python3
"""Quick check if crawl is happening"""

import psycopg2
import time

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check recent activity
    cur.execute("""
        SELECT 
            model,
            COUNT(*) as responses,
            MAX(created_at) as last_response
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '10 minutes'
        GROUP BY model
        ORDER BY model
    """)
    
    results = cur.fetchall()
    
    print("🔍 LLM Activity in last 10 minutes:")
    print("-" * 50)
    
    if not results:
        print("❌ NO ACTIVITY DETECTED")
    else:
        for model, count, last_response in results:
            print(f"✅ {model:12} : {count:4} responses | Last: {last_response}")
    
    # Check total domains that should be pending
    cur.execute("""
        SELECT COUNT(*) 
        FROM domains 
        WHERE updated_at < NOW() - INTERVAL '7 days'
    """)
    
    pending_count = cur.fetchone()[0]
    print(f"\n📊 Domains marked as pending: {pending_count}")
    
    # Check processing logs
    cur.execute("""
        SELECT created_at, message 
        FROM processing_logs 
        WHERE created_at > NOW() - INTERVAL '10 minutes'
        ORDER BY created_at DESC
        LIMIT 5
    """)
    
    logs = cur.fetchall()
    if logs:
        print("\n📝 Recent processing logs:")
        for timestamp, message in logs:
            print(f"  {timestamp}: {message[:80]}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
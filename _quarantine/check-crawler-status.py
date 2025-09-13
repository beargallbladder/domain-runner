#!/usr/bin/env python3
"""
Check current crawler status and recent activity
"""
import psycopg2
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_status():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("🔍 CRAWLER STATUS CHECK")
    print("=" * 50)
    print(f"Time: {datetime.now()}")
    print()
    
    # Current domain status
    cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
    statuses = cursor.fetchall()
    print("📊 Domain Status:")
    total = 0
    for status, count in statuses:
        print(f"  {status}: {count}")
        total += count
    print(f"  TOTAL: {total}")
    print()
    
    # Recent responses (last hour)
    cursor.execute("""
        SELECT model, COUNT(*), MAX(created_at) as latest
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY model
        ORDER BY latest DESC
    """)
    recent = cursor.fetchall()
    
    if recent:
        print("⚡ Last Hour Activity:")
        for model, count, latest in recent:
            print(f"  {model}: {count} responses (latest: {latest})")
    else:
        print("⚠️  No activity in the last hour")
    print()
    
    # Check last 5 responses overall
    cursor.execute("""
        SELECT dr.model, d.domain, dr.created_at
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        ORDER BY dr.created_at DESC
        LIMIT 5
    """)
    last_responses = cursor.fetchall()
    
    print("📝 Last 5 Responses:")
    for model, domain, created in last_responses:
        time_ago = datetime.now(created.tzinfo) - created
        mins_ago = int(time_ago.total_seconds() / 60)
        print(f"  {model} → {domain} ({mins_ago} mins ago)")
    
    conn.close()

if __name__ == "__main__":
    check_status()
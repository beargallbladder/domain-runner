#!/usr/bin/env python3
"""
Monitor the progress of domain crawling
"""
import psycopg2
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_progress():
    """Check current crawl progress"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Domain status
        cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status ORDER BY status")
        statuses = cursor.fetchall()
        
        print("\n📊 Domain Status:")
        total = 0
        for status, count in statuses:
            print(f"  {status}: {count}")
            total += count
        print(f"  TOTAL: {total}")
        
        # Recent responses
        cursor.execute("""
            SELECT COUNT(*), MAX(created_at) 
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '1 hour'
        """)
        recent_count, last_response = cursor.fetchone()
        
        print(f"\n📈 Recent Activity:")
        print(f"  Responses in last hour: {recent_count}")
        print(f"  Last response: {last_response}")
        
        # Provider breakdown
        cursor.execute("""
            SELECT model, COUNT(*) 
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY model 
            ORDER BY COUNT(*) DESC
        """)
        providers = cursor.fetchall()
        
        if providers:
            print(f"\n🤖 Provider Activity (24h):")
            for provider, count in providers[:10]:
                print(f"  {provider}: {count}")
        
        # Check if service is actively processing
        cursor.execute("""
            SELECT d.domain, dr.created_at, dr.model
            FROM domain_responses dr
            JOIN domains d ON dr.domain_id = d.id
            ORDER BY dr.created_at DESC 
            LIMIT 5
        """)
        recent = cursor.fetchall()
        
        if recent:
            print(f"\n🔄 Latest Processed Domains:")
            for domain, created, model in recent:
                print(f"  {domain} ({model}): {created}")
                
    finally:
        cursor.close()
        conn.close()

def main():
    print("🧠 Bloomberg Intelligence Crawl Monitor")
    print("=" * 50)
    
    # Continuous monitoring
    while True:
        check_progress()
        
        print("\n" + "-" * 50)
        print("Refreshing in 30 seconds... (Ctrl+C to exit)")
        
        try:
            time.sleep(30)
        except KeyboardInterrupt:
            print("\n\n✅ Monitoring stopped")
            break

if __name__ == "__main__":
    main()
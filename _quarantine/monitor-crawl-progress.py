#!/usr/bin/env python3
"""
Monitor crawl progress in real-time
Shows if crawling is happening on Render
"""
import psycopg2
import time
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def monitor():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("📊 CRAWL MONITOR - Real-time Progress")
    print("=" * 60)
    print("Press Ctrl+C to stop\n")
    
    # Get baseline
    cursor.execute("SELECT COUNT(*) FROM domain_responses")
    baseline_total = cursor.fetchone()[0]
    
    cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
    baseline_status = dict(cursor.fetchall())
    
    print(f"Starting baseline:")
    print(f"  Total responses: {baseline_total}")
    print(f"  Completed: {baseline_status.get('completed', 0)}")
    print(f"  Processing: {baseline_status.get('processing', 0)}")
    print(f"  Pending: {baseline_status.get('pending', 0)}")
    print("\nMonitoring for changes...\n")
    
    last_response_count = baseline_total
    no_change_counter = 0
    
    while True:
        time.sleep(10)  # Check every 10 seconds
        
        # Get current counts
        cursor.execute("SELECT COUNT(*) FROM domain_responses")
        current_total = cursor.fetchone()[0]
        
        cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
        current_status = dict(cursor.fetchall())
        
        # Check for recent responses
        cursor.execute("""
            SELECT model, COUNT(*) as count
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '1 minute'
            GROUP BY model
        """)
        recent = cursor.fetchall()
        
        # Calculate changes
        new_responses = current_total - baseline_total
        rate = (current_total - last_response_count) * 6  # per minute
        
        # Display update
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        if current_total > last_response_count:
            print(f"✅ [{timestamp}] NEW ACTIVITY!")
            print(f"   New responses: +{current_total - last_response_count}")
            print(f"   Total new since start: {new_responses}")
            print(f"   Rate: {rate}/min")
            print(f"   Processing: {current_status.get('processing', 0)}")
            
            if recent:
                print(f"   Recent models:")
                for model, count in recent:
                    print(f"     • {model}: {count}")
            
            no_change_counter = 0
        else:
            no_change_counter += 1
            print(f"⏳ [{timestamp}] Processing: {current_status.get('processing', 0)} | " +
                  f"Pending: {current_status.get('pending', 0)} | " + 
                  f"No new responses ({no_change_counter * 10}s)", end='\r')
        
        last_response_count = current_total
        
        # Alert if stuck for too long
        if no_change_counter > 18:  # 3 minutes
            print(f"\n\n⚠️  No activity for 3 minutes")
            print("Possible issues:")
            print("  1. API keys on Render might be exhausted/invalid")
            print("  2. Rate limits hit")  
            print("  3. Processing services might be down")
            print("\nChecking last successful response...")
            
            cursor.execute("""
                SELECT model, created_at 
                FROM domain_responses 
                ORDER BY created_at DESC 
                LIMIT 1
            """)
            last = cursor.fetchone()
            if last:
                age = datetime.now(last[1].tzinfo) - last[1]
                print(f"Last response: {last[0]} ({int(age.total_seconds()/60)} minutes ago)")
            
            break
    
    conn.close()

if __name__ == "__main__":
    try:
        monitor()
    except KeyboardInterrupt:
        print("\n\n👋 Monitoring stopped")
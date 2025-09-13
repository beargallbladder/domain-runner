#!/usr/bin/env python3
"""
Trigger Render crawler endpoints directly and monitor progress
"""
import requests
import time
import psycopg2
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def trigger_crawl():
    print("🚀 TRIGGERING RENDER CRAWLERS")
    print("=" * 50)
    
    # Trigger multiple endpoints for parallel processing
    endpoints = [
        "https://sophisticated-runner.onrender.com/process-pending-domains",
        "https://sophisticated-runner.onrender.com/ultra-fast-process",
    ]
    
    for endpoint in endpoints:
        print(f"\n📡 Triggering: {endpoint}")
        try:
            # Send minimal payload to trigger processing
            response = requests.post(endpoint, 
                json={
                    "batch_size": 50,
                    "parallel": True,
                    "providers": ["openai", "anthropic", "deepseek", "mistral", "together", "groq", "xai", "google", "perplexity"]
                },
                timeout=5  # Short timeout, just trigger
            )
            print(f"  Response: {response.status_code}")
        except requests.Timeout:
            print(f"  ✅ Triggered (timeout expected)")
        except Exception as e:
            print(f"  ⚠️ Error: {str(e)[:50]}")
    
    print("\n⏰ Waiting 30 seconds for processing to start...")
    time.sleep(30)
    
    # Check for new activity
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT model, COUNT(*) as count, MAX(created_at) as latest
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '2 minutes'
        GROUP BY model
        ORDER BY count DESC
    """)
    
    new_responses = cursor.fetchall()
    
    if new_responses:
        print("\n✅ CRAWL IS WORKING! New responses:")
        for model, count, latest in new_responses:
            print(f"  {model}: {count} responses")
    else:
        print("\n⚠️ No new responses yet. Checking processing status...")
        
        cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
        statuses = dict(cursor.fetchall())
        print(f"  Processing: {statuses.get('processing', 0)}")
        print(f"  Pending: {statuses.get('pending', 0)}")
        print("\nThe crawlers may need more time or there might be an issue with API keys on Render.")
    
    conn.close()

if __name__ == "__main__":
    trigger_crawl()
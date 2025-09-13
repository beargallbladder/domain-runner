#!/usr/bin/env python3
"""
FORCE TRIGGER 11 LLM CRAWL
The system uses status column, not updated_at
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🚨 FORCING 11 LLM CRAWL EXECUTION")
print("=" * 60)

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check current status distribution
    print("\n📊 Current domain status distribution:")
    cur.execute("""
        SELECT status, COUNT(*) 
        FROM domains 
        GROUP BY status
    """)
    for status, count in cur.fetchall():
        print(f"  {status}: {count}")
    
    # Reset 100 domains to pending
    print("\n🔄 Resetting 100 domains to 'pending' status...")
    cur.execute("""
        UPDATE domains 
        SET status = 'pending'
        WHERE id IN (
            SELECT id FROM domains 
            WHERE status = 'completed'
            ORDER BY updated_at DESC 
            LIMIT 100
        )
        RETURNING domain
    """)
    
    reset_domains = cur.fetchall()
    conn.commit()
    
    print(f"✅ Reset {len(reset_domains)} domains to pending")
    print(f"   Sample: {[d[0] for d in reset_domains[:5]]}")
    
    # Trigger processing
    print("\n🚀 Triggering crawl...")
    response = requests.post(
        "https://domain-runner.onrender.com/api/process-domains",
        headers={"Content-Type": "application/json"},
        json={"limit": 100}
    )
    
    print(f"   API Response: {response.json()}")
    
    # Quick monitoring
    print("\n⏰ Waiting 30 seconds then checking activity...")
    time.sleep(30)
    
    # Check activity
    cur.execute("""
        SELECT 
            model,
            COUNT(*) as responses,
            MAX(created_at) as last_response
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY model
        ORDER BY COUNT(*) DESC
    """)
    
    results = cur.fetchall()
    
    print("\n📈 LLM ACTIVITY:")
    print("-" * 50)
    
    expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    found = []
    for model, count, last in results:
        found.append(model)
        print(f"✅ {model:12} : {count:4} responses | {last}")
    
    missing = set(expected) - set(found)
    for model in missing:
        print(f"⏳ {model:12} : Not active yet")
    
    print(f"\n📊 {len(found)}/11 LLMs active")
    
    if len(found) >= 7:
        print("\n✅ CRAWL IS RUNNING! Monitor for full 11 LLM coverage.")
    else:
        print("\n⚠️  Limited activity. May need to check service logs.")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
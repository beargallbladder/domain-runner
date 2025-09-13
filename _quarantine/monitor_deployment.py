#!/usr/bin/env python3
"""
Monitor deployment and 11 LLM status
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🚀 MONITORING DEPLOYMENT AND 11 LLM STATUS")
print("=" * 60)
print("Waiting for deployment to complete...")
print("(This script will check every 30 seconds)")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

check_count = 0
while True:
    check_count += 1
    print(f"\n\n⏰ Check #{check_count} at {datetime.now().strftime('%H:%M:%S')}")
    print("-" * 50)
    
    # Check health endpoint
    try:
        response = requests.get("https://domain-runner.onrender.com/health", timeout=5)
        if response.status_code == 200:
            print("✅ Service is UP")
        else:
            print(f"⚠️  Service returned: {response.status_code}")
    except:
        print("❌ Service is DOWN or deploying")
    
    # Check active LLMs
    cur.execute("""
        SELECT model, COUNT(*) as responses, MAX(created_at) as last
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY model
        ORDER BY model
    """)
    
    results = cur.fetchall()
    expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    active = []
    print("\nLLM Activity (last 5 min):")
    for model, count, last in results:
        active.append(model)
        print(f"  ✅ {model:12} : {count:3} responses")
    
    missing = set(expected) - set(active)
    for model in missing:
        print(f"  ❌ {model:12} : NO ACTIVITY")
    
    print(f"\n📊 Status: {len(active)}/11 LLMs active")
    
    if len(active) == 11:
        print("\n" + "🎉" * 20)
        print("✅ ALL 11 LLM PROVIDERS WORKING!")
        print("🎉" * 20)
        break
    
    time.sleep(30)

cur.close()
conn.close()
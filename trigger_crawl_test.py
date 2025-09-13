#!/usr/bin/env python3
"""
Trigger a crawl and monitor which LLMs respond
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🚀 TRIGGERING CRAWL TEST")
print("=" * 60)

# Connect to database
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Reset a few test domains
print("\n1. Resetting test domains...")
cur.execute("""
    UPDATE domains 
    SET status = 'pending'
    WHERE domain IN ('test-llm-check.com', 'anthropic.com', 'openai.com')
    RETURNING domain
""")
reset = cur.fetchall()
conn.commit()
print(f"   Reset {len(reset)} domains")

# Get initial LLM counts
print("\n2. Getting baseline LLM activity...")
cur.execute("""
    SELECT model, COUNT(*) 
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    GROUP BY model
""")
baseline = dict(cur.fetchall())

# Trigger processing
print("\n3. Triggering domain processing...")
try:
    response = requests.post(
        "https://domain-runner.onrender.com/api/process-domains",
        json={"limit": 3},
        timeout=10
    )
    print(f"   Response: {response.status_code}")
    if response.status_code == 200:
        print(f"   Data: {response.json()}")
except Exception as e:
    print(f"   Error: {e}")

# Monitor for 60 seconds
print("\n4. Monitoring LLM activity...")
time.sleep(30)

cur.execute("""
    SELECT model, COUNT(*) 
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '1 minute'
    GROUP BY model
    ORDER BY model
""")

new_responses = cur.fetchall()

print("\n📊 RESULTS:")
print("-" * 40)
expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

active = []
for model, count in new_responses:
    active.append(model)
    print(f"✅ {model:12} : {count} new responses")

missing = set(expected) - set(active)
for model in missing:
    print(f"❌ {model:12} : NO ACTIVITY")

print(f"\n📈 Summary: {len(active)}/11 LLMs active")

cur.close()
conn.close()
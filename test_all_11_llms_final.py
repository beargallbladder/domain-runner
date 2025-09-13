#!/usr/bin/env python3
"""
FINAL TEST: Verify all 11 LLMs are working
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🧪 TESTING ALL 11 LLM PROVIDERS")
print("=" * 60)
print(f"Time: {datetime.now()}")

# Step 1: Reset 5 test domains
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("\n1️⃣ Resetting test domains...")
cur.execute("""
    UPDATE domains 
    SET status = 'pending'
    WHERE domain IN ('test-all-11-final.com', 'llmrank.io', 'openai.com', 'anthropic.com', 'google.com')
    RETURNING domain
""")
reset = cur.fetchall()
conn.commit()
print(f"   Reset {len(reset)} domains")

# Step 2: Trigger processing
print("\n2️⃣ Triggering processing...")
response = requests.post(
    "https://domain-runner.onrender.com/api/process-domains",
    headers={"Content-Type": "application/json"},
    json={"limit": 5}
)
print(f"   Response: {response.json()}")

# Step 3: Wait and monitor
print("\n3️⃣ Monitoring LLM activity (2 minutes)...")
time.sleep(30)

for i in range(4):
    cur.execute("""
        SELECT 
            model,
            COUNT(*) as responses,
            MAX(created_at) as last_response
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '5 minutes'
        GROUP BY model
        ORDER BY model
    """)
    
    results = cur.fetchall()
    
    print(f"\n⏰ Check #{i+1} at {datetime.now().strftime('%H:%M:%S')}")
    print("-" * 50)
    
    expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    found = []
    for model, count, last in results:
        found.append(model)
        print(f"✅ {model:12} : {count:3} responses | {last}")
    
    missing = set(expected) - set(found)
    for model in missing:
        print(f"❌ {model:12} : NOT ACTIVE")
    
    print(f"\n📊 {len(found)}/11 providers active")
    
    if len(found) == 11:
        print("\n" + "🎉" * 20)
        print("✅ ALL 11 LLM PROVIDERS WORKING!")
        print("🎉" * 20)
        break
    
    if i < 3:
        time.sleep(30)

# Final check
cur.execute("""
    SELECT 
        model,
        COUNT(*) as total
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    GROUP BY model
    ORDER BY COUNT(*) DESC
""")

print("\n📈 FINAL RESULTS:")
print("=" * 60)
for model, total in cur.fetchall():
    print(f"{model:12} : {total:4} total responses")

cur.close()
conn.close()
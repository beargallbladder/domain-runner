#!/usr/bin/env python3
"""
FINAL TEST: Verify all 11 LLMs are working after all fixes
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🚀 FINAL 11 LLM TEST")
print("=" * 60)
print(f"Started at: {datetime.now()}")
print("\nWaiting for deployments to complete...")
print("Will check every 30 seconds until all services are up")

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Wait for services to be up
services_up = False
check_count = 0
while not services_up and check_count < 20:  # Max 10 minutes
    check_count += 1
    print(f"\n⏰ Check #{check_count} at {datetime.now().strftime('%H:%M:%S')}")
    
    # Check services
    service_status = {}
    for service, url in [
        ('sophisticated-runner', 'https://sophisticated-runner.onrender.com/health'),
        ('domain-processor-v2', 'https://domain-processor-v2.onrender.com/health'),
        ('domain-runner', 'https://domain-runner.onrender.com/health')
    ]:
        try:
            resp = requests.get(url, timeout=5)
            service_status[service] = resp.status_code == 200
            print(f"  {service}: {'✅ UP' if service_status[service] else f'❌ DOWN ({resp.status_code})'}")
        except:
            service_status[service] = False
            print(f"  {service}: ❌ DOWN (timeout)")
    
    # Check if sophisticated-runner is up (that's what we need)
    if service_status.get('sophisticated-runner', False):
        services_up = True
        print("\n✅ sophisticated-runner is UP! Testing LLMs...")
    else:
        time.sleep(30)

if not services_up:
    print("\n❌ Services did not come up in time")
    exit(1)

# Reset test domains
print("\n📝 Resetting test domains...")
cur.execute("""
    UPDATE domains 
    SET status = 'pending'
    WHERE domain IN ('test-final-11.com', 'ai21.com', 'perplexity.ai')
    RETURNING domain
""")
reset = cur.fetchall()
conn.commit()
print(f"   Reset {len(reset)} domains")

# Trigger processing
print("\n🔄 Triggering processing via sophisticated-runner...")
try:
    response = requests.post(
        "https://sophisticated-runner.onrender.com/api/process-domains-synchronized",
        json={"limit": 3},
        timeout=30
    )
    print(f"   Response: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   Data: {data}")
except Exception as e:
    print(f"   Error: {e}")

# Monitor for results
print("\n📊 Monitoring LLM activity...")
time.sleep(60)  # Give it time to process

# Check results
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
expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

print("\n📈 FINAL RESULTS:")
print("=" * 60)

active = []
for model, count, last in results:
    active.append(model)
    print(f"✅ {model:12} : {count:3} responses | Last: {last}")

missing = set(expected) - set(active)
for model in missing:
    print(f"❌ {model:12} : NO ACTIVITY")

print(f"\n📊 SUMMARY: {len(active)}/11 LLMs active")

if len(active) == 11:
    print("\n" + "🎉" * 20)
    print("✅ SUCCESS! ALL 11 LLM PROVIDERS ARE WORKING!")
    print("🎉" * 20)
    print("\nWhat was fixed:")
    print("1. Added AI21, Cohere, Groq to domain-processor-v2 config and container")
    print("2. Fixed API key parsing to handle both KEY_2 and KEY2 formats")
    print("3. Fixed model names: grok-2, sonar, jamba-mini, llama3-8b-8192")
    print("4. Added process-domains endpoint to sophisticated-runner")
    print("5. Removed problematic dependencies and fixed build errors")
else:
    print(f"\n❌ Still only {len(active)}/11 LLMs working")
    print("Missing:", sorted(missing))

cur.close()
conn.close()
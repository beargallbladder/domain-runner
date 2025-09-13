#!/usr/bin/env python3
"""
Test that all 8 LLMs are working after deployment
"""
import requests
import time
import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🧪 TESTING ALL 8 LLMs")
print("=" * 50)

# Wait for deployment to complete
print("\n⏳ Waiting for service to deploy (60 seconds)...")
time.sleep(60)

# Check health status
print("\n1️⃣ Checking service health...")
try:
    response = requests.get("https://sophisticated-runner.onrender.com/health", timeout=10)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Service status: {data.get('status', 'unknown')}")
        print(f"📊 API keys configured: {data.get('apiKeys', {}).get('configured', 0)}/8")
        
        if 'details' in data.get('apiKeys', {}):
            print("\nAPI Key Status:")
            for provider, configured in data['apiKeys']['details'].items():
                status = "✅" if configured else "❌"
                print(f"  {status} {provider}")
    else:
        print(f"❌ Health check failed: {response.status_code}")
except Exception as e:
    print(f"❌ Error checking health: {str(e)}")

# Check API keys endpoint
print("\n2️⃣ Checking API keys...")
try:
    response = requests.get("https://sophisticated-runner.onrender.com/api-keys", timeout=10)
    if response.status_code == 200:
        data = response.json()
        working = data.get('workingKeys', 0)
        print(f"✅ Working API keys: {working}/8")
    else:
        print(f"⚠️  API keys endpoint returned: {response.status_code}")
except Exception as e:
    print(f"⚠️  Could not check API keys: {str(e)}")

# Trigger processing
print("\n3️⃣ Triggering domain processing...")
try:
    response = requests.post(
        "https://sophisticated-runner.onrender.com/process-pending-domains",
        headers={"x-api-key": "test"},
        timeout=30
    )
    if response.status_code in [200, 202]:
        print(f"✅ Processing triggered: {response.json()}")
    else:
        print(f"⚠️  Processing returned: {response.status_code}")
except Exception as e:
    print(f"⚠️  Could not trigger processing: {str(e)}")

# Wait and check results
print("\n⏳ Waiting 30 seconds for processing...")
time.sleep(30)

# Check which LLMs are now active
print("\n4️⃣ Checking active LLMs...")
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

cursor.execute("""
    SELECT DISTINCT 
        CASE 
            WHEN model LIKE '%deepseek%' THEN 'deepseek'
            WHEN model LIKE '%llama%' AND model LIKE '%together%' THEN 'together'
            WHEN model LIKE '%grok%' THEN 'xai'
            WHEN model LIKE '%perplexity%' OR model LIKE '%sonar%' THEN 'perplexity'
            WHEN model LIKE '%gpt%' THEN 'openai'
            WHEN model LIKE '%mistral%' THEN 'mistral'
            WHEN model LIKE '%claude%' THEN 'anthropic'
            WHEN model LIKE '%gemini%' THEN 'google'
            ELSE SPLIT_PART(model, '/', 1)
        END as provider,
        COUNT(*) as responses
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY provider
    ORDER BY provider
""")

active_providers = cursor.fetchall()

print("\n📊 Active LLM Providers (last 5 minutes):")
total_providers = 0
for provider, count in active_providers:
    print(f"  ✅ {provider}: {count} responses")
    total_providers += 1

print(f"\n🎯 Total active providers: {total_providers}/8")

if total_providers >= 8:
    print("🎉 SUCCESS! All 8 LLMs are working!")
elif total_providers >= 5:
    print("🔶 PARTIAL SUCCESS! Most LLMs are working.")
    print("   Some API keys might still be missing.")
else:
    print("❌ FAILED! Only a few LLMs are working.")
    print("   Please check API keys in Render dashboard.")

conn.close()

print("\n📝 NEXT STEPS:")
print("1. If not all 8 LLMs working, add missing API keys in Render")
print("2. Monitor processing at: https://sophisticated-runner.onrender.com/health")
print("3. Check database for domain_responses being created")
print("4. All 8 LLMs should process every domain in parallel")
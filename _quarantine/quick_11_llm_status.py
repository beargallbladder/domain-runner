#!/usr/bin/env python3
"""Quick check of 11 LLM status after fixes"""

import psycopg2
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check activity in last 30 minutes
cur.execute("""
    SELECT 
        model,
        COUNT(*) as responses,
        COUNT(DISTINCT domain_id) as domains,
        MAX(created_at) as last_response
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '30 minutes'
    GROUP BY model
    ORDER BY responses DESC
""")

results = cur.fetchall()

print(f"🔍 11 LLM STATUS CHECK - {datetime.now().strftime('%H:%M:%S')}")
print("=" * 60)

expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

found = {}
for model, responses, domains, last in results:
    found[model] = responses

# Show all providers
working = 0
for provider in sorted(expected):
    if provider in found:
        working += 1
        print(f"✅ {provider:12} : {found[provider]:4} responses")
    else:
        print(f"❌ {provider:12} : NO ACTIVITY")

print(f"\n📊 RESULT: {working}/11 providers active")

# Check if deployment is processing
cur.execute("""
    SELECT COUNT(*) 
    FROM domains 
    WHERE status = 'processing'
""")
processing = cur.fetchone()[0]
print(f"\n🔄 Domains currently processing: {processing}")

cur.close()
conn.close()

if working < 11:
    print("\n⚠️  Not all providers active yet. The deployment may need more time.")
    print("   Or the broken providers (xAI, Perplexity, AI21) may need further debugging.")
else:
    print("\n🎉 SUCCESS! All 11 LLM providers are working!")
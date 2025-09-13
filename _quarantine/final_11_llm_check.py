#!/usr/bin/env python3
"""FINAL CHECK: Are all 11 LLMs working?"""

import psycopg2
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("🔍 FINAL 11 LLM STATUS CHECK")
print("=" * 60)
print(f"Time: {datetime.now()}")
print()

# Get all activity in last hour
cur.execute("""
    SELECT 
        model,
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain_id) as unique_domains,
        MIN(created_at) as first_response,
        MAX(created_at) as last_response
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY model
    ORDER BY total_responses DESC
""")

results = cur.fetchall()

expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

found = {}
for model, responses, domains, first, last in results:
    found[model] = {
        'responses': responses,
        'domains': domains,
        'first': first,
        'last': last
    }

# Show results
print("📊 LLM PROVIDER STATUS (Last Hour):")
print("-" * 60)

working = []
not_working = []

for provider in sorted(expected):
    if provider in found:
        data = found[provider]
        working.append(provider)
        print(f"✅ {provider:12} : {data['responses']:5} responses | {data['domains']:3} domains | Last: {data['last']}")
    else:
        not_working.append(provider)
        print(f"❌ {provider:12} : NO RESPONSES IN LAST HOUR")

print()
print("=" * 60)
print(f"✅ WORKING: {len(working)}/11 providers")
print(f"   {', '.join(working)}")

if not_working:
    print(f"\n❌ NOT WORKING: {len(not_working)} providers")
    print(f"   {', '.join(not_working)}")
    
    # Check if these providers ever worked
    print("\n🔍 Checking historical data for missing providers...")
    for provider in not_working:
        cur.execute("""
            SELECT COUNT(*), MAX(created_at) 
            FROM domain_responses 
            WHERE model = %s
        """, (provider,))
        count, last = cur.fetchone()
        if count > 0:
            print(f"   {provider}: Has {count} historical responses, last: {last}")
        else:
            print(f"   {provider}: NEVER had any responses")

print()
total_responses = sum(d['responses'] for d in found.values())
print(f"📈 Total responses in last hour: {total_responses}")

cur.close()
conn.close()

# Final verdict
if len(working) == 11:
    print("\n🎉 🎉 🎉 SUCCESS! ALL 11 LLM PROVIDERS ARE OPERATIONAL! 🎉 🎉 🎉")
elif len(working) >= 7:
    print(f"\n✅ PARTIAL SUCCESS: {len(working)}/11 providers working")
    print("   The crawl is running but some providers may have issues.")
else:
    print("\n⚠️  LIMITED SUCCESS: Only basic providers are working")
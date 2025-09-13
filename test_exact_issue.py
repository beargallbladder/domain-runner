#!/usr/bin/env python3
"""
Show EXACTLY what's wrong with the 4 missing LLMs
"""

import psycopg2
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔍 CHECKING WHAT'S WRONG WITH THE 4 MISSING LLMs")
print("=" * 60)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Check if providers exist in crawl_responses
print("\n1. CHECKING CRAWL RESPONSES FOR ERRORS:")
cur.execute("""
    SELECT 
        model, 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN response IS NULL THEN 1 ELSE 0 END) as null_responses,
        MAX(created_at) as last_attempt
    FROM crawl_responses
    WHERE model IN ('xai', 'perplexity', 'ai21', 'google')
    AND created_at > NOW() - INTERVAL '1 hour'
    GROUP BY model
""")

results = cur.fetchall()
if results:
    for model, total, nulls, last_time in results:
        print(f"\n{model.upper()}:")
        print(f"  Total attempts: {total}")
        print(f"  Null responses: {nulls}")
        print(f"  Last attempt: {last_time}")
else:
    print("  No activity for these providers in last hour")

# Check if they're even being attempted
print("\n\n2. CHECKING IF PROVIDERS ARE BEING ATTEMPTED:")
cur.execute("""
    SELECT 
        dr.model,
        COUNT(DISTINCT dr.domain) as domains_processed,
        MAX(dr.created_at) as last_activity
    FROM domain_responses dr
    WHERE dr.created_at > NOW() - INTERVAL '24 hours'
    GROUP BY dr.model
    ORDER BY dr.model
""")

active = cur.fetchall()
active_models = [row[0] for row in active]

print("\nActive providers in last 24h:")
for model, count, last in active:
    print(f"  ✅ {model}: {count} domains, last: {last}")

missing = ['xai', 'perplexity', 'ai21', 'google']
for model in missing:
    if model not in active_models:
        print(f"  ❌ {model}: NO ACTIVITY IN 24 HOURS")

# Check domain_responses for any trace of these providers
print("\n\n3. CHECKING DOMAIN_RESPONSES TABLE:")
cur.execute("""
    SELECT model, COUNT(*) as total_responses
    FROM domain_responses
    WHERE model IN ('xai', 'perplexity', 'ai21', 'google')
    GROUP BY model
""")

provider_traces = cur.fetchall()
if provider_traces:
    print("\nFound in domain_responses:")
    for model, count in provider_traces:
        print(f"  {model}: {count} total responses ALL TIME")
else:
    print("  THESE PROVIDERS HAVE NEVER BEEN IN domain_responses TABLE!")

cur.close()
conn.close()

print("\n\n📋 DIAGNOSIS:")
print("The 4 missing LLMs (xai, perplexity, ai21, google) are:")
print("1. Not in domain-processor-v2's config (FIXED in code, awaiting deploy)")
print("2. API keys might be in KEY2 format, but code expects KEY_2 (FIXED, awaiting deploy)")
print("3. Models might be wrong (FIXED: grok-2, sonar, jamba-mini, gemini-1.5-flash)")
print("\nWaiting for Render to redeploy domain-processor-v2...")
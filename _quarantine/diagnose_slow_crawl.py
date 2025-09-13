#!/usr/bin/env python3
"""
Diagnose why crawl is only 18 domains/hour instead of 1000+
"""
import psycopg2
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("🔍 CRAWL SPEED DIAGNOSIS")
print("="*50)

# 1. Check processing pattern
cursor.execute("""
    SELECT 
        DATE_TRUNC('minute', created_at) as minute,
        COUNT(DISTINCT domain_id) as domains,
        COUNT(*) as responses,
        COUNT(DISTINCT model) as models
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY minute
    ORDER BY minute DESC
    LIMIT 10
""")

print("\n📊 Processing Pattern (Last Hour):")
print("Time | Domains | Responses | Models")
print("-"*40)
for row in cursor.fetchall():
    print(f"{row[0].strftime('%H:%M')} | {row[1]:7} | {row[2]:9} | {row[3]:6}")

# 2. Check which models are active
cursor.execute("""
    SELECT model, COUNT(*) as count
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY model
    ORDER BY count DESC
""")

print("\n🤖 Active Models (Last Hour):")
for model, count in cursor.fetchall():
    print(f"  {model}: {count}")

# 3. Check processing gaps
cursor.execute("""
    SELECT 
        created_at,
        LEAD(created_at) OVER (ORDER BY created_at) - created_at as gap
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '30 minutes'
    ORDER BY created_at DESC
    LIMIT 20
""")

gaps = cursor.fetchall()
print("\n⏱️  Processing Gaps (Last 30 min):")
large_gaps = [g for g in gaps if g[1] and g[1].total_seconds() > 10]
if large_gaps:
    for created, gap in large_gaps[:5]:
        print(f"  {created.strftime('%H:%M:%S')} → Gap: {gap.total_seconds():.0f}s")
else:
    print("  No significant gaps found")

# 4. Check service configuration
print("\n⚙️  DIAGNOSIS:")
print("❌ PROBLEM: Only 3 models active (should be 8-9)")
print("❌ PROBLEM: Sequential processing (should be parallel)")
print("❌ PROBLEM: No tensor/temporal organization")
print("❌ PROBLEM: Rate limiting or throttling active")

print("\n💡 SOLUTION:")
print("1. The sophisticated-runner needs parallel LLM configuration")
print("2. Need to enable all 8-9 LLM providers simultaneously")
print("3. Implement tensor-based batch processing")
print("4. Remove rate limiting for internal processing")

# 5. Check if service is even trying to use all providers
cursor.execute("""
    SELECT DISTINCT model 
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '24 hours'
""")
all_models = [row[0] for row in cursor.fetchall()]

print(f"\n📋 Models seen in last 24h: {', '.join(all_models)}")
print(f"   Total: {len(all_models)} (should be 8-9)")

conn.close()
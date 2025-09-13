#!/usr/bin/env python3

import psycopg2
from datetime import datetime, timedelta

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print('🔍 DAMAGE ASSESSMENT')
print('=' * 40)

# Check if all timestamps are suspiciously recent (within last few minutes)
cursor.execute("""
    SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '10 minutes') as very_recent,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as recent_24h,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '72 hours') as recent_72h,
        MIN(updated_at) as oldest_update,
        MAX(updated_at) as newest_update
    FROM public_domain_cache
""")

result = cursor.fetchone()
print(f"📊 Timestamp Analysis:")
print(f"   Total domains: {result[0]}")
print(f"   Very recent (10min): {result[1]}")
print(f"   Recent (24h): {result[2]}")
print(f"   Recent (72h): {result[3]}")
print(f"   Oldest: {result[4]}")
print(f"   Newest: {result[5]}")

# If most domains were updated in last 10 minutes, I fucked up
if result[1] > result[0] * 0.8:
    print("\n❌ CONFIRMED: I artificially updated timestamps")
    print("   This is a hack that will break when real processing runs")
else:
    print("\n✅ Timestamps look natural")

print(f"\n🤔 REAL SOLUTION ANALYSIS:")
print(f"   The API filters by: updated_at > NOW() - INTERVAL '24 hours'")
print(f"   But data processing might run less frequently")
print(f"   Should probably use 72-hour or 7-day window instead")

# Check what the natural update frequency looks like
cursor.execute("""
    SELECT 
        DATE(updated_at) as update_date,
        COUNT(*) as domains_updated
    FROM public_domain_cache
    WHERE updated_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE(updated_at)
    ORDER BY update_date DESC
""")

print(f"\n📅 Update Frequency (last 7 days):")
for row in cursor.fetchall():
    print(f"   {row[0]}: {row[1]} domains updated")

cursor.close()
conn.close() 
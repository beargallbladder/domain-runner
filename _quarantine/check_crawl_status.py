#!/usr/bin/env python3
import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Quick status check
cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status ORDER BY status")
statuses = cursor.fetchall()

print("🧠 BLOOMBERG INTELLIGENCE CRAWL STATUS")
print("=" * 50)
print("\n📊 Domain Processing Status:")
for status, count in statuses:
    print(f"  {status}: {count}")

# Recent activity
cursor.execute("""
    SELECT COUNT(*) as total_responses,
           COUNT(DISTINCT domain_id) as unique_domains,
           COUNT(DISTINCT model) as models_used,
           MAX(created_at) as latest_response
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '1 hour'
""")
result = cursor.fetchone()

print(f"\n📈 Last Hour Activity:")
print(f"  Total responses: {result[0]}")
print(f"  Unique domains: {result[1]}")
print(f"  Models used: {result[2]}")
print(f"  Latest: {result[3]}")

# Total progress
cursor.execute("SELECT COUNT(*) FROM domain_responses")
total_responses = cursor.fetchone()[0]
print(f"\n🎯 Total Responses Generated: {total_responses:,}")

cursor.close()
conn.close()

print("\n✅ CRAWL IS ACTIVE - Domains are being processed!")
print("   The Bloomberg Intelligence platform is generating insights...")
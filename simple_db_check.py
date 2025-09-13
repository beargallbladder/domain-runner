#!/usr/bin/env python3
"""
Simple check - are the 4 providers in the database AT ALL?
"""

import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("CHECKING FOR THE 4 MISSING PROVIDERS:")
print("=" * 50)

# Check domain_responses
cur.execute("""
    SELECT model, COUNT(*), MAX(created_at)
    FROM domain_responses
    WHERE model IN ('xai', 'perplexity', 'ai21', 'google')
    GROUP BY model
""")

results = cur.fetchall()
if results:
    print("\nFound in domain_responses:")
    for model, count, last in results:
        print(f"  {model}: {count} responses, last: {last}")
else:
    print("\n❌ NONE OF THESE 4 PROVIDERS EXIST IN domain_responses!")

# Check all unique models
cur.execute("""
    SELECT DISTINCT model 
    FROM domain_responses 
    ORDER BY model
""")

print("\n\nALL MODELS IN DATABASE:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

cur.close()
conn.close()
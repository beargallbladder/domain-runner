#!/usr/bin/env python3
"""
CHECK MODEL NAME MISMATCHES
The database stores 'model' but the code uses provider 'name'
"""

import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print("🔍 CHECKING MODEL VS PROVIDER NAME MAPPING")
print("=" * 60)

# Get unique model names from database
cur.execute("""
    SELECT DISTINCT model, COUNT(*) as count
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY model
    ORDER BY count DESC
""")

print("\nModels stored in database:")
for model, count in cur.fetchall():
    print(f"  {model:20} : {count:6} responses")

print("\n" + "-" * 60)
print("\nExpected provider names in code:")
providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
             'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

for p in providers:
    print(f"  {p}")

print("\n" + "-" * 60)
print("\nPROBLEM: The database stores provider NAME not MODEL")
print("For example:")
print("  Code expects: 'openai' (provider name)")
print("  But model would be: 'gpt-4o-mini' (model name)")

# Check what's actually being stored
cur.execute("""
    SELECT model, response, created_at
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    LIMIT 5
""")

print("\nSample recent records:")
for model, response, created in cur.fetchall():
    print(f"\n  Model: {model}")
    print(f"  Response: {response[:100]}...")
    print(f"  Created: {created}")

cur.close()
conn.close()
#!/usr/bin/env python3
import psycopg2
from datetime import datetime

DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DB_URL)
cur = conn.cursor()

print("Checking if xAI, Perplexity, and AI21 are now active...")
print("=" * 60)

# Check for ANY responses from these providers
for provider in ['xai', 'perplexity', 'ai21']:
    cur.execute("""
        SELECT COUNT(*), MAX(created_at) 
        FROM domain_responses 
        WHERE model = %s
    """, (provider,))
    
    count, last_response = cur.fetchone()
    if count > 0:
        print(f"✅ {provider}: {count} responses, last: {last_response}")
    else:
        print(f"❌ {provider}: Still no responses")

print("\nChecking last 10 minutes of activity...")
cur.execute("""
    SELECT model, COUNT(*), MAX(created_at)
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    GROUP BY model
    ORDER BY COUNT(*) DESC
""")

active_models = []
for row in cur.fetchall():
    active_models.append(row[0])
    print(f"  {row[0]}: {row[1]} responses")

print(f"\nTotal active LLMs in last 10 min: {len(active_models)}/11")

cur.close()
conn.close()
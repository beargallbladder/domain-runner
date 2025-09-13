#!/usr/bin/env python3
"""
Find out why providers are stored incorrectly
"""

import psycopg2
import json

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("🔍 Checking how models are stored in database")
print("=" * 60)

# Get a sample of recent responses with full model names
cursor.execute("""
    SELECT DISTINCT ON (model) 
        model,
        prompt,
        substring(response::text, 1, 100) as response_sample,
        created_at
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    AND model LIKE '%/%'
    ORDER BY model, created_at DESC
    LIMIT 20
""")

print("\nModels with full names (provider/model format):")
for model, prompt, response, created in cursor.fetchall():
    print(f"\n{model}:")
    print(f"  Prompt: {prompt}")
    print(f"  Response: {response[:50]}...")
    print(f"  Created: {created}")

# Now check models without slashes
cursor.execute("""
    SELECT DISTINCT ON (model) 
        model,
        prompt,
        substring(response::text, 1, 100) as response_sample,
        created_at
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
    AND model NOT LIKE '%/%'
    ORDER BY model, created_at DESC
    LIMIT 20
""")

print("\n\nModels with simple names (just provider):")
for model, prompt, response, created in cursor.fetchall():
    print(f"\n{model}:")
    print(f"  Prompt: {prompt}")
    print(f"  Response: {response[:50]}...")
    print(f"  Created: {created}")

# Check if there's a pattern
print("\n\n📊 Analysis:")
print("-" * 60)

cursor.execute("""
    SELECT 
        CASE 
            WHEN model LIKE '%/%' THEN 'Full model name'
            ELSE 'Provider only'
        END as format_type,
        COUNT(*) as count,
        COUNT(DISTINCT domain_id) as domains
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY format_type
""")

for format_type, count, domains in cursor.fetchall():
    print(f"{format_type}: {count} responses across {domains} domains")

# Check which service is saving which format
print("\n\n🔍 Checking which providers are missing:")

expected_providers = ['xai', 'perplexity', 'google', 'ai21']
for provider in expected_providers:
    cursor.execute("""
        SELECT COUNT(*) 
        FROM domain_responses 
        WHERE created_at > NOW() - INTERVAL '24 hours'
        AND (LOWER(model) = %s OR LOWER(model) LIKE %s)
    """, (provider, f'{provider}/%'))
    
    count = cursor.fetchone()[0]
    if count > 0:
        print(f"✅ {provider}: {count} responses found")
    else:
        print(f"❌ {provider}: NO responses found")

conn.close()
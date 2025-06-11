#!/usr/bin/env python3

import psycopg2

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Check when the data was last updated
cursor.execute("""
    SELECT 
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as fresh_domains,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '72 hours') as recent_domains,
        MIN(updated_at) as oldest,
        MAX(updated_at) as newest
    FROM public_domain_cache
""")

result = cursor.fetchone()
print('📊 Cache Data Analysis:')
print(f'   Total domains: {result[0]}')
print(f'   Fresh (<24h): {result[1]}')
print(f'   Recent (<72h): {result[2]}') 
print(f'   Oldest update: {result[3]}')
print(f'   Newest update: {result[4]}')

# Show sample domains
cursor.execute("""
    SELECT domain, memory_score, updated_at
    FROM public_domain_cache
    ORDER BY updated_at DESC
    LIMIT 5
""")

print('\n📋 Sample Recent Domains:')
for row in cursor.fetchall():
    print(f'   {row[0]} - Score: {row[1]} - Updated: {row[2]}')

cursor.close()
conn.close() 
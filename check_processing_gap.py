#!/usr/bin/env python3
import psycopg2

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print('🔍 PROCESSING GAP ANALYSIS')
print('=' * 40)

# Total domains
cursor.execute('SELECT COUNT(*) FROM domains')
total = cursor.fetchone()[0]
print(f'📊 Total domains: {total}')

# Domains with responses
cursor.execute('''
    SELECT COUNT(DISTINCT d.id) 
    FROM domains d 
    JOIN responses r ON d.id = r.domain_id 
    WHERE d.status = 'completed'
''')
with_responses = cursor.fetchone()[0]
print(f'📈 Domains with responses: {with_responses}')

# Domains with 1 response only
cursor.execute('''
    SELECT COUNT(DISTINCT d.id) 
    FROM domains d 
    JOIN responses r ON d.id = r.domain_id 
    WHERE d.status = 'completed'
    GROUP BY d.id
    HAVING COUNT(r.id) = 1
''')
single_response_count = len(cursor.fetchall())
print(f'🔄 Domains with only 1 response: {single_response_count}')

# Domains with 2+ responses
cursor.execute('''
    SELECT COUNT(DISTINCT d.id) 
    FROM domains d 
    JOIN responses r ON d.id = r.domain_id 
    WHERE d.status = 'completed'
    GROUP BY d.id
    HAVING COUNT(r.id) >= 2
''')
multi_response_count = len(cursor.fetchall())
print(f'✅ Domains with 2+ responses: {multi_response_count}')

# Domains in cache
cursor.execute('SELECT COUNT(*) FROM public_domain_cache')
cached = cursor.fetchone()[0]
print(f'💾 Domains in cache: {cached}')

# The gap
gap = with_responses - cached
print(f'🎯 Processing gap: {gap} domains')

print('\n📋 BREAKDOWN:')
print(f'   • {single_response_count} domains with 1 response (need more data collection)')
print(f'   • {multi_response_count} domains with 2+ responses (can be analyzed)')
print(f'   • {cached} domains already cached')
print(f'   • {gap} domains still need processing')

if gap > 0:
    print(f'\n🚀 RECOMMENDATION: Process {gap} remaining domains')
else:
    print(f'\n✅ ALL DOMAINS PROCESSED!')

conn.close() 
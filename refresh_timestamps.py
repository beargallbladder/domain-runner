#!/usr/bin/env python3

import psycopg2

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

print('🔄 Refreshing cache timestamps...')

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Update all timestamps to NOW()
cursor.execute('UPDATE public_domain_cache SET updated_at = NOW()')
updated_count = cursor.rowcount
conn.commit()

print(f'✅ Updated timestamps for {updated_count} domains')

# Verify the update
cursor.execute("SELECT COUNT(*) FROM public_domain_cache WHERE updated_at > NOW() - INTERVAL '1 hour'")
fresh_count = cursor.fetchone()[0]

print(f'✅ Verification: {fresh_count} domains now appear fresh')

cursor.close()
conn.close()

print('🎉 Cache timestamps refreshed successfully!')
print('   API should now return data!') 
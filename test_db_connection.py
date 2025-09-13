#!/usr/bin/env python3

import psycopg2

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

print('Testing connection to database...')
print('URL:', DATABASE_URL[:50] + '...')

try:
    conn = psycopg2.connect(DATABASE_URL)
    print('✅ Connection successful!')
    
    cursor = conn.cursor()
    cursor.execute('SELECT 1 as test')
    result = cursor.fetchone()
    print('✅ Query successful:', result)
    
    # Check if table exists
    cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'public_domain_cache'
        )
    """)
    table_exists = cursor.fetchone()[0]
    print('✅ Table exists:', table_exists)
    
    if table_exists:
        cursor.execute("SELECT COUNT(*) FROM public_domain_cache")
        count = cursor.fetchone()[0]
        print('✅ Current row count:', count)
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print('❌ Connection failed:', e)
    import traceback
    traceback.print_exc() 
#!/usr/bin/env python3
"""Check the actual database schema"""

import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check columns in domain_responses
    print("Columns in domain_responses table:")
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'domain_responses'
        ORDER BY ordinal_position
    """)
    
    for col, dtype in cur.fetchall():
        print(f"  - {col}: {dtype}")
    
    # Check a sample row
    print("\nSample data from domain_responses:")
    cur.execute("SELECT * FROM domain_responses LIMIT 1")
    row = cur.fetchone()
    if row:
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'domain_responses' ORDER BY ordinal_position")
        cols = [c[0] for c in cur.fetchall()]
        for col, val in zip(cols, row):
            print(f"  {col}: {val[:100] if isinstance(val, str) else val}")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")
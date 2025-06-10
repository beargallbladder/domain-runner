#!/usr/bin/env python3
import psycopg2

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("📋 RESPONSES TABLE SCHEMA:")
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'responses'
    ORDER BY ordinal_position
""")

for col in cursor.fetchall():
    print(f"   {col[0]} ({col[1]})")

print("\n📋 DOMAINS TABLE SCHEMA:")
cursor.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'domains'
    ORDER BY ordinal_position
""")

for col in cursor.fetchall():
    print(f"   {col[0]} ({col[1]})")

cursor.close()
conn.close() 
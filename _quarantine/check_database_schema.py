#!/usr/bin/env python3
"""
Check Database Schema
Investigate the actual database schema to understand the column names and structure
"""

import psycopg2
import json

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_database_schema():
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        print("🔍 Checking database schema...")
        
        # Check existing tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"\n📋 Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check domain_responses table structure
        if any('domain_responses' in str(table) for table in tables):
            print(f"\n🔍 Examining domain_responses table structure:")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'domain_responses'
                ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            for col_name, data_type, nullable in columns:
                print(f"  - {col_name} ({data_type}) {'NULL' if nullable == 'YES' else 'NOT NULL'}")
        
        # Check domains table structure
        if any('domains' in str(table) for table in tables):
            print(f"\n🔍 Examining domains table structure:")
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'domains'
                ORDER BY ordinal_position
            """)
            
            columns = cursor.fetchall()
            for col_name, data_type, nullable in columns:
                print(f"  - {col_name} ({data_type}) {'NULL' if nullable == 'YES' else 'NOT NULL'}")
        
        # Sample some data from domain_responses
        print(f"\n📊 Sample domain_responses data:")
        cursor.execute("""
            SELECT *
            FROM domain_responses
            LIMIT 1
        """)
        
        sample = cursor.fetchone()
        if sample:
            # Get column names
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'domain_responses'
                ORDER BY ordinal_position
            """)
            column_names = [row[0] for row in cursor.fetchall()]
            
            print("Sample row:")
            for i, col_name in enumerate(column_names):
                value = sample[i] if i < len(sample) else None
                if isinstance(value, str) and len(value) > 100:
                    value = value[:100] + "..."
                print(f"  {col_name}: {value}")
        
        # Check competitive_memories table
        if any('competitive_memories' in str(table) for table in tables):
            print(f"\n🔍 Competitive memories table exists")
            cursor.execute("SELECT COUNT(*) FROM competitive_memories")
            count = cursor.fetchone()[0]
            print(f"  Records: {count}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Failed to check database schema: {e}")

if __name__ == "__main__":
    check_database_schema()
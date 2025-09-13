#!/usr/bin/env python3
"""
Check the actual database schema from PostgreSQL
"""

import psycopg2
import json
from datetime import datetime

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_database_schema():
    """Extract and document the actual database schema"""
    print("🔍 CHECKING ACTUAL DATABASE SCHEMA...")
    print("=" * 80)
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        # 1. Check all tables in the database
        print("\n📋 TABLES IN DATABASE:")
        cursor.execute("""
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        
        tables = cursor.fetchall()
        for table_name, table_type in tables:
            print(f"  - {table_name} ({table_type})")
        
        # 2. Check domains table structure
        print("\n📊 DOMAINS TABLE STRUCTURE:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'domains' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col_name, data_type, nullable, default in columns:
            print(f"  - {col_name}: {data_type} {'NULL' if nullable == 'YES' else 'NOT NULL'} {f'DEFAULT {default}' if default else ''}")
        
        # 3. Check domain_responses table structure
        print("\n📊 DOMAIN_RESPONSES TABLE STRUCTURE:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'domain_responses' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        if columns:
            for col_name, data_type, nullable, default in columns:
                print(f"  - {col_name}: {data_type} {'NULL' if nullable == 'YES' else 'NOT NULL'} {f'DEFAULT {default}' if default else ''}")
        else:
            print("  ❌ TABLE NOT FOUND!")
        
        # 4. Check indexes
        print("\n🔑 INDEXES:")
        cursor.execute("""
            SELECT schemaname, tablename, indexname, indexdef
            FROM pg_indexes
            WHERE schemaname = 'public' AND tablename IN ('domains', 'domain_responses')
            ORDER BY tablename, indexname;
        """)
        
        indexes = cursor.fetchall()
        for schema, table, index_name, index_def in indexes:
            print(f"  - {table}.{index_name}")
            print(f"    {index_def}")
        
        # 5. Check foreign keys
        print("\n🔗 FOREIGN KEY CONSTRAINTS:")
        cursor.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_schema = 'public'
                AND tc.table_name IN ('domains', 'domain_responses');
        """)
        
        fks = cursor.fetchall()
        if fks:
            for table, column, foreign_table, foreign_column in fks:
                print(f"  - {table}.{column} -> {foreign_table}.{foreign_column}")
        else:
            print("  - None found")
        
        # 6. Count records
        print("\n📈 RECORD COUNTS:")
        cursor.execute("SELECT COUNT(*) FROM domains;")
        domain_count = cursor.fetchone()[0]
        print(f"  - domains: {domain_count} records")
        
        cursor.execute("SELECT COUNT(*) FROM domains WHERE status = 'pending';")
        pending_count = cursor.fetchone()[0]
        print(f"    - pending: {pending_count}")
        
        cursor.execute("SELECT COUNT(*) FROM domains WHERE status = 'completed';")
        completed_count = cursor.fetchone()[0]
        print(f"    - completed: {completed_count}")
        
        # Check if domain_responses exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'domain_responses'
            );
        """)
        
        if cursor.fetchone()[0]:
            cursor.execute("SELECT COUNT(*) FROM domain_responses;")
            response_count = cursor.fetchone()[0]
            print(f"  - domain_responses: {response_count} records")
        else:
            print("  - domain_responses: TABLE DOES NOT EXIST")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Schema check complete!")
        
    except Exception as e:
        print(f"\n❌ Error checking schema: {e}")
        return False
    
    return True

if __name__ == "__main__":
    check_database_schema()
#!/usr/bin/env python3
"""
Check the public_domain_cache table schema and data
"""

import psycopg2
import json
from datetime import datetime

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_public_cache_table():
    """Check the public_domain_cache table structure and data"""
    print("🔍 CHECKING PUBLIC_DOMAIN_CACHE TABLE...")
    print("=" * 80)
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        # 1. Check if public_domain_cache exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'public_domain_cache'
            );
        """)
        
        if not cursor.fetchone()[0]:
            print("❌ public_domain_cache table DOES NOT EXIST!")
            return False
        
        print("✅ public_domain_cache table exists")
        
        # 2. Check table structure
        print("\n📊 PUBLIC_DOMAIN_CACHE TABLE STRUCTURE:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'public_domain_cache' AND table_schema = 'public'
            ORDER BY ordinal_position;
        """)
        
        columns = cursor.fetchall()
        for col_name, data_type, nullable, default in columns:
            print(f"  - {col_name}: {data_type} {'NULL' if nullable == 'YES' else 'NOT NULL'} {f'DEFAULT {default}' if default else ''}")
        
        # 3. Count records
        cursor.execute("SELECT COUNT(*) FROM public_domain_cache;")
        cache_count = cursor.fetchone()[0]
        print(f"\n📈 RECORD COUNT: {cache_count} records")
        
        # 4. Sample data
        if cache_count > 0:
            print(f"\n📋 SAMPLE DATA (first 5 records):")
            cursor.execute("""
                SELECT domain, memory_score, ai_consensus_percentage, reputation_risk, unique_models, updated_at 
                FROM public_domain_cache 
                ORDER BY memory_score DESC NULLS LAST
                LIMIT 5;
            """)
            
            rows = cursor.fetchall()
            for row in rows:
                domain, memory_score, ai_consensus, reputation_risk, unique_models, updated_at = row
                print(f"  - {domain}: score={memory_score}, consensus={ai_consensus}, risk={reputation_risk}, models={unique_models}, updated={updated_at}")
        else:
            print("\n❌ NO DATA in public_domain_cache!")
        
        # 5. Check for NULL values in critical columns
        print(f"\n🔍 NULL VALUE ANALYSIS:")
        critical_columns = ['memory_score', 'ai_consensus_percentage', 'reputation_risk', 'unique_models']
        
        for col in critical_columns:
            cursor.execute(f"SELECT COUNT(*) FROM public_domain_cache WHERE {col} IS NULL;")
            null_count = cursor.fetchone()[0]
            cursor.execute(f"SELECT COUNT(*) FROM public_domain_cache WHERE {col} IS NOT NULL;")
            not_null_count = cursor.fetchone()[0]
            print(f"  - {col}: {null_count} NULL, {not_null_count} NOT NULL")
        
        cursor.close()
        conn.close()
        
        print("\n✅ public_domain_cache check complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error checking public_domain_cache: {e}")
        return False

if __name__ == "__main__":
    check_public_cache_table()
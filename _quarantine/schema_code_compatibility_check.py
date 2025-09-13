#!/usr/bin/env python3
"""
Check compatibility between database schema and application code
"""

import psycopg2
import json
from datetime import datetime

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_code_compatibility():
    """Check if the code expectations match the database schema"""
    print("🔍 CHECKING CODE-DATABASE COMPATIBILITY...")
    print("=" * 80)
    
    issues = []
    warnings = []
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        # 1. Check domains table ID type
        print("\n📋 CHECKING ID TYPES:")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'domains' AND column_name = 'id'
        """)
        
        domain_id_info = cursor.fetchone()
        if domain_id_info:
            col_name, data_type, default = domain_id_info
            print(f"  - domains.id: {data_type} (default: {default})")
            if data_type == 'uuid':
                print("    ✅ UUID type confirmed")
            else:
                issues.append(f"domains.id is {data_type}, not UUID")
        
        # 2. Check domain_responses foreign key type
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'domain_responses' AND column_name = 'domain_id'
        """)
        
        response_id_info = cursor.fetchone()
        if response_id_info:
            col_name, data_type = response_id_info
            print(f"  - domain_responses.domain_id: {data_type}")
            if data_type == 'uuid':
                print("    ✅ Foreign key type matches")
            else:
                issues.append(f"domain_responses.domain_id is {data_type}, not UUID")
        
        # 3. Check for required columns in code
        print("\n📋 CHECKING REQUIRED COLUMNS:")
        
        # From sophisticated-runner code expectations
        required_domain_columns = [
            'id', 'domain', 'status', 'created_at', 'updated_at',
            'last_processed_at', 'process_count', 'error_count'
        ]
        
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'domains'
        """)
        
        actual_columns = [row[0] for row in cursor.fetchall()]
        
        for req_col in required_domain_columns:
            if req_col in actual_columns:
                print(f"  ✅ domains.{req_col} exists")
            else:
                issues.append(f"Missing required column: domains.{req_col}")
        
        # 4. Check timestamp types consistency
        print("\n📋 CHECKING TIMESTAMP CONSISTENCY:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('domains', 'domain_responses')
            AND data_type LIKE '%timestamp%'
            ORDER BY table_name, column_name
        """)
        
        timestamps = cursor.fetchall()
        tz_aware = []
        tz_naive = []
        
        for col_name, data_type in timestamps:
            if 'with time zone' in data_type:
                tz_aware.append(col_name)
            else:
                tz_naive.append(col_name)
        
        if tz_aware and tz_naive:
            warnings.append(f"Mixed timestamp types: {len(tz_aware)} with timezone, {len(tz_naive)} without")
            print(f"  ⚠️  Mixed timestamp types found")
            print(f"     With timezone: {', '.join(tz_aware[:3])}...")
            print(f"     Without timezone: {', '.join(tz_naive[:3])}...")
        else:
            print("  ✅ Timestamp types are consistent")
        
        # 5. Check for expected prompt types and models
        print("\n📋 CHECKING DATA DISTRIBUTION:")
        cursor.execute("""
            SELECT DISTINCT model, COUNT(*) as count
            FROM domain_responses
            GROUP BY model
            ORDER BY count DESC
            LIMIT 10
        """)
        
        models = cursor.fetchall()
        print("  Models in use:")
        for model, count in models:
            print(f"    - {model}: {count} responses")
        
        cursor.execute("""
            SELECT DISTINCT prompt_type, COUNT(*) as count
            FROM domain_responses
            GROUP BY prompt_type
            ORDER BY count DESC
            LIMIT 10
        """)
        
        prompt_types = cursor.fetchall()
        print("  Prompt types in use:")
        for prompt_type, count in prompt_types:
            print(f"    - {prompt_type}: {count} responses")
        
        # 6. Check for data integrity
        print("\n📋 CHECKING DATA INTEGRITY:")
        
        # Check for orphaned responses
        cursor.execute("""
            SELECT COUNT(*)
            FROM domain_responses dr
            LEFT JOIN domains d ON d.id = dr.domain_id
            WHERE d.id IS NULL
        """)
        
        orphaned = cursor.fetchone()[0]
        if orphaned > 0:
            issues.append(f"{orphaned} orphaned domain_responses records found")
            print(f"  ❌ {orphaned} orphaned responses")
        else:
            print("  ✅ No orphaned responses")
        
        # Check for domains without responses
        cursor.execute("""
            SELECT COUNT(*)
            FROM domains d
            LEFT JOIN domain_responses dr ON d.id = dr.domain_id
            WHERE dr.id IS NULL AND d.status = 'completed'
        """)
        
        no_responses = cursor.fetchone()[0]
        if no_responses > 0:
            warnings.append(f"{no_responses} completed domains have no responses")
            print(f"  ⚠️  {no_responses} completed domains without responses")
        
        cursor.close()
        conn.close()
        
        # Summary
        print("\n" + "=" * 80)
        print("📊 COMPATIBILITY CHECK SUMMARY:")
        
        if not issues:
            print("✅ No critical issues found")
        else:
            print(f"❌ {len(issues)} critical issues found:")
            for issue in issues:
                print(f"   - {issue}")
        
        if warnings:
            print(f"\n⚠️  {len(warnings)} warnings:")
            for warning in warnings:
                print(f"   - {warning}")
        
        print("\n💡 RECOMMENDATIONS:")
        print("1. Ensure all code uses UUID type for domain IDs")
        print("2. Standardize timestamp handling (recommend WITH TIME ZONE)")
        print("3. Add validation for expected prompt_types and models")
        print("4. Consider adding application-level foreign key checks")
        
    except Exception as e:
        print(f"\n❌ Error during compatibility check: {e}")
        return False
    
    return len(issues) == 0

if __name__ == "__main__":
    success = check_code_compatibility()
    exit(0 if success else 1)
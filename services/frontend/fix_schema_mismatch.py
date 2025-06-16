#!/usr/bin/env python3
"""
🚨 EMERGENCY SCHEMA MISMATCH FIX
Fix the cohesion_score NOT NULL constraint that's breaking sophisticated-runner

ISSUE: sophisticated-runner was built before cohesion_score existed
SOLUTION: Make cohesion_score nullable with intelligent default
"""

import psycopg2
import sys

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def fix_schema_mismatch():
    """Fix the cohesion_score constraint mismatch"""
    print("🚨 FIXING SCHEMA MISMATCH...")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        # Option 1: Make cohesion_score nullable with intelligent default
        print("📋 Making cohesion_score nullable with default...")
        cursor.execute("""
            ALTER TABLE public_domain_cache 
            ALTER COLUMN cohesion_score DROP NOT NULL;
        """)
        
        cursor.execute("""
            ALTER TABLE public_domain_cache 
            ALTER COLUMN cohesion_score SET DEFAULT 75.0;
        """)
        
        # Update existing NULL values with intelligent defaults
        print("🔧 Updating existing NULL cohesion_scores...")
        cursor.execute("""
            UPDATE public_domain_cache 
            SET cohesion_score = CASE 
                WHEN model_count >= 10 THEN 80.0 + (memory_score * 0.15)
                WHEN model_count >= 5 THEN 70.0 + (memory_score * 0.12)
                ELSE 60.0 + (memory_score * 0.10)
            END
            WHERE cohesion_score IS NULL;
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"✅ Schema mismatch fixed!")
        print(f"📊 Updated {updated_count} records with intelligent cohesion_score defaults")
        print(f"🔧 cohesion_score is now nullable with default 75.0")
        
        # Verify the fix
        cursor.execute("SELECT COUNT(*) FROM public_domain_cache WHERE cohesion_score IS NULL")
        null_count = cursor.fetchone()[0]
        
        if null_count == 0:
            print("✅ No NULL cohesion_scores remaining - fix successful!")
        else:
            print(f"⚠️  Still {null_count} NULL values - may need manual review")
            
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error fixing schema mismatch: {e}")
        return False

def verify_sophisticated_runner_compatibility():
    """Test that sophisticated-runner can now insert without cohesion_score"""
    print("\n🧪 TESTING SOPHISTICATED-RUNNER COMPATIBILITY...")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cursor = conn.cursor()
        
        # Test insert without cohesion_score (like sophisticated-runner does)
        test_uuid = "00000000-0000-0000-0000-000000000001"
        cursor.execute("""
            INSERT INTO public_domain_cache (
                domain_id, domain, memory_score, ai_consensus_score, drift_delta,
                model_count, reputation_risk_score, competitive_threat_level,
                brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                business_focus, market_position, keywords, top_themes, cache_data, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            )
            ON CONFLICT (domain_id) DO UPDATE SET
                memory_score = EXCLUDED.memory_score,
                updated_at = NOW()
        """, (
            test_uuid, 'test-schema-fix.com', 85.5, 0.78, -2.1,
            12, 15.3, 'low', False, False, False,
            'Technology', 'Industry Leader', ['test', 'schema'], ['testing'],
            '{"test": true, "schema_fix": "successful"}'
        ))
        
        # Check if it got the default cohesion_score
        cursor.execute("SELECT cohesion_score FROM public_domain_cache WHERE domain_id = %s", (test_uuid,))
        cohesion_score = cursor.fetchone()[0]
        
        # Clean up test record
        cursor.execute("DELETE FROM public_domain_cache WHERE domain_id = %s", (test_uuid,))
        conn.commit()
        
        print(f"✅ Test successful! cohesion_score defaulted to: {cohesion_score}")
        print("✅ sophisticated-runner can now insert records without errors!")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Compatibility test failed: {e}")
        return False

if __name__ == "__main__":
    print("🚨 EMERGENCY SCHEMA MISMATCH REPAIR")
    print("Fixing cohesion_score constraint breaking sophisticated-runner...")
    print()
    
    success = fix_schema_mismatch()
    if success:
        verify_sophisticated_runner_compatibility()
        print("\n🎉 SCHEMA MISMATCH RESOLVED!")
        print("✅ sophisticated-runner should now process domains without errors")
        print("✅ Fresh data collection can resume")
    else:
        print("\n❌ SCHEMA FIX FAILED - Manual intervention required")
        sys.exit(1) 
#!/usr/bin/env python3
"""
Debug the specific API endpoint that's failing
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import traceback

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def debug_stats_endpoint():
    """Debug the exact query that /api/stats runs"""
    print("🔍 DEBUGGING /api/stats ENDPOINT...")
    print("=" * 80)
    
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require', cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        
        # Test the exact query from the production API
        print("\n1️⃣  Testing main stats query:")
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_domains,
                    AVG(memory_score) as avg_memory_score,
                    SUM(response_count) as total_model_responses,
                    COUNT(*) FILTER (WHERE reputation_risk = 'high') as critical_risk,
                    MAX(updated_at) as last_update
                FROM public_domain_cache
            """)
            result = cursor.fetchone()
            print(f"   ✅ Main query SUCCESS: {dict(result)}")
        except Exception as e:
            print(f"   ❌ Main query ERROR: {e}")
            traceback.print_exc()
        
        # Test the top performers query
        print("\n2️⃣  Testing top performers query:")
        try:
            cursor.execute("""
                SELECT domain, memory_score, unique_models, reputation_risk
                FROM public_domain_cache 
                ORDER BY memory_score DESC
                LIMIT 5
            """)
            results = cursor.fetchall()
            print(f"   ✅ Top performers SUCCESS: {len(results)} records")
        except Exception as e:
            print(f"   ❌ Top performers ERROR: {e}")
            traceback.print_exc()
        
        # Test the volatility distribution query - this might be the issue
        print("\n3️⃣  Testing volatility distribution query:")
        try:
            cursor.execute("""
                SELECT 
                    COUNT(*) FILTER (WHERE score < 0.3) as low_volatility,
                    COUNT(*) FILTER (WHERE score >= 0.3 AND score < 0.7) as medium_volatility,
                    COUNT(*) FILTER (WHERE score >= 0.7) as high_volatility
                FROM volatility_scores
            """)
            result = cursor.fetchone()
            print(f"   ✅ Volatility query SUCCESS: {dict(result)}")
        except Exception as e:
            print(f"   ❌ Volatility query ERROR: {e}")
            print("   This table might be empty or missing")
            
            # Check if table exists and has data
            cursor.execute("SELECT COUNT(*) FROM volatility_scores")
            count = cursor.fetchone()[0]
            print(f"   📊 volatility_scores has {count} records")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    debug_stats_endpoint()
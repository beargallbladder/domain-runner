#!/usr/bin/env python3
"""
Test the specific database queries used by the API to identify 500 errors
"""

import psycopg2
import asyncpg
import asyncio
import traceback
from datetime import datetime

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

async def test_api_queries():
    """Test all database queries used by the API endpoints"""
    print("🔍 TESTING API DATABASE QUERIES...")
    print("=" * 80)
    
    try:
        # Create connection pool
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
        
        # Test 1: /api/stats query
        print("\n1️⃣  TESTING /api/stats query:")
        try:
            async with pool.acquire() as conn:
                result = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_domains,
                        AVG(memory_score) as avg_memory_score,
                        SUM(response_count) as total_model_responses,
                        COUNT(*) FILTER (WHERE reputation_risk = 'high') as critical_risk,
                        MAX(updated_at) as last_update
                    FROM public_domain_cache
                """)
                print(f"   ✅ SUCCESS: {dict(result)}")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            traceback.print_exc()
        
        # Test 2: /api/rankings query
        print("\n2️⃣  TESTING /api/rankings query:")
        try:
            async with pool.acquire() as conn:
                result = await conn.fetch("""
                    SELECT 
                        pdc.domain, 
                        pdc.memory_score, 
                        pdc.ai_consensus_percentage, 
                        pdc.unique_models,
                        pdc.reputation_risk, 
                        pdc.drift_delta, 
                        pdc.updated_at,
                        pdc.cohesion_score,
                        vs.score as volatility_score
                    FROM public_domain_cache pdc
                    LEFT JOIN domains d ON pdc.domain = d.domain
                    LEFT JOIN volatility_scores vs ON d.id = vs.domain_id
                    WHERE 1=1
                    ORDER BY pdc.memory_score DESC
                    LIMIT 5
                """)
                print(f"   ✅ SUCCESS: Found {len(result)} records")
                for r in result[:2]:
                    print(f"      - {r['domain']}: score={r['memory_score']}")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            traceback.print_exc()
        
        # Test 3: /api/domains/{domain}/public query
        print("\n3️⃣  TESTING /api/domains/{domain}/public query:")
        try:
            async with pool.acquire() as conn:
                result = await conn.fetchrow("""
                    SELECT 
                        domain, memory_score, ai_consensus_percentage, 
                        cohesion_score, drift_delta, reputation_risk,
                        business_category, market_position, key_themes,
                        response_count, unique_models, updated_at
                    FROM public_domain_cache 
                    WHERE domain = $1
                """, "google.com")
                
                if result:
                    print(f"   ✅ SUCCESS: Found data for google.com")
                    print(f"      - Score: {result['memory_score']}")
                    print(f"      - Consensus: {result['ai_consensus_percentage']}")
                else:
                    print(f"   ❌ NO DATA: google.com not found in cache")
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            traceback.print_exc()
        
        # Test 4: Check for missing tables used in tensor endpoints
        print("\n4️⃣  TESTING tensor-related tables:")
        try:
            async with pool.acquire() as conn:
                # Check memory_tensors table
                result = await conn.fetch("SELECT * FROM memory_tensors LIMIT 1")
                print(f"   ✅ memory_tensors: {len(result)} records found")
                
                # Check volatility_scores table
                result = await conn.fetch("SELECT * FROM volatility_scores LIMIT 1")
                print(f"   ✅ volatility_scores: {len(result)} records found")
                
        except Exception as e:
            print(f"   ❌ ERROR in tensor tables: {e}")
            traceback.print_exc()
        
        # Test 5: Check for any missing columns or data types
        print("\n5️⃣  TESTING data type issues:")
        try:
            async with pool.acquire() as conn:
                # Test potential NULL handling issues
                result = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE memory_score IS NULL) as null_memory_score,
                        COUNT(*) FILTER (WHERE ai_consensus_percentage IS NULL) as null_consensus,
                        COUNT(*) FILTER (WHERE reputation_risk IS NULL) as null_reputation_risk
                    FROM public_domain_cache
                """)
                print(f"   ✅ NULL value analysis: {dict(result)}")
        except Exception as e:
            print(f"   ❌ ERROR in data type checks: {e}")
            traceback.print_exc()
        
        await pool.close()
        print("\n✅ Query testing complete!")
        
    except Exception as e:
        print(f"\n❌ Connection error: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_api_queries())
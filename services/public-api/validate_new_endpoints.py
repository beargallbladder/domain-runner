#!/usr/bin/env python3
"""
Validation script for new tensor, drift, consensus, and volatility endpoints
"""

import asyncio
import asyncpg
import os
import json
from datetime import datetime

# Database URL from test_db_connection.py
DATABASE_URL = os.environ.get('DATABASE_URL', 
    'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')

async def get_test_domain():
    """Get a domain with data for testing"""
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=2)
    
    async with pool.acquire() as conn:
        # First check if we have domain_responses data
        domain_with_responses = await conn.fetchrow("""
            SELECT d.domain, d.id, COUNT(dr.id) as response_count
            FROM domains d
            JOIN domain_responses dr ON dr.domain_id = d.id
            GROUP BY d.domain, d.id
            HAVING COUNT(dr.id) > 5
            ORDER BY COUNT(dr.id) DESC
            LIMIT 1
        """)
        
        if domain_with_responses:
            print(f"✅ Found test domain with responses: {domain_with_responses['domain']} ({domain_with_responses['response_count']} responses)")
            return domain_with_responses['domain'], str(domain_with_responses['id'])
        
        # Fallback to any domain in public_domain_cache
        cached_domain = await conn.fetchrow("""
            SELECT domain FROM public_domain_cache 
            WHERE memory_score > 0
            LIMIT 1
        """)
        
        if cached_domain:
            print(f"✅ Found test domain from cache: {cached_domain['domain']}")
            return cached_domain['domain'], None
        
        print("❌ No test domain found")
        return None, None
    
    await pool.close()

async def test_endpoint_logic():
    """Test the endpoint logic directly (without HTTP)"""
    
    # Import the functions from production_api
    import sys
    sys.path.append('/Users/samkim/domain-runner/services/public-api')
    
    # Get test domain
    test_domain, domain_id = await get_test_domain()
    if not test_domain:
        print("❌ Cannot proceed without test domain")
        return
    
    print(f"\n🔍 Testing with domain: {test_domain}")
    
    # Initialize pool
    global pool
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    
    # Import the calculation functions
    from production_api import (
        get_domain_id_by_name,
        calculate_tensor_metrics,
        calculate_drift_metrics,
        calculate_consensus_metrics,
        calculate_volatility_metrics
    )
    
    print("\n1️⃣ Testing get_domain_id_by_name...")
    if not domain_id:
        domain_id = await get_domain_id_by_name(test_domain)
        print(f"   Domain ID: {domain_id}")
    
    if domain_id:
        print("\n2️⃣ Testing calculate_tensor_metrics...")
        tensor_metrics = await calculate_tensor_metrics(domain_id)
        print(f"   Tensor metrics: {json.dumps(tensor_metrics, indent=2)}")
        
        print("\n3️⃣ Testing calculate_drift_metrics...")
        drift_metrics = await calculate_drift_metrics(domain_id)
        print(f"   Drift metrics: {json.dumps(drift_metrics, indent=2)}")
        
        print("\n4️⃣ Testing calculate_consensus_metrics...")
        consensus_metrics = await calculate_consensus_metrics(domain_id)
        print(f"   Consensus metrics: {json.dumps(consensus_metrics, indent=2)}")
        
        print("\n5️⃣ Testing calculate_volatility_metrics...")
        volatility_metrics = await calculate_volatility_metrics(domain_id)
        print(f"   Volatility metrics: {json.dumps(volatility_metrics, indent=2)}")
    else:
        print("❌ Could not get domain ID")
    
    await pool.close()

async def validate_database_schema():
    """Validate that all required tables and columns exist"""
    pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=2)
    
    async with pool.acquire() as conn:
        print("\n📊 Validating database schema...")
        
        # Check domains table
        domains_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'domains'
            )
        """)
        print(f"   domains table: {'✅' if domains_exists else '❌'}")
        
        # Check domain_responses table
        responses_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'domain_responses'
            )
        """)
        print(f"   domain_responses table: {'✅' if responses_exists else '❌'}")
        
        # Check public_domain_cache table
        cache_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'public_domain_cache'
            )
        """)
        print(f"   public_domain_cache table: {'✅' if cache_exists else '❌'}")
        
        # Check for sample data
        if domains_exists and responses_exists:
            data_count = await conn.fetchval("""
                SELECT COUNT(*) FROM domain_responses
            """)
            print(f"   domain_responses row count: {data_count}")
    
    await pool.close()

if __name__ == "__main__":
    print("🚀 Validating new production API endpoints...")
    print(f"   Timestamp: {datetime.now().isoformat()}")
    
    async def main():
        # First validate schema
        await validate_database_schema()
        
        # Then test endpoint logic
        await test_endpoint_logic()
        
        print("\n✅ Validation complete!")
    
    asyncio.run(main())
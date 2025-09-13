#!/usr/bin/env python3
"""
Database Connection Test Script
Tests the database connection with retry logic
"""
import asyncio
import asyncpg
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_database_connection():
    """Test database connection with retry logic"""
    
    # Get database URL from environment or use the one from render.yaml
    database_url = os.environ.get('DATABASE_URL', 
        'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')
    
    if not database_url:
        logger.error("No DATABASE_URL found")
        return False
    
    logger.info(f"Testing connection to: {database_url[:50]}...")
    
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            # Create connection pool
            pool = await asyncpg.create_pool(
                database_url,
                min_size=1,
                max_size=3,
                command_timeout=10,
                server_settings={
                    'application_name': 'llmrank-connection-test',
                    'jit': 'off'
                }
            )
            
            # Test the connection
            async with pool.acquire() as conn:
                # Test basic query
                result = await conn.fetchval('SELECT 1')
                logger.info(f"✅ Basic query test passed: {result}")
                
                # Test table existence
                tables = await conn.fetch("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('public_domain_cache', 'domains', 'domain_responses')
                """)
                
                logger.info(f"✅ Found {len(tables)} required tables:")
                for table in tables:
                    logger.info(f"  - {table['table_name']}")
                
                # Test sample data query
                try:
                    domain_count = await conn.fetchval("""
                        SELECT COUNT(*) FROM public_domain_cache
                    """)
                    logger.info(f"✅ Sample data test: {domain_count} domains in cache")
                except Exception as e:
                    logger.warning(f"⚠️  Sample data query failed: {e}")
                
            await pool.close()
            logger.info("✅ Database connection test PASSED")
            return True
            
        except Exception as e:
            logger.error(f"❌ Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"🔄 Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
            else:
                logger.error("❌ All connection attempts failed")
                return False

async def test_specific_queries():
    """Test specific queries that the API endpoints use"""
    database_url = os.environ.get('DATABASE_URL', 
        'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')
    
    try:
        pool = await asyncpg.create_pool(database_url, min_size=1, max_size=2)
        
        async with pool.acquire() as conn:
            # Test health check query
            logger.info("🔍 Testing health check query...")
            health_stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_domains,
                    COUNT(*) FILTER (WHERE reputation_risk = 'high') as high_risk_domains,
                    COUNT(*) FILTER (WHERE memory_score < 50) as low_memory_domains,
                    COUNT(*) FILTER (WHERE drift_delta < -5) as declining_domains,
                    MAX(updated_at) as last_update
                FROM public_domain_cache
            """)
            
            if health_stats:
                logger.info(f"✅ Health stats: {dict(health_stats)}")
            else:
                logger.warning("⚠️  No health stats returned")
            
            # Test domain lookup
            logger.info("🔍 Testing domain lookup...")
            sample_domain = await conn.fetchrow("""
                SELECT domain, memory_score, ai_consensus_percentage
                FROM public_domain_cache
                LIMIT 1
            """)
            
            if sample_domain:
                logger.info(f"✅ Sample domain: {dict(sample_domain)}")
            else:
                logger.warning("⚠️  No sample domain found")
        
        await pool.close()
        logger.info("✅ Specific query tests PASSED")
        return True
        
    except Exception as e:
        logger.error(f"❌ Specific query tests failed: {e}")
        return False

if __name__ == "__main__":
    async def main():
        logger.info("🚀 Starting database connection tests...")
        
        # Test basic connection
        connection_ok = await test_database_connection()
        
        if connection_ok:
            # Test specific queries
            queries_ok = await test_specific_queries()
            
            if queries_ok:
                logger.info("🎉 All database tests PASSED! API should work correctly.")
            else:
                logger.error("❌ Query tests failed. API may have issues.")
        else:
            logger.error("❌ Connection tests failed. API will not work.")
    
    asyncio.run(main())
#!/usr/bin/env python3
"""Test script to check for existing API keys and create one if needed"""

import asyncio
import asyncpg
import os
from api_key_manager import APIKeyManager

async def test_api_keys():
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL not set")
        return
    
    manager = APIKeyManager(database_url)
    
    # Check if tables exist
    pool = await manager.get_pool()
    async with pool.acquire() as conn:
        # Check if partner_api_keys table exists
        table_exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'partner_api_keys'
            )
        """)
        
        if not table_exists:
            print("📦 Creating API key tables...")
            await manager.setup_database_tables()
            print("✅ Tables created")
        
        # Check for existing keys
        key_count = await conn.fetchval("SELECT COUNT(*) FROM partner_api_keys WHERE is_active = true")
        print(f"📊 Active API keys in database: {key_count}")
        
        if key_count == 0:
            print("\n🔑 Creating test API key...")
            key_info = await manager.create_partner_api_key(
                partner_email="test@llmrank.io",
                partner_domain="localhost",
                tier="enterprise",
                rate_limit=10000,
                description="Test API key for development"
            )
            print("\n✅ TEST API KEY CREATED:")
            print(f"API Key: {key_info['api_key']}")
            print(f"Usage: curl -H 'X-API-Key: {key_info['api_key']}' http://localhost:8000/api/stats")
        else:
            # Show first active key info (without the actual key)
            key_info = await conn.fetchrow("""
                SELECT partner_email, partner_domain, tier, rate_limit_per_hour, created_at
                FROM partner_api_keys 
                WHERE is_active = true 
                LIMIT 1
            """)
            print(f"\n📋 Existing API key found:")
            print(f"Email: {key_info['partner_email']}")
            print(f"Domain: {key_info['partner_domain']}")
            print(f"Tier: {key_info['tier']}")
            print(f"Rate limit: {key_info['rate_limit_per_hour']} requests/hour")
    
    await pool.close()

if __name__ == "__main__":
    asyncio.run(test_api_keys())
#!/usr/bin/env python3
"""
🔑 API KEY MANAGEMENT SYSTEM
Generates and manages API keys for partner access to the LLM PageRank API
"""

import secrets
import hashlib
import asyncpg
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, List

class APIKeyManager:
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    async def get_pool(self):
        """Get database connection pool"""
        return await asyncpg.create_pool(self.database_url, min_size=1, max_size=5)
    
    def generate_api_key(self, prefix: str = "llmpr") -> str:
        """Generate a secure API key"""
        # Generate 32 random bytes and encode as hex
        random_part = secrets.token_hex(32)
        return f"{prefix}_{random_part}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for secure storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()
    
    async def create_partner_api_key(self, 
                                   partner_email: str,
                                   partner_domain: str,
                                   tier: str = "enterprise",
                                   rate_limit: int = 10000,
                                   description: str = "") -> Dict:
        """Create a new partner API key"""
        
        api_key = self.generate_api_key()
        api_key_hash = self.hash_api_key(api_key)
        
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            # Create API key record
            key_id = await conn.fetchval("""
                INSERT INTO partner_api_keys (
                    api_key_hash, partner_email, partner_domain, 
                    tier, rate_limit_per_hour, description,
                    created_at, expires_at, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '1 year', true)
                RETURNING id
            """, api_key_hash, partner_email, partner_domain, tier, rate_limit, description)
            
        await pool.close()
        
        return {
            "api_key": api_key,
            "key_id": str(key_id),
            "partner_email": partner_email,
            "partner_domain": partner_domain,
            "tier": tier,
            "rate_limit_per_hour": rate_limit,
            "expires_at": (datetime.now() + timedelta(days=365)).isoformat(),
            "usage_instructions": {
                "header": "X-API-Key",
                "example": f"curl -H 'X-API-Key: {api_key}' https://llmrank.io/api/domains/apple.com/public"
            }
        }
    
    async def validate_api_key(self, api_key: str, requesting_domain: str = None) -> Optional[Dict]:
        """Validate an API key and return partner info"""
        
        api_key_hash = self.hash_api_key(api_key)
        
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            # Get API key info
            key_info = await conn.fetchrow("""
                SELECT id, partner_email, partner_domain, tier, rate_limit_per_hour,
                       is_active, expires_at, last_used_at, usage_count
                FROM partner_api_keys 
                WHERE api_key_hash = $1 AND is_active = true AND expires_at > NOW()
            """, api_key_hash)
            
            if not key_info:
                await pool.close()
                return None
            
            # Check domain restriction if specified
            if requesting_domain and key_info['partner_domain']:
                if requesting_domain not in key_info['partner_domain']:
                    await pool.close()
                    return None
            
            # Update usage tracking
            await conn.execute("""
                UPDATE partner_api_keys 
                SET last_used_at = NOW(), usage_count = usage_count + 1
                WHERE id = $1
            """, key_info['id'])
            
        await pool.close()
        
        return {
            "valid": True,
            "partner_email": key_info['partner_email'],
            "partner_domain": key_info['partner_domain'],
            "tier": key_info['tier'],
            "rate_limit": key_info['rate_limit_per_hour'],
            "usage_count": key_info['usage_count']
        }
    
    async def setup_database_tables(self):
        """Create the API key management tables"""
        
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            # Create partner API keys table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS partner_api_keys (
                    id SERIAL PRIMARY KEY,
                    api_key_hash VARCHAR(64) UNIQUE NOT NULL,
                    partner_email VARCHAR(255) NOT NULL,
                    partner_domain VARCHAR(255),
                    tier VARCHAR(50) DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
                    rate_limit_per_hour INTEGER DEFAULT 1000,
                    description TEXT,
                    
                    -- Status and lifecycle
                    is_active BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT NOW(),
                    expires_at TIMESTAMP,
                    last_used_at TIMESTAMP,
                    
                    -- Usage tracking
                    usage_count INTEGER DEFAULT 0,
                    
                    -- Metadata
                    created_by VARCHAR(255),
                    notes TEXT
                );
            """)
            
            # Create indexes
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_partner_api_keys_hash ON partner_api_keys(api_key_hash);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_partner_api_keys_email ON partner_api_keys(partner_email);")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_partner_api_keys_domain ON partner_api_keys(partner_domain);")
            
            # Create usage tracking table
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS api_key_usage_log (
                    id SERIAL PRIMARY KEY,
                    api_key_id INTEGER REFERENCES partner_api_keys(id),
                    endpoint VARCHAR(255),
                    requesting_domain VARCHAR(255),
                    ip_address INET,
                    user_agent TEXT,
                    response_status INTEGER,
                    request_timestamp TIMESTAMP DEFAULT NOW(),
                    processing_time_ms INTEGER
                );
            """)
            
        await pool.close()

# Convenience functions
async def create_llmpagerank_partner_key():
    """Create the main partner API key for llmpagerank.com"""
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable required")
    
    manager = APIKeyManager(database_url)
    
    # Setup tables first
    await manager.setup_database_tables()
    
    # Create the partner key
    key_info = await manager.create_partner_api_key(
        partner_email="partner@llmpagerank.com",
        partner_domain="llmpagerank.com",
        tier="enterprise",
        rate_limit=50000,  # 50k requests per hour
        description="Main partner API key for llmpagerank.com marketing site"
    )
    
    return key_info

if __name__ == "__main__":
    import asyncio
    
    async def main():
        key_info = await create_llmpagerank_partner_key()
        print("🔑 PARTNER API KEY CREATED!")
        print("=" * 50)
        print(f"API Key: {key_info['api_key']}")
        print(f"Partner: {key_info['partner_email']}")
        print(f"Domain: {key_info['partner_domain']}")
        print(f"Tier: {key_info['tier']}")
        print(f"Rate Limit: {key_info['rate_limit_per_hour']} requests/hour")
        print(f"Expires: {key_info['expires_at']}")
        print()
        print("🚀 USAGE EXAMPLE:")
        print(key_info['usage_instructions']['example'])
        print()
        print("📋 AVAILABLE ENDPOINTS:")
        print("• GET /api/domains/{domain}/public - Domain intelligence")
        print("• GET /api/ticker - Real-time brand volatility")
        print("• GET /api/rankings - Domain rankings")
        print("• GET /api/fire-alarm-dashboard - Risk alerts")
        print("• GET /api/categories - Industry categories")
        print("• GET /api/stats - Public statistics")
    
    asyncio.run(main()) 
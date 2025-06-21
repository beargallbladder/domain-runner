#!/usr/bin/env python3
"""
🔑 GENERATE PARTNER API KEY
Quick script to generate API key for llmpagerank.com partner access
"""

import secrets
import hashlib
import psycopg2
from datetime import datetime, timedelta

# Database connection
DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

def generate_api_key():
    """Generate secure API key"""
    return f"llmpr_{secrets.token_hex(32)}"

def hash_api_key(api_key):
    """Hash API key for storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def create_partner_key():
    """Create the partner API key"""
    
    # Generate API key
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)
    
    # Partner details
    partner_email = "partner@llmpagerank.com"
    partner_domain = "llmpagerank.com"
    tier = "enterprise"
    rate_limit = 50000
    description = "Main partner API key for llmpagerank.com marketing site"
    
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # Create table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS partner_api_keys (
                id SERIAL PRIMARY KEY,
                api_key_hash VARCHAR(64) UNIQUE NOT NULL,
                partner_email VARCHAR(255) NOT NULL,
                partner_domain VARCHAR(255),
                tier VARCHAR(50) DEFAULT 'free',
                rate_limit_per_hour INTEGER DEFAULT 1000,
                description TEXT,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP,
                last_used_at TIMESTAMP,
                usage_count INTEGER DEFAULT 0
            );
        """)
        
        # Create index
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_partner_api_keys_hash ON partner_api_keys(api_key_hash);")
        
        # Insert API key
        cursor.execute("""
            INSERT INTO partner_api_keys (
                api_key_hash, partner_email, partner_domain, 
                tier, rate_limit_per_hour, description,
                created_at, expires_at, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW() + INTERVAL '1 year', true)
            RETURNING id
        """, (api_key_hash, partner_email, partner_domain, tier, rate_limit, description))
        
        key_id = cursor.fetchone()[0]
        conn.commit()
        
        print("🔑 PARTNER API KEY CREATED!")
        print("=" * 60)
        print(f"API Key: {api_key}")
        print(f"Partner Email: {partner_email}")
        print(f"Partner Domain: {partner_domain}")
        print(f"Tier: {tier}")
        print(f"Rate Limit: {rate_limit:,} requests/hour")
        print(f"Key ID: {key_id}")
        print(f"Expires: {(datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')}")
        print()
        print("🚀 USAGE EXAMPLE:")
        print(f"curl -H 'X-API-Key: {api_key}' \\")
        print("     https://www.llmrank.io/api/domains/apple.com/public")
        print()
        print("📋 AVAILABLE ENDPOINTS:")
        print("• GET /api/domains/{domain}/public - Domain intelligence")
        print("• GET /api/ticker - Real-time brand volatility") 
        print("• GET /api/rankings - Domain rankings")
        print("• GET /api/fire-alarm-dashboard - Risk alerts")
        print("• GET /api/categories - Industry categories")
        print("• GET /health - API health check")
        print()
        print("🌐 CORS CONFIGURED FOR:")
        print("• https://llmpagerank.com")
        print("• https://www.llmpagerank.com")
        print("• https://app.llmpagerank.com")
        print()
        print("🔒 SECURITY FEATURES:")
        print("• API key hashed in database")
        print("• Usage tracking enabled")
        print("• Rate limiting: 50,000 requests/hour")
        print("• Domain restriction: llmpagerank.com")
        print("• 1-year expiration")
        
        return api_key
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating API key: {e}")
        return None
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_partner_key() 
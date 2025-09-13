#!/usr/bin/env python3
"""
Trigger full crawl of all pending domains with all 8 LLM providers
"""
import psycopg2
import requests
import json
import time
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# API endpoints
SOPHISTICATED_RUNNER_URL = "https://sophisticated-runner.onrender.com"
PUBLIC_API_URL = "https://llmrank.io"

# All 8 LLM providers
ALL_PROVIDERS = [
    "deepseek",
    "together", 
    "xai",
    "perplexity",
    "openai",
    "anthropic",
    "google",
    "mistral"
]

def get_pending_domains():
    """Get all domains with status='pending'"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        # First, let's see what statuses exist
        cursor.execute("SELECT DISTINCT status, COUNT(*) FROM domains GROUP BY status")
        statuses = cursor.fetchall()
        print("\n📊 Domain Status Summary:")
        for status, count in statuses:
            print(f"  - {status}: {count} domains")
        
        # Get all domains (not just pending, since they might all be 'completed')
        cursor.execute("""
            SELECT id, domain, status 
            FROM domains 
            ORDER BY id 
            LIMIT 3183
        """)
        domains = cursor.fetchall()
        
        print(f"\n🔍 Found {len(domains)} total domains")
        return domains
        
    finally:
        cursor.close()
        conn.close()

def reset_domains_to_pending():
    """Reset all domains to pending status for re-crawling"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    try:
        print("\n🔄 Resetting all domains to 'pending' status...")
        cursor.execute("UPDATE domains SET status = 'pending' WHERE status = 'completed'")
        updated = cursor.rowcount
        conn.commit()
        print(f"✅ Reset {updated} domains to pending status")
        return updated
        
    finally:
        cursor.close()
        conn.close()

def trigger_crawl_batch(batch_size=50):
    """Trigger crawl for a batch of domains"""
    print(f"\n🚀 Triggering crawl batch (size: {batch_size})...")
    
    # Try different endpoints
    endpoints = [
        f"{SOPHISTICATED_RUNNER_URL}/process-pending-domains",
        f"{SOPHISTICATED_RUNNER_URL}/ultra-fast-process",
        f"{PUBLIC_API_URL}/api/process-domains"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n  Trying endpoint: {endpoint}")
            
            # Prepare request data
            data = {
                "batch_size": batch_size,
                "providers": ALL_PROVIDERS,
                "enable_neural_patterns": True,
                "enable_predictions": True,
                "enable_visceral_alerts": True
            }
            
            # Make request
            response = requests.post(
                endpoint,
                json=data,
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": "internal-api-key"
                },
                timeout=30
            )
            
            print(f"  Response status: {response.status_code}")
            if response.text:
                print(f"  Response: {response.text[:200]}...")
            
            if response.status_code == 200:
                return response.json()
                
        except Exception as e:
            print(f"  Error: {str(e)}")
    
    return None

def main():
    print("🧠 Bloomberg Intelligence Full Domain Crawl")
    print("=" * 50)
    
    # Get current domain status
    domains = get_pending_domains()
    
    # Reset domains if they're all completed
    reset_count = reset_domains_to_pending()
    
    if reset_count > 0:
        print(f"\n✅ Ready to crawl {reset_count} domains with all 8 LLM providers!")
        
        # Trigger initial batch
        result = trigger_crawl_batch(batch_size=100)
        
        if result:
            print("\n🎯 Crawl initiated successfully!")
            print(f"   Processing will continue in background...")
        else:
            print("\n⚠️  Could not trigger crawl via API")
            print("   The services may need to be manually triggered")
    else:
        print("\n⚠️  No domains to process")
    
    print("\n📊 Monitoring Instructions:")
    print("1. Check logs: https://dashboard.render.com")
    print("2. Monitor database: SELECT status, COUNT(*) FROM domains GROUP BY status")
    print("3. View results: SELECT * FROM domain_responses ORDER BY created_at DESC LIMIT 10")

if __name__ == "__main__":
    main()
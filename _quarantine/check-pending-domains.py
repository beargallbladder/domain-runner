#!/usr/bin/env python3
"""
CHECK PENDING DOMAINS AND TRIGGER PROCESSING
"""

import psycopg2
import requests
import json
from datetime import datetime

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
RENDER_URL = 'https://domain-runner.onrender.com'

def check_pending_domains():
    """Check how many domains need processing"""
    print("🔍 Checking domain processing status...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check total domains
        cursor.execute("SELECT COUNT(*) FROM domains")
        total = cursor.fetchone()[0]
        print(f"\n📊 Total domains: {total:,}")
        
        # Check domains processed today
        cursor.execute("""
            SELECT COUNT(DISTINCT domain_id) 
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        processed_today = cursor.fetchone()[0]
        print(f"✅ Processed today: {processed_today:,}")
        
        # Check domains with all 11 LLMs
        cursor.execute("""
            SELECT domain_id, COUNT(DISTINCT llm_provider) as provider_count
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY domain_id
            HAVING COUNT(DISTINCT llm_provider) = 11
            LIMIT 5
        """)
        
        full_tensor_domains = cursor.fetchall()
        print(f"\n🎯 Domains with 11/11 LLMs: {len(full_tensor_domains)}")
        
        # Get some domains that need processing
        cursor.execute("""
            SELECT d.id, d.domain
            FROM domains d
            LEFT JOIN (
                SELECT domain_id, COUNT(DISTINCT llm_provider) as llm_count
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '7 days'
                GROUP BY domain_id
            ) r ON d.id = r.domain_id
            WHERE r.llm_count IS NULL OR r.llm_count < 11
            ORDER BY d.created_at DESC
            LIMIT 10
        """)
        
        needs_processing = cursor.fetchall()
        
        if needs_processing:
            print(f"\n📝 Domains needing processing: {len(needs_processing)}")
            for domain_id, domain in needs_processing[:5]:
                print(f"  - {domain} ({domain_id[:8]}...)")
                
            # Mark some as pending
            domain_ids = [d[0] for d in needs_processing[:5]]
            
            # Update domains to trigger processing
            cursor.execute("""
                UPDATE domains 
                SET updated_at = NOW() 
                WHERE id = ANY(%s)
            """, (domain_ids,))
            
            conn.commit()
            print(f"\n✅ Marked {len(domain_ids)} domains for processing")
            
            return domain_ids
        else:
            print("\n✅ All domains fully processed!")
            return []
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def force_crawl_test():
    """Force a crawl of specific domains"""
    print("\n🚀 FORCING 11 LLM CRAWL TEST")
    
    # Use the swarm endpoint with specific domains
    test_domains = [
        "openai.com",
        "anthropic.com", 
        "google.com",
        "microsoft.com",
        "meta.com"
    ]
    
    payload = {
        "domains": test_domains,
        "volatilityThreshold": 0,
        "forceReprocess": True
    }
    
    print(f"\nTesting with domains: {', '.join(test_domains)}")
    
    try:
        response = requests.post(
            f"{RENDER_URL}/swarm/process-volatile",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response: {response.status_code}")
        print(f"Body: {response.text[:200]}")
        
        if response.status_code == 200:
            print("\n✅ Processing triggered!")
            print("\n⏳ Wait 2-3 minutes then run this SQL:")
            print("-" * 60)
            print("""
SELECT 
    llm_provider as provider,
    COUNT(*) as responses,
    MAX(created_at) as last_response
FROM domain_responses
WHERE domain_id IN (
    SELECT id FROM domains 
    WHERE domain IN ('openai.com','anthropic.com','google.com','microsoft.com','meta.com')
)
AND created_at > NOW() - INTERVAL '10 minutes'
GROUP BY llm_provider
ORDER BY llm_provider;

-- You should see all 11 providers!
""")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🧠 11 LLM CRAWL VERIFICATION")
    print("===========================")
    print(f"Time: {datetime.now()}")
    
    # First check pending domains
    pending = check_pending_domains()
    
    # Try to force a crawl
    force_crawl_test()

if __name__ == "__main__":
    main()
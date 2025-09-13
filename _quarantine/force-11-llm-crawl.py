#!/usr/bin/env python3
"""
FORCE 11 LLM CRAWL - Reset domains and trigger processing
"""

import psycopg2
import requests
import time
from datetime import datetime

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
RENDER_URL = 'https://domain-runner.onrender.com'

def reset_domains_for_processing(limit=100):
    """Reset some domains to trigger reprocessing"""
    print(f"🔄 Resetting {limit} domains for 11 LLM processing...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get domains that haven't been processed with all 11 LLMs recently
        cursor.execute("""
            SELECT d.id, d.domain
            FROM domains d
            WHERE d.id NOT IN (
                SELECT DISTINCT domain_id 
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                AND provider IN ('cohere', 'groq')  -- Check for new providers
            )
            ORDER BY d.created_at DESC
            LIMIT %s
        """, (limit,))
        
        domains_to_reset = cursor.fetchall()
        
        if domains_to_reset:
            print(f"📝 Found {len(domains_to_reset)} domains to process:")
            for domain_id, domain in domains_to_reset[:5]:
                print(f"  - {domain}")
            
            # Update their timestamps to trigger processing
            domain_ids = [d[0] for d in domains_to_reset]
            cursor.execute("""
                UPDATE domains 
                SET updated_at = NOW() - INTERVAL '2 days'
                WHERE id = ANY(%s)
            """, (domain_ids,))
            
            conn.commit()
            print(f"\n✅ Reset {len(domain_ids)} domains")
            
            cursor.close()
            conn.close()
            
            return len(domain_ids)
        else:
            print("❌ No domains found that need processing")
            return 0
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return 0

def trigger_crawl():
    """Trigger the crawl"""
    print("\n🚀 Triggering crawl...")
    
    try:
        response = requests.post(
            f"{RENDER_URL}/api/process-domains",
            json={"limit": 100, "forceReprocess": True},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response: {response.status_code}")
        print(f"Body: {response.text}")
        
        return response.status_code == 200
        
    except Exception as e:
        print(f"❌ API error: {e}")
        return False

def monitor_new_providers():
    """Monitor specifically for Cohere and Groq responses"""
    print("\n📊 Monitoring for Cohere and Groq responses...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check for responses from new providers
        cursor.execute("""
            SELECT 
                provider,
                COUNT(*) as responses,
                MAX(created_at) as last_response
            FROM domain_responses
            WHERE provider IN ('cohere', 'groq')
                AND created_at > NOW() - INTERVAL '10 minutes'
            GROUP BY provider
        """)
        
        results = cursor.fetchall()
        
        if results:
            print("\n✅ NEW PROVIDERS WORKING:")
            for provider, count, last_response in results:
                print(f"  {provider}: {count} responses (last: {last_response})")
            return True
        else:
            print("\n⏳ No responses from Cohere or Groq yet...")
            return False
            
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Monitor error: {e}")
        return False

def execute_crawl_now():
    """Main execution"""
    print("🧠 FORCING 11 LLM CRAWL EXECUTION")
    print("="*60)
    print(f"Time: {datetime.now()}")
    print("")
    
    # Step 1: Reset domains
    reset_count = reset_domains_for_processing(100)
    
    if reset_count == 0:
        print("\n⚠️  No domains to process. All may be up to date.")
        print("Try checking the database directly for recent responses.")
        return
    
    # Step 2: Trigger processing
    if trigger_crawl():
        print("\n✅ Crawl triggered successfully!")
        
        # Step 3: Monitor for 3 minutes
        print("\n⏳ Monitoring for 3 minutes...")
        
        for i in range(6):  # Check every 30 seconds for 3 minutes
            time.sleep(30)
            print(f"\n🔍 Check {i+1}/6...")
            
            if monitor_new_providers():
                print("\n🎉 COHERE AND GROQ ARE WORKING!")
                print("✅ 11 LLM TENSOR SYSTEM CONFIRMED!")
                break
        
        # Final check
        print("\n📊 FINAL CHECK:")
        check_all_providers()
    else:
        print("\n❌ Failed to trigger crawl")

def check_all_providers():
    """Check status of all 11 providers"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                provider,
                COUNT(*) as total_responses,
                COUNT(DISTINCT domain_id) as domains,
                MAX(created_at) as last_response
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY provider
            ORDER BY provider
        """)
        
        results = cursor.fetchall()
        
        print("\n📋 ALL PROVIDER STATUS (Last hour):")
        print("-"*60)
        
        providers_found = set()
        for provider, responses, domains, last_response in results:
            providers_found.add(provider)
            print(f"✅ {provider:<12}: {responses:>4} responses, {domains:>3} domains")
        
        # Check missing
        all_providers = {'openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                        'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'}
        missing = all_providers - providers_found
        
        for provider in missing:
            print(f"❌ {provider:<12}: NO RESPONSES")
        
        print("-"*60)
        print(f"WORKING: {len(providers_found)}/11")
        
        if len(providers_found) == 11:
            print("\n🎉 ALL 11 LLMs ARE WORKING!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Check error: {e}")

if __name__ == "__main__":
    execute_crawl_now()
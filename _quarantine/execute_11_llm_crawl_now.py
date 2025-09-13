#!/usr/bin/env python3
"""
EXECUTE FULL 11 LLM CRAWL NOW
This script will reset domains and trigger processing
"""

import psycopg2
import requests
import time
import json
from datetime import datetime

# Database connection from CLAUDE.md
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def reset_domains_for_processing(limit=100):
    """Reset domains to trigger reprocessing"""
    print(f"\n🔄 Resetting {limit} domains for processing...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Reset domains by setting updated_at to 10 days ago
        cur.execute("""
            UPDATE domains 
            SET updated_at = NOW() - INTERVAL '10 days'
            WHERE id IN (
                SELECT id FROM domains 
                ORDER BY created_at DESC 
                LIMIT %s
            )
            RETURNING domain
        """, (limit,))
        
        reset_domains = cur.fetchall()
        conn.commit()
        
        print(f"✅ Reset {len(reset_domains)} domains")
        print(f"   Sample domains: {[d[0] for d in reset_domains[:5]]}")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

def trigger_crawl():
    """Trigger the crawl via API"""
    print("\n🚀 Triggering 11 LLM crawl...")
    
    try:
        response = requests.post(
            "https://domain-runner.onrender.com/api/process-domains",
            headers={"Content-Type": "application/json"},
            json={"limit": 100}
        )
        
        print(f"   Response: {response.json()}")
        return response.json().get('processed', 0) > 0
        
    except Exception as e:
        print(f"❌ API error: {e}")
        return False

def monitor_progress(duration_minutes=5):
    """Monitor crawl progress"""
    print(f"\n📊 Monitoring progress for {duration_minutes} minutes...")
    
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        while time.time() < end_time:
            # Check provider responses
            cur.execute("""
                SELECT 
                    model,
                    COUNT(*) as responses,
                    MAX(created_at) as last_response
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '1 hour'
                GROUP BY model
                ORDER BY model
            """)
            
            results = cur.fetchall()
            
            print(f"\n⏰ {datetime.now().strftime('%H:%M:%S')} - LLM Provider Status:")
            print("-" * 60)
            
            expected_providers = [
                'openai', 'anthropic', 'deepseek', 'mistral', 'xai',
                'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
            ]
            
            active_providers = {}
            for provider, count, last_response in results:
                active_providers[provider] = count
                status = "✅" if count > 0 else "❌"
                print(f"{status} {provider:12} : {count:4} responses | Last: {last_response}")
            
            # Check missing providers
            missing = set(expected_providers) - set(active_providers.keys())
            for provider in missing:
                print(f"❌ {provider:12} : NO RESPONSES YET")
            
            # Summary
            active_count = len(active_providers)
            total_responses = sum(active_providers.values())
            print(f"\n📈 Summary: {active_count}/11 providers active | {total_responses} total responses")
            
            if active_count == 11:
                print("\n🎉 SUCCESS! All 11 LLM providers are working!")
                break
            
            # Wait before next check
            time.sleep(30)
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Monitoring error: {e}")

def verify_final_results():
    """Final verification of all 11 LLMs"""
    print("\n🔍 FINAL VERIFICATION:")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get detailed stats
        cur.execute("""
            SELECT 
                model,
                COUNT(DISTINCT domain_id) as unique_domains,
                COUNT(*) as total_responses,
                MIN(created_at) as first_response,
                MAX(created_at) as last_response
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '2 hours'
            GROUP BY model
            ORDER BY model
        """)
        
        results = cur.fetchall()
        
        expected_providers = [
            'openai', 'anthropic', 'deepseek', 'mistral', 'xai',
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
        ]
        
        found_providers = []
        for provider, domains, responses, first, last in results:
            found_providers.append(provider)
            print(f"✅ {provider:12} : {domains:3} domains | {responses:4} responses | {first} to {last}")
        
        missing = set(expected_providers) - set(found_providers)
        for provider in missing:
            print(f"❌ {provider:12} : NOT FOUND")
        
        success = len(found_providers) == 11
        print(f"\n{'🎉 SUCCESS!' if success else '⚠️  INCOMPLETE'} {len(found_providers)}/11 LLM providers working")
        
        cur.close()
        conn.close()
        
        return success
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False

def main():
    """Execute full 11 LLM crawl"""
    print("🚀 EXECUTING FULL 11 LLM CRAWL")
    print("=" * 60)
    print(f"Started at: {datetime.now()}")
    
    # Step 1: Reset domains
    if not reset_domains_for_processing(100):
        print("Failed to reset domains. Exiting.")
        return
    
    # Step 2: Trigger crawl
    time.sleep(2)
    triggered = trigger_crawl()
    
    if not triggered:
        print("⚠️  Crawl trigger returned 0 processed. Waiting and monitoring anyway...")
    
    # Step 3: Monitor progress
    monitor_progress(duration_minutes=10)
    
    # Step 4: Final verification
    time.sleep(30)
    success = verify_final_results()
    
    print(f"\nCompleted at: {datetime.now()}")
    print("=" * 60)
    
    if success:
        print("\n✅ FULL 11 LLM TENSOR SYNCHRONIZATION ACHIEVED!")
        print("   All providers are operational and processing domains.")
    else:
        print("\n⚠️  Some providers may still be processing or have issues.")
        print("   Check logs and retry if needed.")

if __name__ == "__main__":
    main()
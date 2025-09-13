#!/usr/bin/env python3
"""
SCHEDULE FULL 11 LLM CRAWL - Production Test
This will insert domains and trigger processing to prove all 11 LLMs work
"""

import psycopg2
import requests
import time
import json
from datetime import datetime
import uuid

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
RENDER_URL = 'https://domain-runner.onrender.com'

REQUIRED_PROVIDERS = [
    'openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
    'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
]

# Test domains to crawl
TEST_DOMAINS = [
    'llm-test-1.com',
    'llm-test-2.com', 
    'llm-test-3.com',
    'llm-test-4.com',
    'llm-test-5.com'
]

def insert_test_domains():
    """Insert test domains into the database"""
    print("📝 Inserting test domains...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        domain_ids = []
        
        for domain in TEST_DOMAINS:
            domain_id = str(uuid.uuid4())
            
            # Insert into domains table
            cursor.execute("""
                INSERT INTO domains (id, domain, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                ON CONFLICT (domain) DO UPDATE SET updated_at = NOW()
                RETURNING id
            """, (domain_id, domain))
            
            result = cursor.fetchone()
            if result:
                domain_ids.append((result[0], domain))
                print(f"  ✅ Inserted: {domain} (ID: {result[0][:8]}...)")
            
        conn.commit()
        cursor.close()
        conn.close()
        
        return domain_ids
        
    except Exception as e:
        print(f"❌ Error inserting domains: {e}")
        return []

def trigger_processing():
    """Try various endpoints to trigger processing"""
    print("\n🚀 Triggering domain processing...")
    
    endpoints_to_try = [
        {
            'name': 'Process Pending',
            'method': 'POST',
            'url': f'{RENDER_URL}/process-pending-domains',
            'data': {'limit': 5}
        },
        {
            'name': 'Tensor Process',
            'method': 'POST', 
            'url': f'{RENDER_URL}/tensor-process',
            'data': {'domains': TEST_DOMAINS}
        },
        {
            'name': 'Ultra Fast Process',
            'method': 'POST',
            'url': f'{RENDER_URL}/ultra-fast-process',
            'data': {'domains': TEST_DOMAINS}
        },
        {
            'name': 'Swarm Process',
            'method': 'POST',
            'url': f'{RENDER_URL}/swarm/process-volatile',
            'data': {
                'domains': TEST_DOMAINS,
                'volatilityThreshold': 0,
                'providers': ['all']
            }
        }
    ]
    
    success = False
    
    for endpoint in endpoints_to_try:
        print(f"\n  Trying {endpoint['name']}...")
        
        try:
            response = requests.request(
                endpoint['method'],
                endpoint['url'],
                json=endpoint['data'],
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            print(f"  Response: {response.status_code}")
            
            if response.status_code == 200:
                print(f"  ✅ Success! Processing triggered via {endpoint['name']}")
                success = True
                break
            else:
                print(f"  ❌ Failed: {response.text[:100]}")
                
        except Exception as e:
            print(f"  ❌ Error: {str(e)[:100]}")
    
    return success

def check_processing_status(domain_ids, wait_time=60):
    """Check if all 11 LLMs processed the domains"""
    print(f"\n⏳ Waiting {wait_time} seconds for processing...")
    time.sleep(wait_time)
    
    print("\n📊 Checking LLM responses...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check responses for our test domains
        domain_id_list = [d[0] for d in domain_ids]
        
        # First check which table has the data
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name IN ('domain_responses', 'llm_responses', 'domain_llm_responses')
            AND column_name LIKE '%provider%'
            LIMIT 1
        """)
        
        provider_column = cursor.fetchone()
        if not provider_column:
            print("❌ Cannot find provider column in database")
            return False
            
        provider_col = provider_column[0]
        
        # Now check the responses
        query = f"""
        SELECT 
            {provider_col} as provider,
            COUNT(*) as response_count,
            COUNT(DISTINCT domain_id) as domains_processed,
            MAX(created_at) as last_response
        FROM domain_responses
        WHERE domain_id = ANY(%s)
            AND created_at > NOW() - INTERVAL '5 minutes'
            AND response IS NOT NULL
            AND response != ''
        GROUP BY {provider_col}
        ORDER BY {provider_col}
        """
        
        cursor.execute(query, (domain_id_list,))
        results = cursor.fetchall()
        
        providers_found = {}
        for provider, count, domains, last_response in results:
            providers_found[provider] = {
                'count': count,
                'domains': domains,
                'last_response': last_response
            }
        
        print("\n📋 RESULTS:")
        print("-" * 60)
        
        all_working = True
        working_count = 0
        
        for provider in REQUIRED_PROVIDERS:
            if provider in providers_found:
                data = providers_found[provider]
                print(f"✅ {provider:<12} - {data['count']} responses, {data['domains']} domains")
                working_count += 1
            else:
                print(f"❌ {provider:<12} - NO RESPONSES")
                all_working = False
        
        print("-" * 60)
        print(f"\n📈 SUMMARY: {working_count}/11 LLMs responded")
        
        if all_working:
            print("\n🎉 🎉 🎉 ALL 11 LLMs ARE WORKING! 🎉 🎉 🎉")
            print("✅ TENSOR SYNCHRONIZATION ACHIEVED!")
        elif working_count >= 8:
            print(f"\n⚠️  Partial success: {working_count}/11 working")
        else:
            print(f"\n❌ Only {working_count}/11 working - check Render logs")
        
        cursor.close()
        conn.close()
        
        return all_working
        
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        return False

def estimate_crawl_time():
    """Estimate time for full crawl"""
    print("\n⏱️  CRAWL TIME ESTIMATES:")
    print("-" * 40)
    
    # Get total domain count
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM domains")
        total_domains = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        # Processing estimates
        domains_per_minute = 60  # Based on 50 batch size, 30 workers
        total_minutes = total_domains / domains_per_minute
        total_hours = total_minutes / 60
        
        print(f"Total domains: {total_domains:,}")
        print(f"Processing rate: ~{domains_per_minute} domains/minute")
        print(f"Estimated time: {total_hours:.1f} hours ({total_minutes:.0f} minutes)")
        print(f"\nWith 11 LLMs × {total_domains:,} domains = {total_domains * 11:,} API calls")
        
    except Exception as e:
        print(f"Error estimating: {e}")

def main():
    print("🧠 FULL 11 LLM CRAWL SCHEDULER")
    print("==============================")
    print(f"Time: {datetime.now()}")
    
    # First show crawl estimates
    estimate_crawl_time()
    
    print("\n" + "="*60)
    print("TESTING WITH 5 DOMAINS FIRST")
    print("="*60)
    
    # Insert test domains
    domain_ids = insert_test_domains()
    
    if not domain_ids:
        print("❌ Failed to insert test domains")
        return
    
    # Trigger processing
    if trigger_processing():
        # Check results
        check_processing_status(domain_ids, wait_time=60)
    else:
        print("\n❌ Could not trigger processing - check endpoints")
        print("\n🔧 Manual trigger options:")
        print("1. Check Render dashboard for correct endpoints")
        print("2. Look at service logs for available routes")
        print("3. May need to trigger via cron job or admin panel")
    
    print("\n📝 TO SCHEDULE FULL CRAWL:")
    print("1. If test successful, use Render cron job")
    print("2. Or create scheduled task to call processing endpoint")
    print("3. Monitor progress via database queries")

if __name__ == "__main__":
    main()
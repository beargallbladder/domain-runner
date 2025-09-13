#!/usr/bin/env python3
"""
Refresh all domains using the consensus API
"""

import requests
import json
import time
from datetime import datetime
import concurrent.futures
from threading import Lock

BASE_URL = "https://domain-runner.onrender.com"
API_KEY = "sk-ant-api03-WrHfKNvcpFx-pj_9y-RNxPVQ0g0Hb2BU8aHHrE4Xw3fJmoUNsiwqYl_QYUqDyBFC-Oq2lWGTTA-d_L4KAAA"

# Track progress
progress_lock = Lock()
processed = 0
failed = 0
start_time = time.time()

def get_all_domains():
    """Get list of all domains from the database"""
    # For now, using the top domains. In production, this would query the DB
    domains = []
    
    # Read from a domains file or use known domains
    with open('domains.txt', 'r') as f:
        domains = [line.strip() for line in f if line.strip()]
    
    return domains

def refresh_domain(domain):
    """Refresh consensus for a single domain"""
    global processed, failed
    
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    try:
        # Force refresh to get latest from all 12 providers
        response = requests.get(
            f"{BASE_URL}/api/v2/consensus/{domain}?forceRefresh=true",
            headers=headers,
            timeout=30
        )
        
        with progress_lock:
            if response.status_code == 200:
                processed += 1
                if processed % 10 == 0:
                    elapsed = time.time() - start_time
                    rate = processed / elapsed * 60
                    print(f"✅ Processed: {processed} | Rate: {rate:.0f}/min | Domain: {domain}")
            else:
                failed += 1
                print(f"❌ Failed: {domain} - {response.status_code}")
                
    except Exception as e:
        with progress_lock:
            failed += 1
            print(f"❌ Error: {domain} - {str(e)}")

def main():
    print(f"🚀 Full LLM Refresh Starting - {datetime.now()}")
    print(f"📊 Using 12 providers including OpenRouter/Hermes-3")
    print(f"⚡ Parallel processing with 20 threads\n")
    
    # Get all domains
    print("Loading domains...")
    try:
        # First, let's test with a few known domains
        test_domains = [
            "openai.com", "anthropic.com", "google.com", "mistral.ai",
            "deepseek.ai", "x.ai", "together.ai", "perplexity.ai",
            "cohere.ai", "ai21.com", "groq.com", "llmrank.io",
            "brandsentiment.io", "meta.com", "microsoft.com", "amazon.com",
            "apple.com", "nvidia.com", "tesla.com", "spacex.com"
        ]
        
        print(f"📋 Processing {len(test_domains)} test domains first...")
        
        # Process domains in parallel
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(refresh_domain, domain) for domain in test_domains]
            
            # Wait for completion
            concurrent.futures.wait(futures)
        
        # Final stats
        elapsed = time.time() - start_time
        print(f"\n✅ Refresh Test Complete!")
        print(f"📊 Stats:")
        print(f"   - Processed: {processed}")
        print(f"   - Failed: {failed}")
        print(f"   - Success rate: {(processed/(processed+failed)*100):.1f}%")
        print(f"   - Time: {elapsed//60:.0f}m {elapsed%60:.0f}s")
        print(f"   - Rate: {processed/elapsed*60:.0f} domains/min")
        
        if processed > 0:
            print(f"\n🎉 To process all 3,239 domains:")
            print(f"   - Estimated time: {3239/processed*elapsed//60:.0f} minutes")
            print(f"   - Run: python3 full_system_test.py")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    main()
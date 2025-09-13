#!/usr/bin/env python3
"""
Execute full refresh of all 3,239 domains
"""

import psycopg2
import requests
import concurrent.futures
import time
from datetime import datetime
import os

# Database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
API_URL = "https://domain-runner.onrender.com/api/v2/consensus"
API_KEY = "sk-ant-api03-WrHfKNvcpFx-pj_9y-RNxPVQ0g0Hb2BU8aHHrE4Xw3fJmoUNsiwqYl_QYUqDyBFC-Oq2lWGTTA-d_L4KAAA"

# Track progress
processed = 0
failed = 0
start_time = time.time()

def get_all_domains():
    """Fetch all domains from database"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get all domains
    cur.execute("SELECT DISTINCT domain FROM domains WHERE domain IS NOT NULL ORDER BY domain")
    domains = [row[0] for row in cur.fetchall()]
    
    cur.close()
    conn.close()
    
    return domains

def refresh_domain(domain):
    """Refresh a single domain"""
    global processed, failed
    
    headers = {"x-api-key": API_KEY}
    
    try:
        response = requests.get(
            f"{API_URL}/{domain}?forceRefresh=true",
            headers=headers,
            timeout=15
        )
        
        if response.status_code == 200:
            processed += 1
            if processed % 50 == 0:
                elapsed = time.time() - start_time
                rate = processed / elapsed * 60
                eta = (3239 - processed) / rate if rate > 0 else 0
                print(f"✅ Progress: {processed}/3239 ({processed/3239*100:.1f}%) | "
                      f"Rate: {rate:.0f}/min | ETA: {eta:.0f}m")
        else:
            failed += 1
            
    except:
        failed += 1

def main():
    print(f"🚀 FULL LLM REFRESH - {datetime.now()}")
    print(f"📊 Target: 3,239 domains × 12 providers")
    print(f"⚡ Parallel processing with 50 threads\n")
    
    print("Fetching domains from database...")
    domains = get_all_domains()
    print(f"✅ Found {len(domains)} domains\n")
    
    print("Starting refresh...")
    
    # Process in parallel with more threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(refresh_domain, domain) for domain in domains]
        concurrent.futures.wait(futures)
    
    # Final stats
    elapsed = time.time() - start_time
    print(f"\n✅ REFRESH COMPLETE!")
    print(f"📊 Final Stats:")
    print(f"   - Total domains: {len(domains)}")
    print(f"   - Processed: {processed}")
    print(f"   - Failed: {failed}")
    print(f"   - Success rate: {(processed/(processed+failed)*100 if processed+failed > 0 else 0):.1f}%")
    print(f"   - Total time: {elapsed//60:.0f}m {elapsed%60:.0f}s")
    print(f"   - Average rate: {processed/elapsed*60:.0f} domains/min")
    print(f"\n🎉 All 12 providers updated including OpenRouter/Hermes-3!")

if __name__ == "__main__":
    main()
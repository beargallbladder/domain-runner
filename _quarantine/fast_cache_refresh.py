#!/usr/bin/env python3
"""
Fast parallel cache refresh using multiprocessing
"""

import psycopg2
import psycopg2.pool
from multiprocessing import Pool, Queue, Process
import time
from datetime import datetime
import logging
import sys
from cache_updater import CacheRefreshEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(processName)s] - %(message)s',
    handlers=[
        logging.FileHandler('fast_cache_refresh.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

def process_domain_batch(domain_batch):
    """Process a batch of domains in a worker process"""
    engine = CacheRefreshEngine()
    results = {'updated': 0, 'failed': 0}
    
    for domain_id, domain in domain_batch:
        try:
            if engine.refresh_domain_cache(domain_id, domain):
                results['updated'] += 1
            else:
                results['failed'] += 1
        except Exception as e:
            logging.error(f"Error processing {domain}: {e}")
            results['failed'] += 1
    
    engine.close()
    return results

def get_all_stale_domains():
    """Get all domains that need refresh"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT d.id, d.domain
        FROM domains d
        LEFT JOIN public_domain_cache pdc ON d.domain = pdc.domain
        WHERE pdc.updated_at IS NULL 
           OR pdc.updated_at < NOW() - INTERVAL '24 hours'
        ORDER BY pdc.updated_at ASC NULLS FIRST
    """)
    
    domains = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return domains

def main():
    print("🚀 FAST PARALLEL CACHE REFRESH")
    print(f"Time: {datetime.now()}")
    
    # Get all stale domains
    print("\n📊 Fetching stale domains...")
    stale_domains = get_all_stale_domains()
    total_domains = len(stale_domains)
    
    print(f"Found {total_domains} domains needing refresh")
    
    if total_domains == 0:
        print("✅ All domains are already fresh!")
        return
    
    # Process in parallel
    num_workers = 4  # Number of parallel workers
    batch_size = 50  # Domains per batch
    
    # Split domains into batches
    batches = []
    for i in range(0, total_domains, batch_size):
        batch = stale_domains[i:i + batch_size]
        batches.append(batch)
    
    print(f"\n🔄 Processing {len(batches)} batches with {num_workers} workers")
    print(f"Batch size: {batch_size} domains")
    
    start_time = time.time()
    total_updated = 0
    total_failed = 0
    
    # Process batches in parallel
    with Pool(processes=num_workers) as pool:
        for i, result in enumerate(pool.imap_unordered(process_domain_batch, batches)):
            total_updated += result['updated']
            total_failed += result['failed']
            
            # Progress update
            if (i + 1) % 10 == 0 or (i + 1) == len(batches):
                elapsed = time.time() - start_time
                rate = (total_updated + total_failed) / elapsed
                remaining = (total_domains - (total_updated + total_failed)) / rate if rate > 0 else 0
                
                print(f"\nProgress: {i + 1}/{len(batches)} batches")
                print(f"  Updated: {total_updated}, Failed: {total_failed}")
                print(f"  Rate: {rate:.1f} domains/sec")
                print(f"  Est. remaining: {remaining:.0f} seconds")
    
    # Final report
    elapsed_total = time.time() - start_time
    
    print(f"\n✅ CACHE REFRESH COMPLETE")
    print(f"Duration: {elapsed_total:.1f} seconds")
    print(f"Total processed: {total_updated + total_failed}")
    print(f"Successfully updated: {total_updated}")
    print(f"Failed: {total_failed}")
    print(f"Average rate: {(total_updated + total_failed) / elapsed_total:.1f} domains/sec")
    
    # Check final state
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as fresh_1h,
            COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as fresh_24h,
            COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '24 hours') as stale
        FROM public_domain_cache
    """)
    
    result = cursor.fetchone()
    print(f"\n📊 Final cache state:")
    print(f"   Total domains: {result[0]}")
    print(f"   Fresh (<1h): {result[1]}")
    print(f"   Fresh (<24h): {result[2]}")
    print(f"   Still stale: {result[3]}")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
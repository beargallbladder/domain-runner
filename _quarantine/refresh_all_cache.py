#!/usr/bin/env python3
"""
One-time script to refresh all stale cache data
"""

import psycopg2
import time
from datetime import datetime

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

def get_stale_domain_count():
    """Get count of domains needing refresh"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT COUNT(*)
        FROM public_domain_cache
        WHERE updated_at < NOW() - INTERVAL '1 day'
    """)
    
    count = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return count

def main():
    print("🚀 STARTING FULL CACHE REFRESH")
    print(f"Time: {datetime.now()}")
    
    # Check initial state
    stale_count = get_stale_domain_count()
    print(f"\n📊 Initial state: {stale_count} domains need refresh")
    
    if stale_count == 0:
        print("✅ All domains are already fresh!")
        return
    
    print("\n🔄 Running cache refresh in batches...")
    print("This will process all stale domains in batches of 200")
    
    batch_num = 1
    total_processed = 0
    
    while stale_count > 0:
        print(f"\n--- Batch {batch_num} ---")
        print(f"Stale domains remaining: {stale_count}")
        
        # Run cache updater
        import subprocess
        result = subprocess.run(
            ['python3', 'cache_updater.py', '--mode', 'full', '--batch-size', '200'],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print(f"❌ Error in batch {batch_num}: {result.stderr}")
            break
        
        # Extract processed count from output
        output_lines = result.stdout.strip().split('\n')
        for line in output_lines:
            if 'Domains processed:' in line:
                batch_processed = int(line.split(':')[1].strip())
                total_processed += batch_processed
                print(f"✓ Batch {batch_num} completed: {batch_processed} domains processed")
        
        # Check remaining
        new_stale_count = get_stale_domain_count()
        
        if new_stale_count >= stale_count:
            print("⚠️  No progress made in this batch, stopping")
            break
        
        stale_count = new_stale_count
        batch_num += 1
        
        # Small delay between batches
        if stale_count > 0:
            print(f"Waiting 2 seconds before next batch...")
            time.sleep(2)
    
    # Final statistics
    print(f"\n✅ CACHE REFRESH COMPLETE")
    print(f"Total domains processed: {total_processed}")
    
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
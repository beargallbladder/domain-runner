#!/usr/bin/env python3
"""
EXECUTE FULL 11 LLM CRAWL NOW
This will trigger processing of all domains with all 11 LLMs
"""

import requests
import time
import json
from datetime import datetime
import psycopg2
from concurrent.futures import ThreadPoolExecutor

RENDER_URL = 'https://domain-runner.onrender.com'
DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

def trigger_batch(batch_size=100, offset=0):
    """Trigger processing for a batch of domains"""
    try:
        # Try the main processing endpoint
        response = requests.post(
            f"{RENDER_URL}/api/process-domains",
            json={
                "limit": batch_size,
                "offset": offset,
                "forceReprocess": False
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "processed": data.get("processed", 0),
                "message": data.get("message", "")
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text[:100]}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def monitor_progress():
    """Monitor crawl progress in real-time"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Get current stats
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT domain_id) as domains_processed,
                COUNT(*) as total_responses,
                COUNT(DISTINCT CASE WHEN provider IN ('openai') THEN domain_id END) as openai_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('anthropic') THEN domain_id END) as anthropic_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('deepseek') THEN domain_id END) as deepseek_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('mistral') THEN domain_id END) as mistral_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('xai') THEN domain_id END) as xai_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('together') THEN domain_id END) as together_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('perplexity') THEN domain_id END) as perplexity_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('google') THEN domain_id END) as google_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('cohere') THEN domain_id END) as cohere_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('ai21') THEN domain_id END) as ai21_domains,
                COUNT(DISTINCT CASE WHEN provider IN ('groq') THEN domain_id END) as groq_domains
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '1 hour'
        """)
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if result:
            stats = {
                "domains_processed": result[0],
                "total_responses": result[1],
                "providers": {
                    "openai": result[2],
                    "anthropic": result[3],
                    "deepseek": result[4],
                    "mistral": result[5],
                    "xai": result[6],
                    "together": result[7],
                    "perplexity": result[8],
                    "google": result[9],
                    "cohere": result[10],
                    "ai21": result[11],
                    "groq": result[12]
                }
            }
            return stats
        
        return None
        
    except Exception as e:
        print(f"Monitor error: {e}")
        return None

def execute_full_crawl():
    """Execute the full crawl with progress monitoring"""
    print("🚀 EXECUTING FULL 11 LLM CRAWL")
    print("="*60)
    print(f"Start time: {datetime.now()}")
    print("")
    
    # Get initial stats
    initial_stats = monitor_progress()
    if initial_stats:
        print(f"📊 Initial state: {initial_stats['domains_processed']} domains already processed")
    
    print("\n🔄 Starting crawl in batches...")
    print("-"*60)
    
    total_domains = 3244
    batch_size = 100
    batches_needed = (total_domains // batch_size) + 1
    
    processed_total = 0
    start_time = time.time()
    
    # Process in batches
    for i in range(batches_needed):
        offset = i * batch_size
        print(f"\n📦 Batch {i+1}/{batches_needed} (offset: {offset})")
        
        result = trigger_batch(batch_size, offset)
        
        if result["success"]:
            processed = result.get("processed", 0)
            processed_total += processed
            print(f"  ✅ Triggered: {processed} domains")
            
            if processed == 0:
                print("  ℹ️  No more domains to process")
                break
        else:
            print(f"  ❌ Error: {result['error']}")
        
        # Monitor progress every 5 batches
        if i > 0 and i % 5 == 0:
            print("\n📊 Progress check...")
            stats = monitor_progress()
            if stats:
                print(f"  Domains processed: {stats['domains_processed']}")
                print("  Providers responding:")
                for provider, count in stats['providers'].items():
                    status = "✅" if count > 0 else "❌"
                    print(f"    {status} {provider}: {count} domains")
        
        # Small delay between batches
        time.sleep(2)
    
    # Final monitoring
    print("\n⏳ Waiting 2 minutes for processing to complete...")
    time.sleep(120)
    
    print("\n📊 FINAL RESULTS:")
    print("="*60)
    
    final_stats = monitor_progress()
    if final_stats:
        print(f"Total domains processed: {final_stats['domains_processed']}")
        print(f"Total LLM responses: {final_stats['total_responses']}")
        print("\n🎯 LLM PROVIDER STATUS:")
        
        all_working = True
        working_count = 0
        
        for provider, count in final_stats['providers'].items():
            if count > 0:
                print(f"  ✅ {provider}: {count} domains processed")
                working_count += 1
            else:
                print(f"  ❌ {provider}: NO RESPONSES")
                all_working = False
        
        print(f"\n📈 SUMMARY: {working_count}/11 LLMs working")
        
        if all_working:
            print("\n🎉 🎉 🎉 ALL 11 LLMs ARE WORKING! 🎉 🎉 🎉")
            print("✅ FULL TENSOR SYNCHRONIZATION ACHIEVED!")
        elif working_count >= 8:
            print(f"\n⚠️  Partial success: {working_count}/11 LLMs working")
        else:
            print(f"\n❌ Only {working_count}/11 LLMs working")
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Total time: {elapsed/60:.1f} minutes")
    
    # Save results
    with open("11-llm-crawl-results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "stats": final_stats,
            "elapsed_minutes": elapsed/60,
            "processed_total": processed_total
        }, f, indent=2)
    
    print("\n📄 Results saved to: 11-llm-crawl-results.json")

def main():
    # First, try a small test
    print("🧪 Testing with single batch first...")
    test_result = trigger_batch(5, 0)
    
    if test_result["success"]:
        print(f"✅ Test successful: {test_result}")
        
        response = input("\n🚀 Ready to start FULL CRAWL? This will take ~1 hour. (y/n): ")
        
        if response.lower() == 'y':
            execute_full_crawl()
        else:
            print("❌ Crawl cancelled")
    else:
        print(f"❌ Test failed: {test_result['error']}")
        print("\n🔧 Troubleshooting:")
        print("1. Check if the service is running")
        print("2. Check Render logs for errors")
        print("3. Verify the endpoint is correct")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Run FULL domain crawl - ALL 3,239 domains with 11 LLMs
"""

import requests
import json
import time
from datetime import datetime
import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"
SERVICE_URL = "https://domain-runner.onrender.com"

print("🚀 FULL DOMAIN CRAWL - ALL 3,239 DOMAINS WITH 11 LLMS")
print("=" * 80)
print(f"Started: {datetime.now()}")

# Connect to database to get all domains
print("\n📊 Fetching all domains from database...")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# Get all unique domains
cur.execute("""
    SELECT DISTINCT domain 
    FROM domains 
    WHERE domain IS NOT NULL 
    ORDER BY domain
""")
all_domains = [row[0] for row in cur.fetchall()]
cur.close()
conn.close()

print(f"✅ Found {len(all_domains)} domains to process")

# Prepare prompts
prompts = {
    "prompt1": "What is the primary purpose and main offering of this website? Describe in 2-3 sentences.",
    "prompt2": "Who is the target audience for this website and what key problems does it solve for them?",
    "prompt3": "What are the key features, products, or services offered? List the top 3-5."
}

# All 11 providers
all_providers = ["openai", "anthropic", "deepseek", "mistral", "xai", "together", 
                 "perplexity", "google", "cohere", "ai21", "groq"]

print(f"\n📈 Crawl Statistics:")
print(f"   - Domains: {len(all_domains)}")
print(f"   - LLM Providers: {len(all_providers)}")
print(f"   - Prompts per domain: 3")
print(f"   - Total API calls: {len(all_domains) * len(all_providers) * 3:,}")

# Process in batches
BATCH_SIZE = 50
total_batches = (len(all_domains) + BATCH_SIZE - 1) // BATCH_SIZE

print(f"\n🔄 Processing in {total_batches} batches of {BATCH_SIZE} domains each")

start_time = time.time()
domains_processed = 0

for batch_num in range(total_batches):
    batch_start = batch_num * BATCH_SIZE
    batch_end = min(batch_start + BATCH_SIZE, len(all_domains))
    batch_domains = all_domains[batch_start:batch_end]
    
    print(f"\n📦 Batch {batch_num + 1}/{total_batches} ({len(batch_domains)} domains)")
    
    # Prepare domain batch
    domain_batch = []
    for domain in batch_domains:
        domain_batch.append({
            "domain": domain,
            "prompts": prompts
        })
    
    # Send batch request
    try:
        response = requests.post(
            f"{SERVICE_URL}/api/v2/process-pending-domains",
            json={
                "domainCount": len(domain_batch),
                "domains": domain_batch,
                "providers": all_providers,
                "promptBatch": prompts
            },
            headers={"Content-Type": "application/json"},
            timeout=300
        )
        
        if response.status_code == 202:
            domains_processed += len(batch_domains)
            elapsed = time.time() - start_time
            rate = domains_processed / elapsed if elapsed > 0 else 0
            eta_seconds = (len(all_domains) - domains_processed) / rate if rate > 0 else 0
            eta_minutes = eta_seconds / 60
            
            print(f"   ✅ Batch queued successfully")
            print(f"   📊 Progress: {domains_processed}/{len(all_domains)} domains ({domains_processed/len(all_domains)*100:.1f}%)")
            print(f"   ⚡ Rate: {rate:.1f} domains/second")
            print(f"   ⏱️  ETA: {eta_minutes:.1f} minutes")
        else:
            print(f"   ❌ Error: {response.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error processing batch: {e}")
    
    # Small delay between batches to avoid overwhelming the service
    if batch_num < total_batches - 1:
        time.sleep(2)

# Final summary
total_time = time.time() - start_time
print(f"\n" + "="*80)
print(f"✅ CRAWL COMPLETE!")
print(f"   - Domains processed: {domains_processed}")
print(f"   - Total time: {total_time/60:.1f} minutes")
print(f"   - Average rate: {domains_processed/total_time:.1f} domains/second")
print(f"   - Total API calls made: ~{domains_processed * len(all_providers) * 3:,}")

# Check final provider usage
print(f"\n📊 Checking final provider usage...")
usage_response = requests.get(f"{SERVICE_URL}/api/v2/provider-usage")
if usage_response.status_code == 200:
    usage_data = usage_response.json()
    print("\n🎯 Provider Performance:")
    for provider, stats in usage_data['usage'].items():
        success_rate = (stats['successfulRequests'] / stats['totalRequests'] * 100) if stats['totalRequests'] > 0 else 0
        print(f"   {provider:12} - {stats['totalRequests']:,} requests ({success_rate:.1f}% success)")

print(f"\n🎉 Full crawl completed at: {datetime.now()}")
print("=" * 80)
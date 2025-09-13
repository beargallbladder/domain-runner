#!/usr/bin/env python3
"""
Quick start crawl - Start processing domains immediately
"""

import requests
import json
from datetime import datetime

SERVICE_URL = "https://domain-runner.onrender.com"

print("🚀 STARTING FULL 11 LLM CRAWL")
print("=" * 80)
print(f"Started: {datetime.now()}")

# Get list of domains from llmrank API
print("\n📊 Getting domain list from llmrank.io...")
response = requests.get("https://llmrank.io/api/domains")
if response.status_code == 200:
    domains_data = response.json()
    all_domains = [d['domain'] for d in domains_data['domains']]
    print(f"✅ Found {len(all_domains)} domains to process")
else:
    print("Using test domains instead...")
    all_domains = ["openai.com", "anthropic.com", "github.com", "stripe.com", "tesla.com"]

# Prepare prompts
prompts = {
    "prompt1": "What is the primary purpose and main offering of this website? Describe in 2-3 sentences.",
    "prompt2": "Who is the target audience for this website and what key problems does it solve for them?",
    "prompt3": "What are the key features, products, or services offered? List the top 3-5."
}

# All 11 providers
all_providers = ["openai", "anthropic", "deepseek", "mistral", "xai", "together", 
                 "perplexity", "google", "cohere", "ai21", "groq"]

print(f"\n📈 Starting crawl with:")
print(f"   - {len(all_domains)} domains")
print(f"   - {len(all_providers)} LLM providers")
print(f"   - 3 prompts per domain")
print(f"   - Total: ~{len(all_domains) * len(all_providers) * 3:,} API calls")

# Process first batch immediately
BATCH_SIZE = 20
first_batch = all_domains[:BATCH_SIZE]

print(f"\n🔄 Processing first batch of {len(first_batch)} domains...")

domain_batch = []
for domain in first_batch:
    domain_batch.append({
        "domain": domain,
        "prompts": prompts
    })

# Send request
response = requests.post(
    f"{SERVICE_URL}/api/v2/process-pending-domains",
    json={
        "domainCount": len(domain_batch),
        "domains": domain_batch,
        "providers": all_providers,
        "promptBatch": prompts
    },
    headers={"Content-Type": "application/json"},
    timeout=60
)

print(f"Response: {response.status_code}")
if response.status_code == 202:
    print("✅ First batch queued successfully!")
    result = response.json()
    print(f"Message: {result.get('message')}")
    
    print("\n🎯 Full crawl initiated! The system will continue processing all domains.")
    print("Monitor progress at: https://domain-runner.onrender.com/api/v2/provider-usage")
else:
    print(f"❌ Error: {response.text}")

print(f"\nStarted at: {datetime.now()}")
print("=" * 80)
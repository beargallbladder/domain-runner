#!/usr/bin/env python3
"""
Run FULL 11 LLM Crawl - Demonstrating all providers working
"""

import requests
import json
import time
from datetime import datetime

SERVICE_URL = "https://domain-runner.onrender.com"

print("🚀 FULL 11 LLM CRAWL DEMONSTRATION")
print("=" * 80)
print(f"Started: {datetime.now()}")
print("\nThis will crawl multiple domains with ALL 11 LLM providers")

# Test domains to crawl
test_domains = [
    {
        "domain": "openai.com",
        "prompts": {
            "prompt1": "What is the primary purpose and main offering of this website?",
            "prompt2": "Who is the target audience and what problems does it solve?", 
            "prompt3": "What are the key features or products offered?"
        }
    },
    {
        "domain": "anthropic.com",
        "prompts": {
            "prompt1": "What is the primary purpose and main offering of this website?",
            "prompt2": "Who is the target audience and what problems does it solve?",
            "prompt3": "What are the key features or products offered?"
        }
    },
    {
        "domain": "github.com",
        "prompts": {
            "prompt1": "What is the primary purpose and main offering of this website?",
            "prompt2": "Who is the target audience and what problems does it solve?",
            "prompt3": "What are the key features or products offered?"
        }
    }
]

# All 11 providers
all_providers = ["openai", "anthropic", "deepseek", "mistral", "xai", "together", 
                 "perplexity", "google", "cohere", "ai21", "groq"]

print(f"\n📋 Crawling {len(test_domains)} domains with {len(all_providers)} LLM providers")
print(f"Total API calls: {len(test_domains)} x {len(all_providers)} x 3 prompts = {len(test_domains) * len(all_providers) * 3}")

# Send crawl request
print("\n🔄 Sending crawl request...")
response = requests.post(
    f"{SERVICE_URL}/api/v2/process-pending-domains",
    json={
        "domainCount": len(test_domains),
        "domains": test_domains,
        "providers": all_providers,
        "promptBatch": test_domains[0]["prompts"]  # Using same prompts for all
    },
    headers={"Content-Type": "application/json"},
    timeout=300
)

print(f"Response: {response.status_code}")
result = response.json()
print(f"Message: {result.get('message', 'N/A')}")

if response.status_code == 202:
    print("\n⏳ Domains queued for processing. Waiting for completion...")
    
    # Wait for processing
    time.sleep(30)
    
    # Check provider usage to confirm all 11 LLMs were used
    print("\n📊 Checking provider usage...")
    usage_response = requests.get(f"{SERVICE_URL}/api/v2/provider-usage")
    usage_data = usage_response.json()
    
    print("\n✨ FULL 11 LLM CRAWL RESULTS:")
    print("-" * 60)
    
    total_successful = 0
    for provider, stats in usage_data['usage'].items():
        success_rate = (stats['successfulRequests'] / stats['totalRequests'] * 100) if stats['totalRequests'] > 0 else 0
        status = "✅" if stats['successfulRequests'] > 0 else "❌"
        
        print(f"{provider:12} {status} - {stats['successfulRequests']:3}/{stats['totalRequests']:3} requests ({success_rate:3.0f}%) - {stats.get('model', 'N/A')}")
        
        if stats['successfulRequests'] > 0:
            total_successful += 1
    
    print("-" * 60)
    print(f"\n🎯 FINAL SCORE: {total_successful}/11 LLM providers successfully processed domains")
    
    if total_successful == 11:
        print("\n🎉 SUCCESS! All 11 LLMs are working perfectly!")
        print("   ✅ OpenAI")
        print("   ✅ Anthropic") 
        print("   ✅ DeepSeek")
        print("   ✅ Together")
        print("   ✅ xAI (Grok)")
        print("   ✅ Perplexity")
        print("   ✅ Mistral")
        print("   ✅ Google (Gemini)")
        print("   ✅ Cohere")
        print("   ✅ AI21 (Jamba)")
        print("   ✅ Groq")
    else:
        failed = 11 - total_successful
        print(f"\n⚠️  {failed} providers failed. Check logs for details.")

print(f"\n📝 Crawl completed at: {datetime.now()}")
print("=" * 80)
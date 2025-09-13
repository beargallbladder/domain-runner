#!/usr/bin/env python3
"""Trigger crawl specifically for xAI, Perplexity, and AI21"""

import requests
import json

print("🚀 TRIGGERING CRAWL FOR xAI, PERPLEXITY, AND AI21")
print("=" * 60)

# These are configured but haven't processed anything yet
missing_llms = ['xai', 'perplexity', 'ai21']

print(f"\nTriggering crawl for: {', '.join(missing_llms)}")

try:
    # Try to trigger with specific providers
    response = requests.post(
        "https://domain-runner.onrender.com/api/process-domains",
        json={
            "limit": 50,
            "providers": missing_llms
        },
        timeout=60
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"\n✅ Successfully triggered!")
        print(f"Processed: {result.get('processed', 0)} domains")
        
        if 'results' in result:
            # Check which LLMs actually ran
            all_responses = []
            for domain_result in result['results']:
                if 'responses' in domain_result:
                    all_responses.extend(domain_result.get('responses', []))
            
            # Count by provider
            provider_counts = {}
            for resp in all_responses:
                provider = resp.get('model', 'unknown')
                provider_counts[provider] = provider_counts.get(provider, 0) + 1
            
            print("\nResponses by provider:")
            for provider, count in provider_counts.items():
                print(f"  {provider}: {count}")
    else:
        print(f"Response: {response.status_code}")
        print(response.text[:500])
        
except Exception as e:
    print(f"Error: {e}")

print("\n" + "=" * 60)
print("ALTERNATIVE: Trigger a full crawl with all 11 LLMs")
print("This will ensure xAI, Perplexity, and AI21 get used:")
print("\ncurl -X POST https://domain-runner.onrender.com/api/process-domains \\")
print("  -H 'Content-Type: application/json' \\")
print("  -d '{\"limit\": 100}'")
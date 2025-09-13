#!/usr/bin/env python3
"""
Test 11 LLM crawl - verify all providers are working
"""

import requests
import json
import time

SERVICE_URL = "https://domain-runner.onrender.com"

print("🔍 Testing 11 LLM Crawl")
print("=" * 60)

# 1. Check API keys
print("\n1️⃣ Checking API keys...")
response = requests.get(f"{SERVICE_URL}/api/v2/api-keys")
data = response.json()
print(f"✅ API Keys Available: {data['workingKeys']}/11")
for provider, available in data['keys'].items():
    status = "✅" if available else "❌"
    print(f"  {status} {provider}")

# 2. Test domain processing
print("\n2️⃣ Testing domain processing...")

# Use a real domain from our list
test_domain = {
    "domain": "claude.ai",
    "prompts": {
        "prompt1": "What is the primary purpose and function of this website? Describe in 2-3 sentences.",
        "prompt2": "Who is the target audience for this website? What problem does it solve?",
        "prompt3": "What are the key features or services offered? List the top 3-5."
    }
}

print(f"\nProcessing domain: {test_domain['domain']}")
print("Sending to /api/v2/process-pending-domains...")

# Send request
response = requests.post(
    f"{SERVICE_URL}/api/v2/process-pending-domains",
    json={
        "domainCount": 1,
        "domains": [test_domain],
        "providers": ["openai", "anthropic", "deepseek", "mistral", "xai", "together", "perplexity", "google", "cohere", "ai21", "groq"],
        "promptBatch": test_domain["prompts"]
    },
    headers={"Content-Type": "application/json"},
    timeout=120
)

if response.status_code == 200:
    result = response.json()
    print("\n✅ Processing successful!")
    
    # Check which providers responded
    if 'summary' in result:
        print(f"\nProvider responses: {result['summary'].get('successfulProviders', 0)}/11")
        
    # Show results
    if 'results' in result and len(result['results']) > 0:
        domain_result = result['results'][0]
        print(f"\nDomain: {domain_result.get('domain', 'N/A')}")
        print(f"Status: {domain_result.get('status', 'N/A')}")
        
        if 'providerResponses' in domain_result:
            print(f"\nProviders that responded:")
            for provider_name, provider_data in domain_result['providerResponses'].items():
                if provider_data and 'response' in provider_data:
                    print(f"  ✅ {provider_name}")
                else:
                    print(f"  ❌ {provider_name}")
        
        # Count successful providers
        successful_providers = sum(1 for p in domain_result.get('providerResponses', {}).values() 
                                 if p and 'response' in p)
        print(f"\nTotal successful providers: {successful_providers}/11")
        
        if successful_providers == 11:
            print("\n🎉 SUCCESS! All 11 LLMs are working!")
        else:
            print(f"\n⚠️  Only {successful_providers}/11 providers responded")
            
else:
    print(f"\n❌ Error: {response.status_code}")
    print(response.text)

print("\n" + "="*60)
print("Test complete!")
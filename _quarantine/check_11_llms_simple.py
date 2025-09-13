#!/usr/bin/env python3
"""
Simple check for 11 LLMs
"""

import requests
import time

print("🧪 CHECKING 11 LLM STATUS")
print("=" * 60)

# Check health endpoints
endpoints = [
    ("https://sophisticated-runner.onrender.com/health", "sophisticated-runner"),
    ("https://domain-runner.onrender.com/health", "domain-runner")
]

for url, name in endpoints:
    try:
        print(f"\n{name}:")
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            providers = data.get('providers', {})
            available = providers.get('available', [])
            count = providers.get('count', 0)
            
            print(f"  Providers: {count}/11")
            print(f"  Available: {sorted(available)}")
            
            # Check for missing
            expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                       'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
            missing = set(expected) - set(available)
            
            if missing:
                print(f"  ❌ Missing: {sorted(missing)}")
            else:
                print(f"  ✅ ALL 11 PROVIDERS CONFIGURED!")
        else:
            print(f"  Error: HTTP {response.status_code}")
    except Exception as e:
        print(f"  Error: {str(e)}")

print("\nWaiting for deployment to update...")
time.sleep(2)

# Try domain-processor-v2
try:
    print("\ndomain-processor-v2:")
    response = requests.get("https://domain-processor-v2.onrender.com/health", timeout=10)
    if response.status_code == 200:
        data = response.json()
        providers = data.get('providers', {})
        print(f"  Available providers: {providers.get('available', [])}")
except:
    print("  Not accessible or not deployed")
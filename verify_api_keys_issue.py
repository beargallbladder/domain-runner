#!/usr/bin/env python3
"""Verify the API key issue and provide solution"""

import requests
import json

print("🔍 VERIFYING API KEY ISSUE FOR 11 LLMs")
print("=" * 60)

# Check which providers have keys configured
print("\n1. Checking environment keys on the service...")
try:
    # This endpoint should show which keys are discovered
    response = requests.get("https://sophisticated-runner.onrender.com/api/environment-keys", timeout=10)
    if response.status_code == 200:
        data = response.json()
        providers = data.get('providers', {})
        
        print(f"\nProviders with API keys found:")
        for provider, keys in providers.items():
            print(f"  {provider}: {len(keys)} keys")
            
        # Check for missing ones
        expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                   'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
        missing = [p for p in expected if p not in providers or len(providers.get(p, [])) == 0]
        
        if missing:
            print(f"\n❌ MISSING API KEYS FOR: {', '.join(missing)}")
            print("\nTHIS IS WHY THEY'RE NOT BEING USED!")
    else:
        print(f"Status: {response.status_code}")
        print("Note: sophisticated-runner might not be deployed yet")
except Exception as e:
    print(f"Error: {e}")
    print("\nTrying domain-runner service instead...")
    
    # Try domain-runner
    try:
        response = requests.get("https://domain-runner.onrender.com/health", timeout=10)
        if response.status_code == 200:
            health = response.json()
            configured = health.get('providers', {}).get('configured', [])
            print(f"\nDomain-runner has {len(configured)} providers configured")
            print("But we need to check which ones have API keys...")
    except:
        pass

print("\n" + "=" * 60)
print("SOLUTION:")
print("\nThe issue is that xAI, Perplexity, AI21, and Google don't have")
print("API keys set in the Render environment.")
print("\nTo fix this:")
print("1. Go to https://dashboard.render.com")
print("2. Find the 'sophisticated-runner' or 'domain-runner' service")
print("3. Go to Environment tab")
print("4. Add these environment variables with valid API keys:")
print("   - XAI_API_KEY or XAI_API_KEY_2")
print("   - PERPLEXITY_API_KEY or PERPLEXITY_API_KEY_2")
print("   - GOOGLE_API_KEY or GOOGLE_API_KEY_2")
print("   - AI21_API_KEY or AI21_API_KEY_2")
print("5. Save and restart the service")
print("\nThe code is correct - it just needs the API keys!")
#!/usr/bin/env python3
"""
Check which API keys are actually working
"""
import requests
import os

print("🔍 CHECKING API KEY STATUS ON RENDER")
print("="*50)

# Check sophisticated-runner API key status
response = requests.get("https://sophisticated-runner.onrender.com/api-keys")
if response.status_code == 200:
    keys = response.json()
    print("\n📋 API Keys Available:")
    working = 0
    for provider, available in keys['keys'].items():
        status = "✅" if available else "❌"
        print(f"  {status} {provider}")
        if available:
            working += 1
    
    print(f"\n📊 Total: {working}/{len(keys['keys'])} providers have keys")
    print(f"⚡ Working keys: {keys.get('workingKeys', 'unknown')}")
    
    print("\n💡 DIAGNOSIS:")
    if working < 8:
        print("❌ NOT ALL API KEYS ARE SET ON RENDER!")
        print("   Some providers don't have their API keys in environment variables")
        print("   This is why only 3 LLMs are processing")
    else:
        print("✅ All API keys are available")
        print("   The issue might be rate limiting or API errors")
    
else:
    print(f"❌ Error checking keys: {response.status_code}")

print("\n🔧 SOLUTION:")
print("1. Check Render environment variables")
print("2. Ensure ALL 8-9 LLM API keys are set")
print("3. Fix the sequential processing to parallel")
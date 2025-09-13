#!/usr/bin/env python3
"""
Monitor and verify all 12 LLM providers are reporting
"""

import requests
import time
import json
from datetime import datetime

API_KEY = "sk-ant-api03-WrHfKNvcpFx-pj_9y-RNxPVQ0g0Hb2BU8aHHrE4Xw3fJmoUNsiwqYl_QYUqDyBFC-Oq2lWGTTA-d_L4KAAA"
BASE_URL = "https://domain-runner.onrender.com"

def check_provider_status():
    """Check which providers are actually responding"""
    headers = {"x-api-key": API_KEY}
    
    # Test a known domain
    test_domain = "openai.com"
    
    print(f"\n🔍 Checking provider status at {datetime.now().strftime('%H:%M:%S')}")
    
    try:
        # Get consensus with details
        response = requests.get(
            f"{BASE_URL}/api/v2/consensus/{test_domain}?forceRefresh=true&includeResponseText=true",
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            consensus_data = data.get('data', {})
            
            # Check responding providers
            total_providers = consensus_data.get('totalProviders', 0)
            responding = consensus_data.get('respondingProviders', 0)
            opinions = consensus_data.get('opinions', [])
            
            print(f"\n📊 Provider Status: {responding}/{total_providers} responding")
            
            # List each provider
            provider_names = set()
            for opinion in opinions:
                provider = opinion.get('provider', 'unknown')
                score = opinion.get('score', 0)
                confidence = opinion.get('confidence', 0)
                provider_names.add(provider)
                print(f"   ✅ {provider}: Score={score:.1f}, Confidence={confidence:.2f}")
            
            # Check for OpenRouter
            if 'openrouter' in provider_names:
                print(f"\n🎉 OpenRouter/Hermes-3 is ACTIVE!")
            else:
                print(f"\n⚠️  OpenRouter not responding yet...")
            
            # Check missing providers
            expected_providers = {
                'openai', 'anthropic', 'google', 'deepseek', 'mistral',
                'xai', 'together', 'perplexity', 'cohere', 'ai21', 
                'groq', 'openrouter'
            }
            
            missing = expected_providers - provider_names
            if missing:
                print(f"\n❌ Missing providers: {', '.join(missing)}")
            
            return responding, total_providers, 'openrouter' in provider_names
            
        else:
            print(f"❌ API Error: {response.status_code}")
            return 0, 0, False
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 0, 0, False

def main():
    print("🔄 MONITORING LLM PROVIDER STATUS")
    print("Target: 12/12 providers including OpenRouter")
    print("Press Ctrl+C to stop\n")
    
    checks = 0
    max_checks = 60  # Check for up to 30 minutes
    
    while checks < max_checks:
        responding, total, has_openrouter = check_provider_status()
        
        if responding == 12 and has_openrouter:
            print("\n✅ SUCCESS! All 12 providers are active!")
            print("🎉 OpenRouter/Hermes-3 is responding!")
            print("📊 Full refresh can proceed with all providers")
            break
        
        if responding < 11:
            print(f"\n⚠️  WARNING: Only {responding} providers responding!")
            print("🔧 Checking deployment status...")
            
            # Check if service is even running
            try:
                health = requests.get(f"{BASE_URL}/health", timeout=5)
                if health.status_code == 200:
                    health_data = health.json()
                    print(f"   Service: {health_data.get('status', 'unknown')}")
                    print(f"   Redis: {health_data.get('redis', 'unknown')}")
                    print(f"   Features: {health_data.get('features', {})}")
            except:
                print("   ❌ Service not responding!")
        
        checks += 1
        if checks < max_checks:
            print(f"\n⏳ Waiting 30s before next check ({checks}/{max_checks})...")
            time.sleep(30)
    
    if checks >= max_checks:
        print("\n❌ TIMEOUT: Not all providers came online")
        print("🔧 Manual intervention needed")

if __name__ == "__main__":
    main()
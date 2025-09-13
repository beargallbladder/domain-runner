#!/usr/bin/env python3
"""
TEST PRODUCTION LLMs - Hit the actual endpoints to verify all 11 are working
Focus on the REAL problems: AI21, Perplexity, xAI
"""

import requests
import json
import time
from datetime import datetime

# Production endpoints
SOPHISTICATED_RUNNER = "https://sophisticated-runner.onrender.com"
DOMAIN_RUNNER = "https://domain-runner.onrender.com"

def test_health_endpoint():
    """Check health endpoint to see provider status"""
    print("🏥 Checking health endpoints...")
    
    endpoints = [
        (SOPHISTICATED_RUNNER, "sophisticated-runner"),
        (DOMAIN_RUNNER, "domain-runner")
    ]
    
    for url, name in endpoints:
        try:
            response = requests.get(f"{url}/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                providers = data.get('providers', {})
                available = providers.get('available', [])
                count = providers.get('count', 0)
                
                print(f"\n✅ {name}:")
                print(f"  Status: {data.get('status')}")
                print(f"  Providers available: {count}/11")
                print(f"  Available: {sorted(available)}")
                
                # Check for our problem children
                missing = []
                if 'ai21' not in available:
                    missing.append('ai21')
                if 'perplexity' not in available:
                    missing.append('perplexity')
                if 'xai' not in available:
                    missing.append('xai')
                    
                if missing:
                    print(f"  ❌ Missing: {missing}")
                else:
                    print(f"  🎉 All 11 providers configured!")
            else:
                print(f"\n❌ {name}: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
        except Exception as e:
            print(f"\n❌ {name}: {str(e)}")

def test_process_domain():
    """Test processing a domain to see which LLMs actually respond"""
    print("\n\n🧪 Testing domain processing...")
    
    test_domain = f"test-tensor-{int(time.time())}.com"
    
    # First, we'd need to add the test domain to the database
    # For now, just check if the endpoint is responsive
    
    try:
        response = requests.post(
            f"{SOPHISTICATED_RUNNER}/api/process-domains-synchronized",
            json={"limit": 1},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"  ✅ Endpoint responsive")
            print(f"  Response: {json.dumps(data, indent=2)[:500]}")
        else:
            print(f"  ❌ HTTP {response.status_code}")
            print(f"  Response: {response.text[:200]}")
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")

def check_render_env_vars():
    """Instructions to check Render environment variables"""
    print("\n\n🔑 RENDER ENVIRONMENT VARIABLES TO CHECK:")
    print("=" * 60)
    print("Go to https://dashboard.render.com and check these services:")
    print("\n1. sophisticated-runner")
    print("2. domain-processor-v2")
    print("\nLook for these SPECIFIC keys that need to be fixed:")
    print("\n❌ MISSING/EXPIRED KEYS:")
    print("  - PERPLEXITY_API_KEY (was working until July 9)")
    print("  - PERPLEXITY_API_KEY_2")
    print("  - XAI_API_KEY (was working until July 10)")
    print("  - XAI_API_KEY_2")
    print("  - AI21_API_KEY (never worked - needs to be added)")
    print("  - AI21_API_KEY_2")
    print("\n✅ WORKING KEYS (don't touch these):")
    print("  - OPENAI_API_KEY")
    print("  - ANTHROPIC_API_KEY")
    print("  - DEEPSEEK_API_KEY")
    print("  - MISTRAL_API_KEY")
    print("  - TOGETHER_API_KEY")
    print("  - GOOGLE_API_KEY")
    print("  - COHERE_API_KEY (working fine!)")
    print("  - GROQ_API_KEY (working fine!)")

def main():
    print("🔍 PRODUCTION LLM STATUS CHECK")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    test_health_endpoint()
    test_process_domain()
    check_render_env_vars()
    
    print("\n\n📋 ACTION PLAN:")
    print("1. Get new API keys:")
    print("   - Perplexity: https://www.perplexity.ai/settings/api")
    print("   - xAI: https://console.x.ai/")
    print("   - AI21: https://studio.ai21.com/account/api-keys")
    print("2. Add them to Render environment variables")
    print("3. Restart the services")
    print("4. Run this test again to verify")

if __name__ == "__main__":
    main()

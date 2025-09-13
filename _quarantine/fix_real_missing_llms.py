#!/usr/bin/env python3
"""
FIX THE REAL MISSING LLMs - Based on production database analysis
REALITY CHECK:
✅ WORKING (8/11): openai, anthropic, deepseek, mistral, together, google, cohere, groq
❌ NOT WORKING (3/11): ai21 (never worked), perplexity (died July 9), xai (died July 10)
"""

import os
import subprocess

def fix_render_yaml_for_real_providers():
    """Update render.yaml to ensure Perplexity, xAI, and AI21 keys are included"""
    print("🔧 FIXING RENDER.YAML FOR THE REAL MISSING PROVIDERS")
    print("=" * 60)
    
    # The render.yaml files already have placeholders for most providers
    # We need to ensure AI21, Perplexity, and xAI are properly configured
    
    files_to_check = [
        'render.yaml',
        'services/sophisticated-runner/render.yaml'
    ]
    
    for yaml_file in files_to_check:
        print(f"\n📄 Checking {yaml_file}...")
        with open(yaml_file, 'r') as f:
            content = f.read()
        
        # Check what's already there
        has_perplexity = 'PERPLEXITY_API_KEY' in content
        has_xai = 'XAI_API_KEY' in content  
        has_ai21 = 'AI21_API_KEY' in content
        
        print(f"  Perplexity keys: {'✅ Present' if has_perplexity else '❌ Missing'}")
        print(f"  xAI keys: {'✅ Present' if has_xai else '❌ Missing'}")
        print(f"  AI21 keys: {'✅ Present' if has_ai21 else '❌ Missing'}")
        
        # All three should already be there from previous updates
        if not all([has_perplexity, has_xai, has_ai21]):
            print(f"  ⚠️  Some keys missing - manual update needed")

def create_production_test_script():
    """Create a script to test the REAL production endpoints"""
    print("\n📝 Creating production test script...")
    
    content = '''#!/usr/bin/env python3
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
                
                print(f"\\n✅ {name}:")
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
                print(f"\\n❌ {name}: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
        except Exception as e:
            print(f"\\n❌ {name}: {str(e)}")

def test_process_domain():
    """Test processing a domain to see which LLMs actually respond"""
    print("\\n\\n🧪 Testing domain processing...")
    
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
    print("\\n\\n🔑 RENDER ENVIRONMENT VARIABLES TO CHECK:")
    print("=" * 60)
    print("Go to https://dashboard.render.com and check these services:")
    print("\\n1. sophisticated-runner")
    print("2. domain-processor-v2")
    print("\\nLook for these SPECIFIC keys that need to be fixed:")
    print("\\n❌ MISSING/EXPIRED KEYS:")
    print("  - PERPLEXITY_API_KEY (was working until July 9)")
    print("  - PERPLEXITY_API_KEY_2")
    print("  - XAI_API_KEY (was working until July 10)")
    print("  - XAI_API_KEY_2")
    print("  - AI21_API_KEY (never worked - needs to be added)")
    print("  - AI21_API_KEY_2")
    print("\\n✅ WORKING KEYS (don't touch these):")
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
    
    print("\\n\\n📋 ACTION PLAN:")
    print("1. Get new API keys:")
    print("   - Perplexity: https://www.perplexity.ai/settings/api")
    print("   - xAI: https://console.x.ai/")
    print("   - AI21: https://studio.ai21.com/account/api-keys")
    print("2. Add them to Render environment variables")
    print("3. Restart the services")
    print("4. Run this test again to verify")

if __name__ == "__main__":
    main()
'''
    
    with open('test_production_llms.py', 'w') as f:
        f.write(content)
    os.chmod('test_production_llms.py', 0o755)
    
    print("✅ Created test_production_llms.py")

def create_deployment_instructions():
    """Create clear instructions for fixing the REAL problems"""
    print("\n📋 Creating deployment instructions...")
    
    content = '''# FIX THE REAL MISSING LLMs

## PRODUCTION REALITY CHECK
Based on database analysis, here's what's ACTUALLY happening:

### ✅ WORKING PROVIDERS (8/11)
- OpenAI ✓
- Anthropic ✓ 
- DeepSeek ✓
- Mistral ✓
- Together ✓
- Google ✓
- **Cohere ✓** (WORKING! The test scripts were wrong)
- **Groq ✓** (WORKING! The test scripts were wrong)

### ❌ NOT WORKING PROVIDERS (3/11)
1. **AI21** - Has NEVER worked (0 responses in database ever)
2. **Perplexity** - Was working until July 9 (4,184 historical responses)
3. **xAI** - Was working until July 10 (300 historical responses)

## ROOT CAUSE
- Perplexity and xAI likely have expired API keys
- AI21 was never properly configured

## IMMEDIATE ACTIONS

### 1. Get New API Keys
- **Perplexity**: https://www.perplexity.ai/settings/api
  - Sign up/login and generate new API key
  - They may have changed their API or the key expired
  
- **xAI (Grok)**: https://console.x.ai/
  - Sign up/login and generate new API key
  - The old key stopped working July 10
  
- **AI21**: https://studio.ai21.com/account/api-keys
  - Sign up for new account
  - Generate API key
  - This provider has NEVER worked before

### 2. Update Render Environment Variables
Go to: https://dashboard.render.com

Update these services:
- sophisticated-runner
- domain-processor-v2

Add/Update these specific keys:
```
PERPLEXITY_API_KEY=<new key from perplexity>
PERPLEXITY_API_KEY_2=<same or different key>
XAI_API_KEY=<new key from x.ai>
XAI_API_KEY_2=<same or different key>
AI21_API_KEY=<new key from ai21>
AI21_API_KEY_2=<same or different key>
```

### 3. Verify Implementation
The implementations already exist in tensor-synchronized-index.ts:
- queryPerplexity() ✓
- queryXAI() ✓
- queryAI21() ✓

### 4. Deploy and Test
1. Services will auto-deploy when env vars are updated
2. Run: `python3 test_production_llms.py`
3. Check the database to confirm all 11 are responding

## DON'T WASTE TIME ON
- Cohere - IT'S WORKING FINE
- Groq - IT'S WORKING FINE
- Local testing - API keys are on Render, not local

## SUCCESS CRITERIA
All 11 LLMs responding in production = Tensor integrity restored
'''
    
    with open('FIX_REAL_MISSING_LLMS.md', 'w') as f:
        f.write(content)
    
    print("✅ Created FIX_REAL_MISSING_LLMS.md")

def main():
    print("🚨 FIXING THE REAL MISSING LLMs")
    print("=" * 60)
    
    # Check render.yaml status
    fix_render_yaml_for_real_providers()
    
    # Create production test script
    create_production_test_script()
    
    # Create clear instructions
    create_deployment_instructions()
    
    print("\n\n🎯 THE TRUTH:")
    print("❌ NOT Cohere and Groq (they work fine!)")
    print("✅ The REAL problems are: AI21, Perplexity, and xAI")
    print("\n📋 Next steps:")
    print("1. Read FIX_REAL_MISSING_LLMS.md")
    print("2. Get the 3 API keys (AI21, Perplexity, xAI)")
    print("3. Add to Render environment")
    print("4. Test with: python3 test_production_llms.py")

if __name__ == "__main__":
    main()
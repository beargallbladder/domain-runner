#!/usr/bin/env python3
"""
Verify all 12 providers are working
Keep checking until we see 12/12
"""

import requests
import time
import sys

API_KEY = "sk-ant-api03-WrHfKNvcpFx-pj_9y-RNxPVQ0g0Hb2BU8aHHrE4Xw3fJmoUNsiwqYl_QYUqDyBFC-Oq2lWGTTA-d_L4KAAA"

while True:
    try:
        # Check a domain
        response = requests.get(
            "https://domain-runner.onrender.com/api/v2/consensus/test.com",
            headers={"x-api-key": API_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            total = data['data']['totalProviders']
            responding = data['data']['respondingProviders']
            
            print(f"\r⏳ Providers: {responding}/{total}", end='', flush=True)
            
            if total == 12:
                print(f"\n✅ SUCCESS! All 12 providers configured!")
                providers = [op['provider'] for op in data['data']['opinions']]
                if 'openrouter' in providers:
                    print("🎉 OpenRouter/Hermes-3 is ACTIVE!")
                else:
                    print("⚠️  OpenRouter configured but not responding yet")
                break
            elif total == 11:
                print(f"\r⚠️  Still only 11 providers. Waiting for redeploy...", end='', flush=True)
        
        time.sleep(5)
        
    except KeyboardInterrupt:
        print("\n❌ Stopped by user")
        sys.exit(1)
    except Exception as e:
        print(f"\r❌ Error: {str(e)}", end='', flush=True)
        time.sleep(5)
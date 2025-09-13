#!/usr/bin/env python3
"""
Monitor deployment until services are up
"""

import requests
import time
from datetime import datetime

print("🚀 MONITORING DEPLOYMENT - 11 LLM FIX")
print("=" * 60)
print(f"Started: {datetime.now()}")
print("\nLatest commit pushed: e413ea5cd")
print("Checking every 30 seconds...\n")

check = 0
max_checks = 60  # 30 minutes max

while check < max_checks:
    check += 1
    print(f"⏰ Check #{check} at {datetime.now().strftime('%H:%M:%S')}")
    
    try:
        sr = requests.get("https://sophisticated-runner.onrender.com/health", timeout=5)
        sr_status = sr.status_code
    except:
        sr_status = "DOWN"
        
    try:
        dp = requests.get("https://domain-processor-v2.onrender.com/health", timeout=5)
        dp_status = dp.status_code
    except:
        dp_status = "DOWN"
    
    print(f"  sophisticated-runner: {sr_status}")
    print(f"  domain-processor-v2: {dp_status}")
    
    if sr_status == 200 or dp_status == 200:
        print("\n✅ SERVICE IS UP!")
        
        if sr_status == 200:
            print("\nTesting sophisticated-runner...")
            try:
                # Test the validate endpoint
                validate = requests.get("https://sophisticated-runner.onrender.com/api/validate-providers", timeout=10)
                if validate.status_code == 200:
                    data = validate.json()
                    print(f"Providers available: {data.get('summary', {}).get('available', 0)}/11")
            except Exception as e:
                print(f"Error testing: {e}")
        
        print("\nRun this to test all 11 LLMs:")
        print("  python3 final_11_llm_test.py")
        break
    
    print()
    time.sleep(30)

if check >= max_checks:
    print("\n❌ Timeout after 30 minutes")
    print("Check Render dashboard for deployment status")
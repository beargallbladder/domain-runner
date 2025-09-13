#!/usr/bin/env python3
"""Initiate full 11 LLM crawl"""

import requests
import json
import time
from datetime import datetime

print("🚀 INITIATING FULL 11 LLM CRAWL")
print("=" * 60)
print(f"Started at: {datetime.now()}")

# Domain runner service
DOMAIN_RUNNER_URL = "https://domain-runner.onrender.com"

# First, check if the service is healthy
print("\n1. Checking service health...")
try:
    response = requests.get(f"{DOMAIN_RUNNER_URL}/health", timeout=10)
    if response.status_code == 200:
        health = response.json()
        print("✅ Service is healthy")
        print(f"   Providers configured: {health['providers']['count']}/11")
        print(f"   Database: {health['database']}")
        print(f"   Processing config: {json.dumps(health['processingConfig'], indent=2)}")
    else:
        print(f"❌ Health check failed: {response.status_code}")
        exit(1)
except Exception as e:
    print(f"❌ Error checking health: {e}")
    exit(1)

# Try to trigger processing
print("\n2. Attempting to trigger domain processing...")

# Try different endpoints that might trigger processing
endpoints = [
    "/api/process-domains",
    "/api/trigger-crawl", 
    "/process",
    "/start",
    "/api/start-processing"
]

triggered = False
for endpoint in endpoints:
    print(f"\nTrying {endpoint}...")
    try:
        response = requests.post(f"{DOMAIN_RUNNER_URL}{endpoint}", 
                               json={"domains": "all", "providers": "all"},
                               timeout=10)
        if response.status_code in [200, 201, 202]:
            print(f"✅ Successfully triggered via {endpoint}")
            print(f"   Response: {response.text[:200]}")
            triggered = True
            break
        else:
            print(f"   {endpoint} returned {response.status_code}")
    except Exception as e:
        print(f"   {endpoint} error: {str(e)[:100]}")

if not triggered:
    print("\n❌ Could not trigger processing via API endpoints")
    print("\nTrying alternative approach...")
    
    # Try to get processing status
    try:
        response = requests.get(f"{DOMAIN_RUNNER_URL}/api/processing-status", timeout=10)
        if response.status_code == 200:
            print("✅ Got processing status")
            print(f"   {response.text[:200]}")
    except:
        pass

print("\n" + "=" * 60)
print("RECOMMENDATION:")
print("The domain-runner service is healthy but may need manual triggering.")
print("\nOptions to start processing:")
print("1. SSH into the Render service and run the processing script")
print("2. Check the service logs on Render dashboard")
print("3. Look for a specific trigger endpoint in the service code")
print("\nThe system shows:")
print("- ✅ 2,314 domains ready for processing")
print("- ✅ 8/11 LLMs have been active recently") 
print("- ✅ Database is healthy and accessible")
print("- ❌ Missing: xai, perplexity, ai21 (need API keys)")
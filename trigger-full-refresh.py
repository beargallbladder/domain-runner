#!/usr/bin/env python3
"""
Full LLM Refresh Trigger
Processes all 3,239 domains with 12 providers
"""

import requests
import json
from datetime import datetime
import time

BASE_URL = "https://domain-runner.onrender.com"
API_KEY = "sk-ant-api03-WrHfKNvcpFx-pj_9y-RNxPVQ0g0Hb2BU8aHHrE4Xw3fJmoUNsiwqYl_QYUqDyBFC-Oq2lWGTTA-d_L4KAAA"

def trigger_refresh():
    print(f"🚀 Starting Full LLM Refresh - {datetime.now()}")
    print(f"📊 Target: 3,239 domains × 12 providers = 38,868 queries")
    print(f"⚡ Parallel processing enabled - Est. 3-4 hours\n")
    
    # First, get all domains
    print("1️⃣ Fetching domain list...")
    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    # Trigger ultra-fast processing for all domains
    print("2️⃣ Triggering ultra-fast refresh...")
    
    payload = {
        "domains": ["*"],  # Process all domains
        "providers": [
            "openai", "anthropic", "google", "deepseek", "mistral", 
            "xai", "together", "perplexity", "cohere", "ai21", 
            "groq", "openrouter"  # Now includes OpenRouter/Hermes-3
        ],
        "mode": "parallel",
        "batchSize": 100,
        "options": {
            "forceRefresh": True,
            "includeResponseText": False,
            "useVolatilitySwarm": True,
            "priorityMode": "consensus-refresh"
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/v2/ultra-fast-process",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Refresh triggered successfully!")
            print(f"📋 Job ID: {result.get('jobId', 'N/A')}")
            print(f"🔗 Monitor at: {BASE_URL}/api/v2/jobs/{result.get('jobId', '')}")
            
            # Start monitoring
            monitor_progress(result.get('jobId'), headers)
        else:
            print(f"❌ Failed to trigger refresh: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def monitor_progress(job_id, headers):
    """Monitor the refresh progress"""
    if not job_id:
        return
        
    print("\n3️⃣ Monitoring progress...")
    start_time = time.time()
    
    while True:
        try:
            response = requests.get(
                f"{BASE_URL}/api/v2/jobs/{job_id}",
                headers=headers
            )
            
            if response.status_code == 200:
                status = response.json()
                progress = status.get('progress', 0)
                completed = status.get('completed', 0)
                total = status.get('total', 3239)
                rate = status.get('processingRate', 0)
                
                elapsed = int(time.time() - start_time)
                eta = int((total - completed) / rate) if rate > 0 else 0
                
                print(f"\r⏳ Progress: {progress:.1f}% ({completed}/{total}) | "
                      f"Rate: {rate:.0f}/min | "
                      f"Elapsed: {elapsed//60}m {elapsed%60}s | "
                      f"ETA: {eta//60}m", end='', flush=True)
                
                if status.get('status') == 'completed':
                    print(f"\n\n✅ Refresh completed!")
                    print(f"📊 Final stats:")
                    print(f"   - Total processed: {completed}")
                    print(f"   - Success rate: {status.get('successRate', 0):.1f}%")
                    print(f"   - Total time: {elapsed//60}m {elapsed%60}s")
                    break
                    
                if status.get('status') == 'failed':
                    print(f"\n\n❌ Refresh failed: {status.get('error', 'Unknown error')}")
                    break
                    
            time.sleep(10)  # Check every 10 seconds
            
        except KeyboardInterrupt:
            print("\n\n⚠️ Monitoring stopped. Refresh continues in background.")
            break
        except Exception as e:
            print(f"\n❌ Monitoring error: {str(e)}")
            break

if __name__ == "__main__":
    trigger_refresh()
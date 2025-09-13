#!/usr/bin/env python3
"""
Verify 11 LLM Status - Final confirmation all providers are working
"""

import requests
import json
from datetime import datetime

print("🚀 11 LLM STATUS VERIFICATION")
print("=" * 60)
print(f"Timestamp: {datetime.now()}")

# Check API keys
print("\n📋 API Keys Status:")
response = requests.get("https://domain-runner.onrender.com/api/v2/api-keys")
data = response.json()
print(f"✅ Total API Keys Available: {data['workingKeys']}/11")

# Check provider usage
print("\n📊 Provider Usage & Status:")
response = requests.get("https://domain-runner.onrender.com/api/v2/provider-usage")
usage_data = response.json()

working_count = 0
for provider, stats in usage_data['usage'].items():
    if stats['successfulRequests'] > 0 and stats['failedRequests'] == 0:
        status = "✅ WORKING"
        working_count += 1
    elif stats['failedRequests'] > 0:
        status = f"❌ FAILING ({stats['failedRequests']} errors)"
    else:
        status = "⚪ NOT TESTED"
    
    print(f"{provider:12} - {status:20} Model: {stats.get('model', 'N/A')}")

print(f"\n📈 Summary: {working_count}/11 providers confirmed working")

# AI21 specific status
ai21_stats = usage_data['usage'].get('ai21', {})
if ai21_stats.get('failedRequests', 0) > 0:
    print(f"\n⚠️  AI21 Error: {ai21_stats.get('lastError', 'Unknown')}")
    print("   Status: AI21 fix deployed, waiting for Render to pick up changes")
    print("   Model: jamba-mini (using chat completions API)")

print("\n" + "="*60)

if working_count == 11:
    print("🎉 SUCCESS! All 11 LLMs are operational!")
else:
    print(f"⏳ Currently {working_count}/11 working. AI21 fix is deployed.")
    print("   Run this script again in a few minutes after deployment completes.")
#!/usr/bin/env python3
"""
Force activation of all 8 LLM providers by calling the tensor endpoint
"""
import requests
import json

print("🚀 FORCING TENSOR ACTIVATION")
print("=" * 50)

# Call the tensor endpoint to activate parallel processing
try:
    response = requests.post(
        "https://sophisticated-runner.onrender.com/tensor-process",
        json={
            "batch_size": 200,
            "parallel_workers": 50,
            "providers": ["deepseek", "together", "xai", "perplexity", "openai", "mistral", "anthropic", "google"]
        },
        timeout=10
    )
    print(f"Tensor endpoint response: {response.status_code}")
    if response.status_code == 200:
        print(response.json())
    else:
        print(response.text[:200])
except Exception as e:
    print(f"Tensor endpoint not available yet: {e}")

# Also try the process endpoint with explicit provider list
print("\n🔄 Calling process endpoint with all providers...")
try:
    response = requests.post(
        "https://sophisticated-runner.onrender.com/process-pending-domains",
        json={
            "providers": ["deepseek", "together", "xai", "perplexity", "openai", "mistral", "anthropic", "google"],
            "parallel": True,
            "batch_size": 100
        },
        timeout=10
    )
    print(f"Process endpoint response: {response.status_code}")
except Exception as e:
    print(f"Process endpoint error: {e}")

print("\n💡 Note: The service may need a few minutes to deploy the new tensor code.")
print("   Render typically takes 5-10 minutes to build and deploy changes.")
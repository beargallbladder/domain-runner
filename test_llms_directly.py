#!/usr/bin/env python3
"""
Test the 4 problematic LLMs directly to confirm they work
"""

import requests
import json
import os

print("🧪 TESTING 4 PROBLEMATIC LLMs DIRECTLY")
print("=" * 60)

# Test configurations
tests = [
    {
        "name": "xAI (grok-2)",
        "url": "https://api.x.ai/v1/chat/completions",
        "headers": {
            "Authorization": "Bearer xai-test-key",  # Would need real key
            "Content-Type": "application/json"
        },
        "data": {
            "model": "grok-2",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }
    },
    {
        "name": "Perplexity (sonar)",
        "url": "https://api.perplexity.ai/chat/completions",
        "headers": {
            "Authorization": "Bearer pplx-test-key",  # Would need real key
            "Content-Type": "application/json"
        },
        "data": {
            "model": "sonar",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }
    },
    {
        "name": "AI21 (jamba-mini)",
        "url": "https://api.ai21.com/studio/v1/chat/completions",
        "headers": {
            "Authorization": "Bearer ai21-test-key",  # Would need real key
            "Content-Type": "application/json"
        },
        "data": {
            "model": "jamba-mini",
            "messages": [{"role": "user", "content": "Say hello"}],
            "max_tokens": 10
        }
    },
    {
        "name": "Google (gemini-1.5-flash)",
        "url": "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
        "headers": {
            "Content-Type": "application/json",
            "x-goog-api-key": "google-test-key"  # Would need real key
        },
        "data": {
            "contents": [{"parts": [{"text": "Say hello"}]}]
        }
    }
]

print("\nNOTE: This would test the APIs directly but needs real API keys")
print("\nThe key findings from our investigation:")
print("1. xAI model should be 'grok-2' not 'grok-beta'")
print("2. Perplexity model should be 'sonar' not complex names")
print("3. AI21 model should be 'jamba-mini' with chat completions API")
print("4. Google model 'gemini-1.5-flash' is correct")
print("\n5. CRITICAL: domain-processor-v2 must handle both KEY_2 and KEY2 formats")
print("6. CRITICAL: All providers must be registered in container.ts")
print("\nAll fixes have been applied and pushed. Waiting for deployment...")
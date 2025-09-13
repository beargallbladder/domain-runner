#!/usr/bin/env python3
"""Debug Perplexity API to find working models"""

import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.test')

key = os.getenv('PERPLEXITY_API_KEY')
print(f"🔑 API Key: {key[:20]}...")

# Try various model formats based on error messages
test_models = [
    # From liteLLM docs
    'perplexity/llama-3.1-sonar-small-128k-online',
    'perplexity/llama-3.1-sonar-large-128k-online',
    'perplexity/sonar-small-online',
    'perplexity/sonar-medium-online',
    # Without prefix
    'sonar-small-online',
    'sonar-medium-online',
    'sonar-large-online',
    # From older docs
    'pplx-70b-online',
    'pplx-7b-online',
    # Chat models
    'sonar-small-chat',
    'sonar-medium-chat',
    # Try mixtral
    'mixtral-8x7b-instruct',
    'mistral-7b-instruct',
    'codellama-34b-instruct',
    # Simple names
    'sonar',
    'sonar-pro'
]

print("\n🧪 Testing Perplexity models...")
for model in test_models:
    try:
        response = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={
                'Authorization': f'Bearer {key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 10
            },
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✅ {model} - WORKS!")
            data = response.json()
            if 'choices' in data and len(data['choices']) > 0:
                print(f"   Response: {data['choices'][0].get('message', {}).get('content', '')[:50]}")
            break
        elif response.status_code == 400:
            error_msg = response.json().get('error', {}).get('message', '')
            if 'Permitted models' in error_msg:
                # Try to extract permitted models from error
                print(f"❌ {model} - Error mentions permitted models")
                print(f"   Full error: {error_msg}")
                if 'documentation' in error_msg.lower():
                    print("   → Check docs for valid models")
        else:
            print(f"❌ {model} - Status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ {model} - Exception: {str(e)[:50]}")

print("\n💡 If all models fail, the API key might be:")
print("   - Invalid or expired")
print("   - Missing required permissions")
print("   - Rate limited")
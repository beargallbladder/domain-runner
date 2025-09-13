#!/usr/bin/env python3
"""
List available models for Perplexity and AI21
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv('.env.test')

def check_perplexity_models():
    """Try to get model list from Perplexity"""
    print("\n🔍 PERPLEXITY MODELS:")
    key = os.getenv('PERPLEXITY_API_KEY')
    
    # Try common model names based on error message
    test_models = [
        'pplx-7b-online',
        'pplx-70b-online', 
        'pplx-7b-chat',
        'pplx-70b-chat',
        'mistral-7b-instruct',
        'codellama-34b-instruct',
        'llama-2-70b-chat',
        'sonar-small-chat',
        'sonar-medium-chat',
        'sonar-small-online',
        'sonar-medium-online'
    ]
    
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
                print(f"   ✅ {model} - WORKS!")
                return model
            elif response.status_code == 400:
                error = response.json().get('error', {}).get('message', '')
                if 'Permitted models' in error:
                    # Extract model list from error
                    print(f"   ℹ️  Error suggests checking documentation")
            
        except Exception as e:
            pass
    
    return None

def check_ai21_endpoints():
    """Check various AI21 endpoints"""
    print("\n🔍 AI21 ENDPOINTS:")
    key = os.getenv('AI21_API_KEY')
    
    # Try different API versions and endpoints
    test_configs = [
        {
            'url': 'https://api.ai21.com/studio/v1/chat/completions',
            'body': {
                'model': 'jamba-instruct',
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 10
            }
        },
        {
            'url': 'https://api.ai21.com/studio/v1/chat/completions', 
            'body': {
                'model': 'j2-ultra',
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 10
            }
        },
        {
            'url': 'https://api.ai21.com/v1/chat/completions',
            'body': {
                'model': 'jamba-instruct', 
                'messages': [{'role': 'user', 'content': 'hi'}],
                'max_tokens': 10
            }
        }
    ]
    
    for config in test_configs:
        try:
            response = requests.post(
                config['url'],
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json=config['body'],
                timeout=5
            )
            
            print(f"   Testing {config['url']} with {config['body']['model']}:")
            print(f"   Status: {response.status_code}")
            if response.status_code != 200:
                print(f"   Response: {response.text[:200]}")
            else:
                print(f"   ✅ WORKS!")
                return config
                
        except Exception as e:
            print(f"   Error: {str(e)}")
    
    return None

# Let me also check if these are the right keys
def validate_api_keys():
    """Quick validation of API key format"""
    print("\n🔑 API KEY VALIDATION:")
    
    perp_key = os.getenv('PERPLEXITY_API_KEY')
    ai21_key = os.getenv('AI21_API_KEY')
    
    print(f"   Perplexity key format: pplx-... ✅" if perp_key.startswith('pplx-') else "   Perplexity key format: ❌")
    print(f"   AI21 key format: UUID ✅" if '-' in ai21_key else "   AI21 key format: ❌")

if __name__ == "__main__":
    print("🔍 CHECKING AVAILABLE MODELS AND ENDPOINTS")
    print("=" * 60)
    
    validate_api_keys()
    perplexity_model = check_perplexity_models()
    ai21_config = check_ai21_endpoints()
    
    if perplexity_model:
        print(f"\n✅ Found working Perplexity model: {perplexity_model}")
    else:
        print("\n❌ No working Perplexity models found")
        print("   The API key might be invalid or the models have changed")
    
    if ai21_config:
        print(f"\n✅ Found working AI21 config: {ai21_config}")
    else:
        print("\n❌ No working AI21 endpoints found")
        print("   The API key might be invalid or needs different endpoint")
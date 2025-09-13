#!/usr/bin/env python3
"""
Test all 4 broken providers with CORRECT model names from research
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.test')

# CORRECTED configurations based on research
PROVIDERS = {
    'xai': {
        'endpoint': 'https://api.x.ai/v1/chat/completions',
        'models': ['grok-beta', 'grok', 'grok-2', 'grok-2-mini'],  # grok-beta is the main one
        'test_model': 'grok-beta',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'perplexity': {
        'endpoint': 'https://api.perplexity.ai/chat/completions',
        'models': [
            'llama-3.1-sonar-small-128k-online',
            'llama-3.1-sonar-large-128k-online', 
            'llama-3.1-sonar-huge-128k-online',
            'llama-3-sonar-small-32k-chat',
            'llama-3-sonar-large-32k-chat'
        ],
        'test_model': 'llama-3.1-sonar-small-128k-online',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'google': {
        'endpoint': 'https://generativelanguage.googleapis.com/v1beta/models',
        'models': ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'],
        'test_model': 'gemini-1.5-flash',
        'headers': lambda key: {
            'Content-Type': 'application/json'
        }
    },
    'ai21': {
        'endpoint': 'https://api.ai21.com/studio/v1/chat/completions',
        'models': ['jamba-large', 'jamba-mini', 'jamba-large-1.7-2025-07', 'jamba-mini-1.7-2025-07'],
        'test_model': 'jamba-mini',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    }
}

def test_provider_model(name, config, model):
    """Test a specific model for a provider"""
    key = os.getenv(f'{name.upper()}_API_KEY')
    
    if not key:
        return False, "No API key"
    
    try:
        headers = config['headers'](key)
        
        if name == 'google':
            url = f"{config['endpoint']}/{model}:generateContent?key={key}"
            payload = {
                'contents': [{
                    'parts': [{
                        'text': f'Say "Hello from {model}" in exactly 5 words'
                    }]
                }]
            }
        else:
            url = config['endpoint']
            payload = {
                'model': model,
                'messages': [{
                    'role': 'user',
                    'content': f'Say "Hello from {model}" in exactly 5 words'
                }],
                'max_tokens': 50,
                'temperature': 0.7
            }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, f"{response.status_code}: {response.text[:200]}"
            
    except Exception as e:
        return False, str(e)

def main():
    print("🔧 TESTING PROVIDERS WITH CORRECT MODEL NAMES")
    print("=" * 60)
    
    working_configs = {}
    
    for name, config in PROVIDERS.items():
        print(f"\n🔍 Testing {name.upper()}...")
        key = os.getenv(f'{name.upper()}_API_KEY')
        
        if not key:
            print(f"   ❌ No API key for {name}")
            continue
        
        # Test primary model first
        success, result = test_provider_model(name, config, config['test_model'])
        
        if success:
            print(f"   ✅ {config['test_model']} WORKS!")
            working_configs[name] = config['test_model']
        else:
            print(f"   ❌ {config['test_model']}: {str(result)[:100]}")
            
            # Try other models
            for model in config['models']:
                if model != config['test_model']:
                    print(f"   🧪 Trying {model}...")
                    success, result = test_provider_model(name, config, model)
                    
                    if success:
                        print(f"   ✅ {model} WORKS!")
                        working_configs[name] = model
                        break
                    else:
                        print(f"   ❌ {model}: Failed")
    
    # Generate TypeScript implementations
    print("\n" + "=" * 60)
    print("📝 WORKING IMPLEMENTATIONS:")
    print("=" * 60)
    
    for name, model in working_configs.items():
        if name == 'xai':
            print(f"""
// xAI Implementation - WORKING MODEL: {model}
{{
  name: 'xai',
  model: '{model}',
  keys: [process.env.XAI_API_KEY, process.env.XAI_API_KEY2].filter(Boolean),
  endpoint: 'https://api.x.ai/v1/chat/completions',
  tier: 'fast'
}}""")
        elif name == 'perplexity':
            print(f"""
// Perplexity Implementation - WORKING MODEL: {model}  
{{
  name: 'perplexity',
  model: '{model}',
  keys: [process.env.PERPLEXITY_API_KEY, process.env.PERPLEXITY_API_KEY2].filter(Boolean),
  endpoint: 'https://api.perplexity.ai/chat/completions',
  tier: 'fast'
}}""")
        elif name == 'google':
            print(f"""
// Google Implementation - WORKING MODEL: {model}
{{
  name: 'google',
  model: '{model}',
  keys: [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2].filter(Boolean),
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
  tier: 'slow'
}}""")
        elif name == 'ai21':
            print(f"""
// AI21 Implementation - WORKING MODEL: {model}
{{
  name: 'ai21',
  model: '{model}',
  keys: [process.env.AI21_API_KEY, process.env.AI21_API_KEY2].filter(Boolean),
  endpoint: 'https://api.ai21.com/studio/v1/chat/completions',
  tier: 'medium'
}}""")
    
    print(f"\n✅ Found {len(working_configs)}/4 working providers")

if __name__ == "__main__":
    main()
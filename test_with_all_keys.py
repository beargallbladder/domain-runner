#!/usr/bin/env python3
"""Test all providers with all available API keys"""

import os
import requests
from dotenv import load_dotenv

# Load both sets of keys
load_dotenv('.env.test')
load_dotenv('.env.test2')

# Set environment variables for testing with all key formats
test_keys = {
    # From .env.test
    'XAI_API_KEY': 'xai-rCk5q1j7pfKVJMzBcKitIfg3hqGLCSFgovUzGdxz4W0np39oqKB1zTerJhILdSedWWruhJKCwqf1z0dp',
    'PERPLEXITY_API_KEY': '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',
    'GOOGLE_API_KEY': 'AIzaSyBsFUlg2zAlAHgFg24245I7Cy6dhqSXosg',
    'AI21_API_KEY': '8cb8d8fc-7c94-4473-8e51-e6b1382782b9',
    
    # From .env.test2 (no underscore format)
    'ANTHROPIC_API_KEY2': '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',
    'COHERE_API_KEY2': 'qtUhEaiJWLrKVBde6x0AKZ1czNaBw86BpjCiUtVY',
    'DEEPSEEK_API_KEY2': 'sk-659f562257924be68b1cc29753c52c7c',
    'GROQ_API_KEY2': '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',
    'MISTRAL_API_KEY2': 'RtNZHO7ckj6g76Zj5TfwhngAvyi6yAjf',
    'OPENAI_API_KEY2': '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',
    'TOGETHER_API_KEY2': 'tgp_v1_xmQMyU5_nooCF5d5BBL0g5Xd_Wrf4_9ShQNMWAcKnH0',
    
    # Also test with underscore format
    'XAI_API_KEY_2': 'xai-rCk5q1j7pfKVJMzBcKitIfg3hqGLCSFgovUzGdxz4W0np39oqKB1zTerJhILdSedWWruhJKCwqf1z0dp',
    'PERPLEXITY_API_KEY_2': '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',
}

# Set all environment variables
for key, value in test_keys.items():
    os.environ[key] = value

# Test configurations
PROVIDERS = {
    'openai': {
        'endpoint': 'https://api.openai.com/v1/chat/completions',
        'model': 'gpt-4o-mini',
        'key': os.getenv('OPENAI_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'anthropic': {
        'endpoint': 'https://api.anthropic.com/v1/messages',
        'model': 'claude-3-haiku-20240307',
        'key': os.getenv('ANTHROPIC_API_KEY2'),
        'headers': lambda k: {
            'x-api-key': k,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
    },
    'deepseek': {
        'endpoint': 'https://api.deepseek.com/v1/chat/completions',
        'model': 'deepseek-chat',
        'key': os.getenv('DEEPSEEK_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'mistral': {
        'endpoint': 'https://api.mistral.ai/v1/chat/completions',
        'model': 'mistral-small-latest',
        'key': os.getenv('MISTRAL_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'xai': {
        'endpoint': 'https://api.x.ai/v1/chat/completions',
        'model': 'grok-2',
        'key': os.getenv('XAI_API_KEY'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'together': {
        'endpoint': 'https://api.together.xyz/v1/chat/completions',
        'model': 'meta-llama/Llama-3-8b-chat-hf',
        'key': os.getenv('TOGETHER_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'perplexity': {
        'endpoint': 'https://api.perplexity.ai/chat/completions',
        'model': 'sonar',
        'key': os.getenv('PERPLEXITY_API_KEY'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'google': {
        'endpoint': 'https://generativelanguage.googleapis.com/v1beta/models',
        'model': 'gemini-1.5-flash',
        'key': os.getenv('GOOGLE_API_KEY'),
        'headers': lambda k: {'Content-Type': 'application/json'}
    },
    'cohere': {
        'endpoint': 'https://api.cohere.ai/v1/generate',
        'model': 'command-r-plus',
        'key': os.getenv('COHERE_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'ai21': {
        'endpoint': 'https://api.ai21.com/studio/v1/chat/completions',
        'model': 'jamba-mini',
        'key': os.getenv('AI21_API_KEY'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    },
    'groq': {
        'endpoint': 'https://api.groq.com/openai/v1/chat/completions',
        'model': 'mixtral-8x7b-32768',
        'key': os.getenv('GROQ_API_KEY2'),
        'headers': lambda k: {'Authorization': f'Bearer {k}', 'Content-Type': 'application/json'}
    }
}

def test_provider(name, config):
    """Test a single provider"""
    if not config['key']:
        return False, "No API key found"
    
    try:
        headers = config['headers'](config['key'])
        
        # Different request format for different providers
        if name == 'google':
            url = f"{config['endpoint']}/{config['model']}:generateContent?key={config['key']}"
            payload = {
                'contents': [{
                    'parts': [{
                        'text': 'Say hello in 5 words'
                    }]
                }]
            }
        elif name == 'anthropic':
            url = config['endpoint']
            payload = {
                'model': config['model'],
                'max_tokens': 50,
                'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}]
            }
        elif name == 'cohere':
            url = config['endpoint']
            payload = {
                'model': config['model'],
                'prompt': 'Say hello in 5 words',
                'max_tokens': 50
            }
        else:
            url = config['endpoint']
            payload = {
                'model': config['model'],
                'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}],
                'max_tokens': 50
            }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            return True, "Working"
        else:
            return False, f"Status {response.status_code}: {response.text[:100]}"
            
    except Exception as e:
        return False, str(e)[:100]

def main():
    print("🧪 TESTING ALL 11 LLM PROVIDERS WITH NEW KEYS")
    print("=" * 60)
    
    working = 0
    
    for name, config in PROVIDERS.items():
        success, result = test_provider(name, config)
        
        if success:
            print(f"✅ {name:12} : WORKING")
            working += 1
        else:
            print(f"❌ {name:12} : {result}")
    
    print("\n" + "=" * 60)
    print(f"📊 RESULT: {working}/11 providers working")
    
    if working == 11:
        print("\n🎉 SUCCESS! All 11 LLM providers are working!")
    else:
        print("\n⚠️  Some providers still have issues")

if __name__ == "__main__":
    main()
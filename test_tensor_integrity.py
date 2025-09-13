#!/usr/bin/env python3
"""
COMPREHENSIVE TEST: Validate ALL 11 LLM providers are working
This is the definitive test to ensure tensor integrity
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
import os
import sys

# ALL 11 REQUIRED PROVIDERS
PROVIDERS = {
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'gpt-4o-mini', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('OPENAI_API_KEY', 'sk-placeholder')
    },
    'anthropic': {
        'url': 'https://api.anthropic.com/v1/messages',
        'headers': lambda key: {'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'claude-3-haiku-20240307', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('content', [{}])[0].get('text', ''),
        'key': os.getenv('ANTHROPIC_API_KEY', 'sk-ant-placeholder')
    },
    'deepseek': {
        'url': 'https://api.deepseek.com/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'deepseek-chat', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('DEEPSEEK_API_KEY', 'sk-placeholder')
    },
    'mistral': {
        'url': 'https://api.mistral.ai/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'mistral-small-latest', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('MISTRAL_API_KEY', 'sk-placeholder')
    },
    'xai': {
        'url': 'https://api.x.ai/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'grok-beta', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('XAI_API_KEY', 'xai-placeholder')
    },
    'together': {
        'url': 'https://api.together.xyz/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('TOGETHER_API_KEY', 'sk-placeholder')
    },
    'perplexity': {
        'url': 'https://api.perplexity.ai/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'llama-3.1-sonar-large-128k-online', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('PERPLEXITY_API_KEY', 'pplx-placeholder')
    },
    'google': {
        'url': lambda key: f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}',
        'headers': lambda key: {'Content-Type': 'application/json'},
        'body': lambda prompt: {'contents': [{'parts': [{'text': prompt}]}], 'generationConfig': {'maxOutputTokens': 100}},
        'extract': lambda data: data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', ''),
        'key': os.getenv('GOOGLE_API_KEY', 'AIza-placeholder')
    },
    'cohere': {
        'url': 'https://api.cohere.com/v1/chat',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'command-r-plus', 'message': prompt, 'temperature': 0.7, 'max_tokens': 100},
        'extract': lambda data: data.get('text', ''),
        'key': os.getenv('COHERE_API_KEY', 'co-placeholder')
    },
    'ai21': {
        'url': 'https://api.ai21.com/studio/v1/j2-light/complete',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'prompt': prompt, 'maxTokens': 100, 'temperature': 0.7},
        'extract': lambda data: data.get('completions', [{}])[0].get('data', {}).get('text', ''),
        'key': os.getenv('AI21_API_KEY', 'j2-placeholder')
    },
    'groq': {
        'url': 'https://api.groq.com/openai/v1/chat/completions',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
        'body': lambda prompt: {'model': 'llama-3.1-70b-versatile', 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 100},
        'extract': lambda data: data.get('choices', [{}])[0].get('message', {}).get('content', ''),
        'key': os.getenv('GROQ_API_KEY', 'gsk-placeholder')
    }
}

async def test_provider(session, name, config):
    """Test a single provider"""
    start_time = time.time()
    try:
        url = config['url'](config['key']) if callable(config['url']) else config['url']
        headers = config['headers'](config['key'])
        body = config['body']('Test prompt: What is 2+2?')
        
        async with session.post(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=30)) as response:
            if response.status == 200:
                data = await response.json()
                content = config['extract'](data)
                if content:
                    return {
                        'provider': name,
                        'status': 'SUCCESS',
                        'response_time': time.time() - start_time,
                        'response_length': len(content),
                        'sample': content[:50] + '...' if len(content) > 50 else content
                    }
                else:
                    return {
                        'provider': name,
                        'status': 'FAILED',
                        'error': 'Empty response',
                        'response_time': time.time() - start_time
                    }
            else:
                error_text = await response.text()
                return {
                    'provider': name,
                    'status': 'FAILED',
                    'error': f'HTTP {response.status}: {error_text[:100]}',
                    'response_time': time.time() - start_time
                }
    except Exception as e:
        return {
            'provider': name,
            'status': 'FAILED',
            'error': str(e)[:100],
            'response_time': time.time() - start_time
        }

async def test_all_providers():
    """Test all 11 providers concurrently"""
    print("🧮 TENSOR INTEGRITY TEST - ALL 11 LLMs")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    async with aiohttp.ClientSession() as session:
        tasks = [test_provider(session, name, config) for name, config in PROVIDERS.items()]
        results = await asyncio.gather(*tasks)
    
    # Analyze results
    successful = [r for r in results if r['status'] == 'SUCCESS']
    failed = [r for r in results if r['status'] == 'FAILED']
    
    print("📊 RESULTS:")
    print(f"✅ Successful: {len(successful)}/11")
    print(f"❌ Failed: {len(failed)}/11")
    print()
    
    # Show details
    if successful:
        print("✅ WORKING PROVIDERS:")
        for result in successful:
            print(f"  • {result['provider']}: {result['response_time']:.2f}s - {result['response_length']} chars")
    
    if failed:
        print()
        print("❌ FAILED PROVIDERS:")
        for result in failed:
            print(f"  • {result['provider']}: {result['error']}")
    
    # Tensor integrity check
    print()
    print("🧮 TENSOR INTEGRITY CHECK:")
    if len(successful) == 11:
        print("  ✅ PASS - All 11 LLMs are operational")
        print("  🚀 System ready for production")
    elif len(successful) >= 8:
        print("  ⚠️  WARNING - Tensor partially broken")
        print("  🔧 Missing providers will degrade performance")
    else:
        print("  ❌ FAIL - Tensor integrity compromised")
        print("  🚨 System not ready for production")
    
    # Save results
    with open('tensor_integrity_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_providers': 11,
            'successful': len(successful),
            'failed': len(failed),
            'tensor_integrity': len(successful) == 11,
            'results': results
        }, f, indent=2)
    
    print()
    print("📄 Results saved to: tensor_integrity_test_results.json")
    
    return len(successful) == 11

if __name__ == "__main__":
    success = asyncio.run(test_all_providers())
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""Test ALL API keys including secondary ones"""
import requests
import json

print("🔍 TESTING ALL API KEYS (PRIMARY & SECONDARY)")
print("=" * 50)

# All API keys from render.yaml
api_configs = {
    'OPENAI': [
        ('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', 'OPENAI_API_KEY'),
        # Need to find OPENAI_API_KEY_2, 3, 4
    ],
    'ANTHROPIC': [
        ('sk-ant-api03-jZa-W0Cyk3Z_s7vF_dLYJkP2YYiclqS0d8M-dO15s_j4fPFnNu_kFPXnCx3aK-pD-O8D3_DVqFMZ0rBJJ6Kg5g-x2nA8AAA', 'ANTHROPIC_API_KEY'),
        # Need ANTHROPIC_API_KEY_2
    ],
    'DEEPSEEK': [
        ('sk-a03c67f1fdd74c139faa0ad69b44a0fa', 'DEEPSEEK_API_KEY'),
        # Need DEEPSEEK_API_KEY_2, 3
    ],
    'MISTRAL': [
        ('ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z', 'MISTRAL_API_KEY'),
        # Need MISTRAL_API_KEY_2
    ],
    'XAI': [
        ('xai-TvMNjOdmQG8wFYI8nplKvopQlflnCSDo1fwmUl7XzQ9TLXrGZcJ4OJnJXGRRn7pjP7VKJBHQAyU4Yonc', 'XAI_API_KEY'),
        # Need XAI_API_KEY_2
    ],
    'TOGETHER': [
        ('9e3ba0c46dd44a97d19bb02c86bc79fdbbbe4acdad62c3c088c96cc08758c8f4', 'TOGETHER_API_KEY'),
        # Need TOGETHER_API_KEY_2, 3
    ],
    'PERPLEXITY': [
        ('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', 'PERPLEXITY_API_KEY'),
        # Need PERPLEXITY_API_KEY_2
    ],
    'GOOGLE': [
        ('AIzaSyDi-i8I9BiL7E36skCmR6BQXNO7Y5LHnxg', 'GOOGLE_API_KEY'),
        # Need GOOGLE_API_KEY_2
    ]
}

def test_openai(key):
    try:
        resp = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'gpt-3.5-turbo', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_anthropic(key):
    try:
        resp = requests.post(
            'https://api.anthropic.com/v1/messages',
            headers={'x-api-key': key, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json'},
            json={'model': 'claude-3-haiku-20240307', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_deepseek(key):
    try:
        resp = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'deepseek-chat', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_mistral(key):
    try:
        resp = requests.post(
            'https://api.mistral.ai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mistral-tiny', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_xai(key):
    try:
        resp = requests.post(
            'https://api.x.ai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'grok-beta', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_together(key):
    try:
        resp = requests.post(
            'https://api.together.xyz/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mistralai/Mistral-7B-Instruct-v0.1', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_perplexity(key):
    try:
        resp = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mistral-7b-instruct', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

def test_google(key):
    try:
        resp = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}',
            headers={'Content-Type': 'application/json'},
            json={'contents': [{'parts': [{'text': 'test'}]}]},
            timeout=5
        )
        return resp.status_code == 200
    except:
        return False

# Test functions map
test_functions = {
    'OPENAI': test_openai,
    'ANTHROPIC': test_anthropic,
    'DEEPSEEK': test_deepseek,
    'MISTRAL': test_mistral,
    'XAI': test_xai,
    'TOGETHER': test_together,
    'PERPLEXITY': test_perplexity,
    'GOOGLE': test_google
}

# Test all keys
working_providers = []
for provider, keys in api_configs.items():
    print(f"\n{provider}:")
    test_func = test_functions[provider]
    
    for i, (key, env_name) in enumerate(keys):
        works = test_func(key)
        status = "✅ Working" if works else "❌ Failed"
        print(f"  Key {i+1} ({env_name}): {status}")
        if works:
            working_providers.append(provider)
            break  # One working key is enough

print(f"\n📊 SUMMARY: {len(working_providers)}/8 providers have at least one working key")
print(f"✅ Working: {', '.join(working_providers)}")

# Check against what's actually being used
print("\n🔍 Checking against current usage...")
import psycopg2
conn = psycopg2.connect('postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')
cursor = conn.cursor()
cursor.execute("""
    SELECT DISTINCT model FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '2 hours'
    ORDER BY model
""")
active_models = [row[0] for row in cursor.fetchall()]
print(f"Currently active in DB: {', '.join(active_models)}")

print("\n💡 INSIGHT:")
print("If Render has the secondary API keys that we don't have here,")
print("those might be the ones actually working in production!")
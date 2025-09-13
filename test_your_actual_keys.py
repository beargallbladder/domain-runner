#!/usr/bin/env python3
"""Test the API keys you actually have"""
import requests
import os

print("🔍 TESTING YOUR ACTUAL API PROVIDERS")
print("=" * 50)

# Test functions for each provider
def test_cohere(key):
    try:
        resp = requests.post(
            'https://api.cohere.ai/v1/generate',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'command', 'prompt': 'test', 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

def test_ai21(key):
    try:
        resp = requests.post(
            f'https://api.ai21.com/studio/v1/j2-light/complete',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'prompt': 'test', 'maxTokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

def test_groq(key):
    try:
        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mixtral-8x7b-32768', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

def test_perplexity(key):
    try:
        resp = requests.post(
            'https://api.perplexity.ai/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mistral-7b-instruct', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

def test_together(key):
    try:
        resp = requests.post(
            'https://api.together.xyz/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'mistralai/Mistral-7B-Instruct-v0.1', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

def test_xai(key):
    try:
        resp = requests.post(
            'https://api.x.ai/v1/chat/completions',
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'},
            json={'model': 'grok-beta', 'messages': [{'role': 'user', 'content': 'test'}], 'max_tokens': 5},
            timeout=5
        )
        return resp.status_code == 200, resp.status_code
    except Exception as e:
        return False, str(e)

# Your providers
providers = {
    'COHERE': test_cohere,
    'AI21': test_ai21, 
    'GROQ': test_groq,
    'PERPLEXITY': test_perplexity,
    'TOGETHER': test_together,
    'XAI': test_xai
}

print("Please set your API keys as environment variables to test them:")
print("export COHERE_API_KEY='your-key-here'")
print("export AI21_API_KEY='your-key-here'")
print("export GROQ_API_KEY='your-key-here'")
print("export PERPLEXITY_API_KEY='your-key-here'")
print("export TOGETHER_API_KEY='your-key-here'")
print("export XAI_API_KEY='your-key-here'")
print()

# Check what the Rust service expects vs what you have
print("🔍 MISMATCH ANALYSIS:")
print("\nRust service expects these 8 providers:")
rust_expects = ['OpenAI', 'Anthropic', 'DeepSeek', 'Mistral', 'XAI', 'Together', 'Perplexity', 'Google']
print(f"  {', '.join(rust_expects)}")

print("\nYou have these 6 providers:")
your_providers = ['Cohere', 'AI21', 'Groq', 'Perplexity', 'Together', 'XAI']
print(f"  {', '.join(your_providers)}")

print("\n❌ PROBLEM: The Rust service is hardcoded for different providers!")
print("\nMatching providers:")
matching = set(rust_expects) & set(your_providers)
print(f"  ✅ {', '.join(matching)}")

print("\nRust expects but you don't have:")
missing = set(rust_expects) - set(your_providers)
print(f"  ❌ {', '.join(missing)}")

print("\nYou have but Rust doesn't use:")
extra = set(your_providers) - set(rust_expects)
print(f"  ❌ {', '.join(extra)}")

print("\n💡 SOLUTION:")
print("The Rust service needs to be updated to use YOUR providers (Cohere, AI21, Groq)")
print("OR you need to get API keys for the providers the Rust service expects")
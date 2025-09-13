#!/usr/bin/env python3
"""Find the correct Groq model"""

import os
import requests

# Test different Groq models
groq_models = [
    'mixtral-8x7b-32768',
    'llama3-8b-8192',
    'llama3-70b-8192',
    'llama-3.1-8b-instant',
    'llama-3.1-70b-versatile',
    'llama-3.2-1b-preview',
    'llama-3.2-3b-preview',
    'llama-3.2-11b-vision-preview',
    'llama-3.2-90b-vision-preview',
    'gemma-7b-it',
    'gemma2-9b-it'
]

key = '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'

print("🔍 Testing Groq models...")
for model in groq_models:
    try:
        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
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
            break
        else:
            print(f"❌ {model} - Status {response.status_code}")
            
    except Exception as e:
        print(f"❌ {model} - Error: {str(e)[:50]}")
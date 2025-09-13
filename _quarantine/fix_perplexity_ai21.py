#!/usr/bin/env python3
"""
Fix Perplexity and AI21 with correct model names
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.test')

# Based on documentation
PROVIDERS = {
    'perplexity': {
        'endpoint': 'https://api.perplexity.ai/chat/completions',
        'models': [
            'llama-3.1-sonar-small-128k-online',  # Online search
            'llama-3.1-sonar-large-128k-online',  # Online search
            'llama-3.1-8b-instruct',              # Basic chat
            'llama-3.1-70b-instruct'              # Advanced chat
        ],
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    },
    'ai21': {
        'endpoints': [
            'https://api.ai21.com/studio/v1/j2-ultra/complete',
            'https://api.ai21.com/studio/v1/j2-mid/complete',
            'https://api.ai21.com/studio/v1/chat/completions'
        ],
        'models': ['j2-ultra', 'j2-mid', 'jamba-instruct-preview'],
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    }
}

def test_perplexity():
    """Test Perplexity with different configurations"""
    print("\n🔍 Testing PERPLEXITY...")
    key = os.getenv('PERPLEXITY_API_KEY')
    
    if not key:
        print("   ❌ No key")
        return None
    
    # Try each model
    for model in PROVIDERS['perplexity']['models']:
        try:
            print(f"   🧪 Trying {model}...")
            
            response = requests.post(
                PROVIDERS['perplexity']['endpoint'],
                headers=PROVIDERS['perplexity']['headers'](key),
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': 'Say hello in 5 words'}],
                    'max_tokens': 50,
                    'temperature': 0.7
                },
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"   ✅ {model} WORKS!")
                data = response.json()
                print(f"   Response: {data.get('choices', [{}])[0].get('message', {}).get('content', '')[:50]}")
                return model
            else:
                print(f"   ❌ {model}: {response.status_code} - {response.text[:100]}")
                
        except Exception as e:
            print(f"   ❌ {model}: {str(e)}")
    
    return None

def test_ai21():
    """Test AI21 with different endpoints and formats"""
    print("\n🔍 Testing AI21...")
    key = os.getenv('AI21_API_KEY')
    
    if not key:
        print("   ❌ No key")
        return None
    
    # Try completion API (different format)
    for endpoint in ['https://api.ai21.com/studio/v1/j2-mid/complete',
                     'https://api.ai21.com/studio/v1/j2-ultra/complete']:
        try:
            model = endpoint.split('/')[-2]
            print(f"   🧪 Trying {model} completion API...")
            
            response = requests.post(
                endpoint,
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'prompt': 'Say hello in 5 words:',
                    'maxTokens': 50,
                    'temperature': 0.7
                },
                timeout=10
            )
            
            if response.status_code == 200:
                print(f"   ✅ {model} WORKS!")
                data = response.json()
                print(f"   Response: {data.get('completions', [{}])[0].get('data', {}).get('text', '')[:50]}")
                return {'model': model, 'endpoint': endpoint}
            else:
                print(f"   ❌ {model}: {response.status_code}")
                
        except Exception as e:
            print(f"   ❌ {model}: {str(e)}")
    
    return None

def main():
    print("🔧 FIXING PERPLEXITY AND AI21")
    print("=" * 60)
    
    perplexity_model = test_perplexity()
    ai21_config = test_ai21()
    
    print("\n" + "=" * 60)
    print("📊 RESULTS:")
    
    if perplexity_model:
        print(f"\n✅ PERPLEXITY: {perplexity_model}")
        print(f"""
// Perplexity Implementation - WORKING
{{
  name: 'perplexity',
  model: '{perplexity_model}',
  keys: [process.env.PERPLEXITY_API_KEY, process.env.PERPLEXITY_API_KEY2].filter(Boolean),
  endpoint: 'https://api.perplexity.ai/chat/completions',
  tier: 'fast',
  async call(prompt: string, apiKey: string): Promise<string> {{
    const response = await fetch(this.endpoint, {{
      method: 'POST',
      headers: {{
        'Authorization': `Bearer ${{apiKey}}`,
        'Content-Type': 'application/json'
      }},
      body: JSON.stringify({{
        model: this.model,
        messages: [{{ role: 'user', content: prompt }}],
        max_tokens: 500,
        temperature: 0.7
      }})
    }});
    
    if (!response.ok) {{
      const error = await response.text();
      throw new Error(`Perplexity error: ${{response.status}} - ${{error}}`);
    }}
    
    const data = await response.json();
    return data.choices[0].message.content;
  }}
}}""")
    
    if ai21_config:
        print(f"\n✅ AI21: {ai21_config['model']}")
        print(f"""
// AI21 Implementation - WORKING
{{
  name: 'ai21',
  model: '{ai21_config['model']}',
  keys: [process.env.AI21_API_KEY, process.env.AI21_API_KEY2].filter(Boolean),
  endpoint: '{ai21_config['endpoint']}',
  tier: 'medium',
  async call(prompt: string, apiKey: string): Promise<string> {{
    const response = await fetch(this.endpoint, {{
      method: 'POST',
      headers: {{
        'Authorization': `Bearer ${{apiKey}}`,
        'Content-Type': 'application/json'
      }},
      body: JSON.stringify({{
        prompt: prompt,
        maxTokens: 500,
        temperature: 0.7
      }})
    }});
    
    if (!response.ok) {{
      const error = await response.text();
      throw new Error(`AI21 error: ${{response.status}} - ${{error}}`);
    }}
    
    const data = await response.json();
    return data.completions[0].data.text;
  }}
}}""")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
FIX ALL 11 LLMS - Test each provider locally
"""

import os
import requests
import json
from dotenv import load_dotenv

# Load test environment
load_dotenv('.env.test')

# Test configurations for each broken provider
BROKEN_PROVIDERS = {
    'xai': {
        'endpoint': 'https://api.x.ai/v1/chat/completions',
        'model': 'grok-beta',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'perplexity': {
        'endpoint': 'https://api.perplexity.ai/chat/completions',
        'model': 'llama-3.1-sonar-small-128k-online',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'google': {
        'endpoint': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        'model': 'gemini-pro',
        'headers': lambda key: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
        }
    },
    'ai21': {
        'endpoint': 'https://api.ai21.com/studio/v1/chat/completions',
        'model': 'j2-ultra',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    }
}

def test_provider(name, config):
    """Test a single provider"""
    print(f"\n🧪 Testing {name.upper()}...")
    
    key = os.getenv(f'{name.upper()}_API_KEY')
    if not key or key.strip() == '':
        print(f"   ❌ No API key found for {name}")
        print(f"   👉 Add {name.upper()}_API_KEY to .env.test")
        return False
    
    # Test request
    try:
        headers = config['headers'](key)
        
        # Different payload formats for different providers
        if name == 'google':
            payload = {
                'contents': [{
                    'parts': [{
                        'text': 'Say "Hello from Google Gemini" in 5 words or less'
                    }]
                }]
            }
            url = f"{config['endpoint']}?key={key}"
            headers.pop('x-goog-api-key')  # Use query param instead
        else:
            payload = {
                'model': config['model'],
                'messages': [{
                    'role': 'user',
                    'content': f'Say "Hello from {name}" in 5 words or less'
                }],
                'max_tokens': 50
            }
            url = config['endpoint']
        
        print(f"   📡 Calling {url}")
        print(f"   🔑 Key: {key[:10]}...")
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        print(f"   📨 Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS! Response: {json.dumps(data, indent=2)[:200]}...")
            return True
        else:
            print(f"   ❌ FAILED: {response.text[:200]}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def generate_implementation(name, working):
    """Generate the implementation code"""
    if not working:
        return None
        
    config = BROKEN_PROVIDERS[name]
    
    if name == 'xai':
        return f"""
// xAI (Grok) Implementation
async function callXAI(prompt: string, apiKey: string): Promise<string> {{
  const response = await fetch('https://api.x.ai/v1/chat/completions', {{
    method: 'POST',
    headers: {{
      'Authorization': `Bearer ${{apiKey}}`,
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify({{
      model: 'grok-beta',
      messages: [{{ role: 'user', content: prompt }}],
      max_tokens: 500,
      temperature: 0.7
    }})
  }});
  
  if (!response.ok) {{
    throw new Error(`xAI API error: ${{response.status}}`);
  }}
  
  const data = await response.json();
  return data.choices[0].message.content;
}}"""

    elif name == 'perplexity':
        return f"""
// Perplexity Implementation
async function callPerplexity(prompt: string, apiKey: string): Promise<string> {{
  const response = await fetch('https://api.perplexity.ai/chat/completions', {{
    method: 'POST',
    headers: {{
      'Authorization': `Bearer ${{apiKey}}`,
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify({{
      model: 'llama-3.1-sonar-small-128k-online',
      messages: [{{ role: 'user', content: prompt }}],
      max_tokens: 500,
      temperature: 0.7
    }})
  }});
  
  if (!response.ok) {{
    throw new Error(`Perplexity API error: ${{response.status}}`);
  }}
  
  const data = await response.json();
  return data.choices[0].message.content;
}}"""

    elif name == 'ai21':
        return f"""
// AI21 Implementation  
async function callAI21(prompt: string, apiKey: string): Promise<string> {{
  const response = await fetch('https://api.ai21.com/studio/v1/chat/completions', {{
    method: 'POST',
    headers: {{
      'Authorization': `Bearer ${{apiKey}}`,
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify({{
      model: 'j2-ultra',
      messages: [{{ role: 'user', content: prompt }}],
      max_tokens: 500,
      temperature: 0.7
    }})
  }});
  
  if (!response.ok) {{
    throw new Error(`AI21 API error: ${{response.status}}`);
  }}
  
  const data = await response.json();
  return data.choices[0].message.content;
}}"""

    elif name == 'google':
        return f"""
// Google Gemini Implementation
async function callGoogle(prompt: string, apiKey: string): Promise<string> {{
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${{apiKey}}`, {{
    method: 'POST',
    headers: {{
      'Content-Type': 'application/json'
    }},
    body: JSON.stringify({{
      contents: [{{
        parts: [{{ text: prompt }}]
      }}]
    }})
  }});
  
  if (!response.ok) {{
    throw new Error(`Google API error: ${{response.status}}`);
  }}
  
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}}"""

def main():
    print("🔧 FIXING ALL 11 LLMS")
    print("=" * 60)
    print("\n1️⃣ Add your TEST API keys to .env.test")
    print("2️⃣ Run this script to test each provider")
    print("3️⃣ Get working implementation code")
    print("4️⃣ Deploy and verify in production")
    
    # Check if .env.test has keys
    has_keys = False
    for provider in BROKEN_PROVIDERS:
        key = os.getenv(f'{provider.upper()}_API_KEY')
        if key and key.strip():
            has_keys = True
            break
    
    if not has_keys:
        print("\n⚠️  No API keys found in .env.test")
        print("Add your test keys and run again.")
        return
    
    # Test each provider
    working_providers = {}
    for name, config in BROKEN_PROVIDERS.items():
        if test_provider(name, config):
            working_providers[name] = True
    
    # Generate implementations
    if working_providers:
        print("\n✅ WORKING IMPLEMENTATIONS:")
        print("=" * 60)
        
        for name in working_providers:
            impl = generate_implementation(name, True)
            if impl:
                print(f"\n{impl}\n")
        
        print("\n📋 Next steps:")
        print("1. Add these implementations to the codebase")
        print("2. Test locally with all 11 providers")
        print("3. Deploy to Render with production keys")
        print("4. Verify all 11 LLMs working in production")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
FIX PROVIDERS WITH CORRECT MODELS AND ENDPOINTS
Based on the error messages, we now know the correct configurations
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('.env.test')

# CORRECTED configurations based on error messages
PROVIDERS = {
    'xai': {
        'endpoint': 'https://api.x.ai/v1/chat/completions',
        'models': ['grok-2-mini', 'grok-2', 'grok-1'],  # Try different models
        'test_model': 'grok-2-mini',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'perplexity': {
        'endpoint': 'https://api.perplexity.ai/chat/completions',
        'models': ['llama-3.1-sonar-small-128k-chat', 'llama-3.1-sonar-large-128k-chat'],
        'test_model': 'llama-3.1-sonar-small-128k-chat',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'google': {
        'endpoint': 'https://generativelanguage.googleapis.com/v1beta/models',
        'models': ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'],
        'test_model': 'gemini-1.5-flash',
        'headers': lambda key: {
            'Content-Type': 'application/json'
        }
    },
    'ai21': {
        'endpoint': 'https://api.ai21.com/studio/v1/chat/completions',
        'models': ['jamba-1.5-large', 'jamba-1.5-mini', 'jamba-instruct'],
        'test_model': 'jamba-1.5-mini',
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    }
}

def test_provider_model(name, config, model):
    """Test a specific model for a provider"""
    key = os.getenv(f'{name.upper()}_API_KEY')
    
    try:
        headers = config['headers'](key)
        
        if name == 'google':
            # Google uses different URL format
            url = f"{config['endpoint']}/{model}:generateContent?key={key}"
            payload = {
                'contents': [{
                    'parts': [{
                        'text': f'Say "Hello from Google {model}" in 5 words'
                    }]
                }]
            }
        else:
            url = config['endpoint']
            payload = {
                'model': model,
                'messages': [{
                    'role': 'user',
                    'content': f'Say "Hello from {name} {model}" in 5 words'
                }],
                'max_tokens': 50
            }
        
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code == 200:
            return True, response.json()
        else:
            return False, response.text
            
    except Exception as e:
        return False, str(e)

def find_working_model(name, config):
    """Find a working model for the provider"""
    print(f"\n🔍 Testing {name.upper()} models...")
    key = os.getenv(f'{name.upper()}_API_KEY')
    
    if not key:
        print(f"   ❌ No key for {name}")
        return None
    
    # Try the main model first
    success, result = test_provider_model(name, config, config['test_model'])
    if success:
        print(f"   ✅ {config['test_model']} works!")
        return config['test_model']
    else:
        print(f"   ❌ {config['test_model']}: {str(result)[:100]}")
    
    # Try other models
    for model in config['models']:
        if model != config['test_model']:
            print(f"   🧪 Trying {model}...")
            success, result = test_provider_model(name, config, model)
            if success:
                print(f"   ✅ {model} works!")
                return model
            else:
                print(f"   ❌ {model}: Failed")
    
    return None

def generate_implementation(name, model):
    """Generate TypeScript implementation"""
    
    if name == 'xai':
        return f"""
// xAI (Grok) Implementation - FIXED
{{
  name: 'xai',
  model: '{model}',
  keys: [process.env.XAI_API_KEY, process.env.XAI_API_KEY2].filter(Boolean),
  endpoint: 'https://api.x.ai/v1/chat/completions',
  tier: 'premium',
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
      throw new Error(`xAI error: ${{response.status}} - ${{error}}`);
    }}
    
    const data = await response.json();
    return data.choices[0].message.content;
  }}
}}"""

    elif name == 'perplexity':
        return f"""
// Perplexity Implementation - FIXED
{{
  name: 'perplexity',
  model: '{model}',
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
}}"""

    elif name == 'google':
        return f"""
// Google Gemini Implementation - FIXED
{{
  name: 'google',
  model: '{model}',
  keys: [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY2].filter(Boolean),
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
  tier: 'medium',
  async call(prompt: string, apiKey: string): Promise<string> {{
    const response = await fetch(`${{this.endpoint}}/${{this.model}}:generateContent?key=${{apiKey}}`, {{
      method: 'POST',
      headers: {{
        'Content-Type': 'application/json'
      }},
      body: JSON.stringify({{
        contents: [{{
          parts: [{{ text: prompt }}]
        }}],
        generationConfig: {{
          maxOutputTokens: 500,
          temperature: 0.7
        }}
      }})
    }});
    
    if (!response.ok) {{
      const error = await response.text();
      throw new Error(`Google error: ${{response.status}} - ${{error}}`);
    }}
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }}
}}"""

    elif name == 'ai21':
        return f"""
// AI21 Implementation - FIXED
{{
  name: 'ai21',
  model: '{model}',
  keys: [process.env.AI21_API_KEY, process.env.AI21_API_KEY2].filter(Boolean),
  endpoint: 'https://api.ai21.com/studio/v1/chat/completions',
  tier: 'medium',
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
      throw new Error(`AI21 error: ${{response.status}} - ${{error}}`);
    }}
    
    const data = await response.json();
    return data.choices[0].message.content;
  }}
}}"""

def main():
    print("🔧 TESTING PROVIDERS WITH CORRECT MODELS")
    print("=" * 60)
    
    working_configs = {}
    
    # Test each provider
    for name, config in PROVIDERS.items():
        model = find_working_model(name, config)
        if model:
            working_configs[name] = model
    
    print("\n" + "=" * 60)
    print("📊 RESULTS:")
    print("=" * 60)
    
    if working_configs:
        print(f"\n✅ Working providers: {len(working_configs)}/4")
        for name, model in working_configs.items():
            print(f"   {name}: {model}")
        
        print("\n📝 IMPLEMENTATIONS TO ADD:")
        print("=" * 60)
        
        for name, model in working_configs.items():
            print(generate_implementation(name, model))
            print()
    else:
        print("❌ No providers working yet")

if __name__ == "__main__":
    main()
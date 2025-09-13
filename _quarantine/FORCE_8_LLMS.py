#!/usr/bin/env python3
"""
FORCE ALL 8 LLMs TO PROCESS REMAINING DOMAINS
"""
import psycopg2
import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# ALL 8 LLM ENDPOINTS THAT WORKED BEFORE
LLM_ENDPOINTS = {
    'deepseek': {
        'url': 'https://api.deepseek.com/v1/chat/completions',
        'model': 'deepseek-chat',
        'headers': {'Authorization': 'Bearer sk-a03c67f1fdd74c139faa0ad69b44a0fa', 'Content-Type': 'application/json'}
    },
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions',
        'model': 'gpt-4o-mini',
        'headers': {'Authorization': 'Bearer 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', 'Content-Type': 'application/json'}
    },
    'mistral': {
        'url': 'https://api.mistral.ai/v1/chat/completions',
        'model': 'mistral-small-latest',
        'headers': {'Authorization': 'Bearer ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z', 'Content-Type': 'application/json'}
    },
    'anthropic': {
        'url': 'https://api.anthropic.com/v1/messages',
        'model': 'claude-3-haiku-20240307',
        'headers': {'x-api-key': 'sk-ant-api03-jZa-W0Cyk3Z_s7vF_dLYJkP2YYiclqS0d8M-dO15s_j4fPFnNu_kFPXnCx3aK-pD-O8D3_DVqFMZ0rBJJ6Kg5g-x2nA8AAA', 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json'}
    },
    'google': {
        'url': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        'model': 'gemini-1.5-flash',
        'headers': {'Content-Type': 'application/json'},
        'api_key_param': 'AIzaSyDi-i8I9BiL7E36skCmR6BQXNO7Y5LHnxg'
    },
    'xai': {
        'url': 'https://api.x.ai/v1/chat/completions',
        'model': 'grok-beta',
        'headers': {'Authorization': 'Bearer xai-TvMNjOdmQG8wFYI8nplKvopQlflnCSDo1fwmUl7XzQ9TLXrGZcJ4OJnJXGRRn7pjP7VKJBHQAyU4Yonc', 'Content-Type': 'application/json'}
    },
    'together': {
        'url': 'https://api.together.xyz/v1/chat/completions',
        'model': 'meta-llama/Llama-3-8b-chat-hf',
        'headers': {'Authorization': 'Bearer 9e3ba0c46dd44a97d19bb02c86bc79fdbbbe4acdad62c3c088c96cc08758c8f4', 'Content-Type': 'application/json'}
    },
    'perplexity': {
        'url': 'https://api.perplexity.ai/chat/completions',
        'model': 'llama-3.1-sonar-large-128k-online',
        'headers': {'Authorization': 'Bearer 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', 'Content-Type': 'application/json'}
    }
}

def call_llm(provider, prompt, domain):
    """Call a specific LLM provider"""
    config = LLM_ENDPOINTS[provider]
    
    try:
        if provider == 'anthropic':
            # Anthropic has different API format
            data = {
                'model': config['model'],
                'max_tokens': 500,
                'messages': [{'role': 'user', 'content': prompt}]
            }
        elif provider == 'google':
            # Google has different API format
            data = {
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {'maxOutputTokens': 500}
            }
            url = f"{config['url']}?key={config['api_key_param']}"
        else:
            # Standard OpenAI-compatible format
            data = {
                'model': config['model'],
                'messages': [{'role': 'user', 'content': prompt}],
                'max_tokens': 500
            }
            url = config['url']
        
        if provider != 'google':
            url = config['url']
            
        response = requests.post(url, headers=config['headers'], json=data, timeout=30)
        
        if response.status_code == 200:
            if provider == 'anthropic':
                return response.json()['content'][0]['text']
            elif provider == 'google':
                return response.json()['candidates'][0]['content']['parts'][0]['text']
            else:
                return response.json()['choices'][0]['message']['content']
        else:
            print(f"❌ {provider} error: {response.status_code} - {response.text[:100]}")
            return None
            
    except Exception as e:
        print(f"❌ {provider} exception: {str(e)[:100]}")
        return None

def process_domain_with_all_llms(domain_id, domain):
    """Process a domain with ALL 8 LLMs"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Mark as processing
    cursor.execute("UPDATE domains SET status = 'processing' WHERE id = %s", (domain_id,))
    conn.commit()
    
    prompts = [
        ('business_analysis', f'Analyze the business potential and market position of {domain}'),
        ('content_strategy', f'Develop a content and SEO strategy for {domain}'),
        ('technical_assessment', f'Assess the technical implementation and infrastructure of {domain}')
    ]
    
    success_count = 0
    
    # Process with ALL 8 LLMs in parallel
    with ThreadPoolExecutor(max_workers=24) as executor:
        futures = []
        
        for provider in LLM_ENDPOINTS.keys():
            for prompt_type, prompt_content in prompts:
                future = executor.submit(call_llm, provider, prompt_content, domain)
                futures.append((provider, prompt_type, future))
        
        # Collect results
        for provider, prompt_type, future in futures:
            try:
                result = future.result()
                if result:
                    cursor.execute(
                        "INSERT INTO domain_responses (domain_id, model, prompt_type, response) VALUES (%s, %s, %s, %s)",
                        (domain_id, f"{provider}/{LLM_ENDPOINTS[provider]['model']}", prompt_type, result)
                    )
                    success_count += 1
            except Exception as e:
                print(f"Error saving {provider}/{prompt_type}: {str(e)[:50]}")
    
    # Mark as completed
    if success_count > 0:
        cursor.execute("UPDATE domains SET status = 'completed' WHERE id = %s", (domain_id,))
    else:
        cursor.execute("UPDATE domains SET status = 'pending' WHERE id = %s", (domain_id,))
    
    conn.commit()
    conn.close()
    
    print(f"✅ {domain}: {success_count}/24 responses (8 LLMs × 3 prompts)")
    return success_count

def main():
    print("🚀 FORCING ALL 8 LLMs TO PROCESS DOMAINS")
    print("=" * 50)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Get remaining domains
    cursor.execute("SELECT id, domain FROM domains WHERE status = 'pending' LIMIT 20")
    domains = cursor.fetchall()
    
    if not domains:
        print("✅ All domains completed!")
        return
        
    print(f"📊 Processing {len(domains)} domains with ALL 8 LLMs")
    print("⚡ Each domain: 8 LLMs × 3 prompts = 24 parallel API calls\n")
    
    conn.close()
    
    # Process domains
    total_responses = 0
    for domain_id, domain in domains:
        responses = process_domain_with_all_llms(domain_id, domain)
        total_responses += responses
        time.sleep(0.5)  # Small delay between domains
    
    print(f"\n✅ COMPLETE: {total_responses} total responses generated")

if __name__ == "__main__":
    main()
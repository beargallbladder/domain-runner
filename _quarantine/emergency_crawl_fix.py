#!/usr/bin/env python3
"""
EMERGENCY CRAWL FIX - Direct database processing
Since the sophisticated-runner isn't deploying properly, 
process domains directly through the database
"""
import psycopg2
import requests
import json
from datetime import datetime
import concurrent.futures
import time

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# All LLM configurations with API keys from Render
LLM_CONFIGS = {
    'deepseek': {
        'url': 'https://api.deepseek.com/v1/chat/completions',
        'model': 'deepseek-chat',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    },
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions', 
        'model': 'gpt-4o-mini',
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    },
    'mistral': {
        'url': 'https://api.mistral.ai/v1/chat/completions',
        'model': 'mistral-large-latest', 
        'headers': lambda key: {'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}
    }
}

def process_domain(domain_id, domain, api_keys):
    """Process a single domain with available LLMs"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Mark as processing
    cursor.execute(
        "UPDATE domains SET status = 'processing', updated_at = NOW() WHERE id = %s",
        (domain_id,)
    )
    conn.commit()
    
    prompts = [
        ('business_analysis', f'Analyze the business potential and market position of {domain}'),
        ('content_strategy', f'Develop a content and SEO strategy for {domain}'),
        ('technical_assessment', f'Assess the technical implementation and infrastructure of {domain}')
    ]
    
    success_count = 0
    
    # Process with each available LLM
    for llm_name, config in LLM_CONFIGS.items():
        if llm_name not in api_keys:
            continue
            
        for prompt_type, prompt_content in prompts:
            try:
                response = requests.post(
                    config['url'],
                    headers=config['headers'](api_keys[llm_name]),
                    json={
                        'model': config['model'],
                        'messages': [{'role': 'user', 'content': prompt_content}],
                        'max_tokens': 500
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    data = response.json()
                    content = data['choices'][0]['message']['content']
                    
                    # Insert response
                    cursor.execute(
                        "INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at) VALUES (%s, %s, %s, %s, NOW())",
                        (domain_id, f"{llm_name}/{config['model']}", prompt_type, content)
                    )
                    success_count += 1
                    
            except Exception as e:
                print(f"Error {llm_name}/{prompt_type}: {str(e)[:50]}")
    
    # Mark as completed if we got responses
    if success_count > 0:
        cursor.execute(
            "UPDATE domains SET status = 'completed', updated_at = NOW() WHERE id = %s",
            (domain_id,)
        )
    else:
        cursor.execute(
            "UPDATE domains SET status = 'pending', updated_at = NOW() WHERE id = %s",
            (domain_id,)
        )
    
    conn.commit()
    conn.close()
    
    return success_count

def main():
    print("🚨 EMERGENCY CRAWL FIX")
    print("=" * 50)
    
    # Get API keys from environment or hardcode temporarily
    api_keys = {
        'deepseek': 'sk-a03c67f1fdd74c139faa0ad69b44a0fa',  # From your previous runs
        'openai': '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',
        'mistral': 'ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z'
    }
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Get pending domains
    cursor.execute(
        "SELECT id, domain FROM domains WHERE status = 'pending' ORDER BY updated_at ASC LIMIT 100"
    )
    domains = cursor.fetchall()
    
    if not domains:
        print("✅ No pending domains!")
        return
    
    print(f"📊 Found {len(domains)} pending domains")
    print(f"🤖 Using {len(api_keys)} LLM providers")
    print(f"⚡ Processing with 10 parallel workers\n")
    
    conn.close()
    
    # Process domains in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = []
        for domain_id, domain in domains:
            future = executor.submit(process_domain, domain_id, domain, api_keys)
            futures.append((domain, future))
        
        completed = 0
        for domain, future in futures:
            try:
                success_count = future.result()
                completed += 1
                print(f"✅ {domain}: {success_count} responses")
            except Exception as e:
                print(f"❌ {domain}: {str(e)[:50]}")
            
            if completed % 10 == 0:
                print(f"\n📊 Progress: {completed}/{len(domains)} domains processed")
    
    # Final status
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
    final_status = dict(cursor.fetchall())
    
    print("\n" + "=" * 50)
    print("📊 FINAL STATUS:")
    print(f"  Completed: {final_status.get('completed', 0)}")
    print(f"  Pending: {final_status.get('pending', 0)}")
    print(f"  Processing: {final_status.get('processing', 0)}")
    
    conn.close()

if __name__ == "__main__":
    main()
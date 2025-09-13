#!/usr/bin/env python3
"""
Direct LLM processing - bypass the broken service
"""
import os
import psycopg2
import requests
import concurrent.futures
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Get environment variables or use the keys that were working before
LLMS = {
    'deepseek': {
        'url': 'https://api.deepseek.com/v1/chat/completions',
        'key': os.getenv('DEEPSEEK_API_KEY', 'sk-a03c67f1fdd74c139faa0ad69b44a0fa'),
        'model': 'deepseek-chat'
    },
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions',
        'key': os.getenv('OPENAI_API_KEY', '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'),
        'model': 'gpt-4o-mini'
    },
    'mistral': {
        'url': 'https://api.mistral.ai/v1/chat/completions',
        'key': os.getenv('MISTRAL_API_KEY', 'ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z'),
        'model': 'mistral-large-latest'
    }
}

def process_batch():
    """Process a batch of domains"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # Get pending domains
    cursor.execute("SELECT id, domain FROM domains WHERE status = 'pending' LIMIT 50")
    domains = cursor.fetchall()
    
    if not domains:
        print("No pending domains")
        return 0
    
    print(f"Processing {len(domains)} domains...")
    
    for domain_id, domain in domains:
        # Mark as processing
        cursor.execute("UPDATE domains SET status = 'processing' WHERE id = %s", (domain_id,))
        conn.commit()
        
        success = False
        
        # Try each LLM
        for llm_name, config in LLMS.items():
            try:
                response = requests.post(
                    config['url'],
                    headers={'Authorization': f"Bearer {config['key']}", 'Content-Type': 'application/json'},
                    json={
                        'model': config['model'],
                        'messages': [{'role': 'user', 'content': f'Analyze the business potential of {domain}'}],
                        'max_tokens': 500
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    content = response.json()['choices'][0]['message']['content']
                    cursor.execute(
                        "INSERT INTO domain_responses (domain_id, model, prompt_type, response) VALUES (%s, %s, %s, %s)",
                        (domain_id, llm_name, 'business_analysis', content)
                    )
                    success = True
                    print(f"✓ {domain} - {llm_name}")
            except Exception as e:
                print(f"✗ {domain} - {llm_name}: {str(e)[:50]}")
        
        # Update status
        status = 'completed' if success else 'pending'
        cursor.execute("UPDATE domains SET status = %s WHERE id = %s", (status, domain_id))
        conn.commit()
    
    conn.close()
    return len(domains)

if __name__ == "__main__":
    print("Starting direct LLM processing...")
    while True:
        processed = process_batch()
        if processed == 0:
            print("All domains processed!")
            break
        print(f"Batch complete. Continuing...")
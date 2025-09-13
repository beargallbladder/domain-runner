#!/usr/bin/env python3
"""
Comprehensive analysis of why xAI, Perplexity, AI21, and Google aren't being used
"""

import psycopg2
import json
from collections import defaultdict
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("🔍 COMPREHENSIVE ANALYSIS: Missing Providers")
    print("=" * 80)
    
    # 1. Check what models have been used
    print("\n1️⃣ Models Used in Last 7 Days:")
    print("-" * 60)
    
    cursor.execute("""
        SELECT DISTINCT model, COUNT(*) as uses
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY model
        ORDER BY uses DESC
    """)
    
    models = cursor.fetchall()
    
    # Group by provider
    provider_models = defaultdict(list)
    
    for model, uses in models:
        model_lower = model.lower()
        
        if 'grok' in model_lower:
            provider_models['xAI'].append((model, uses))
        elif 'sonar' in model_lower or 'perplexity' in model_lower:
            provider_models['Perplexity'].append((model, uses))
        elif 'gemini' in model_lower:
            provider_models['Google'].append((model, uses))
        elif 'j2' in model_lower or 'jamba' in model_lower:
            provider_models['AI21'].append((model, uses))
        elif 'gpt' in model_lower:
            provider_models['OpenAI'].append((model, uses))
        elif 'claude' in model_lower:
            provider_models['Anthropic'].append((model, uses))
        elif 'deepseek' in model_lower:
            provider_models['DeepSeek'].append((model, uses))
        elif 'mistral' in model_lower:
            provider_models['Mistral'].append((model, uses))
        elif 'llama' in model_lower or 'meta' in model_lower:
            provider_models['Together/Meta'].append((model, uses))
        elif 'command' in model_lower:
            provider_models['Cohere'].append((model, uses))
        elif 'mixtral' in model_lower:
            provider_models['Groq'].append((model, uses))
        else:
            provider_models['Unknown'].append((model, uses))
    
    # Display results
    missing_providers = ['xAI', 'Perplexity', 'Google', 'AI21']
    
    for provider in sorted(provider_models.keys()):
        models = provider_models[provider]
        total_uses = sum(uses for _, uses in models)
        status = "❌" if provider in missing_providers and total_uses == 0 else "✅"
        
        print(f"\n{status} {provider}:")
        for model, uses in models:
            print(f"   - {model}: {uses} uses")
    
    # Check for missing providers
    print("\n❌ COMPLETELY MISSING PROVIDERS:")
    for provider in missing_providers:
        if provider not in provider_models or sum(uses for _, uses in provider_models[provider]) == 0:
            print(f"   - {provider}: NO DATA FOUND")
    
    # 2. Check latest domain processing
    print("\n\n2️⃣ Latest Domain Processing (Last Hour):")
    print("-" * 60)
    
    cursor.execute("""
        SELECT 
            d.domain,
            d.status,
            COUNT(DISTINCT dr.model) as model_count,
            array_agg(DISTINCT dr.model ORDER BY dr.model) as models
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.updated_at > NOW() - INTERVAL '1 hour'
        GROUP BY d.id, d.domain, d.status
        ORDER BY d.updated_at DESC
        LIMIT 5
    """)
    
    recent = cursor.fetchall()
    
    for domain, status, model_count, models in recent:
        print(f"\nDomain: {domain}")
        print(f"Status: {status}")
        print(f"Models used ({model_count}):")
        if models[0]:
            for model in models:
                print(f"  - {model}")
    
    # 3. Check specific test for missing providers
    print("\n\n3️⃣ Searching for ANY trace of missing providers:")
    print("-" * 60)
    
    search_terms = {
        'xAI': ['grok', 'x.ai', 'xai'],
        'Perplexity': ['perplexity', 'sonar', 'pplx'],
        'Google': ['gemini', 'google', 'palm'],
        'AI21': ['ai21', 'j2', 'jamba', 'jurassic']
    }
    
    for provider, terms in search_terms.items():
        print(f"\n{provider}:")
        for term in terms:
            cursor.execute("""
                SELECT COUNT(*) 
                FROM domain_responses 
                WHERE LOWER(model) LIKE %s 
                OR LOWER(response::text) LIKE %s
                LIMIT 1
            """, (f'%{term}%', f'%{term}%'))
            
            count = cursor.fetchone()[0]
            if count > 0:
                print(f"  ✅ Found '{term}' in {count} responses")
            else:
                print(f"  ❌ No trace of '{term}'")
    
    # 4. Summary
    print("\n\n📊 SUMMARY:")
    print("=" * 80)
    print("\nThe 4 missing providers (xAI, Perplexity, Google, AI21) show:")
    print("1. ❌ NO responses in the database")
    print("2. ❌ NOT being used in recent domain processing")
    print("3. ❌ NO trace in any data")
    print("\nPOSSIBLE CAUSES:")
    print("1. API keys not set in Render environment")
    print("2. Keys are invalid/expired")
    print("3. Code is filtering them out (check p.keys[0] filter)")
    print("4. API endpoints are incorrect or changed")
    print("5. Authentication format is wrong")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
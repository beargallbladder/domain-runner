#!/usr/bin/env python3
"""
Debug why xAI, Perplexity, AI21, and Google aren't being used
"""

import psycopg2
import json
from collections import defaultdict
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def analyze_provider_usage():
    """Analyze which providers are actually being used"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("🔍 Analyzing Provider Usage in Last 24 Hours")
    print("=" * 60)
    
    # Get all responses from last 24 hours
    cursor.execute("""
        SELECT 
            model,
            COUNT(*) as response_count,
            COUNT(DISTINCT domain_id) as domains_processed,
            MIN(created_at) as first_response,
            MAX(created_at) as last_response,
            AVG(LENGTH(response)) as avg_response_length
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY model
        ORDER BY response_count DESC
    """)
    
    results = cursor.fetchall()
    
    # Map models to providers
    provider_map = {
        'gpt': 'OpenAI',
        'claude': 'Anthropic',
        'deepseek': 'DeepSeek',
        'mistral': 'Mistral',
        'grok': 'xAI',
        'sonar': 'Perplexity',
        'llama': 'Together/Meta',
        'gemini': 'Google',
        'j2': 'AI21',
        'jamba': 'AI21',
        'command': 'Cohere',
        'mixtral': 'Groq'
    }
    
    providers_found = defaultdict(lambda: {'models': [], 'count': 0, 'domains': 0})
    
    print("\n📊 Provider Usage Summary:")
    print("-" * 60)
    
    for model, count, domains, first, last, avg_len in results:
        provider = None
        model_lower = model.lower()
        
        for key, prov in provider_map.items():
            if key in model_lower:
                provider = prov
                break
        
        if not provider:
            if '/' in model:
                provider = model.split('/')[0].title()
            else:
                provider = 'Unknown'
        
        providers_found[provider]['models'].append(model)
        providers_found[provider]['count'] += count
        providers_found[provider]['domains'] += domains
        
        print(f"{provider:15} | {model:30} | {count:6} responses | {domains:5} domains")
    
    print("\n🎯 Provider Summary:")
    print("-" * 60)
    
    missing_providers = ['xAI', 'Perplexity', 'Google', 'AI21']
    
    for provider in sorted(providers_found.keys()):
        data = providers_found[provider]
        status = "✅" if provider not in missing_providers else "❌"
        print(f"{status} {provider:15} | {data['count']:6} total responses | {data['domains']:5} domains | Models: {', '.join(data['models'])}")
    
    # Check for missing providers
    print("\n❌ Missing Providers:")
    for provider in missing_providers:
        if provider not in providers_found:
            print(f"  - {provider}: NO RESPONSES FOUND")
    
    # Check recent errors (skip if table doesn't exist)
    print("\n🚨 Recent Errors (Last 24 Hours):")
    try:
        cursor.execute("""
            SELECT 
                provider,
                error_type,
                error_message,
                COUNT(*) as error_count,
                MAX(timestamp) as last_error
            FROM processing_errors
            WHERE timestamp > NOW() - INTERVAL '24 hours'
            AND provider IN ('xai', 'perplexity', 'google', 'ai21')
            GROUP BY provider, error_type, error_message
            ORDER BY error_count DESC
            LIMIT 20
        """)
        
        errors = cursor.fetchall()
        if errors:
            for provider, error_type, message, count, last in errors:
                print(f"  {provider}: {error_type} - {message[:50]}... ({count} times, last: {last})")
        else:
            print("  No errors found for these providers")
    except Exception as e:
        print("  Error table not found or accessible")
    
    # Check if providers are configured in the database
    print("\n📋 Provider Configuration Check:")
    cursor.execute("""
        SELECT DISTINCT model
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        ORDER BY model
    """)
    
    all_models = [row[0] for row in cursor.fetchall()]
    
    print(f"\nTotal unique models used in last 7 days: {len(all_models)}")
    
    # Check for specific models
    expected_models = {
        'xAI': ['grok-2', 'grok-beta'],
        'Perplexity': ['sonar', 'llama-3.1-sonar'],
        'Google': ['gemini-1.5-flash', 'gemini-pro'],
        'AI21': ['j2-ultra', 'jamba-mini']
    }
    
    print("\n🔍 Expected Models Check:")
    for provider, models in expected_models.items():
        found = False
        for model in models:
            matching = [m for m in all_models if model.lower() in m.lower()]
            if matching:
                found = True
                print(f"✅ {provider}: Found {matching}")
        if not found:
            print(f"❌ {provider}: No matching models found")
    
    cursor.close()
    conn.close()

def check_processing_logs():
    """Check processing logs for clues"""
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    print("\n\n📝 Recent Processing Activity:")
    print("=" * 60)
    
    # Check domains processed in last hour
    cursor.execute("""
        SELECT 
            d.domain,
            d.status,
            d.updated_at,
            COUNT(dr.id) as response_count,
            array_agg(DISTINCT dr.model) as models_used
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.updated_at > NOW() - INTERVAL '1 hour'
        GROUP BY d.id, d.domain, d.status, d.updated_at
        ORDER BY d.updated_at DESC
        LIMIT 10
    """)
    
    recent = cursor.fetchall()
    
    print("\nRecent domains processed:")
    for domain, status, updated, count, models in recent:
        models_str = ', '.join(models) if models[0] else 'None'
        print(f"{domain:30} | {status:10} | {count:3} responses | Models: {models_str}")
    
    cursor.close()
    conn.close()

def main():
    print("🔍 DEBUGGING MISSING PROVIDERS: xAI, Perplexity, AI21, Google")
    print("=" * 80)
    
    analyze_provider_usage()
    check_processing_logs()
    
    print("\n\n💡 ANALYSIS COMPLETE")
    print("=" * 80)
    print("\nKey Findings:")
    print("1. Check if API keys are actually set in Render environment")
    print("2. Check if providers are being filtered out in the code")
    print("3. Check if there are authentication errors")
    print("4. Check if the models are correctly configured")

if __name__ == "__main__":
    main()
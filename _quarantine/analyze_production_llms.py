#!/usr/bin/env python3
"""
PRODUCTION ANALYSIS: Find out which LLMs are ACTUALLY working in production
No local testing bullshit - direct database analysis
"""

import psycopg2
import json
from datetime import datetime, timedelta
from collections import defaultdict

# PRODUCTION DATABASE
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def analyze_production_llms():
    """Analyze which LLMs are actually working in production"""
    print("🔍 ANALYZING PRODUCTION LLM REALITY")
    print("=" * 60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # 1. Get all LLM responses from last 7 days
    print("\n📊 LLM RESPONSES IN LAST 7 DAYS:")
    cur.execute("""
        SELECT 
            model,
            COUNT(*) as response_count,
            COUNT(DISTINCT domain_id) as unique_domains,
            MIN(created_at) as first_response,
            MAX(created_at) as last_response,
            AVG(response_time_ms) as avg_response_time
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY model
        ORDER BY response_count DESC
    """)
    
    llm_stats = cur.fetchall()
    active_providers = set()
    
    for model, count, domains, first, last, avg_time in llm_stats:
        # Extract provider name from model
        provider = model.split('/')[0] if '/' in model else model
        provider = provider.lower()
        
        # Map common model names to providers
        if 'gpt' in model.lower():
            provider = 'openai'
        elif 'claude' in model.lower():
            provider = 'anthropic'
        elif 'deepseek' in model.lower():
            provider = 'deepseek'
        elif 'mistral' in model.lower():
            provider = 'mistral'
        elif 'grok' in model.lower():
            provider = 'xai'
        elif 'llama' in model.lower() and 'together' in model.lower():
            provider = 'together'
        elif 'sonar' in model.lower() or 'perplexity' in model.lower():
            provider = 'perplexity'
        elif 'gemini' in model.lower():
            provider = 'google'
        elif 'command' in model.lower() or 'cohere' in model.lower():
            provider = 'cohere'
        elif 'j2' in model.lower() or 'ai21' in model.lower():
            provider = 'ai21'
        elif 'groq' in model.lower() or 'mixtral' in model.lower():
            provider = 'groq'
            
        active_providers.add(provider)
        
        print(f"\n  Model: {model}")
        print(f"  Provider: {provider}")
        print(f"  Responses: {count}")
        print(f"  Unique domains: {domains}")
        print(f"  First response: {first}")
        print(f"  Last response: {last}")
        print(f"  Avg response time: {avg_time:.2f}ms" if avg_time else "  Avg response time: N/A")
    
    # 2. Check which of the 11 required providers are missing
    REQUIRED_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                         'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    missing_providers = set(REQUIRED_PROVIDERS) - active_providers
    
    print(f"\n\n🔍 PROVIDER ANALYSIS:")
    print(f"Required providers: {len(REQUIRED_PROVIDERS)}")
    print(f"Active providers: {len(active_providers)} - {sorted(active_providers)}")
    print(f"Missing providers: {len(missing_providers)} - {sorted(missing_providers)}")
    
    # 3. Check if missing providers EVER worked
    print(f"\n\n🕰️ HISTORICAL CHECK FOR MISSING PROVIDERS:")
    for provider in missing_providers:
        cur.execute("""
            SELECT COUNT(*), MIN(created_at), MAX(created_at)
            FROM domain_responses
            WHERE model ILIKE %s
        """, (f'%{provider}%',))
        
        count, first, last = cur.fetchone()
        if count > 0:
            print(f"  {provider}: Found {count} historical responses (first: {first}, last: {last})")
        else:
            print(f"  {provider}: NEVER WORKED - 0 responses in database")
    
    # 4. Check recent errors
    print(f"\n\n❌ RECENT ERRORS (last 24 hours):")
    cur.execute("""
        SELECT 
            model,
            COUNT(*) as error_count,
            MAX(created_at) as last_error
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '24 hours'
        AND (response IS NULL OR response = '' OR quality_flag = 'error')
        GROUP BY model
        ORDER BY error_count DESC
        LIMIT 10
    """)
    
    errors = cur.fetchall()
    if errors:
        for model, count, last_error in errors:
            print(f"  {model}: {count} errors (last: {last_error})")
    else:
        print("  No errors found")
    
    # 5. Tensor synchronization analysis
    print(f"\n\n🧮 TENSOR SYNCHRONIZATION ANALYSIS:")
    cur.execute("""
        SELECT 
            domain_id,
            domain,
            COUNT(DISTINCT 
                CASE 
                    WHEN model ILIKE '%openai%' OR model ILIKE '%gpt%' THEN 'openai'
                    WHEN model ILIKE '%anthropic%' OR model ILIKE '%claude%' THEN 'anthropic'
                    WHEN model ILIKE '%deepseek%' THEN 'deepseek'
                    WHEN model ILIKE '%mistral%' THEN 'mistral'
                    WHEN model ILIKE '%xai%' OR model ILIKE '%grok%' THEN 'xai'
                    WHEN model ILIKE '%together%' OR model ILIKE '%llama%' THEN 'together'
                    WHEN model ILIKE '%perplexity%' OR model ILIKE '%sonar%' THEN 'perplexity'
                    WHEN model ILIKE '%google%' OR model ILIKE '%gemini%' THEN 'google'
                    WHEN model ILIKE '%cohere%' OR model ILIKE '%command%' THEN 'cohere'
                    WHEN model ILIKE '%ai21%' OR model ILIKE '%j2%' THEN 'ai21'
                    WHEN model ILIKE '%groq%' OR model ILIKE '%mixtral%' THEN 'groq'
                END
            ) as provider_count
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE dr.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY domain_id, domain
        ORDER BY provider_count DESC
        LIMIT 10
    """)
    
    tensor_data = cur.fetchall()
    full_tensor_domains = 0
    partial_tensor_domains = 0
    
    for domain_id, domain, provider_count in tensor_data:
        if provider_count >= 11:
            full_tensor_domains += 1
            print(f"  ✅ {domain}: {provider_count}/11 providers (FULL TENSOR)")
        elif provider_count >= 8:
            partial_tensor_domains += 1
            print(f"  ⚠️  {domain}: {provider_count}/11 providers (PARTIAL TENSOR)")
        else:
            print(f"  ❌ {domain}: {provider_count}/11 providers (BROKEN TENSOR)")
    
    print(f"\n  Summary:")
    print(f"  - Domains with full tensor (11/11): {full_tensor_domains}")
    print(f"  - Domains with partial tensor (8-10/11): {partial_tensor_domains}")
    
    # 6. Check batch coordination logs
    print(f"\n\n📦 RECENT BATCH COORDINATION:")
    cur.execute("""
        SELECT 
            batch_id,
            start_time,
            end_time,
            expected_llms,
            completed_llms,
            batch_result,
            processing_duration_ms
        FROM batch_coordination_log
        WHERE start_time > NOW() - INTERVAL '24 hours'
        ORDER BY start_time DESC
        LIMIT 5
    """)
    
    batches = cur.fetchall()
    if batches:
        for batch in batches:
            batch_id, start, end, expected, completed, result, duration = batch
            print(f"\n  Batch: {batch_id}")
            print(f"  Time: {start} - {end}")
            print(f"  Expected LLMs: {len(expected) if expected else 0}")
            print(f"  Completed LLMs: {len(completed) if completed else 0}")
            print(f"  Result: {result}")
            print(f"  Duration: {duration}ms")
    else:
        print("  No recent batch coordination logs found")
    
    conn.close()
    
    # Final assessment
    print(f"\n\n🎯 FINAL ASSESSMENT:")
    print(f"✅ Working providers ({len(active_providers)}/11): {sorted(active_providers)}")
    print(f"❌ Missing providers ({len(missing_providers)}/11): {sorted(missing_providers)}")
    
    if missing_providers == {'cohere', 'ai21', 'groq'}:
        print(f"\n🔍 ROOT CAUSE: The 3 missing providers (Cohere, AI21, Groq) have NEVER worked")
        print(f"   - They are defined in the code but have no API keys on Render")
        print(f"   - The system is running with only 8/11 LLMs")
        print(f"   - This breaks tensor synchronization")
    
    print(f"\n📋 ACTION REQUIRED:")
    print(f"1. Get API keys for: {', '.join(sorted(missing_providers))}")
    print(f"2. Add them to Render environment variables")
    print(f"3. Verify the provider implementations are correct")
    print(f"4. Monitor until all 11 LLMs are responding")

if __name__ == "__main__":
    analyze_production_llms()
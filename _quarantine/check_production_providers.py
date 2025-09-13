#!/usr/bin/env python3
"""
Check which LLM providers are actually working in production
by analyzing recent database activity
"""

import psycopg2
from datetime import datetime, timedelta
import json

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def check_active_providers():
    """Check which providers are actively processing domains"""
    print("🔍 CHECKING PRODUCTION LLM PROVIDERS")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check recent activity (last 24 hours)
        print("\n📊 PROVIDERS ACTIVE IN LAST 24 HOURS:")
        cursor.execute("""
            SELECT DISTINCT 
                CASE 
                    WHEN model LIKE '%deepseek%' THEN 'deepseek'
                    WHEN model LIKE '%llama%' AND model LIKE '%together%' THEN 'together'
                    WHEN model LIKE '%grok%' THEN 'xai'
                    WHEN model LIKE '%perplexity%' OR model LIKE '%sonar%' THEN 'perplexity'
                    WHEN model LIKE '%gpt%' THEN 'openai'
                    WHEN model LIKE '%mistral%' THEN 'mistral'
                    WHEN model LIKE '%claude%' THEN 'anthropic'
                    WHEN model LIKE '%gemini%' THEN 'google'
                    WHEN model LIKE '%cohere%' OR model LIKE '%command%' THEN 'cohere'
                    WHEN model LIKE '%ai21%' OR model LIKE '%j2-%' THEN 'ai21'
                    WHEN model LIKE '%groq%' OR model LIKE '%mixtral%' THEN 'groq'
                    ELSE SPLIT_PART(model, '/', 1)
                END as provider,
                COUNT(*) as responses,
                COUNT(DISTINCT domain_id) as domains,
                MIN(created_at) as first_response,
                MAX(created_at) as last_response
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY provider
            ORDER BY responses DESC
        """)
        
        recent_providers = cursor.fetchall()
        total_responses = sum(row[1] for row in recent_providers)
        
        print(f"Total responses in last 24h: {total_responses}")
        for provider, responses, domains, first, last in recent_providers:
            print(f"  ✅ {provider.upper()}: {responses} responses, {domains} domains")
            print(f"     First: {first}, Last: {last}")
        
        # Check specific models being used
        print(f"\n🎯 SPECIFIC MODELS IN USE:")
        cursor.execute("""
            SELECT 
                model,
                COUNT(*) as responses,
                MAX(created_at) as last_used
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY model
            ORDER BY responses DESC
        """)
        
        models = cursor.fetchall()
        for model, responses, last_used in models:
            print(f"  {model}: {responses} responses (last: {last_used})")
        
        # Check domain processing status
        print(f"\n📈 DOMAIN PROCESSING STATUS:")
        cursor.execute("""
            SELECT 
                status,
                COUNT(*) as count
            FROM domains
            GROUP BY status
            ORDER BY count DESC
        """)
        
        statuses = cursor.fetchall()
        for status, count in statuses:
            print(f"  {status}: {count} domains")
        
        # Check recent domain processing rate
        print(f"\n⚡ PROCESSING RATE:")
        cursor.execute("""
            SELECT 
                DATE_TRUNC('hour', created_at) as hour,
                COUNT(*) as responses
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '6 hours'
            GROUP BY hour
            ORDER BY hour DESC
        """)
        
        hourly = cursor.fetchall()
        for hour, responses in hourly:
            print(f"  {hour}: {responses} responses")
        
        # Summary analysis
        working_providers = len(recent_providers)
        print(f"\n🎯 PRODUCTION ANALYSIS:")
        print(f"  Working providers: {working_providers}/11 required")
        print(f"  Total daily responses: {total_responses}")
        
        if working_providers >= 8:
            print(f"  ✅ Good coverage - most providers working")
        elif working_providers >= 5:
            print(f"  🟡 Partial coverage - some providers missing")
        else:
            print(f"  ❌ Poor coverage - many providers down")
        
        # Check for missing providers
        all_required = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
        active_providers = [row[0] for row in recent_providers]
        missing_providers = [p for p in all_required if p not in active_providers]
        
        if missing_providers:
            print(f"\n🚨 MISSING PROVIDERS:")
            for provider in missing_providers:
                print(f"  ❌ {provider.upper()}: No recent activity")
            print(f"\n📝 REQUIRED ACTIONS:")
            print(f"  1. Check API keys for missing providers")
            print(f"  2. Verify provider implementations exist")
            print(f"  3. Test provider endpoints manually")
            print(f"  4. Deploy fixes for missing providers")
        
        conn.close()
        
        return {
            'working_providers': working_providers,
            'active_providers': active_providers,
            'missing_providers': missing_providers,
            'total_responses': total_responses,
            'models_in_use': [row[0] for row in models]
        }
        
    except Exception as e:
        print(f"❌ Error checking database: {str(e)}")
        return None

def test_service_endpoints():
    """Test various service endpoints to find working ones"""
    print(f"\n🔍 TESTING SERVICE ENDPOINTS:")
    
    endpoints = [
        "https://sophisticated-runner.onrender.com/health",
        "https://sophisticated-runner.onrender.com/api-keys", 
        "https://sophisticated-runner.onrender.com/status",
        "https://sophisticated-runner.onrender.com/providers",
        "https://domain-processor-v2.onrender.com/health",
        "https://domain-processor-v2.onrender.com/providers"
    ]
    
    import requests
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=10)
            print(f"  {endpoint}: HTTP {response.status_code}")
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"    Response: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"    Response: {response.text[:100]}...")
        except Exception as e:
            print(f"  {endpoint}: Error - {str(e)}")

def main():
    print("🚀 PRODUCTION LLM PROVIDER ANALYSIS")
    print("=" * 50)
    
    # Check database activity
    db_analysis = check_active_providers()
    
    # Test service endpoints
    test_service_endpoints()
    
    if db_analysis:
        print(f"\n🎯 FINAL ASSESSMENT:")
        if db_analysis['working_providers'] >= 8:
            print(f"  ✅ System is working well with {db_analysis['working_providers']} providers")
            print(f"  📊 Processing {db_analysis['total_responses']} responses/day")
        else:
            print(f"  ⚠️  System needs improvement - only {db_analysis['working_providers']} providers active")
        
        if db_analysis['missing_providers']:
            print(f"  🔧 Need to add: {', '.join(db_analysis['missing_providers'])}")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
MONITOR FOR FULL 11 LLM COVERAGE
"""

import psycopg2
import time
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def monitor_providers():
    expected = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    print("🔍 MONITORING FOR FULL 11 LLM COVERAGE")
    print("=" * 60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    start_time = time.time()
    check_count = 0
    
    while True:
        check_count += 1
        
        # Get current activity
        cur.execute("""
            SELECT 
                model,
                COUNT(*) as responses,
                COUNT(DISTINCT domain_id) as unique_domains,
                MAX(created_at) as last_response
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '30 minutes'
            GROUP BY model
            ORDER BY model
        """)
        
        results = cur.fetchall()
        
        print(f"\n⏰ Check #{check_count} at {datetime.now().strftime('%H:%M:%S')}")
        print("-" * 60)
        
        found_providers = {}
        for model, responses, domains, last in results:
            found_providers[model] = {
                'responses': responses,
                'domains': domains,
                'last': last
            }
        
        # Show all expected providers
        active_count = 0
        for provider in expected:
            if provider in found_providers:
                data = found_providers[provider]
                print(f"✅ {provider:12} : {data['responses']:4} responses | {data['domains']:3} domains | {data['last']}")
                active_count += 1
            else:
                print(f"❌ {provider:12} : NOT ACTIVE YET")
        
        print(f"\n📊 Summary: {active_count}/11 LLMs active")
        
        # Check for specific missing providers
        missing = set(expected) - set(found_providers.keys())
        if missing:
            print(f"⏳ Still waiting for: {', '.join(sorted(missing))}")
        
        # Success condition
        if active_count == 11:
            print("\n" + "🎉" * 20)
            print("✅ SUCCESS! ALL 11 LLM PROVIDERS ARE WORKING!")
            print("🎉" * 20)
            
            # Final stats
            total_responses = sum(d['responses'] for d in found_providers.values())
            total_domains = max(d['domains'] for d in found_providers.values())
            
            print(f"\n📈 Final Stats:")
            print(f"   Total responses: {total_responses}")
            print(f"   Unique domains processed: {total_domains}")
            print(f"   Time to full coverage: {int(time.time() - start_time)} seconds")
            break
        
        # Wait before next check
        time.sleep(30)
        
        # Timeout after 10 minutes
        if time.time() - start_time > 600:
            print("\n⚠️  Timeout after 10 minutes. Missing providers may have issues.")
            break
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    monitor_providers()
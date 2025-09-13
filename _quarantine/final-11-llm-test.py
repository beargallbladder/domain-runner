#!/usr/bin/env python3
"""
FINAL 11 LLM TEST - CHECK ACTUAL DATABASE STATUS
This shows the REAL state of the 11 LLM system
"""

import psycopg2
import os
from datetime import datetime, timedelta
import json
import sys

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

REQUIRED_PROVIDERS = [
    'openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
    'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
]

def check_11_llm_status():
    """Check the actual status of all 11 LLMs"""
    print("🧠 FINAL 11 LLM TENSOR STATUS CHECK")
    print("===================================")
    print(f"Time: {datetime.now()}")
    print("")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check responses in last 6 hours
        query = """
        WITH expected_providers AS (
            SELECT unnest(%s::text[]) as provider
        ),
        recent_responses AS (
            SELECT 
                provider,
                COUNT(*) as response_count,
                MAX(created_at) as last_response,
                COUNT(DISTINCT domain_id) as domains_processed
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '6 hours'
                AND response IS NOT NULL
                AND response != ''
            GROUP BY provider
        )
        SELECT 
            e.provider,
            COALESCE(r.response_count, 0) as responses,
            COALESCE(r.domains_processed, 0) as domains,
            r.last_response,
            CASE 
                WHEN r.response_count > 0 THEN 'WORKING'
                ELSE 'NOT WORKING'
            END as status
        FROM expected_providers e
        LEFT JOIN recent_responses r ON e.provider = r.provider
        ORDER BY 
            CASE WHEN r.response_count > 0 THEN 0 ELSE 1 END,
            e.provider
        """
        
        cursor.execute(query, (REQUIRED_PROVIDERS,))
        results = cursor.fetchall()
        
        print("📊 PROVIDER STATUS (Last 6 hours):")
        print("-" * 70)
        print(f"{'Provider':<12} {'Status':<15} {'Responses':<12} {'Domains':<10} {'Last Success'}")
        print("-" * 70)
        
        working_count = 0
        working_providers = []
        not_working_providers = []
        
        for provider, responses, domains, last_response, status in results:
            status_icon = "✅" if status == "WORKING" else "❌"
            last_str = last_response.strftime("%H:%M:%S") if last_response else "NEVER"
            
            print(f"{provider:<12} {status_icon} {status:<12} {responses:<12} {domains:<10} {last_str}")
            
            if status == "WORKING":
                working_count += 1
                working_providers.append(provider)
            else:
                not_working_providers.append(provider)
        
        print("-" * 70)
        print("")
        print("📈 SUMMARY:")
        print(f"  Working: {working_count}/11 ({(working_count/11*100):.1f}%)")
        print(f"  Not Working: {len(not_working_providers)}/11")
        
        if working_count == 11:
            print("")
            print("🎉 🎉 🎉 TENSOR SYNCHRONIZATION ACHIEVED! 🎉 🎉 🎉")
            print("✅ ALL 11 LLM PROVIDERS ARE WORKING!")
            print("🚀 The tensor system is FULLY OPERATIONAL!")
        elif working_count >= 8:
            print("")
            print("⚠️  PARTIAL SUCCESS: {}/11 providers working".format(working_count))
            print("Missing: " + ", ".join(not_working_providers))
        else:
            print("")
            print("❌ TENSOR SYSTEM FAILURE: Only {}/11 working".format(working_count))
            print("Not working: " + ", ".join(not_working_providers))
        
        # Check total domains processed today
        cursor.execute("""
            SELECT COUNT(DISTINCT domain_id) 
            FROM domain_responses 
            WHERE created_at > NOW() - INTERVAL '24 hours'
        """)
        total_domains = cursor.fetchone()[0]
        
        print("")
        print(f"📊 Domains processed in last 24h: {total_domains}")
        
        # Save status to file
        status_data = {
            "timestamp": datetime.now().isoformat(),
            "working_count": working_count,
            "working_providers": working_providers,
            "not_working_providers": not_working_providers,
            "success_rate": working_count / 11 * 100,
            "domains_24h": total_domains
        }
        
        with open("11-llm-final-status.json", "w") as f:
            json.dump(status_data, f, indent=2)
        
        cursor.close()
        conn.close()
        
        return working_count == 11
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = check_11_llm_status()
    
    if not success:
        print("\n🔧 NEXT STEPS:")
        print("1. Check if domains are being processed")
        print("2. Check Render logs for errors")
        print("3. Verify API keys are set correctly on Render")
        print("4. Try processing a test domain manually")
    
    sys.exit(0 if success else 1)
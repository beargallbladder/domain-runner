#!/usr/bin/env python3
import requests
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

# API endpoints to test
API_BASE = "https://llmrank.io"
ENDPOINTS = [
    "/health",
    "/stats", 
    "/domains",
    "/rankings",
    "/search?q=tech",
    "/domain/google.com",
    "/consensus/google.com",
    "/memory/google.com"
]

# Database connection for verification
DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db?sslmode=require"

def test_api_endpoints():
    print("🔍 API ENDPOINT VALIDATION")
    print("=========================\n")
    
    results = []
    
    for endpoint in ENDPOINTS:
        url = f"{API_BASE}{endpoint}"
        try:
            response = requests.get(url, timeout=10)
            status = response.status_code
            
            if status == 200:
                try:
                    data = response.json()
                    result = "✅ OK"
                    
                    # Check for fresh data
                    if 'domains' in data and isinstance(data['domains'], list) and len(data['domains']) > 0:
                        result += f" ({len(data['domains'])} domains)"
                    elif 'total' in data:
                        result += f" (total: {data['total']})"
                    elif 'consensus_score' in data:
                        result += f" (score: {data['consensus_score']:.2f})"
                        
                except:
                    result = "✅ OK (non-JSON)"
            else:
                result = f"❌ {status}"
                
            results.append((endpoint, result))
            print(f"{endpoint:<30} {result}")
            
        except Exception as e:
            results.append((endpoint, f"❌ Error: {str(e)[:50]}"))
            print(f"{endpoint:<30} ❌ Error: {str(e)[:50]}")
    
    return results

def check_data_freshness():
    print("\n📊 DATA FRESHNESS CHECK")
    print("=======================\n")
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Check latest responses
        cur.execute("""
            SELECT 
                COUNT(*) as total_responses,
                COUNT(DISTINCT domain_id) as unique_domains,
                COUNT(DISTINCT model) as unique_models,
                MAX(created_at) as latest_response,
                MIN(created_at) as oldest_response
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '2 hours'
        """)
        
        result = cur.fetchone()
        print(f"Recent responses (last 2 hours):")
        print(f"  Total: {result['total_responses']}")
        print(f"  Unique domains: {result['unique_domains']}")
        print(f"  Active LLMs: {result['unique_models']}")
        print(f"  Latest: {result['latest_response']}")
        
        # Check public cache
        cur.execute("""
            SELECT COUNT(*) as cache_count,
                   MAX(last_updated) as newest_cache
            FROM public_cache
        """)
        
        cache = cur.fetchone()
        print(f"\nPublic cache:")
        print(f"  Entries: {cache['cache_count']}")
        print(f"  Latest update: {cache['newest_cache']}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"Database error: {e}")

def test_api_data_consistency():
    print("\n🔄 API DATA CONSISTENCY")
    print("=======================\n")
    
    try:
        # Test specific domain
        domain = "google.com"
        
        # Get domain data
        domain_resp = requests.get(f"{API_BASE}/domain/{domain}")
        if domain_resp.status_code == 200:
            domain_data = domain_resp.json()
            print(f"Domain {domain}:")
            print(f"  Status: {domain_data.get('status', 'N/A')}")
            print(f"  Responses: {domain_data.get('response_count', 0)}")
            
        # Get consensus
        consensus_resp = requests.get(f"{API_BASE}/consensus/{domain}")
        if consensus_resp.status_code == 200:
            consensus_data = consensus_resp.json()
            print(f"\nConsensus for {domain}:")
            print(f"  Score: {consensus_data.get('consensus_score', 0):.2f}")
            print(f"  Models: {len(consensus_data.get('model_scores', {}))}")
            
    except Exception as e:
        print(f"Error testing consistency: {e}")

if __name__ == "__main__":
    # Run all tests
    test_api_endpoints()
    check_data_freshness()
    test_api_data_consistency()
    
    print("\n✅ API validation complete!")
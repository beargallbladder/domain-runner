#!/usr/bin/env python3
"""Check system health and ability to initiate full crawl"""

import psycopg2
import json
from datetime import datetime, timedelta

DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Check domain status
    print("=== DOMAIN STATUS ===")
    cur.execute("""
        SELECT status, COUNT(*) 
        FROM domains 
        GROUP BY status
        ORDER BY COUNT(*) DESC
    """)
    for row in cur.fetchall():
        print(f"{row[0]}: {row[1]} domains")
    
    # Check recent activity
    print("\n=== RECENT ACTIVITY (last 24 hours) ===")
    cur.execute("""
        SELECT model, COUNT(*) as responses, MAX(created_at) as last_response
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY model
        ORDER BY responses DESC
    """)
    
    results = cur.fetchall()
    if results:
        for row in results:
            print(f"{row[0]}: {row[1]} responses, last: {row[2]}")
    else:
        print("❌ No responses in the last 24 hours")
    
    # Check pending domains
    print("\n=== PENDING DOMAINS ===")
    cur.execute("""
        SELECT COUNT(*) 
        FROM domains 
        WHERE status IN ('pending', 'processing')
    """)
    pending = cur.fetchone()[0]
    print(f"Total pending/processing: {pending}")
    
    # Check if all 11 LLMs have recent responses
    print("\n=== LLM COVERAGE (last 7 days) ===")
    cur.execute("""
        SELECT model, COUNT(DISTINCT domain_id) as domains_covered
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY model
        ORDER BY domains_covered DESC
    """)
    
    llm_coverage = cur.fetchall()
    expected_llms = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                     'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
    
    if llm_coverage:
        found_llms = [row[0] for row in llm_coverage]
        print(f"Active LLMs: {len(found_llms)}/11")
        for row in llm_coverage[:5]:  # Show top 5
            print(f"  {row[0]}: {row[1]} domains")
        
        missing_llms = [llm for llm in expected_llms if llm not in found_llms]
        if missing_llms:
            print(f"\n❌ Missing LLMs: {', '.join(missing_llms)}")
    else:
        print("❌ No LLM activity in the last 7 days")
    
    # Check last successful crawl
    print("\n=== LAST SUCCESSFUL CRAWL ===")
    cur.execute("""
        SELECT model, COUNT(*), MAX(created_at) as last_time
        FROM domain_responses
        GROUP BY model
        HAVING COUNT(*) > 100
        ORDER BY last_time DESC
        LIMIT 5
    """)
    
    for row in cur.fetchall():
        print(f"{row[0]}: {row[1]} total responses, last: {row[2]}")
    
    cur.close()
    conn.close()
    
    print("\n=== SYSTEM HEALTH SUMMARY ===")
    if pending > 0:
        print(f"✅ System has {pending} domains ready for processing")
        print("✅ Database is accessible and healthy")
        print("\n🚀 READY TO INITIATE FULL CRAWL")
    else:
        print("❌ No pending domains to process")
        print("   Run domain reset script to mark domains for processing")
    
except Exception as e:
    print(f"❌ Database Error: {e}")
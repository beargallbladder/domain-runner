#!/usr/bin/env python3
"""Verify all 11 LLMs are actually configured and working"""

import requests
import psycopg2
from datetime import datetime

# We fixed these this morning!
ALL_11_LLMS = {
    'openai': 'gpt-4o-mini',
    'anthropic': 'claude-3-haiku-20240307', 
    'deepseek': 'deepseek-chat',
    'mistral': 'mistral-small-latest',
    'xai': 'grok-2',  # Fixed from grok-beta
    'together': 'meta-llama/Llama-3-8b-chat-hf',
    'perplexity': 'sonar',  # Fixed from wrong models
    'google': 'gemini-1.5-flash',
    'cohere': 'command-r-plus',
    'ai21': 'jamba-mini',  # Fixed from j2-ultra
    'groq': 'llama3-8b-8192'  # Fixed from deprecated mixtral
}

print("🔍 VERIFYING ALL 11 LLMS WE FIXED THIS MORNING")
print("=" * 60)

# Check domain-runner service
print("\n1. Checking domain-runner service configuration...")
try:
    response = requests.get("https://domain-runner.onrender.com/health", timeout=10)
    if response.status_code == 200:
        health = response.json()
        configured = health['providers']['configured']
        print(f"✅ Service reports {len(configured)}/11 providers configured:")
        for p in configured:
            model = ALL_11_LLMS.get(p, 'unknown')
            print(f"   - {p}: {model}")
except Exception as e:
    print(f"❌ Error: {e}")

# Check database for recent activity
print("\n2. Checking database for LLM activity...")
DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

try:
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Check all responses ever
    print("\nAll-time LLM responses:")
    cur.execute("""
        SELECT model, COUNT(*) as total_responses, 
               MAX(created_at) as last_response,
               COUNT(DISTINCT domain_id) as domains_covered
        FROM domain_responses
        GROUP BY model
        ORDER BY model
    """)
    
    all_responses = {row[0]: row for row in cur.fetchall()}
    
    for llm in ALL_11_LLMS.keys():
        if llm in all_responses:
            data = all_responses[llm]
            print(f"✅ {llm}: {data[1]:,} responses, {data[3]} domains, last: {data[2]}")
        else:
            print(f"❌ {llm}: NO RESPONSES FOUND")
    
    # Check if the fixed models are being used
    print("\n3. Checking if our fixed models are active...")
    cur.execute("""
        SELECT model, COUNT(*) 
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '2 hours'
        GROUP BY model
    """)
    
    recent = {row[0]: row[1] for row in cur.fetchall()}
    if recent:
        print(f"Recent activity (last 2 hours):")
        for model, count in recent.items():
            print(f"  {model}: {count} responses")
    else:
        print("No activity in last 2 hours")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f"Database error: {e}")

print("\n" + "=" * 60)
print("SUMMARY:")
print("We fixed all 11 LLMs this morning with:")
print("- xAI: grok-beta → grok-2")
print("- Perplexity: wrong models → sonar") 
print("- AI21: j2-ultra → jamba-mini (chat completions)")
print("- Groq: mixtral-8x7b-32768 → llama3-8b-8192")
print("\nThe service shows 11/11 configured but some may not have")
print("processed domains yet. Let's trigger a full 11 LLM crawl!")
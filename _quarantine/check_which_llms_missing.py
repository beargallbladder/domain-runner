#!/usr/bin/env python3
"""
CHECK WHICH OF THE 8 LLMs ARE MISSING API KEYS
"""
import requests
import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔍 CHECKING WHICH LLMs ARE MISSING")
print("=" * 50)

# The 8 required LLMs
REQUIRED_LLMS = {
    'deepseek': 'deepseek-chat',
    'together': 'meta-llama/Llama-3-8b-chat-hf',
    'xai': 'grok-beta',
    'perplexity': 'llama-3.1-sonar-large-128k-online',
    'openai': 'gpt-4o-mini',
    'mistral': 'mistral-small-latest',
    'anthropic': 'claude-3-haiku-20240307',
    'google': 'gemini-1.5-flash'
}

# Check what's actually being used
conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

cursor.execute("""
    SELECT DISTINCT model 
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '2 hours'
    ORDER BY model
""")

active_models = [row[0] for row in cursor.fetchall()]

print("\n📊 Active models in last 2 hours:")
active_providers = set()
for model in active_models:
    print(f"  {model}")
    # Extract provider name
    for provider in REQUIRED_LLMS:
        if provider in model.lower():
            active_providers.add(provider)

print(f"\n✅ Active providers: {', '.join(active_providers)}")

missing = set(REQUIRED_LLMS.keys()) - active_providers
if missing:
    print(f"\n❌ MISSING PROVIDERS: {', '.join(missing)}")
    print("\nTHESE API KEYS ARE NOT SET IN RENDER:")
    for provider in missing:
        print(f"  - {provider.upper()}_API_KEY")
    print("\n🚨 The sophisticated-runner service needs ALL 8 API keys set!")
else:
    print("\n✅ All 8 providers are active!")

conn.close()
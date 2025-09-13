#!/usr/bin/env python3
"""
Analyze why only 3 LLMs are active instead of 8
"""
import psycopg2
from collections import defaultdict
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

print("🔍 ANALYZING LLM USAGE PATTERNS")
print("=" * 60)

# 1. Check all models ever used
cursor.execute("SELECT DISTINCT model FROM domain_responses ORDER BY model")
all_models = [row[0] for row in cursor.fetchall()]

print(f"\n📋 All models in database ({len(all_models)}):")
for model in all_models:
    print(f"  - {model}")

# 2. Check model usage by hour for last 24 hours
print("\n📊 Model usage by hour (last 24h):")
cursor.execute("""
    SELECT 
        DATE_TRUNC('hour', created_at) as hour,
        model,
        COUNT(*) as count
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY hour, model
    ORDER BY hour DESC, count DESC
""")

hourly_data = defaultdict(list)
for hour, model, count in cursor.fetchall():
    hourly_data[hour].append((model, count))

# Show last 3 hours
for hour in sorted(hourly_data.keys(), reverse=True)[:3]:
    print(f"\n{hour.strftime('%Y-%m-%d %H:00')}:")
    models_this_hour = hourly_data[hour]
    for model, count in models_this_hour[:8]:
        print(f"  {model}: {count}")
    if len(models_this_hour) > 8:
        print(f"  ... and {len(models_this_hour) - 8} more models")

# 3. Check if there's a pattern in model rotation
print("\n🔄 Model activation pattern:")
cursor.execute("""
    SELECT 
        model,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        COUNT(*) as total_calls
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY model
    ORDER BY last_seen DESC
""")

for model, first, last, total in cursor.fetchall():
    duration = (last - first).total_seconds() / 3600
    print(f"\n{model}:")
    print(f"  First: {first.strftime('%H:%M')}")
    print(f"  Last: {last.strftime('%H:%M')}")
    print(f"  Duration: {duration:.1f}h")
    print(f"  Total: {total} calls")

# 4. Expected vs actual models
expected_models = {
    'deepseek': 'deepseek-chat',
    'together': 'meta-llama/Llama-2-7b-chat-hf',
    'xai': 'grok-beta',
    'perplexity': 'llama-3.1-sonar-large-128k-online',
    'openai': 'gpt-4o-mini',
    'mistral': 'mistral-large-latest',
    'anthropic': 'claude-3-5-sonnet-20241022',
    'google': 'gemini-1.5-pro'
}

print("\n❓ DIAGNOSIS:")
active_providers = set()
for model in all_models:
    for provider in expected_models:
        if provider in model.lower() or expected_models[provider] in model:
            active_providers.add(provider)

missing_providers = set(expected_models.keys()) - active_providers
if missing_providers:
    print(f"❌ Missing providers: {', '.join(missing_providers)}")
    print("\nPossible reasons:")
    print("1. API keys not set in Render environment variables")
    print("2. Service is using old code that only activates 3 providers")
    print("3. Rate limiting preventing other providers from starting")
    print("4. Sequential processing bottleneck")
else:
    print("✅ All providers have been used at some point")

conn.close()
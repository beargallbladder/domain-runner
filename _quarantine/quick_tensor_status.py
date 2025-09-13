#!/usr/bin/env python3
"""Quick check of tensor processing status"""
import psycopg2

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

conn = psycopg2.connect(DATABASE_URL)
cursor = conn.cursor()

# Get current status
cursor.execute("SELECT status, COUNT(*) FROM domains GROUP BY status")
status = dict(cursor.fetchall())

# Get active models
cursor.execute("""
    SELECT model, COUNT(*) as count
    FROM domain_responses 
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    GROUP BY model
    ORDER BY count DESC
""")
active_models = cursor.fetchall()

# Get processing rate
cursor.execute("""
    SELECT 
        COUNT(DISTINCT domain_id) as domains_last_hour,
        COUNT(*) as responses_last_hour
    FROM domain_responses
    WHERE created_at > NOW() - INTERVAL '1 hour'
""")
rate = cursor.fetchone()

print("🚀 TENSOR PROCESSING STATUS")
print("=" * 40)
print(f"✅ Completed: {status.get('completed', 0)}")
print(f"⏳ Pending: {status.get('pending', 0)}")
print(f"🔄 Processing: {status.get('processing', 0)}")
print(f"\n⚡ Rate: {rate[0]} domains/hour")
print(f"📊 Responses: {rate[1]} in last hour")

print(f"\n🤖 Active Models ({len(active_models)}):")
for model, count in active_models[:8]:
    print(f"  {model}: {count}")

# Check if all 8 models are active
expected_models = {'deepseek', 'together', 'xai', 'perplexity', 'openai', 'mistral', 'anthropic', 'google'}
active_model_names = {m[0].split('/')[0] for m in active_models if '/' in m[0]}
missing = expected_models - active_model_names

if missing:
    print(f"\n❌ Missing models: {', '.join(missing)}")
else:
    print(f"\n✅ All 8 LLM providers active!")

conn.close()
#!/usr/bin/env python3
"""
Analyze crawl insights and quality
"""

import psycopg2
import json
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔍 ANALYZING CRAWL QUALITY & INSIGHTS")
print("=" * 80)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Overall crawl stats
print("\n📊 CRAWL STATISTICS:")
cur.execute("""
    SELECT 
        COUNT(*) as total_responses,
        COUNT(DISTINCT domain_id) as unique_domains,
        COUNT(DISTINCT model) as models_used,
        MIN(created_at) as start_time,
        MAX(created_at) as end_time,
        AVG(response_time_ms) as avg_response_time
    FROM domain_responses
    WHERE created_at >= NOW() - INTERVAL '2 hours'
""")
stats = cur.fetchone()
print(f"✅ Total responses: {stats[0]:,}")
print(f"✅ Unique domains: {stats[1]}")
print(f"✅ Models used: {stats[2]}")
print(f"✅ Time range: {stats[3]} to {stats[4]}")
print(f"✅ Avg response time: {stats[5]:.0f}ms" if stats[5] else "✅ Avg response time: N/A")

# 2. Model distribution
print("\n📈 MODEL DISTRIBUTION:")
cur.execute("""
    SELECT model, COUNT(*) as count
    FROM domain_responses
    WHERE created_at >= NOW() - INTERVAL '2 hours'
    AND model IS NOT NULL
    GROUP BY model
    ORDER BY count DESC
""")
for model, count in cur.fetchall():
    print(f"   {model}: {count:,} responses")

# 3. Sample high-quality insights
print("\n💡 SAMPLE INSIGHTS FROM CRAWL:")
print("-" * 80)

cur.execute("""
    SELECT 
        d.domain,
        dr.model,
        dr.prompt,
        dr.response,
        dr.sentiment_score,
        dr.detail_score
    FROM domain_responses dr
    JOIN domains d ON dr.domain_id = d.id
    WHERE dr.created_at >= NOW() - INTERVAL '2 hours'
    AND dr.response IS NOT NULL
    AND LENGTH(dr.response) > 100
    AND d.domain IN ('openai.com', 'anthropic.com', 'github.com', 'stripe.com', 'tesla.com')
    ORDER BY dr.created_at DESC
    LIMIT 20
""")

current_domain = None
responses_by_domain = {}

for domain, model, prompt, response, sentiment, detail in cur.fetchall():
    if domain not in responses_by_domain:
        responses_by_domain[domain] = []
    responses_by_domain[domain].append({
        'model': model,
        'prompt': prompt,
        'response': response,
        'sentiment': sentiment,
        'detail': detail
    })

# Show insights for each domain
for domain, responses in list(responses_by_domain.items())[:3]:  # Show 3 domains
    print(f"\n🌐 Domain: {domain}")
    
    # Show first response from different models
    shown_models = set()
    for resp in responses[:3]:  # Show up to 3 different models
        if resp['model'] and resp['model'] not in shown_models:
            shown_models.add(resp['model'])
            print(f"\n  📍 {resp['model']}:")
            print(f"     Prompt: {resp['prompt'][:100]}...")
            clean_response = resp['response'].strip().replace('\n', ' ')[:300]
            print(f"     Response: {clean_response}...")
            if resp['sentiment']:
                print(f"     Sentiment: {resp['sentiment']:.2f}")

# 4. Response quality analysis
print("\n\n📊 RESPONSE QUALITY METRICS:")
print("-" * 80)

cur.execute("""
    SELECT 
        model,
        COUNT(*) as total,
        AVG(LENGTH(response)) as avg_length,
        COUNT(CASE WHEN response IS NULL OR response = '' THEN 1 END) as empty,
        COUNT(CASE WHEN LENGTH(response) > 200 THEN 1 END) as detailed,
        AVG(sentiment_score) as avg_sentiment,
        AVG(detail_score) as avg_detail
    FROM domain_responses
    WHERE created_at >= NOW() - INTERVAL '2 hours'
    GROUP BY model
    HAVING COUNT(*) > 10
    ORDER BY avg_length DESC
""")

print("Model performance:")
for model, total, avg_len, empty, detailed, sentiment, detail in cur.fetchall():
    if model:
        print(f"\n{model}:")
        print(f"  Total responses: {total}")
        print(f"  Avg response length: {avg_len:.0f} chars" if avg_len else "  Avg response length: N/A")
        print(f"  Empty responses: {empty}")
        print(f"  Detailed responses (>200 chars): {detailed}")
        if sentiment:
            print(f"  Avg sentiment score: {sentiment:.2f}")
        if detail:
            print(f"  Avg detail score: {detail:.2f}")

# 5. Check consistency across models
print("\n\n🎯 CROSS-MODEL CONSISTENCY:")
print("-" * 80)

# Find domains with responses from multiple models
cur.execute("""
    SELECT 
        d.domain,
        COUNT(DISTINCT dr.model) as model_count,
        COUNT(*) as response_count
    FROM domain_responses dr
    JOIN domains d ON dr.domain_id = d.id
    WHERE dr.created_at >= NOW() - INTERVAL '2 hours'
    AND dr.response IS NOT NULL
    GROUP BY d.domain
    HAVING COUNT(DISTINCT dr.model) >= 5
    ORDER BY model_count DESC
    LIMIT 5
""")

multi_model_domains = cur.fetchall()
print(f"Found {len(multi_model_domains)} domains with 5+ models responding")

if multi_model_domains:
    # Analyze one domain in detail
    test_domain = multi_model_domains[0][0]
    print(f"\nAnalyzing '{test_domain}' across models:")
    
    cur.execute("""
        SELECT model, response
        FROM domain_responses dr
        JOIN domains d ON dr.domain_id = d.id
        WHERE d.domain = %s
        AND dr.created_at >= NOW() - INTERVAL '2 hours'
        AND dr.response IS NOT NULL
        AND dr.prompt LIKE '%%primary purpose%%'
        ORDER BY model
    """, (test_domain,))
    
    for model, response in cur.fetchall():
        if model:
            clean_response = response.strip().replace('\n', ' ')[:150]
            print(f"\n{model}: {clean_response}...")

cur.close()
conn.close()

print("\n" + "="*80)
print("✅ CRAWL QUALITY ANALYSIS COMPLETE")
print("="*80)
#!/usr/bin/env python3
"""
Check database for crawl quality and insights
"""

import psycopg2
import json
from collections import Counter, defaultdict
from datetime import datetime

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

print("🔍 ANALYZING CRAWL QUALITY & INSIGHTS")
print("=" * 80)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# 1. Check recent responses
print("\n📊 Checking recent crawl data...")
cur.execute("""
    SELECT COUNT(DISTINCT domain) as unique_domains,
           COUNT(*) as total_responses,
           COUNT(DISTINCT provider_name) as providers_used,
           MIN(created_at) as start_time,
           MAX(created_at) as end_time
    FROM responses
    WHERE created_at >= NOW() - INTERVAL '1 hour'
""")
stats = cur.fetchone()
print(f"✅ Domains crawled: {stats[0]}")
print(f"✅ Total responses: {stats[1]:,}")
print(f"✅ Providers used: {stats[2]}")
print(f"✅ Time range: {stats[3]} to {stats[4]}")

# 2. Provider distribution
print("\n📈 Provider response distribution:")
cur.execute("""
    SELECT provider_name, COUNT(*) as response_count
    FROM responses
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    GROUP BY provider_name
    ORDER BY response_count DESC
""")
for provider, count in cur.fetchall():
    print(f"   {provider}: {count:,} responses")

# 3. Sample quality insights
print("\n💡 SAMPLE INSIGHTS FROM DIFFERENT PROVIDERS:")
print("-" * 80)

# Get samples from each provider for a few domains
sample_domains = ['openai.com', 'stripe.com', 'github.com', 'tesla.com', 'anthropic.com']

for domain in sample_domains[:3]:  # Show 3 domains
    print(f"\n🌐 Domain: {domain}")
    
    cur.execute("""
        SELECT provider_name, prompt_text, response_content, model_used
        FROM responses
        WHERE domain = %s 
        AND created_at >= NOW() - INTERVAL '1 hour'
        AND prompt_text LIKE '%%primary purpose%%'
        ORDER BY provider_name
        LIMIT 5
    """, (domain,))
    
    responses = cur.fetchall()
    if responses:
        print(f"\n  Prompt: '{responses[0][1]}'")
        print("  Provider insights:")
        for provider, prompt, response, model in responses:
            # Clean and truncate response
            clean_response = response.strip().replace('\n', ' ')[:200]
            print(f"\n  📍 {provider} ({model}):")
            print(f"     {clean_response}...")

# 4. Response quality metrics
print("\n\n📊 RESPONSE QUALITY METRICS:")
print("-" * 80)

cur.execute("""
    SELECT 
        AVG(LENGTH(response_content)) as avg_response_length,
        MIN(LENGTH(response_content)) as min_length,
        MAX(LENGTH(response_content)) as max_length,
        COUNT(CASE WHEN response_content IS NULL OR response_content = '' THEN 1 END) as empty_responses,
        COUNT(CASE WHEN LENGTH(response_content) < 50 THEN 1 END) as short_responses,
        COUNT(CASE WHEN LENGTH(response_content) > 500 THEN 1 END) as detailed_responses
    FROM responses
    WHERE created_at >= NOW() - INTERVAL '1 hour'
""")
quality = cur.fetchone()
print(f"Average response length: {quality[0]:.0f} characters")
print(f"Response length range: {quality[1]} - {quality[2]} characters")
print(f"Empty responses: {quality[3]}")
print(f"Short responses (<50 chars): {quality[4]}")
print(f"Detailed responses (>500 chars): {quality[5]}")

# 5. Check for consistency across providers
print("\n\n🎯 CROSS-PROVIDER CONSISTENCY CHECK:")
print("-" * 80)

# Check a specific domain across all providers
test_domain = 'github.com'
cur.execute("""
    SELECT provider_name, response_content
    FROM responses
    WHERE domain = %s 
    AND prompt_text LIKE '%%key features%%'
    AND created_at >= NOW() - INTERVAL '1 hour'
    ORDER BY provider_name
""", (test_domain,))

print(f"Domain: {test_domain} - Key features identified by each provider:")
features_by_provider = {}
for provider, response in cur.fetchall():
    # Extract key features mentioned
    features = []
    keywords = ['repository', 'collaboration', 'version control', 'code', 'hosting', 
                'open source', 'pull request', 'issue tracking', 'CI/CD', 'actions']
    for keyword in keywords:
        if keyword.lower() in response.lower():
            features.append(keyword)
    features_by_provider[provider] = features
    print(f"\n{provider}: {', '.join(features) if features else 'No standard features detected'}")

# 6. Domain coverage
print("\n\n📈 DOMAIN COVERAGE ANALYSIS:")
print("-" * 80)

cur.execute("""
    SELECT 
        COUNT(DISTINCT domain) as domains_with_responses,
        COUNT(DISTINCT CASE WHEN provider_count = 11 THEN domain END) as domains_with_all_providers
    FROM (
        SELECT domain, COUNT(DISTINCT provider_name) as provider_count
        FROM responses
        WHERE created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY domain
    ) domain_stats
""")
coverage = cur.fetchone()
print(f"Domains with responses: {coverage[0]}")
print(f"Domains with ALL 11 providers: {coverage[1]}")
print(f"Coverage rate: {coverage[1]/coverage[0]*100:.1f}%")

# 7. Response times
print("\n\n⚡ PERFORMANCE METRICS:")
cur.execute("""
    SELECT 
        provider_name,
        COUNT(*) as requests,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_response_time
    FROM responses
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND updated_at IS NOT NULL
    GROUP BY provider_name
    ORDER BY avg_response_time
""")
print("Provider response times:")
for provider, requests, avg_time in cur.fetchall():
    print(f"  {provider}: {avg_time:.2f}s average ({requests} requests)")

cur.close()
conn.close()

print("\n" + "="*80)
print("✅ CRAWL QUALITY ANALYSIS COMPLETE")
print("="*80)
#!/usr/bin/env python3
"""Comprehensive analysis of domain-runner system"""
import psycopg2
from datetime import datetime, timedelta
import json

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

def analyze_database():
    print("="*60)
    print("🔍 DATABASE ANALYSIS")
    print("="*60)
    
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    
    # 1. Overall statistics
    cursor.execute("""
        SELECT 
            COUNT(*) as total_responses,
            COUNT(DISTINCT domain_id) as unique_domains,
            COUNT(DISTINCT model) as unique_models,
            MIN(created_at) as first_response,
            MAX(created_at) as last_response
        FROM domain_responses
    """)
    stats = cursor.fetchone()
    print(f"\n📊 OVERALL STATISTICS:")
    print(f"Total responses: {stats[0]:,}")
    print(f"Unique domains: {stats[1]:,}")
    print(f"Unique models: {stats[2]}")
    print(f"First response: {stats[3]}")
    print(f"Last response: {stats[4]}")
    
    # 2. Models breakdown
    cursor.execute("""
        SELECT model, COUNT(*) as count
        FROM domain_responses
        GROUP BY model
        ORDER BY count DESC
    """)
    models = cursor.fetchall()
    print(f"\n🤖 MODELS BREAKDOWN:")
    for model, count in models:
        print(f"  {model}: {count:,}")
    
    # 3. Prompt types
    cursor.execute("""
        SELECT prompt_type, COUNT(*) as count
        FROM domain_responses
        GROUP BY prompt_type
        ORDER BY count DESC
    """)
    prompts = cursor.fetchall()
    print(f"\n📝 PROMPT TYPES:")
    for prompt, count in prompts:
        print(f"  {prompt}: {count:,}")
    
    # 4. Time series analysis
    cursor.execute("""
        SELECT 
            DATE_TRUNC('day', created_at) as day,
            COUNT(*) as responses,
            COUNT(DISTINCT domain_id) as domains
        FROM domain_responses
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
    """)
    timeline = cursor.fetchall()
    print(f"\n📅 LAST 14 DAYS ACTIVITY:")
    for day, responses, domains in timeline:
        print(f"  {day.strftime('%Y-%m-%d')}: {responses:,} responses, {domains} domains")
    
    # 5. Response quality check
    cursor.execute("""
        SELECT 
            model,
            AVG(LENGTH(response)) as avg_length,
            COUNT(*) as count
        FROM domain_responses
        WHERE response IS NOT NULL
        GROUP BY model
        ORDER BY avg_length DESC
    """)
    quality = cursor.fetchall()
    print(f"\n📏 RESPONSE QUALITY (avg length):")
    for model, avg_len, count in quality:
        print(f"  {model}: {avg_len:.0f} chars (n={count})")
    
    # 6. Check for empty or error responses
    cursor.execute("""
        SELECT 
            model,
            COUNT(*) as empty_count
        FROM domain_responses
        WHERE response IS NULL OR response = '' OR LENGTH(response) < 50
        GROUP BY model
        ORDER BY empty_count DESC
    """)
    empty = cursor.fetchall()
    if empty:
        print(f"\n⚠️ EMPTY/SHORT RESPONSES:")
        for model, count in empty:
            print(f"  {model}: {count}")
    
    # 7. Domain coverage analysis
    cursor.execute("""
        SELECT 
            d.id,
            d.domain,
            COUNT(dr.id) as response_count,
            COUNT(DISTINCT dr.model) as model_count,
            COUNT(DISTINCT dr.prompt_type) as prompt_count
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        GROUP BY d.id, d.domain
        HAVING COUNT(dr.id) < 24  -- Expected: 8 models × 3 prompts
        ORDER BY response_count ASC
        LIMIT 20
    """)
    incomplete = cursor.fetchall()
    if incomplete:
        print(f"\n❌ INCOMPLETE DOMAINS (expecting 24 responses each):")
        for _, domain, resp_count, model_count, prompt_count in incomplete[:10]:
            print(f"  {domain}: {resp_count} responses, {model_count} models, {prompt_count} prompts")
    
    # 8. Recent activity check
    cursor.execute("""
        SELECT 
            model,
            MAX(created_at) as last_seen,
            COUNT(*) as recent_count
        FROM domain_responses
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY model
        ORDER BY last_seen DESC
    """)
    recent = cursor.fetchall()
    print(f"\n🕐 LAST 24 HOURS ACTIVITY:")
    if recent:
        for model, last_seen, count in recent:
            print(f"  {model}: {count} responses, last: {last_seen}")
    else:
        print("  ⚠️ No activity in last 24 hours!")
    
    conn.close()

def analyze_tensor_system():
    print("\n" + "="*60)
    print("🧮 TENSOR SYSTEM ANALYSIS")
    print("="*60)
    
    print("""
The system is designed to build THREE tensors:

1. SentimentTensor[Brand × Source × Sentiment × Time]
   - Tracks sentiment evolution across different sources
   - Measures public perception drift
   
2. GroundingTensor[Brand × Category × SignalType × Time]
   - Categorizes brands by industry/sector
   - Tracks signal strength over time
   
3. MemoryTensor[Brand × LLM × MemoryScore × Time]
   - Core innovation: "We measure the shadows (LLM memory) so you can shape the light (public sentiment)"
   - Tracks how well each LLM "remembers" each brand
   - Memory decay over time indicates brand salience
   
KEY INSIGHTS:
- Simultaneous LLM responses are critical for consensus detection
- Weekly crawls update memory scores to track decay/growth
- Drift detection identifies brands gaining/losing mindshare
- Cross-LLM consensus validates signal strength
""")

def analyze_services():
    print("\n" + "="*60)
    print("🔧 SERVICE ARCHITECTURE ANALYSIS")
    print("="*60)
    
    services = {
        "sophisticated-runner": "Main API service with LLM endpoints",
        "domain-processor-v2": "Domain processing pipeline",
        "memory-oracle": "Memory score computation service",
        "predictive-analytics": "Tensor analysis and predictions",
        "public-api": "External API for tensor queries",
        "raw-capture-runner": "Raw data capture service",
        "cohort-intelligence": "Cohort analysis across brands",
        "industry-intelligence": "Industry-level tensor aggregation"
    }
    
    print("\nKEY SERVICES:")
    for service, desc in services.items():
        print(f"  • {service}: {desc}")

def identify_issues():
    print("\n" + "="*60)
    print("🚨 IDENTIFIED ISSUES")
    print("="*60)
    
    issues = [
        {
            "issue": "Only 8 of 11 LLMs working",
            "cause": "Missing API keys or rate limits for groq, cohere, gemini",
            "impact": "Reduced consensus accuracy, incomplete tensor data",
            "fix": "Add missing API keys to sophisticated-runner environment"
        },
        {
            "issue": "Weekly crawls failing",
            "cause": "No automated scheduling, manual triggers only",
            "impact": "Memory scores not updating, drift detection broken",
            "fix": "Implement cron job or Render scheduled jobs"
        },
        {
            "issue": "Processing stops after initial batch",
            "cause": "Services crash or timeout after ~3000 domains",
            "impact": "Incomplete data collection",
            "fix": "Implement robust retry logic and health checks"
        },
        {
            "issue": "Tensor computation not running",
            "cause": "Memory-oracle and predictive-analytics services not deployed",
            "impact": "Raw responses not converted to tensor insights",
            "fix": "Deploy tensor computation services"
        }
    ]
    
    for i, issue in enumerate(issues, 1):
        print(f"\n{i}. {issue['issue']}")
        print(f"   Cause: {issue['cause']}")
        print(f"   Impact: {issue['impact']}")
        print(f"   Fix: {issue['fix']}")

def main():
    print("🚀 COMPREHENSIVE DOMAIN-RUNNER SYSTEM ANALYSIS")
    print("="*60)
    print(f"Analysis Date: {datetime.now()}")
    
    analyze_database()
    analyze_tensor_system()
    analyze_services()
    identify_issues()
    
    print("\n" + "="*60)
    print("📋 RECOMMENDATIONS")
    print("="*60)
    print("""
1. IMMEDIATE ACTIONS:
   • Add missing LLM API keys (groq, cohere, gemini)
   • Deploy memory-oracle service for tensor computation
   • Set up weekly cron job for continuous crawling
   
2. SYSTEM IMPROVEMENTS:
   • Implement health monitoring with alerts
   • Add retry logic for failed API calls
   • Create dashboard for tensor visualization
   
3. DATA PIPELINE FIX:
   Domain → LLM APIs → Responses → Memory Scores → Tensors → Insights
   Currently broken at: Memory Scores step
   
4. DEPLOYMENT STRATEGY:
   • Use PM2 or systemd for process management
   • Implement rolling deployments
   • Add comprehensive logging
""")

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Test the actual working providers by analyzing real production usage
and testing provider implementations directly
"""

import requests
import json
import time
import psycopg2
from datetime import datetime, timedelta

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class ProductionProviderTester:
    def __init__(self):
        self.results = {}
        self.working_providers = []
        self.missing_providers = []
        
    def analyze_database_activity(self):
        """Analyze recent database activity to identify working providers"""
        print("🔍 ANALYZING PRODUCTION DATABASE ACTIVITY")
        print("=" * 60)
        
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Get recent provider activity with detailed breakdown
            cursor.execute("""
                SELECT 
                    CASE 
                        WHEN model LIKE '%deepseek%' THEN 'deepseek'
                        WHEN model LIKE '%llama%' AND model LIKE '%together%' THEN 'together'
                        WHEN model LIKE '%grok%' THEN 'xai'
                        WHEN model LIKE '%perplexity%' OR model LIKE '%sonar%' THEN 'perplexity'
                        WHEN model LIKE '%gpt%' THEN 'openai'
                        WHEN model LIKE '%mistral%' THEN 'mistral'
                        WHEN model LIKE '%claude%' THEN 'anthropic'
                        WHEN model LIKE '%gemini%' THEN 'google'
                        WHEN model LIKE '%cohere%' OR model LIKE '%command%' THEN 'cohere'
                        WHEN model LIKE '%ai21%' OR model LIKE '%j2-%' THEN 'ai21'
                        WHEN model LIKE '%groq%' OR model LIKE '%mixtral%' THEN 'groq'
                        ELSE SPLIT_PART(model, '/', 1)
                    END as provider,
                    model,
                    COUNT(*) as total_responses,
                    COUNT(DISTINCT domain_id) as unique_domains,
                    MIN(created_at) as first_response,
                    MAX(created_at) as last_response,
                    AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY model ORDER BY created_at)))) as avg_interval_seconds
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '6 hours'
                GROUP BY provider, model
                ORDER BY provider, total_responses DESC
            """)
            
            provider_data = cursor.fetchall()
            
            # Process results by provider
            provider_summary = {}
            for provider, model, responses, domains, first, last, avg_interval in provider_data:
                if provider not in provider_summary:
                    provider_summary[provider] = {
                        'models': [],
                        'total_responses': 0,
                        'total_domains': 0,
                        'first_response': first,
                        'last_response': last,
                        'status': 'active'
                    }
                
                provider_summary[provider]['models'].append({
                    'model': model,
                    'responses': responses,
                    'domains': domains,
                    'avg_interval': avg_interval
                })
                provider_summary[provider]['total_responses'] += responses
                provider_summary[provider]['total_domains'] = max(provider_summary[provider]['total_domains'], domains)
                
                if last > provider_summary[provider]['last_response']:
                    provider_summary[provider]['last_response'] = last
            
            # Display results
            print(f"\n📊 PROVIDER ACTIVITY ANALYSIS (Last 6 hours):")
            total_responses = sum(p['total_responses'] for p in provider_summary.values())
            
            for provider, data in sorted(provider_summary.items(), key=lambda x: x[1]['total_responses'], reverse=True):
                status = "✅ ACTIVE" if data['total_responses'] > 0 else "❌ INACTIVE"
                print(f"\n{status} {provider.upper()}:")
                print(f"  Total responses: {data['total_responses']}")
                print(f"  Unique domains: {data['total_domains']}")
                print(f"  Last activity: {data['last_response']}")
                print(f"  Models in use:")
                
                for model_info in sorted(data['models'], key=lambda x: x['responses'], reverse=True):
                    interval_str = f"{model_info['avg_interval']:.1f}s avg" if model_info['avg_interval'] else "N/A"
                    print(f"    • {model_info['model']}: {model_info['responses']} responses ({interval_str})")
                
                if data['total_responses'] > 0:
                    self.working_providers.append(provider)
            
            print(f"\n🎯 SUMMARY:")
            print(f"  Total responses (6h): {total_responses}")
            print(f"  Active providers: {len(self.working_providers)}")
            print(f"  Working providers: {', '.join(self.working_providers)}")
            
            # Check for required providers that are missing
            required_providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
            self.missing_providers = [p for p in required_providers if p not in self.working_providers]
            
            if self.missing_providers:
                print(f"\n🚨 MISSING PROVIDERS:")
                for provider in self.missing_providers:
                    print(f"  ❌ {provider.upper()}: No recent activity")
            
            conn.close()
            return provider_summary
            
        except Exception as e:
            print(f"❌ Database analysis failed: {str(e)}")
            return None
    
    def test_provider_endpoints(self):
        """Test various provider endpoints to verify they're accessible"""
        print(f"\n🧪 TESTING PROVIDER ENDPOINTS")
        print("=" * 40)
        
        # Test the working providers with a simple health check
        test_endpoints = [
            ("OpenAI", "https://api.openai.com/v1/models", {"Authorization": "Bearer test"}),
            ("Anthropic", "https://api.anthropic.com/v1/messages", {"x-api-key": "test"}),
            ("DeepSeek", "https://api.deepseek.com/v1/models", {"Authorization": "Bearer test"}),
            ("Mistral", "https://api.mistral.ai/v1/models", {"Authorization": "Bearer test"}),
            ("xAI", "https://api.x.ai/v1/models", {"Authorization": "Bearer test"}),
            ("Together", "https://api.together.xyz/v1/models", {"Authorization": "Bearer test"}),
            ("Perplexity", "https://api.perplexity.ai/chat/completions", {"Authorization": "Bearer test"}),
            ("Google", "https://generativelanguage.googleapis.com/v1beta/models", {}),
            ("Cohere", "https://api.cohere.ai/v1/models", {"Authorization": "Bearer test"}),
            ("AI21", "https://api.ai21.com/studio/v1/j2-ultra/complete", {"Authorization": "Bearer test"}),
            ("Groq", "https://api.groq.com/openai/v1/models", {"Authorization": "Bearer test"})
        ]
        
        endpoint_results = {}
        
        for name, url, headers in test_endpoints:
            try:
                response = requests.get(url, headers=headers, timeout=5)
                status = "🟢 REACHABLE" if response.status_code in [200, 401, 403] else f"🔴 HTTP {response.status_code}"
                endpoint_results[name.lower()] = response.status_code
                print(f"  {status} {name}: {url}")
            except Exception as e:
                endpoint_results[name.lower()] = 0
                print(f"  🔴 UNREACHABLE {name}: {str(e)}")
        
        return endpoint_results
    
    def check_rate_limits(self):
        """Analyze rate limiting patterns from recent activity"""
        print(f"\n⚡ RATE LIMITING ANALYSIS")
        print("=" * 30)
        
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Check for rate limiting patterns (gaps in responses)
            cursor.execute("""
                WITH response_intervals AS (
                    SELECT 
                        model,
                        created_at,
                        EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY model ORDER BY created_at))) as interval_seconds
                    FROM domain_responses 
                    WHERE created_at > NOW() - INTERVAL '2 hours'
                ),
                rate_analysis AS (
                    SELECT 
                        model,
                        COUNT(*) as total_responses,
                        AVG(interval_seconds) as avg_interval,
                        MIN(interval_seconds) as min_interval,
                        MAX(interval_seconds) as max_interval,
                        STDDEV(interval_seconds) as stddev_interval
                    FROM response_intervals
                    WHERE interval_seconds IS NOT NULL
                    GROUP BY model
                )
                SELECT 
                    model,
                    total_responses,
                    ROUND(avg_interval::numeric, 2) as avg_interval,
                    ROUND(min_interval::numeric, 2) as min_interval,
                    ROUND(max_interval::numeric, 2) as max_interval,
                    ROUND(stddev_interval::numeric, 2) as stddev_interval,
                    CASE 
                        WHEN avg_interval < 1 THEN 'Very Fast'
                        WHEN avg_interval < 5 THEN 'Fast'
                        WHEN avg_interval < 15 THEN 'Medium'
                        WHEN avg_interval < 60 THEN 'Slow'
                        ELSE 'Very Slow'
                    END as speed_tier
                FROM rate_analysis
                ORDER BY avg_interval ASC
            """)
            
            rate_data = cursor.fetchall()
            
            print(f"📊 Response timing patterns (last 2 hours):")
            for model, total, avg, min_int, max_int, stddev, tier in rate_data:
                print(f"  {model}:")
                print(f"    {total} responses, {avg}s avg interval ({tier})")
                print(f"    Range: {min_int}s - {max_int}s (±{stddev}s)")
            
            conn.close()
            
        except Exception as e:
            print(f"❌ Rate limit analysis failed: {str(e)}")
    
    def generate_provider_status_report(self, provider_summary, endpoint_results):
        """Generate comprehensive provider status report"""
        print(f"\n" + "=" * 80)
        print(f"🎯 COMPREHENSIVE PROVIDER STATUS REPORT")
        print("=" * 80)
        
        all_providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
        
        print(f"\n📊 PROVIDER STATUS MATRIX:")
        print(f"{'Provider':<12} {'Database':<10} {'Endpoint':<10} {'Status':<15} {'Last Activity'}")
        print("-" * 70)
        
        for provider in all_providers:
            db_status = "✅ ACTIVE" if provider in self.working_providers else "❌ INACTIVE"
            endpoint_status = "🟢 OK" if endpoint_results.get(provider, 0) in [200, 401, 403] else "🔴 FAIL"
            
            overall_status = "WORKING" if provider in self.working_providers else "NEEDS FIX"
            
            last_activity = "Recent" if provider in self.working_providers else "None"
            if provider_summary and provider in provider_summary:
                last_activity = provider_summary[provider]['last_response'].strftime("%H:%M")
            
            print(f"{provider.upper():<12} {db_status:<10} {endpoint_status:<10} {overall_status:<15} {last_activity}")
        
        # Calculate success metrics
        working_count = len(self.working_providers)
        total_count = len(all_providers)
        success_rate = (working_count / total_count) * 100
        
        print(f"\n🎯 CRITICAL ASSESSMENT:")
        print(f"  Working providers: {working_count}/{total_count} ({success_rate:.1f}%)")
        
        if success_rate >= 90:
            print(f"  ✅ EXCELLENT: System is fully operational")
        elif success_rate >= 70:
            print(f"  🟡 GOOD: Most providers working, minor fixes needed")
        elif success_rate >= 50:
            print(f"  🟠 PARTIAL: Half providers working, significant fixes needed")
        else:
            print(f"  🔴 CRITICAL: Major system issues, immediate attention required")
        
        # Action items
        print(f"\n📋 IMMEDIATE ACTION ITEMS:")
        
        if self.missing_providers:
            print(f"  🚨 PRIORITY 1 - Fix missing providers:")
            for provider in self.missing_providers:
                print(f"     • {provider.upper()}: Add API keys and verify implementation")
        
        if working_count < total_count:
            print(f"  🔧 PRIORITY 2 - System improvements:")
            print(f"     • Test all API keys in production environment")
            print(f"     • Verify provider implementations are deployed")
            print(f"     • Check rate limiting configurations")
            print(f"     • Monitor error rates and response times")
        
        if working_count >= 8:
            print(f"  ✅ PRIORITY 3 - System optimization:")
            print(f"     • Monitor performance metrics")
            print(f"     • Optimize rate limiting for better throughput")
            print(f"     • Set up alerting for provider failures")
        
        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_data = {
            'timestamp': timestamp,
            'working_providers': self.working_providers,
            'missing_providers': self.missing_providers,
            'success_rate': success_rate,
            'provider_details': provider_summary,
            'endpoint_tests': endpoint_results
        }
        
        report_file = f"/Users/samkim/domain-runner/production_provider_status_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved: {report_file}")
        
        return report_data

def main():
    print("🚀 PRODUCTION LLM PROVIDER TESTING AGENT")
    print("Mission: Verify all 11 LLM providers are working in production")
    print("=" * 80)
    
    tester = ProductionProviderTester()
    
    # Step 1: Analyze database activity
    provider_summary = tester.analyze_database_activity()
    
    # Step 2: Test provider endpoints
    endpoint_results = tester.test_provider_endpoints()
    
    # Step 3: Check rate limiting patterns
    tester.check_rate_limits()
    
    # Step 4: Generate comprehensive report
    report = tester.generate_provider_status_report(provider_summary, endpoint_results)
    
    print(f"\n🏁 TESTING COMPLETE!")
    print(f"Result: {len(tester.working_providers)}/11 providers working")
    
    if len(tester.working_providers) >= 11:
        print(f"🎉 SUCCESS: All providers operational!")
    elif len(tester.working_providers) >= 8:
        print(f"🟡 PARTIAL SUCCESS: Most providers working")
    else:
        print(f"🔴 NEEDS WORK: Several providers require fixes")

if __name__ == "__main__":
    main()
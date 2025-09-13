#!/usr/bin/env python3
"""
FINAL LLM PROVIDER TESTING SCRIPT
Tests all 11 providers and provides deployment-ready status report
"""

import requests
import json
import time
import psycopg2
from datetime import datetime
import sys

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class FinalProviderTest:
    def __init__(self):
        self.results = {}
        self.production_providers = []
        
    def check_production_status(self):
        """Check current production status from database"""
        print("🔍 CHECKING PRODUCTION STATUS")
        print("=" * 40)
        
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Get recent activity
            cursor.execute("""
                SELECT DISTINCT 
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
                    COUNT(*) as responses,
                    MAX(created_at) as last_activity
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '6 hours'
                GROUP BY provider
                ORDER BY responses DESC
            """)
            
            self.production_providers = []
            total_responses = 0
            
            for provider, responses, last_activity in cursor.fetchall():
                self.production_providers.append(provider)
                total_responses += responses
                print(f"  ✅ {provider.upper()}: {responses} responses (last: {last_activity.strftime('%H:%M')})")
            
            print(f"\nProduction Summary:")
            print(f"  Working providers: {len(self.production_providers)}/11")
            print(f"  Total responses (6h): {total_responses}")
            
            conn.close()
            return len(self.production_providers)
            
        except Exception as e:
            print(f"❌ Database check failed: {str(e)}")
            return 0
    
    def test_api_endpoints(self):
        """Test API endpoint accessibility"""
        print(f"\n🌐 TESTING API ENDPOINTS")
        print("=" * 30)
        
        endpoints = {
            'openai': 'https://api.openai.com/v1/models',
            'anthropic': 'https://api.anthropic.com/v1/messages', 
            'deepseek': 'https://api.deepseek.com/v1/models',
            'mistral': 'https://api.mistral.ai/v1/models',
            'xai': 'https://api.x.ai/v1/models',
            'together': 'https://api.together.xyz/v1/models',
            'perplexity': 'https://api.perplexity.ai/chat/completions',
            'google': 'https://generativelanguage.googleapis.com/v1beta/models',
            'cohere': 'https://api.cohere.ai/v1/models',
            'ai21': 'https://api.ai21.com/studio/v1',
            'groq': 'https://api.groq.com/openai/v1/models'
        }
        
        accessible_count = 0
        
        for provider, url in endpoints.items():
            try:
                response = requests.head(url, timeout=5)
                # 200 = OK, 401/403 = Authentication required (endpoint exists)
                if response.status_code in [200, 401, 403]:
                    print(f"  ✅ {provider.upper()}: Accessible")
                    accessible_count += 1
                else:
                    print(f"  ⚠️  {provider.upper()}: HTTP {response.status_code}")
            except Exception as e:
                print(f"  ❌ {provider.upper()}: Unreachable")
        
        print(f"\nEndpoint Summary: {accessible_count}/11 accessible")
        return accessible_count
    
    def generate_deployment_status(self, production_count, endpoint_count):
        """Generate final deployment status and recommendations"""
        print(f"\n" + "=" * 80)
        print(f"🎯 FINAL LLM PROVIDER DEPLOYMENT STATUS")
        print("=" * 80)
        
        all_providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
        working_providers = self.production_providers
        missing_providers = [p for p in all_providers if p not in working_providers]
        
        # Status overview
        print(f"\n📊 SYSTEM OVERVIEW:")
        print(f"  Target providers: 11")
        print(f"  Production active: {production_count}/11 ({(production_count/11*100):.1f}%)")
        print(f"  Endpoints accessible: {endpoint_count}/11 ({(endpoint_count/11*100):.1f}%)")
        
        # Provider matrix
        print(f"\n📋 PROVIDER STATUS MATRIX:")
        print(f"{'Provider':<12} {'Production':<12} {'Status'}")
        print("-" * 35)
        
        for provider in all_providers:
            prod_status = "✅ ACTIVE" if provider in working_providers else "❌ MISSING"
            overall_status = "WORKING" if provider in working_providers else "NEEDS SETUP"
            print(f"{provider.upper():<12} {prod_status:<12} {overall_status}")
        
        # Critical assessment
        print(f"\n🎯 DEPLOYMENT READINESS:")
        if production_count >= 11:
            print(f"  ✅ FULLY DEPLOYED: All 11 providers operational")
            print(f"  🚀 System ready for maximum domain processing capacity")
            status = "COMPLETE"
        elif production_count >= 8:
            print(f"  🟡 MOSTLY DEPLOYED: {production_count}/11 providers working")
            print(f"  ⚠️  Minor gaps need attention for full capacity")
            status = "PARTIAL"
        elif production_count >= 5:
            print(f"  🟠 PARTIALLY DEPLOYED: {production_count}/11 providers working")
            print(f"  🔧 Significant work needed for full deployment")
            status = "INCOMPLETE"
        else:
            print(f"  🔴 MINIMAL DEPLOYMENT: Only {production_count}/11 providers working")
            print(f"  🚨 Major deployment issues - immediate attention required")
            status = "CRITICAL"
        
        # Missing provider analysis
        if missing_providers:
            print(f"\n🚨 MISSING PROVIDERS ({len(missing_providers)}):")
            for provider in missing_providers:
                print(f"  ❌ {provider.upper()}: No production activity")
            
            print(f"\n📝 REQUIRED ACTIONS:")
            print(f"  1. Verify API keys for missing providers")
            print(f"  2. Check provider implementations are deployed") 
            print(f"  3. Test provider endpoints with valid keys")
            print(f"  4. Monitor deployment until all 11 providers active")
        
        # Implementation status
        implemented_providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google']
        new_providers = ['cohere', 'ai21', 'groq']
        
        print(f"\n🛠️  IMPLEMENTATION STATUS:")
        print(f"  Existing providers: {len(implemented_providers)}/11")
        for provider in implemented_providers:
            status = "✅ ACTIVE" if provider in working_providers else "⚠️  INACTIVE"
            print(f"    {status} {provider.upper()}")
        
        print(f"  New providers: {len(new_providers)}/11")
        for provider in new_providers:
            status = "✅ ACTIVE" if provider in working_providers else "❌ NOT DEPLOYED"
            print(f"    {status} {provider.upper()}")
        
        # Performance projections
        print(f"\n📈 PERFORMANCE PROJECTIONS:")
        current_capacity = production_count * 3  # 3 prompts per provider
        max_capacity = 11 * 3  # All providers with 3 prompts
        efficiency = (current_capacity / max_capacity) * 100
        
        print(f"  Current capacity: {current_capacity}/33 responses per domain ({efficiency:.1f}%)")
        print(f"  Target capacity: 33/33 responses per domain (100%)")
        print(f"  Processing efficiency: {efficiency:.1f}% of maximum")
        
        if efficiency < 100:
            missing_responses = max_capacity - current_capacity
            print(f"  Missing responses: {missing_responses} per domain")
            print(f"  Impact: Reduced analysis depth and coverage")
        
        # Final recommendations
        print(f"\n🎯 IMMEDIATE RECOMMENDATIONS:")
        
        if status == "COMPLETE":
            print(f"  ✅ System is fully operational")
            print(f"  📊 Monitor performance and optimize as needed")
            print(f"  🔄 Set up automated health checks")
        elif status == "PARTIAL":
            print(f"  🔧 Priority: Fix {len(missing_providers)} missing providers")
            print(f"  ⚡ System can process domains but with reduced coverage")
            print(f"  📋 Deploy remaining providers within 24 hours")
        else:
            print(f"  🚨 CRITICAL: Major deployment work required")
            print(f"  🔑 Obtain API keys for missing providers immediately")
            print(f"  🛠️  Deploy provider implementations")
            print(f"  🧪 Test all providers before full deployment")
        
        # Save report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report = {
            'timestamp': timestamp,
            'status': status,
            'production_providers': production_count,
            'accessible_endpoints': endpoint_count,
            'working_providers': working_providers,
            'missing_providers': missing_providers,
            'capacity_efficiency': efficiency,
            'recommendations': {
                'priority': 'HIGH' if status in ['CRITICAL', 'INCOMPLETE'] else 'MEDIUM',
                'actions_required': len(missing_providers),
                'deployment_ready': status == 'COMPLETE'
            }
        }
        
        report_file = f"/Users/samkim/domain-runner/final_provider_status_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"\n📄 Report saved: {report_file}")
        return status, report

def main():
    print("🚀 FINAL LLM PROVIDER DEPLOYMENT TEST")
    print("Mission: Verify system readiness for 11-provider operation")
    print("=" * 80)
    
    tester = FinalProviderTest()
    
    # Check production status
    production_count = tester.check_production_status()
    
    # Test endpoint accessibility  
    endpoint_count = tester.test_api_endpoints()
    
    # Generate deployment status
    status, report = tester.generate_deployment_status(production_count, endpoint_count)
    
    print(f"\n🏁 FINAL ASSESSMENT: {status}")
    
    if status == "COMPLETE":
        print(f"✅ SUCCESS: All 11 LLM providers are operational!")
        sys.exit(0)
    elif status == "PARTIAL":
        print(f"🟡 PARTIAL SUCCESS: System working but needs completion")
        sys.exit(1)
    else:
        print(f"❌ NEEDS WORK: Significant deployment required")
        sys.exit(2)

if __name__ == "__main__":
    main()
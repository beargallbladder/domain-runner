#!/usr/bin/env python3
"""
NO BULLSHIT LLM VALIDATOR
- Tests ONLY in production (no local testing nonsense)
- Verifies data ACTUALLY gets into the database
- Provides immediate feedback on EVERY API key
- NEVER declares success without proof
"""

import psycopg2
import requests
import json
import time
from datetime import datetime, timedelta
import subprocess
import os

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class NoBullshitValidator:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.cursor = self.conn.cursor()
        self.test_domain = f"validator-test-{int(time.time())}.com"
        self.required_providers = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
                                  'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']
        
    def insert_test_domain(self):
        """Insert a test domain to process"""
        print(f"📝 Inserting test domain: {self.test_domain}")
        self.cursor.execute("""
            INSERT INTO domains (domain, status, created_at, updated_at)
            VALUES (%s, 'pending', NOW(), NOW())
            RETURNING id
        """, (self.test_domain,))
        domain_id = self.cursor.fetchone()[0]
        self.conn.commit()
        print(f"✅ Test domain inserted with ID: {domain_id}")
        return domain_id
    
    def trigger_processing(self):
        """Trigger processing via production endpoints"""
        print("\n🚀 Triggering production processing...")
        
        endpoints = [
            ("https://sophisticated-runner.onrender.com/api/process-domains-synchronized", "sophisticated-runner"),
            ("https://domain-runner.onrender.com/api/process-domains", "domain-runner"),
            ("https://domain-processor-v2.onrender.com/api/v2/process", "domain-processor-v2")
        ]
        
        triggered = False
        for url, name in endpoints:
            try:
                print(f"\n  Trying {name}...")
                response = requests.post(url, json={"limit": 1}, timeout=30)
                if response.status_code == 200:
                    print(f"  ✅ {name} triggered successfully")
                    print(f"  Response: {json.dumps(response.json(), indent=2)[:500]}")
                    triggered = True
                    break
                else:
                    print(f"  ❌ {name}: HTTP {response.status_code}")
            except Exception as e:
                print(f"  ❌ {name}: {str(e)}")
        
        return triggered
    
    def wait_and_verify(self, domain_id, timeout=300):
        """Wait for processing and verify ACTUAL database entries"""
        print(f"\n⏳ Waiting up to {timeout} seconds for responses...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            # Check for responses
            self.cursor.execute("""
                SELECT 
                    model,
                    response IS NOT NULL as has_response,
                    LENGTH(response) as response_length,
                    created_at,
                    response_time_ms
                FROM domain_responses
                WHERE domain_id = %s
                ORDER BY created_at DESC
            """, (domain_id,))
            
            responses = self.cursor.fetchall()
            
            if responses:
                print(f"\n📊 Found {len(responses)} responses after {int(time.time() - start_time)}s")
                
                # Analyze which providers responded
                provider_status = {}
                for model, has_response, length, created_at, response_time in responses:
                    # Extract provider from model
                    provider = self.extract_provider(model)
                    if provider and provider not in provider_status:
                        provider_status[provider] = {
                            'responded': has_response,
                            'response_length': length or 0,
                            'response_time_ms': response_time,
                            'timestamp': created_at
                        }
                
                # Show results
                print("\n🔍 PROVIDER STATUS (ACTUAL DATABASE VERIFICATION):")
                for provider in self.required_providers:
                    if provider in provider_status:
                        status = provider_status[provider]
                        if status['responded'] and status['response_length'] > 0:
                            print(f"  ✅ {provider}: SUCCESS - {status['response_length']} chars in {status['response_time_ms']}ms")
                        else:
                            print(f"  ❌ {provider}: FAILED - Empty response")
                    else:
                        print(f"  ❌ {provider}: NO RESPONSE AT ALL")
                
                # Calculate success
                working_providers = [p for p, s in provider_status.items() 
                                   if s['responded'] and s['response_length'] > 0]
                
                print(f"\n📈 RESULTS:")
                print(f"  Working: {len(working_providers)}/11")
                print(f"  Failed: {11 - len(working_providers)}/11")
                
                if len(working_providers) == 11:
                    print("  🎉 ALL 11 LLMs WORKING - TENSOR INTEGRITY ACHIEVED!")
                    return True, provider_status
                elif len(working_providers) >= 8:
                    print("  ⚠️  PARTIAL SUCCESS - Some providers still failing")
                else:
                    print("  ❌ CRITICAL FAILURE - Tensor badly broken")
                
                # If we have some responses, stop waiting
                if len(responses) >= 11 or time.time() - start_time > 60:
                    break
            
            time.sleep(5)
            self.conn.commit()  # Refresh connection
        
        return False, provider_status if 'provider_status' in locals() else {}
    
    def extract_provider(self, model):
        """Extract provider name from model string"""
        model_lower = model.lower()
        
        if 'gpt' in model_lower or model == 'openai':
            return 'openai'
        elif 'claude' in model_lower or model == 'anthropic':
            return 'anthropic'
        elif 'deepseek' in model_lower or model == 'deepseek':
            return 'deepseek'
        elif 'mistral' in model_lower or model == 'mistral':
            return 'mistral'
        elif 'grok' in model_lower or model == 'xai':
            return 'xai'
        elif 'llama' in model_lower and 'together' in model_lower or model == 'together':
            return 'together'
        elif 'sonar' in model_lower or 'perplexity' in model_lower:
            return 'perplexity'
        elif 'gemini' in model_lower or model == 'google':
            return 'google'
        elif 'command' in model_lower or 'cohere' in model_lower or model == 'cohere':
            return 'cohere'
        elif 'j2' in model_lower or 'ai21' in model_lower:
            return 'ai21'
        elif 'mixtral' in model_lower or 'groq' in model_lower or model == 'groq':
            return 'groq'
        
        # Try splitting by /
        if '/' in model:
            return model.split('/')[0]
        
        return model
    
    def check_api_key_status(self):
        """Check which API keys are actually configured on Render"""
        print("\n🔑 CHECKING API KEY CONFIGURATION:")
        print("(This requires checking Render dashboard manually)")
        print("\nGo to: https://dashboard.render.com")
        print("Check these services: sophisticated-runner, domain-processor-v2")
        print("\nRequired environment variables:")
        
        for provider in self.required_providers:
            key_name = f"{provider.upper()}_API_KEY"
            print(f"  - {key_name}")
            if provider in ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google']:
                print(f"  - {key_name}_2")
    
    def get_historical_analysis(self):
        """Analyze historical data to understand the problem"""
        print("\n📜 HISTORICAL ANALYSIS (Last 7 days):")
        
        self.cursor.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(DISTINCT domain_id) as domains,
                COUNT(*) as total_responses,
                COUNT(DISTINCT 
                    CASE 
                        WHEN model ILIKE '%openai%' OR model ILIKE '%gpt%' THEN 'openai'
                        WHEN model ILIKE '%anthropic%' OR model ILIKE '%claude%' THEN 'anthropic'
                        WHEN model ILIKE '%deepseek%' THEN 'deepseek'
                        WHEN model ILIKE '%mistral%' THEN 'mistral'
                        WHEN model ILIKE '%xai%' OR model ILIKE '%grok%' THEN 'xai'
                        WHEN model ILIKE '%together%' OR model ILIKE '%llama%' THEN 'together'
                        WHEN model ILIKE '%perplexity%' OR model ILIKE '%sonar%' THEN 'perplexity'
                        WHEN model ILIKE '%google%' OR model ILIKE '%gemini%' THEN 'google'
                        WHEN model ILIKE '%cohere%' OR model ILIKE '%command%' THEN 'cohere'
                        WHEN model ILIKE '%ai21%' OR model ILIKE '%j2%' THEN 'ai21'
                        WHEN model ILIKE '%groq%' OR model ILIKE '%mixtral%' THEN 'groq'
                    END
                ) as unique_providers
            FROM domain_responses
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """)
        
        for date, domains, responses, providers in self.cursor.fetchall():
            status = "✅" if providers >= 11 else "⚠️" if providers >= 8 else "❌"
            print(f"  {status} {date}: {providers}/11 providers, {domains} domains, {responses} responses")
    
    def run_full_validation(self):
        """Run the complete validation process"""
        print("🔍 NO BULLSHIT LLM VALIDATOR")
        print("=" * 60)
        print(f"Time: {datetime.now()}")
        print("\nThis will:")
        print("1. Insert a test domain into production DB")
        print("2. Trigger production processing")
        print("3. Wait and verify ACTUAL database responses")
        print("4. Report EXACTLY which LLMs are working/failing")
        print("5. NO LIES - only database truth")
        
        try:
            # Historical context
            self.get_historical_analysis()
            
            # Insert test domain
            domain_id = self.insert_test_domain()
            
            # Trigger processing
            if not self.trigger_processing():
                print("\n❌ FAILED to trigger any processing endpoint!")
                print("Possible issues:")
                print("- Services are down")
                print("- Endpoints have changed")
                print("- Authentication required")
                return False
            
            # Wait and verify
            success, provider_status = self.wait_and_verify(domain_id)
            
            # API key guidance
            if not success:
                self.check_api_key_status()
                
                print("\n🔧 TO FIX THE BROKEN PROVIDERS:")
                failed_providers = [p for p in self.required_providers 
                                  if p not in provider_status or 
                                  not provider_status[p].get('responded')]
                
                for provider in failed_providers:
                    if provider == 'ai21':
                        print(f"\n{provider.upper()}: Never worked - needs new API key")
                        print("  Get key: https://studio.ai21.com/account/api-keys")
                    elif provider == 'perplexity':
                        print(f"\n{provider.upper()}: Stopped July 9 - key expired")
                        print("  Get key: https://www.perplexity.ai/settings/api")
                    elif provider == 'xai':
                        print(f"\n{provider.upper()}: Stopped July 10 - key expired")
                        print("  Get key: https://console.x.ai/")
                    else:
                        print(f"\n{provider.upper()}: Check API key and implementation")
            
            # Clean up test domain
            self.cursor.execute(
                "UPDATE domains SET status = 'test_complete' WHERE id = %s", 
                (domain_id,)
            )
            self.conn.commit()
            
            return success
            
        except Exception as e:
            print(f"\n💥 VALIDATION FAILED: {str(e)}")
            return False
        finally:
            self.conn.close()

def main():
    validator = NoBullshitValidator()
    success = validator.run_full_validation()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ VALIDATION PASSED - All 11 LLMs working!")
    else:
        print("❌ VALIDATION FAILED - Fix the broken providers!")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())
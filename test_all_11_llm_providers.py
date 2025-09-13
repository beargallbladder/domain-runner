#!/usr/bin/env python3
"""
CRITICAL MISSION: Test ALL 11 LLM providers with real API calls
LLM Provider Testing Agent - Comprehensive Testing System

MUST TEST THESE EXACT PROVIDERS:
1. OpenAI (multiple keys)
2. Anthropic (multiple keys)  
3. DeepSeek (multiple keys)
4. Mistral (multiple keys)
5. xAI (multiple keys)
6. Together (multiple keys)
7. Perplexity (multiple keys)
8. Google (multiple keys)
9. Cohere (multiple keys) - MISSING
10. AI21 (multiple keys) - MISSING
11. Groq (multiple keys) - MISSING

For each provider:
- Test API key validity
- Make actual API call with our business_analysis prompt
- Verify response format and content
- Test rate limiting and error handling
- Record response times
"""

import requests
import json
import time
import sys
import psycopg2
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Production database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Business analysis prompt - the exact one used in production
BUSINESS_ANALYSIS_PROMPT = "Analyze the business model and market position of example.com. Include target market, revenue model, competitive advantages, and growth potential. Provide specific insights about their industry positioning and strategic opportunities."

class LLMProviderTester:
    def __init__(self):
        self.results = {}
        self.total_working = 0
        self.total_failed = 0
        self.start_time = time.time()
        
        # API keys from environment/render.yaml
        self.api_configs = {
            'openai': {
                'keys': [
                    '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',
                    # Additional keys would be loaded from environment
                ],
                'models': ['gpt-4o-mini', 'gpt-3.5-turbo'],
                'endpoint': 'https://api.openai.com/v1/chat/completions',
                'tier': 'medium'
            },
            'anthropic': {
                'keys': [
                    'sk-ant-api03-jZa-W0Cyk3Z_s7vF_dLYJkP2YYiclqS0d8M-dO15s_j4fPFnNu_kFPXnCx3aK-pD-O8D3_DVqFMZ0rBJJ6Kg5g-x2nA8AAA',
                ],
                'models': ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229'],
                'endpoint': 'https://api.anthropic.com/v1/messages',
                'tier': 'slow'
            },
            'deepseek': {
                'keys': [
                    'sk-a03c67f1fdd74c139faa0ad69b44a0fa',
                ],
                'models': ['deepseek-chat'],
                'endpoint': 'https://api.deepseek.com/v1/chat/completions',
                'tier': 'fast'
            },
            'mistral': {
                'keys': [
                    'ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z',
                ],
                'models': ['mistral-small-latest', 'mistral-tiny'],
                'endpoint': 'https://api.mistral.ai/v1/chat/completions',
                'tier': 'medium'
            },
            'xai': {
                'keys': [
                    'xai-TvMNjOdmQG8wFYI8nplKvopQlflnCSDo1fwmUl7XzQ9TLXrGZcJ4OJnJXGRRn7pjP7VKJBHQAyU4Yonc',
                ],
                'models': ['grok-beta'],
                'endpoint': 'https://api.x.ai/v1/chat/completions',
                'tier': 'fast'
            },
            'together': {
                'keys': [
                    '9e3ba0c46dd44a97d19bb02c86bc79fdbbbe4acdad62c3c088c96cc08758c8f4',
                ],
                'models': ['meta-llama/Llama-3-8b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
                'endpoint': 'https://api.together.xyz/v1/chat/completions',
                'tier': 'fast'
            },
            'perplexity': {
                'keys': [
                    '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',
                ],
                'models': ['mistral-7b-instruct', 'sonar-small-online'],
                'endpoint': 'https://api.perplexity.ai/chat/completions',
                'tier': 'fast'
            },
            'google': {
                'keys': [
                    'AIzaSyDi-i8I9BiL7E36skCmR6BQXNO7Y5LHnxg',
                ],
                'models': ['gemini-1.5-flash', 'gemini-pro'],
                'endpoint': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
                'tier': 'slow'
            },
            # MISSING PROVIDERS - These need to be added
            'cohere': {
                'keys': [
                    # Need to add Cohere API keys
                ],
                'models': ['command', 'command-light'],
                'endpoint': 'https://api.cohere.ai/v1/generate',
                'tier': 'medium'
            },
            'ai21': {
                'keys': [
                    # Need to add AI21 API keys  
                ],
                'models': ['j2-ultra', 'j2-mid'],
                'endpoint': 'https://api.ai21.com/studio/v1/j2-ultra/complete',
                'tier': 'medium'
            },
            'groq': {
                'keys': [
                    # Need to add Groq API keys
                ],
                'models': ['mixtral-8x7b-32768', 'llama2-70b-4096'],
                'endpoint': 'https://api.groq.com/openai/v1/chat/completions',
                'tier': 'fast'
            }
        }

    def test_openai(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test OpenAI API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500,
                    'temperature': 0.7
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_anthropic(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Anthropic API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers={
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('content', [{}])[0].get('text', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_deepseek(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test DeepSeek API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.deepseek.com/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_mistral(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Mistral API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.mistral.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_xai(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test xAI API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.x.ai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_together(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Together API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.together.xyz/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_perplexity(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Perplexity API"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.perplexity.ai/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_google(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Google API"""
        start_time = time.time()
        try:
            endpoint = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
            response = requests.post(
                endpoint,
                headers={'Content-Type': 'application/json'},
                json={
                    'contents': [{'parts': [{'text': BUSINESS_ANALYSIS_PROMPT}]}],
                    'generationConfig': {'maxOutputTokens': 500}
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_cohere(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Cohere API - MISSING PROVIDER"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.cohere.ai/v1/generate',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'prompt': BUSINESS_ANALYSIS_PROMPT,
                    'max_tokens': 500,
                    'temperature': 0.7
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('generations', [{}])[0].get('text', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_ai21(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test AI21 API - MISSING PROVIDER"""
        start_time = time.time()
        try:
            response = requests.post(
                f'https://api.ai21.com/studio/v1/{model}/complete',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'prompt': BUSINESS_ANALYSIS_PROMPT,
                    'maxTokens': 500,
                    'temperature': 0.7
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('completions', [{}])[0].get('data', {}).get('text', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_groq(self, key: str, model: str) -> Tuple[bool, str, float, dict]:
        """Test Groq API - MISSING PROVIDER"""
        start_time = time.time()
        try:
            response = requests.post(
                'https://api.groq.com/openai/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': model,
                    'messages': [{'role': 'user', 'content': BUSINESS_ANALYSIS_PROMPT}],
                    'max_tokens': 500,
                    'temperature': 0.7
                },
                timeout=30
            )
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                return True, content, response_time, data
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                return False, f"HTTP {response.status_code}: {error_data.get('error', {}).get('message', response.text)}", response_time, {}
        except Exception as e:
            return False, str(e), time.time() - start_time, {}

    def test_provider(self, provider_name: str) -> dict:
        """Test a specific provider with all its keys and models"""
        print(f"\n🧪 TESTING {provider_name.upper()}")
        print("=" * 50)
        
        config = self.api_configs[provider_name]
        test_function = getattr(self, f'test_{provider_name}')
        
        provider_results = {
            'provider': provider_name,
            'tier': config['tier'],
            'keys_tested': 0,
            'keys_working': 0,
            'models_tested': 0,
            'models_working': 0,
            'total_tests': 0,
            'successful_tests': 0,
            'failed_tests': 0,
            'average_response_time': 0,
            'test_results': [],
            'errors': [],
            'working_combinations': []
        }
        
        if not config['keys'] or not config['keys'][0]:
            print(f"❌ No API keys configured for {provider_name}")
            provider_results['errors'].append(f"No API keys configured for {provider_name}")
            return provider_results
        
        total_response_time = 0
        
        for key_idx, key in enumerate(config['keys']):
            if not key:
                continue
                
            provider_results['keys_tested'] += 1
            key_working = False
            
            for model in config['models']:
                provider_results['models_tested'] += 1
                provider_results['total_tests'] += 1
                
                print(f"  Testing {provider_name} key {key_idx + 1} with {model}...")
                
                success, content, response_time, raw_data = test_function(key, model)
                total_response_time += response_time
                
                test_result = {
                    'key_index': key_idx + 1,
                    'model': model,
                    'success': success,
                    'response_time': response_time,
                    'content_length': len(content) if success else 0,
                    'error': content if not success else None
                }
                
                provider_results['test_results'].append(test_result)
                
                if success:
                    provider_results['successful_tests'] += 1
                    provider_results['working_combinations'].append(f"{model} (key {key_idx + 1})")
                    key_working = True
                    print(f"    ✅ Success: {len(content)} chars, {response_time:.2f}s")
                else:
                    provider_results['failed_tests'] += 1
                    provider_results['errors'].append(f"{model} (key {key_idx + 1}): {content}")
                    print(f"    ❌ Failed: {content}")
                
                # Small delay between tests to avoid rate limiting
                time.sleep(1)
            
            if key_working:
                provider_results['keys_working'] += 1
        
        # Calculate averages
        if provider_results['total_tests'] > 0:
            provider_results['average_response_time'] = total_response_time / provider_results['total_tests']
            provider_results['models_working'] = len(set(combo.split(' (')[0] for combo in provider_results['working_combinations']))
        
        # Summary
        success_rate = (provider_results['successful_tests'] / provider_results['total_tests']) * 100 if provider_results['total_tests'] > 0 else 0
        print(f"\n📊 {provider_name.upper()} SUMMARY:")
        print(f"  Keys working: {provider_results['keys_working']}/{provider_results['keys_tested']}")
        print(f"  Models working: {provider_results['models_working']}/{len(config['models'])}")
        print(f"  Success rate: {success_rate:.1f}% ({provider_results['successful_tests']}/{provider_results['total_tests']})")
        print(f"  Average response time: {provider_results['average_response_time']:.2f}s")
        
        if provider_results['working_combinations']:
            print(f"  ✅ Working: {', '.join(provider_results['working_combinations'])}")
        
        return provider_results

    def run_all_tests(self):
        """Run tests for all 11 providers"""
        print("🚀 LLM PROVIDER TESTING AGENT")
        print("CRITICAL MISSION: Test ALL 11 LLM providers with real API calls")
        print("=" * 80)
        
        all_providers = [
            'openai', 'anthropic', 'deepseek', 'mistral', 'xai', 
            'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq'
        ]
        
        working_providers = []
        failed_providers = []
        
        for provider in all_providers:
            try:
                result = self.test_provider(provider)
                self.results[provider] = result
                
                if result['successful_tests'] > 0:
                    working_providers.append(provider)
                    self.total_working += 1
                else:
                    failed_providers.append(provider)
                    self.total_failed += 1
                    
            except Exception as e:
                print(f"❌ CRITICAL ERROR testing {provider}: {str(e)}")
                failed_providers.append(provider)
                self.total_failed += 1
                self.results[provider] = {
                    'provider': provider,
                    'error': str(e),
                    'successful_tests': 0,
                    'total_tests': 0
                }
        
        self.generate_final_report(working_providers, failed_providers)

    def generate_final_report(self, working_providers: List[str], failed_providers: List[str]):
        """Generate comprehensive final report"""
        total_time = time.time() - self.start_time
        
        print("\n" + "=" * 80)
        print("🎯 FINAL LLM PROVIDER TEST REPORT")
        print("=" * 80)
        
        print(f"\n📊 OVERALL RESULTS:")
        print(f"  Total providers tested: 11")
        print(f"  Working providers: {self.total_working}")
        print(f"  Failed providers: {self.total_failed}")
        print(f"  Success rate: {(self.total_working/11)*100:.1f}%")
        print(f"  Total test time: {total_time:.2f}s")
        
        if working_providers:
            print(f"\n✅ WORKING PROVIDERS ({len(working_providers)}/11):")
            for provider in working_providers:
                result = self.results[provider]
                print(f"  ✅ {provider.upper()}: {result.get('successful_tests', 0)}/{result.get('total_tests', 0)} tests passed")
                if result.get('working_combinations'):
                    print(f"     Models: {', '.join(result['working_combinations'])}")
        
        if failed_providers:
            print(f"\n❌ FAILED PROVIDERS ({len(failed_providers)}/11):")
            for provider in failed_providers:
                result = self.results.get(provider, {})
                error_summary = result.get('error', 'No working API keys or models')
                print(f"  ❌ {provider.upper()}: {error_summary}")
        
        # Performance metrics
        print(f"\n⚡ PERFORMANCE METRICS:")
        for provider in working_providers:
            result = self.results[provider]
            avg_time = result.get('average_response_time', 0)
            tier = result.get('tier', 'unknown')
            print(f"  {provider.upper()}: {avg_time:.2f}s avg ({tier} tier)")
        
        # Critical assessment
        print(f"\n🎯 CRITICAL ASSESSMENT:")
        if self.total_working >= 11:
            print("  🎉 SUCCESS: All 11 LLM providers are working!")
            print("  🚀 System is ready for full-scale domain processing")
        elif self.total_working >= 8:
            print("  🟡 PARTIAL SUCCESS: Most providers working")
            print("  ⚠️  Missing providers need immediate attention")
            print("  📝 Add missing API keys to complete system")
        else:
            print("  ❌ CRITICAL FAILURE: System not ready")
            print("  🚨 Too many providers failing")
            print("  🔧 Immediate fixes required before deployment")
        
        # Missing providers action items
        missing_providers = ['cohere', 'ai21', 'groq']
        missing_in_failed = [p for p in missing_providers if p in failed_providers]
        
        if missing_in_failed:
            print(f"\n🚨 MISSING PROVIDERS REQUIRING API KEYS:")
            for provider in missing_in_failed:
                print(f"  ❌ {provider.upper()}: No working API keys found")
            print(f"\n📝 ACTION REQUIRED:")
            print(f"  1. Obtain API keys for: {', '.join(missing_in_failed)}")
            print(f"  2. Add keys to environment variables")
            print(f"  3. Add provider implementations to domain-processor-v2")
            print(f"  4. Re-run this test to verify all 11 providers work")
        
        # Database integration check
        print(f"\n🔍 CHECKING DATABASE INTEGRATION:")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Check recent provider activity
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
                    COUNT(*) as responses
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '24 hours'
                GROUP BY provider
                ORDER BY provider
            """)
            
            db_providers = cursor.fetchall()
            print(f"  Database shows {len(db_providers)} active providers in last 24h:")
            for provider, count in db_providers:
                print(f"    {provider}: {count} responses")
            
            conn.close()
            
        except Exception as e:
            print(f"  ⚠️  Could not check database: {str(e)}")
        
        print(f"\n📋 NEXT STEPS:")
        if self.total_working < 11:
            print(f"  1. Fix failed providers immediately")
            print(f"  2. Add missing API keys to Render environment")
            print(f"  3. Implement missing provider classes")
            print(f"  4. Re-run test until all 11 providers work")
            print(f"  5. Deploy updated system")
        else:
            print(f"  1. ✅ All providers working - system ready!")
            print(f"  2. Monitor provider performance in production")
            print(f"  3. Set up alerts for provider failures")
            print(f"  4. Begin full-scale domain processing")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"/Users/samkim/domain-runner/llm_provider_test_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'total_providers': 11,
                'working_providers': self.total_working,
                'failed_providers': self.total_failed,
                'test_duration': total_time,
                'detailed_results': self.results,
                'working_provider_list': working_providers,
                'failed_provider_list': failed_providers
            }, f, indent=2)
        
        print(f"\n📄 Detailed report saved: {report_file}")

def main():
    """Main execution function"""
    print("🔥 Starting LLM Provider Testing Agent...")
    
    tester = LLMProviderTester()
    tester.run_all_tests()
    
    print("\n🏁 LLM Provider Testing Complete!")

if __name__ == "__main__":
    main()
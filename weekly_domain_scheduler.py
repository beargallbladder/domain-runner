#!/usr/bin/env python3
"""
🚀 BRAND MEMORY INTELLIGENCE SCHEDULER
=====================================
Weekly budget runs + Bi-weekly premium depth
Automated, clean, and handles API issues gracefully
"""

import asyncio
import aiohttp
import psycopg2
import schedule
import time
import logging
from datetime import datetime, timedelta
from collections import defaultdict
import json
import random
import os
import openai
from anthropic import AsyncAnthropic
import google.generativeai as genai
from aiohttp import web

# Setup logging with fun emojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler('brand_intelligence.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

# 💰 BUDGET MODELS - Weekly runs (Sundays)
WEEKLY_BUDGET_MODELS = [
    'claude-3-haiku-20240307',    # Ultra-cheap champion  
    'gpt-4o-mini',                # OpenAI efficient
    'gemini-1.5-flash',           # Google fast
    'mistral-small-2402',         # Mistral cheap
    'llama-3.1-sonar-small-128k-online',  # Perplexity cheap
    'grok-beta',                  # xAI affordable
    'meta-llama/Llama-2-7b-chat-hf',  # Together AI cheap
]

# 🔥 PREMIUM MODELS - Bi-weekly runs (Wednesdays)  
BIWEEKLY_PREMIUM_MODELS = [
    'gpt-4o',                     # OpenAI flagship
    'claude-3-5-sonnet-20241022', # Anthropic current best
    'gpt-4-turbo'                 # OpenAI enhanced
]

# ⏱️ RATE LIMITS per provider (seconds between calls)
RATE_LIMITS = {
    # Anthropic Claude
    'claude-3-haiku-20240307': 12,
    'claude-3-5-sonnet-20241022': 15,
    'claude-3-opus-20240229': 20,
    
    # OpenAI
    'gpt-4o-mini': 6,
    'gpt-4o': 10,
    'gpt-4-turbo': 12,
    'gpt-3.5-turbo': 4,
    
    # Google
    'gemini-1.5-flash': 8,
    'gemini-1.5-pro': 15,
    
    # Mistral
    'mistral-small-2402': 8,
    'mistral-medium': 12,
    'mistral-large': 15,
    
    # Perplexity
    'llama-3.1-sonar-small-128k-online': 5,
    'llama-3.1-sonar-large-128k-online': 8,
    
    # xAI
    'grok-beta': 10,
    'grok-vision-beta': 12,
    
    # Together AI
    'meta-llama/Llama-2-7b-chat-hf': 4,
    'meta-llama/Llama-3-8b-chat-hf': 5,
    'mistralai/Mixtral-8x7B-Instruct-v0.1': 8,
    
    # Default for unknown models
    'default': 10
}

# 🔑 API Configuration
class APIConfig:
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY') 
        self.google_api_key = os.getenv('GOOGLE_API_KEY')
        self.deepseek_api_key = os.getenv('DEEPSEEK_API_KEY')
        self.mistral_api_key = os.getenv('MISTRAL_API_KEY')
        self.perplexity_api_key = os.getenv('PERPLEXITY_API_KEY')
        self.xai_api_key = os.getenv('XAI_API_KEY')
        self.together_api_key = os.getenv('TOGETHER_API_KEY')
        
        # Initialize clients
        self.openai_client = openai.AsyncOpenAI(api_key=self.openai_api_key) if self.openai_api_key else None
        self.anthropic_client = AsyncAnthropic(api_key=self.anthropic_api_key) if self.anthropic_api_key else None
        
        if self.google_api_key:
            genai.configure(api_key=self.google_api_key)
        
        self.validate_keys()
    
    def validate_keys(self):
        """Check which API keys are available"""
        available = []
        missing = []
        
        if self.openai_api_key:
            available.append("OpenAI")
        else:
            missing.append("OPENAI_API_KEY")
            
        if self.anthropic_api_key:
            available.append("Anthropic")
        else:
            missing.append("ANTHROPIC_API_KEY")
            
        if self.google_api_key:
            available.append("Google")
        else:
            missing.append("GOOGLE_API_KEY")
            
        if self.mistral_api_key:
            available.append("Mistral")
        else:
            missing.append("MISTRAL_API_KEY")
            
        if self.perplexity_api_key:
            available.append("Perplexity")
        else:
            missing.append("PERPLEXITY_API_KEY")
            
        if self.xai_api_key:
            available.append("xAI")
        else:
            missing.append("XAI_API_KEY")
            
        if self.together_api_key:
            available.append("Together AI")
        else:
            missing.append("TOGETHER_API_KEY")
        
        logger.info(f"🔑 Available APIs: {', '.join(available) if available else 'None'}")
        if missing:
            logger.warning(f"🔑 Missing API keys: {', '.join(missing)}")
            logger.warning("💡 Set environment variables or the scheduler will skip those models")

# 📝 CORE PROMPT TYPES (same as your existing)
CORE_PROMPTS = {
    'business_analysis': 'Analyze this company from a business perspective: {domain}. What is their core business model, target market, competitive advantages, and strategic positioning? Provide specific insights about their operations, revenue streams, and market presence.',
    'content_strategy': 'Evaluate the content strategy and digital presence of {domain}. How do they communicate with their audience, what is their brand voice, and how effective is their marketing approach? Analyze their content quality and engagement strategies.',
    'technical_assessment': 'Assess the technical capabilities and innovation profile of {domain}. What technologies do they use, what is their technical expertise, and how do they approach innovation? Analyze their technical strengths and digital infrastructure.'
}

class BrandIntelligenceScheduler:
    def __init__(self):
        self.conn = psycopg2.connect(DATABASE_URL)
        self.api_key_issues = []
        self.last_run_stats = {}
        self.api_config = APIConfig()
        
        logger.info("🚀 Brand Intelligence Scheduler initialized!")
        logger.info("📅 Weekly budget runs: Sundays")
        logger.info("💎 Premium depth runs: Bi-weekly Wednesdays")
        
    async def weekly_budget_run(self):
        """Weekly Sunday runs with budget models"""
        logger.info("📅 STARTING WEEKLY BUDGET RUN")
        logger.info("=" * 50)
        logger.info(f"🗓️ Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        logger.info(f"💰 Models: {len(WEEKLY_BUDGET_MODELS)} budget models")
        logger.info(f"📝 Prompts: {len(CORE_PROMPTS)} core prompt types")
        
        return await self._run_analysis(
            models=WEEKLY_BUDGET_MODELS,
            run_type="Weekly Budget",
            emoji="💰"
        )
    
    async def biweekly_premium_run(self):
        """Bi-weekly Wednesday runs with premium models"""
        logger.info("💎 STARTING BI-WEEKLY PREMIUM RUN")
        logger.info("=" * 50)
        logger.info(f"🗓️ Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        logger.info(f"🔥 Models: {len(BIWEEKLY_PREMIUM_MODELS)} premium models")
        logger.info(f"📝 Prompts: {len(CORE_PROMPTS)} core prompt types")
        
        return await self._run_analysis(
            models=BIWEEKLY_PREMIUM_MODELS,
            run_type="Bi-weekly Premium",
            emoji="💎"
        )
    
    async def test_run(self, domain_count=10):
        """Small test run with limited domains to validate API keys and functionality"""
        logger.info("🧪 STARTING TEST RUN")
        logger.info("=" * 50)
        logger.info(f"🗓️ Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        logger.info(f"🧪 Test mode: {domain_count} domains only")
        logger.info(f"💰 Models: {len(WEEKLY_BUDGET_MODELS)} budget models")
        logger.info(f"📝 Prompts: {len(CORE_PROMPTS)} core prompt types")
        
        return await self._run_analysis(
            models=WEEKLY_BUDGET_MODELS,
            run_type="Test Run",
            emoji="🧪",
            limit_domains=domain_count
        )
    
    async def _run_analysis(self, models, run_type, emoji, limit_domains=None):
        """Core analysis runner"""
        start_time = time.time()
        
        # Get all active domains
        domains = self._get_active_domains(limit=limit_domains)
        total_calls = len(domains) * len(models) * len(CORE_PROMPTS)
        
        if limit_domains:
            logger.info(f"🧪 TEST MODE: Limited to {len(domains)} domains")
        logger.info(f"🎯 Scope: {len(domains)} domains")
        logger.info(f"🔢 Total API calls: {total_calls}")
        logger.info(f"💵 Estimated cost: ${self._estimate_cost(models, total_calls):.2f}")
        
        success_count = 0
        error_count = 0
        api_issues = []
        
        # Process in batches of 10 domains
        BATCH_SIZE = 10
        total_batches = (len(domains) + BATCH_SIZE - 1) // BATCH_SIZE
        
        async with aiohttp.ClientSession() as session:
            for i in range(0, len(domains), BATCH_SIZE):
                batch = domains[i:i + BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                
                logger.info(f"{emoji} Processing Batch {batch_num}/{total_batches}")
                logger.info(f"📦 Domains: {[d[1] for d in batch[:3]]}{'...' if len(batch) > 3 else ''}")
                
                batch_start = time.time()
                batch_results = await self._process_batch(session, batch, models)
                batch_time = time.time() - batch_start
                
                # Update counts
                for result in batch_results:
                    if result['success']:
                        success_count += 1
                    else:
                        error_count += 1
                        if 'api_key' in result.get('error', '').lower():
                            api_issues.append(result)
                
                logger.info(f"✅ Batch {batch_num} complete in {batch_time:.1f}s")
                logger.info(f"📊 Progress: {batch_num * BATCH_SIZE}/{len(domains)} domains")
                
                # Rate limiting between batches
                if batch_num < total_batches:
                    await asyncio.sleep(2)
        
        # Calculate final stats
        total_time = time.time() - start_time
        
        # Save run stats
        self.last_run_stats = {
            'run_type': run_type,
            'date': datetime.now().isoformat(),
            'domains_processed': len(domains),
            'total_calls': total_calls,
            'success_count': success_count,
            'error_count': error_count,
            'duration_minutes': total_time / 60,
            'api_issues': len(api_issues)
        }
        
        # Final report
        logger.info(f"\n{emoji} {run_type.upper()} COMPLETE!")
        logger.info("=" * 50)
        logger.info(f"✅ Successful calls: {success_count}")
        logger.info(f"❌ Failed calls: {error_count}")
        logger.info(f"⏱️ Total time: {total_time/60:.1f} minutes")
        logger.info(f"💰 Success rate: {success_count/(success_count+error_count)*100:.1f}%")
        
        if api_issues:
            logger.warning(f"🔑 API KEY ISSUES DETECTED: {len(api_issues)} calls failed")
            logger.warning("💡 Please check and update API keys!")
            self.api_key_issues.extend(api_issues)
        
        # Trigger cache population
        logger.info("🔄 Triggering cache population...")
        await self._trigger_cache_update()
        
        return self.last_run_stats
    
    async def _process_batch(self, session, domains_batch, models):
        """Process a batch of domains with given models"""
        tasks = []
        
        for domain_id, domain in domains_batch:
            for model in models:
                for prompt_type, prompt_template in CORE_PROMPTS.items():
                    prompt = prompt_template.format(domain=domain)
                    
                    task = self._call_llm_api(session, domain_id, domain, model, prompt_type, prompt)
                    tasks.append(task)
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results and save to database
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                processed_results.append({
                    'success': False,
                    'error': str(result)
                })
            else:
                if result['success']:
                    self._save_response(result)
                processed_results.append(result)
        
        return processed_results
    
    async def _call_llm_api(self, session, domain_id, domain, model, prompt_type, prompt):
        """Call LLM API with REAL providers and proper error handling"""
        try:
            # Rate limiting with provider-specific delays
            base_delay = RATE_LIMITS.get(model, RATE_LIMITS['default'])
            actual_delay = base_delay + random.uniform(-1, 2)
            await asyncio.sleep(max(actual_delay, 2))
            
            logger.info(f"📡 API call: {model} → {prompt_type} → {domain}")
            
            # 🤖 REAL API CALLS by provider
            if model.startswith('gpt-') or model.startswith('chatgpt'):
                api_result = await self._call_openai(model, prompt, prompt_type, domain)
            elif model.startswith('claude-'):
                api_result = await self._call_anthropic(model, prompt, prompt_type, domain)
            elif model.startswith('gemini-'):
                api_result = await self._call_google(model, prompt, prompt_type, domain)
            elif model.startswith('deepseek'):
                api_result = await self._call_deepseek(model, prompt, prompt_type, domain)
            elif model.startswith('mistral-'):
                api_result = await self._call_mistral(model, prompt, prompt_type, domain)
            elif model.startswith('llama-') and 'sonar' in model:
                api_result = await self._call_perplexity(model, prompt, prompt_type, domain)
            elif model.startswith('grok-'):
                api_result = await self._call_xai(model, prompt, prompt_type, domain)
            elif model.startswith('meta-llama/') or model.startswith('mistralai/') or 'together' in model.lower():
                api_result = await self._call_together(model, prompt, prompt_type, domain)
            else:
                raise Exception(f"Unknown model provider: {model}")
            
            # Add standard fields
            api_result.update({
                'domain_id': domain_id,
                'domain': domain,
                'prompt': prompt
            })
            
            return api_result
            
        except Exception as e:
            logger.error(f"❌ API error for {domain} with {model}: {e}")
            return {
                'success': False,
                'domain': domain,
                'model': model,
                'domain_id': domain_id,
                'error': str(e)
            }
    
    async def _call_openai(self, model, prompt, prompt_type, domain):
        """Call OpenAI API"""
        if not self.api_config.openai_client:
            raise Exception("OpenAI API key not configured")
            
        response = await self.api_config.openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            temperature=0.3
        )
        
        # Calculate cost based on OpenAI pricing
        prompt_tokens = response.usage.prompt_tokens
        completion_tokens = response.usage.completion_tokens
        
        # Pricing per 1K tokens (as of 2024)
        pricing = {
            'gpt-4o': {'input': 0.005, 'output': 0.015},
            'gpt-4o-mini': {'input': 0.00015, 'output': 0.0006},
            'gpt-4-turbo': {'input': 0.01, 'output': 0.03},
            'gpt-3.5-turbo': {'input': 0.0005, 'output': 0.0015}
        }
        
        rates = pricing.get(model, pricing['gpt-3.5-turbo'])
        cost = (prompt_tokens * rates['input'] / 1000) + (completion_tokens * rates['output'] / 1000)
        
        return {
            'success': True,
            'model': model,
            'prompt_type': prompt_type,
            'response': response.choices[0].message.content,
            'token_count': response.usage.total_tokens,
            'cost': cost
        }
        
    async def _call_anthropic(self, model, prompt, prompt_type, domain):
        """Call Anthropic Claude API"""
        if not self.api_config.anthropic_client:
            raise Exception("Anthropic API key not configured")
            
        response = await self.api_config.anthropic_client.messages.create(
            model=model,
            max_tokens=1500,
            temperature=0.3,
            system="You are a business intelligence analyst providing detailed company analysis.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # Calculate cost based on Anthropic pricing
        input_tokens = response.usage.input_tokens
        output_tokens = response.usage.output_tokens
        
        # Pricing per 1K tokens (as of 2024)
        pricing = {
            'claude-3-haiku-20240307': {'input': 0.00025, 'output': 0.00125},
            'claude-3-5-sonnet-20241022': {'input': 0.003, 'output': 0.015},
            'claude-3-opus-20240229': {'input': 0.015, 'output': 0.075}
        }
        
        rates = pricing.get(model, pricing['claude-3-haiku-20240307'])
        cost = (input_tokens * rates['input'] / 1000) + (output_tokens * rates['output'] / 1000)
        
        return {
            'success': True,
            'model': model,
            'prompt_type': prompt_type,
            'response': response.content[0].text,
            'token_count': input_tokens + output_tokens,
            'cost': cost
        }
        
    async def _call_google(self, model, prompt, prompt_type, domain):
        """Call Google Gemini API"""
        if not self.api_config.google_api_key:
            raise Exception("Google API key not configured")
            
        # Initialize model
        if model == 'gemini-1.5-flash':
            google_model = genai.GenerativeModel('gemini-1.5-flash')
        elif model == 'gemini-1.5-pro':
            google_model = genai.GenerativeModel('gemini-1.5-pro')
        else:
            google_model = genai.GenerativeModel('gemini-pro')
            
        # Configure generation
        generation_config = genai.types.GenerationConfig(
            temperature=0.3,
            max_output_tokens=1500,
        )
        
        system_prompt = "You are a business intelligence analyst providing detailed company analysis."
        full_prompt = f"{system_prompt}\n\n{prompt}"
        
        response = await google_model.generate_content_async(
            full_prompt,
            generation_config=generation_config
        )
        
        # Estimate cost for Google (simplified pricing)
        estimated_tokens = len(response.text.split()) * 1.3
        cost = estimated_tokens * 0.00025 / 1000  # Rough estimate
        
        return {
            'success': True,
            'model': model,
            'prompt_type': prompt_type,
            'response': response.text,
            'token_count': int(estimated_tokens),
            'cost': cost
        }
        
    async def _call_deepseek(self, model, prompt, prompt_type, domain):
        """Call DeepSeek API"""
        if not self.api_config.deepseek_api_key:
            raise Exception("DeepSeek API key not configured")
            
        headers = {
            'Authorization': f'Bearer {self.api_config.deepseek_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            'max_tokens': 1500,
            'temperature': 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.deepseek.com/v1/chat/completions', 
                                  headers=headers, json=data) as response:
                result = await response.json()
                
                if response.status != 200:
                    raise Exception(f"DeepSeek API error: {result}")
                
                # Calculate cost (DeepSeek is very cheap)
                usage = result.get('usage', {})
                prompt_tokens = usage.get('prompt_tokens', 100)
                completion_tokens = usage.get('completion_tokens', 100)
                cost = (prompt_tokens + completion_tokens) * 0.00014 / 1000  # $0.14 per 1M tokens
                
                return {
                    'success': True,
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': result['choices'][0]['message']['content'],
                    'token_count': usage.get('total_tokens', prompt_tokens + completion_tokens),
                    'cost': cost
                }
                
    async def _call_mistral(self, model, prompt, prompt_type, domain):
        """Call Mistral API"""
        if not self.api_config.mistral_api_key:
            raise Exception("Mistral API key not configured")
            
        headers = {
            'Authorization': f'Bearer {self.api_config.mistral_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            'max_tokens': 1500,
            'temperature': 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.mistral.ai/v1/chat/completions', 
                                  headers=headers, json=data) as response:
                result = await response.json()
                
                if response.status != 200:
                    raise Exception(f"Mistral API error: {result}")
                
                # Calculate cost (Mistral pricing)
                usage = result.get('usage', {})
                prompt_tokens = usage.get('prompt_tokens', 100)
                completion_tokens = usage.get('completion_tokens', 100)
                
                # Mistral pricing per 1M tokens
                if model == 'mistral-small-2402':
                    cost = (prompt_tokens * 0.2 + completion_tokens * 0.6) / 1000000
                else:
                    cost = (prompt_tokens * 0.5 + completion_tokens * 1.5) / 1000000
                
                return {
                    'success': True,
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': result['choices'][0]['message']['content'],
                    'token_count': usage.get('total_tokens', prompt_tokens + completion_tokens),
                    'cost': cost
                }
                
    async def _call_perplexity(self, model, prompt, prompt_type, domain):
        """Call Perplexity API"""
        if not self.api_config.perplexity_api_key:
            raise Exception("Perplexity API key not configured")
            
        headers = {
            'Authorization': f'Bearer {self.api_config.perplexity_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            'max_tokens': 1500,
            'temperature': 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.perplexity.ai/chat/completions', 
                                  headers=headers, json=data) as response:
                result = await response.json()
                
                if response.status != 200:
                    raise Exception(f"Perplexity API error: {result}")
                
                # Calculate cost (Perplexity pricing)
                usage = result.get('usage', {})
                prompt_tokens = usage.get('prompt_tokens', 100)
                completion_tokens = usage.get('completion_tokens', 100)
                
                # Perplexity pricing per 1M tokens
                if 'small' in model:
                    cost = (prompt_tokens * 0.2 + completion_tokens * 0.2) / 1000000
                else:
                    cost = (prompt_tokens * 1.0 + completion_tokens * 1.0) / 1000000
                
                return {
                    'success': True,
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': result['choices'][0]['message']['content'],
                    'token_count': usage.get('total_tokens', prompt_tokens + completion_tokens),
                    'cost': cost
                }
                
    async def _call_xai(self, model, prompt, prompt_type, domain):
        """Call xAI API"""
        if not self.api_config.xai_api_key:
            raise Exception("xAI API key not configured")
            
        headers = {
            'Authorization': f'Bearer {self.api_config.xai_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            'max_tokens': 1500,
            'temperature': 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.x.ai/v1/chat/completions', 
                                  headers=headers, json=data) as response:
                result = await response.json()
                
                if response.status != 200:
                    raise Exception(f"xAI API error: {result}")
                
                # Calculate cost (xAI pricing)
                usage = result.get('usage', {})
                prompt_tokens = usage.get('prompt_tokens', 100)
                completion_tokens = usage.get('completion_tokens', 100)
                
                # xAI pricing per 1M tokens (Grok is relatively affordable)
                cost = (prompt_tokens * 5.0 + completion_tokens * 15.0) / 1000000
                
                return {
                    'success': True,
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': result['choices'][0]['message']['content'],
                    'token_count': usage.get('total_tokens', prompt_tokens + completion_tokens),
                    'cost': cost
                }
                
    async def _call_together(self, model, prompt, prompt_type, domain):
        """Call Together AI API"""
        if not self.api_config.together_api_key:
            raise Exception("Together AI API key not configured")
            
        headers = {
            'Authorization': f'Bearer {self.api_config.together_api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'model': model,
            'messages': [
                {"role": "system", "content": "You are a business intelligence analyst providing detailed company analysis."},
                {"role": "user", "content": prompt}
            ],
            'max_tokens': 1500,
            'temperature': 0.3
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.together.xyz/v1/chat/completions', 
                                  headers=headers, json=data) as response:
                result = await response.json()
                
                if response.status != 200:
                    raise Exception(f"Together AI API error: {result}")
                
                # Calculate cost (Together AI pricing - very competitive)
                usage = result.get('usage', {})
                prompt_tokens = usage.get('prompt_tokens', 100)
                completion_tokens = usage.get('completion_tokens', 100)
                
                # Together AI pricing per 1M tokens (very cheap for open models)
                if 'llama-2-7b' in model.lower():
                    cost = (prompt_tokens * 0.2 + completion_tokens * 0.2) / 1000000
                elif 'llama-3-8b' in model.lower():
                    cost = (prompt_tokens * 0.3 + completion_tokens * 0.3) / 1000000
                elif 'mixtral' in model.lower():
                    cost = (prompt_tokens * 0.6 + completion_tokens * 0.6) / 1000000
                else:
                    cost = (prompt_tokens * 0.4 + completion_tokens * 0.4) / 1000000
                
                return {
                    'success': True,
                    'model': model,
                    'prompt_type': prompt_type,
                    'response': result['choices'][0]['message']['content'],
                    'token_count': usage.get('total_tokens', prompt_tokens + completion_tokens),
                    'cost': cost
                }
    
    def _save_response(self, result):
        """Save response to database"""
        cursor = self.conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO responses (
                    domain_id, model, prompt_type, interpolated_prompt,
                    raw_response, token_count, prompt_tokens, completion_tokens,
                    total_cost_usd, captured_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, (
                result['domain_id'],
                result['model'],
                result['prompt_type'],
                result['prompt'],
                result['response'],
                result['token_count'],
                int(result['token_count'] * 0.7),  # Estimated prompt tokens
                int(result['token_count'] * 0.3),  # Estimated completion tokens
                result['cost']
            ))
            
            self.conn.commit()
            return True
            
        except Exception as e:
            logger.error(f"❌ Database error: {e}")
            self.conn.rollback()
            return False
    
    def _get_active_domains(self, limit=None):
        """Get all active domains for processing"""
        cursor = self.conn.cursor()
        
        query = """
            SELECT id, domain
            FROM domains
            WHERE status = 'completed'
            ORDER BY domain
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query)
        
        domains = cursor.fetchall()
        if limit:
            logger.info(f"🧪 Found {len(domains)} domains (test mode - limited to {limit})")
        else:
            logger.info(f"📊 Found {len(domains)} active domains")
        return domains
    
    def _estimate_cost(self, models, total_calls):
        """Estimate cost for the run using real pricing"""
        total_cost = 0
        
        # Average cost per call by model (rough estimates for 1500 tokens)
        cost_per_call = {
            # OpenAI
            'gpt-4o': 0.03,              # Premium flagship
            'gpt-4o-mini': 0.0008,       # Budget champion
            'gpt-4-turbo': 0.04,         # Enhanced premium
            'gpt-3.5-turbo': 0.002,      # Legacy budget
            
            # Anthropic
            'claude-3-5-sonnet-20241022': 0.025,  # Current best
            'claude-3-haiku-20240307': 0.001,     # Ultra cheap
            'claude-3-opus-20240229': 0.08,       # Most expensive
            
            # Google
            'gemini-1.5-flash': 0.0005,  # Very cheap
            'gemini-1.5-pro': 0.006,     # Mid-tier
            
            # DeepSeek
            'deepseek-coder': 0.0002,    # Extremely cheap
            'deepseek-chat': 0.0002,     # Extremely cheap
            
            # Mistral
            'mistral-small-2402': 0.0008,  # Very cheap
            'mistral-medium': 0.003,       # Mid-tier
            'mistral-large': 0.012,        # Premium
            
            # Perplexity
            'llama-3.1-sonar-small-128k-online': 0.0003,  # Super cheap
            'llama-3.1-sonar-large-128k-online': 0.0015,  # Cheap
            
            # xAI
            'grok-beta': 0.008,          # Affordable
            'grok-vision-beta': 0.015,   # Mid-tier
            
            # Together AI
            'meta-llama/Llama-2-7b-chat-hf': 0.0002,  # Super cheap
            'meta-llama/Llama-3-8b-chat-hf': 0.0003,  # Super cheap
            'mistralai/Mixtral-8x7B-Instruct-v0.1': 0.0006  # Very cheap
        }
        
        calls_per_model = total_calls // len(models)
        
        for model in models:
            model_cost = cost_per_call.get(model, 0.002)  # Default fallback
            total_cost += model_cost * calls_per_model
        
        return total_cost
    
    async def _trigger_cache_update(self):
        """Trigger cache population after data collection"""
        try:
            # This would trigger your cache population scheduler
            logger.info("📊 Cache update triggered - new data will be available within 6 hours")
        except Exception as e:
            logger.error(f"❌ Cache trigger failed: {e}")
    
    def get_status(self):
        """Get scheduler status"""
        return {
            'scheduler_status': 'Active',
            'weekly_runs': 'Sundays (Budget models)',
            'biweekly_runs': 'Every other Wednesday (Premium models)',
            'last_run': self.last_run_stats,
            'api_issues': len(self.api_key_issues),
            'next_weekly': self._get_next_sunday(),
            'next_premium': self._get_next_biweekly_wednesday()
        }
    
    def _get_next_sunday(self):
        """Get next Sunday date"""
        today = datetime.now()
        days_ahead = 6 - today.weekday()  # Sunday is 6
        if days_ahead <= 0:
            days_ahead += 7
        return (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
    
    def _get_next_biweekly_wednesday(self):
        """Get next bi-weekly Wednesday"""
        today = datetime.now()
        days_ahead = 2 - today.weekday()  # Wednesday is 2
        if days_ahead <= 0:
            days_ahead += 7
        next_wed = today + timedelta(days=days_ahead)
        
        # Check if it's a bi-weekly Wednesday (simplified logic)
        week_number = next_wed.isocalendar()[1]
        if week_number % 2 == 0:  # Even weeks
            return next_wed.strftime('%Y-%m-%d')
        else:
            return (next_wed + timedelta(days=7)).strftime('%Y-%m-%d')

async def start_scheduler_with_web_server():
    """Start the automated scheduler with web server for health checks"""
    scheduler = BrandIntelligenceScheduler()
    
    # Start web server for health checks
    web_runner = await start_web_server()
    
    # Schedule weekly budget runs (Sundays at 10 AM)
    schedule.every().sunday.at("10:00").do(
        lambda: asyncio.run(scheduler.weekly_budget_run())
    )
    
    # Schedule bi-weekly premium runs (every other Wednesday at 2 PM)
    schedule.every(2).weeks.at("14:00").do(
        lambda: asyncio.run(scheduler.biweekly_premium_run())
    )
    
    logger.info("🎯 SCHEDULER STARTED!")
    logger.info("📅 Weekly budget runs: Sundays at 10:00 AM")
    logger.info("💎 Premium depth runs: Bi-weekly Wednesdays at 2:00 PM")
    logger.info(f"⏰ Next weekly run: {scheduler._get_next_sunday()}")
    logger.info(f"💎 Next premium run: {scheduler._get_next_biweekly_wednesday()}")
    
    try:
        # Keep scheduler running
        while True:
            schedule.run_pending()
            await asyncio.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("🛑 Scheduler stopped")
        await web_runner.cleanup()

def start_scheduler():
    """Legacy sync version - start the automated scheduler"""
    asyncio.run(start_scheduler_with_web_server())

# Manual run functions
async def run_weekly_now():
    """Run weekly analysis immediately"""
    scheduler = BrandIntelligenceScheduler()
    return await scheduler.weekly_budget_run()

async def run_premium_now():
    """Run premium analysis immediately"""
    scheduler = BrandIntelligenceScheduler()
    return await scheduler.biweekly_premium_run()

async def run_test_now(domain_count=10):
    """Run small test with limited domains"""
    scheduler = BrandIntelligenceScheduler()
    return await scheduler.test_run(domain_count)

# Health endpoint for Render deployment
async def health_handler(request):
    """Health check endpoint for Render"""
    scheduler = BrandIntelligenceScheduler()
    status = scheduler.get_status()
    
    return web.json_response({
        'status': 'healthy',
        'service': 'weekly-domain-scheduler',
        'timestamp': datetime.now().isoformat(),
        'scheduler_info': status,
        'database_connected': True  # We initialize with DB connection
    })

async def run_weekly_handler(request):
    """Trigger weekly budget run via HTTP"""
    logger.info("🚀 Manual weekly run triggered via HTTP")
    try:
        scheduler = BrandIntelligenceScheduler()
        result = await scheduler.weekly_budget_run()
        return web.json_response({
            'status': 'success',
            'message': 'Weekly budget run completed',
            'result': result
        })
    except Exception as e:
        logger.error(f"❌ Weekly run failed: {e}")
        return web.json_response({
            'status': 'error',
            'message': f'Weekly run failed: {str(e)}'
        }, status=500)

async def run_premium_handler(request):
    """Trigger premium run via HTTP"""
    logger.info("🔥 Manual premium run triggered via HTTP")
    try:
        scheduler = BrandIntelligenceScheduler()
        result = await scheduler.biweekly_premium_run()
        return web.json_response({
            'status': 'success',
            'message': 'Premium run completed',
            'result': result
        })
    except Exception as e:
        logger.error(f"❌ Premium run failed: {e}")
        return web.json_response({
            'status': 'error',
            'message': f'Premium run failed: {str(e)}'
        }, status=500)

def create_web_app():
    """Create web app with health and trigger endpoints"""
    app = web.Application()
    app.router.add_get('/health', health_handler)
    app.router.add_post('/run/weekly', run_weekly_handler)
    app.router.add_post('/run/premium', run_premium_handler)
    return app

async def start_web_server():
    """Start web server for health checks"""
    app = create_web_app()
    runner = web.AppRunner(app)
    await runner.setup()
    
    port = int(os.environ.get('PORT', 8080))
    site = web.TCPSite(runner, '0.0.0.0', port)
    await site.start()
    
    logger.info(f"🌐 Web server started on port {port}")
    logger.info(f"🏥 Health endpoint: http://0.0.0.0:{port}/health")
    
    return runner

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "weekly":
            asyncio.run(run_weekly_now())
        elif sys.argv[1] == "premium":
            asyncio.run(run_premium_now())
        elif sys.argv[1] == "test":
            # Allow custom domain count for test: python3 weekly_domain_scheduler.py test 5
            domain_count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
            asyncio.run(run_test_now(domain_count))
        elif sys.argv[1] == "status":
            scheduler = BrandIntelligenceScheduler()
            print(json.dumps(scheduler.get_status(), indent=2))
        else:
            print("🚀 Brand Memory Intelligence Scheduler")
            print("Usage:")
            print("  python3 weekly_domain_scheduler.py                    # Start automated scheduler")
            print("  python3 weekly_domain_scheduler.py test [count]       # Test run (default: 10 domains)")
            print("  python3 weekly_domain_scheduler.py weekly             # Manual weekly run")
            print("  python3 weekly_domain_scheduler.py premium            # Manual premium run")
            print("  python3 weekly_domain_scheduler.py status             # Check status")
    else:
        start_scheduler() 
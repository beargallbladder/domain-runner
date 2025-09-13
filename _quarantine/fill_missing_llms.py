#!/usr/bin/env python3
"""
🔥 FILL MISSING LLMs - Complete the incomplete tensor data
Fires only the missing LLM providers for domains that don't have all 11
"""

import psycopg2
import asyncio
import aiohttp
import os
import json
from datetime import datetime
from typing import List, Dict, Set
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# Required LLM providers
REQUIRED_PROVIDERS = ['openai', 'anthropic', 'deepseek', 'mistral', 'xai', 'together', 'perplexity', 'google', 'cohere', 'ai21', 'groq']

# Prompts to process
PROMPTS = [
    {'type': 'business_analysis', 'content': 'Analyze the business potential and market position of {domain}. Provide comprehensive insights.'},
    {'type': 'content_strategy', 'content': 'Develop a content and SEO strategy for {domain}. Include competitive analysis.'},
    {'type': 'technical_assessment', 'content': 'Assess the technical implementation and infrastructure needs for {domain}.'}
]

# Provider configurations
PROVIDER_CONFIGS = {
    'openai': {
        'url': 'https://api.openai.com/v1/chat/completions',
        'model': 'gpt-4o-mini',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("OPENAI_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'anthropic': {
        'url': 'https://api.anthropic.com/v1/messages',
        'model': 'claude-3-haiku-20240307',
        'headers_fn': lambda: {'x-api-key': os.getenv('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'deepseek': {
        'url': 'https://api.deepseek.com/v1/chat/completions',
        'model': 'deepseek-chat',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("DEEPSEEK_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'mistral': {
        'url': 'https://api.mistral.ai/v1/chat/completions',
        'model': 'mistral-small-latest',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("MISTRAL_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'xai': {
        'url': 'https://api.x.ai/v1/chat/completions',
        'model': 'grok-beta',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("XAI_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'together': {
        'url': 'https://api.together.xyz/v1/chat/completions',
        'model': 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("TOGETHER_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'perplexity': {
        'url': 'https://api.perplexity.ai/chat/completions',
        'model': 'llama-3.1-sonar-large-128k-online',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("PERPLEXITY_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    },
    'google': {
        'url': lambda: f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={os.getenv("GOOGLE_API_KEY")}',
        'model': 'gemini-1.5-pro',
        'headers_fn': lambda: {'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'contents': [{'parts': [{'text': prompt}]}], 'generationConfig': {'maxOutputTokens': 500}}
    },
    'cohere': {
        'url': 'https://api.cohere.ai/v1/chat',
        'model': 'command-r-plus',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("COHERE_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'message': prompt, 'max_tokens': 500}
    },
    'ai21': {
        'url': 'https://api.ai21.com/studio/v1/j2-light/complete',
        'model': 'j2-light',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("AI21_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'prompt': prompt, 'maxTokens': 500}
    },
    'groq': {
        'url': 'https://api.groq.com/openai/v1/chat/completions',
        'model': 'llama-3.1-70b-versatile',
        'headers_fn': lambda: {'Authorization': f'Bearer {os.getenv("GROQ_API_KEY")}', 'Content-Type': 'application/json'},
        'body_fn': lambda prompt, model: {'model': model, 'messages': [{'role': 'user', 'content': prompt}], 'max_tokens': 500}
    }
}

async def query_llm(session: aiohttp.ClientSession, provider: str, prompt: str) -> str:
    """Query a specific LLM provider"""
    config = PROVIDER_CONFIGS.get(provider)
    if not config:
        return None
    
    # Check if API key exists
    api_key_name = f"{provider.upper()}_API_KEY"
    if not os.getenv(api_key_name):
        logger.warning(f"No API key for {provider}")
        return None
    
    try:
        url = config['url']() if callable(config['url']) else config['url']
        headers = config['headers_fn']()
        body = config['body_fn'](prompt, config['model'])
        
        async with session.post(url, headers=headers, json=body, timeout=aiohttp.ClientTimeout(total=120)) as response:
            if response.status == 200:
                data = await response.json()
                
                # Extract response based on provider format
                if provider == 'openai':
                    return data.get('choices', [{}])[0].get('message', {}).get('content')
                elif provider == 'anthropic':
                    return data.get('content', [{}])[0].get('text')
                elif provider == 'google':
                    return data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
                elif provider == 'cohere':
                    return data.get('text')
                elif provider == 'ai21':
                    return data.get('completions', [{}])[0].get('data', {}).get('text')
                else:  # Standard OpenAI-compatible format
                    return data.get('choices', [{}])[0].get('message', {}).get('content')
            else:
                logger.error(f"{provider} error: {response.status}")
                return None
    except Exception as e:
        logger.error(f"{provider} exception: {str(e)}")
        return None

async def process_missing_llms(domain_id: int, domain: str, missing_providers: List[str]):
    """Process only the missing LLM providers for a domain"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    batch_id = f"fill_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{domain_id}"
    successful_providers = []
    
    async with aiohttp.ClientSession() as session:
        for prompt in PROMPTS:
            prompt_content = prompt['content'].format(domain=domain)
            
            # Process only missing providers
            tasks = []
            for provider in missing_providers:
                tasks.append((provider, query_llm(session, provider, prompt_content)))
            
            # Execute in parallel
            results = await asyncio.gather(*[task[1] for task in tasks])
            
            # Store successful responses
            for i, (provider, result) in enumerate(zip([t[0] for t in tasks], results)):
                if result:
                    try:
                        cur.execute("""
                            INSERT INTO domain_responses (
                                domain_id, model, prompt_type, response, created_at,
                                response_time_ms, retry_count, quality_flag, 
                                processing_timestamp, batch_id
                            ) VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s, NOW(), %s)
                        """, (
                            domain_id,
                            f"{provider}/{PROVIDER_CONFIGS[provider]['model']}",
                            prompt['type'],
                            result,
                            0,  # response_time_ms (not tracked in this script)
                            0,  # retry_count
                            'backfill',
                            batch_id
                        ))
                        if provider not in successful_providers:
                            successful_providers.append(provider)
                        logger.info(f"✅ {domain} - {provider} - {prompt['type']}")
                    except Exception as e:
                        logger.error(f"DB error for {domain} - {provider}: {str(e)}")
    
    conn.commit()
    conn.close()
    return successful_providers

async def main():
    """Main function to fill missing LLMs"""
    logger.info("🔥 STARTING MISSING LLM FILL PROCESS")
    
    # Load API keys from render.yaml environment
    os.environ['OPENAI_API_KEY'] = os.getenv('OPENAI_API_KEY', '')
    os.environ['ANTHROPIC_API_KEY'] = os.getenv('ANTHROPIC_API_KEY', '')
    os.environ['DEEPSEEK_API_KEY'] = os.getenv('DEEPSEEK_API_KEY', '')
    os.environ['MISTRAL_API_KEY'] = os.getenv('MISTRAL_API_KEY', '')
    os.environ['XAI_API_KEY'] = os.getenv('XAI_API_KEY', '')
    os.environ['TOGETHER_API_KEY'] = os.getenv('TOGETHER_API_KEY', '')
    os.environ['PERPLEXITY_API_KEY'] = os.getenv('PERPLEXITY_API_KEY', '')
    os.environ['GOOGLE_API_KEY'] = os.getenv('GOOGLE_API_KEY', '')
    os.environ['COHERE_API_KEY'] = os.getenv('COHERE_API_KEY', '')
    os.environ['AI21_API_KEY'] = os.getenv('AI21_API_KEY', '')
    os.environ['GROQ_API_KEY'] = os.getenv('GROQ_API_KEY', '')
    
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Find domains with incomplete LLM coverage
    logger.info("🔍 Finding domains with incomplete LLM coverage...")
    
    cur.execute("""
        SELECT d.id, d.domain, array_agg(DISTINCT 
            CASE 
                WHEN dr.model ILIKE '%openai%' OR dr.model = 'openai' THEN 'openai'
                WHEN dr.model ILIKE '%anthropic%' OR dr.model = 'anthropic' THEN 'anthropic'
                WHEN dr.model ILIKE '%deepseek%' OR dr.model = 'deepseek' THEN 'deepseek'
                WHEN dr.model ILIKE '%mistral%' OR dr.model = 'mistral' THEN 'mistral'
                WHEN dr.model ILIKE '%xai%' OR dr.model = 'xai' THEN 'xai'
                WHEN dr.model ILIKE '%together%' OR dr.model = 'together' THEN 'together'
                WHEN dr.model ILIKE '%perplexity%' OR dr.model = 'perplexity' THEN 'perplexity'
                WHEN dr.model ILIKE '%google%' OR dr.model = 'google' THEN 'google'
                WHEN dr.model ILIKE '%cohere%' OR dr.model = 'cohere' THEN 'cohere'
                WHEN dr.model ILIKE '%ai21%' OR dr.model = 'ai21' THEN 'ai21'
                WHEN dr.model ILIKE '%groq%' OR dr.model = 'groq' THEN 'groq'
            END
        ) as existing_providers
        FROM domains d
        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
        WHERE d.status = 'completed'
        GROUP BY d.id, d.domain
        HAVING COUNT(DISTINCT 
            CASE 
                WHEN dr.model ILIKE '%openai%' OR dr.model = 'openai' THEN 'openai'
                WHEN dr.model ILIKE '%anthropic%' OR dr.model = 'anthropic' THEN 'anthropic'
                WHEN dr.model ILIKE '%deepseek%' OR dr.model = 'deepseek' THEN 'deepseek'
                WHEN dr.model ILIKE '%mistral%' OR dr.model = 'mistral' THEN 'mistral'
                WHEN dr.model ILIKE '%xai%' OR dr.model = 'xai' THEN 'xai'
                WHEN dr.model ILIKE '%together%' OR dr.model = 'together' THEN 'together'
                WHEN dr.model ILIKE '%perplexity%' OR dr.model = 'perplexity' THEN 'perplexity'
                WHEN dr.model ILIKE '%google%' OR dr.model = 'google' THEN 'google'
                WHEN dr.model ILIKE '%cohere%' OR dr.model = 'cohere' THEN 'cohere'
                WHEN dr.model ILIKE '%ai21%' OR dr.model = 'ai21' THEN 'ai21'
                WHEN dr.model ILIKE '%groq%' OR dr.model = 'groq' THEN 'groq'
            END
        ) < 11
        ORDER BY d.id
        LIMIT 100
    """)
    
    incomplete_domains = cur.fetchall()
    logger.info(f"📊 Found {len(incomplete_domains)} domains with incomplete coverage")
    
    if not incomplete_domains:
        logger.info("✅ All domains have complete LLM coverage!")
        return
    
    # Process each domain
    processed = 0
    for domain_id, domain, existing_providers in incomplete_domains:
        # Filter out None values and find missing providers
        existing = set(p for p in existing_providers if p)
        missing = set(REQUIRED_PROVIDERS) - existing
        
        if missing:
            logger.info(f"\n🔧 Processing {domain} (ID: {domain_id})")
            logger.info(f"   Existing: {existing}")
            logger.info(f"   Missing: {missing}")
            
            successful = await process_missing_llms(domain_id, domain, list(missing))
            processed += 1
            
            logger.info(f"   ✅ Filled: {successful}")
    
    conn.close()
    
    logger.info(f"\n🏁 FILL PROCESS COMPLETE")
    logger.info(f"   Processed {processed} domains")
    logger.info(f"   Check tensor integrity after completion")

if __name__ == "__main__":
    asyncio.run(main())
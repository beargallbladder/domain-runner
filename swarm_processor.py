#!/usr/bin/env python3
"""
Domain Swarm Processor - Process domains with multiple LLMs in parallel
"""

import os
import asyncio
import aiohttp
import psycopg2
from psycopg2.extras import RealDictCursor
import json
import time
from datetime import datetime
import numpy as np
from concurrent.futures import ThreadPoolExecutor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
DB_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

# API configurations
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
TOGETHER_API_KEY = os.getenv('TOGETHER_API_KEY')
PERPLEXITY_API_KEY = os.getenv('PERPLEXITY_API_KEY')

# Model configurations
MODELS = {
    'openai': {
        'api_key': OPENAI_API_KEY,
        'base_url': 'https://api.openai.com/v1/chat/completions',
        'models': ['gpt-4o-mini', 'gpt-3.5-turbo'],
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'anthropic': {
        'api_key': ANTHROPIC_API_KEY,
        'base_url': 'https://api.anthropic.com/v1/messages',
        'models': ['claude-3-haiku-20240307'],
        'headers': lambda key: {
            'x-api-key': key,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        }
    },
    'groq': {
        'api_key': GROQ_API_KEY,
        'base_url': 'https://api.groq.com/openai/v1/chat/completions',
        'models': ['mixtral-8x7b-32768', 'llama2-70b-4096'],
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    },
    'together': {
        'api_key': TOGETHER_API_KEY,
        'base_url': 'https://api.together.xyz/v1/chat/completions',
        'models': ['meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
        'headers': lambda key: {
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json'
        }
    }
}

# Prompts for domain analysis
PROMPTS = {
    'business_analysis': """Analyze the domain {domain} for business potential. Consider:
1. Market opportunity and size
2. Revenue potential
3. Competition landscape
4. Target audience
5. Business model viability
Provide a concise assessment in 200-300 words.""",
    
    'content_strategy': """Develop a content strategy for {domain}. Include:
1. Key content pillars
2. Content types and formats
3. Publishing frequency
4. SEO opportunities
5. Engagement tactics
Provide actionable recommendations in 200-300 words.""",
    
    'technical_assessment': """Evaluate technical requirements for {domain}. Cover:
1. Infrastructure needs
2. Technology stack recommendations
3. Security considerations
4. Scalability requirements
5. Integration possibilities
Provide technical guidance in 200-300 words."""
}

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(DB_URL)

async def call_openai_api(session, model, prompt, domain):
    """Call OpenAI API"""
    if not OPENAI_API_KEY:
        return None
    
    config = MODELS['openai']
    url = config['base_url']
    headers = config['headers'](config['api_key'])
    
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': 'You are a domain analysis expert.'},
            {'role': 'user', 'content': prompt.format(domain=domain)}
        ],
        'max_tokens': 500,
        'temperature': 0.7
    }
    
    try:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data['choices'][0]['message']['content']
            else:
                logger.error(f"OpenAI API error: {response.status}")
                return None
    except Exception as e:
        logger.error(f"OpenAI API exception: {e}")
        return None

async def call_anthropic_api(session, model, prompt, domain):
    """Call Anthropic API"""
    if not ANTHROPIC_API_KEY:
        return None
    
    config = MODELS['anthropic']
    url = config['base_url']
    headers = config['headers'](config['api_key'])
    
    payload = {
        'model': model,
        'messages': [
            {'role': 'user', 'content': prompt.format(domain=domain)}
        ],
        'max_tokens': 500
    }
    
    try:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data['content'][0]['text']
            else:
                logger.error(f"Anthropic API error: {response.status}")
                return None
    except Exception as e:
        logger.error(f"Anthropic API exception: {e}")
        return None

async def call_groq_api(session, model, prompt, domain):
    """Call Groq API"""
    if not GROQ_API_KEY:
        return None
    
    config = MODELS['groq']
    url = config['base_url']
    headers = config['headers'](config['api_key'])
    
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': 'You are a domain analysis expert.'},
            {'role': 'user', 'content': prompt.format(domain=domain)}
        ],
        'max_tokens': 500,
        'temperature': 0.7
    }
    
    try:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data['choices'][0]['message']['content']
            else:
                logger.error(f"Groq API error: {response.status}")
                return None
    except Exception as e:
        logger.error(f"Groq API exception: {e}")
        return None

async def call_together_api(session, model, prompt, domain):
    """Call Together API"""
    if not TOGETHER_API_KEY:
        return None
    
    config = MODELS['together']
    url = config['base_url']
    headers = config['headers'](config['api_key'])
    
    payload = {
        'model': model,
        'messages': [
            {'role': 'system', 'content': 'You are a domain analysis expert.'},
            {'role': 'user', 'content': prompt.format(domain=domain)}
        ],
        'max_tokens': 500,
        'temperature': 0.7
    }
    
    try:
        async with session.post(url, headers=headers, json=payload) as response:
            if response.status == 200:
                data = await response.json()
                return data['choices'][0]['message']['content']
            else:
                logger.error(f"Together API error: {response.status}")
                return None
    except Exception as e:
        logger.error(f"Together API exception: {e}")
        return None

async def process_domain_with_model(session, domain_id, domain, provider, model, prompt_type, prompt):
    """Process a single domain with a specific model"""
    logger.info(f"Processing {domain} with {provider}/{model} for {prompt_type}")
    
    # Route to appropriate API
    if provider == 'openai':
        response = await call_openai_api(session, model, prompt, domain)
    elif provider == 'anthropic':
        response = await call_anthropic_api(session, model, prompt, domain)
    elif provider == 'groq':
        response = await call_groq_api(session, model, prompt, domain)
    elif provider == 'together':
        response = await call_together_api(session, model, prompt, domain)
    else:
        response = None
    
    if response:
        # Store response in database
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO domain_responses (domain_id, model, prompt_type, response, created_at)
                VALUES (%s, %s, %s, %s, %s)
            """, (domain_id, f"{provider}/{model}", prompt_type, response, datetime.now()))
            conn.commit()
            logger.info(f"Stored response for {domain} - {provider}/{model} - {prompt_type}")
        except Exception as e:
            logger.error(f"Database error storing response: {e}")
            conn.rollback()
        finally:
            cur.close()
            conn.close()
    
    return response

def calculate_volatility_score(responses):
    """Calculate volatility score based on response variations"""
    if not responses or len(responses) < 2:
        return 0.0
    
    # Simple volatility calculation based on response length variations
    lengths = [len(str(r)) for r in responses if r]
    if len(lengths) < 2:
        return 0.0
    
    mean_length = np.mean(lengths)
    std_length = np.std(lengths)
    volatility = (std_length / mean_length) * 100 if mean_length > 0 else 0
    
    return round(volatility, 2)

async def process_domain_batch(domains):
    """Process a batch of domains in parallel"""
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        for domain_row in domains:
            domain_id = domain_row['id']
            domain = domain_row['domain']
            
            # Create tasks for all provider/model/prompt combinations
            for provider, config in MODELS.items():
                if config['api_key']:  # Only use providers with API keys
                    for model in config['models']:
                        for prompt_type, prompt in PROMPTS.items():
                            task = process_domain_with_model(
                                session, domain_id, domain, provider, model, prompt_type, prompt
                            )
                            tasks.append(task)
        
        # Process all tasks in parallel
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Calculate volatility scores for each domain
        for domain_row in domains:
            domain_id = domain_row['id']
            
            # Get all responses for this domain
            conn = get_db_connection()
            cur = conn.cursor()
            try:
                cur.execute("""
                    SELECT response FROM domain_responses 
                    WHERE domain_id = %s
                """, (domain_id,))
                domain_responses = [row[0] for row in cur.fetchall()]
                
                # Calculate volatility
                volatility = calculate_volatility_score(domain_responses)
                
                # Update domain with volatility score and mark as completed
                cur.execute("""
                    UPDATE domains 
                    SET status = 'completed', 
                        volatility_score = %s,
                        processed_at = %s
                    WHERE id = %s
                """, (volatility, datetime.now(), domain_id))
                conn.commit()
                
                logger.info(f"Completed {domain_row['domain']} with volatility score: {volatility}")
            except Exception as e:
                logger.error(f"Error updating domain status: {e}")
                conn.rollback()
            finally:
                cur.close()
                conn.close()

def get_pending_domains(batch_size=5):
    """Get pending domains from database"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""
            SELECT id, domain 
            FROM domains 
            WHERE status = 'pending' 
            ORDER BY id 
            LIMIT %s
        """, (batch_size,))
        domains = cur.fetchall()
        return domains
    finally:
        cur.close()
        conn.close()

def get_stats():
    """Get processing statistics"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(*) as total
            FROM domains
        """)
        stats = cur.fetchone()
        return {
            'pending': stats[0],
            'completed': stats[1],
            'total': stats[2]
        }
    finally:
        cur.close()
        conn.close()

async def main():
    """Main processing loop"""
    logger.info("Starting Domain Swarm Processor")
    
    # Check API keys
    active_providers = []
    for provider, config in MODELS.items():
        if config['api_key']:
            active_providers.append(provider)
            logger.info(f"✓ {provider} API key found")
        else:
            logger.warning(f"✗ {provider} API key missing")
    
    if not active_providers:
        logger.error("No API keys found! Please set environment variables.")
        return
    
    # Processing loop
    batch_size = 5
    total_processed = 0
    
    while True:
        # Get current stats
        stats = get_stats()
        logger.info(f"Stats - Pending: {stats['pending']}, Completed: {stats['completed']}, Total: {stats['total']}")
        
        if stats['pending'] == 0:
            logger.info("All domains processed! 🎉")
            break
        
        # Get next batch
        domains = get_pending_domains(batch_size)
        if not domains:
            logger.info("No more pending domains")
            break
        
        logger.info(f"Processing batch of {len(domains)} domains...")
        start_time = time.time()
        
        # Process batch
        await process_domain_batch(domains)
        
        elapsed = time.time() - start_time
        total_processed += len(domains)
        
        logger.info(f"Batch completed in {elapsed:.2f}s. Total processed: {total_processed}")
        
        # Small delay between batches
        await asyncio.sleep(2)
    
    logger.info(f"Processing complete! Total domains processed: {total_processed}")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
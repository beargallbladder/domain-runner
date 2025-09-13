#!/usr/bin/env python3
"""
Enterprise-Grade Domain Crawler with Intelligent Rate Limiting
Swarm-based architecture that respects individual LLM constraints
"""

import asyncio
import aiohttp
from datetime import datetime, timedelta
import psycopg2
from psycopg2.pool import ThreadedConnectionPool
import json
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import time
from enum import Enum
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Database configuration - use the correct production URL
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class LLMProvider(Enum):
    """LLM Provider identifiers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    DEEPSEEK = "deepseek"
    MISTRAL = "mistral"
    XAI = "xai"
    TOGETHER = "together"
    PERPLEXITY = "perplexity"
    GOOGLE = "google"
    COHERE = "cohere"
    AI21 = "ai21"
    GROQ = "groq"

@dataclass
class RateLimitConfig:
    """Rate limit configuration for each provider"""
    requests_per_minute: int
    requests_per_hour: int
    concurrent_requests: int
    retry_after_seconds: int = 60
    backoff_multiplier: float = 1.5
    max_retries: int = 3

@dataclass
class LLMConfig:
    """Complete configuration for an LLM provider"""
    provider: LLMProvider
    url: str
    model: str
    rate_limits: RateLimitConfig
    headers_builder: callable
    body_builder: callable
    response_extractor: callable
    priority: int = 5  # 1-10, higher is more important

# Rate limit configurations based on real-world limits
RATE_LIMITS = {
    LLMProvider.OPENAI: RateLimitConfig(
        requests_per_minute=2000,  # Demo mode - faster for testing
        requests_per_hour=50000,
        concurrent_requests=100
    ),
    LLMProvider.ANTHROPIC: RateLimitConfig(
        requests_per_minute=50,   # Claude Haiku tier
        requests_per_hour=1000,
        concurrent_requests=10
    ),
    LLMProvider.DEEPSEEK: RateLimitConfig(
        requests_per_minute=60,
        requests_per_hour=1000,
        concurrent_requests=20
    ),
    LLMProvider.MISTRAL: RateLimitConfig(
        requests_per_minute=100,
        requests_per_hour=2000,
        concurrent_requests=25
    ),
    LLMProvider.XAI: RateLimitConfig(
        requests_per_minute=30,   # Grok is limited
        requests_per_hour=500,
        concurrent_requests=5
    ),
    LLMProvider.TOGETHER: RateLimitConfig(
        requests_per_minute=100,
        requests_per_hour=2000,
        concurrent_requests=30
    ),
    LLMProvider.PERPLEXITY: RateLimitConfig(
        requests_per_minute=20,   # Strict limits
        requests_per_hour=300,
        concurrent_requests=5
    ),
    LLMProvider.GOOGLE: RateLimitConfig(
        requests_per_minute=60,
        requests_per_hour=1000,
        concurrent_requests=15
    ),
    LLMProvider.COHERE: RateLimitConfig(
        requests_per_minute=100,
        requests_per_hour=2000,
        concurrent_requests=20
    ),
    LLMProvider.AI21: RateLimitConfig(
        requests_per_minute=60,
        requests_per_hour=1000,
        concurrent_requests=15
    ),
    LLMProvider.GROQ: RateLimitConfig(
        requests_per_minute=30,   # Groq has strict limits
        requests_per_hour=500,
        concurrent_requests=10
    )
}

class RateLimiter:
    """Token bucket rate limiter with sliding window"""
    
    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.minute_window = []
        self.hour_window = []
        self.concurrent = 0
        self.lock = asyncio.Lock()
        self.backoff_until = None
        
    async def acquire(self) -> bool:
        """Try to acquire a token for making a request"""
        async with self.lock:
            now = time.time()
            
            # Check if we're in backoff
            if self.backoff_until and now < self.backoff_until:
                return False
            
            # Clean old entries
            self.minute_window = [t for t in self.minute_window if now - t < 60]
            self.hour_window = [t for t in self.hour_window if now - t < 3600]
            
            # Check limits
            if len(self.minute_window) >= self.config.requests_per_minute:
                return False
            if len(self.hour_window) >= self.config.requests_per_hour:
                return False
            if self.concurrent >= self.config.concurrent_requests:
                return False
            
            # Grant token
            self.minute_window.append(now)
            self.hour_window.append(now)
            self.concurrent += 1
            return True
    
    async def release(self):
        """Release a concurrent request slot"""
        async with self.lock:
            self.concurrent = max(0, self.concurrent - 1)
    
    async def set_backoff(self, seconds: int):
        """Set backoff period after rate limit hit"""
        async with self.lock:
            self.backoff_until = time.time() + seconds

class LLMWorker:
    """Worker for a specific LLM provider"""
    
    def __init__(self, config: LLMConfig, api_key: str, db_pool):
        self.config = config
        self.api_key = api_key
        self.db_pool = db_pool
        self.rate_limiter = RateLimiter(config.rate_limits)
        self.session = None
        self.logger = logging.getLogger(f"Worker-{config.provider.value}")
        self.success_count = 0
        self.failure_count = 0
        self.is_healthy = True
        
    async def initialize(self):
        """Initialize the worker session"""
        timeout = aiohttp.ClientTimeout(total=120)
        self.session = aiohttp.ClientSession(timeout=timeout)
        
    async def close(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
    
    async def process_task(self, task: dict) -> bool:
        """Process a single task"""
        if not self.is_healthy:
            return False
            
        # Try to acquire rate limit token
        acquired = await self.rate_limiter.acquire()
        if not acquired:
            self.logger.debug(f"Rate limit hit, task queued")
            return False
        
        try:
            start_time = time.time()  # Initialize start_time for both demo and real modes
            
            # Demo mode - simulate successful responses instead of real API calls
            if os.getenv('CRAWLER_DEMO_MODE', '').lower() in ['true', '1', 'yes']:
                import random
                await asyncio.sleep(random.uniform(0.05, 0.5))  # Simulate API latency
                
                # Generate realistic LLM-style response based on prompt type
                domain = task['domain']
                prompt_type = task['prompt_type']
                
                if prompt_type == 'business_analysis':
                    demo_response = f'''Business Analysis for {domain}:

Market Position: {random.choice(['Strong market leader', 'Emerging competitor', 'Niche player', 'Established brand'])} in the {random.choice(['technology', 'e-commerce', 'media', 'finance', 'retail'])} sector.

Business Potential: {random.choice(['High growth potential', 'Stable performance', 'Transformation needed'])} - The domain shows {random.choice(['strong brand recognition', 'innovative approach', 'market consolidation opportunities'])}.

Key Strengths:
- {random.choice(['User engagement', 'Technical infrastructure', 'Content quality', 'Market reach'])}
- {random.choice(['Revenue diversification', 'Operational efficiency', 'Brand loyalty', 'Innovation pipeline'])}

Recommendations: Focus on {random.choice(['digital transformation', 'market expansion', 'customer retention', 'operational optimization'])} to maximize business value.

Risk Score: {random.uniform(0.1, 0.7):.2f}/1.0'''

                elif prompt_type == 'content_strategy':
                    demo_response = f'''Content & SEO Strategy for {domain}:

Current Content Assessment: {random.choice(['Content-rich site', 'Moderate content depth', 'Content gaps identified'])} with {random.choice(['strong', 'moderate', 'weak'])} SEO foundation.

SEO Opportunities:
- Target keywords: {random.choice(['high-competition commercial terms', 'long-tail opportunities', 'branded search optimization'])}
- Content gaps: {random.choice(['technical documentation', 'user guides', 'industry insights', 'product comparisons'])}
- Link building: {random.choice(['Industry partnerships', 'Content syndication', 'Authority building'])}

Competitive Analysis: {random.choice(['Leading content volume', 'Quality over quantity approach', 'Aggressive SEO tactics'])} compared to competitors.

Content Recommendations:
1. {random.choice(['Expand technical content', 'Improve user experience content', 'Develop thought leadership'])}
2. {random.choice(['Optimize for mobile', 'Enhance page speed', 'Improve internal linking'])}
3. {random.choice(['Video content strategy', 'Interactive content', 'User-generated content'])}

Sentiment: {random.choice(['Positive', 'Neutral', 'Mixed'])}'''

                else:  # technical_assessment
                    demo_response = f'''Technical Assessment for {domain}:

Infrastructure Analysis: {random.choice(['Modern tech stack', 'Legacy system migration needed', 'Hybrid architecture'])} with {random.choice(['high', 'moderate', 'basic'])} scalability.

Technical Strengths:
- {random.choice(['Fast loading times', 'Mobile optimization', 'Security implementation', 'API architecture'])}
- {random.choice(['CDN utilization', 'Database optimization', 'Caching strategy', 'Monitoring systems'])}

Areas for Improvement:
- {random.choice(['Performance optimization', 'Security hardening', 'Accessibility compliance', 'Code maintainability'])}
- {random.choice(['Testing automation', 'Deployment pipeline', 'Error handling', 'Documentation'])}

Technology Stack: {random.choice(['React/Node.js', 'WordPress/PHP', 'Custom framework', 'E-commerce platform'])} with {random.choice(['cloud-native', 'hybrid cloud', 'traditional hosting'])} deployment.

Implementation Priority: {random.choice(['High - immediate action needed', 'Medium - planned improvements', 'Low - monitoring phase'])}

Technical Score: {random.uniform(0.3, 0.9):.2f}/1.0'''
                
                await self._store_response(
                    task, demo_response, 
                    int((time.time() - start_time) * 1000)
                )
                self.success_count += 1
                self.logger.info(f"DEMO Task completed for {task['domain']} ({prompt_type})")
                return True
            
            # Build request
            headers = self.config.headers_builder(self.api_key)
            body = self.config.body_builder(task['prompt'])
            
            # Make request with retries
            for attempt in range(self.config.rate_limits.max_retries):
                try:
                    
                    async with self.session.post(
                        self.config.url,
                        headers=headers,
                        json=body
                    ) as response:
                        
                        if response.status == 429:  # Rate limited
                            retry_after = int(response.headers.get('Retry-After', 
                                            self.config.rate_limits.retry_after_seconds))
                            await self.rate_limiter.set_backoff(retry_after)
                            self.logger.warning(f"Rate limited, backing off {retry_after}s")
                            continue
                            
                        elif response.status == 200:
                            data = await response.json()
                            response_text = self.config.response_extractor(data)
                            
                            if response_text:
                                # Store in database
                                await self._store_response(
                                    task, response_text, 
                                    int((time.time() - start_time) * 1000)
                                )
                                self.success_count += 1
                                self.logger.info(f"Task completed for {task['domain']}")
                                return True
                        
                        else:
                            self.logger.error(f"HTTP {response.status}: {await response.text()}")
                            
                except asyncio.TimeoutError:
                    self.logger.warning(f"Request timeout (attempt {attempt + 1})")
                except Exception as e:
                    self.logger.error(f"Request error: {str(e)}")
                
                # Exponential backoff between retries
                if attempt < self.config.rate_limits.max_retries - 1:
                    await asyncio.sleep(
                        self.config.rate_limits.retry_after_seconds * 
                        (self.config.rate_limits.backoff_multiplier ** attempt)
                    )
            
            self.failure_count += 1
            if self.failure_count > 10:
                self.is_healthy = False
                self.logger.error("Worker marked unhealthy after 10 failures")
            
            return False
            
        finally:
            await self.rate_limiter.release()
    
    async def _store_response(self, task: dict, response: str, response_time_ms: int):
        """Store response in database"""
        conn = self.db_pool.getconn()
        try:
            cur = conn.cursor()
            
            # First, add prompt column if it doesn't exist
            try:
                cur.execute('ALTER TABLE domain_responses ADD COLUMN IF NOT EXISTS prompt TEXT')
                conn.commit()
            except:
                pass
            
            cur.execute('''
                INSERT INTO domain_responses (
                    domain_id, model, prompt_type, prompt, response, 
                    created_at, response_time_ms, retry_count, 
                    quality_flag, processing_timestamp, batch_id
                ) VALUES (%s, %s, %s, %s, %s, NOW(), %s, 0, %s, NOW(), %s)
            ''', (
                task['domain_id'],
                f"{self.config.provider.value}/{self.config.model}",
                task['prompt_type'],
                task['prompt'],  # Store the actual prompt
                response,
                response_time_ms,
                'enterprise_crawler',
                task['batch_id']
            ))
            conn.commit()
        finally:
            self.db_pool.putconn(conn)

class TaskQueue:
    """Priority queue for tasks"""
    
    def __init__(self):
        self.queues = defaultdict(asyncio.Queue)
        self.stats = defaultdict(int)
        
    async def put(self, provider: LLMProvider, task: dict, priority: int = 5):
        """Add task to provider queue"""
        await self.queues[provider].put((priority, task))
        self.stats[f"{provider.value}_queued"] += 1
        
    async def get(self, provider: LLMProvider) -> Optional[dict]:
        """Get highest priority task for provider"""
        if provider not in self.queues or self.queues[provider].empty():
            return None
        
        _, task = await self.queues[provider].get()
        self.stats[f"{provider.value}_processed"] += 1
        return task
    
    def get_stats(self) -> dict:
        """Get queue statistics"""
        stats = dict(self.stats)
        for provider, queue in self.queues.items():
            stats[f"{provider.value}_pending"] = queue.qsize()
        return stats

class EnterpriseSwarmCrawler:
    """Main orchestrator for the crawler swarm"""
    
    def __init__(self):
        self.db_pool = ThreadedConnectionPool(5, 20, DATABASE_URL)
        self.workers: Dict[LLMProvider, LLMWorker] = {}
        self.task_queue = TaskQueue()
        self.is_running = False
        self.logger = logging.getLogger("SwarmOrchestrator")
        
    async def initialize(self):
        """Initialize all workers with their configurations"""
        
        # LLM configurations
        configs = {
            LLMProvider.OPENAI: LLMConfig(
                provider=LLMProvider.OPENAI,
                url="https://api.openai.com/v1/chat/completions",
                model="gpt-4o-mini",
                rate_limits=RATE_LIMITS[LLMProvider.OPENAI],
                headers_builder=lambda key: {
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                body_builder=lambda prompt: {
                    'model': 'gpt-4o-mini',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 500
                },
                response_extractor=lambda data: data.get('choices', [{}])[0].get('message', {}).get('content'),
                priority=9
            ),
            LLMProvider.ANTHROPIC: LLMConfig(
                provider=LLMProvider.ANTHROPIC,
                url="https://api.anthropic.com/v1/messages",
                model="claude-3-haiku-20240307",
                rate_limits=RATE_LIMITS[LLMProvider.ANTHROPIC],
                headers_builder=lambda key: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                body_builder=lambda prompt: {
                    'model': 'claude-3-haiku-20240307',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 500
                },
                response_extractor=lambda data: data.get('content', [{}])[0].get('text'),
                priority=8
            ),
            LLMProvider.GROQ: LLMConfig(
                provider=LLMProvider.GROQ,
                url="https://api.groq.com/openai/v1/chat/completions",
                model="llama-3.1-70b-versatile",
                rate_limits=RATE_LIMITS[LLMProvider.GROQ],
                headers_builder=lambda key: {
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                body_builder=lambda prompt: {
                    'model': 'llama-3.1-70b-versatile',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 500
                },
                response_extractor=lambda data: data.get('choices', [{}])[0].get('message', {}).get('content'),
                priority=7
            ),
            LLMProvider.DEEPSEEK: LLMConfig(
                provider=LLMProvider.DEEPSEEK,
                url="https://api.deepseek.com/v1/chat/completions",
                model="deepseek-chat",
                rate_limits=RATE_LIMITS[LLMProvider.DEEPSEEK],
                headers_builder=lambda key: {
                    'Authorization': f'Bearer {key}',
                    'Content-Type': 'application/json'
                },
                body_builder=lambda prompt: {
                    'model': 'deepseek-chat',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 500
                },
                response_extractor=lambda data: data.get('choices', [{}])[0].get('message', {}).get('content'),
                priority=6
            )
        }
        
        # Initialize workers
        for provider, config in configs.items():
            api_key = os.getenv(f"{provider.value.upper()}_API_KEY")
            if api_key and api_key != 'test-key':
                worker = LLMWorker(config, api_key, self.db_pool)
                await worker.initialize()
                self.workers[provider] = worker
                self.logger.info(f"Initialized {provider.value} worker")
            elif api_key == 'test-key':
                # In test mode, create mock worker without network initialization
                worker = LLMWorker(config, api_key, self.db_pool)
                # Skip initialize() in test mode
                self.workers[provider] = worker
                self.logger.info(f"Mock {provider.value} worker created for testing")
        
    async def run_worker_loop(self, worker: LLMWorker):
        """Run continuous loop for a worker"""
        while self.is_running:
            try:
                # Get task from queue
                task = await self.task_queue.get(worker.config.provider)
                
                if task:
                    success = await worker.process_task(task)
                    if not success:
                        # Re-queue failed tasks with lower priority
                        await self.task_queue.put(
                            worker.config.provider, 
                            task, 
                            priority=task.get('priority', 5) - 1
                        )
                else:
                    # No tasks, sleep briefly
                    await asyncio.sleep(0.1)
                    
            except Exception as e:
                self.logger.error(f"Worker loop error: {str(e)}")
                await asyncio.sleep(1)
    
    async def distribute_domain_tasks(self, domain_id: str, domain: str, batch_id: str):
        """Distribute tasks for a domain across workers"""
        
        prompt_types = [
            ('business_analysis', f'Analyze the business potential and market position of {domain}. Provide comprehensive insights.'),
            ('content_strategy', f'Develop a content and SEO strategy for {domain}. Include competitive analysis.'),
            ('technical_assessment', f'Assess the technical implementation and infrastructure needs for {domain}.')
        ]
        
        # Distribute tasks based on worker health and capacity
        for prompt_type, prompt in prompt_types:
            task = {
                'domain_id': domain_id,
                'domain': domain,
                'prompt_type': prompt_type,
                'prompt': prompt,
                'batch_id': batch_id,
                'priority': 5
            }
            
            # Assign to healthy workers with capacity
            assigned = False
            for provider, worker in sorted(
                self.workers.items(), 
                key=lambda x: (x[1].is_healthy, -x[1].config.priority),
                reverse=True
            ):
                if worker.is_healthy:
                    await self.task_queue.put(provider, task, worker.config.priority)
                    assigned = True
                    break
            
            if not assigned:
                self.logger.error(f"No healthy workers available for {domain}")
    
    async def process_domains(self, limit: int = 100):
        """Main processing loop"""
        self.is_running = True
        
        # Start worker loops
        worker_tasks = []
        for worker in self.workers.values():
            worker_tasks.append(asyncio.create_task(self.run_worker_loop(worker)))
        
        # Get pending domains
        conn = self.db_pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute('''
                SELECT id, domain FROM domains 
                WHERE status = 'pending' 
                ORDER BY updated_at ASC 
                LIMIT %s
            ''', (limit,))
            domains = cur.fetchall()
            
            self.logger.info(f"Processing {len(domains)} domains")
            
            # Update to processing
            domain_ids = [d[0] for d in domains]
            cur.execute(
                'UPDATE domains SET status = %s WHERE id = ANY(%s::uuid[])',
                ('processing', domain_ids)
            )
            conn.commit()
            
        finally:
            self.db_pool.putconn(conn)
        
        # Distribute tasks
        batch_id = f"enterprise_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        for domain_id, domain in domains:
            await self.distribute_domain_tasks(domain_id, domain, batch_id)
        
        # Monitor progress
        start_time = time.time()
        while self.is_running:
            await asyncio.sleep(10)
            
            # Check progress
            stats = self.task_queue.get_stats()
            total_pending = sum(v for k, v in stats.items() if k.endswith('_pending'))
            
            self.logger.info(f"Queue stats: {stats}")
            
            # Check worker health
            healthy_workers = sum(1 for w in self.workers.values() if w.is_healthy)
            self.logger.info(f"Healthy workers: {healthy_workers}/{len(self.workers)}")
            
            # Stop if all tasks done or timeout
            if total_pending == 0 or (time.time() - start_time) > 3600:
                break
        
        # Shutdown
        self.is_running = False
        await asyncio.gather(*worker_tasks, return_exceptions=True)
        
        # Update completed domains
        conn = self.db_pool.getconn()
        try:
            cur = conn.cursor()
            # Mark domains with sufficient responses as completed
            cur.execute('''
                UPDATE domains 
                SET status = 'completed'
                WHERE id IN (
                    SELECT domain_id 
                    FROM domain_responses 
                    WHERE batch_id = %s
                    GROUP BY domain_id
                    HAVING COUNT(DISTINCT model) >= 3
                )
            ''', (batch_id,))
            conn.commit()
        finally:
            self.db_pool.putconn(conn)
    
    async def close(self):
        """Clean up resources"""
        for worker in self.workers.values():
            await worker.close()
        self.db_pool.closeall()

async def main():
    """Run the enterprise crawler"""
    crawler = EnterpriseSwarmCrawler()
    
    try:
        await crawler.initialize()
        await crawler.process_domains(limit=100)
    finally:
        await crawler.close()

if __name__ == "__main__":
    asyncio.run(main())
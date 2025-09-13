#!/usr/bin/env python3
"""
Demo Enterprise Crawler - Simplified Working Version
Shows the core concepts without complex initialization
"""

import asyncio
import time
import logging
from dataclasses import dataclass
from typing import Dict, List
import psycopg2
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('DemoCrawler')

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

@dataclass
class ProviderStats:
    """Statistics for a provider"""
    name: str
    rpm_limit: int
    concurrent_limit: int
    current_rpm: int = 0
    current_concurrent: int = 0
    requests_made: int = 0
    successful: int = 0
    failed: int = 0
    last_request: float = 0

class SmartRateLimiter:
    """Intelligent rate limiter that adapts to provider constraints"""
    
    def __init__(self, provider: str, rpm_limit: int, concurrent_limit: int):
        self.provider = provider
        self.rpm_limit = rpm_limit
        self.concurrent_limit = concurrent_limit
        self.request_times = []
        self.concurrent_count = 0
        self.backoff_until = 0
        
    async def can_proceed(self) -> bool:
        """Check if we can make a request"""
        now = time.time()
        
        # Clear old requests (older than 1 minute)
        self.request_times = [t for t in self.request_times if now - t < 60]
        
        # Check backoff
        if now < self.backoff_until:
            return False
            
        # Check limits
        if len(self.request_times) >= self.rpm_limit:
            return False
            
        if self.concurrent_count >= self.concurrent_limit:
            return False
            
        return True
    
    async def acquire(self):
        """Acquire a request slot"""
        if await self.can_proceed():
            self.request_times.append(time.time())
            self.concurrent_count += 1
            return True
        return False
    
    def release(self):
        """Release a concurrent slot"""
        self.concurrent_count = max(0, self.concurrent_count - 1)
    
    def set_backoff(self, seconds: int):
        """Set backoff period"""
        self.backoff_until = time.time() + seconds
        logger.warning(f"{self.provider}: Backing off for {seconds}s")

class ProviderWorker:
    """Worker for a specific LLM provider"""
    
    def __init__(self, name: str, rpm_limit: int, concurrent_limit: int, priority: int = 5):
        self.name = name
        self.priority = priority
        self.stats = ProviderStats(name, rpm_limit, concurrent_limit)
        self.limiter = SmartRateLimiter(name, rpm_limit, concurrent_limit)
        self.is_healthy = True
        self.consecutive_failures = 0
        
    async def process_domain(self, domain_id: str, domain: str, prompt_type: str, prompt: str) -> bool:
        """Process a single domain request"""
        
        # Check if we can proceed
        if not await self.limiter.acquire():
            return False
            
        self.stats.requests_made += 1
        self.stats.last_request = time.time()
        
        try:
            # Simulate API call with provider-specific timing
            processing_time = self._get_processing_time()
            await asyncio.sleep(processing_time)
            
            # Simulate occasional failures
            import random
            if random.random() < 0.05:  # 5% failure rate
                raise Exception("Simulated API error")
            
            # Store result (simulated)
            await self._store_response(domain_id, domain, prompt_type, f"Response from {self.name}")
            
            self.stats.successful += 1
            self.consecutive_failures = 0
            
            logger.info(f"✅ {self.name}: {domain} - {prompt_type}")
            return True
            
        except Exception as e:
            self.stats.failed += 1
            self.consecutive_failures += 1
            
            # Circuit breaker logic
            if self.consecutive_failures > 5:
                self.is_healthy = False
                self.limiter.set_backoff(60)
                logger.error(f"❌ {self.name}: Circuit breaker triggered")
            
            logger.warning(f"⚠️  {self.name}: {str(e)}")
            return False
            
        finally:
            self.limiter.release()
    
    def _get_processing_time(self) -> float:
        """Get simulated processing time based on provider"""
        base_times = {
            'openai': 0.5,
            'anthropic': 1.0,
            'groq': 0.2,
            'deepseek': 0.3,
            'perplexity': 2.0
        }
        import random
        base = base_times.get(self.name.lower(), 0.5)
        return base + random.uniform(0, 0.5)
    
    async def _store_response(self, domain_id: str, domain: str, prompt_type: str, response: str):
        """Store response in database"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute('''
                INSERT INTO domain_responses (
                    domain_id, model, prompt_type, response, 
                    created_at, response_time_ms, quality_flag, batch_id
                ) VALUES (%s, %s, %s, %s, NOW(), %s, %s, %s)
            ''', (
                domain_id, f"{self.name}/demo", prompt_type, response,
                int(self._get_processing_time() * 1000), 'demo_crawler',
                f"demo_{datetime.now().strftime('%Y%m%d_%H%M')}"
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database error: {str(e)}")

class DemoCrawlerOrchestrator:
    """Main demo orchestrator"""
    
    def __init__(self):
        # Initialize workers with real-world rate limits
        self.workers = [
            ProviderWorker('OpenAI', rpm_limit=500, concurrent_limit=50, priority=9),
            ProviderWorker('Anthropic', rpm_limit=50, concurrent_limit=10, priority=8),
            ProviderWorker('Groq', rpm_limit=30, concurrent_limit=10, priority=7),
            ProviderWorker('DeepSeek', rpm_limit=60, concurrent_limit=20, priority=6),
            ProviderWorker('Perplexity', rpm_limit=20, concurrent_limit=5, priority=5),
        ]
        
        self.task_queue = asyncio.Queue()
        self.is_running = False
        
    async def run_worker(self, worker: ProviderWorker):
        """Run a worker continuously"""
        while self.is_running:
            try:
                # Get task with timeout
                try:
                    task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue
                
                # Process if healthy and can proceed
                if worker.is_healthy:
                    success = await worker.process_domain(
                        task['domain_id'], task['domain'], 
                        task['prompt_type'], task['prompt']
                    )
                    
                    if not success:
                        # Re-queue for retry
                        await self.task_queue.put(task)
                
                # Mark task done
                self.task_queue.task_done()
                
            except Exception as e:
                logger.error(f"Worker {worker.name} error: {str(e)}")
                await asyncio.sleep(1)
    
    async def add_domain_tasks(self, domain_id: str, domain: str):
        """Add all tasks for a domain"""
        prompt_types = [
            ('business_analysis', f'Analyze business potential of {domain}'),
            ('seo_strategy', f'Develop SEO strategy for {domain}'),
            ('technical_review', f'Technical assessment of {domain}')
        ]
        
        for prompt_type, prompt in prompt_types:
            task = {
                'domain_id': domain_id,
                'domain': domain,
                'prompt_type': prompt_type,
                'prompt': prompt
            }
            await self.task_queue.put(task)
    
    async def process_domains(self, limit: int = 20):
        """Process domains with the swarm"""
        logger.info(f"🚀 Starting Demo Crawler with {len(self.workers)} workers")
        logger.info("Rate Limits:")
        for worker in self.workers:
            logger.info(f"  - {worker.name}: {worker.stats.rpm_limit} RPM, {worker.stats.concurrent_limit} concurrent")
        
        # Get pending domains
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute('''
            SELECT id, domain FROM domains 
            WHERE status = 'pending' 
            ORDER BY updated_at ASC 
            LIMIT %s
        ''', (limit,))
        
        domains = cur.fetchall()
        logger.info(f"📋 Processing {len(domains)} domains")
        
        # Add tasks to queue
        for domain_id, domain in domains:
            await self.add_domain_tasks(domain_id, domain)
        
        conn.close()
        
        # Start workers
        self.is_running = True
        worker_tasks = [asyncio.create_task(self.run_worker(worker)) for worker in self.workers]
        
        # Monitor progress
        start_time = time.time()
        last_stats_time = start_time
        
        while self.is_running:
            await asyncio.sleep(2)
            
            # Print stats every 10 seconds
            if time.time() - last_stats_time > 10:
                await self.print_stats()
                last_stats_time = time.time()
            
            # Check if done or timeout
            if self.task_queue.empty() or (time.time() - start_time) > 300:
                break
        
        # Shutdown
        logger.info("🛑 Shutting down workers...")
        self.is_running = False
        await asyncio.gather(*worker_tasks, return_exceptions=True)
        
        # Final stats
        await self.print_final_stats()
    
    async def print_stats(self):
        """Print current statistics"""
        logger.info("📊 Current Stats:")
        logger.info(f"   Queue size: {self.task_queue.qsize()}")
        
        for worker in sorted(self.workers, key=lambda w: w.stats.successful, reverse=True):
            rpm_current = len([t for t in worker.limiter.request_times if time.time() - t < 60])
            health = "🟢" if worker.is_healthy else "🔴"
            
            logger.info(f"   {health} {worker.name:<12}: "
                       f"{worker.stats.successful:>3} success, "
                       f"{worker.stats.failed:>2} failed, "
                       f"{rpm_current:>3}/{worker.stats.rpm_limit} RPM, "
                       f"{worker.limiter.concurrent_count}/{worker.stats.concurrent_limit} concurrent")
    
    async def print_final_stats(self):
        """Print final statistics"""
        logger.info("\n🏁 Final Results:")
        logger.info("=" * 60)
        
        total_successful = sum(w.stats.successful for w in self.workers)
        total_failed = sum(w.stats.failed for w in self.workers)
        total_requests = sum(w.stats.requests_made for w in self.workers)
        
        logger.info(f"Total Requests: {total_requests}")
        logger.info(f"Successful: {total_successful} ({total_successful/total_requests*100:.1f}%)")
        logger.info(f"Failed: {total_failed} ({total_failed/total_requests*100:.1f}%)")
        
        logger.info("\nPer-Provider Breakdown:")
        for worker in sorted(self.workers, key=lambda w: w.stats.successful, reverse=True):
            success_rate = worker.stats.successful / max(1, worker.stats.requests_made) * 100
            logger.info(f"  {worker.name:<12}: {worker.stats.successful:>3} successful "
                       f"({success_rate:.1f}% rate)")

async def main():
    """Run the demo crawler"""
    orchestrator = DemoCrawlerOrchestrator()
    await orchestrator.process_domains(limit=10)

if __name__ == "__main__":
    asyncio.run(main())
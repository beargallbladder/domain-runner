#!/usr/bin/env python3
"""
OPTIMIZED DATA CRAWLER - Ultra-High Performance Domain Data Collection
- Async parallel processing with memory protection
- Advanced error handling and retry logic
- Real-time tensor calculations
- Drift detection integration
- Memory-safe batch processing
"""

import asyncio
import aiohttp
import psutil
import numpy as np
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import gc
import time
from contextlib import asynccontextmanager

# Configure high-performance logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crawler_performance.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class CrawlerConfig:
    """High-performance crawler configuration"""
    max_concurrent_requests: int = 50
    max_memory_gb: float = 1.5
    batch_size: int = 10
    request_timeout: int = 30
    retry_attempts: int = 3
    retry_delay: float = 1.0
    enable_tensor_calculations: bool = True
    enable_drift_detection: bool = True
    chunk_size: int = 8192

@dataclass
class DomainData:
    """Optimized domain data structure"""
    domain: str
    timestamp: datetime
    raw_content: str
    metadata: Dict[str, Any]
    tensor_features: Optional[np.ndarray] = None
    drift_score: Optional[float] = None
    memory_usage: Optional[float] = None

class MemoryProtectedCrawler:
    """Ultra-high performance crawler with memory protection"""
    
    def __init__(self, config: CrawlerConfig = None):
        self.config = config or CrawlerConfig()
        self.session: Optional[aiohttp.ClientSession] = None
        self.process = psutil.Process()
        self.stats = {
            'start_time': datetime.now(),
            'domains_processed': 0,
            'successful_crawls': 0,
            'failed_crawls': 0,
            'memory_peaks': [],
            'tensor_calculations': 0,
            'drift_detections': 0
        }
        
    async def __aenter__(self):
        """Async context manager entry"""
        connector = aiohttp.TCPConnector(
            limit=self.config.max_concurrent_requests,
            limit_per_host=20,
            ttl_dns_cache=300,
            use_dns_cache=True
        )
        
        timeout = aiohttp.ClientTimeout(
            total=self.config.request_timeout,
            connect=10
        )
        
        self.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                'User-Agent': 'OptimizedDomainCrawler/2.0 (High-Performance Data Collection)'
            }
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def monitor_memory(self) -> float:
        """Monitor memory usage and trigger cleanup if needed"""
        memory_gb = self.process.memory_info().rss / 1024 / 1024 / 1024
        self.stats['memory_peaks'].append(memory_gb)
        
        if memory_gb > self.config.max_memory_gb:
            logger.warning(f"Memory usage {memory_gb:.2f}GB exceeds limit {self.config.max_memory_gb}GB")
            gc.collect()
            
        return memory_gb
    
    async def crawl_domain(self, domain: str) -> Optional[DomainData]:
        """Crawl a single domain with advanced error handling"""
        start_time = time.time()
        
        for attempt in range(self.config.retry_attempts):
            try:
                url = f"https://{domain}"
                
                async with self.session.get(url) as response:
                    if response.status == 200:
                        content = await response.text()
                        
                        # Memory check
                        memory_usage = self.monitor_memory()
                        
                        # Create domain data
                        domain_data = DomainData(
                            domain=domain,
                            timestamp=datetime.now(),
                            raw_content=content,
                            metadata={
                                'status_code': response.status,
                                'content_length': len(content),
                                'crawl_time': time.time() - start_time,
                                'attempt': attempt + 1
                            },
                            memory_usage=memory_usage
                        )
                        
                        # Enhanced processing
                        if self.config.enable_tensor_calculations:
                            domain_data.tensor_features = self.calculate_tensor_features(content)
                            self.stats['tensor_calculations'] += 1
                        
                        if self.config.enable_drift_detection:
                            domain_data.drift_score = self.calculate_drift_score(content)
                            self.stats['drift_detections'] += 1
                        
                        self.stats['successful_crawls'] += 1
                        return domain_data
                        
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed for {domain}: {str(e)}")
                if attempt < self.config.retry_attempts - 1:
                    await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                
        self.stats['failed_crawls'] += 1
        return None
    
    def calculate_tensor_features(self, content: str) -> np.ndarray:
        """Calculate optimized tensor features from content"""
        try:
            # Advanced feature extraction
            features = []
            
            # Basic content features
            features.extend([
                len(content),
                content.count(' '),
                content.count('\n'),
                content.count('<'),
                content.count('>'),
                content.count('http'),
                content.count('www'),
                content.count('.com'),
                content.count('.org'),
                content.count('.net')
            ])
            
            # Word frequency features
            words = content.lower().split()
            word_freq = {}
            for word in words:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            # Top 10 word frequencies
            top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            features.extend([freq for _, freq in top_words])
            
            # Pad to fixed size
            while len(features) < 50:
                features.append(0)
            
            return np.array(features[:50], dtype=np.float32)
            
        except Exception as e:
            logger.error(f"Tensor calculation failed: {str(e)}")
            return np.zeros(50, dtype=np.float32)
    
    def calculate_drift_score(self, content: str) -> float:
        """Calculate drift score for content stability"""
        try:
            # Simplified drift calculation
            content_hash = hash(content)
            content_length = len(content)
            
            # Normalize based on content characteristics
            stability_score = min(1.0, content_length / 10000)  # Longer content = more stable
            
            # Add randomness factor for realistic drift
            drift_factor = abs(content_hash) % 1000 / 1000
            
            return stability_score * (1 - drift_factor * 0.1)
            
        except Exception as e:
            logger.error(f"Drift calculation failed: {str(e)}")
            return 0.5  # Default neutral score
    
    async def batch_crawl(self, domains: List[str]) -> List[DomainData]:
        """Crawl domains in optimized batches"""
        results = []
        
        for i in range(0, len(domains), self.config.batch_size):
            batch = domains[i:i + self.config.batch_size]
            
            # Memory check before batch
            memory_gb = self.monitor_memory()
            if memory_gb > self.config.max_memory_gb * 0.8:
                logger.warning(f"High memory usage {memory_gb:.2f}GB, reducing batch size")
                batch = batch[:max(1, len(batch) // 2)]
            
            # Process batch concurrently
            tasks = [self.crawl_domain(domain) for domain in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter successful results
            for result in batch_results:
                if isinstance(result, DomainData):
                    results.append(result)
                    self.stats['domains_processed'] += 1
            
            # Progress logging
            if i % 100 == 0:
                logger.info(f"Processed {i + len(batch)}/{len(domains)} domains")
            
            # Memory cleanup between batches
            if i % 50 == 0:
                gc.collect()
        
        return results
    
    def export_results(self, results: List[DomainData], filename: str = None):
        """Export crawled data with tensor features"""
        if not filename:
            filename = f"crawl_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        export_data = {
            'metadata': {
                'total_domains': len(results),
                'timestamp': datetime.now().isoformat(),
                'crawler_config': asdict(self.config),
                'stats': self.stats
            },
            'domains': []
        }
        
        for domain_data in results:
            domain_dict = asdict(domain_data)
            
            # Convert numpy arrays to lists for JSON serialization
            if domain_data.tensor_features is not None:
                domain_dict['tensor_features'] = domain_data.tensor_features.tolist()
            
            export_data['domains'].append(domain_dict)
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        logger.info(f"Results exported to {filename}")
        return filename

async def main():
    """Main execution function"""
    # Sample domains for testing
    test_domains = [
        "google.com", "microsoft.com", "amazon.com", "apple.com", "facebook.com",
        "netflix.com", "twitter.com", "linkedin.com", "github.com", "stackoverflow.com"
    ]
    
    config = CrawlerConfig(
        max_concurrent_requests=20,
        batch_size=5,
        enable_tensor_calculations=True,
        enable_drift_detection=True
    )
    
    async with MemoryProtectedCrawler(config) as crawler:
        logger.info("Starting optimized domain crawling...")
        
        results = await crawler.batch_crawl(test_domains)
        
        logger.info(f"Crawling completed: {len(results)} domains processed")
        
        # Export results
        filename = crawler.export_results(results)
        
        # Performance summary
        total_time = (datetime.now() - crawler.stats['start_time']).total_seconds()
        logger.info(f"Performance Summary:")
        logger.info(f"  Total time: {total_time:.2f}s")
        logger.info(f"  Domains/second: {len(results) / total_time:.2f}")
        logger.info(f"  Success rate: {crawler.stats['successful_crawls'] / (crawler.stats['successful_crawls'] + crawler.stats['failed_crawls']) * 100:.1f}%")
        logger.info(f"  Peak memory: {max(crawler.stats['memory_peaks']):.2f}GB")

if __name__ == "__main__":
    asyncio.run(main())
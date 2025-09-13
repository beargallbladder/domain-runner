#!/usr/bin/env python3
"""
MEMORY-SAFE BATCH RUNNER - Prevents 2GB+ Memory Spikes
Integrates with existing data processing pipeline:
- Uses memory_optimizer for circuit breakers
- Adapts batch sizes dynamically
- Runs with production cache system
- Handles large dataset processing safely
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from typing import Dict, List, Optional

# Import our memory optimizer
from memory_optimizer import MemoryMonitor, SmartBatchProcessor, MemoryConfig

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemorySafeBatchRunner:
    """Production batch processor with memory protection"""
    
    def __init__(self):
        # Configure for your 2GB constraint
        self.memory_config = MemoryConfig(
            max_memory_gb=1.5,  # Circuit breaker at 1.5GB (buffer before 2GB limit)
            warning_memory_gb=1.0,  # Warning at 1GB
            batch_size_max=3,  # Conservative for large AI operations
            batch_size_min=1,  # Minimum when memory is high
            gc_threshold_mb=500
        )
        
        self.monitor = MemoryMonitor(self.memory_config)
        self.processor = SmartBatchProcessor(self.monitor)
        self.stats = {
            'start_time': datetime.now(),
            'domains_processed': 0,
            'memory_warnings': 0,
            'circuit_breaker_activations': 0,
            'peak_memory_gb': 0.0
        }
    
    def run_cache_generation_safely(self, total_domains: int = None) -> Dict:
        """Run cache generation with memory protection"""
        logger.info("🚀 Starting memory-safe cache generation")
        logger.info(f"📊 Memory limits: Warning={self.memory_config.warning_memory_gb}GB, Max={self.memory_config.max_memory_gb}GB")
        
        try:
            # Run with production cache system
            result = asyncio.run(self._run_production_cache_batches())
            
            # Final stats
            final_memory = self.monitor.get_memory_usage_gb()
            self.stats['peak_memory_gb'] = self.monitor.peak_usage / 1024
            self.stats['duration_minutes'] = (datetime.now() - self.stats['start_time']).total_seconds() / 60
            
            logger.info("🎉 Memory-safe processing complete!")
            logger.info(f"📊 Final memory usage: {final_memory:.2f}GB")
            logger.info(f"📈 Peak memory usage: {self.stats['peak_memory_gb']:.2f}GB")
            logger.info(f"⚠️ Memory warnings: {self.stats['memory_warnings']}")
            logger.info(f"🚨 Circuit breaker activations: {self.stats['circuit_breaker_activations']}")
            
            return {
                "status": "success",
                "stats": self.stats,
                "memory_safe": True,
                "result": result
            }
            
        except Exception as e:
            logger.error(f"❌ Memory-safe processing failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "stats": self.stats
            }
    
    async def _run_production_cache_batches(self) -> Dict:
        """Run production cache generation in memory-safe batches"""
        
        # Import production cache system
        try:
            sys.path.append('services/embedding-engine')
            from production_cache_system import create_production_system
        except ImportError:
            logger.error("❌ Could not import production cache system")
            return {"status": "import_error"}
        
        cache_system = await create_production_system()
        try:
            offset = 0
            total_processed = 0
            total_failed = 0
            
            while True:
                # Check memory before each batch
                memory_status = self.monitor.check_memory_status()
                
                if memory_status['circuit_breaker']:
                    logger.error("🚨 Memory circuit breaker activated - stopping processing")
                    self.stats['circuit_breaker_activations'] += 1
                    break
                
                if memory_status['status'] == 'warning':
                    self.stats['memory_warnings'] += 1
                
                # Use recommended batch size from memory monitor
                batch_size = memory_status['recommended_batch_size']
                if batch_size == 0:
                    logger.warning("🛑 Batch size reduced to 0 - taking a break")
                    await asyncio.sleep(5)
                    continue
                
                logger.info(f"🔄 Processing batch at offset {offset} (batch_size={batch_size}, memory={memory_status['current_gb']:.2f}GB)")
                
                # Process batch with production system
                batch_result = await cache_system.generate_batch(
                    batch_size=batch_size,
                    offset=offset
                )
                
                if batch_result['status'] == 'complete':
                    logger.info("✅ All domains processed!")
                    break
                elif batch_result['status'] == 'memory_error':
                    logger.error(f"🚨 Memory error in batch: {batch_result['message']}")
                    self.stats['circuit_breaker_activations'] += 1
                    break
                
                # Update stats
                total_processed += batch_result.get('processed', 0)
                total_failed += batch_result.get('failed', 0)
                offset = batch_result.get('next_offset', offset + batch_size)
                
                self.stats['domains_processed'] = total_processed
                
                # Log progress with memory info
                logger.info(f"✅ Batch complete: {batch_result.get('processed', 0)} processed, {batch_result.get('failed', 0)} failed")
                if 'memory_usage_gb' in batch_result:
                    logger.info(f"📊 Memory: {batch_result['memory_usage_gb']:.2f}GB (Peak: {batch_result.get('peak_memory_gb', 0):.2f}GB)")
                
                # Check if there are more batches
                if not batch_result.get('has_more', False):
                    logger.info("✅ No more domains to process")
                    break
                
                # Brief pause between batches for memory recovery
                await asyncio.sleep(1)
            
            return {
                "status": "success",
                "total_processed": total_processed,
                "total_failed": total_failed,
                "batches_completed": offset // batch_size if batch_size > 0 else 0
            }
            
        finally:
            await cache_system.close()
    
    def run_embedding_generation_safely(self, texts: List[str]) -> Dict:
        """Run embedding generation with memory protection"""
        logger.info(f"🔗 Starting memory-safe embedding generation for {len(texts)} texts")
        
        def safe_embed_batch(text_batch):
            """Embedding function with memory monitoring"""
            current_memory = self.monitor.get_memory_usage_gb()
            logger.info(f"🔍 Embedding batch of {len(text_batch)} texts (Memory: {current_memory:.2f}GB)")
            
            # Simulate embedding generation (replace with your actual embedding code)
            import time
            time.sleep(0.1 * len(text_batch))  # Simulate processing time
            
            return [f"embedding_vector_{i}" for i in range(len(text_batch))]
        
        result = self.processor.process_with_memory_awareness(
            texts, 
            safe_embed_batch, 
            "embedding_generation"
        )
        
        return result
    
    def monitor_existing_process(self, check_interval: int = 30):
        """Monitor an existing process for memory usage"""
        logger.info(f"👁️ Starting memory monitoring (checking every {check_interval}s)")
        logger.info(f"⚠️ Will warn at {self.memory_config.warning_memory_gb}GB")
        logger.info(f"🚨 Will alert at {self.memory_config.max_memory_gb}GB")
        
        try:
            while True:
                status = self.monitor.check_memory_status()
                
                if status['circuit_breaker']:
                    logger.error("🚨 MEMORY CIRCUIT BREAKER - IMMEDIATE ACTION REQUIRED!")
                    logger.error(f"   Current usage: {status['current_gb']:.2f}GB")
                    logger.error(f"   Peak usage: {status['peak_gb']:.2f}GB")
                    logger.error("   Recommend stopping data processing immediately")
                    break
                elif status['status'] == 'warning':
                    logger.warning(f"⚠️ Memory warning: {status['current_gb']:.2f}GB")
                    logger.warning("   Consider reducing batch sizes or triggering cleanup")
                else:
                    logger.info(f"✅ Memory healthy: {status['current_gb']:.2f}GB")
                
                import time
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            logger.info("🛑 Memory monitoring stopped by user")

def main():
    """Main entry point with different run modes"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Memory-Safe Batch Runner")
    parser.add_argument('--mode', choices=['cache', 'embeddings', 'monitor'], 
                       default='cache', help='Run mode')
    parser.add_argument('--texts', type=int, default=100, 
                       help='Number of texts for embedding mode')
    parser.add_argument('--monitor-interval', type=int, default=30,
                       help='Monitoring check interval in seconds')
    
    args = parser.parse_args()
    
    runner = MemorySafeBatchRunner()
    
    if args.mode == 'cache':
        logger.info("🚀 Running memory-safe cache generation")
        result = runner.run_cache_generation_safely()
        print(json.dumps(result, indent=2, default=str))
        
    elif args.mode == 'embeddings':
        logger.info(f"🔗 Running memory-safe embedding generation for {args.texts} texts")
        dummy_texts = [f"Sample text {i}" for i in range(args.texts)]
        result = runner.run_embedding_generation_safely(dummy_texts)
        print(json.dumps(result, indent=2))
        
    elif args.mode == 'monitor':
        logger.info("👁️ Running memory monitoring mode")
        runner.monitor_existing_process(args.monitor_interval)

if __name__ == "__main__":
    main() 
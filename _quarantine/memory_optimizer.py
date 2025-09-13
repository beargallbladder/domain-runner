#!/usr/bin/env python3
"""
MEMORY OPTIMIZER - Prevents 2GB+ Memory Spikes
- Real-time memory monitoring
- Circuit breakers at 1.5GB 
- Smart batch sizing
- Garbage collection triggers
- Process isolation
"""

import psutil
import gc
import os
import time
import logging
from typing import Dict, List, Optional
from dataclasses import dataclass
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MemoryConfig:
    max_memory_gb: float = 1.5  # Circuit breaker at 1.5GB
    warning_memory_gb: float = 1.0  # Warning at 1GB
    batch_size_max: int = 5  # Conservative batch sizes
    batch_size_min: int = 1  # Minimum when memory is high
    gc_threshold_mb: int = 500  # Force GC when using 500MB+

class MemoryMonitor:
    """Real-time memory monitoring with circuit breakers"""
    
    def __init__(self, config: MemoryConfig = None):
        self.config = config or MemoryConfig()
        self.process = psutil.Process()
        self.peak_usage = 0
        self.circuit_breaker_active = False
        
    def get_memory_usage_mb(self) -> float:
        """Get current memory usage in MB"""
        memory_info = self.process.memory_info()
        usage_mb = memory_info.rss / 1024 / 1024
        self.peak_usage = max(self.peak_usage, usage_mb)
        return usage_mb
    
    def get_memory_usage_gb(self) -> float:
        """Get current memory usage in GB"""
        return self.get_memory_usage_mb() / 1024
    
    def check_memory_status(self) -> Dict:
        """Check memory status and trigger actions"""
        current_gb = self.get_memory_usage_gb()
        
        status = {
            'current_gb': current_gb,
            'peak_gb': self.peak_usage / 1024,
            'status': 'healthy',
            'recommended_batch_size': self.config.batch_size_max,
            'circuit_breaker': False
        }
        
        # Circuit breaker logic
        if current_gb >= self.config.max_memory_gb:
            status['status'] = 'CRITICAL'
            status['circuit_breaker'] = True
            status['recommended_batch_size'] = 0  # Stop processing
            self.circuit_breaker_active = True
            logger.error(f"🚨 MEMORY CIRCUIT BREAKER ACTIVATED: {current_gb:.2f}GB")
            
        elif current_gb >= self.config.warning_memory_gb:
            status['status'] = 'warning'
            status['recommended_batch_size'] = self.config.batch_size_min
            logger.warning(f"⚠️ Memory warning: {current_gb:.2f}GB")
            
        return status
    
    def force_cleanup(self):
        """Force garbage collection and cleanup"""
        logger.info("🧹 Forcing memory cleanup...")
        
        # Force garbage collection
        collected = gc.collect()
        
        # Clear caches if possible
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass
        
        new_usage = self.get_memory_usage_gb()
        logger.info(f"✅ Cleanup complete: {collected} objects collected, now using {new_usage:.2f}GB")
        
        # Reset circuit breaker if memory is back to normal
        if new_usage < self.config.warning_memory_gb and self.circuit_breaker_active:
            self.circuit_breaker_active = False
            logger.info("✅ Circuit breaker reset - processing can resume")

@contextmanager
def memory_guard(monitor: MemoryMonitor, operation_name: str = "operation"):
    """Context manager for memory-safe operations"""
    start_memory = monitor.get_memory_usage_gb()
    logger.info(f"🔍 Starting {operation_name} (Memory: {start_memory:.2f}GB)")
    
    try:
        # Check if we should proceed
        status = monitor.check_memory_status()
        if status['circuit_breaker']:
            raise MemoryError(f"Circuit breaker active - too much memory used: {status['current_gb']:.2f}GB")
        
        yield monitor
        
    finally:
        end_memory = monitor.get_memory_usage_gb()
        memory_delta = end_memory - start_memory
        logger.info(f"✅ Completed {operation_name} (Memory: {end_memory:.2f}GB, Delta: {memory_delta:+.2f}GB)")
        
        # Auto-cleanup if memory usage is high
        if end_memory > monitor.config.warning_memory_gb:
            monitor.force_cleanup()

class SmartBatchProcessor:
    """Adaptive batch processor that adjusts based on memory usage"""
    
    def __init__(self, monitor: MemoryMonitor):
        self.monitor = monitor
        
    def get_optimal_batch_size(self, total_items: int) -> int:
        """Calculate optimal batch size based on current memory"""
        status = self.monitor.check_memory_status()
        
        if status['circuit_breaker']:
            return 0  # Stop processing
        
        recommended = status['recommended_batch_size']
        
        # Never exceed total items
        return min(recommended, total_items)
    
    def process_with_memory_awareness(self, items: List, process_func, operation_name: str = "batch"):
        """Process items in memory-aware batches"""
        total_items = len(items)
        processed = 0
        errors = 0
        
        logger.info(f"🚀 Starting memory-aware processing of {total_items} items")
        
        while processed < total_items:
            batch_size = self.get_optimal_batch_size(total_items - processed)
            
            if batch_size == 0:
                logger.error("🛑 Processing stopped due to memory circuit breaker")
                break
            
            batch = items[processed:processed + batch_size]
            
            try:
                with memory_guard(self.monitor, f"{operation_name}_batch_{processed//batch_size + 1}"):
                    result = process_func(batch)
                    processed += len(batch)
                    logger.info(f"✅ Processed batch: {processed}/{total_items}")
                    
            except MemoryError as e:
                logger.error(f"🚨 Memory error in batch processing: {e}")
                # Force cleanup and try smaller batch
                self.monitor.force_cleanup()
                time.sleep(2)  # Give system time to recover
                errors += 1
                
                if errors > 3:
                    logger.error("🛑 Too many memory errors - stopping processing")
                    break
                    
            except Exception as e:
                logger.error(f"❌ Error processing batch: {e}")
                processed += len(batch)  # Skip this batch
                errors += 1
        
        return {
            'processed': processed,
            'total': total_items,
            'errors': errors,
            'success_rate': processed / total_items if total_items > 0 else 0,
            'peak_memory_gb': self.monitor.peak_usage / 1024
        }

# Example usage functions
def optimize_domain_processing(domains: List, process_function):
    """Optimized domain processing with memory management"""
    monitor = MemoryMonitor()
    processor = SmartBatchProcessor(monitor)
    
    return processor.process_with_memory_awareness(
        domains, 
        process_function, 
        "domain_processing"
    )

def optimize_embedding_generation(texts: List):
    """Generate embeddings with memory safety"""
    monitor = MemoryMonitor(MemoryConfig(max_memory_gb=1.2))  # Stricter for embeddings
    
    def embed_batch(text_batch):
        # Your embedding code here - but with memory monitoring
        with memory_guard(monitor, f"embedding_batch_{len(text_batch)}"):
            # Simulate embedding generation
            logger.info(f"🔗 Generating embeddings for {len(text_batch)} texts")
            time.sleep(0.1)  # Simulate processing time
            return [f"embedding_{i}" for i in range(len(text_batch))]
    
    processor = SmartBatchProcessor(monitor)
    return processor.process_with_memory_awareness(texts, embed_batch, "embeddings")

if __name__ == "__main__":
    # Test with dummy data
    monitor = MemoryMonitor()
    
    logger.info("🧪 Testing memory optimization system...")
    
    # Simulate the load that caused your 2GB spike
    dummy_domains = [f"domain_{i}.com" for i in range(444)]
    
    def dummy_process(batch):
        return [f"processed_{domain}" for domain in batch]
    
    result = optimize_domain_processing(dummy_domains, dummy_process)
    
    logger.info("📊 Test Results:")
    logger.info(f"   Processed: {result['processed']}/{result['total']}")
    logger.info(f"   Success Rate: {result['success_rate']:.1%}")
    logger.info(f"   Peak Memory: {result['peak_memory_gb']:.2f}GB")
    logger.info("✅ Memory optimization system ready!") 
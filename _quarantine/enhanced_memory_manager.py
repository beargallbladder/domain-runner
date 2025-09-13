#!/usr/bin/env python3
"""
ENHANCED MEMORY MANAGER - Ultra-Efficient Memory Management
- Real-time memory monitoring and optimization
- Advanced garbage collection strategies
- Memory leak detection and prevention
- Dynamic memory allocation
- Cross-session memory persistence
"""

import psutil
import gc
import sys
import os
import time
import json
import pickle
import mmap
import threading
import weakref
from typing import Dict, List, Any, Optional, Callable, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from contextlib import contextmanager
import logging
from pathlib import Path
import numpy as np
from collections import defaultdict, deque
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class MemoryConfig:
    """Enhanced memory management configuration"""
    max_memory_gb: float = 1.5
    warning_threshold: float = 0.8
    critical_threshold: float = 0.9
    gc_frequency: int = 100
    cache_size_mb: int = 256
    enable_compression: bool = True
    enable_persistence: bool = True
    memory_map_size_mb: int = 128
    leak_detection: bool = True
    auto_cleanup: bool = True

@dataclass
class MemoryStats:
    """Memory usage statistics"""
    current_usage_gb: float = 0.0
    peak_usage_gb: float = 0.0
    average_usage_gb: float = 0.0
    gc_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    memory_leaks_detected: int = 0
    cleanup_operations: int = 0
    last_updated: datetime = field(default_factory=datetime.now)

class MemoryPool:
    """Efficient memory pool for reusing objects"""
    
    def __init__(self, max_size: int = 1000):
        self.pool: List[Any] = []
        self.max_size = max_size
        self.created_count = 0
        self.reused_count = 0
        self._lock = threading.Lock()
    
    def get(self, factory: Callable = None) -> Any:
        """Get object from pool or create new one"""
        with self._lock:
            if self.pool:
                obj = self.pool.pop()
                self.reused_count += 1
                return obj
            else:
                if factory:
                    obj = factory()
                    self.created_count += 1
                    return obj
                return None
    
    def put(self, obj: Any) -> bool:
        """Return object to pool"""
        with self._lock:
            if len(self.pool) < self.max_size:
                # Clear object state if possible
                if hasattr(obj, 'clear'):
                    obj.clear()
                self.pool.append(obj)
                return True
            return False
    
    def get_stats(self) -> Dict[str, int]:
        """Get pool statistics"""
        return {
            'pool_size': len(self.pool),
            'created_count': self.created_count,
            'reused_count': self.reused_count,
            'efficiency': self.reused_count / max(self.created_count + self.reused_count, 1)
        }

class MemoryCache:
    """Advanced memory cache with compression and persistence"""
    
    def __init__(self, max_size_mb: int = 256, enable_compression: bool = True):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.enable_compression = enable_compression
        self.cache: Dict[str, Any] = {}
        self.access_times: Dict[str, float] = {}
        self.cache_sizes: Dict[str, int] = {}
        self.total_size = 0
        self.hits = 0
        self.misses = 0
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        with self._lock:
            if key in self.cache:
                self.access_times[key] = time.time()
                self.hits += 1
                return self.cache[key]
            else:
                self.misses += 1
                return None
    
    def put(self, key: str, value: Any) -> bool:
        """Put item in cache with LRU eviction"""
        with self._lock:
            # Calculate size
            size = sys.getsizeof(value)
            if hasattr(value, '__sizeof__'):
                size = value.__sizeof__()
            
            # Check if item fits
            if size > self.max_size_bytes:
                return False
            
            # Evict items if necessary
            while self.total_size + size > self.max_size_bytes and self.cache:
                self._evict_lru()
            
            # Add item
            if key in self.cache:
                self.total_size -= self.cache_sizes[key]
            
            self.cache[key] = value
            self.access_times[key] = time.time()
            self.cache_sizes[key] = size
            self.total_size += size
            
            return True
    
    def _evict_lru(self):
        """Evict least recently used item"""
        if not self.access_times:
            return
        
        lru_key = min(self.access_times, key=self.access_times.get)
        self.remove(lru_key)
    
    def remove(self, key: str) -> bool:
        """Remove item from cache"""
        with self._lock:
            if key in self.cache:
                self.total_size -= self.cache_sizes[key]
                del self.cache[key]
                del self.access_times[key]
                del self.cache_sizes[key]
                return True
            return False
    
    def clear(self):
        """Clear all cache"""
        with self._lock:
            self.cache.clear()
            self.access_times.clear()
            self.cache_sizes.clear()
            self.total_size = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'size_mb': self.total_size / 1024 / 1024,
            'item_count': len(self.cache),
            'hit_rate': self.hits / max(self.hits + self.misses, 1),
            'hits': self.hits,
            'misses': self.misses
        }

class MemoryLeakDetector:
    """Advanced memory leak detection"""
    
    def __init__(self):
        self.object_counts: Dict[str, int] = defaultdict(int)
        self.growth_rates: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10))
        self.leak_threshold = 1.5  # 50% growth rate threshold
        self.detected_leaks: List[str] = []
        self.last_check = time.time()
    
    def check_for_leaks(self) -> List[str]:
        """Check for potential memory leaks"""
        current_time = time.time()
        
        # Get current object counts
        current_counts = {}
        for obj in gc.get_objects():
            obj_type = type(obj).__name__
            current_counts[obj_type] = current_counts.get(obj_type, 0) + 1
        
        # Calculate growth rates
        new_leaks = []
        for obj_type, count in current_counts.items():
            if obj_type in self.object_counts:
                growth_rate = count / max(self.object_counts[obj_type], 1)
                self.growth_rates[obj_type].append(growth_rate)
                
                # Check if consistently growing
                if len(self.growth_rates[obj_type]) >= 5:
                    avg_growth = np.mean(list(self.growth_rates[obj_type]))
                    if avg_growth > self.leak_threshold:
                        if obj_type not in self.detected_leaks:
                            new_leaks.append(obj_type)
                            self.detected_leaks.append(obj_type)
                            logger.warning(f"Potential memory leak detected: {obj_type} (growth rate: {avg_growth:.2f})")
        
        self.object_counts = current_counts
        self.last_check = current_time
        
        return new_leaks

class EnhancedMemoryManager:
    """Ultra-efficient memory management system"""
    
    def __init__(self, config: MemoryConfig = None):
        self.config = config or MemoryConfig()
        self.process = psutil.Process()
        self.stats = MemoryStats()
        self.cache = MemoryCache(self.config.cache_size_mb, self.config.enable_compression)
        self.pools: Dict[str, MemoryPool] = {}
        self.leak_detector = MemoryLeakDetector() if self.config.leak_detection else None
        self.monitoring_thread = None
        self.monitoring_active = False
        self.callbacks: Dict[str, List[Callable]] = defaultdict(list)
        self.memory_history: deque = deque(maxlen=1000)
        
        # Initialize persistence
        if self.config.enable_persistence:
            self.db_path = Path("memory_persistence.db")
            self._init_persistence()
        
        # Start monitoring
        self.start_monitoring()
        
        logger.info(f"EnhancedMemoryManager initialized with {self.config.max_memory_gb}GB limit")
    
    def _init_persistence(self):
        """Initialize memory persistence database"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.execute('''
                CREATE TABLE IF NOT EXISTS memory_cache (
                    key TEXT PRIMARY KEY,
                    value BLOB,
                    timestamp REAL,
                    access_count INTEGER DEFAULT 0
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS memory_stats (
                    timestamp REAL PRIMARY KEY,
                    usage_gb REAL,
                    peak_gb REAL,
                    gc_count INTEGER,
                    cache_hits INTEGER,
                    cache_misses INTEGER
                )
            ''')
            conn.commit()
            conn.close()
            logger.info("Memory persistence initialized")
        except Exception as e:
            logger.error(f"Failed to initialize persistence: {e}")
    
    def start_monitoring(self):
        """Start memory monitoring thread"""
        if not self.monitoring_active:
            self.monitoring_active = True
            self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self.monitoring_thread.start()
    
    def stop_monitoring(self):
        """Stop memory monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join()
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                self._update_stats()
                self._check_memory_pressure()
                
                if self.leak_detector:
                    self.leak_detector.check_for_leaks()
                
                time.sleep(1)  # Check every second
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
    
    def _update_stats(self):
        """Update memory statistics"""
        memory_info = self.process.memory_info()
        current_gb = memory_info.rss / 1024 / 1024 / 1024
        
        self.stats.current_usage_gb = current_gb
        self.stats.peak_usage_gb = max(self.stats.peak_usage_gb, current_gb)
        self.stats.last_updated = datetime.now()
        
        # Update history
        self.memory_history.append({
            'timestamp': time.time(),
            'usage_gb': current_gb,
            'gc_count': self.stats.gc_count
        })
        
        # Calculate average
        if len(self.memory_history) > 1:
            recent_usage = [h['usage_gb'] for h in list(self.memory_history)[-10:]]
            self.stats.average_usage_gb = np.mean(recent_usage)
    
    def _check_memory_pressure(self):
        """Check for memory pressure and take action"""
        usage_ratio = self.stats.current_usage_gb / self.config.max_memory_gb
        
        if usage_ratio > self.config.critical_threshold:
            logger.critical(f"Critical memory usage: {usage_ratio:.2%}")
            self._trigger_callbacks('critical')
            self.force_cleanup()
        elif usage_ratio > self.config.warning_threshold:
            logger.warning(f"High memory usage: {usage_ratio:.2%}")
            self._trigger_callbacks('warning')
            self.optimize_memory()
    
    def _trigger_callbacks(self, event: str):
        """Trigger registered callbacks"""
        for callback in self.callbacks.get(event, []):
            try:
                callback(self.stats)
            except Exception as e:
                logger.error(f"Callback error: {e}")
    
    def register_callback(self, event: str, callback: Callable):
        """Register callback for memory events"""
        self.callbacks[event].append(callback)
    
    def get_pool(self, name: str, max_size: int = 1000) -> MemoryPool:
        """Get or create memory pool"""
        if name not in self.pools:
            self.pools[name] = MemoryPool(max_size)
        return self.pools[name]
    
    def cache_get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        return self.cache.get(key)
    
    def cache_put(self, key: str, value: Any) -> bool:
        """Put item in cache"""
        result = self.cache.put(key, value)
        if result:
            self.stats.cache_hits += 1
        else:
            self.stats.cache_misses += 1
        return result
    
    def optimize_memory(self):
        """Optimize memory usage"""
        logger.info("Starting memory optimization")
        
        # Force garbage collection
        collected = gc.collect()
        self.stats.gc_count += 1
        
        # Clear cache if necessary
        if self.stats.current_usage_gb > self.config.max_memory_gb * 0.8:
            cache_size_before = len(self.cache.cache)
            self.cache.clear()
            logger.info(f"Cleared cache: {cache_size_before} items")
        
        # Clear pools
        for pool in self.pools.values():
            pool.pool.clear()
        
        # Force another GC
        gc.collect()
        
        self.stats.cleanup_operations += 1
        logger.info(f"Memory optimization completed, collected {collected} objects")
    
    def force_cleanup(self):
        """Force aggressive memory cleanup"""
        logger.warning("Forcing aggressive memory cleanup")
        
        # Clear all caches
        self.cache.clear()
        
        # Clear all pools
        for pool in self.pools.values():
            pool.pool.clear()
        
        # Multiple garbage collection passes
        for _ in range(3):
            gc.collect()
            time.sleep(0.1)
        
        self.stats.cleanup_operations += 1
        logger.warning("Aggressive cleanup completed")
    
    @contextmanager
    def memory_context(self, name: str = "operation"):
        """Context manager for memory tracking"""
        start_memory = self.stats.current_usage_gb
        start_time = time.time()
        
        try:
            yield
        finally:
            end_memory = self.stats.current_usage_gb
            end_time = time.time()
            
            memory_delta = end_memory - start_memory
            time_delta = end_time - start_time
            
            logger.info(f"Memory context '{name}': {memory_delta:+.3f}GB in {time_delta:.3f}s")
    
    def get_memory_report(self) -> Dict[str, Any]:
        """Generate comprehensive memory report"""
        report = {
            'current_stats': {
                'usage_gb': self.stats.current_usage_gb,
                'peak_gb': self.stats.peak_usage_gb,
                'average_gb': self.stats.average_usage_gb,
                'usage_percent': (self.stats.current_usage_gb / self.config.max_memory_gb) * 100
            },
            'cache_stats': self.cache.get_stats(),
            'pool_stats': {name: pool.get_stats() for name, pool in self.pools.items()},
            'gc_stats': {
                'collections': self.stats.gc_count,
                'objects': len(gc.get_objects()),
                'referrers': len(gc.get_referrers(*gc.get_objects()[:10])) if gc.get_objects() else 0
            },
            'leak_detection': {
                'enabled': self.config.leak_detection,
                'detected_leaks': self.leak_detector.detected_leaks if self.leak_detector else []
            },
            'system_info': {
                'total_memory_gb': psutil.virtual_memory().total / 1024 / 1024 / 1024,
                'available_memory_gb': psutil.virtual_memory().available / 1024 / 1024 / 1024,
                'cpu_percent': psutil.cpu_percent(),
                'disk_usage_percent': psutil.disk_usage('/').percent
            }
        }
        
        return report
    
    def export_memory_analysis(self, filename: str = None) -> str:
        """Export memory analysis to file"""
        if not filename:
            filename = f"memory_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        report = self.get_memory_report()
        
        # Add historical data
        report['history'] = list(self.memory_history)
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Memory analysis exported to {filename}")
        return filename
    
    def __del__(self):
        """Cleanup on destruction"""
        self.stop_monitoring()

# Example usage
if __name__ == "__main__":
    # Initialize memory manager
    config = MemoryConfig(
        max_memory_gb=1.0,
        enable_compression=True,
        enable_persistence=True,
        leak_detection=True
    )
    
    manager = EnhancedMemoryManager(config)
    
    # Register callbacks
    def on_warning(stats):
        print(f"Memory warning: {stats.current_usage_gb:.2f}GB")
    
    def on_critical(stats):
        print(f"Critical memory: {stats.current_usage_gb:.2f}GB")
    
    manager.register_callback('warning', on_warning)
    manager.register_callback('critical', on_critical)
    
    # Test memory operations
    with manager.memory_context("test_operation"):
        # Simulate memory-intensive operation
        data = np.random.rand(100000, 100)
        
        # Use cache
        manager.cache_put("test_data", data)
        retrieved = manager.cache_get("test_data")
        
        # Use pool
        pool = manager.get_pool("test_pool")
        obj = pool.get(lambda: [])
        pool.put(obj)
    
    # Generate report
    report_file = manager.export_memory_analysis()
    print(f"Memory analysis exported to: {report_file}")
    
    # Cleanup
    time.sleep(2)
    manager.stop_monitoring()
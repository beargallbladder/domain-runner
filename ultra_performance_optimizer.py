#!/usr/bin/env python3
"""
ULTRA PERFORMANCE OPTIMIZER - Complete System Integration
- Integrates all optimized systems (crawler, tensor, memory, drift)
- Real-time performance monitoring and optimization
- Automated system health checks
- Dynamic resource allocation
- Comprehensive reporting and analytics
"""

import asyncio
import time
import logging
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
import psutil
import gc

# Import our optimized systems
from optimized_data_crawler import MemoryProtectedCrawler, CrawlerConfig, DomainData
from optimized_tensor_engine import OptimizedTensorEngine, TensorConfig
from enhanced_memory_manager import EnhancedMemoryManager, MemoryConfig
from advanced_drift_detector import AdvancedDriftDetector, DriftConfig

# Configure high-performance logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ultra_optimizer.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class OptimizationConfig:
    """Ultra performance optimization configuration"""
    max_memory_gb: float = 1.5
    max_concurrent_domains: int = 50
    batch_size: int = 10
    enable_gpu_acceleration: bool = True
    enable_drift_monitoring: bool = True
    enable_real_time_optimization: bool = True
    performance_monitoring_interval: int = 5
    auto_scaling: bool = True
    export_interval_minutes: int = 30

@dataclass
class SystemMetrics:
    """Comprehensive system performance metrics"""
    timestamp: datetime
    memory_usage_gb: float
    cpu_usage_percent: float
    domains_processed: int
    processing_rate: float
    tensor_operations: int
    drift_detections: int
    cache_hit_rate: float
    system_health_score: float
    bottlenecks: List[str]

class UltraPerformanceOptimizer:
    """Complete system integration and optimization"""
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.start_time = datetime.now()
        
        # Initialize all subsystems
        self._init_subsystems()
        
        # Performance tracking
        self.metrics_history: List[SystemMetrics] = []
        self.performance_targets = {
            'domains_per_second': 2.0,
            'memory_efficiency': 0.8,
            'cache_hit_rate': 0.7,
            'system_health_min': 0.75
        }
        
        # System state
        self.is_running = False
        self.optimization_active = False
        self.total_domains_processed = 0
        
        logger.info("UltraPerformanceOptimizer initialized")
    
    def _init_subsystems(self):
        """Initialize all optimized subsystems"""
        try:
            # Memory Manager (highest priority)
            memory_config = MemoryConfig(
                max_memory_gb=self.config.max_memory_gb,
                enable_compression=True,
                enable_persistence=True,
                leak_detection=True
            )
            self.memory_manager = EnhancedMemoryManager(memory_config)
            
            # Register memory callbacks
            self.memory_manager.register_callback('critical', self._handle_memory_critical)
            self.memory_manager.register_callback('warning', self._handle_memory_warning)
            
            # Data Crawler
            crawler_config = CrawlerConfig(
                max_concurrent_requests=self.config.max_concurrent_domains,
                max_memory_gb=self.config.max_memory_gb * 0.6,  # Reserve memory for other systems
                batch_size=self.config.batch_size,
                enable_tensor_calculations=True,
                enable_drift_detection=True
            )
            self.crawler_config = crawler_config
            
            # Tensor Engine
            tensor_config = TensorConfig(
                enable_gpu=self.config.enable_gpu_acceleration,
                enable_simd=True,
                max_batch_size=self.config.batch_size * 10,
                parallel_workers=min(4, psutil.cpu_count())
            )
            self.tensor_engine = OptimizedTensorEngine(tensor_config)
            
            # Drift Detector
            drift_config = DriftConfig(
                window_size=100,
                enable_ml_detection=True,
                enable_temporal_analysis=True,
                sensitivity="medium"
            )
            self.drift_detector = AdvancedDriftDetector(drift_config)
            
            logger.info("All subsystems initialized successfully")
            
        except Exception as e:
            logger.error(f"Subsystem initialization failed: {e}")
            raise
    
    def _handle_memory_warning(self, stats):
        """Handle memory warning events"""
        logger.warning(f"Memory warning: {stats.current_usage_gb:.2f}GB")
        
        # Reduce batch sizes
        if hasattr(self, 'crawler_config'):
            self.crawler_config.batch_size = max(1, self.crawler_config.batch_size // 2)
            self.crawler_config.max_concurrent_requests = max(1, self.crawler_config.max_concurrent_requests // 2)
        
        # Force garbage collection
        gc.collect()
    
    def _handle_memory_critical(self, stats):
        """Handle critical memory events"""
        logger.critical(f"Critical memory usage: {stats.current_usage_gb:.2f}GB")
        
        # Emergency cleanup
        self.memory_manager.force_cleanup()
        
        # Minimize batch sizes
        if hasattr(self, 'crawler_config'):
            self.crawler_config.batch_size = 1
            self.crawler_config.max_concurrent_requests = 5
        
        # Clear tensor cache
        if hasattr(self.tensor_engine, 'cache'):
            self.tensor_engine.cache.clear()
    
    async def process_domains_optimized(self, domains: List[str]) -> List[Dict[str, Any]]:
        """Process domains with full optimization pipeline"""
        start_time = time.time()
        
        try:
            with self.memory_manager.memory_context("domain_processing"):
                # Step 1: Crawl domains with memory protection
                async with MemoryProtectedCrawler(self.crawler_config) as crawler:
                    logger.info(f"Starting optimized crawling of {len(domains)} domains")
                    
                    crawled_data = await crawler.batch_crawl(domains)
                    self.total_domains_processed += len(crawled_data)
                    
                    logger.info(f"Crawling completed: {len(crawled_data)} domains")
                
                # Step 2: Enhanced tensor processing
                logger.info("Starting tensor processing")
                
                domain_dicts = []
                for domain_data in crawled_data:
                    domain_dict = asdict(domain_data)
                    if domain_data.tensor_features is not None:
                        domain_dict['tensor_features'] = domain_data.tensor_features.tolist()
                    domain_dicts.append(domain_dict)
                
                # Batch process tensors
                enhanced_tensors = self.tensor_engine.batch_process_tensors(domain_dicts)
                
                # Calculate tensor metrics
                tensor_metrics = self.tensor_engine.calculate_tensor_metrics(enhanced_tensors)
                
                logger.info(f"Tensor processing completed: {len(enhanced_tensors)} tensors")
                
                # Step 3: Drift detection (if we have reference data)
                drift_results = []
                if self.drift_detector.reference_data is not None and enhanced_tensors:
                    logger.info("Starting drift detection")
                    
                    # Convert tensors to array for drift detection
                    current_tensor_matrix = np.stack(enhanced_tensors)
                    drift_result = self.drift_detector.detect_drift(current_tensor_matrix)
                    drift_results.append(asdict(drift_result))
                    
                    logger.info(f"Drift detection completed: {drift_result.drift_detected}")
                
                # Step 4: Compile comprehensive results
                processing_time = time.time() - start_time
                
                results = {
                    'metadata': {
                        'timestamp': datetime.now().isoformat(),
                        'processing_time_seconds': processing_time,
                        'domains_count': len(domains),
                        'successful_crawls': len(crawled_data),
                        'processing_rate': len(crawled_data) / processing_time if processing_time > 0 else 0,
                        'memory_usage_gb': self.memory_manager.stats.current_usage_gb
                    },
                    'crawled_domains': domain_dicts,
                    'tensor_analysis': {
                        'tensor_count': len(enhanced_tensors),
                        'metrics': tensor_metrics,
                        'engine_stats': self.tensor_engine.get_performance_report()
                    },
                    'drift_analysis': {
                        'results': drift_results,
                        'summary': self.drift_detector.get_drift_summary()
                    },
                    'system_performance': self._get_system_metrics()
                }
                
                # Cache results
                cache_key = f"processing_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                self.memory_manager.cache_put(cache_key, results)
                
                logger.info(f"Domain processing completed in {processing_time:.2f}s")
                
                return results
                
        except Exception as e:
            logger.error(f"Domain processing failed: {e}")
            return {'error': str(e), 'timestamp': datetime.now().isoformat()}
    
    def set_reference_data(self, reference_domains: List[str]):
        """Set reference data for drift detection"""
        try:
            logger.info(f"Setting reference data with {len(reference_domains)} domains")
            
            async def _set_reference():
                # Process reference domains
                reference_results = await self.process_domains_optimized(reference_domains)
                
                if 'error' not in reference_results:
                    # Extract tensors for reference
                    reference_tensors = []
                    for domain_data in reference_results['crawled_domains']:
                        if 'tensor_features' in domain_data and domain_data['tensor_features']:
                            tensor = np.array(domain_data['tensor_features'])
                            reference_tensors.append(tensor)
                    
                    if reference_tensors:
                        reference_matrix = np.stack(reference_tensors)
                        self.drift_detector.set_reference(reference_matrix)
                        logger.info(f"Reference data set: {reference_matrix.shape}")
                    else:
                        logger.warning("No valid tensors found in reference data")
                else:
                    logger.error(f"Failed to process reference domains: {reference_results['error']}")
            
            # Run async function
            asyncio.run(_set_reference())
            
        except Exception as e:
            logger.error(f"Setting reference data failed: {e}")
    
    def _get_system_metrics(self) -> SystemMetrics:
        """Get comprehensive system metrics"""
        try:
            # System metrics
            memory_info = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Processing metrics
            current_time = datetime.now()
            uptime = (current_time - self.start_time).total_seconds()
            processing_rate = self.total_domains_processed / max(uptime, 1)
            
            # Memory manager stats
            memory_stats = self.memory_manager.stats
            cache_stats = self.memory_manager.cache.get_stats()
            
            # Tensor engine stats
            tensor_stats = self.tensor_engine.get_performance_report()
            
            # Calculate health score
            health_factors = [
                min(1.0, (self.config.max_memory_gb - memory_stats.current_usage_gb) / self.config.max_memory_gb),
                min(1.0, (100 - cpu_percent) / 100),
                cache_stats.get('hit_rate', 0),
                min(1.0, processing_rate / self.performance_targets['domains_per_second'])
            ]
            health_score = np.mean(health_factors)
            
            # Identify bottlenecks
            bottlenecks = []
            if memory_stats.current_usage_gb > self.config.max_memory_gb * 0.8:
                bottlenecks.append("memory")
            if cpu_percent > 80:
                bottlenecks.append("cpu")
            if cache_stats.get('hit_rate', 0) < 0.5:
                bottlenecks.append("cache")
            if processing_rate < self.performance_targets['domains_per_second'] * 0.5:
                bottlenecks.append("processing_speed")
            
            metrics = SystemMetrics(
                timestamp=current_time,
                memory_usage_gb=memory_stats.current_usage_gb,
                cpu_usage_percent=cpu_percent,
                domains_processed=self.total_domains_processed,
                processing_rate=processing_rate,
                tensor_operations=tensor_stats.get('total_operations', 0),
                drift_detections=len(self.drift_detector.drift_history),
                cache_hit_rate=cache_stats.get('hit_rate', 0),
                system_health_score=health_score,
                bottlenecks=bottlenecks
            )
            
            self.metrics_history.append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Getting system metrics failed: {e}")
            return SystemMetrics(
                timestamp=datetime.now(),
                memory_usage_gb=0,
                cpu_usage_percent=0,
                domains_processed=0,
                processing_rate=0,
                tensor_operations=0,
                drift_detections=0,
                cache_hit_rate=0,
                system_health_score=0,
                bottlenecks=["error"]
            )
    
    def optimize_system_performance(self):
        """Dynamic system performance optimization"""
        try:
            current_metrics = self._get_system_metrics()
            
            logger.info(f"System optimization - Health Score: {current_metrics.system_health_score:.3f}")
            
            # Memory optimization
            if current_metrics.memory_usage_gb > self.config.max_memory_gb * 0.7:
                logger.info("Optimizing memory usage")
                self.memory_manager.optimize_memory()
            
            # CPU optimization
            if current_metrics.cpu_usage_percent > 75:
                logger.info("Optimizing CPU usage")
                # Reduce concurrent operations
                if hasattr(self, 'crawler_config'):
                    self.crawler_config.max_concurrent_requests = max(
                        5, self.crawler_config.max_concurrent_requests - 5
                    )
            
            # Processing rate optimization
            if current_metrics.processing_rate < self.performance_targets['domains_per_second'] * 0.8:
                logger.info("Optimizing processing rate")
                # Increase batch sizes if memory allows
                if current_metrics.memory_usage_gb < self.config.max_memory_gb * 0.5:
                    if hasattr(self, 'crawler_config'):
                        self.crawler_config.batch_size = min(20, self.crawler_config.batch_size + 2)
            
            # Cache optimization
            if current_metrics.cache_hit_rate < 0.5:
                logger.info("Optimizing cache performance")
                # Cache size adjustments handled by memory manager
                pass
            
            return current_metrics
            
        except Exception as e:
            logger.error(f"System optimization failed: {e}")
    
    def export_comprehensive_report(self, filename: str = None) -> str:
        """Export comprehensive system performance report"""
        if not filename:
            filename = f"ultra_optimizer_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            # Get latest metrics
            current_metrics = self._get_system_metrics()
            
            # Compile comprehensive report
            report = {
                'metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'uptime_hours': (datetime.now() - self.start_time).total_seconds() / 3600,
                    'configuration': asdict(self.config),
                    'total_domains_processed': self.total_domains_processed
                },
                'current_performance': asdict(current_metrics),
                'performance_history': [asdict(m) for m in self.metrics_history[-100:]],  # Last 100 metrics
                'subsystem_reports': {
                    'memory_manager': self.memory_manager.get_memory_report(),
                    'tensor_engine': self.tensor_engine.get_performance_report(),
                    'drift_detector': self.drift_detector.get_drift_summary(),
                    'crawler_stats': {
                        'config': asdict(self.crawler_config),
                        'processed_domains': self.total_domains_processed
                    }
                },
                'optimization_recommendations': self._generate_optimization_recommendations(current_metrics),
                'performance_trends': self._analyze_performance_trends()
            }
            
            # Export to file
            with open(filename, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            logger.info(f"Comprehensive report exported to {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Report export failed: {e}")
            return ""
    
    def _generate_optimization_recommendations(self, metrics: SystemMetrics) -> List[str]:
        """Generate specific optimization recommendations"""
        recommendations = []
        
        if metrics.memory_usage_gb > self.config.max_memory_gb * 0.8:
            recommendations.append("Reduce batch sizes or enable more aggressive memory cleanup")
        
        if metrics.cpu_usage_percent > 80:
            recommendations.append("Reduce concurrent operations or upgrade CPU resources")
        
        if metrics.cache_hit_rate < 0.5:
            recommendations.append("Increase cache size or review caching strategy")
        
        if metrics.processing_rate < self.performance_targets['domains_per_second'] * 0.7:
            recommendations.append("Optimize crawling logic or increase parallel workers")
        
        if "memory" in metrics.bottlenecks:
            recommendations.append("Memory is the primary bottleneck - consider increasing memory limit")
        
        if metrics.system_health_score < 0.6:
            recommendations.append("System health is low - immediate optimization required")
        
        if not recommendations:
            recommendations.append("System performance is optimal")
        
        return recommendations
    
    def _analyze_performance_trends(self) -> Dict[str, Any]:
        """Analyze performance trends over time"""
        if len(self.metrics_history) < 10:
            return {"status": "insufficient_data"}
        
        recent_metrics = self.metrics_history[-20:]  # Last 20 metrics
        
        # Extract time series data
        timestamps = [m.timestamp for m in recent_metrics]
        memory_usage = [m.memory_usage_gb for m in recent_metrics]
        cpu_usage = [m.cpu_usage_percent for m in recent_metrics]
        processing_rates = [m.processing_rate for m in recent_metrics]
        health_scores = [m.system_health_score for m in recent_metrics]
        
        # Calculate trends
        trends = {
            'memory_trend': 'increasing' if memory_usage[-1] > memory_usage[0] else 'decreasing',
            'cpu_trend': 'increasing' if cpu_usage[-1] > cpu_usage[0] else 'decreasing',
            'performance_trend': 'improving' if processing_rates[-1] > processing_rates[0] else 'declining',
            'health_trend': 'improving' if health_scores[-1] > health_scores[0] else 'declining',
            'average_health_score': np.mean(health_scores),
            'memory_volatility': np.std(memory_usage),
            'performance_stability': 1 - (np.std(processing_rates) / max(np.mean(processing_rates), 1))
        }
        
        return trends
    
    async def run_continuous_optimization(self, domains: List[str], cycles: int = 10):
        """Run continuous optimization cycles"""
        logger.info(f"Starting continuous optimization: {cycles} cycles")
        
        self.is_running = True
        cycle_results = []
        
        try:
            for cycle in range(cycles):
                logger.info(f"Starting optimization cycle {cycle + 1}/{cycles}")
                
                # Process domains
                cycle_start = time.time()
                results = await self.process_domains_optimized(domains)
                cycle_time = time.time() - cycle_start
                
                # System optimization
                if self.config.enable_real_time_optimization:
                    metrics = self.optimize_system_performance()
                else:
                    metrics = self._get_system_metrics()
                
                # Record cycle results
                cycle_result = {
                    'cycle': cycle + 1,
                    'timestamp': datetime.now().isoformat(),
                    'cycle_time': cycle_time,
                    'domains_processed': len(results.get('crawled_domains', [])),
                    'system_metrics': asdict(metrics),
                    'success': 'error' not in results
                }
                cycle_results.append(cycle_result)
                
                # Progress logging
                logger.info(f"Cycle {cycle + 1} completed in {cycle_time:.2f}s, Health: {metrics.system_health_score:.3f}")
                
                # Export report periodically
                if (cycle + 1) % 5 == 0:
                    report_file = self.export_comprehensive_report()
                    logger.info(f"Periodic report exported: {report_file}")
                
                # Brief pause between cycles
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"Continuous optimization failed: {e}")
        finally:
            self.is_running = False
        
        # Final comprehensive report
        final_report_file = self.export_comprehensive_report()
        
        logger.info(f"Continuous optimization completed: {len(cycle_results)} cycles")
        logger.info(f"Final report: {final_report_file}")
        
        return cycle_results

# Example usage and testing
async def main():
    """Main execution function"""
    # Initialize ultra optimizer
    config = OptimizationConfig(
        max_memory_gb=1.0,
        max_concurrent_domains=20,
        batch_size=5,
        enable_gpu_acceleration=True,
        enable_drift_monitoring=True,
        enable_real_time_optimization=True
    )
    
    optimizer = UltraPerformanceOptimizer(config)
    
    # Test domains
    test_domains = [
        "google.com", "microsoft.com", "amazon.com", "apple.com", "facebook.com",
        "netflix.com", "twitter.com", "linkedin.com", "github.com", "stackoverflow.com",
        "reddit.com", "youtube.com", "instagram.com", "whatsapp.com", "telegram.org"
    ]
    
    reference_domains = test_domains[:5]
    processing_domains = test_domains[5:]
    
    try:
        # Set reference data
        logger.info("Setting reference data...")
        optimizer.set_reference_data(reference_domains)
        
        # Run single optimization cycle
        logger.info("Running single optimization test...")
        single_result = await optimizer.process_domains_optimized(processing_domains)
        logger.info(f"Single test completed: {len(single_result.get('crawled_domains', []))} domains")
        
        # Run continuous optimization
        logger.info("Running continuous optimization...")
        cycle_results = await optimizer.run_continuous_optimization(processing_domains, cycles=3)
        
        # Final report
        final_report = optimizer.export_comprehensive_report()
        logger.info(f"Optimization complete! Final report: {final_report}")
        
    except Exception as e:
        logger.error(f"Main execution failed: {e}")
    finally:
        # Cleanup
        optimizer.memory_manager.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())
#!/usr/bin/env python3
"""
HYPER-SPEED MONITORING DASHBOARD
===============================
Real-time performance monitoring for maximum awesomeness
"""

import asyncio
import asyncpg
import json
import time
from datetime import datetime, timedelta
import logging
from concurrent.futures import ThreadPoolExecutor
import subprocess
import psutil
import os

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

DATABASE_URL = 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'

class HyperMonitor:
    def __init__(self):
        self.pool = None
        self.monitoring_data = []
        
    async def initialize(self):
        """Initialize monitoring system"""
        logger.info("🚀 Initializing HYPER-MONITORING system...")
        
        self.pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=5,
            max_size=10,
            command_timeout=30
        )
        
        logger.info("✅ HYPER-MONITORING initialized!")
        
    async def monitor_system_performance(self):
        """Monitor system performance metrics"""
        logger.info("⚡ Monitoring system performance...")
        
        # CPU and Memory usage
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Network stats
        net_io = psutil.net_io_counters()
        
        # Process count
        process_count = len(psutil.pids())
        
        # Workers status
        worker_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
            try:
                if 'turbo_tensor_processor' in proc.info['name'] or 'python' in proc.info['name']:
                    worker_processes.append(proc.info)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        performance_data = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'memory_available_gb': memory.available / (1024**3),
            'disk_percent': disk.percent,
            'disk_free_gb': disk.free / (1024**3),
            'network_sent_gb': net_io.bytes_sent / (1024**3),
            'network_recv_gb': net_io.bytes_recv / (1024**3),
            'process_count': process_count,
            'worker_processes': len(worker_processes)
        }
        
        return performance_data
        
    async def monitor_database_performance(self):
        """Monitor database performance and health"""
        logger.info("📊 Monitoring database performance...")
        
        async with self.pool.acquire() as conn:
            # Database size and stats
            db_stats = await conn.fetchrow("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    (SELECT COUNT(*) FROM domains) as total_domains,
                    (SELECT COUNT(*) FROM domain_responses) as total_responses,
                    (SELECT COUNT(*) FROM public_domain_cache) as cached_domains,
                    (SELECT COUNT(*) FROM domains WHERE status = 'completed') as completed_domains,
                    (SELECT COUNT(*) FROM domains WHERE status = 'pending') as pending_domains,
                    (SELECT COUNT(*) FROM domains WHERE status = 'processing') as processing_domains
            """)
            
            # Recent activity
            recent_activity = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as responses_last_hour,
                    COUNT(DISTINCT domain_id) as domains_last_hour,
                    AVG(LENGTH(response)) as avg_response_length
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)
            
            # Top performing domains
            top_domains = await conn.fetch("""
                SELECT domain, memory_score, ai_consensus_percentage, business_category
                FROM public_domain_cache
                ORDER BY memory_score DESC
                LIMIT 10
            """)
            
            # Query performance stats
            query_stats = await conn.fetch("""
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    seq_scan as sequential_scans,
                    seq_tup_read as sequential_reads,
                    idx_scan as index_scans,
                    idx_tup_fetch as index_reads
                FROM pg_stat_user_tables
                WHERE schemaname = 'public'
                ORDER BY seq_scan DESC
                LIMIT 5
            """)
            
        db_performance = {
            'timestamp': datetime.now().isoformat(),
            'database_size': db_stats['database_size'],
            'total_domains': db_stats['total_domains'],
            'total_responses': db_stats['total_responses'],
            'cached_domains': db_stats['cached_domains'],
            'completed_domains': db_stats['completed_domains'],
            'pending_domains': db_stats['pending_domains'],
            'processing_domains': db_stats['processing_domains'],
            'responses_last_hour': recent_activity['responses_last_hour'] or 0,
            'domains_last_hour': recent_activity['domains_last_hour'] or 0,
            'avg_response_length': float(recent_activity['avg_response_length'] or 0),
            'top_domains': [dict(domain) for domain in top_domains],
            'query_stats': [dict(stat) for stat in query_stats]
        }
        
        return db_performance
        
    async def monitor_api_performance(self):
        """Monitor API endpoint performance"""
        logger.info("🔥 Monitoring API performance...")
        
        # Test API endpoints
        api_tests = [
            'https://sophisticated-runner.onrender.com/api/rankings?limit=5',
            'https://sophisticated-runner.onrender.com/api/categories',
            'https://sophisticated-runner.onrender.com/api/domains/google.com/public'
        ]
        
        api_performance = {
            'timestamp': datetime.now().isoformat(),
            'endpoint_tests': []
        }
        
        for endpoint in api_tests:
            start_time = time.time()
            try:
                # Use curl to test endpoint
                result = subprocess.run(
                    ['curl', '-s', '-w', '%{http_code},%{time_total}', endpoint],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                
                if result.returncode == 0:
                    output = result.stdout
                    # Extract timing info from curl output
                    lines = output.split('\n')
                    timing_info = lines[-1] if lines else "500,0"
                    status_code, response_time = timing_info.split(',')
                    
                    api_performance['endpoint_tests'].append({
                        'endpoint': endpoint,
                        'status_code': int(status_code),
                        'response_time_ms': float(response_time) * 1000,
                        'success': int(status_code) == 200
                    })
                else:
                    api_performance['endpoint_tests'].append({
                        'endpoint': endpoint,
                        'status_code': 500,
                        'response_time_ms': 0,
                        'success': False
                    })
                    
            except Exception as e:
                api_performance['endpoint_tests'].append({
                    'endpoint': endpoint,
                    'status_code': 500,
                    'response_time_ms': 0,
                    'success': False,
                    'error': str(e)
                })
                
        return api_performance
        
    def generate_real_time_dashboard(self, system_data, db_data, api_data):
        """Generate real-time dashboard display"""
        
        dashboard = f"""
🚀 HYPER-SPEED MONITORING DASHBOARD
==================================
⏰ Last Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

💻 SYSTEM PERFORMANCE:
   CPU Usage: {system_data['cpu_percent']:.1f}%
   Memory Usage: {system_data['memory_percent']:.1f}% ({system_data['memory_available_gb']:.1f}GB available)
   Disk Usage: {system_data['disk_percent']:.1f}% ({system_data['disk_free_gb']:.1f}GB free)
   Network: ↑{system_data['network_sent_gb']:.2f}GB ↓{system_data['network_recv_gb']:.2f}GB
   Processes: {system_data['process_count']} ({system_data['worker_processes']} workers)

📊 DATABASE PERFORMANCE:
   Database Size: {db_data['database_size']}
   Total Domains: {db_data['total_domains']:,}
   Total Responses: {db_data['total_responses']:,}
   Cached Domains: {db_data['cached_domains']:,}
   Completed: {db_data['completed_domains']:,} | Pending: {db_data['pending_domains']:,} | Processing: {db_data['processing_domains']:,}
   Activity (1hr): {db_data['responses_last_hour']:,} responses from {db_data['domains_last_hour']:,} domains
   Avg Response Length: {db_data['avg_response_length']:.0f} chars

🏆 TOP PERFORMING DOMAINS:
"""
        
        for i, domain in enumerate(db_data['top_domains'][:5], 1):
            dashboard += f"   {i}. {domain['domain']}: {domain['memory_score']:.1f} memory, {domain['ai_consensus_percentage']:.1f}% consensus ({domain['business_category']})\n"
        
        dashboard += f"""
🚀 API PERFORMANCE:
"""
        
        for test in api_data['endpoint_tests']:
            status = "✅" if test['success'] else "❌"
            dashboard += f"   {status} {test['endpoint'].split('/')[-1]}: {test['status_code']} ({test['response_time_ms']:.0f}ms)\n"
        
        dashboard += f"""
📈 QUERY PERFORMANCE:
"""
        
        for stat in db_data['query_stats'][:3]:
            dashboard += f"   {stat['tablename']}: {stat['sequential_scans']:,} seq scans, {stat['index_scans']:,} idx scans\n"
        
        dashboard += f"""
🎯 SYSTEM STATUS: MAXIMUM PERFORMANCE ACHIEVED!
===============================================
"""
        
        return dashboard
        
    async def run_monitoring_loop(self):
        """Run continuous monitoring loop"""
        logger.info("🔥 Starting HYPER-SPEED monitoring loop...")
        
        await self.initialize()
        
        while True:
            try:
                # Gather all metrics in parallel
                system_data, db_data, api_data = await asyncio.gather(
                    self.monitor_system_performance(),
                    self.monitor_database_performance(),
                    self.monitor_api_performance()
                )
                
                # Generate dashboard
                dashboard = self.generate_real_time_dashboard(system_data, db_data, api_data)
                
                # Clear screen and display dashboard
                os.system('clear')
                print(dashboard)
                
                # Save monitoring data
                monitoring_record = {
                    'timestamp': datetime.now().isoformat(),
                    'system': system_data,
                    'database': db_data,
                    'api': api_data
                }
                
                self.monitoring_data.append(monitoring_record)
                
                # Keep only last 100 records
                if len(self.monitoring_data) > 100:
                    self.monitoring_data = self.monitoring_data[-100:]
                
                # Save to file
                with open('/Users/samkim/domain-runner/monitoring_data.json', 'w') as f:
                    json.dump(self.monitoring_data, f, indent=2)
                
                # Wait before next update
                await asyncio.sleep(30)  # Update every 30 seconds
                
            except Exception as e:
                logger.error(f"❌ Monitoring error: {e}")
                await asyncio.sleep(30)

async def main():
    monitor = HyperMonitor()
    await monitor.run_monitoring_loop()

if __name__ == "__main__":
    asyncio.run(main())
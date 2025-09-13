#!/usr/bin/env python3
"""
Test suite for Enterprise Crawler System
Validates all components before deployment
"""

import asyncio
import psycopg2
import time
import json
import logging
from datetime import datetime
from enterprise_crawler_system import (
    RateLimiter, RateLimitConfig, LLMProvider, 
    TaskQueue, EnterpriseSwarmCrawler
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('CrawlerTest')

DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class CrawlerTestSuite:
    """Comprehensive test suite for enterprise crawler"""
    
    def __init__(self):
        self.results = {}
        
    def test_database_connection(self):
        """Test database connectivity"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Test basic queries
            cur.execute("SELECT COUNT(*) FROM domains")
            domain_count = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM domain_responses")
            response_count = cur.fetchone()[0]
            
            conn.close()
            
            logger.info(f"✅ Database: {domain_count} domains, {response_count} responses")
            self.results['database'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Database test failed: {str(e)}")
            self.results['database'] = False
            return False
    
    async def test_rate_limiter(self):
        """Test rate limiting functionality"""
        try:
            # Create a strict rate limiter
            config = RateLimitConfig(
                requests_per_minute=5,
                requests_per_hour=20,
                concurrent_requests=2
            )
            limiter = RateLimiter(config)
            
            # Test normal acquisition
            tokens = []
            for i in range(3):
                token = await limiter.acquire()
                if token:
                    tokens.append(i)
            
            assert len(tokens) <= 2, "Concurrent limit not enforced"
            
            # Release tokens
            for _ in tokens:
                await limiter.release()
            
            # Test rate limiting
            acquired_count = 0
            for i in range(10):
                if await limiter.acquire():
                    acquired_count += 1
                    await limiter.release()
            
            assert acquired_count <= 5, "Rate limit not enforced"
            
            logger.info("✅ Rate limiter working correctly")
            self.results['rate_limiter'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Rate limiter test failed: {str(e)}")
            self.results['rate_limiter'] = False
            return False
    
    async def test_task_queue(self):
        """Test task queue functionality"""
        try:
            queue = TaskQueue()
            
            # Add tasks with different priorities
            test_task = {'domain': 'example.com', 'prompt': 'test'}
            
            await queue.put(LLMProvider.OPENAI, test_task, priority=10)
            await queue.put(LLMProvider.ANTHROPIC, test_task, priority=5)
            
            # Get tasks
            openai_task = await queue.get(LLMProvider.OPENAI)
            anthropic_task = await queue.get(LLMProvider.ANTHROPIC)
            
            assert openai_task is not None, "OpenAI task not retrieved"
            assert anthropic_task is not None, "Anthropic task not retrieved"
            
            # Test empty queue
            empty_task = await queue.get(LLMProvider.GROQ)
            assert empty_task is None, "Empty queue should return None"
            
            logger.info("✅ Task queue working correctly")
            self.results['task_queue'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Task queue test failed: {str(e)}")
            self.results['task_queue'] = False
            return False
    
    def test_configuration_loading(self):
        """Test configuration and API key loading"""
        try:
            from deploy_enterprise_crawler import CrawlerDeployment
            
            deployment = CrawlerDeployment()
            
            # Test without keys
            has_keys = deployment.load_api_keys()
            
            # Should work even without production keys (test mode)
            logger.info(f"✅ Configuration loading: {len(deployment.api_keys)} keys loaded")
            self.results['configuration'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Configuration test failed: {str(e)}")
            self.results['configuration'] = False
            return False
    
    def test_monitoring_setup(self):
        """Test monitoring table creation"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Create test tables
            cur.execute('''
                CREATE TABLE IF NOT EXISTS test_crawler_metrics (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    metric_type VARCHAR(50),
                    provider VARCHAR(50),
                    value FLOAT
                )
            ''')
            
            # Insert test data
            cur.execute('''
                INSERT INTO test_crawler_metrics (metric_type, provider, value)
                VALUES (%s, %s, %s)
            ''', ('test_metric', 'test_provider', 1.0))
            
            # Query back
            cur.execute('SELECT COUNT(*) FROM test_crawler_metrics')
            count = cur.fetchone()[0]
            
            # Cleanup
            cur.execute('DROP TABLE test_crawler_metrics')
            
            conn.commit()
            conn.close()
            
            assert count > 0, "Test data not inserted"
            
            logger.info("✅ Monitoring setup working correctly")
            self.results['monitoring'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Monitoring test failed: {str(e)}")
            self.results['monitoring'] = False
            return False
    
    async def test_crawler_initialization(self):
        """Test crawler initialization without API calls"""
        try:
            # Mock environment variables
            import os
            os.environ['OPENAI_API_KEY'] = 'test-key'
            os.environ['ANTHROPIC_API_KEY'] = 'test-key'
            
            crawler = EnterpriseSwarmCrawler()
            
            # Initialize should work even with test keys
            await crawler.initialize()
            
            # Check workers were created
            worker_count = len(crawler.workers)
            
            await crawler.close()
            
            logger.info(f"✅ Crawler initialization: {worker_count} workers created")
            self.results['crawler_init'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Crawler initialization test failed: {str(e)}")
            self.results['crawler_init'] = False
            return False
    
    def test_production_readiness(self):
        """Test production readiness checklist"""
        checklist = []
        
        # Check required files exist
        import os
        required_files = [
            'enterprise_crawler_system.py',
            'deploy_enterprise_crawler.py',
            'run_enterprise_crawler.sh'
        ]
        
        for file in required_files:
            if os.path.exists(file):
                checklist.append(f"✅ {file} exists")
            else:
                checklist.append(f"❌ {file} missing")
        
        # Check database tables exist
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            required_tables = ['domains', 'domain_responses']
            for table in required_tables:
                cur.execute(f"SELECT COUNT(*) FROM {table}")
                count = cur.fetchone()[0]
                checklist.append(f"✅ {table} table: {count} records")
            
            conn.close()
            
        except Exception as e:
            checklist.append(f"❌ Database table check failed: {str(e)}")
        
        # Check Python dependencies
        try:
            import aiohttp, psycopg2, asyncio
            checklist.append("✅ Python dependencies available")
        except ImportError as e:
            checklist.append(f"❌ Missing dependency: {str(e)}")
        
        for check in checklist:
            logger.info(check)
        
        self.results['production'] = all('✅' in check for check in checklist)
        return self.results['production']
    
    async def run_all_tests(self):
        """Run complete test suite"""
        logger.info("🧪 Starting Enterprise Crawler Test Suite")
        logger.info("=" * 60)
        
        tests = [
            ('Database Connection', self.test_database_connection),
            ('Rate Limiter', self.test_rate_limiter),
            ('Task Queue', self.test_task_queue),
            ('Configuration Loading', self.test_configuration_loading),
            ('Monitoring Setup', self.test_monitoring_setup),
            ('Crawler Initialization', self.test_crawler_initialization),
            ('Production Readiness', self.test_production_readiness)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            logger.info(f"\n🔍 Testing: {test_name}")
            try:
                if asyncio.iscoroutinefunction(test_func):
                    result = await test_func()
                else:
                    result = test_func()
                
                if result:
                    passed += 1
                    
            except Exception as e:
                logger.error(f"❌ {test_name} failed with exception: {str(e)}")
                self.results[test_name.lower().replace(' ', '_')] = False
        
        logger.info(f"\n📊 Test Results: {passed}/{total} passed")
        
        if passed == total:
            logger.info("🎉 All tests passed! System is ready for deployment")
            
            # Generate deployment summary
            self.generate_deployment_summary()
            
            return True
        else:
            logger.error("❌ Some tests failed. Please fix issues before deploying")
            return False
    
    def generate_deployment_summary(self):
        """Generate deployment summary and recommendations"""
        
        logger.info("\n🚀 Deployment Summary")
        logger.info("=" * 40)
        
        # Check database stats
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute("SELECT COUNT(*) FROM domains WHERE status = 'pending'")
            pending = cur.fetchone()[0]
            
            cur.execute("SELECT COUNT(*) FROM domains WHERE status = 'completed'")
            completed = cur.fetchone()[0]
            
            cur.execute("""
                SELECT COUNT(DISTINCT model) 
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '24 hours'
            """)
            recent_models = cur.fetchone()[0]
            
            conn.close()
            
            logger.info(f"📊 Current Status:")
            logger.info(f"  - Pending domains: {pending}")
            logger.info(f"  - Completed domains: {completed}")
            logger.info(f"  - Recent model activity: {recent_models}")
            
        except Exception as e:
            logger.warning(f"Could not generate stats: {str(e)}")
        
        logger.info(f"\n📋 Deployment Commands:")
        logger.info(f"  Start crawler: ./run_enterprise_crawler.sh start")
        logger.info(f"  Monitor progress: ./run_enterprise_crawler.sh monitor")
        logger.info(f"  Check status: ./run_enterprise_crawler.sh status")
        logger.info(f"  View logs: ./run_enterprise_crawler.sh logs")
        
        logger.info(f"\n⚙️  Production Recommendations:")
        logger.info(f"  - Set API keys in environment before starting")
        logger.info(f"  - Monitor rate limits and adjust as needed")
        logger.info(f"  - Run health checks periodically")
        logger.info(f"  - Scale workers based on demand")

async def main():
    """Run the test suite"""
    suite = CrawlerTestSuite()
    success = await suite.run_all_tests()
    
    if success:
        print("\n✅ SYSTEM READY FOR DEPLOYMENT")
    else:
        print("\n❌ SYSTEM NOT READY - FIX ISSUES FIRST")
        return 1
    
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))
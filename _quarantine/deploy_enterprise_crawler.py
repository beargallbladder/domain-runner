#!/usr/bin/env python3
"""
Deployment script for Enterprise Crawler
Handles environment setup, health checks, and monitoring
"""

import os
import sys
import asyncio
import psycopg2
import logging
from datetime import datetime
import json

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('enterprise_crawler.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger('DeploymentManager')

# Database URL - hardcoded to avoid environment variable issues
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class CrawlerDeployment:
    """Manages crawler deployment and monitoring"""
    
    def __init__(self):
        self.api_keys = {}
        self.is_healthy = True
        
    def load_api_keys(self):
        """Load API keys from environment or config"""
        
        # Production keys (from Render environment)
        key_mapping = {
            'OPENAI_API_KEY': ['OPENAI_API_KEY_1', 'OPENAI_API_KEY_2', 'OPENAI_API_KEY_3', 'OPENAI_API_KEY_4'],
            'ANTHROPIC_API_KEY': ['ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2'],
            'DEEPSEEK_API_KEY': ['DEEPSEEK_API_KEY_1', 'DEEPSEEK_API_KEY_2', 'DEEPSEEK_API_KEY_3'],
            'MISTRAL_API_KEY': ['MISTRAL_API_KEY_1', 'MISTRAL_API_KEY_2'],
            'XAI_API_KEY': ['XAI_API_KEY_1', 'XAI_API_KEY_2'],
            'TOGETHER_API_KEY': ['TOGETHER_API_KEY_1', 'TOGETHER_API_KEY_2', 'TOGETHER_API_KEY_3'],
            'PERPLEXITY_API_KEY': ['PERPLEXITY_API_KEY_1', 'PERPLEXITY_API_KEY_2'],
            'GOOGLE_API_KEY': ['GOOGLE_API_KEY_1', 'GOOGLE_API_KEY_2'],
            'COHERE_API_KEY': ['COHERE_API_KEY_1', 'COHERE_API_KEY_2'],
            'AI21_API_KEY': ['AI21_API_KEY_1', 'AI21_API_KEY_2'],
            'GROQ_API_KEY': ['GROQ_API_KEY_1', 'GROQ_API_KEY_2']
        }
        
        # Try to load primary keys
        for primary_key, env_keys in key_mapping.items():
            for env_key in env_keys:
                if os.getenv(env_key):
                    self.api_keys[primary_key] = os.getenv(env_key)
                    logger.info(f"Loaded {primary_key} from {env_key}")
                    break
        
        # Fall back to test keys if not in production
        if not self.api_keys:
            logger.warning("No production API keys found, using test configuration")
            # Load from a secure config file in production
            
        return len(self.api_keys) > 0
    
    def check_database(self):
        """Verify database connectivity"""
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Check pending domains
            cur.execute("SELECT COUNT(*) FROM domains WHERE status = 'pending'")
            pending_count = cur.fetchone()[0]
            
            # Check completed domains
            cur.execute("SELECT COUNT(*) FROM domains WHERE status = 'completed'")
            completed_count = cur.fetchone()[0]
            
            # Check recent responses
            cur.execute("""
                SELECT COUNT(*), COUNT(DISTINCT model) 
                FROM domain_responses 
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)
            recent_responses, recent_models = cur.fetchone()
            
            conn.close()
            
            logger.info(f"Database Status:")
            logger.info(f"  - Pending domains: {pending_count}")
            logger.info(f"  - Completed domains: {completed_count}")
            logger.info(f"  - Recent responses: {recent_responses} from {recent_models} models")
            
            return True
            
        except Exception as e:
            logger.error(f"Database check failed: {str(e)}")
            return False
    
    def setup_monitoring(self):
        """Setup monitoring and alerting"""
        
        # Create monitoring tables if needed
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute('''
                CREATE TABLE IF NOT EXISTS crawler_metrics (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    metric_type VARCHAR(50),
                    provider VARCHAR(50),
                    value FLOAT,
                    metadata JSONB
                )
            ''')
            
            cur.execute('''
                CREATE TABLE IF NOT EXISTS crawler_health (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    component VARCHAR(50),
                    status VARCHAR(20),
                    details JSONB
                )
            ''')
            
            # Create indexes
            cur.execute('''
                CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
                ON crawler_metrics(timestamp DESC)
            ''')
            
            cur.execute('''
                CREATE INDEX IF NOT EXISTS idx_health_component 
                ON crawler_health(component, timestamp DESC)
            ''')
            
            conn.commit()
            conn.close()
            
            logger.info("Monitoring tables ready")
            return True
            
        except Exception as e:
            logger.error(f"Monitoring setup failed: {str(e)}")
            return False
    
    async def run_health_monitor(self):
        """Continuous health monitoring"""
        while self.is_healthy:
            try:
                conn = psycopg2.connect(DATABASE_URL)
                cur = conn.cursor()
                
                # Check crawler performance
                cur.execute('''
                    SELECT 
                        model,
                        COUNT(*) as responses,
                        AVG(response_time_ms) as avg_time,
                        MAX(created_at) as last_response
                    FROM domain_responses
                    WHERE created_at > NOW() - INTERVAL '10 minutes'
                    GROUP BY model
                ''')
                
                results = cur.fetchall()
                
                for model, count, avg_time, last_response in results:
                    # Log metrics
                    cur.execute('''
                        INSERT INTO crawler_metrics 
                        (metric_type, provider, value, metadata)
                        VALUES (%s, %s, %s, %s)
                    ''', (
                        'response_rate',
                        model.split('/')[0],
                        count / 10.0,  # per minute
                        json.dumps({
                            'avg_response_time_ms': float(avg_time) if avg_time else 0,
                            'last_response': last_response.isoformat() if last_response else None
                        })
                    ))
                
                # Check system health
                health_status = 'healthy' if len(results) > 5 else 'degraded'
                
                cur.execute('''
                    INSERT INTO crawler_health (component, status, details)
                    VALUES (%s, %s, %s)
                ''', (
                    'enterprise_crawler',
                    health_status,
                    json.dumps({
                        'active_models': len(results),
                        'timestamp': datetime.now().isoformat()
                    })
                ))
                
                conn.commit()
                conn.close()
                
                if health_status == 'degraded':
                    logger.warning(f"System degraded: Only {len(results)} models active")
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Health monitor error: {str(e)}")
                await asyncio.sleep(60)
    
    async def deploy_crawler(self):
        """Deploy the enterprise crawler"""
        
        logger.info("Starting Enterprise Crawler Deployment")
        logger.info("=" * 60)
        
        # Step 1: Load API keys
        if not self.load_api_keys():
            logger.error("Failed to load API keys")
            return False
        
        logger.info(f"Loaded {len(self.api_keys)} API keys")
        
        # Step 2: Check database
        if not self.check_database():
            logger.error("Database check failed")
            return False
        
        # Step 3: Setup monitoring
        if not self.setup_monitoring():
            logger.error("Monitoring setup failed")
            return False
        
        # Step 4: Start health monitor
        monitor_task = asyncio.create_task(self.run_health_monitor())
        
        # Step 5: Import and run crawler
        try:
            from enterprise_crawler_system import EnterpriseSwarmCrawler
            
            # Set environment variables for API keys
            for key, value in self.api_keys.items():
                os.environ[key] = value
            
            crawler = EnterpriseSwarmCrawler()
            await crawler.initialize()
            
            logger.info("Crawler initialized successfully")
            logger.info(f"Active workers: {len(crawler.workers)}")
            
            # Run crawler - process ALL pending domains
            await crawler.process_domains(limit=10000)  # Process all domains
            
            # Cleanup
            await crawler.close()
            
        except Exception as e:
            logger.error(f"Crawler deployment failed: {str(e)}")
            return False
        
        finally:
            self.is_healthy = False
            await monitor_task
        
        logger.info("Crawler deployment completed")
        return True

async def main():
    """Main deployment entry point"""
    deployment = CrawlerDeployment()
    success = await deployment.deploy_crawler()
    
    if success:
        logger.info("Deployment successful!")
        
        # Print summary
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute("""
                SELECT 
                    COUNT(DISTINCT domain_id) as domains,
                    COUNT(*) as responses,
                    COUNT(DISTINCT model) as models
                FROM domain_responses
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)
            
            domains, responses, models = cur.fetchone()
            
            logger.info(f"\nProcessing Summary:")
            logger.info(f"  - Domains processed: {domains}")
            logger.info(f"  - Total responses: {responses}")
            logger.info(f"  - Active models: {models}")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"Summary generation failed: {str(e)}")
    
    else:
        logger.error("Deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
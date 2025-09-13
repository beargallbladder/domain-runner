#!/usr/bin/env python3
"""
DEPLOY OPTIMIZED SYSTEM - Production Deployment
- Integrates optimized systems with existing infrastructure
- Updates database with enhanced processing
- Deploys to production services
- Monitors deployment health
"""

import asyncio
import json
import os
import sys
from pathlib import Path
import subprocess
import logging
from typing import Dict, List, Any
import psycopg2
from datetime import datetime

# Import our optimized systems
from ultra_performance_optimizer import UltraPerformanceOptimizer, OptimizationConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OptimizedSystemDeployer:
    """Deploy optimized systems to production"""
    
    def __init__(self):
        self.db_url = os.getenv('DATABASE_URL', 'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db')
        self.deployment_log = []
        
    def check_system_requirements(self) -> bool:
        """Check if system meets requirements for optimized processing"""
        try:
            # Check Python packages
            required_packages = [
                'numpy', 'scipy', 'pandas', 'scikit-learn', 
                'psutil', 'aiohttp', 'psycopg2', 'numba'
            ]
            
            missing_packages = []
            for package in required_packages:
                try:
                    __import__(package)
                except ImportError:
                    missing_packages.append(package)
            
            if missing_packages:
                logger.error(f"Missing required packages: {missing_packages}")
                return False
            
            # Check system resources
            import psutil
            memory_gb = psutil.virtual_memory().total / 1024 / 1024 / 1024
            cpu_count = psutil.cpu_count()
            
            if memory_gb < 2:
                logger.warning(f"Low memory: {memory_gb:.1f}GB (recommended: 4GB+)")
            
            if cpu_count < 2:
                logger.warning(f"Low CPU count: {cpu_count} (recommended: 4+)")
            
            logger.info(f"System check passed: {memory_gb:.1f}GB RAM, {cpu_count} CPUs")
            return True
            
        except Exception as e:
            logger.error(f"System requirements check failed: {e}")
            return False
    
    def test_database_connection(self) -> bool:
        """Test database connectivity"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT COUNT(*) FROM domains WHERE status = 'pending'")
            pending_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            logger.info(f"Database connection successful: {pending_count} pending domains")
            return True
            
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
    
    def update_database_schema(self) -> bool:
        """Update database schema for optimized processing"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            # Add new columns for enhanced processing
            schema_updates = [
                """
                ALTER TABLE domain_responses 
                ADD COLUMN IF NOT EXISTS tensor_features JSONB,
                ADD COLUMN IF NOT EXISTS drift_score FLOAT,
                ADD COLUMN IF NOT EXISTS processing_method VARCHAR(50) DEFAULT 'optimized',
                ADD COLUMN IF NOT EXISTS memory_usage_mb FLOAT,
                ADD COLUMN IF NOT EXISTS processing_time_ms FLOAT
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_domain_responses_tensor 
                ON domain_responses USING GIN (tensor_features)
                """,
                """
                CREATE INDEX IF NOT EXISTS idx_domain_responses_drift 
                ON domain_responses (drift_score)
                """,
                """
                CREATE TABLE IF NOT EXISTS system_performance (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT NOW(),
                    memory_usage_gb FLOAT,
                    cpu_usage_percent FLOAT,
                    domains_processed INTEGER,
                    processing_rate FLOAT,
                    system_health_score FLOAT,
                    bottlenecks JSONB,
                    optimization_notes TEXT
                )
                """
            ]
            
            for update in schema_updates:
                cursor.execute(update)
                logger.info(f"Schema update executed: {update[:50]}...")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("Database schema updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database schema update failed: {e}")
            return False
    
    async def deploy_optimized_processing(self) -> Dict[str, Any]:
        """Deploy optimized processing to handle pending domains"""
        try:
            # Get pending domains from database
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, domain FROM domains 
                WHERE status = 'pending' 
                ORDER BY updated_at ASC 
                LIMIT 100
            """)
            
            pending_domains = cursor.fetchall()
            cursor.close()
            conn.close()
            
            if not pending_domains:
                logger.info("No pending domains found")
                return {'status': 'no_pending_domains', 'processed': 0}
            
            logger.info(f"Found {len(pending_domains)} pending domains")
            
            # Initialize optimizer
            config = OptimizationConfig(
                max_memory_gb=1.0,  # Conservative for production
                max_concurrent_domains=20,
                batch_size=5,
                enable_gpu_acceleration=False,  # Disable GPU for compatibility
                enable_drift_monitoring=True,
                enable_real_time_optimization=True
            )
            
            optimizer = UltraPerformanceOptimizer(config)
            
            # Process domains in batches
            batch_size = 10
            processed_count = 0
            
            for i in range(0, len(pending_domains), batch_size):
                batch = pending_domains[i:i + batch_size]
                domain_names = [domain[1] for domain in batch]
                domain_ids = [domain[0] for domain in batch]
                
                logger.info(f"Processing batch {i//batch_size + 1}: {len(domain_names)} domains")
                
                # Process with optimizer
                results = await optimizer.process_domains_optimized(domain_names)
                
                if 'error' not in results:
                    # Update database with results
                    await self._update_processed_domains(domain_ids, domain_names, results)
                    processed_count += len(domain_names)
                    
                    logger.info(f"Batch completed: {len(domain_names)} domains processed")
                else:
                    logger.error(f"Batch failed: {results['error']}")
            
            # Generate deployment report
            deployment_report = {
                'timestamp': datetime.now().isoformat(),
                'total_pending': len(pending_domains),
                'processed_count': processed_count,
                'success_rate': processed_count / len(pending_domains) if pending_domains else 0,
                'optimizer_performance': optimizer.export_comprehensive_report()
            }
            
            logger.info(f"Deployment completed: {processed_count}/{len(pending_domains)} domains processed")
            
            return deployment_report
            
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            return {'status': 'deployment_failed', 'error': str(e)}
    
    async def _update_processed_domains(self, domain_ids: List[int], domain_names: List[str], 
                                      results: Dict[str, Any]):
        """Update database with processed domain results"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            # Mark domains as completed
            for domain_id in domain_ids:
                cursor.execute("""
                    UPDATE domains 
                    SET status = 'completed', updated_at = NOW() 
                    WHERE id = %s
                """, (domain_id,))
            
            # Insert enhanced responses
            crawled_domains = results.get('crawled_domains', [])
            
            for i, domain_data in enumerate(crawled_domains):
                if i < len(domain_ids):
                    domain_id = domain_ids[i]
                    
                    # Prepare response data
                    response_data = {
                        'domain_id': domain_id,
                        'model': 'optimized_system',
                        'prompt_type': 'comprehensive_analysis',
                        'response': json.dumps({
                            'content_analysis': domain_data.get('raw_content', '')[:1000],
                            'metadata': domain_data.get('metadata', {}),
                            'processing_method': 'ultra_optimized'
                        }),
                        'tensor_features': json.dumps(domain_data.get('tensor_features', [])),
                        'drift_score': domain_data.get('drift_score', 0.0),
                        'processing_method': 'optimized',
                        'memory_usage_mb': domain_data.get('memory_usage', 0.0) * 1024 if domain_data.get('memory_usage') else None,
                        'processing_time_ms': domain_data.get('metadata', {}).get('crawl_time', 0) * 1000
                    }
                    
                    cursor.execute("""
                        INSERT INTO domain_responses 
                        (domain_id, model, prompt_type, response, tensor_features, 
                         drift_score, processing_method, memory_usage_mb, processing_time_ms)
                        VALUES (%(domain_id)s, %(model)s, %(prompt_type)s, %(response)s, 
                                %(tensor_features)s, %(drift_score)s, %(processing_method)s, 
                                %(memory_usage_mb)s, %(processing_time_ms)s)
                    """, response_data)
            
            # Record system performance
            system_performance = results.get('system_performance', {})
            if system_performance:
                cursor.execute("""
                    INSERT INTO system_performance 
                    (memory_usage_gb, cpu_usage_percent, domains_processed, 
                     processing_rate, system_health_score, bottlenecks, optimization_notes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    system_performance.get('memory_usage_gb', 0),
                    system_performance.get('cpu_usage_percent', 0),
                    system_performance.get('domains_processed', 0),
                    system_performance.get('processing_rate', 0),
                    system_performance.get('system_health_score', 0),
                    json.dumps(system_performance.get('bottlenecks', [])),
                    'Optimized system deployment'
                ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Database updated: {len(domain_ids)} domains marked as completed")
            
        except Exception as e:
            logger.error(f"Database update failed: {e}")
    
    def verify_deployment(self) -> Dict[str, Any]:
        """Verify deployment success"""
        try:
            conn = psycopg2.connect(self.db_url)
            cursor = conn.cursor()
            
            # Check recent processing
            cursor.execute("""
                SELECT COUNT(*) FROM domain_responses 
                WHERE processing_method = 'optimized' 
                AND created_at > NOW() - INTERVAL '1 hour'
            """)
            recent_optimized = cursor.fetchone()[0]
            
            # Check system performance records
            cursor.execute("""
                SELECT COUNT(*) FROM system_performance 
                WHERE timestamp > NOW() - INTERVAL '1 hour'
            """)
            recent_performance = cursor.fetchone()[0]
            
            # Check pending domains
            cursor.execute("SELECT COUNT(*) FROM domains WHERE status = 'pending'")
            remaining_pending = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            verification_result = {
                'timestamp': datetime.now().isoformat(),
                'recent_optimized_responses': recent_optimized,
                'recent_performance_records': recent_performance,
                'remaining_pending_domains': remaining_pending,
                'deployment_healthy': recent_optimized > 0 and recent_performance > 0
            }
            
            logger.info(f"Deployment verification: {verification_result}")
            
            return verification_result
            
        except Exception as e:
            logger.error(f"Deployment verification failed: {e}")
            return {'deployment_healthy': False, 'error': str(e)}
    
    async def full_deployment_pipeline(self) -> Dict[str, Any]:
        """Execute complete deployment pipeline"""
        logger.info("Starting optimized system deployment pipeline")
        
        pipeline_results = {
            'start_time': datetime.now().isoformat(),
            'steps': {}
        }
        
        # Step 1: System requirements check
        logger.info("Step 1: Checking system requirements")
        req_check = self.check_system_requirements()
        pipeline_results['steps']['requirements_check'] = req_check
        
        if not req_check:
            logger.error("System requirements check failed - aborting deployment")
            return pipeline_results
        
        # Step 2: Database connection test
        logger.info("Step 2: Testing database connection")
        db_check = self.test_database_connection()
        pipeline_results['steps']['database_check'] = db_check
        
        if not db_check:
            logger.error("Database connection failed - aborting deployment")
            return pipeline_results
        
        # Step 3: Database schema update
        logger.info("Step 3: Updating database schema")
        schema_update = self.update_database_schema()
        pipeline_results['steps']['schema_update'] = schema_update
        
        if not schema_update:
            logger.error("Schema update failed - aborting deployment")
            return pipeline_results
        
        # Step 4: Deploy optimized processing
        logger.info("Step 4: Deploying optimized processing")
        deployment_result = await self.deploy_optimized_processing()
        pipeline_results['steps']['optimized_deployment'] = deployment_result
        
        # Step 5: Verify deployment
        logger.info("Step 5: Verifying deployment")
        verification = self.verify_deployment()
        pipeline_results['steps']['deployment_verification'] = verification
        
        pipeline_results['end_time'] = datetime.now().isoformat()
        pipeline_results['success'] = verification.get('deployment_healthy', False)
        
        # Export deployment log
        log_filename = f"deployment_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(log_filename, 'w') as f:
            json.dump(pipeline_results, f, indent=2, default=str)
        
        logger.info(f"Deployment pipeline completed: {pipeline_results['success']}")
        logger.info(f"Deployment log saved: {log_filename}")
        
        return pipeline_results

async def main():
    """Main deployment execution"""
    deployer = OptimizedSystemDeployer()
    
    try:
        # Run full deployment pipeline
        results = await deployer.full_deployment_pipeline()
        
        if results['success']:
            print("🚀 OPTIMIZED SYSTEM DEPLOYMENT SUCCESSFUL!")
            print(f"✅ Deployment completed at: {results['end_time']}")
            
            # Show summary
            verification = results['steps'].get('deployment_verification', {})
            print(f"✅ Recent optimized responses: {verification.get('recent_optimized_responses', 0)}")
            print(f"✅ Remaining pending domains: {verification.get('remaining_pending_domains', 0)}")
            
        else:
            print("❌ DEPLOYMENT FAILED")
            print("Check the deployment log for details")
        
    except Exception as e:
        print(f"❌ DEPLOYMENT ERROR: {e}")
        logger.error(f"Main deployment failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
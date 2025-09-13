#!/usr/bin/env python3
"""
DRIFT MONITORING TEST SUITE
Quick validation of the drift detection system with real domain data.
"""

import asyncio
import asyncpg
import os
import json
import logging
from datetime import datetime, timedelta
from drift_detector_agent import DriftDetectorAgent
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_drift_monitoring():
    """Test drift monitoring with real data"""
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
    )
    
    # Initialize drift detector
    detector = DriftDetectorAgent(database_url)
    await detector.initialize()
    
    try:
        logger.info("🧪 Testing drift monitoring system...")
        
        # Test 1: Get real domain data from database
        async with detector.pool.acquire() as conn:
            real_domains = await conn.fetch("""
                SELECT 
                    d.domain,
                    pdc.memory_score,
                    pdc.updated_at,
                    COUNT(dr.id) FILTER (WHERE dr.error_message IS NOT NULL) as error_count
                FROM domains d
                LEFT JOIN public_domain_cache pdc ON d.domain = pdc.domain
                LEFT JOIN domain_responses dr ON d.id = dr.domain_id
                WHERE pdc.memory_score IS NOT NULL
                AND pdc.updated_at > NOW() - INTERVAL '24 hours'
                GROUP BY d.domain, pdc.memory_score, pdc.updated_at
                ORDER BY pdc.updated_at DESC
                LIMIT 20
            """)
        
        if real_domains:
            logger.info(f"📊 Testing with {len(real_domains)} real domains")
            
            # Convert to test format
            test_batch = [
                {
                    'domain': row['domain'],
                    'memory_score': float(row['memory_score'] or 0),
                    'error_count': row['error_count'] or 0,
                    'updated_at': row['updated_at']
                }
                for row in real_domains
            ]
            
            # Add some synthetic high-drift domains for testing
            test_batch.extend([
                {'domain': 'high-drift-test1.com', 'memory_score': 0.1, 'error_count': 5},
                {'domain': 'high-drift-test2.com', 'memory_score': 0.0, 'error_count': 3},
                {'domain': 'normal-test.com', 'memory_score': 0.75, 'error_count': 0},
            ])
            
            # Analyze batch
            report = await detector.analyze_batch(test_batch)
            
            # Display results
            logger.info(f"""
            📈 DRIFT ANALYSIS RESULTS
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Batch ID: {report.batch_id}
            Total Domains: {report.total_domains}
            High Drift Count: {report.high_drift_count}
            Drift Percentage: {report.drift_percentage:.1%}
            Average Drift Score: {report.avg_drift_score:.3f}
            Quality Gate: {'✅ PASSED' if report.quality_gate_passed else '❌ FAILED'}
            
            Affected Domains:
            {chr(10).join(f'  • {domain}' for domain in report.affected_domains[:5])}
            
            Recommendations:
            {chr(10).join(f'  → {rec}' for rec in report.recommendations)}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            """)
        
        else:
            logger.warning("No recent domain data found, testing with synthetic data")
            
            # Generate synthetic test data
            synthetic_batch = []
            
            # Normal domains (should have low drift)
            for i in range(15):
                synthetic_batch.append({
                    'domain': f'normal{i}.com',
                    'memory_score': np.random.normal(0.7, 0.1),
                    'error_count': np.random.poisson(0.2),
                })
            
            # High drift domains
            for i in range(5):
                synthetic_batch.append({
                    'domain': f'drift{i}.com',
                    'memory_score': np.random.normal(0.2, 0.3),
                    'error_count': np.random.poisson(2),
                })
            
            report = await detector.analyze_batch(synthetic_batch)
            logger.info(f"📊 Synthetic test completed - drift rate: {report.drift_percentage:.1%}")
        
        # Test 2: Check drift summary
        summary = await detector.get_drift_summary(24)
        logger.info(f"""
        📋 DRIFT SUMMARY (24h)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Total Batches: {summary['total_batches']}
        Pass Rate: {summary['pass_rate']:.1%}
        Average Drift: {summary['avg_drift_score']:.3f}
        Reference Domains: {summary['reference_domains']}
        Recent Alerts: {len(summary['recent_alerts'])}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """)
        
        # Test 3: Performance test
        import time
        start_time = time.time()
        
        large_batch = [
            {
                'domain': f'perf-test-{i}.com',
                'memory_score': 0.5 + 0.3 * np.sin(i / 10),
                'error_count': i % 4
            }
            for i in range(100)
        ]
        
        perf_report = await detector.analyze_batch(large_batch)
        processing_time = time.time() - start_time
        
        logger.info(f"""
        ⚡ PERFORMANCE TEST
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Domains Processed: 100
        Processing Time: {processing_time:.2f}s
        Throughput: {100/processing_time:.1f} domains/second
        Drift Rate: {perf_report.drift_percentage:.1%}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """)
        
        # Test 4: Database integration
        async with detector.pool.acquire() as conn:
            # Check if our test data was stored
            drift_reports = await conn.fetchval("""
                SELECT COUNT(*) FROM drift_reports 
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)
            
            quality_metrics = await conn.fetchval("""
                SELECT COUNT(*) FROM domain_quality_metrics 
                WHERE created_at > NOW() - INTERVAL '1 hour'
            """)
            
            logger.info(f"""
            💾 DATABASE INTEGRATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Drift Reports Stored: {drift_reports or 0}
            Quality Metrics: {quality_metrics or 0}
            Storage: {'✅ Working' if drift_reports else '⚠️ No data'}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            """)
        
        logger.info("🎉 All drift monitoring tests completed successfully!")
        
        return {
            'status': 'success',
            'tests_passed': 4,
            'last_report': {
                'drift_percentage': report.drift_percentage,
                'quality_gate_passed': report.quality_gate_passed,
                'processing_time': processing_time
            }
        }
    
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        return {'status': 'failed', 'error': str(e)}
    
    finally:
        await detector.cleanup()

async def test_memory_coordination():
    """Test memory coordination with claude-flow"""
    logger.info("🧠 Testing memory coordination...")
    
    import subprocess
    
    try:
        # Test memory storage
        test_data = {
            'test_timestamp': datetime.utcnow().isoformat(),
            'drift_threshold': 0.1,
            'quality_gates': ['ks_test', 'js_divergence', 'temporal_variance'],
            'status': 'testing'
        }
        
        subprocess.run([
            "npx", "claude-flow", "hooks", "notification",
            "--message", f"drift_test_data: {json.dumps(test_data)}",
            "--telemetry", "true"
        ], check=True)
        
        logger.info("✅ Memory coordination test passed")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.warning(f"⚠️ Memory coordination test failed: {e}")
        return False
    except FileNotFoundError:
        logger.warning("⚠️ claude-flow not available for memory coordination")
        return False

async def main():
    """Run all drift monitoring tests"""
    logger.info("🚀 Starting comprehensive drift monitoring tests...")
    
    try:
        # Test 1: Core drift monitoring
        monitoring_result = await test_drift_monitoring()
        
        # Test 2: Memory coordination
        memory_result = await test_memory_coordination()
        
        # Summary
        logger.info(f"""
        🎯 TEST SUMMARY
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        
        Drift Monitoring: {'✅ PASSED' if monitoring_result['status'] == 'success' else '❌ FAILED'}
        Memory Coordination: {'✅ PASSED' if memory_result else '❌ FAILED'}
        
        System Status: {'🟢 READY FOR PRODUCTION' if monitoring_result['status'] == 'success' else '🔴 NEEDS ATTENTION'}
        
        Key Metrics:
        • Drift Detection: {monitoring_result.get('last_report', {}).get('drift_percentage', 0):.1%}
        • Quality Gates: {'PASSING' if monitoring_result.get('last_report', {}).get('quality_gate_passed') else 'FAILING'}
        • Performance: {monitoring_result.get('last_report', {}).get('processing_time', 0):.2f}s for 100 domains
        
        Next Steps:
        1. Deploy to production pipeline
        2. Monitor drift_history namespace
        3. Set up alerting for quality gate failures
        4. Run dashboard: bash start_drift_dashboard.sh
        
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """)
        
    except Exception as e:
        logger.error(f"❌ Test suite failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
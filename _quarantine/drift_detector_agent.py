#!/usr/bin/env python3
"""
DRIFT DETECTOR AGENT - Real-time Data Quality Monitoring
Monitors domain crawl data quality with statistical drift detection,
quality gates, and automated re-crawl triggers.
"""

import asyncio
import asyncpg
import numpy as np
from scipy import stats
from datetime import datetime, timedelta
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
import time
from collections import deque
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DriftMetrics:
    """Container for drift detection metrics"""
    domain: str
    timestamp: datetime
    ks_statistic: float  # Kolmogorov-Smirnov test
    js_divergence: float  # Jensen-Shannon divergence
    cosine_distance: float  # 1 - cosine similarity
    temporal_variance: float  # Variance over time
    drift_score: float  # Combined drift score
    quality_issues: List[str]
    needs_recrawl: bool

@dataclass
class BatchDriftReport:
    """Batch-level drift analysis report"""
    batch_id: str
    total_domains: int
    high_drift_count: int
    drift_percentage: float
    avg_drift_score: float
    quality_gate_passed: bool
    affected_domains: List[str]
    recommendations: List[str]
    timestamp: datetime

class DriftDetectorAgent:
    """Real-time drift monitoring for domain intelligence data"""
    
    def __init__(self, database_url: str, memory_namespace: str = "drift_history"):
        self.database_url = database_url
        self.memory_namespace = memory_namespace
        self.pool: Optional[asyncpg.Pool] = None
        
        # Drift detection thresholds
        self.drift_threshold = 0.1  # Flag domains with drift > 0.1
        self.batch_alert_threshold = 0.1  # Alert if >10% domains drift
        self.recrawl_threshold = 0.3  # Trigger recrawl if drift > 0.3
        
        # Reference data cache
        self.reference_cache = {}
        self.cache_ttl = 3600  # 1 hour
        
        # Temporal tracking
        self.drift_history = deque(maxlen=1000)
        self.batch_history = deque(maxlen=100)
        
        # Performance optimization
        self.batch_size = 50
        self.parallel_workers = 4
        
    async def initialize(self):
        """Initialize database connection and load reference data"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,
                max_size=20,
                command_timeout=10
            )
            
            # Load reference distributions
            await self._load_reference_data()
            
            # Initialize drift history from memory
            await self._restore_drift_history()
            
            logger.info("✅ DriftDetector initialized successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize DriftDetector: {e}")
            raise
    
    async def _load_reference_data(self):
        """Load reference distributions for drift detection"""
        async with self.pool.acquire() as conn:
            # Get baseline statistics from last 7 days of stable data
            reference_data = await conn.fetch("""
                WITH stable_domains AS (
                    SELECT 
                        d.domain,
                        dr.response_data,
                        dr.created_at,
                        COALESCE(
                            (dr.response_data->>'memory_score')::float,
                            0
                        ) as memory_score
                    FROM domains d
                    JOIN domain_responses dr ON d.id = dr.domain_id
                    WHERE dr.created_at > NOW() - INTERVAL '7 days'
                    AND dr.response_data IS NOT NULL
                    AND dr.response_data->>'memory_score' IS NOT NULL
                )
                SELECT 
                    domain,
                    AVG(memory_score) as avg_score,
                    STDDEV(memory_score) as std_score,
                    COUNT(*) as sample_count,
                    percentile_cont(0.25) WITHIN GROUP (ORDER BY memory_score) as q1,
                    percentile_cont(0.5) WITHIN GROUP (ORDER BY memory_score) as median,
                    percentile_cont(0.75) WITHIN GROUP (ORDER BY memory_score) as q3
                FROM stable_domains
                GROUP BY domain
                HAVING COUNT(*) >= 3
            """)
            
            # Cache reference distributions
            for row in reference_data:
                self.reference_cache[row['domain']] = {
                    'avg_score': float(row['avg_score']),
                    'std_score': float(row['std_score']) if row['std_score'] else 0.1,
                    'sample_count': row['sample_count'],
                    'quartiles': [float(row['q1']), float(row['median']), float(row['q3'])],
                    'cached_at': time.time()
                }
            
            logger.info(f"📊 Loaded reference data for {len(self.reference_cache)} domains")
    
    async def _restore_drift_history(self):
        """Restore drift history from persistent memory"""
        try:
            # This would integrate with claude-flow memory system
            # For now, we'll use database storage
            async with self.pool.acquire() as conn:
                history = await conn.fetch("""
                    SELECT drift_data 
                    FROM drift_history 
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                    ORDER BY created_at DESC
                    LIMIT 1000
                """)
                
                for row in history:
                    if row['drift_data']:
                        self.drift_history.append(json.loads(row['drift_data']))
                        
        except Exception as e:
            logger.warning(f"Could not restore drift history: {e}")
    
    async def analyze_batch(self, domain_batch: List[Dict]) -> BatchDriftReport:
        """Analyze a batch of domains for drift"""
        batch_id = self._generate_batch_id(domain_batch)
        logger.info(f"🔍 Analyzing batch {batch_id} with {len(domain_batch)} domains")
        
        # Process domains in parallel
        drift_results = await self._parallel_drift_detection(domain_batch)
        
        # Calculate batch statistics
        high_drift_domains = [
            dm for dm in drift_results 
            if dm.drift_score > self.drift_threshold
        ]
        
        drift_percentage = len(high_drift_domains) / len(domain_batch)
        avg_drift_score = np.mean([dm.drift_score for dm in drift_results])
        
        # Quality gate check
        quality_gate_passed = drift_percentage <= self.batch_alert_threshold
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            drift_results, drift_percentage, avg_drift_score
        )
        
        # Create batch report
        report = BatchDriftReport(
            batch_id=batch_id,
            total_domains=len(domain_batch),
            high_drift_count=len(high_drift_domains),
            drift_percentage=drift_percentage,
            avg_drift_score=avg_drift_score,
            quality_gate_passed=quality_gate_passed,
            affected_domains=[dm.domain for dm in high_drift_domains],
            recommendations=recommendations,
            timestamp=datetime.utcnow()
        )
        
        # Store batch history
        await self._store_batch_report(report)
        
        # Trigger alerts if needed
        if not quality_gate_passed:
            await self._trigger_quality_alert(report)
        
        return report
    
    async def _parallel_drift_detection(self, domain_batch: List[Dict]) -> List[DriftMetrics]:
        """Process domains in parallel for drift detection"""
        # Split batch for parallel processing
        chunk_size = max(1, len(domain_batch) // self.parallel_workers)
        chunks = [
            domain_batch[i:i + chunk_size] 
            for i in range(0, len(domain_batch), chunk_size)
        ]
        
        # Process chunks in parallel
        tasks = [
            self._process_domain_chunk(chunk) 
            for chunk in chunks
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Flatten results
        return [dm for chunk_results in results for dm in chunk_results]
    
    async def _process_domain_chunk(self, domains: List[Dict]) -> List[DriftMetrics]:
        """Process a chunk of domains for drift detection"""
        drift_metrics = []
        
        for domain_data in domains:
            try:
                drift_metric = await self._calculate_drift_metrics(domain_data)
                drift_metrics.append(drift_metric)
                
                # Update drift history
                self.drift_history.append({
                    'domain': drift_metric.domain,
                    'drift_score': drift_metric.drift_score,
                    'timestamp': drift_metric.timestamp.isoformat()
                })
                
            except Exception as e:
                logger.error(f"Error calculating drift for {domain_data.get('domain', 'unknown')}: {e}")
                
        return drift_metrics
    
    async def _calculate_drift_metrics(self, domain_data: Dict) -> DriftMetrics:
        """Calculate comprehensive drift metrics for a domain"""
        domain = domain_data['domain']
        current_score = domain_data.get('memory_score', 0)
        
        # Get reference data
        reference = self.reference_cache.get(domain, {})
        
        # Initialize metrics
        ks_statistic = 0.0
        js_divergence = 0.0
        cosine_distance = 0.0
        temporal_variance = 0.0
        quality_issues = []
        
        if reference:
            # Kolmogorov-Smirnov test
            if 'avg_score' in reference and 'std_score' in reference:
                # Generate reference distribution
                ref_distribution = np.random.normal(
                    reference['avg_score'], 
                    reference['std_score'], 
                    100
                )
                # Current sample (simplified - would use multiple samples in production)
                current_sample = np.array([current_score] * 10)
                
                ks_result = stats.ks_2samp(ref_distribution, current_sample)
                ks_statistic = ks_result.statistic
                
                if ks_statistic > 0.2:
                    quality_issues.append("High KS statistic - distribution shift detected")
            
            # Jensen-Shannon divergence (simplified)
            ref_mean = reference.get('avg_score', 0)
            if ref_mean > 0:
                js_divergence = abs(current_score - ref_mean) / ref_mean
                
                if js_divergence > 0.3:
                    quality_issues.append("High JS divergence - significant value change")
            
            # Cosine distance (would use embeddings in production)
            cosine_distance = min(1.0, abs(current_score - ref_mean) / 100)
            
            # Temporal variance
            recent_history = [
                h for h in self.drift_history 
                if h.get('domain') == domain
            ][-10:]
            
            if len(recent_history) >= 3:
                recent_scores = [h.get('drift_score', 0) for h in recent_history]
                temporal_variance = np.var(recent_scores)
                
                if temporal_variance > 0.1:
                    quality_issues.append("High temporal variance - unstable measurements")
        
        else:
            quality_issues.append("No reference data available")
        
        # Calculate combined drift score
        drift_score = (
            0.3 * ks_statistic +
            0.3 * js_divergence +
            0.2 * cosine_distance +
            0.2 * temporal_variance
        )
        
        # Check for additional quality issues
        if current_score == 0:
            quality_issues.append("Zero score detected")
            drift_score = max(drift_score, 0.5)
        
        if domain_data.get('error_count', 0) > 0:
            quality_issues.append(f"Errors detected: {domain_data['error_count']}")
            drift_score = max(drift_score, 0.4)
        
        # Determine if recrawl is needed
        needs_recrawl = drift_score > self.recrawl_threshold or len(quality_issues) >= 3
        
        return DriftMetrics(
            domain=domain,
            timestamp=datetime.utcnow(),
            ks_statistic=ks_statistic,
            js_divergence=js_divergence,
            cosine_distance=cosine_distance,
            temporal_variance=temporal_variance,
            drift_score=drift_score,
            quality_issues=quality_issues,
            needs_recrawl=needs_recrawl
        )
    
    def _generate_recommendations(self, 
                                drift_results: List[DriftMetrics],
                                drift_percentage: float,
                                avg_drift_score: float) -> List[str]:
        """Generate actionable recommendations based on drift analysis"""
        recommendations = []
        
        # Overall batch health
        if drift_percentage > 0.2:
            recommendations.append(
                f"⚠️ High drift detected in {drift_percentage:.1%} of domains. "
                "Consider reviewing data collection pipeline."
            )
        
        if avg_drift_score > 0.15:
            recommendations.append(
                f"📊 Average drift score ({avg_drift_score:.3f}) exceeds normal range. "
                "Investigate potential systematic issues."
            )
        
        # Specific issues
        recrawl_domains = [dm for dm in drift_results if dm.needs_recrawl]
        if recrawl_domains:
            recommendations.append(
                f"🔄 {len(recrawl_domains)} domains require immediate re-crawling."
            )
        
        # Quality patterns
        quality_issue_counts = {}
        for dm in drift_results:
            for issue in dm.quality_issues:
                quality_issue_counts[issue] = quality_issue_counts.get(issue, 0) + 1
        
        for issue, count in sorted(quality_issue_counts.items(), key=lambda x: x[1], reverse=True)[:3]:
            if count > len(drift_results) * 0.1:
                recommendations.append(f"🔍 Pattern detected: '{issue}' in {count} domains")
        
        # Performance optimization
        if len(drift_results) > 100:
            recommendations.append(
                "💡 Consider increasing batch processing parallelism for better performance"
            )
        
        return recommendations
    
    async def _store_batch_report(self, report: BatchDriftReport):
        """Store batch report in database and memory"""
        try:
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO drift_reports 
                    (batch_id, report_data, quality_gate_passed, created_at)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (batch_id) DO UPDATE
                    SET report_data = $2, updated_at = NOW()
                """, 
                report.batch_id, 
                json.dumps(asdict(report), default=str),
                report.quality_gate_passed,
                report.timestamp
                )
            
            # Add to batch history
            self.batch_history.append(asdict(report))
            
        except Exception as e:
            logger.error(f"Failed to store batch report: {e}")
    
    async def _trigger_quality_alert(self, report: BatchDriftReport):
        """Trigger alerts for quality gate failures"""
        logger.error(f"""
        🚨 QUALITY ALERT - Batch {report.batch_id}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        Drift Rate: {report.drift_percentage:.1%} (threshold: {self.batch_alert_threshold:.1%})
        Affected Domains: {report.high_drift_count}
        Average Drift Score: {report.avg_drift_score:.3f}
        
        Top Affected Domains:
        {chr(10).join(f'  - {domain}' for domain in report.affected_domains[:5])}
        
        Recommendations:
        {chr(10).join(f'  • {rec}' for rec in report.recommendations)}
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        """)
        
        # Store alert in database
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO quality_alerts 
                (batch_id, alert_type, severity, details, created_at)
                VALUES ($1, 'drift_detection', 'high', $2, NOW())
            """, report.batch_id, json.dumps(asdict(report), default=str))
    
    def _generate_batch_id(self, domain_batch: List[Dict]) -> str:
        """Generate unique batch ID"""
        batch_str = json.dumps(
            sorted([d.get('domain', '') for d in domain_batch])
        )
        return hashlib.md5(
            f"{batch_str}{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:12]
    
    async def get_drift_summary(self, hours: int = 24) -> Dict:
        """Get drift summary for the specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        async with self.pool.acquire() as conn:
            summary = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_batches,
                    SUM(CASE WHEN quality_gate_passed THEN 1 ELSE 0 END) as passed_batches,
                    AVG((report_data->>'avg_drift_score')::float) as avg_drift,
                    MAX((report_data->>'drift_percentage')::float) as max_drift_percentage
                FROM drift_reports
                WHERE created_at > $1
            """, cutoff_time)
            
            recent_alerts = await conn.fetch("""
                SELECT batch_id, severity, created_at
                FROM quality_alerts
                WHERE created_at > $1
                ORDER BY created_at DESC
                LIMIT 10
            """, cutoff_time)
        
        return {
            'period_hours': hours,
            'total_batches': summary['total_batches'] or 0,
            'passed_batches': summary['passed_batches'] or 0,
            'pass_rate': (summary['passed_batches'] or 0) / max(1, summary['total_batches'] or 1),
            'avg_drift_score': summary['avg_drift'] or 0,
            'max_drift_percentage': summary['max_drift_percentage'] or 0,
            'recent_alerts': [
                {
                    'batch_id': alert['batch_id'],
                    'severity': alert['severity'],
                    'timestamp': alert['created_at'].isoformat()
                }
                for alert in recent_alerts
            ],
            'reference_domains': len(self.reference_cache),
            'drift_history_size': len(self.drift_history)
        }
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.pool:
            await self.pool.close()
        logger.info("✅ DriftDetector cleaned up")

# Main execution
async def main():
    """Run drift detector agent"""
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db'
    )
    
    detector = DriftDetectorAgent(database_url)
    await detector.initialize()
    
    try:
        # Continuous monitoring loop
        while True:
            try:
                # Fetch latest batch of domains
                async with detector.pool.acquire() as conn:
                    latest_domains = await conn.fetch("""
                        SELECT 
                            d.domain,
                            pdc.memory_score,
                            pdc.updated_at,
                            COUNT(dr.id) FILTER (WHERE dr.error_message IS NOT NULL) as error_count
                        FROM domains d
                        LEFT JOIN public_domain_cache pdc ON d.domain = pdc.domain
                        LEFT JOIN domain_responses dr ON d.id = dr.domain_id
                        WHERE pdc.updated_at > NOW() - INTERVAL '1 hour'
                        GROUP BY d.domain, pdc.memory_score, pdc.updated_at
                        ORDER BY pdc.updated_at DESC
                        LIMIT 100
                    """)
                
                if latest_domains:
                    # Convert to dict format
                    domain_batch = [
                        {
                            'domain': row['domain'],
                            'memory_score': float(row['memory_score'] or 0),
                            'updated_at': row['updated_at'],
                            'error_count': row['error_count'] or 0
                        }
                        for row in latest_domains
                    ]
                    
                    # Analyze batch
                    report = await detector.analyze_batch(domain_batch)
                    
                    logger.info(f"""
                    📊 Batch Analysis Complete
                    ━━━━━━━━━━━━━━━━━━━━━━━━
                    Batch ID: {report.batch_id}
                    Quality Gate: {'✅ PASSED' if report.quality_gate_passed else '❌ FAILED'}
                    Drift Rate: {report.drift_percentage:.1%}
                    Avg Drift: {report.avg_drift_score:.3f}
                    """)
                    
                    # Get summary every hour
                    if int(time.time()) % 3600 < 60:
                        summary = await detector.get_drift_summary()
                        logger.info(f"""
                        📈 24-Hour Drift Summary
                        ━━━━━━━━━━━━━━━━━━━━━━
                        Total Batches: {summary['total_batches']}
                        Pass Rate: {summary['pass_rate']:.1%}
                        Avg Drift: {summary['avg_drift_score']:.3f}
                        Alerts: {len(summary['recent_alerts'])}
                        """)
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(30)
                
    except KeyboardInterrupt:
        logger.info("🛑 Drift detector stopped by user")
    finally:
        await detector.cleanup()

if __name__ == "__main__":
    # Store initialization in memory
    import subprocess
    subprocess.run([
        "npx", "claude-flow", "hooks", "notification",
        "--message", "drift_detector_initialized",
        "--telemetry", "true"
    ])
    
    asyncio.run(main())
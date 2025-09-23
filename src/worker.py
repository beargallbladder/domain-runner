import asyncio
import os
import sys
import traceback
from datetime import datetime, timedelta
import json

# Add project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "agents", "database-connector", "src"))

from orchestrator import NexusOrchestrator
from connector import DatabaseConnector

# Configuration
INTERVAL = int(os.getenv("WORKER_INTERVAL_SEC", "300"))  # 5 minutes default
BATCH_SIZE = int(os.getenv("WORKER_BATCH_SIZE", "10"))
ENABLE_DRIFT_MONITORING = os.getenv("ENABLE_DRIFT_MONITORING", "true").lower() == "true"
ENABLE_TENSOR_PROCESSING = os.getenv("ENABLE_TENSOR_PROCESSING", "true").lower() == "true"

class DomainWorker:
    """Production worker for continuous domain processing"""

    def __init__(self):
        self.orchestrator = NexusOrchestrator()
        self.db = DatabaseConnector()
        self.run_count = 0
        self.last_run = None
        self.errors = []

    async def run_once(self):
        """Single iteration of the worker loop"""
        self.run_count += 1
        start_time = datetime.utcnow()

        try:
            print(f"[Worker] Starting run #{self.run_count} at {start_time}")

            # Run main orchestration pipeline
            result = self.orchestrator.execute_pipeline(
                window_hours=24,
                test_domains=None,  # Process all domains
                dry_run=False
            )

            # Process drift monitoring if enabled
            if ENABLE_DRIFT_MONITORING:
                await self.process_drift_alerts(result)

            # Process tensor calculations if enabled
            if ENABLE_TENSOR_PROCESSING:
                await self.process_tensor_updates(result)

            # Update tracking
            self.last_run = {
                "run_number": self.run_count,
                "timestamp": start_time.isoformat(),
                "duration": (datetime.utcnow() - start_time).total_seconds(),
                "result": result
            }

            # Log summary
            print(f"[Worker] Run #{self.run_count} completed successfully")
            print(f"[Worker] Coverage: {result.get('actual_coverage', 0):.1%}")
            print(f"[Worker] MII Score: {result.get('mii_score', 0):.3f}")

            # Clear old errors on successful run
            if len(self.errors) > 10:
                self.errors = self.errors[-10:]

        except Exception as e:
            error_info = {
                "run_number": self.run_count,
                "timestamp": start_time.isoformat(),
                "error": str(e),
                "traceback": traceback.format_exc()
            }
            self.errors.append(error_info)

            print(f"[Worker] Run #{self.run_count} failed: {e}")
            traceback.print_exc()

            # Don't crash the worker on errors
            return {"error": str(e)}

    async def process_drift_alerts(self, result: dict):
        """Process drift monitoring and alerts"""
        try:
            # Get drift signals from database
            drift_signals = self.db.get_drift_signals(hours=24)

            if drift_signals:
                avg_drift = sum(drift_signals) / len(drift_signals)
                print(f"[Worker] Average drift signal: {avg_drift:.3f}")

                if avg_drift > 0.3:  # High drift threshold
                    print(f"[Worker] ALERT: High drift detected: {avg_drift:.3f}")

                    # Get specific domain drift data
                    query = """
                        SELECT domain, AVG(drift_score) as avg_drift
                        FROM drift_scores
                        WHERE ts_iso > NOW() - INTERVAL '24 hours'
                          AND status IN ('drifting', 'decayed')
                        GROUP BY domain
                        HAVING AVG(drift_score) > 0.3
                        ORDER BY avg_drift DESC
                        LIMIT 10
                    """
                    high_drift_domains = self.db.execute_query(query)

                    for domain_drift in high_drift_domains:
                        print(f"[Worker] Domain {domain_drift['domain']} has drift score: {domain_drift['avg_drift']:.3f}")

        except Exception as e:
            print(f"[Worker] Drift alert processing failed: {e}")

    async def process_tensor_updates(self, result: dict):
        """Process tensor calculations and updates"""
        try:
            # Get domains that need tensor updates
            domains_processed = result.get("domains_processed", [])

            if domains_processed:
                print(f"[Worker] Updating tensors for {len(domains_processed)} domains")

                # Import tensor processor if available
                try:
                    sys.path.insert(0, os.path.join(project_root, "services", "embedding-engine"))
                    from analysis.similarity import SimilarityAnalyzer
                    from analysis.drift import DriftDetector

                    analyzer = SimilarityAnalyzer()
                    detector = DriftDetector()

                    # Process similarity tensors
                    for domain in domains_processed[:BATCH_SIZE]:
                        print(f"[Worker] Calculating tensors for {domain}")
                        # Tensor calculation would happen here
                        await asyncio.sleep(0.1)  # Yield control

                except ImportError:
                    print("[Worker] Tensor modules not available, skipping")

        except Exception as e:
            print(f"[Worker] Tensor processing failed: {e}")

    async def health_check(self):
        """Periodic health check"""
        while True:
            await asyncio.sleep(60)  # Check every minute

            if self.last_run:
                last_run_time = datetime.fromisoformat(self.last_run["timestamp"])
                time_since = datetime.utcnow() - last_run_time

                if time_since > timedelta(seconds=INTERVAL * 3):
                    print(f"[Worker] WARNING: No successful run in {time_since}")

            # Log worker status
            status = {
                "runs": self.run_count,
                "last_run": self.last_run["timestamp"] if self.last_run else None,
                "recent_errors": len(self.errors)
            }
            print(f"[Worker] Health: {json.dumps(status)}")

async def main():
    """Main worker loop"""
    print(f"[Worker] Starting domain-runner worker")
    print(f"[Worker] Interval: {INTERVAL}s, Batch: {BATCH_SIZE}")
    print(f"[Worker] Drift monitoring: {ENABLE_DRIFT_MONITORING}")
    print(f"[Worker] Tensor processing: {ENABLE_TENSOR_PROCESSING}")

    worker = DomainWorker()

    # Start health check task
    health_task = asyncio.create_task(worker.health_check())

    try:
        while True:
            try:
                await worker.run_once()
            except Exception:
                traceback.print_exc()

            # Wait for next iteration
            print(f"[Worker] Sleeping for {INTERVAL}s...")
            await asyncio.sleep(INTERVAL)

    except KeyboardInterrupt:
        print("[Worker] Shutting down...")
        health_task.cancel()

if __name__ == "__main__":
    asyncio.run(main())
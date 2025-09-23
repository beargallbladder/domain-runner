from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import os
import sys
import asyncio
import traceback
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Add project root to path for imports
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, "agents", "database-connector", "src"))

from orchestrator import NexusOrchestrator
from connector import DatabaseConnector

app = FastAPI(title="domain-runner", version="1.0.0")

# Global instances
orchestrator = None
db = None

class TriggerRequest(BaseModel):
    batch: Optional[str] = None
    domain: Optional[str] = None
    force_refresh: bool = False

class CrawlRequest(BaseModel):
    domains: list[str]
    llm_providers: Optional[list[str]] = None
    prompt_types: Optional[list[str]] = None

@app.on_event("startup")
async def startup_event():
    """Initialize orchestrator and database on startup"""
    global orchestrator, db
    try:
        orchestrator = NexusOrchestrator()
        db = DatabaseConnector()
        print("[API] Orchestrator and database initialized")
    except Exception as e:
        print(f"[API] Failed to initialize: {e}")
        traceback.print_exc()

@app.get("/healthz")
async def healthz():
    """Health check endpoint for Render"""
    return {
        "ok": True,
        "service": "domain-runner",
        "env": os.getenv("NODE_ENV", "dev"),
        "version": "1.0.0",
        "orchestrator_ready": orchestrator is not None
    }

@app.get("/status")
async def status():
    """Get detailed system status"""
    if not orchestrator or not db:
        raise HTTPException(status_code=503, detail="Services not initialized")

    try:
        # Get status from orchestrator
        manifest_stats = orchestrator.manifest_manager.get_manifest()

        # Get real database stats
        coverage = db.get_domain_coverage()
        model_stats = db.get_model_performance_stats()
        provider_usage = db.get_provider_usage()

        return {
            "ok": True,
            "manifest": manifest_stats,
            "coverage": coverage,
            "model_performance": model_stats,
            "provider_usage": provider_usage,
            "run_history_count": len(orchestrator.run_history),
            "last_run": orchestrator.run_history[-1] if orchestrator.run_history else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/trigger")
async def trigger(req: TriggerRequest, background_tasks: BackgroundTasks):
    """Trigger a batch processing run"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        # Run in background to avoid timeout
        background_tasks.add_task(
            run_batch_async,
            batch=req.batch,
            domain=req.domain,
            force_refresh=req.force_refresh
        )

        return {
            "ok": True,
            "triggered": True,
            "batch": req.batch or "default",
            "message": "Batch processing started in background"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/domains")
async def get_domains():
    """Get list of domains and their status"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    try:
        query = """
            SELECT DISTINCT
                d.domain,
                d.category,
                d.priority,
                COUNT(dr.id) as response_count,
                MAX(dr.timestamp) as last_crawled,
                AVG(CASE WHEN dr.status = 'success' THEN 1 ELSE 0 END) as success_rate
            FROM domains d
            LEFT JOIN domain_responses dr ON d.domain = dr.domain
                AND dr.timestamp > NOW() - INTERVAL '7 days'
            WHERE d.active = true
            GROUP BY d.domain, d.category, d.priority
            ORDER BY d.priority DESC, d.domain
        """
        domains = db.execute_query(query)

        return {
            "ok": True,
            "domain_count": len(domains),
            "domains": domains
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models")
async def get_models():
    """Get list of available models and their performance"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    try:
        stats = db.get_model_performance_stats()
        return {
            "ok": True,
            "model_count": len(stats),
            "models": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/crawl")
async def crawl(req: CrawlRequest):
    """Trigger crawl for specific domains"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        # Start crawl using orchestrator
        result = await run_crawl_async(
            domains=req.domains,
            llm_providers=req.llm_providers,
            prompt_types=req.prompt_types
        )

        return {
            "ok": True,
            "domains_queued": len(req.domains),
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/drift/{domain}")
async def get_drift(domain: str):
    """Get drift analysis for a specific domain"""
    if not db:
        raise HTTPException(status_code=503, detail="Database not initialized")

    try:
        # Query real drift data from database
        query = """
            SELECT
                domain,
                prompt_id,
                model,
                ts_iso,
                drift_score,
                similarity_prev,
                status,
                explanation
            FROM drift_scores
            WHERE domain = %s
            ORDER BY ts_iso DESC
            LIMIT 10
        """
        drift_records = db.execute_query(query, (domain,))

        if not drift_records:
            # No drift data yet, get recent responses
            response_query = """
                SELECT COUNT(*) as response_count,
                       MAX(timestamp) as last_seen
                FROM domain_responses
                WHERE domain = %s
            """
            responses = db.execute_query(response_query, (domain,))

            return {
                "ok": True,
                "domain": domain,
                "drift_data": {
                    "status": "no_drift_data",
                    "message": "Drift analysis pending",
                    "response_count": responses[0]['response_count'] if responses else 0,
                    "last_seen": responses[0]['last_seen'].isoformat() if responses and responses[0]['last_seen'] else None
                }
            }

        # Calculate average drift score
        avg_drift = sum(r['drift_score'] for r in drift_records) / len(drift_records)
        latest_status = drift_records[0]['status']

        return {
            "ok": True,
            "domain": domain,
            "drift_data": {
                "average_drift_score": avg_drift,
                "latest_status": latest_status,
                "last_check": drift_records[0]['ts_iso'].isoformat(),
                "recent_drifts": [
                    {
                        "model": r['model'],
                        "prompt_id": r['prompt_id'],
                        "drift_score": r['drift_score'],
                        "status": r['status'],
                        "timestamp": r['ts_iso'].isoformat()
                    }
                    for r in drift_records
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_batch_async(batch: Optional[str], domain: Optional[str], force_refresh: bool):
    """Async wrapper for batch processing"""
    try:
        print(f"[API] Starting batch processing: batch={batch}, domain={domain}, force={force_refresh}")

        # Run orchestrator's pipeline execution
        result = orchestrator.execute_pipeline(
            window_hours=24,
            test_domains=[domain] if domain else None,
            dry_run=False
        )

        print(f"[API] Batch processing completed: {result}")
        return result
    except Exception as e:
        print(f"[API] Batch processing failed: {e}")
        traceback.print_exc()
        return {"error": str(e)}

async def run_crawl_async(domains: list[str], llm_providers: Optional[list[str]], prompt_types: Optional[list[str]]):
    """Async wrapper for crawl processing"""
    try:
        print(f"[API] Starting crawl: domains={len(domains)}, providers={llm_providers}")

        # Run a focused pipeline execution for specific domains
        result = orchestrator.execute_pipeline(
            window_hours=1,  # Quick crawl window
            test_domains=domains,
            dry_run=False
        )

        return {
            "processed": len(domains),
            "result": result
        }
    except Exception as e:
        print(f"[API] Crawl failed: {e}")
        traceback.print_exc()
        return {"error": str(e)}
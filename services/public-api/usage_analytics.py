"""
API Usage Analytics Endpoints
Provides usage statistics and analytics for API key owners
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timedelta, date
from typing import Optional, Dict, List, Any
import asyncpg
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

# Response models
class UsageStats(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float

class EndpointUsage(BaseModel):
    endpoint: str
    requests: int
    avg_response_time_ms: float
    error_rate: float

class DailyUsage(BaseModel):
    date: date
    requests: int
    successful: int
    failed: int
    avg_response_time_ms: float

class UsageOverview(BaseModel):
    api_key_info: Dict[str, Any]
    current_period: UsageStats
    today: UsageStats
    endpoints: List[EndpointUsage]
    daily_usage: List[DailyUsage]
    rate_limits: Dict[str, Any]

# Create router
def create_usage_analytics_router(pool: asyncpg.Pool):
    router = APIRouter(prefix="/api/usage", tags=["analytics"])
    
    async def get_api_key_from_request(request) -> Dict[str, Any]:
        """Extract API key info from request state"""
        if not hasattr(request.state, "api_key_id"):
            raise HTTPException(status_code=401, detail="API key required")
        
        return {
            "api_key_id": request.state.api_key_id,
            "user_id": request.state.user_id,
            "api_key_prefix": request.state.api_key_prefix,
            "subscription_tier": request.state.subscription_tier
        }
    
    @router.get("", response_model=UsageOverview)
    async def get_usage_overview(
        request,
        days: int = Query(7, ge=1, le=90, description="Number of days to show"),
        key_info: Dict = Depends(lambda req=request: get_api_key_from_request(req))
    ):
        """Get comprehensive usage overview for the authenticated API key"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            async with pool.acquire() as conn:
                # Get current period stats
                period_stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_requests,
                        COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
                        COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
                        AVG(response_time_ms) as avg_response_time_ms,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time_ms,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time_ms
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                """, key_info["api_key_id"], start_date, end_date)
                
                # Get today's stats
                today_stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_requests,
                        COUNT(*) FILTER (WHERE status_code < 400) as successful_requests,
                        COUNT(*) FILTER (WHERE status_code >= 400) as failed_requests,
                        AVG(response_time_ms) as avg_response_time_ms,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time_ms,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time_ms
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date = $2
                """, key_info["api_key_id"], end_date)
                
                # Get endpoint usage
                endpoint_usage = await conn.fetch("""
                    SELECT 
                        endpoint,
                        COUNT(*) as requests,
                        AVG(response_time_ms) as avg_response_time_ms,
                        COUNT(*) FILTER (WHERE status_code >= 400)::float / COUNT(*)::float as error_rate
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                    GROUP BY endpoint
                    ORDER BY requests DESC
                    LIMIT 10
                """, key_info["api_key_id"], start_date, end_date)
                
                # Get daily usage
                daily_usage = await conn.fetch("""
                    SELECT 
                        created_date as date,
                        COUNT(*) as requests,
                        COUNT(*) FILTER (WHERE status_code < 400) as successful,
                        COUNT(*) FILTER (WHERE status_code >= 400) as failed,
                        AVG(response_time_ms) as avg_response_time_ms
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                    GROUP BY created_date
                    ORDER BY created_date DESC
                """, key_info["api_key_id"], start_date, end_date)
                
                # Get rate limit info
                rate_limit_info = await conn.fetchrow("""
                    SELECT 
                        rate_limit_per_minute,
                        rate_limit_per_day,
                        calls_made_today
                    FROM api_keys
                    WHERE id = $1
                """, key_info["api_key_id"])
                
                return UsageOverview(
                    api_key_info={
                        "key_prefix": key_info["api_key_prefix"],
                        "tier": key_info["subscription_tier"]
                    },
                    current_period=UsageStats(
                        total_requests=period_stats["total_requests"] or 0,
                        successful_requests=period_stats["successful_requests"] or 0,
                        failed_requests=period_stats["failed_requests"] or 0,
                        avg_response_time_ms=round(period_stats["avg_response_time_ms"] or 0, 2),
                        p95_response_time_ms=round(period_stats["p95_response_time_ms"] or 0, 2),
                        p99_response_time_ms=round(period_stats["p99_response_time_ms"] or 0, 2)
                    ),
                    today=UsageStats(
                        total_requests=today_stats["total_requests"] or 0,
                        successful_requests=today_stats["successful_requests"] or 0,
                        failed_requests=today_stats["failed_requests"] or 0,
                        avg_response_time_ms=round(today_stats["avg_response_time_ms"] or 0, 2),
                        p95_response_time_ms=round(today_stats["p95_response_time_ms"] or 0, 2),
                        p99_response_time_ms=round(today_stats["p99_response_time_ms"] or 0, 2)
                    ),
                    endpoints=[
                        EndpointUsage(
                            endpoint=row["endpoint"],
                            requests=row["requests"],
                            avg_response_time_ms=round(row["avg_response_time_ms"] or 0, 2),
                            error_rate=round(row["error_rate"] or 0, 3)
                        )
                        for row in endpoint_usage
                    ],
                    daily_usage=[
                        DailyUsage(
                            date=row["date"],
                            requests=row["requests"],
                            successful=row["successful"],
                            failed=row["failed"],
                            avg_response_time_ms=round(row["avg_response_time_ms"] or 0, 2)
                        )
                        for row in daily_usage
                    ],
                    rate_limits={
                        "per_minute": rate_limit_info["rate_limit_per_minute"],
                        "per_day": rate_limit_info["rate_limit_per_day"],
                        "used_today": rate_limit_info["calls_made_today"],
                        "remaining_today": rate_limit_info["rate_limit_per_day"] - rate_limit_info["calls_made_today"]
                    }
                )
                
        except Exception as e:
            logger.error(f"Failed to get usage overview: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve usage data")
    
    @router.get("/errors")
    async def get_error_summary(
        request,
        days: int = Query(7, ge=1, le=30),
        key_info: Dict = Depends(lambda req=request: get_api_key_from_request(req))
    ):
        """Get error summary for the API key"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            async with pool.acquire() as conn:
                # Get error breakdown
                errors = await conn.fetch("""
                    SELECT 
                        status_code,
                        endpoint,
                        error_message,
                        COUNT(*) as count,
                        MAX(requested_at) as last_occurred
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                    AND status_code >= 400
                    GROUP BY status_code, endpoint, error_message
                    ORDER BY count DESC
                    LIMIT 50
                """, key_info["api_key_id"], start_date, end_date)
                
                return {
                    "period": f"{days} days",
                    "total_errors": sum(row["count"] for row in errors),
                    "errors": [
                        {
                            "status_code": row["status_code"],
                            "endpoint": row["endpoint"],
                            "error": row["error_message"] or f"HTTP {row['status_code']}",
                            "count": row["count"],
                            "last_occurred": row["last_occurred"].isoformat()
                        }
                        for row in errors
                    ]
                }
                
        except Exception as e:
            logger.error(f"Failed to get error summary: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve error data")
    
    @router.get("/performance")
    async def get_performance_metrics(
        request,
        days: int = Query(7, ge=1, le=30),
        key_info: Dict = Depends(lambda req=request: get_api_key_from_request(req))
    ):
        """Get detailed performance metrics"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            async with pool.acquire() as conn:
                # Get performance by endpoint
                endpoint_perf = await conn.fetch("""
                    SELECT 
                        endpoint,
                        COUNT(*) as requests,
                        MIN(response_time_ms) as min_response_time,
                        AVG(response_time_ms) as avg_response_time,
                        MAX(response_time_ms) as max_response_time,
                        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as p50,
                        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95,
                        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                    AND status_code < 400
                    GROUP BY endpoint
                    ORDER BY requests DESC
                """, key_info["api_key_id"], start_date, end_date)
                
                # Get hourly performance pattern
                hourly_pattern = await conn.fetch("""
                    SELECT 
                        EXTRACT(HOUR FROM requested_at) as hour,
                        COUNT(*) as requests,
                        AVG(response_time_ms) as avg_response_time
                    FROM api_key_usage_log
                    WHERE api_key_id = $1 
                    AND created_date >= $2
                    AND created_date <= $3
                    GROUP BY EXTRACT(HOUR FROM requested_at)
                    ORDER BY hour
                """, key_info["api_key_id"], start_date, end_date)
                
                return {
                    "period": f"{days} days",
                    "endpoints": [
                        {
                            "endpoint": row["endpoint"],
                            "requests": row["requests"],
                            "response_times": {
                                "min": round(row["min_response_time"], 2),
                                "avg": round(row["avg_response_time"], 2),
                                "max": round(row["max_response_time"], 2),
                                "p50": round(row["p50"], 2),
                                "p95": round(row["p95"], 2),
                                "p99": round(row["p99"], 2)
                            }
                        }
                        for row in endpoint_perf
                    ],
                    "hourly_pattern": [
                        {
                            "hour": int(row["hour"]),
                            "requests": row["requests"],
                            "avg_response_time": round(row["avg_response_time"], 2)
                        }
                        for row in hourly_pattern
                    ]
                }
                
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve performance data")
    
    @router.get("/bandwidth")
    async def get_bandwidth_usage(
        request,
        days: int = Query(7, ge=1, le=30),
        key_info: Dict = Depends(lambda req=request: get_api_key_from_request(req))
    ):
        """Get bandwidth usage statistics"""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            async with pool.acquire() as conn:
                # Get bandwidth stats from summary table
                bandwidth = await conn.fetchrow("""
                    SELECT 
                        SUM(total_request_bytes) as total_request_bytes,
                        SUM(total_response_bytes) as total_response_bytes,
                        SUM(total_requests) as total_requests
                    FROM api_usage_summary
                    WHERE api_key_id = $1 
                    AND summary_date >= $2
                    AND summary_date <= $3
                """, key_info["api_key_id"], start_date, end_date)
                
                # Get daily bandwidth
                daily_bandwidth = await conn.fetch("""
                    SELECT 
                        summary_date as date,
                        total_request_bytes,
                        total_response_bytes,
                        total_requests
                    FROM api_usage_summary
                    WHERE api_key_id = $1 
                    AND summary_date >= $2
                    AND summary_date <= $3
                    ORDER BY summary_date DESC
                """, key_info["api_key_id"], start_date, end_date)
                
                total_bandwidth = (bandwidth["total_request_bytes"] or 0) + (bandwidth["total_response_bytes"] or 0)
                
                return {
                    "period": f"{days} days",
                    "total": {
                        "requests": bandwidth["total_requests"] or 0,
                        "request_bytes": bandwidth["total_request_bytes"] or 0,
                        "response_bytes": bandwidth["total_response_bytes"] or 0,
                        "total_bytes": total_bandwidth,
                        "total_mb": round(total_bandwidth / 1024 / 1024, 2),
                        "avg_request_size": round((bandwidth["total_request_bytes"] or 0) / max(1, bandwidth["total_requests"] or 1), 2),
                        "avg_response_size": round((bandwidth["total_response_bytes"] or 0) / max(1, bandwidth["total_requests"] or 1), 2)
                    },
                    "daily": [
                        {
                            "date": row["date"].isoformat(),
                            "requests": row["total_requests"],
                            "request_mb": round(row["total_request_bytes"] / 1024 / 1024, 2),
                            "response_mb": round(row["total_response_bytes"] / 1024 / 1024, 2),
                            "total_mb": round((row["total_request_bytes"] + row["total_response_bytes"]) / 1024 / 1024, 2)
                        }
                        for row in daily_bandwidth
                    ]
                }
                
        except Exception as e:
            logger.error(f"Failed to get bandwidth usage: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve bandwidth data")
    
    return router
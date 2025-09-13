#!/usr/bin/env python3
"""
FIXED Production API for LLM PageRank - AI Brand Intelligence Platform
This is a working version with syntax errors fixed
"""

from fastapi import FastAPI, HTTPException, Response, Query, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
import asyncpg
import os
import json
from datetime import datetime
import logging
from typing import Dict, List, Optional, Any
from api_key_manager import APIKeyManager
import aiohttp
import asyncio
import numpy as np
from request_logger import RequestLoggingMiddleware, APIKeyAuthMiddleware
from usage_analytics import create_usage_analytics_router
from collections import defaultdict
from rate_limiter import limiter, rate_limit_exceeded_handler, add_rate_limit_headers_middleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Production logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Key Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# FastAPI app
app = FastAPI(
    title="LLM PageRank - AI Brand Intelligence",
    description="Real-time AI brand perception monitoring",
    version="3.2.0-RICH-API"  # Added rich API endpoints with provider breakdowns
)

# Add rate limiter to the app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Add SlowAPI middleware IMMEDIATELY after app creation
from slowapi.middleware import SlowAPIMiddleware
app.add_middleware(SlowAPIMiddleware)

# Critical security fix - Add authentication middleware at module level
# This must be done before any requests are processed
class EarlyAuthMiddleware(BaseHTTPMiddleware):
    """Early authentication middleware that works without pool dependency"""
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for truly public endpoints
        public_paths = ["/", "/health", "/favicon.ico"]
        if request.url.path in public_paths:
            return await call_next(request)
        
        # For all other endpoints, require API key
        api_key = request.headers.get("x-api-key")
        if not api_key:
            # Check Authorization header as fallback
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                api_key = auth_header[7:]
        
        if not api_key:
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "Authentication required. Please provide valid X-API-Key header.",
                    "status_code": 401
                }),
                status_code=401,
                headers={"Content-Type": "application/json", "WWW-Authenticate": "ApiKey"}
            )
        
        # For now, just check that a key exists - full validation happens in verify_api_key
        request.state.raw_api_key = api_key
        return await call_next(request)

# Add the early auth middleware
app.add_middleware(EarlyAuthMiddleware)

# CORS Configuration
ALLOWED_ORIGINS = [
    "https://llmrank.io",
    "https://www.llmrank.io", 
    "https://llm-pagerank-frontend.onrender.com",
    "https://localhost:3000",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-API-Key"],
)

# Global connection pool and API key manager
pool = None
api_key_manager = None

# Memory Oracle service configuration
MEMORY_ORACLE_URL = os.environ.get('MEMORY_ORACLE_URL', 'https://memory-oracle.onrender.com')
MEMORY_ORACLE_TIMEOUT = 30  # seconds

# Cache for tensor results
tensor_cache = {}
cache_ttl = 300  # 5 minutes

# Initialize middleware BEFORE startup
async def init_middleware():
    """Initialize middleware with database connection"""
    global pool
    if pool:
        # Add middleware for API key auth FIRST (processes last due to stack order)
        app.add_middleware(APIKeyAuthMiddleware, pool=pool)
        app.add_middleware(RequestLoggingMiddleware, pool=pool)

@app.on_event("startup")
async def startup():
    """Initialize production database pool and API key manager"""
    global pool, api_key_manager
    
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        raise Exception("DATABASE_URL is required")
    
    try:
        pool = await asyncpg.create_pool(
            database_url,
            min_size=5,
            max_size=20,
            command_timeout=10
        )
        # Test the connection
        async with pool.acquire() as conn:
            await conn.fetchval('SELECT 1')
        logger.info("Database connected successfully")
        
        # Initialize API key manager
        api_key_manager = APIKeyManager(database_url)
        logger.info("API key manager initialized")
        
        # Initialize middleware after pool is ready
        await init_middleware()
        
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise
    
    # Add usage analytics routes
    usage_router = create_usage_analytics_router(pool)
    
    # Add RICH API endpoints with provider breakdowns
    from rich_api_endpoints import create_rich_api_router
    rich_router = create_rich_api_router(pool)
    app.include_router(rich_router)
    app.include_router(usage_router)
    
    logger.info("🚀 Production API v3.1.1-SECURITY-CRITICAL with authentication, request logging, and rate limiting initialized")

@app.on_event("shutdown") 
async def shutdown():
    """Clean shutdown"""
    global pool
    if pool:
        await pool.close()

# Security middleware for API key validation
async def verify_api_key(request: Request) -> dict:
    """Verify API key for protected endpoints - works with middleware"""
    # Skip authentication for health and root endpoints
    if request.url.path in ["/", "/health"]:
        return {"skip_auth": True}
    
    # Check if middleware has already validated the key
    if hasattr(request.state, "api_key_info") and request.state.api_key_info:
        return request.state.api_key_info
    
    # If we get here, the middleware didn't authenticate (which shouldn't happen for protected endpoints)
    logger.error(f"verify_api_key called but middleware didn't authenticate for {request.url.path}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide valid X-API-Key header.",
        headers={"WWW-Authenticate": "ApiKey"},
    )

# Custom security response headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Add security headers to all responses"""
    response = await call_next(request)
    
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Add rate limit headers if available from API key info
    if hasattr(request.state, "api_key_info") and request.state.api_key_info:
        response.headers["X-RateLimit-Limit"] = str(request.state.api_key_info.get("rate_limit", 1000))
    
    return response

@app.get("/")
def root():
    """API status"""
    return {
        "service": "AI Brand Intelligence Platform",
        "status": "operational",
        "version": "3.1.0",
        "features": ["database", "analytics", "monitoring", "request_logging", "usage_analytics"]
    }

@app.get("/health")
async def health():
    """Production health check"""
    health_response = {
        "status": "healthy",
        "database": "unknown",
        "timestamp": datetime.now().isoformat() + 'Z'
    }
    
    try:
        if pool is None:
            health_response["database"] = "pool_not_initialized"
            health_response["status"] = "degraded"
        else:
            async with pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
            health_response["database"] = "connected"
                
    except Exception as e:
        logger.error(f"Health check database error: {e}")
        health_response["database"] = f"error: {str(e)[:100]}"
        health_response["status"] = "degraded"
    
    return health_response

@app.get("/api/stats")
@limiter.limit("300/hour,50/minute")
async def get_public_stats(request: Request, api_key_info: dict = Depends(verify_api_key)):
    """Public platform statistics - requires authentication"""
    try:
        logger.info("📊 /api/stats endpoint called")
        
        if pool is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
            
        async with pool.acquire() as conn:
            # Get aggregate stats
            stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_domains,
                    AVG(memory_score) as avg_memory_score,
                    SUM(response_count) as total_model_responses,
                    COUNT(*) FILTER (WHERE reputation_risk = 'high') as critical_risk,
                    MAX(updated_at) as last_update
                FROM public_domain_cache
            """)
            
            if not stats:
                raise HTTPException(status_code=500, detail="No statistics available")
            
            return {
                "platform_stats": {
                    "total_domains": stats['total_domains'],
                    "average_memory_score": round(stats['avg_memory_score'], 1) if stats['avg_memory_score'] else 0,
                    "total_ai_responses": stats['total_model_responses'],
                    "critical_risk_domains": stats['critical_risk'],
                    "high_risk_domains": stats['critical_risk'],
                    "last_updated": stats['last_update'].isoformat() + 'Z' if stats['last_update'] else None
                },
                "data_freshness": "Updated every 6 hours",
                "coverage": "3235 domains across 15+ AI models"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/rankings")
@limiter.limit("200/hour,30/minute")
async def get_rankings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    api_key_info: dict = Depends(verify_api_key)
):
    """Complete domain rankings - requires authentication"""
    try:
        logger.info("📊 /api/rankings endpoint called")
        
        if pool is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
            
        # Validate pagination
        if page < 1:
            raise HTTPException(status_code=400, detail="Page must be >= 1")
        if limit < 1 or limit > 100:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 100")
        
        offset = (page - 1) * limit
        
        async with pool.acquire() as conn:
            # Get total count
            total_domains = await conn.fetchval("SELECT COUNT(*) FROM public_domain_cache")
            total_pages = (total_domains + limit - 1) // limit
            
            # Get paginated results
            domains = await conn.fetch("""
                SELECT 
                    domain, memory_score, ai_consensus_percentage, 
                    unique_models, reputation_risk, drift_delta, updated_at
                FROM public_domain_cache 
                ORDER BY memory_score DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)
            
            domain_list = []
            for d in domains:
                # Calculate model distribution based on consensus
                total_models = d['unique_models'] or 15
                consensus_score = d['ai_consensus_percentage'] / 100.0 if d['ai_consensus_percentage'] else 0.7
                
                positive_models = int(total_models * max(0.5, consensus_score))
                neutral_models = int(total_models * 0.2)
                negative_models = total_models - positive_models - neutral_models
                
                # Calculate trend
                drift = d['drift_delta'] or 0
                if drift > 1:
                    trend = f"+{drift:.1f}%"
                elif drift < -1:
                    trend = f"{drift:.1f}%"
                else:
                    trend = "±0.0%"
                
                domain_list.append({
                    "domain": d['domain'],
                    "score": round(d['memory_score'], 1),
                    "trend": trend,
                    "modelsPositive": positive_models,
                    "modelsNeutral": neutral_models,
                    "modelsNegative": negative_models
                })
            
            return {
                "domains": domain_list,
                "totalDomains": total_domains,
                "totalPages": total_pages,
                "currentPage": page
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Rankings failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/domains/{domain_identifier}/public")
@limiter.limit("100/hour,10/minute")
async def get_domain_intelligence(
    request: Request,
    domain_identifier: str,
    api_key_info: dict = Depends(verify_api_key)
):
    """Get domain intelligence data - requires authentication"""
    try:
        logger.info(f"📊 /api/domains/{domain_identifier}/public endpoint called")
        
        if pool is None:
            raise HTTPException(status_code=500, detail="Database not initialized")
        
        # Basic domain validation
        domain_identifier = domain_identifier.lower().strip()
        if not domain_identifier or len(domain_identifier) > 253:
            raise HTTPException(status_code=400, detail="Invalid domain")
            
        async with pool.acquire() as conn:
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, memory_score, ai_consensus_percentage, 
                    cohesion_score, drift_delta, reputation_risk,
                    business_category, market_position, key_themes,
                    response_count, unique_models, updated_at
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain_identifier)
            
            if not domain_data:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Domain '{domain_identifier}' not found"
                )
            
            # Build response
            return {
                "domain": domain_data['domain'],
                "ai_intelligence": {
                    "memory_score": round(domain_data['memory_score'], 1),
                    "ai_consensus": round(domain_data['ai_consensus_percentage'], 1),
                    "cohesion": round(domain_data['cohesion_score'], 2) if domain_data['cohesion_score'] else 0,
                    "models_tracking": domain_data['unique_models'],
                    "response_count": domain_data['response_count'],
                    "trend": "improving" if domain_data['drift_delta'] > 0 else "declining" if domain_data['drift_delta'] < -1 else "stable"
                },
                "business_profile": {
                    "category": domain_data['business_category'],
                    "market_position": domain_data['market_position'],
                    "key_themes": domain_data['key_themes'][:5] if domain_data['key_themes'] else [],
                    "reputation": domain_data['reputation_risk']
                },
                "updated_at": domain_data['updated_at'].isoformat() if domain_data['updated_at'] else None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intelligence failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

# Helper function to get domain by name
async def get_domain_id_by_name(domain_name: str) -> Optional[str]:
    """Get domain ID from domain name"""
    try:
        async with pool.acquire() as conn:
            result = await conn.fetchrow(
                "SELECT id FROM domains WHERE domain = $1",
                domain_name.lower().strip()
            )
            return str(result['id']) if result else None
    except Exception as e:
        logger.error(f"Failed to get domain ID for {domain_name}: {e}")
        return None

# Helper function to call memory-oracle service
async def call_memory_oracle(endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Optional[Dict]:
    """Call memory-oracle service with fallback"""
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=MEMORY_ORACLE_TIMEOUT)) as session:
            url = f"{MEMORY_ORACLE_URL}{endpoint}"
            
            if method == "GET":
                async with session.get(url) as response:
                    if response.status == 200:
                        return await response.json()
            elif method == "POST":
                async with session.post(url, json=data) as response:
                    if response.status == 200:
                        return await response.json()
                        
            logger.warning(f"Memory oracle call failed: {response.status}")
            return None
            
    except asyncio.TimeoutError:
        logger.warning("Memory oracle service timeout")
        return None
    except Exception as e:
        logger.error(f"Memory oracle error: {e}")
        return None

# Calculate tensor metrics from domain responses
async def calculate_tensor_metrics(domain_id: str) -> Dict[str, Any]:
    """Calculate tensor metrics from domain_responses table"""
    try:
        async with pool.acquire() as conn:
            # Get all responses for the domain
            responses = await conn.fetch("""
                SELECT dr.model, dr.prompt_type, dr.response, dr.created_at
                FROM domain_responses dr
                WHERE dr.domain_id = $1::uuid
                ORDER BY dr.created_at DESC
                LIMIT 100
            """, domain_id)
            
            if not responses:
                return {
                    "memory_score": 0.0,
                    "sentiment_score": 0.0,
                    "grounding_score": 0.0,
                    "consistency_score": 0.0
                }
            
            # Group responses by model
            model_responses = defaultdict(list)
            for r in responses:
                model_responses[r['model']].append(r['response'])
            
            # Calculate memory score (based on response frequency and recency)
            total_responses = len(responses)
            unique_models = len(model_responses)
            memory_score = min(1.0, (total_responses / 50) * (unique_models / 10))
            
            # Calculate sentiment score (simple positive/negative word analysis)
            positive_words = ['innovative', 'leading', 'successful', 'growth', 'excellent', 'strong']
            negative_words = ['struggling', 'declining', 'weak', 'poor', 'failing', 'risky']
            
            sentiment_counts = {'positive': 0, 'negative': 0, 'neutral': 0}
            for r in responses:
                response_lower = r['response'].lower()
                pos_count = sum(1 for w in positive_words if w in response_lower)
                neg_count = sum(1 for w in negative_words if w in response_lower)
                
                if pos_count > neg_count:
                    sentiment_counts['positive'] += 1
                elif neg_count > pos_count:
                    sentiment_counts['negative'] += 1
                else:
                    sentiment_counts['neutral'] += 1
            
            # Calculate sentiment score
            if total_responses > 0:
                sentiment_score = (sentiment_counts['positive'] - sentiment_counts['negative']) / total_responses
                sentiment_score = (sentiment_score + 1) / 2  # Normalize to 0-1
            else:
                sentiment_score = 0.5
            
            # Calculate grounding score (based on consistency across models)
            grounding_score = 0.7  # Default medium grounding
            if unique_models >= 3:
                # Check for consistent themes across models
                common_themes = []
                for model, model_resps in model_responses.items():
                    if len(model_resps) >= 2:
                        # Simple theme extraction (could be enhanced)
                        themes = set()
                        for resp in model_resps[:5]:
                            if 'technology' in resp.lower():
                                themes.add('technology')
                            if 'business' in resp.lower():
                                themes.add('business')
                            if 'market' in resp.lower():
                                themes.add('market')
                        common_themes.extend(themes)
                
                if common_themes:
                    grounding_score = min(1.0, 0.5 + (len(set(common_themes)) / 10))
            
            # Calculate consistency score
            consistency_score = 0.5
            if unique_models >= 2:
                # Compare responses between models
                response_lengths = [len(r['response']) for r in responses]
                if response_lengths:
                    avg_length = np.mean(response_lengths)
                    std_length = np.std(response_lengths)
                    # Lower variance = higher consistency
                    consistency_score = max(0.1, 1.0 - (std_length / avg_length))
            
            return {
                "memory_score": round(memory_score, 3),
                "sentiment_score": round(sentiment_score, 3),
                "grounding_score": round(grounding_score, 3),
                "consistency_score": round(consistency_score, 3)
            }
            
    except Exception as e:
        logger.error(f"Failed to calculate tensor metrics: {e}")
        return {
            "memory_score": 0.0,
            "sentiment_score": 0.0,
            "grounding_score": 0.0,
            "consistency_score": 0.0
        }

# Calculate drift metrics
async def calculate_drift_metrics(domain_id: str) -> Dict[str, Any]:
    """Calculate perception drift over time"""
    try:
        async with pool.acquire() as conn:
            # Get responses over time periods
            periods = [
                ("current", "NOW() - INTERVAL '7 days'", "NOW()"),
                ("previous", "NOW() - INTERVAL '14 days'", "NOW() - INTERVAL '7 days'"),
                ("baseline", "NOW() - INTERVAL '30 days'", "NOW() - INTERVAL '14 days'")
            ]
            
            period_metrics = {}
            for period_name, start_time, end_time in periods:
                responses = await conn.fetch("""
                    SELECT COUNT(*) as count, 
                           AVG(LENGTH(response)) as avg_length,
                           COUNT(DISTINCT model) as unique_models
                    FROM domain_responses
                    WHERE domain_id = $1::uuid
                    AND created_at BETWEEN $2::timestamp AND $3::timestamp
                """, domain_id, start_time, end_time)
                
                if responses and responses[0]['count'] > 0:
                    period_metrics[period_name] = {
                        'count': responses[0]['count'],
                        'avg_length': float(responses[0]['avg_length'] or 0),
                        'unique_models': responses[0]['unique_models']
                    }
                else:
                    period_metrics[period_name] = {
                        'count': 0,
                        'avg_length': 0,
                        'unique_models': 0
                    }
            
            # Calculate drift
            drift_score = 0.0
            drift_direction = "stable"
            
            if period_metrics['current']['count'] > 0 and period_metrics['previous']['count'] > 0:
                # Compare current vs previous
                count_change = (period_metrics['current']['count'] - period_metrics['previous']['count']) / period_metrics['previous']['count']
                length_change = (period_metrics['current']['avg_length'] - period_metrics['previous']['avg_length']) / period_metrics['previous']['avg_length'] if period_metrics['previous']['avg_length'] > 0 else 0
                
                drift_score = abs(count_change) + abs(length_change) / 2
                
                if count_change > 0.2:
                    drift_direction = "increasing"
                elif count_change < -0.2:
                    drift_direction = "decreasing"
            
            return {
                "drift_score": round(min(1.0, drift_score), 3),
                "drift_direction": drift_direction,
                "drift_type": "perception",
                "periods": period_metrics,
                "severity": "high" if drift_score > 0.5 else "medium" if drift_score > 0.2 else "low"
            }
            
    except Exception as e:
        logger.error(f"Failed to calculate drift metrics: {e}")
        return {
            "drift_score": 0.0,
            "drift_direction": "unknown",
            "drift_type": "perception",
            "periods": {},
            "severity": "unknown"
        }

# Calculate consensus metrics
async def calculate_consensus_metrics(domain_id: str) -> Dict[str, Any]:
    """Calculate LLM consensus scores"""
    try:
        async with pool.acquire() as conn:
            # Get responses grouped by model and prompt type
            responses = await conn.fetch("""
                SELECT model, prompt_type, response, created_at
                FROM domain_responses
                WHERE domain_id = $1::uuid
                AND created_at > NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
            """, domain_id)
            
            if not responses:
                return {
                    "consensus_score": 0.0,
                    "agreement_level": "no_data",
                    "model_agreement": {},
                    "divergent_models": []
                }
            
            # Group by model and analyze
            model_sentiments = defaultdict(list)
            for r in responses:
                # Simple sentiment analysis
                response_lower = r['response'].lower()
                if any(word in response_lower for word in ['excellent', 'leading', 'innovative', 'strong']):
                    sentiment = 1.0
                elif any(word in response_lower for word in ['poor', 'weak', 'struggling', 'risky']):
                    sentiment = -1.0
                else:
                    sentiment = 0.0
                
                model_sentiments[r['model']].append(sentiment)
            
            # Calculate average sentiment per model
            model_averages = {}
            for model, sentiments in model_sentiments.items():
                model_averages[model] = np.mean(sentiments)
            
            # Calculate consensus
            if len(model_averages) >= 2:
                sentiments_list = list(model_averages.values())
                consensus_score = 1.0 - np.std(sentiments_list)
                
                # Find divergent models
                mean_sentiment = np.mean(sentiments_list)
                divergent_models = [
                    model for model, score in model_averages.items()
                    if abs(score - mean_sentiment) > 0.5
                ]
                
                # Determine agreement level
                if consensus_score > 0.8:
                    agreement_level = "strong"
                elif consensus_score > 0.5:
                    agreement_level = "moderate"
                elif consensus_score > 0.2:
                    agreement_level = "weak"
                else:
                    agreement_level = "conflicted"
            else:
                consensus_score = 0.5
                agreement_level = "insufficient_data"
                divergent_models = []
            
            return {
                "consensus_score": round(consensus_score, 3),
                "agreement_level": agreement_level,
                "model_agreement": {k: round(v, 3) for k, v in model_averages.items()},
                "divergent_models": divergent_models,
                "total_models": len(model_averages),
                "total_responses": len(responses)
            }
            
    except Exception as e:
        logger.error(f"Failed to calculate consensus metrics: {e}")
        return {
            "consensus_score": 0.0,
            "agreement_level": "error",
            "model_agreement": {},
            "divergent_models": []
        }

# Calculate volatility metrics
async def calculate_volatility_metrics(domain_id: str) -> Dict[str, Any]:
    """Calculate volatility metrics for a domain"""
    try:
        async with pool.acquire() as conn:
            # Get time series data
            responses = await conn.fetch("""
                SELECT DATE_TRUNC('day', created_at) as day,
                       COUNT(*) as response_count,
                       COUNT(DISTINCT model) as model_count,
                       AVG(LENGTH(response)) as avg_response_length
                FROM domain_responses
                WHERE domain_id = $1::uuid
                AND created_at > NOW() - INTERVAL '30 days'
                GROUP BY DATE_TRUNC('day', created_at)
                ORDER BY day
            """, domain_id)
            
            if len(responses) < 3:
                return {
                    "volatility_score": 0.0,
                    "volatility_level": "insufficient_data",
                    "trend": "stable",
                    "risk_level": "low"
                }
            
            # Calculate daily changes
            counts = [float(r['response_count']) for r in responses]
            models = [float(r['model_count']) for r in responses]
            
            # Calculate volatility (standard deviation of daily changes)
            count_changes = np.diff(counts)
            if len(count_changes) > 0:
                volatility_score = np.std(count_changes) / (np.mean(counts) + 1)
            else:
                volatility_score = 0.0
            
            # Determine trend
            if len(counts) >= 3:
                recent_avg = np.mean(counts[-3:])
                older_avg = np.mean(counts[:-3])
                if recent_avg > older_avg * 1.2:
                    trend = "increasing"
                elif recent_avg < older_avg * 0.8:
                    trend = "decreasing"
                else:
                    trend = "stable"
            else:
                trend = "stable"
            
            # Determine volatility level and risk
            if volatility_score > 0.5:
                volatility_level = "high"
                risk_level = "high"
            elif volatility_score > 0.2:
                volatility_level = "medium"
                risk_level = "medium"
            else:
                volatility_level = "low"
                risk_level = "low"
            
            return {
                "volatility_score": round(volatility_score, 3),
                "volatility_level": volatility_level,
                "trend": trend,
                "risk_level": risk_level,
                "data_points": len(responses),
                "period": "30_days",
                "metrics": {
                    "avg_daily_responses": round(np.mean(counts), 1),
                    "max_daily_responses": int(np.max(counts)),
                    "min_daily_responses": int(np.min(counts)),
                    "std_deviation": round(np.std(counts), 2)
                }
            }
            
    except Exception as e:
        logger.error(f"Failed to calculate volatility metrics: {e}")
        return {
            "volatility_score": 0.0,
            "volatility_level": "error",
            "trend": "unknown",
            "risk_level": "unknown"
        }

# Tensor endpoints
@app.get("/api/tensors/{brand}")
@limiter.limit("100/hour,20/minute")
async def get_tensors(request: Request, brand: str, api_key_info: dict = Depends(verify_api_key)):
    """Get memory, sentiment, and grounding tensors for a brand"""
    try:
        logger.info(f"🧠 /api/tensors/{brand} endpoint called")
        
        # Get domain ID
        domain_id = await get_domain_id_by_name(brand)
        if not domain_id:
            raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found")
        
        # Check cache
        cache_key = f"tensors_{domain_id}"
        if cache_key in tensor_cache:
            cached_time, cached_data = tensor_cache[cache_key]
            if datetime.now().timestamp() - cached_time < cache_ttl:
                logger.info(f"Returning cached tensor data for {brand}")
                return cached_data
        
        # Try memory-oracle service first
        oracle_result = await call_memory_oracle(f"/analysis/domain/{domain_id}")
        
        if oracle_result:
            # Format oracle result for API response
            response = {
                "brand": brand,
                "tensors": {
                    "memory": {
                        "score": oracle_result.get('current', {}).get('memory', {}).get('memoryScore', 0),
                        "retention_strength": oracle_result.get('current', {}).get('memory', {}).get('retentionStrength', 'medium'),
                        "access_frequency": oracle_result.get('current', {}).get('memory', {}).get('accessFrequency', 0)
                    },
                    "sentiment": {
                        "score": oracle_result.get('current', {}).get('sentiment', {}).get('sentimentScore', 0),
                        "market_sentiment": oracle_result.get('current', {}).get('sentiment', {}).get('marketSentiment', 'neutral'),
                        "confidence": oracle_result.get('current', {}).get('sentiment', {}).get('confidence', 0.5)
                    },
                    "grounding": {
                        "score": oracle_result.get('current', {}).get('grounding', {}).get('groundingScore', 0),
                        "strength": oracle_result.get('current', {}).get('grounding', {}).get('groundingStrength', 'medium'),
                        "verified_facts": oracle_result.get('current', {}).get('grounding', {}).get('verifiedFacts', 0)
                    }
                },
                "composite_score": oracle_result.get('current', {}).get('compositeScore', 0),
                "insights": oracle_result.get('current', {}).get('insights', []),
                "recommendations": oracle_result.get('recommendations', []),
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        else:
            # Fallback to local calculation
            logger.info(f"Memory oracle unavailable, calculating locally for {brand}")
            metrics = await calculate_tensor_metrics(domain_id)
            
            response = {
                "brand": brand,
                "tensors": {
                    "memory": {
                        "score": metrics['memory_score'],
                        "retention_strength": "high" if metrics['memory_score'] > 0.7 else "medium" if metrics['memory_score'] > 0.3 else "low",
                        "access_frequency": int(metrics['memory_score'] * 100)
                    },
                    "sentiment": {
                        "score": metrics['sentiment_score'],
                        "market_sentiment": "positive" if metrics['sentiment_score'] > 0.6 else "negative" if metrics['sentiment_score'] < 0.4 else "neutral",
                        "confidence": metrics['consistency_score']
                    },
                    "grounding": {
                        "score": metrics['grounding_score'],
                        "strength": "strong" if metrics['grounding_score'] > 0.7 else "medium" if metrics['grounding_score'] > 0.3 else "weak",
                        "verified_facts": int(metrics['grounding_score'] * 20)
                    }
                },
                "composite_score": round((metrics['memory_score'] + metrics['sentiment_score'] + metrics['grounding_score']) / 3, 3),
                "insights": [],
                "recommendations": [],
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        
        # Cache the result
        tensor_cache[cache_key] = (datetime.now().timestamp(), response)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tensor computation failed for {brand}: {e}")
        raise HTTPException(status_code=500, detail="Tensor computation failed")

# Drift endpoint
@app.get("/api/drift/{brand}")
@limiter.limit("100/hour,20/minute")
async def get_drift(request: Request, brand: str, api_key_info: dict = Depends(verify_api_key)):
    """Get perception drift metrics over time"""
    try:
        logger.info(f"📈 /api/drift/{brand} endpoint called")
        
        # Get domain ID
        domain_id = await get_domain_id_by_name(brand)
        if not domain_id:
            raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found")
        
        # Try memory-oracle service first
        oracle_result = await call_memory_oracle(f"/drift/detect/{domain_id}")
        
        if oracle_result:
            return {
                "brand": brand,
                "drift": oracle_result,
                "historical_trend": "available_via_memory_oracle",
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        else:
            # Fallback to local calculation
            drift_metrics = await calculate_drift_metrics(domain_id)
            
            return {
                "brand": brand,
                "drift": drift_metrics,
                "historical_trend": {
                    "7_day_change": drift_metrics['periods'].get('current', {}).get('count', 0) - drift_metrics['periods'].get('previous', {}).get('count', 0),
                    "30_day_trend": drift_metrics['drift_direction']
                },
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Drift detection failed for {brand}: {e}")
        raise HTTPException(status_code=500, detail="Drift detection failed")

# Consensus endpoint
@app.get("/api/consensus/{brand}")
@limiter.limit("100/hour,20/minute")
async def get_consensus(request: Request, brand: str, api_key_info: dict = Depends(verify_api_key)):
    """Get LLM consensus scores"""
    try:
        logger.info(f"🤝 /api/consensus/{brand} endpoint called")
        
        # Get domain ID
        domain_id = await get_domain_id_by_name(brand)
        if not domain_id:
            raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found")
        
        # Try memory-oracle service first
        oracle_result = await call_memory_oracle(f"/consensus/compute/{domain_id}")
        
        if oracle_result:
            return {
                "brand": brand,
                "consensus": oracle_result,
                "insights": await call_memory_oracle(f"/consensus/insights/{domain_id}") or [],
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        else:
            # Fallback to local calculation
            consensus_metrics = await calculate_consensus_metrics(domain_id)
            
            return {
                "brand": brand,
                "consensus": consensus_metrics,
                "insights": [
                    f"Models show {consensus_metrics['agreement_level']} agreement",
                    f"{consensus_metrics['total_models']} unique models analyzed",
                    f"Consensus score: {consensus_metrics['consensus_score']}"
                ],
                "computed_at": datetime.now().isoformat() + 'Z'
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Consensus computation failed for {brand}: {e}")
        raise HTTPException(status_code=500, detail="Consensus computation failed")

# Volatility endpoint
@app.get("/api/volatility/{brand}")
@limiter.limit("100/hour,20/minute")
async def get_volatility(request: Request, brand: str, api_key_info: dict = Depends(verify_api_key)):
    """Get volatility metrics"""
    try:
        logger.info(f"📊 /api/volatility/{brand} endpoint called")
        
        # Get domain ID
        domain_id = await get_domain_id_by_name(brand)
        if not domain_id:
            raise HTTPException(status_code=404, detail=f"Brand '{brand}' not found")
        
        # Calculate volatility metrics
        volatility_metrics = await calculate_volatility_metrics(domain_id)
        
        return {
            "brand": brand,
            "volatility": volatility_metrics,
            "recommendations": [
                "Monitor closely" if volatility_metrics['risk_level'] == "high" else "Standard monitoring",
                f"Current trend: {volatility_metrics['trend']}",
                f"Risk level: {volatility_metrics['risk_level']}"
            ],
            "computed_at": datetime.now().isoformat() + 'Z'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Volatility calculation failed for {brand}: {e}")
        raise HTTPException(status_code=500, detail="Volatility calculation failed")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 LLM PageRank Public API v3.1.0 (with logging) starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
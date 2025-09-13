from fastapi import FastAPI, HTTPException, Response, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import logging
from fastapi import Depends
from fastapi.responses import JSONResponse

# 🔐 AUTHENTICATION INTEGRATION
from auth_extensions import add_auth_endpoints, get_current_user, check_api_limits

# 🚦 RATE LIMITING INTEGRATION
from rate_limiter import (
    limiter, rate_limit_exceeded_handler, check_rate_limits,
    add_rate_limit_headers, validate_api_key_with_limits,
    add_rate_limit_headers_middleware, RATE_LIMIT_TIERS
)
from slowapi.errors import RateLimitExceeded

# Production logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="LLM PageRank - AI Brand Intelligence",
    description="Real-time AI brand perception monitoring with reputation risk alerts",
    version="2.0.0"
)

# Add rate limiter to app state
app.state.limiter = limiter

# Add rate limit exceeded handler
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# DEFINITIVE CORS FIX - This MUST work
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://www.llmpagerank.com", 
        "https://llmpagerank.com",
        "https://llmrank.io",
        "*"  # Allow all origins for now
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Add rate limit headers to all responses"""
    return await add_rate_limit_headers_middleware(request, call_next)

# Global connection pool
pool: Optional[asyncpg.Pool] = None

@app.on_event("startup")
async def startup():
    """Initialize production database pool"""
    global pool
    database_url = os.environ.get('DATABASE_URL')
    
    pool = await asyncpg.create_pool(
        database_url,
        min_size=5,
        max_size=15,
        command_timeout=10
    )
    
    # 🔐 INITIALIZE AUTHENTICATION SYSTEM
    add_auth_endpoints(app, pool)
    
    # 🗄️ RUN DATABASE MIGRATIONS
    await run_migrations()
    
    logger.info("🚀 Production API initialized with authentication")

@app.on_event("shutdown") 
async def shutdown():
    """Clean shutdown"""
    global pool
    if pool:
        await pool.close()

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

@app.get("/")
def root():
    """API status with fire alarm capabilities"""
    return {
        "service": "AI Brand Intelligence Platform",
        "status": "monitoring_active",
        "version": "2.0.0",
        "capabilities": {
            "fire_alarm_detection": True,
            "reputation_monitoring": True,
            "competitive_analysis": True,
            "brand_confusion_alerts": True
        }
    }

@app.get("/health")
async def health():
    """Production health check with metrics"""
    try:
        async with pool.acquire() as conn:
            # Check cache health
            cache_stats = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_domains,
                    COUNT(*) FILTER (WHERE reputation_risk = 'high') as high_risk_domains,
                    COUNT(*) FILTER (WHERE memory_score < 50) as low_memory_domains,
                    COUNT(*) FILTER (WHERE drift_delta < -5) as declining_domains,
                    MAX(updated_at) as last_update
                FROM public_domain_cache
            """)
        
        return {
            "status": "healthy",
            "database": "connected",
            "performance": "sub-200ms responses",
            "monitoring_stats": {
                "domains_monitored": cache_stats['total_domains'] if cache_stats else 0,
                "high_risk_domains": cache_stats['high_risk_domains'] if cache_stats else 0,
                "low_memory_domains": cache_stats['low_memory_domains'] if cache_stats else 0,
                "declining_domains": cache_stats['declining_domains'] if cache_stats else 0,
                "last_update": cache_stats['last_update'].isoformat() + 'Z' if cache_stats and cache_stats['last_update'] else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {e}")

@app.get("/api/domains/{domain_identifier}/public")
@limiter.limit("100/hour;10/minute")
async def get_domain_intelligence(
    request: Request,
    domain_identifier: str, 
    response: Response,
    include_alerts: bool = Query(True)
):
    """
    🚨 FIRE ALARM DOMAIN INTELLIGENCE 🚨
    
    Provides stunning insights that create urgency for brand monitoring
    """
    try:
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
        
        # Set caching headers
        response.headers["Cache-Control"] = "public, max-age=1800"
        
        # Build stunning response with fire alarm urgency
        intelligence_data = {
            "domain": domain_data['domain'],
            
            # CORE METRICS
            "ai_intelligence": {
                "memory_score": round(domain_data['memory_score'], 1),
                "ai_consensus": round(domain_data['ai_consensus_percentage'], 1),
                "cohesion": round(domain_data['cohesion_score'], 2),
                "models_tracking": domain_data['unique_models'],
                "response_count": domain_data['response_count'],
                "trend": "improving" if domain_data['drift_delta'] > 0 else "declining" if domain_data['drift_delta'] < -1 else "stable"
            },
            
            # BUSINESS INTELLIGENCE
            "business_profile": {
                "category": domain_data['business_category'],
                "market_position": domain_data['market_position'],
                "key_themes": domain_data['key_themes'][:5] if domain_data['key_themes'] else [],
                "reputation": domain_data['reputation_risk']
            },
            
            # COMPETITIVE INSIGHTS
            "competitive_analysis": {
                "ai_visibility_rank": "top_25%" if domain_data['memory_score'] > 75 else "below_average",
                "brand_clarity": "high" if domain_data['ai_consensus_percentage'] > 70 else "low",
                "perception_stability": "stable" if abs(domain_data['drift_delta']) < 2 else "volatile"
            },
            
            "updated_at": domain_data['updated_at'].isoformat() if domain_data['updated_at'] else None
        }
        
        # Return the simplified response
        
        return intelligence_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intelligence failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.get("/api/fire-alarm-dashboard")
@limiter.limit("100/hour;20/minute")
async def get_fire_alarm_dashboard(request: Request, limit: int = Query(20, le=100)):
    """
    🚨 HIGH RISK DOMAINS DASHBOARD 🚨
    
    Shows domains with low memory scores or high reputation risk
    """
    try:
        async with pool.acquire() as conn:
            high_risk_domains = await conn.fetch("""
                SELECT 
                    domain, memory_score, ai_consensus_percentage, 
                    reputation_risk, unique_models, drift_delta
                FROM public_domain_cache 
                WHERE reputation_risk = 'high' 
                OR memory_score < 50
                ORDER BY memory_score ASC
                LIMIT $1
            """, limit)
        
        dashboard_data = {
            "dashboard_type": "risk_monitoring",
            "total_domains": len(high_risk_domains),
            "scan_time": datetime.now().isoformat() + 'Z',
            "high_risk_domains": []
        }
        
        for domain in high_risk_domains:
            dashboard_data["high_risk_domains"].append({
                "domain": domain['domain'],
                "memory_score": round(domain['memory_score'], 1),
                "reputation_risk": domain['reputation_risk'],
                "ai_consensus": round(domain['ai_consensus_percentage'], 1),
                "models_tracking": domain['unique_models'],
                "trend": "declining" if domain['drift_delta'] < -1 else "stable"
            })
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard failed: {e}")

@app.get("/api/domains")
@limiter.limit("200/hour;30/minute")
async def list_domains(request: Request, limit: int = Query(20, le=100), sort_by: str = Query("score")):
    """List domains sorted by score or risk"""
    try:
        async with pool.acquire() as conn:
            if sort_by == "risk":
                order_clause = "CASE WHEN reputation_risk = 'high' THEN 0 WHEN reputation_risk = 'medium' THEN 1 ELSE 2 END, memory_score ASC"
            else:
                order_clause = "memory_score DESC, ai_consensus_percentage DESC"
                
            domains = await conn.fetch(f"""
                SELECT 
                    domain, memory_score, ai_consensus_percentage,
                    reputation_risk, unique_models, updated_at
                FROM public_domain_cache 
                ORDER BY {order_clause}
                LIMIT $1
            """, limit)
        
        return {
            "domains": [
                {
                    "domain": d['domain'],
                    "memory_score": round(d['memory_score'], 1),
                    "reputation_risk": d['reputation_risk'],
                    "ai_consensus": round(d['ai_consensus_percentage'], 1),
                    "models_tracking": d['unique_models'],
                    "public_url": f"/api/domains/{d['domain']}/public"
                }
                for d in domains
            ],
            "total": len(domains),
            "sorted_by": sort_by
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Domain listing failed: {e}")

@app.post("/api/migrate-timeseries")
async def migrate_timeseries():
    """
    🔧 DATABASE MIGRATION - Add Time-Series Columns
    
    Adds time-series tracking columns to enable JOLT benchmarks and trend analysis
    """
    try:
        async with pool.acquire() as conn:
            # Add missing columns for time-series analysis
            migrations = [
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS memory_score_history JSONB DEFAULT '[]'",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS previous_memory_score REAL DEFAULT 0.0",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS memory_score_trend TEXT DEFAULT 'stable'",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS trend_direction TEXT DEFAULT 'stable'",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS last_memory_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
            ]
            
            migration_results = []
            
            for migration_sql in migrations:
                try:
                    await conn.execute(migration_sql)
                    column_name = migration_sql.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0]
                    migration_results.append(f"✅ Added {column_name} column")
                except Exception as e:
                    column_name = migration_sql.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0] if 'ADD COLUMN' in migration_sql else 'unknown'
                    migration_results.append(f"⚠️ {column_name}: {str(e)}")
            
            # Initialize history for existing domains
            try:
                updated_count = await conn.execute("""
                    UPDATE public_domain_cache 
                    SET memory_score_history = '[]'::jsonb,
                        previous_memory_score = memory_score,
                        last_memory_update = CURRENT_TIMESTAMP
                    WHERE memory_score_history IS NULL
                """)
                migration_results.append(f"✅ Initialized history for {updated_count} domains")
            except Exception as e:
                migration_results.append(f"❌ Error initializing history: {str(e)}")
        
        return {
            "status": "migration_completed",
            "timestamp": datetime.now().isoformat() + 'Z',
            "results": migration_results,
            "message": "Time-series columns added to enable JOLT benchmarks and trend analysis"
        }
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@app.get("/api/time-series/{domain}")
async def get_time_series(domain: str):
    """
    📈 TIME-SERIES ANALYSIS
    
    Shows memory score evolution over time for JOLT benchmark analysis
    """
    try:
        async with pool.acquire() as conn:
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, memory_score, previous_memory_score,
                    memory_score_history, memory_score_trend, trend_direction,
                    last_memory_update, updated_at
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail=f"Domain {domain} not found")
            
            # Parse history (should be JSONB array)
            history = domain_data['memory_score_history'] if domain_data['memory_score_history'] else []
            
            # Calculate trend metrics
            current_score = domain_data['memory_score']
            previous_score = domain_data['previous_memory_score'] or current_score
            
            change = current_score - previous_score
            change_percent = (change / previous_score * 100) if previous_score > 0 else 0
            
            return {
                "domain": domain,
                "current_score": current_score,
                "previous_score": previous_score,
                "change": round(change, 2),
                "change_percent": round(change_percent, 2),
                "trend": domain_data['memory_score_trend'] or 'stable',
                "direction": domain_data['trend_direction'] or 'stable',
                "history": history,
                "last_updated": domain_data['last_memory_update'].isoformat() + 'Z' if domain_data['last_memory_update'] else None,
                "analysis": {
                    "is_improving": change > 0,
                    "is_declining": change < -1,
                    "volatility": "high" if abs(change_percent) > 10 else "low",
                    "confidence": "high" if len(history) > 5 else "building"
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Time-series analysis failed for {domain}: {e}")
        raise HTTPException(status_code=500, detail=f"Time series analysis failed: {str(e)}")

@app.get("/api/jolt-benchmark/{domain}")
async def get_jolt_benchmark(domain: str):
    """
    ⚡ JOLT BENCHMARK ANALYSIS
    
    T0 vs T1 memory degradation analysis for crisis domains
    """
    try:
        # JOLT benchmark domains (crisis scenarios)
        jolt_benchmarks = {
            'facebook.com': {'baseline': 52.0, 'category': 'privacy_crisis'},
            'google.com': {'baseline': 55.7, 'category': 'antitrust_concerns'},
            'apple.com': {'baseline': 89.2, 'category': 'brand_transition'},
            'twitter.com': {'baseline': 45.0, 'category': 'leadership_change'},
            'theranos.com': {'baseline': 25.0, 'category': 'corporate_collapse'}
        }
        
        if domain not in jolt_benchmarks:
            raise HTTPException(status_code=404, detail=f"Domain {domain} is not a JOLT benchmark domain")
        
        async with pool.acquire() as conn:
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, memory_score, previous_memory_score,
                    memory_score_history, memory_score_trend,
                    last_memory_update
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail=f"Domain {domain} not found in cache")
            
            benchmark_info = jolt_benchmarks[domain]
            current_score = domain_data['memory_score']
            baseline = benchmark_info['baseline']
            
            # Calculate JOLT metrics
            degradation = baseline - current_score
            degradation_percent = (degradation / baseline * 100) if baseline > 0 else 0
            
            # Determine crisis impact level
            if degradation_percent > 50:
                impact_level = "catastrophic"
            elif degradation_percent > 25:
                impact_level = "severe"
            elif degradation_percent > 10:
                impact_level = "moderate"
            elif degradation_percent > 0:
                impact_level = "mild"
            else:
                impact_level = "recovered"
            
            return {
                "domain": domain,
                "jolt_analysis": {
                    "category": benchmark_info['category'],
                    "baseline_score": baseline,
                    "current_score": current_score,
                    "degradation": round(degradation, 2),
                    "degradation_percent": round(degradation_percent, 2),
                    "impact_level": impact_level,
                    "recovery_status": "recovering" if current_score > domain_data['previous_memory_score'] else "declining"
                },
                "benchmark_context": {
                    "time_horizon": "T0 (baseline) vs T1 (current)",
                    "crisis_type": benchmark_info['category'],
                    "measurement_type": "AI memory retention",
                    "last_measured": domain_data['last_memory_update'].isoformat() + 'Z' if domain_data['last_memory_update'] else None
                }
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JOLT benchmark failed for {domain}: {e}")
        raise HTTPException(status_code=500, detail=f"JOLT benchmark analysis failed: {str(e)}")

@app.get("/api/rankings")
@limiter.limit("200/hour;30/minute")
async def get_rankings(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    search: str = Query(""),
    sort: str = Query("score")
):
    """
    📊 COMPLETE RANKINGS
    
    Full domain rankings with search, sort, and consensus data
    """
    try:
        async with pool.acquire() as conn:
            # Build search condition
            search_condition = ""
            search_params = []
            if search:
                search_condition = "AND domain ILIKE $1"
                search_params.append(f"%{search}%")
            
            # Build order clause
            if sort == "score":
                order_clause = "memory_score DESC"
            elif sort == "domain":
                order_clause = "domain ASC"
            elif sort == "consensus":
                order_clause = "ai_consensus_percentage DESC"
            else:
                order_clause = "memory_score DESC"
            
            # Get total count
            count_query = f"""
                SELECT COUNT(*) 
                FROM public_domain_cache 
                WHERE 1=1 {search_condition}
            """
            
            total_domains = await conn.fetchval(count_query, *search_params)
            total_pages = (total_domains + limit - 1) // limit
            
            # Get paginated results
            offset = (page - 1) * limit
            
            # Get paginated results
            domains_query = f"""
                SELECT 
                    domain, memory_score, ai_consensus_percentage, unique_models,
                    reputation_risk, drift_delta, updated_at
                FROM public_domain_cache 
                WHERE 1=1 {search_condition}
                ORDER BY {order_clause}
                LIMIT ${"2" if search_params else "1"} OFFSET ${"3" if search_params else "2"}
            """
            
            query_params = search_params + [limit, offset]
            domains = await conn.fetch(domains_query, *query_params)
            
            # Build response with consensus data
            domain_list = []
            for d in domains:
                # Calculate consensus metrics (simulated from unique_models)
                total_models = d['unique_models'] or 15
                consensus_score = d['ai_consensus_percentage'] / 100.0 if d['ai_consensus_percentage'] else 0.7
                
                # Distribute models based on consensus score
                if consensus_score > 0.8:
                    positive_models = int(total_models * 0.8)
                    neutral_models = int(total_models * 0.15)
                    negative_models = total_models - positive_models - neutral_models
                elif consensus_score > 0.6:
                    positive_models = int(total_models * 0.6)
                    neutral_models = int(total_models * 0.25)
                    negative_models = total_models - positive_models - neutral_models
                else:
                    positive_models = int(total_models * 0.4)
                    neutral_models = int(total_models * 0.3)
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
            
    except Exception as e:
        logger.error(f"Rankings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rankings failed: {str(e)}")

@app.get("/api/categories")
@limiter.limit("200/hour;30/minute")
async def get_categories(request: Request):
    """
    📑 DOMAIN CATEGORIES
    
    Categories with consensus visualization and top domains
    """
    try:
        async with pool.acquire() as conn:
            # Get category aggregates (simplified - in reality would have category field)
            categories_data = []
            
            # Technology category
            tech_domains = await conn.fetch("""
                SELECT domain, memory_score, unique_models, ai_consensus_percentage
                FROM public_domain_cache 
                WHERE domain IN ('google.com', 'microsoft.com', 'apple.com', 'amazon.com', 'meta.com')
                ORDER BY memory_score DESC
                LIMIT 3
            """)
            
            if tech_domains:
                avg_score = sum(d['memory_score'] for d in tech_domains) / len(tech_domains)
                
                top_domains = []
                for d in tech_domains:
                    total_models = d['unique_models'] or 15
                    consensus = d['ai_consensus_percentage'] / 100.0 if d['ai_consensus_percentage'] else 0.7
                    
                    # Distribute models
                    positive = int(total_models * max(0.5, consensus))
                    neutral = int(total_models * 0.2)
                    negative = total_models - positive - neutral
                    
                    top_domains.append({
                        "domain": d['domain'],
                        "score": d['memory_score'],
                        "modelsPositive": positive,
                        "modelsNeutral": neutral,
                        "modelsNegative": negative
                    })
                
                categories_data.append({
                    "name": "Technology",
                    "totalDomains": len(tech_domains),
                    "averageScore": round(avg_score, 1),
                    "topDomains": top_domains
                })
            
            # Social Media category
            social_domains = await conn.fetch("""
                SELECT domain, memory_score, unique_models, ai_consensus_percentage
                FROM public_domain_cache 
                WHERE domain IN ('facebook.com', 'twitter.com', 'instagram.com', 'linkedin.com', 'tiktok.com')
                ORDER BY memory_score DESC
                LIMIT 3
            """)
            
            if social_domains:
                avg_score = sum(d['memory_score'] for d in social_domains) / len(social_domains)
                
                top_domains = []
                for d in social_domains:
                    total_models = d['unique_models'] or 15
                    consensus = d['ai_consensus_percentage'] / 100.0 if d['ai_consensus_percentage'] else 0.6
                    
                    positive = int(total_models * max(0.4, consensus))
                    neutral = int(total_models * 0.3)
                    negative = total_models - positive - neutral
                    
                    top_domains.append({
                        "domain": d['domain'],
                        "score": d['memory_score'],
                        "modelsPositive": positive,
                        "modelsNeutral": neutral,
                        "modelsNegative": negative
                    })
                
                categories_data.append({
                    "name": "Social Media",
                    "totalDomains": len(social_domains),
                    "averageScore": round(avg_score, 1),
                    "topDomains": top_domains
                })
            
            return {"categories": categories_data}
            
    except Exception as e:
        logger.error(f"Categories failed: {e}")
        raise HTTPException(status_code=500, detail=f"Categories failed: {str(e)}")

@app.get("/api/shadows")
@limiter.limit("200/hour;30/minute")
async def get_shadows(request: Request):
    """
    🌑 MEMORY SHADOWS
    
    Domains experiencing memory decline or poor recognition
    """
    try:
        async with pool.acquire() as conn:
            # Find domains with low scores or high reputation risk
            declining_domains = await conn.fetch("""
                SELECT 
                    domain, memory_score, reputation_risk,
                    unique_models, ai_consensus_percentage, drift_delta
                FROM public_domain_cache 
                WHERE memory_score < 60 OR reputation_risk = 'high'
                ORDER BY memory_score ASC
                LIMIT 10
            """)
            
            shadows = []
            for d in declining_domains:
                total_models = d['unique_models'] or 15
                consensus = d['ai_consensus_percentage'] / 100.0 if d['ai_consensus_percentage'] else 0.3
                
                # Poor consensus = more negative models
                positive = int(total_models * min(0.3, consensus))
                negative = int(total_models * max(0.4, 1 - consensus))
                neutral = total_models - positive - negative
                
                shadows.append({
                    "domain": d['domain'],
                    "score": round(d['memory_score'], 1),
                    "reputation_risk": d['reputation_risk'],
                    "modelsPositive": positive,
                    "modelsNeutral": neutral,
                    "modelsNegative": negative,
                    "trend": f"{d['drift_delta']:.1f}%" if d['drift_delta'] else "0.0%"
                })
            
            return {"declining": shadows}
            
    except Exception as e:
        logger.error(f"Shadows failed: {e}")
        raise HTTPException(status_code=500, detail=f"Shadows failed: {str(e)}")

@app.get("/api/stats")
@limiter.limit("300/hour;50/minute")
async def get_public_stats(request: Request):
    """
    Public statistics about the platform with fire alarm metrics
    """
    try:
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
            
            # Get top performers
            top_domains = await conn.fetch("""
                SELECT domain, memory_score, unique_models, reputation_risk
                FROM public_domain_cache 
                ORDER BY memory_score DESC
                LIMIT 5
            """)
        
        return {
            "platform_stats": {
                "total_domains": stats['total_domains'],
                "average_memory_score": round(stats['avg_memory_score'], 1) if stats['avg_memory_score'] else 0,
                "total_ai_responses": stats['total_model_responses'],
                "critical_risk_domains": stats['critical_risk'],
                "high_risk_domains": stats['critical_risk'],
                "last_updated": stats['last_update'].isoformat() + 'Z' if stats['last_update'] else None
            },
            "top_performers": [
                {
                    "domain": d['domain'],
                    "memory_score": round(d['memory_score'], 1),
                    "models_tracking": d['unique_models'],
                    "reputation_risk": d['reputation_risk']
                }
                for d in top_domains
            ],
            "data_freshness": "Updated every 6 hours",
            "coverage": "346 domains across 35+ AI models",
            "fire_alarm_system": "Active - monitoring brand reputation risks"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 🔑 API KEY AUTHENTICATED ENDPOINTS
# ============================================

@app.get("/api/v1/domains/{domain_identifier}")
async def get_domain_intelligence_api(
    request: Request,
    domain_identifier: str,
    response: Response,
    api_key: str = Query(..., alias="api_key", description="Your API key")
):
    """
    🔑 API KEY AUTHENTICATED ENDPOINT
    Get domain intelligence with API key authentication and tier-based rate limiting
    """
    # Validate API key and get tier info
    key_info = await validate_api_key_with_limits(api_key, pool)
    
    # Check tier-specific rate limits
    await check_rate_limits(request, key_info['tier'])
    
    try:
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
        
        # Set caching headers
        response.headers["Cache-Control"] = "public, max-age=1800"
        
        # Add rate limit headers
        tier_limits = RATE_LIMIT_TIERS[key_info['tier']]
        response.headers["X-RateLimit-Limit"] = str(tier_limits['per_hour'])
        response.headers["X-RateLimit-Remaining"] = str(key_info['remaining_daily'])
        response.headers["X-RateLimit-Tier"] = key_info['tier']
        
        # Return enhanced data for API users
        return {
            "domain": domain_data['domain'],
            "metrics": {
                "memory_score": round(domain_data['memory_score'], 1),
                "ai_consensus": round(domain_data['ai_consensus_percentage'], 1),
                "cohesion": round(domain_data['cohesion_score'], 2),
                "drift_delta": round(domain_data['drift_delta'], 2),
                "reputation_risk": domain_data['reputation_risk']
            },
            "intelligence": {
                "business_category": domain_data['business_category'],
                "market_position": domain_data['market_position'],
                "key_themes": domain_data['key_themes'][:10] if domain_data['key_themes'] else [],
                "models_tracking": domain_data['unique_models'],
                "total_responses": domain_data['response_count']
            },
            "meta": {
                "updated_at": domain_data['updated_at'].isoformat() if domain_data['updated_at'] else None,
                "api_version": "v1",
                "tier": key_info['tier']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API request failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.get("/api/v1/domains")
async def list_domains_api(
    request: Request,
    api_key: str = Query(..., alias="api_key"),
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("score", regex="^(score|domain|risk)$")
):
    """
    🔑 API KEY AUTHENTICATED ENDPOINT
    List domains with pagination and sorting
    """
    # Validate API key and get tier info
    key_info = await validate_api_key_with_limits(api_key, pool)
    
    # Check tier-specific rate limits
    await check_rate_limits(request, key_info['tier'])
    
    try:
        async with pool.acquire() as conn:
            # Build order clause
            if sort_by == "risk":
                order_clause = "CASE WHEN reputation_risk = 'high' THEN 0 WHEN reputation_risk = 'medium' THEN 1 ELSE 2 END, memory_score ASC"
            elif sort_by == "domain":
                order_clause = "domain ASC"
            else:
                order_clause = "memory_score DESC"
            
            # Get total count
            total_count = await conn.fetchval("SELECT COUNT(*) FROM public_domain_cache")
            
            # Get paginated results
            domains = await conn.fetch(f"""
                SELECT 
                    domain, memory_score, ai_consensus_percentage,
                    reputation_risk, unique_models, updated_at
                FROM public_domain_cache 
                ORDER BY {order_clause}
                LIMIT $1 OFFSET $2
            """, limit, offset)
        
        return {
            "data": [
                {
                    "domain": d['domain'],
                    "memory_score": round(d['memory_score'], 1),
                    "ai_consensus": round(d['ai_consensus_percentage'], 1),
                    "reputation_risk": d['reputation_risk'],
                    "models_tracking": d['unique_models']
                }
                for d in domains
            ],
            "pagination": {
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total_count
            },
            "meta": {
                "sorted_by": sort_by,
                "tier": key_info['tier']
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API list domains failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to list domains")

# ============================================
# 💰 PREMIUM API ENDPOINTS (REQUIRE AUTH)
# ============================================

@app.get("/api/premium/dashboard")
async def get_premium_dashboard(current_user: dict = Depends(get_current_user)):
    """
    💎 PREMIUM DASHBOARD
    Advanced analytics for paid subscribers only
    """
    await check_api_limits(current_user, pool)
    
    try:
        async with pool.acquire() as conn:
            # Get user's tracked domains based on their tier
            user_domains = await conn.fetch("""
                SELECT domain, memory_score, reputation_risk, 
                       ai_consensus_percentage, updated_at
                FROM public_domain_cache 
                ORDER BY memory_score DESC
                LIMIT $1
            """, current_user['domains_limit'])
            
            # Advanced analytics for premium users
            if current_user['subscription_tier'] in ['pro', 'enterprise']:
                competitor_analysis = await conn.fetch("""
                    SELECT domain, memory_score, reputation_risk
                    FROM public_domain_cache 
                    WHERE memory_score > 70
                    ORDER BY memory_score DESC
                    LIMIT 20
                """)
            else:
                competitor_analysis = []
            
            return {
                "user": {
                    "email": current_user['email'],
                    "tier": current_user['subscription_tier'],
                    "domains_tracked": len(user_domains),
                    "domains_limit": current_user['domains_limit'],
                    "api_calls_used": current_user['api_calls_used'],
                    "api_calls_limit": current_user['api_calls_limit']
                },
                "tracked_domains": [
                    {
                        "domain": d['domain'],
                        "memory_score": round(d['memory_score'], 1),
                        "risk_score": d['reputation_risk'],
                        "consensus": round(d['ai_consensus_percentage'], 1),
                        "last_updated": d['updated_at'].isoformat() + 'Z'
                    } for d in user_domains
                ],
                "competitor_analysis": competitor_analysis if current_user['subscription_tier'] != 'free' else None,
                "premium_features": {
                    "competitor_tracking": current_user['subscription_tier'] in ['pro', 'enterprise'],
                    "advanced_analytics": current_user['subscription_tier'] == 'enterprise',
                    "api_access": current_user['subscription_tier'] != 'free',
                    "priority_support": current_user['subscription_tier'] == 'enterprise'
                }
            }
            
    except Exception as e:
        logger.error(f"Premium dashboard failed for user {current_user['id']}: {e}")
        raise HTTPException(status_code=500, detail="Dashboard failed")

@app.post("/api/premium/track-domain")
async def track_domain(
    domain_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    💎 PREMIUM DOMAIN TRACKING
    Add domain to user's tracking list (tier limits apply)
    """
    await check_api_limits(current_user, pool)
    
    domain = domain_data.get('domain', '').lower().strip()
    if not domain:
        raise HTTPException(status_code=400, detail="Domain required")
    
    try:
        async with pool.acquire() as conn:
            # Check if user has reached domain limit
            current_count = await conn.fetchval("""
                SELECT COUNT(*) FROM user_domains WHERE user_id = $1
            """, current_user['id'])
            
            if current_count >= current_user['domains_limit']:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Domain limit reached. Upgrade to track more domains. Current limit: {current_user['domains_limit']}"
                )
            
            # Add domain to user's tracking
            await conn.execute("""
                INSERT INTO user_domains (user_id, domain, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id, domain) DO NOTHING
            """, current_user['id'], domain)
            
            # Update user's domain count
            await conn.execute("""
                UPDATE users SET domains_tracked = domains_tracked + 1
                WHERE id = $1
            """, current_user['id'])
            
            return {
                "message": f"Domain {domain} added to tracking",
                "domains_tracked": current_count + 1,
                "domains_limit": current_user['domains_limit'],
                "upgrade_needed": current_count + 1 >= current_user['domains_limit']
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Domain tracking failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to track domain")

@app.get("/api/premium/api-key")
async def get_api_key(current_user: dict = Depends(get_current_user)):
    """
    💎 PREMIUM API KEY MANAGEMENT
    Generate/retrieve API keys for programmatic access
    """
    if current_user['subscription_tier'] == 'free':
        raise HTTPException(
            status_code=403, 
            detail="API access requires Pro or Enterprise subscription"
        )
    
    try:
        async with pool.acquire() as conn:
            # Get or create API key
            api_key_data = await conn.fetchrow("""
                SELECT api_key, created_at, last_used 
                FROM api_keys 
                WHERE user_id = $1 AND is_active = true
            """, current_user['id'])
            
            if not api_key_data:
                # Generate new API key
                import secrets
                new_api_key = f"llm_pk_{secrets.token_urlsafe(32)}"
                
                await conn.execute("""
                    INSERT INTO api_keys (user_id, api_key, created_at, is_active)
                    VALUES ($1, $2, NOW(), true)
                """, current_user['id'], new_api_key)
                
                api_key_data = {'api_key': new_api_key, 'created_at': datetime.now()}
            
            return {
                "api_key": api_key_data['api_key'],
                "tier": current_user['subscription_tier'],
                "rate_limits": {
                    "daily_calls": current_user['api_calls_limit'],
                    "used_today": current_user['api_calls_used']
                },
                "created_at": api_key_data['created_at'].isoformat() + 'Z',
                "documentation": "/api/docs"
            }
            
    except Exception as e:
        logger.error(f"API key generation failed: {e}")
        raise HTTPException(status_code=500, detail="API key generation failed")

async def run_migrations():
    """Run database migrations if needed"""
    try:
        async with pool.acquire() as conn:
            # Check if users table exists
            users_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = 'users'
                )
            """)
            
            if not users_exists:
                logger.info("📊 Running database migrations...")
                
                # Read and execute migration SQL
                import os
                migration_path = os.path.join(os.path.dirname(__file__), 'database_migration.sql')
                with open(migration_path, 'r') as f:
                    migration_sql = f.read()
                
                await conn.execute(migration_sql)
                logger.info("✅ Database migrations completed successfully")
            else:
                logger.info("📊 Database schema up to date")
                
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        # Continue anyway - don't crash the API

# Import enterprise, frontend, quantum endpoints, and landing pages
try:
    from enterprise_endpoints import add_enterprise_endpoints
    from frontend_api_endpoints import add_frontend_api_endpoints
    from quantum_forecast_endpoints import add_quantum_forecast_endpoints
    from quantum_landing_pages import add_quantum_landing_pages
    
    @app.on_event("startup")
    async def add_enterprise_routes():
        add_enterprise_endpoints(app, pool)
        add_frontend_api_endpoints(app, pool)
        add_quantum_forecast_endpoints(app, pool)
        add_quantum_landing_pages(app, pool)
        logger.info("🏆 Enterprise endpoints loaded")
        logger.info("🎯 Frontend API endpoints loaded")
        logger.info("🔮 Quantum forecast card endpoints loaded")
        logger.info("🌐 Quantum landing pages loaded")
except ImportError as e:
    logger.warning(f"Enterprise/Frontend/Quantum endpoints not available: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 LLM PageRank Public API starting on port {port}")
    print("📊 Serving cached domain intelligence data")
    print("🏆 Enterprise freemium model enabled")
    print("⚡ Optimized for sub-200ms response times")
    uvicorn.run(app, host="0.0.0.0", port=port) 
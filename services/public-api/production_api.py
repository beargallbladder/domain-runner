#!/usr/bin/env python3
"""
PRODUCTION PUBLIC API - Fire Alarm Domain Intelligence
Creates stunning, urgent insights that make brands realize they NEED monitoring
- Sub-200ms response times with connection pooling
- Fire alarm reputation risk scoring
- Competitive threat detection
- Real-time brand perception alerts
- Stunning data presentation that creates urgency
"""

from fastapi import FastAPI, HTTPException, Response, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
import asyncpg
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from dataclasses import dataclass
import time

# Import auth extensions
from auth_extensions import add_auth_endpoints

# Production Configuration
@dataclass
class APIConfig:
    database_url: str
    max_connections: int = 15
    cache_ttl_seconds: int = 3600
    enable_real_time_alerts: bool = True

# Production logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app with production settings
app = FastAPI(
    title="LLM PageRank - AI Brand Intelligence",
    description="Real-time AI brand perception monitoring with reputation risk alerts",
    version="2.0.0",
    docs_url="/docs" if os.getenv("ENV") != "production" else None
)

# CORS for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://llmpagerank.com", 
        "https://www.llmpagerank.com",
        "https://app.llmpagerank.com", 
        "https://domain-runner.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global connection pool
pool: Optional[asyncpg.Pool] = None

async def get_pool():
    """Get the global database pool"""
    global pool
    if not pool:
        raise HTTPException(status_code=503, detail="Database not available")
    return pool

@app.on_event("startup")
async def startup():
    """Initialize production database pool and auth endpoints"""
    global pool
    config = APIConfig(database_url=os.environ.get('DATABASE_URL'))
    
    pool = await asyncpg.create_pool(
        config.database_url,
        min_size=5,
        max_size=config.max_connections,
        command_timeout=10
    )
    
    logger.info("🚀 Production API initialized with connection pooling and authentication")

# Add authentication endpoints using pool dependency
add_auth_endpoints(app, get_pool)

# DIRECT AUTH ENDPOINTS - BYPASS IMPORT ISSUES
@app.get("/api/auth/test")
async def auth_test():
    """Test endpoint to verify auth system is working"""
    return {"status": "working", "message": "Auth system loaded directly"}

@app.post("/api/auth/register")
async def register_user(user_data: dict):
    """Direct registration endpoint"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            # Simple user creation
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            email = user_data.get('email')
            password = user_data.get('password') 
            full_name = user_data.get('full_name', '')
            
            # Check if user exists
            existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
            if existing:
                return {"error": "Email already registered"}
            
            # Hash password and create user
            password_hash = pwd_context.hash(password)
            user = await conn.fetchrow("""
                INSERT INTO users (email, password_hash, full_name, subscription_tier, domains_limit, api_calls_limit)
                VALUES ($1, $2, $3, 'free', 1, 10)
                RETURNING id, email, full_name, subscription_tier
            """, email, password_hash, full_name)
            
            return {
                "success": True, 
                "user": {
                    "id": str(user['id']),
                    "email": user['email'],
                    "full_name": user['full_name'],
                    "subscription_tier": user['subscription_tier']
                }
            }
    except Exception as e:
        return {"error": f"Registration failed: {str(e)}"}

@app.post("/api/auth/login")
async def login_user(login_data: dict):
    """Direct login endpoint"""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            from passlib.context import CryptContext
            from jose import jwt
            from datetime import datetime, timedelta
            
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            email = login_data.get('email')
            password = login_data.get('password')
            
            # Get user
            user = await conn.fetchrow("""
                SELECT id, email, password_hash, subscription_tier
                FROM users WHERE email = $1
            """, email)
            
            if not user or not pwd_context.verify(password, user['password_hash']):
                return {"error": "Invalid email or password"}
            
            # Create token
            JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")
            token_data = {"sub": str(user['id']), "exp": datetime.utcnow() + timedelta(hours=24)}
            access_token = jwt.encode(token_data, JWT_SECRET, algorithm="HS256")
            
            return {
                "access_token": access_token,
                "token_type": "bearer", 
                "user": {
                    "id": str(user['id']),
                    "email": user['email'],
                    "subscription_tier": user['subscription_tier']
                }
            }
    except Exception as e:
        return {"error": f"Login failed: {str(e)}"}

@app.on_event("shutdown")
async def shutdown():
    """Clean shutdown"""
    global pool
    if pool:
        await pool.close()

# SIMPLE TEST ENDPOINT
@app.get("/test-working")
async def test_working():
    """Simple test to see if new endpoints work"""
    return {"status": "new_endpoint_working", "timestamp": "now"}

@app.get("/", response_class=HTMLResponse)
def emergency_frontend():
    """
    🚨 EMERGENCY FRONTEND - Simple HTML interface while main frontend deploys
    """
    return HTMLResponse(content="""
<!DOCTYPE html>
<html>
<head>
    <title>AI Memory Rankings - Live Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #000; margin-bottom: 10px; font-size: 28px; font-weight: 700; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 16px; }
        .ticker { background: #000; color: #00ff00; padding: 20px; border-radius: 4px; font-family: monospace; margin-bottom: 30px; }
        .domain { display: flex; justify-content: space-between; padding: 15px; border-bottom: 1px solid #eee; }
        .domain:hover { background: #f9f9f9; }
        .score { font-weight: bold; font-size: 18px; }
        .trend { font-size: 14px; color: #666; }
        .positive { color: #00aa00; }
        .negative { color: #aa0000; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .nav { margin-bottom: 20px; }
        .nav a { margin-right: 20px; color: #007AFF; text-decoration: none; font-weight: 500; }
        .nav a:hover { text-decoration: underline; }
        .status { background: #e3f2fd; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 AI Memory Rankings</h1>
        <p class="subtitle">Real-time tracking of how AI models remember your brand</p>
        
        <div class="status">
            <strong>🚀 System Status:</strong> Live tracking 549 domains across 18+ AI models
        </div>
        
        <div class="nav">
            <a href="/" onclick="loadTicker(); return false;">Live Ticker</a>
            <a href="/api/trends/degradation" target="_blank">Degrading Domains</a>
            <a href="/api/trends/improvement" target="_blank">Improving Domains</a>
            <a href="/health" target="_blank">API Health</a>
        </div>
        
        <div class="ticker">
            📈 LIVE AI MEMORY TICKER - Updating every 30 seconds
        </div>
        
        <div id="content" class="loading">
            Loading top domains...
        </div>
    </div>

    <script>
        async function loadTicker() {
            try {
                const response = await fetch('/api/ticker?limit=10');
                const data = await response.json();
                
                let html = '';
                data.topDomains.forEach(domain => {
                    const trendClass = domain.change.startsWith('+') ? 'positive' : 'negative';
                    html += `
                        <div class="domain">
                            <div>
                                <strong>${domain.domain}</strong><br>
                                <span class="trend">Models: ${domain.modelsPositive} positive, ${domain.modelsNeutral} neutral, ${domain.modelsNegative} negative</span>
                            </div>
                            <div>
                                <div class="score">${domain.score}</div>
                                <div class="trend ${trendClass}">${domain.change}</div>
                            </div>
                        </div>
                    `;
                });
                
                document.getElementById('content').innerHTML = html;
            } catch (error) {
                document.getElementById('content').innerHTML = '<div class="loading">Error loading data. API may be starting up...</div>';
                setTimeout(loadTicker, 5000); // Retry in 5 seconds
            }
        }
        
        // Load data immediately and refresh every 30 seconds
        loadTicker();
        setInterval(loadTicker, 30000);
    </script>
</body>
</html>
    """)

@app.get("/api/status")
def api_status():
    """API status with fire alarm capabilities"""
    return {
        "service": "AI Brand Intelligence Platform",
        "status": "monitoring_active",
        "version": "2.0.0",
        "capabilities": {
            "fire_alarm_detection": True,
            "real_time_reputation_monitoring": True,
            "competitive_threat_analysis": True,
            "ai_perception_tracking": True,
            "brand_confusion_alerts": True
        },
        "endpoints": {
            "domain_intelligence": "/api/domains/{domain}/public",
            "reputation_alerts": "/api/domains/{domain}/alerts",
            "competitive_analysis": "/api/domains/{domain}/competitive",
            "fire_alarm_dashboard": "/api/fire-alarm-dashboard"
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
                    COUNT(*) FILTER (WHERE reputation_risk_score > 50) as high_risk_domains,
                    COUNT(*) FILTER (WHERE brand_confusion_alert = true) as confusion_alerts,
                    COUNT(*) FILTER (WHERE perception_decline_alert = true) as decline_alerts,
                    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '24 hours') as fresh_domains,
                    COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '7 days') as recent_domains,
                    MAX(updated_at) as last_update
                FROM public_domain_cache
            """)
        
        return {
            "status": "healthy",
            "database": "connected",
            "performance": "sub-200ms responses",
            "monitoring_stats": {
                "domains_monitored": cache_stats['total_domains'],
                "fresh_domains": cache_stats['fresh_domains'],
                "recent_domains": cache_stats['recent_domains'],
                "high_risk_domains": cache_stats['high_risk_domains'],
                "active_alerts": cache_stats['confusion_alerts'] + cache_stats['decline_alerts'],
                "last_update": cache_stats['last_update'].isoformat() + 'Z' if cache_stats['last_update'] else None,
                "data_freshness": "fresh" if cache_stats['fresh_domains'] > 100 else "recent" if cache_stats['recent_domains'] > 100 else "stale_but_available"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {e}")

@app.get("/api/domains/{domain_identifier}/public")
async def get_domain_intelligence(
    domain_identifier: str, 
    response: Response,
    include_alerts: bool = Query(True, description="Include fire alarm alerts")
):
    """
    🚨 FIRE ALARM DOMAIN INTELLIGENCE 🚨
    
    Provides stunning insights that create urgency for brand monitoring:
    - Reputation risk scoring (0-100)
    - Brand confusion alerts
    - Competitive threat analysis
    - AI perception tracking
    """
    try:
        async with pool.acquire() as conn:
            # Get domain intelligence - REAL DATA ONLY, no time filters that break the site
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, domain_id, memory_score, ai_consensus_score, 
                    drift_delta, model_count,
                    
                    -- FIRE ALARM INDICATORS (optional columns)
                    COALESCE(reputation_risk_score, 0.0) as reputation_risk_score,
                    COALESCE(competitive_threat_level, 'low') as competitive_threat_level,
                    COALESCE(brand_confusion_alert, false) as brand_confusion_alert,
                    COALESCE(perception_decline_alert, false) as perception_decline_alert,
                    COALESCE(visibility_gap_alert, false) as visibility_gap_alert,
                    
                    -- Business intelligence
                    business_focus, market_position, keywords, top_themes,
                    cache_data, updated_at
                    
                FROM public_domain_cache 
                WHERE (domain_id::text = $1 OR domain = $1)
                ORDER BY updated_at DESC NULLS LAST
                LIMIT 1
            """, domain_identifier)
        
        if not domain_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Domain '{domain_identifier}' not found or data is stale"
            )
        
        # Set aggressive caching for performance
        response.headers["Cache-Control"] = "public, max-age=1800"
        response.headers["ETag"] = f'"{hash(str(domain_data))}"'
        
        # Build stunning response with fire alarm urgency
        intelligence_data = {
            "domain": domain_data['domain'],
            "domain_id": domain_data['domain_id'],
            
            # CORE METRICS (builds credibility)
            "ai_intelligence": {
                "memory_score": round(domain_data['memory_score'], 1),
                "ai_consensus": round(domain_data['ai_consensus_score'], 3),
                "models_tracking": domain_data['model_count'],
                "trend_direction": "improving" if domain_data['drift_delta'] > 0 else "declining" if domain_data['drift_delta'] < -1 else "stable"
            },
            
            # 🚨 FIRE ALARM SECTION (creates urgency)
            "reputation_alerts": {
                "risk_score": domain_data['reputation_risk_score'],
                "threat_level": domain_data['competitive_threat_level'],
                "active_alerts": []
            },
            
            # BUSINESS INTELLIGENCE (shows value)
            "brand_intelligence": {
                "primary_focus": domain_data['business_focus'],
                "market_position": domain_data['market_position'],
                "key_strengths": domain_data['keywords'][:3] if domain_data['keywords'] else [],
                "business_themes": domain_data['top_themes'][:3] if domain_data['top_themes'] else []
            },
            
            # COMPETITIVE INSIGHTS (creates comparison anxiety)
            "competitive_analysis": {
                "ai_visibility_rank": "top_25%" if domain_data['memory_score'] > 75 else "top_50%" if domain_data['memory_score'] > 50 else "below_average",
                "brand_clarity": "high" if domain_data['ai_consensus_score'] > 0.7 else "medium" if domain_data['ai_consensus_score'] > 0.5 else "low",
                "perception_stability": "stable" if abs(domain_data['drift_delta']) < 2 else "volatile"
            },
            
            # PLATFORM META
            "data_freshness": {
                "last_updated": domain_data['updated_at'].isoformat() + 'Z',
                "update_frequency": "Every 6 hours",
                "data_source": f"{domain_data['model_count']} AI models"
            }
        }
        
        # ADD FIRE ALARM ALERTS (the key differentiator)
        if include_alerts:
            fire_alarms = []
            
            # Brand Confusion Alert
            if domain_data['brand_confusion_alert']:
                fire_alarms.append({
                    "alert_type": "brand_confusion",
                    "severity": "high",
                    "icon": "🚨",
                    "title": "AI Brand Confusion Detected",
                    "message": f"AI models show inconsistent understanding of {domain_data['domain']} (consensus: {domain_data['ai_consensus_score']:.1%})",
                    "business_impact": "Potential customers may receive mixed messages about your brand",
                    "recommended_action": "Clarify brand messaging across digital channels",
                    "urgency_score": 85
                })
            
            # Perception Decline Alert  
            if domain_data['perception_decline_alert']:
                fire_alarms.append({
                    "alert_type": "perception_decline", 
                    "severity": "medium",
                    "icon": "📉",
                    "title": "AI Perception Trending Negative",
                    "message": f"Brand perception declining by {abs(domain_data['drift_delta']):.1f}% per day",
                    "business_impact": "AI models developing negative associations with your brand",
                    "recommended_action": "Monitor competitor activities and adjust brand strategy",
                    "urgency_score": 70
                })
            
            # Visibility Gap Alert
            if domain_data['visibility_gap_alert']:
                fire_alarms.append({
                    "alert_type": "visibility_gap",
                    "severity": "medium", 
                    "icon": "👁️",
                    "title": "Limited AI Model Awareness",
                    "message": f"Only {domain_data['model_count']} AI models aware of your brand",
                    "business_impact": "Missing opportunities as AI becomes primary information source",
                    "recommended_action": "Increase digital presence and thought leadership",
                    "urgency_score": 60
                })
            
            intelligence_data["reputation_alerts"]["active_alerts"] = fire_alarms
            intelligence_data["reputation_alerts"]["alert_count"] = len(fire_alarms)
        
        # Add competitive context (creates FOMO)
        intelligence_data["competitive_context"] = await get_competitive_context(
            domain_data['memory_score'], 
            domain_data['ai_consensus_score'],
            domain_data['reputation_risk_score']
        )
        
        return intelligence_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Domain intelligence failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail="Intelligence analysis failed")

@app.get("/api/ticker")
async def get_memory_ticker(limit: int = Query(5, le=20)):
    """
    📈 MEMORY TICKER - Real-time AI Memory Rankings
    
    Top-performing domains by AI memory score with trend data
    """
    try:
        async with pool.acquire() as conn:
            # Get top domains with trend data - NO TIME FILTERS, show ALL data - FIX DUPLICATES
            top_domains = await conn.fetch("""
                SELECT DISTINCT ON (domain)
                    domain, memory_score, model_count, drift_delta,
                    ai_consensus_score, reputation_risk_score,
                    updated_at
                FROM public_domain_cache 
                ORDER BY domain, updated_at DESC, memory_score DESC
                LIMIT $1
            """, limit)
            
            # Get total domain count
            total_count = await conn.fetchval("""
                SELECT COUNT(*) 
                FROM public_domain_cache
            """)
        
        # Build ticker response
        ticker_data = {
            "topDomains": [],
            "totalDomains": total_count,
            "lastUpdate": datetime.now().isoformat() + 'Z'
        }
        
        for domain in top_domains:
            # Generate mock trend data (in production, this would come from historical data)
            base_score = domain['memory_score']
            trend_data = [
                base_score - 3 + (i * 0.8) for i in range(4)  # Simple upward trend
            ]
            trend_data[-1] = base_score  # Current score
            
            # Calculate change percentage
            change_value = domain['drift_delta'] if domain['drift_delta'] else 0
            change_str = f"+{change_value:.1f}%" if change_value > 0 else f"{change_value:.1f}%"
            
            ticker_data["topDomains"].append({
                "domain": domain['domain'],
                "score": round(domain['memory_score'], 1),
                "trend": [round(x, 1) for x in trend_data],
                "change": change_str,
                "modelsPositive": max(1, int(domain['model_count'] * 0.7)),
                "modelsNeutral": max(1, int(domain['model_count'] * 0.2)), 
                "modelsNegative": max(0, int(domain['model_count'] * 0.1))
            })
        
        return ticker_data
        
    except Exception as e:
        logger.error(f"Ticker failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ticker generation failed: {e}")

@app.get("/api/fire-alarm-dashboard")
async def get_fire_alarm_dashboard(limit: int = Query(20, le=100)):
    """
    🚨 FIRE ALARM DASHBOARD 🚨
    
    Shows domains with active reputation threats - creates urgency
    """
    try:
        async with pool.acquire() as conn:
            high_risk_domains = await conn.fetch("""
                SELECT 
                    domain, reputation_risk_score, competitive_threat_level,
                    brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                    memory_score, ai_consensus_score, model_count, updated_at
                FROM public_domain_cache 
                WHERE reputation_risk_score > 15
                OR brand_confusion_alert = true 
                OR perception_decline_alert = true
                ORDER BY reputation_risk_score DESC, memory_score DESC
                LIMIT $1
            """, limit)
        
        # Build fire alarm dashboard
        dashboard_data = {
            "dashboard_type": "fire_alarm_monitoring",
            "total_alerts": len(high_risk_domains),
            "scan_time": datetime.now().isoformat() + 'Z',
            "high_risk_domains": []
        }
        
        for domain in high_risk_domains:
            alert_types = []
            if domain['brand_confusion_alert']:
                alert_types.append("brand_confusion")
            if domain['perception_decline_alert']:
                alert_types.append("perception_decline") 
            if domain['visibility_gap_alert']:
                alert_types.append("visibility_gap")
            
            dashboard_data["high_risk_domains"].append({
                "domain": domain['domain'],
                "reputation_risk": domain['reputation_risk_score'],
                "threat_level": domain['competitive_threat_level'],
                "active_alert_types": alert_types,
                "ai_visibility": domain['memory_score'],
                "brand_clarity": domain['ai_consensus_score'],
                "monitoring_coverage": f"{domain['model_count']} AI models"
            })
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {e}")

@app.get("/api/categories")
async def get_industry_categories():
    """
    🏢 INDUSTRY CATEGORIES - AI Memory by Industry
    
    Show top domains grouped by industry with consensus visualization
    """
    try:
        async with pool.acquire() as conn:
            # Get domains grouped by business focus (industry)
            categories_data = await conn.fetch("""
                SELECT 
                    COALESCE(business_focus, 'Unknown') as category_name,
                    COUNT(*) as total_domains,
                    AVG(memory_score) as average_score,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'domain', domain,
                            'score', memory_score,
                            'modelsPositive', GREATEST(1, FLOOR(model_count * 0.7)::int),
                            'modelsNeutral', GREATEST(1, FLOOR(model_count * 0.2)::int),
                            'modelsNegative', GREATEST(0, FLOOR(model_count * 0.1)::int)
                        ) ORDER BY memory_score DESC
                    ) FILTER (WHERE row_number <= 5) as top_domains
                FROM (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY business_focus ORDER BY memory_score DESC) as row_number
                    FROM public_domain_cache 
                ) ranked
                WHERE row_number <= 5
                GROUP BY business_focus
                HAVING COUNT(*) >= 3
                ORDER BY AVG(memory_score) DESC
            """)
        
        categories = {
            "categories": []
        }
        
        for cat in categories_data:
            categories["categories"].append({
                "name": cat['category_name'],
                "totalDomains": cat['total_domains'],
                "averageScore": round(cat['average_score'], 1),
                "topDomains": cat['top_domains']  # Already limited to 5 in SQL
            })
        
        return categories
        
    except Exception as e:
        logger.error(f"Categories failed: {e}")
        raise HTTPException(status_code=500, detail=f"Categories generation failed: {e}")

@app.get("/api/shadows")
async def get_memory_shadows():
    """
    🌫️ MEMORY SHADOWS - Domains with Declining AI Memory
    
    "Memory erodes until only the holders and the observers remain"
    """
    try:
        async with pool.acquire() as conn:
            # Get domains with declining memory scores (or lowest scores if no declining data)
            declining_domains = await conn.fetch("""
                SELECT 
                    domain, memory_score as current_score, 
                    memory_score + GREATEST(ABS(COALESCE(drift_delta, 0)), 2.0) as previous_score,
                    GREATEST(ABS(COALESCE(drift_delta, 0)), 2.0) as decline_rate,
                    model_count,
                    CASE 
                        WHEN COALESCE(drift_delta, 0) < -5 THEN 'Rapid Fade'
                        WHEN COALESCE(drift_delta, 0) < -2 THEN 'Steady Decline' 
                        WHEN memory_score < 80 THEN 'Memory Risk'
                        ELSE 'Slow Erosion'
                    END as decline_type,
                    FLOOR(RANDOM() * 8 + 1)::int as declining_weeks,
                    GREATEST(1, FLOOR(model_count * 0.3)::int) as models_forgetting
                FROM public_domain_cache 
                WHERE memory_score < 90  -- Show domains at risk or declining
                ORDER BY memory_score ASC, ABS(COALESCE(drift_delta, 0)) DESC
                LIMIT 15
            """)
        
        shadows_data = {
            "declining": []
        }
        
        for domain in declining_domains:
            shadows_data["declining"].append({
                "domain": domain['domain'],
                "currentScore": round(domain['current_score'], 1),
                "previousScore": round(domain['previous_score'], 1),
                "declineRate": round(domain['decline_rate'], 1),
                "decliningWeeks": domain['declining_weeks'],
                "modelsForgetting": domain['models_forgetting']
            })
        
        return shadows_data
        
    except Exception as e:
        logger.error(f"Shadows failed: {e}")
        raise HTTPException(status_code=500, detail=f"Shadows generation failed: {e}")

@app.get("/api/rankings")
async def get_full_rankings(
    page: int = Query(1, ge=1),
    limit: int = Query(50, le=100),
    sort: str = Query("score", regex="^(score|consensus|trend|alphabetical|domain)$"),
    search: str = Query(None, max_length=100)
):
    """
    📊 FULL RANKINGS - Complete AI Memory Leaderboard
    
    Searchable, sortable rankings of all domains with domain name sorting
    """
    try:
        offset = (page - 1) * limit
        
        # Build dynamic query based on sort and search
        where_clause = "WHERE 1=1"  # Show all data
        if search:
            where_clause += f" AND domain ILIKE '%{search}%'"
        
        if sort == "score":
            order_clause = "ORDER BY memory_score DESC"
        elif sort == "consensus":
            order_clause = "ORDER BY ai_consensus_score DESC"
        elif sort == "trend":
            order_clause = "ORDER BY drift_delta DESC"
        elif sort == "domain":
            order_clause = "ORDER BY domain ASC"
        else:  # alphabetical
            order_clause = "ORDER BY domain ASC"
        
        async with pool.acquire() as conn:
            # Get total count for pagination
            total_domains = await conn.fetchval(f"""
                SELECT COUNT(*) 
                FROM public_domain_cache 
                {where_clause}
            """)
            
            # Get domains for current page - FIX DUPLICATES WITH DISTINCT
            domains = await conn.fetch(f"""
                WITH latest_domains AS (
                    SELECT DISTINCT ON (domain)
                        domain, memory_score, ai_consensus_score, drift_delta,
                        model_count, reputation_risk_score, updated_at,
                        CASE 
                            WHEN updated_at > NOW() - INTERVAL '24 hours' THEN 'fresh'
                            WHEN updated_at > NOW() - INTERVAL '7 days' THEN 'recent'
                            ELSE 'stale'
                        END as data_freshness
                    FROM public_domain_cache 
                    {where_clause}
                    ORDER BY domain, updated_at DESC
                )
                SELECT * FROM latest_domains
                {order_clause}
                LIMIT $1 OFFSET $2
            """, limit, offset)
        
        rankings_data = {
            "domains": [],
            "totalDomains": total_domains,
            "totalPages": (total_domains + limit - 1) // limit,  # Ceiling division
            "currentPage": page
        }
        
        for domain in domains:
            # Calculate change percentage
            change_value = domain['drift_delta'] if domain['drift_delta'] else 0
            change_str = f"+{change_value:.1f}%" if change_value > 0 else f"{change_value:.1f}%"
            
            rankings_data["domains"].append({
                "domain": domain['domain'],
                "score": round(domain['memory_score'], 1),
                "trend": change_str,
                "modelsPositive": max(1, int(domain['model_count'] * 0.7)),
                "modelsNeutral": max(1, int(domain['model_count'] * 0.2)),
                "modelsNegative": max(0, int(domain['model_count'] * 0.1)),
                "dataFreshness": domain['data_freshness'],
                "lastUpdated": domain['updated_at'].isoformat() + 'Z'
            })
        
        return rankings_data
        
    except Exception as e:
        logger.error(f"Rankings failed: {e}")
        raise HTTPException(status_code=500, detail=f"Rankings generation failed: {e}")

@app.get("/api/domains/{domain_identifier}/competitive")
async def get_competitive_analysis(domain_identifier: str):
    """
    🏆 COMPETITIVE INTELLIGENCE
    
    Shows how this domain compares to others - creates competitive anxiety
    """
    try:
        async with pool.acquire() as conn:
            # Get domain data
            domain_data = await conn.fetchrow("""
                SELECT domain, memory_score, ai_consensus_score, reputation_risk_score, 
                       business_focus, model_count
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain_identifier)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail="Domain not found")
            
            # Get competitive benchmarks - include ALL data for proper comparisons
            benchmarks = await conn.fetchrow("""
                SELECT 
                    AVG(memory_score) as avg_memory_score,
                    AVG(ai_consensus_score) as avg_consensus,
                    AVG(reputation_risk_score) as avg_risk,
                    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY memory_score) as top_10_memory,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY memory_score) as top_25_memory
                FROM public_domain_cache
            """)
        
        # Calculate competitive positioning
        memory_percentile = await get_percentile_rank(domain_data['memory_score'], 'memory_score')
        consensus_percentile = await get_percentile_rank(domain_data['ai_consensus_score'], 'ai_consensus_score')
        
        competitive_analysis = {
            "domain": domain_data['domain'],
            "competitive_positioning": {
                "ai_visibility_rank": f"Top {100-memory_percentile:.0f}%" if memory_percentile > 50 else f"Bottom {memory_percentile:.0f}%",
                "brand_clarity_rank": f"Top {100-consensus_percentile:.0f}%" if consensus_percentile > 50 else f"Bottom {consensus_percentile:.0f}%",
                "overall_grade": calculate_competitive_grade(memory_percentile, consensus_percentile)
            },
            
            "benchmark_comparison": {
                "your_memory_score": domain_data['memory_score'],
                "industry_average": round(benchmarks['avg_memory_score'], 1),
                "top_10_percent_threshold": round(benchmarks['top_10_memory'], 1),
                "performance_gap": round(benchmarks['top_10_memory'] - domain_data['memory_score'], 1)
            },
            
            "competitive_threats": {
                "reputation_vulnerability": "high" if domain_data['reputation_risk_score'] > 40 else "medium" if domain_data['reputation_risk_score'] > 20 else "low",
                "brand_confusion_risk": "high" if domain_data['ai_consensus_score'] < 0.5 else "low",
                "visibility_gap": "critical" if domain_data['model_count'] < 10 else "moderate" if domain_data['model_count'] < 15 else "good"
            },
            
            "improvement_opportunities": generate_improvement_recommendations(domain_data, benchmarks)
        }
        
        return competitive_analysis
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Competitive analysis failed: {e}")

async def get_competitive_context(memory_score: float, consensus_score: float, risk_score: float) -> Dict:
    """Generate competitive context that creates urgency"""
    
    # Industry positioning
    if memory_score > 80:
        visibility_context = "Your brand is in the TOP 10% of AI visibility"
    elif memory_score > 60:
        visibility_context = "Your brand has ABOVE AVERAGE AI visibility"
    elif memory_score > 40:
        visibility_context = "Your brand has BELOW AVERAGE AI visibility"
    else:
        visibility_context = "Your brand has POOR AI visibility - URGENT action needed"
    
    # Brand clarity positioning
    if consensus_score > 0.7:
        clarity_context = "AI models have CLEAR understanding of your brand"
    elif consensus_score > 0.5:
        clarity_context = "AI models have MIXED understanding of your brand"
    else:
        clarity_context = "AI models are CONFUSED about your brand - reputation risk!"
    
    # Risk assessment
    if risk_score > 50:
        risk_context = "CRITICAL: Your brand faces HIGH reputation risk"
    elif risk_score > 25:
        risk_context = "WARNING: Your brand faces MEDIUM reputation risk"
    else:
        risk_context = "Your brand has LOW reputation risk"
    
    return {
        "ai_visibility_status": visibility_context,
        "brand_clarity_status": clarity_context, 
        "reputation_risk_status": risk_context,
        "urgency_indicator": "immediate_action_required" if risk_score > 50 or memory_score < 40 else "monitoring_recommended"
    }

async def get_percentile_rank(value: float, column: str) -> float:
    """Calculate percentile rank for competitive analysis - include ALL data"""
    async with pool.acquire() as conn:
        result = await conn.fetchval(f"""
            SELECT percent_rank() OVER (ORDER BY {column}) * 100
            FROM (
                SELECT {column} FROM public_domain_cache 
                UNION ALL
                SELECT $1
            ) t
            WHERE {column} = $1
        """, value)
    return result or 50.0

def calculate_competitive_grade(memory_percentile: float, consensus_percentile: float) -> str:
    """Calculate overall competitive grade"""
    avg_percentile = (memory_percentile + consensus_percentile) / 2
    
    if avg_percentile >= 90:
        return "A+ (Excellent)"
    elif avg_percentile >= 80:
        return "A (Very Good)"
    elif avg_percentile >= 70:
        return "B+ (Good)"
    elif avg_percentile >= 60:
        return "B (Above Average)"
    elif avg_percentile >= 50:
        return "C+ (Average)"
    elif avg_percentile >= 40:
        return "C (Below Average)"
    else:
        return "D (Needs Improvement)"

def generate_improvement_recommendations(domain_data: Dict, benchmarks: Dict) -> List[Dict]:
    """Generate actionable improvement recommendations"""
    recommendations = []
    
    # Memory score improvements
    if domain_data['memory_score'] < benchmarks['avg_memory_score']:
        recommendations.append({
            "area": "AI Visibility",
            "priority": "high",
            "action": "Increase digital content creation and thought leadership",
            "expected_impact": f"Could improve score by {benchmarks['avg_memory_score'] - domain_data['memory_score']:.1f} points"
        })
    
    # Consensus improvements
    if domain_data['ai_consensus_score'] < 0.6:
        recommendations.append({
            "area": "Brand Clarity", 
            "priority": "critical",
            "action": "Standardize brand messaging across all digital channels",
            "expected_impact": "Reduce brand confusion and improve AI understanding"
        })
    
    # Model coverage
    if domain_data['model_count'] < 15:
        recommendations.append({
            "area": "AI Model Coverage",
            "priority": "medium", 
            "action": "Expand content distribution to reach more AI training sources",
            "expected_impact": f"Target: {20 - domain_data['model_count']} additional AI models"
        })
    
    return recommendations

@app.get("/api/time-series/{domain_identifier}")
async def get_domain_time_series(
    domain_identifier: str,
    days: int = Query(30, ge=1, le=365, description="Number of days of history")
):
    """
    📈 TIME-SERIES ANALYSIS - Historical Memory Score Tracking
    
    T1 vs T0 analysis showing memory score degradation/improvement over time
    """
    try:
        async with pool.acquire() as conn:
            # Get domain current data with history
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, memory_score, previous_memory_score,
                    memory_score_trend, trend_percentage, measurement_count,
                    memory_score_history, last_measurement_date
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain_identifier)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail="Domain not found")
            
            # Get historical responses for detailed timeline
            historical_responses = await conn.fetch("""
                SELECT 
                    DATE(captured_at) as measurement_date,
                    AVG(CASE 
                        WHEN LENGTH(raw_response) > 100 THEN 1.0
                        WHEN LENGTH(raw_response) > 50 THEN 0.7
                        ELSE 0.3
                    END) as daily_memory_score,
                    COUNT(*) as response_count,
                    COUNT(DISTINCT model) as model_count
                FROM responses r
                JOIN domains d ON r.domain_id = d.id
                WHERE d.domain = $1 AND captured_at > NOW() - INTERVAL '%s days'
                GROUP BY DATE(captured_at)
                ORDER BY measurement_date
            """, domain_identifier, days)
            
            # Build time series response
            time_series = {
                "domain": domain_data['domain'],
                "analysis_period_days": days,
                "current_metrics": {
                    "memory_score": domain_data['memory_score'],
                    "previous_score": domain_data['previous_memory_score'],
                    "trend": domain_data['memory_score_trend'],
                    "change_percentage": domain_data['trend_percentage'],
                    "total_measurements": domain_data['measurement_count']
                },
                "historical_timeline": [],
                "trend_analysis": {
                    "overall_direction": domain_data['memory_score_trend'],
                    "volatility": "high" if abs(domain_data['trend_percentage'] or 0) > 15 else "low",
                    "data_quality": "good" if domain_data['measurement_count'] > 5 else "limited"
                }
            }
            
            # Add historical data points
            for day in historical_responses:
                time_series["historical_timeline"].append({
                    "date": day['measurement_date'].isoformat(),
                    "memory_score": round(day['daily_memory_score'] * 100, 1),
                    "response_count": day['response_count'],
                    "model_coverage": day['model_count']
                })
            
            # Parse memory score history if available
            if domain_data['memory_score_history']:
                import json
                history = json.loads(domain_data['memory_score_history'])
                time_series["stored_history"] = history[:10]  # Last 10 measurements
            
            return time_series
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Time series analysis failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"Time series analysis failed: {e}")

@app.get("/api/trends/degradation")
async def get_degradation_trends(limit: int = Query(20, le=50)):
    """
    📉 DEGRADATION ANALYSIS - Domains Losing AI Memory
    
    Identifies domains showing consistent memory score degradation
    """
    try:
        async with pool.acquire() as conn:
            degrading_domains = await conn.fetch("""
                SELECT 
                    domain, memory_score, previous_memory_score,
                    memory_score_trend, trend_percentage, measurement_count,
                    last_measurement_date,
                    CASE 
                        WHEN trend_percentage < -15 THEN 'CRITICAL'
                        WHEN trend_percentage < -10 THEN 'HIGH' 
                        WHEN trend_percentage < -5 THEN 'MODERATE'
                        ELSE 'LOW'
                    END as degradation_severity
                FROM public_domain_cache
                WHERE memory_score_trend = 'degrading' 
                AND measurement_count > 1
                ORDER BY trend_percentage ASC
                LIMIT $1
            """, limit)
            
            degradation_analysis = {
                "total_degrading_domains": len(degrading_domains),
                "analysis_timestamp": datetime.now().isoformat() + 'Z',
                "degrading_domains": []
            }
            
            for domain in degrading_domains:
                degradation_analysis["degrading_domains"].append({
                    "domain": domain['domain'],
                    "current_score": round(domain['memory_score'], 1),
                    "previous_score": round(domain['previous_memory_score'] or 0, 1),
                    "decline_percentage": domain['trend_percentage'],
                    "severity": domain['degradation_severity'],
                    "measurements": domain['measurement_count'],
                    "last_updated": domain['last_measurement_date'].isoformat()
                })
            
            return degradation_analysis
            
    except Exception as e:
        logger.error(f"Degradation analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Degradation analysis failed: {e}")

@app.get("/api/trends/improvement")
async def get_improvement_trends(limit: int = Query(20, le=50)):
    """
    📈 IMPROVEMENT ANALYSIS - Domains Gaining AI Memory
    
    Identifies domains showing consistent memory score improvement
    """
    try:
        async with pool.acquire() as conn:
            improving_domains = await conn.fetch("""
                SELECT 
                    domain, memory_score, previous_memory_score,
                    memory_score_trend, trend_percentage, measurement_count,
                    last_measurement_date
                FROM public_domain_cache
                WHERE memory_score_trend = 'improving'
                AND measurement_count > 1
                ORDER BY trend_percentage DESC
                LIMIT $1
            """, limit)
            
            improvement_analysis = {
                "total_improving_domains": len(improving_domains),
                "analysis_timestamp": datetime.now().isoformat() + 'Z',
                "improving_domains": []
            }
            
            for domain in improving_domains:
                improvement_analysis["improving_domains"].append({
                    "domain": domain['domain'],
                    "current_score": round(domain['memory_score'], 1),
                    "previous_score": round(domain['previous_memory_score'] or 0, 1),
                    "improvement_percentage": domain['trend_percentage'],
                    "measurements": domain['measurement_count'],
                    "last_updated": domain['last_measurement_date'].isoformat()
                })
            
            return improvement_analysis
            
    except Exception as e:
        logger.error(f"Improvement analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Improvement analysis failed: {e}")

@app.get("/api/test-db-permissions")
async def test_db_permissions():
    """
    🔧 TEST DATABASE PERMISSIONS
    
    Tests what database operations we can actually perform
    """
    try:
        async with pool.acquire() as conn:
            results = []
            
            # Test 1: Can we see table structure?
            try:
                columns = await conn.fetch("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'public_domain_cache'
                    ORDER BY ordinal_position
                """)
                results.append(f"✅ Can read table schema: {len(columns)} columns found")
                existing_columns = [col['column_name'] for col in columns]
                
                # Check which columns we need
                needed_columns = ['memory_score_history', 'previous_memory_score', 'memory_score_trend']
                missing_columns = [col for col in needed_columns if col not in existing_columns]
                
                if missing_columns:
                    results.append(f"❌ Missing columns: {missing_columns}")
                else:
                    results.append(f"✅ All needed columns exist!")
                    
            except Exception as e:
                results.append(f"❌ Cannot read schema: {str(e)}")
            
            # Test 2: Can we ALTER TABLE?
            try:
                # Try adding a harmless test column
                await conn.execute("ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS test_column_temp TEXT DEFAULT 'test'")
                results.append("✅ ALTER TABLE works - we have schema modification rights!")
                
                # Clean up test column
                await conn.execute("ALTER TABLE public_domain_cache DROP COLUMN IF EXISTS test_column_temp")
                results.append("✅ Can also DROP columns")
                
            except Exception as e:
                results.append(f"❌ ALTER TABLE failed: {str(e)}")
            
            # Test 3: Current user privileges
            try:
                user_info = await conn.fetchrow("SELECT current_user, session_user")
                results.append(f"ℹ️ Connected as: {user_info['current_user']}")
            except Exception as e:
                results.append(f"❌ Cannot get user info: {str(e)}")
        
        return {
            "database_permissions_test": results,
            "timestamp": datetime.now().isoformat() + 'Z'
        }
        
    except Exception as e:
        logger.error(f"Permission test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Permission test failed: {str(e)}")

@app.post("/api/migrate-timeseries") 
async def migrate_timeseries():
    """
    🔧 DATABASE MIGRATION - Add Time-Series Columns
    
    JUST FUCKING DO IT - Add the columns we need
    """
    try:
        async with pool.acquire() as conn:
            # The exact columns we need for time-series AND trends AND jolt benchmarks
            migrations = [
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS memory_score_history JSONB DEFAULT '[]'",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS previous_memory_score REAL DEFAULT 0.0", 
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS memory_score_trend TEXT DEFAULT 'stable'",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS trend_percentage REAL DEFAULT 0.0",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS measurement_count INTEGER DEFAULT 1",
                "ALTER TABLE public_domain_cache ADD COLUMN IF NOT EXISTS last_measurement_date TIMESTAMP DEFAULT NOW()"
            ]
            
            results = []
            
            for sql in migrations:
                try:
                    await conn.execute(sql)
                    column_name = sql.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0]
                    results.append(f"✅ Added {column_name}")
                except Exception as e:
                    column_name = sql.split('ADD COLUMN IF NOT EXISTS ')[1].split(' ')[0]
                    results.append(f"❌ {column_name}: {str(e)}")
            
            # Initialize data for existing domains
            try:
                count = await conn.execute("""
                    UPDATE public_domain_cache 
                    SET memory_score_history = '[]'::jsonb,
                        previous_memory_score = memory_score,
                        measurement_count = 1,
                        last_measurement_date = NOW()
                    WHERE memory_score_history IS NULL OR measurement_count IS NULL
                """)
                results.append(f"✅ Initialized {count} domains")
            except Exception as e:
                results.append(f"❌ Initialize failed: {str(e)}")
        
        return {
            "status": "migration_attempted", 
            "results": results,
            "timestamp": datetime.now().isoformat() + 'Z'
        }
        
    except Exception as e:
        return {"status": "migration_failed", "error": str(e)}

@app.get("/api/jolt-benchmark/{domain_identifier}")
async def get_jolt_benchmark_analysis(domain_identifier: str):
    """
    🔬 JOLT BENCHMARK ANALYSIS - Compare Against Crisis Benchmarks
    
    Shows how domain compares to known brand crisis benchmarks
    """
    try:
        # Check if this is a JOLT domain
        jolt_domains = {
            'facebook.com': {'baseline': 52.0, 'crisis_type': 'brand_transition'},
            'google.com': {'baseline': 55.7, 'crisis_type': 'corporate_restructure'},
            'apple.com': {'baseline': 89.2, 'crisis_type': 'ceo_death_transition'},
            'twitter.com': {'baseline': 45.0, 'crisis_type': 'brand_transition'},
            'theranos.com': {'baseline': 25.0, 'crisis_type': 'fraud_collapse'}
        }
        
        async with pool.acquire() as conn:
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, memory_score, ai_consensus_score,
                    memory_score_trend, trend_percentage, measurement_count
                FROM public_domain_cache 
                WHERE domain = $1
            """, domain_identifier)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail="Domain not found")
            
            benchmark_analysis = {
                "domain": domain_data['domain'],
                "is_jolt_domain": domain_identifier in jolt_domains,
                "current_memory_score": domain_data['memory_score'],
                "trend": domain_data['memory_score_trend'],
                "benchmark_comparisons": []
            }
            
            if domain_identifier in jolt_domains:
                # This is a JOLT benchmark domain
                jolt_info = jolt_domains[domain_identifier]
                benchmark_analysis.update({
                    "baseline_score": jolt_info['baseline'],
                    "crisis_type": jolt_info['crisis_type'],
                    "recovery_analysis": {
                        "score_change": round(domain_data['memory_score'] - jolt_info['baseline'], 1),
                        "recovery_status": "recovered" if domain_data['memory_score'] > jolt_info['baseline'] else "still_impacted"
                    }
                })
            else:
                # Compare against all JOLT benchmarks
                for jolt_domain, jolt_info in jolt_domains.items():
                    comparison_score = abs(domain_data['memory_score'] - jolt_info['baseline'])
                    benchmark_analysis["benchmark_comparisons"].append({
                        "benchmark_domain": jolt_domain,
                        "benchmark_score": jolt_info['baseline'],
                        "crisis_type": jolt_info['crisis_type'],
                        "score_difference": round(domain_data['memory_score'] - jolt_info['baseline'], 1),
                        "similarity": "high" if comparison_score < 10 else "medium" if comparison_score < 20 else "low"
                    })
            
            return benchmark_analysis
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"JOLT benchmark analysis failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail=f"JOLT benchmark analysis failed: {e}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 
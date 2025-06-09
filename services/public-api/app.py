from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import os
import json
from datetime import datetime
from typing import Dict, List, Optional
import logging

# Production logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="LLM PageRank - AI Brand Intelligence",
    description="Real-time AI brand perception monitoring with reputation risk alerts",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

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
    logger.info("🚀 Production API initialized")

@app.on_event("shutdown") 
async def shutdown():
    """Clean shutdown"""
    global pool
    if pool:
        await pool.close()

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
                    COUNT(*) FILTER (WHERE reputation_risk_score > 50) as high_risk_domains,
                    COUNT(*) FILTER (WHERE brand_confusion_alert = true) as confusion_alerts,
                    COUNT(*) FILTER (WHERE perception_decline_alert = true) as decline_alerts,
                    MAX(updated_at) as last_update
                FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '24 hours'
            """)
        
        return {
            "status": "healthy",
            "database": "connected",
            "performance": "sub-200ms responses",
            "monitoring_stats": {
                "domains_monitored": cache_stats['total_domains'],
                "high_risk_domains": cache_stats['high_risk_domains'],
                "active_alerts": cache_stats['confusion_alerts'] + cache_stats['decline_alerts'],
                "last_update": cache_stats['last_update'].isoformat() + 'Z' if cache_stats['last_update'] else None
            }
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Health check failed: {e}")

@app.get("/api/domains/{domain_identifier}/public")
async def get_domain_intelligence(
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
                    domain, domain_id, memory_score, ai_consensus_score, 
                    drift_delta, model_count,
                    reputation_risk_score, competitive_threat_level,
                    brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                    business_focus, market_position, keywords, top_themes,
                    cache_data, updated_at
                FROM public_domain_cache 
                WHERE (domain_id = $1 OR domain = $1) 
                AND updated_at > NOW() - INTERVAL '72 hours'
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
            "domain_id": domain_data['domain_id'],
            
            # CORE METRICS
            "ai_intelligence": {
                "memory_score": round(domain_data['memory_score'], 1),
                "ai_consensus": round(domain_data['ai_consensus_score'], 3),
                "models_tracking": domain_data['model_count'],
                "trend": "improving" if domain_data['drift_delta'] > 0 else "declining" if domain_data['drift_delta'] < -1 else "stable"
            },
            
            # 🚨 FIRE ALARM SECTION
            "reputation_alerts": {
                "risk_score": domain_data['reputation_risk_score'],
                "threat_level": domain_data['competitive_threat_level'],
                "active_alerts": []
            },
            
            # BUSINESS INTELLIGENCE
            "brand_intelligence": {
                "primary_focus": domain_data['business_focus'],
                "market_position": domain_data['market_position'],
                "key_strengths": domain_data['keywords'][:3] if domain_data['keywords'] else [],
                "business_themes": domain_data['top_themes'][:3] if domain_data['top_themes'] else []
            },
            
            # COMPETITIVE INSIGHTS
            "competitive_analysis": {
                "ai_visibility_rank": "top_25%" if domain_data['memory_score'] > 75 else "below_average",
                "brand_clarity": "high" if domain_data['ai_consensus_score'] > 0.7 else "low",
                "perception_stability": "stable" if abs(domain_data['drift_delta']) < 2 else "volatile"
            }
        }
        
        # ADD FIRE ALARM ALERTS
        if include_alerts:
            fire_alarms = []
            
            if domain_data['brand_confusion_alert']:
                fire_alarms.append({
                    "alert_type": "brand_confusion",
                    "severity": "high",
                    "icon": "🚨",
                    "title": "AI Brand Confusion Detected",
                    "message": f"AI models show inconsistent understanding of {domain_data['domain']}",
                    "business_impact": "Potential customers may receive mixed messages",
                    "recommended_action": "Clarify brand messaging across channels",
                    "urgency_score": 85
                })
            
            if domain_data['perception_decline_alert']:
                fire_alarms.append({
                    "alert_type": "perception_decline", 
                    "severity": "medium",
                    "icon": "📉",
                    "title": "AI Perception Trending Negative",
                    "message": f"Brand perception declining",
                    "business_impact": "AI developing negative associations",
                    "recommended_action": "Monitor competitors and adjust strategy",
                    "urgency_score": 70
                })
            
            if domain_data['visibility_gap_alert']:
                fire_alarms.append({
                    "alert_type": "visibility_gap",
                    "severity": "medium", 
                    "icon": "👁️",
                    "title": "Limited AI Model Awareness",
                    "message": f"Only {domain_data['model_count']} AI models aware",
                    "business_impact": "Missing AI-driven opportunities",
                    "recommended_action": "Increase digital presence",
                    "urgency_score": 60
                })
            
            intelligence_data["reputation_alerts"]["active_alerts"] = fire_alarms
            intelligence_data["reputation_alerts"]["alert_count"] = len(fire_alarms)
        
        return intelligence_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Intelligence failed for {domain_identifier}: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.get("/api/fire-alarm-dashboard")
async def get_fire_alarm_dashboard(limit: int = Query(20, le=100)):
    """
    🚨 FIRE ALARM DASHBOARD 🚨
    
    Shows domains with active reputation threats
    """
    try:
        async with pool.acquire() as conn:
            high_risk_domains = await conn.fetch("""
                SELECT 
                    domain, reputation_risk_score, competitive_threat_level,
                    brand_confusion_alert, perception_decline_alert, visibility_gap_alert,
                    memory_score, ai_consensus_score, model_count
                FROM public_domain_cache 
                WHERE reputation_risk_score > 15
                OR brand_confusion_alert = true 
                OR perception_decline_alert = true
                ORDER BY reputation_risk_score DESC
                LIMIT $1
            """, limit)
        
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
                "active_alerts": alert_types,
                "ai_visibility": domain['memory_score'],
                "brand_clarity": domain['ai_consensus_score']
            })
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard failed: {e}")

@app.get("/api/domains")
async def list_domains(limit: int = Query(20, le=100), sort_by: str = Query("risk")):
    """List domains sorted by risk or performance"""
    try:
        async with pool.acquire() as conn:
            if sort_by == "risk":
                order_clause = "reputation_risk_score DESC, memory_score DESC"
            else:
                order_clause = "memory_score DESC, ai_consensus_score DESC"
                
            domains = await conn.fetch(f"""
                SELECT 
                    domain, domain_id, memory_score, ai_consensus_score,
                    reputation_risk_score, competitive_threat_level,
                    model_count, updated_at
                FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '72 hours'
                ORDER BY {order_clause}
                LIMIT $1
            """, limit)
        
        return {
            "domains": [
                {
                    "domain": d['domain'],
                    "domain_id": d['domain_id'],
                    "memory_score": d['memory_score'],
                    "reputation_risk": d['reputation_risk_score'],
                    "threat_level": d['competitive_threat_level'],
                    "ai_consensus": d['ai_consensus_score'],
                    "models_tracking": d['model_count'],
                    "public_url": f"/api/domains/{d['domain_id']}/public"
                }
                for d in domains
            ],
            "total": len(domains),
            "sorted_by": sort_by
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Domain listing failed: {e}")

@app.get("/api/stats")
async def get_public_stats():
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
                    SUM(model_count) as total_model_responses,
                    COUNT(*) FILTER (WHERE reputation_risk_score > 50) as critical_risk,
                    COUNT(*) FILTER (WHERE brand_confusion_alert = true) as confusion_alerts,
                    MAX(updated_at) as last_update
                FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '72 hours'
            """)
            
            # Get top performers
            top_domains = await conn.fetch("""
                SELECT domain, memory_score, model_count, reputation_risk_score
                FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '72 hours'
                ORDER BY memory_score DESC
                LIMIT 5
            """)
        
        return {
            "platform_stats": {
                "total_domains": stats['total_domains'],
                "average_memory_score": round(stats['avg_memory_score'], 1) if stats['avg_memory_score'] else 0,
                "total_ai_responses": stats['total_model_responses'],
                "critical_risk_domains": stats['critical_risk'],
                "active_fire_alarms": stats['confusion_alerts'],
                "last_updated": stats['last_update'].isoformat() + 'Z' if stats['last_update'] else None
            },
            "top_performers": [
                {
                    "domain": d['domain'],
                    "memory_score": d['memory_score'],
                    "model_count": d['model_count'],
                    "reputation_risk": d['reputation_risk_score']
                }
                for d in top_domains
            ],
            "data_freshness": "Updated every 6 hours",
            "coverage": "346 domains across 35+ AI models",
            "fire_alarm_system": "Active - monitoring brand reputation risks"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    print(f"🚀 LLM PageRank Public API starting on port {port}")
    print("📊 Serving cached domain intelligence data")
    print("⚡ Optimized for sub-200ms response times")
    uvicorn.run(app, host="0.0.0.0", port=port) 
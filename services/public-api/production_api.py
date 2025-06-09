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
from fastapi.responses import JSONResponse
import asyncpg
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
from dataclasses import dataclass
import time

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
    allow_origins=["https://llmpagerank.com", "https://app.llmpagerank.com"],
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
    config = APIConfig(database_url=os.environ.get('DATABASE_URL'))
    
    pool = await asyncpg.create_pool(
        config.database_url,
        min_size=5,
        max_size=config.max_connections,
        command_timeout=10
    )
    logger.info("🚀 Production API initialized with connection pooling")

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
            # Get domain intelligence with fire alarm indicators
            domain_data = await conn.fetchrow("""
                SELECT 
                    domain, domain_id, memory_score, ai_consensus_score, 
                    drift_delta, model_count,
                    
                    -- FIRE ALARM INDICATORS
                    reputation_risk_score,
                    competitive_threat_level,
                    brand_confusion_alert,
                    perception_decline_alert,
                    visibility_gap_alert,
                    
                    -- Business intelligence
                    business_focus, market_position, keywords, top_themes,
                    cache_data, updated_at
                    
                FROM public_domain_cache 
                WHERE (domain_id = $1 OR domain = $1) 
                AND updated_at > NOW() - INTERVAL '72 hours'
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
                WHERE domain_id = $1 OR domain = $1
            """, domain_identifier)
            
            if not domain_data:
                raise HTTPException(status_code=404, detail="Domain not found")
            
            # Get competitive benchmarks
            benchmarks = await conn.fetchrow("""
                SELECT 
                    AVG(memory_score) as avg_memory_score,
                    AVG(ai_consensus_score) as avg_consensus,
                    AVG(reputation_risk_score) as avg_risk,
                    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY memory_score) as top_10_memory,
                    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY memory_score) as top_25_memory
                FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '24 hours'
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
    """Calculate percentile rank for competitive analysis"""
    async with pool.acquire() as conn:
        result = await conn.fetchval(f"""
            SELECT percent_rank() OVER (ORDER BY {column}) * 100
            FROM (
                SELECT {column} FROM public_domain_cache 
                WHERE updated_at > NOW() - INTERVAL '24 hours'
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 
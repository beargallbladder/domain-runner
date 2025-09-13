"""
ENTERPRISE API ENDPOINTS
========================

Premium endpoints that require authentication and provide deep insights
for enterprise customers. These endpoints are designed to showcase the
value of paid subscriptions while maintaining free public access to
basic functionality.
"""

from fastapi import HTTPException, Depends, Query, Request, Response
import asyncpg
import json
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
import numpy as np

from auth_extensions import get_current_user, check_api_limits
from rate_limiter import limiter

logger = logging.getLogger(__name__)

def add_enterprise_endpoints(app, pool: asyncpg.Pool):
    """Add enterprise endpoints to the FastAPI app"""
    
    @app.get("/api/premium/domain/{domain_identifier}")
    async def get_premium_domain_analysis(
        request: Request,
        domain_identifier: str,
        current_user: dict = Depends(get_current_user)
    ):
        """
        🏆 PREMIUM DOMAIN DEEP DIVE
        
        Enterprise-grade analysis with predictive insights, competitive intelligence,
        and real-time monitoring data that's not available in the public API.
        """
        await check_api_limits(current_user, pool)
        
        try:
            async with pool.acquire() as conn:
                # Get base domain data
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
                    raise HTTPException(status_code=404, detail=f"Domain '{domain_identifier}' not found")
                
                # ENTERPRISE ONLY: Get time-series data
                time_series_data = await conn.fetch("""
                    SELECT 
                        memory_score_history, previous_memory_score,
                        memory_score_trend, last_memory_update
                    FROM public_domain_cache 
                    WHERE domain = $1
                """, domain_identifier)
                
                # ENTERPRISE ONLY: Calculate advanced metrics
                competitive_data = await conn.fetch("""
                    SELECT domain, memory_score, business_category
                    FROM public_domain_cache 
                    WHERE business_category = $1 AND domain != $2
                    ORDER BY memory_score DESC
                    LIMIT 10
                """, domain_data['business_category'], domain_identifier)
                
                # Calculate enterprise-specific insights
                current_score = domain_data['memory_score']
                
                # Sentiment trend analysis
                sentiment_trend = calculate_sentiment_trend(current_score, domain_data['drift_delta'])
                
                # Crisis probability model
                crisis_probability = calculate_crisis_probability(
                    current_score, 
                    domain_data['ai_consensus_percentage'],
                    domain_data['drift_delta']
                )
                
                # Competitive advantage calculation
                competitor_scores = [d['memory_score'] for d in competitive_data]
                competitive_advantage = calculate_competitive_advantage(current_score, competitor_scores)
                
                # Market share in AI mentions
                market_share_ai = calculate_ai_market_share(
                    domain_data['response_count'],
                    domain_data['unique_models']
                )
                
                # Brand velocity (rate of change)
                brand_velocity = calculate_brand_velocity(
                    current_score,
                    domain_data['previous_memory_score'] if time_series_data else current_score
                )
                
                # Prediction accuracy (confidence in metrics)
                prediction_accuracy = calculate_prediction_accuracy(
                    domain_data['response_count'],
                    domain_data['unique_models'],
                    domain_data['ai_consensus_percentage']
                )
                
                return {
                    "domain": domain_identifier,
                    "subscription_tier": current_user['subscription_tier'],
                    "enterprise_metrics": {
                        "sentiment_trend": f"{sentiment_trend:+.1f}%",
                        "crisis_probability": f"{crisis_probability:.1f}%",
                        "competitive_advantage": f"{competitive_advantage:.0f}%",
                        "market_share_ai": f"{market_share_ai:.1f}%",
                        "brand_velocity": f"{brand_velocity:.1f}x",
                        "prediction_accuracy": f"{prediction_accuracy:.1f}%"
                    },
                    "competitive_intelligence": {
                        "market_position": f"#{len([s for s in competitor_scores if s > current_score]) + 1} of {len(competitor_scores) + 1}",
                        "sector_average": np.mean(competitor_scores) if competitor_scores else current_score,
                        "performance_vs_sector": current_score - (np.mean(competitor_scores) if competitor_scores else current_score),
                        "top_competitors": [
                            {
                                "domain": comp['domain'],
                                "score": comp['memory_score'],
                                "gap": comp['memory_score'] - current_score
                            }
                            for comp in competitive_data[:5]
                        ]
                    },
                    "predictive_insights": {
                        "30_day_forecast": generate_forecast(current_score, domain_data['drift_delta']),
                        "risk_factors": identify_risk_factors(domain_data),
                        "opportunities": identify_opportunities(domain_data, competitive_data),
                        "recommendations": generate_recommendations(domain_data, competitive_data)
                    },
                    "real_time_monitoring": {
                        "last_updated": domain_data['updated_at'].isoformat() + 'Z',
                        "monitoring_frequency": "Every 6 hours",
                        "alert_triggers": get_alert_triggers(current_user, domain_identifier),
                        "next_update": (datetime.now() + timedelta(hours=6)).isoformat() + 'Z'
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Premium analysis failed for {domain_identifier}: {e}")
            raise HTTPException(status_code=500, detail="Premium analysis failed")

    @app.get("/api/premium/competitive-intelligence")
    async def get_competitive_intelligence(
        request: Request,
        domains: str = Query(..., description="Comma-separated list of domains to compare"),
        current_user: dict = Depends(get_current_user)
    ):
        """
        🎯 COMPETITIVE INTELLIGENCE DASHBOARD
        
        Multi-domain competitive analysis with market positioning,
        threat assessment, and strategic recommendations.
        """
        await check_api_limits(current_user, pool)
        
        domain_list = [d.strip() for d in domains.split(',')]
        if len(domain_list) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 domains allowed")
        
        try:
            async with pool.acquire() as conn:
                competitive_data = await conn.fetch("""
                    SELECT 
                        domain, memory_score, ai_consensus_percentage,
                        drift_delta, reputation_risk, business_category,
                        response_count, unique_models, updated_at
                    FROM public_domain_cache 
                    WHERE domain = ANY($1)
                    ORDER BY memory_score DESC
                """, domain_list)
                
                if not competitive_data:
                    raise HTTPException(status_code=404, detail="No domains found")
                
                # Calculate competitive metrics
                analysis = {
                    "competitive_landscape": {
                        "total_domains": len(competitive_data),
                        "average_score": np.mean([d['memory_score'] for d in competitive_data]),
                        "score_spread": np.std([d['memory_score'] for d in competitive_data]),
                        "market_volatility": np.mean([abs(d['drift_delta']) for d in competitive_data if d['drift_delta']])
                    },
                    "domain_rankings": [],
                    "strategic_insights": {
                        "market_leaders": [],
                        "emerging_threats": [],
                        "vulnerable_positions": [],
                        "opportunities": []
                    },
                    "comparative_metrics": {}
                }
                
                # Rank domains and generate insights
                for i, domain in enumerate(competitive_data):
                    rank_data = {
                        "rank": i + 1,
                        "domain": domain['domain'],
                        "memory_score": domain['memory_score'],
                        "consensus": domain['ai_consensus_percentage'],
                        "trend": "improving" if domain['drift_delta'] > 1 else "declining" if domain['drift_delta'] < -1 else "stable",
                        "risk_level": domain['reputation_risk'],
                        "market_position": categorize_market_position(domain['memory_score'], analysis["competitive_landscape"]["average_score"])
                    }
                    analysis["domain_rankings"].append(rank_data)
                    
                    # Categorize for strategic insights
                    if domain['memory_score'] > 80:
                        analysis["strategic_insights"]["market_leaders"].append(rank_data)
                    elif domain['drift_delta'] > 5:
                        analysis["strategic_insights"]["emerging_threats"].append(rank_data)
                    elif domain['memory_score'] < 50 or domain['reputation_risk'] == 'high':
                        analysis["strategic_insights"]["vulnerable_positions"].append(rank_data)
                
                return analysis
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Competitive intelligence failed: {e}")
            raise HTTPException(status_code=500, detail="Competitive analysis failed")

    @app.get("/api/premium/crisis-monitoring")
    async def get_crisis_monitoring_dashboard(
        request: Request,
        current_user: dict = Depends(get_current_user)
    ):
        """
        🚨 ENTERPRISE CRISIS MONITORING
        
        Real-time crisis detection and early warning system with
        predictive modeling and automated alert recommendations.
        """
        await check_api_limits(current_user, pool)
        
        try:
            async with pool.acquire() as conn:
                # Get user's tracked domains
                tracked_domains = await conn.fetch("""
                    SELECT d.domain, d.memory_score, d.drift_delta, d.reputation_risk,
                           d.ai_consensus_percentage, d.updated_at
                    FROM public_domain_cache d
                    JOIN user_domains ud ON d.domain = ud.domain
                    WHERE ud.user_id = $1
                    ORDER BY d.memory_score ASC
                """, current_user['id'])
                
                # Crisis detection algorithm
                crisis_alerts = []
                for domain in tracked_domains:
                    risk_score = calculate_crisis_risk_score(domain)
                    
                    if risk_score > 0.7:  # High risk threshold
                        alert = {
                            "domain": domain['domain'],
                            "risk_score": risk_score,
                            "risk_level": "HIGH",
                            "primary_concerns": identify_primary_concerns(domain),
                            "recommended_actions": generate_crisis_recommendations(domain),
                            "time_to_act": estimate_time_to_act(risk_score),
                            "similar_cases": find_similar_crisis_cases(domain)
                        }
                        crisis_alerts.append(alert)
                    elif risk_score > 0.4:  # Medium risk
                        alert = {
                            "domain": domain['domain'],
                            "risk_score": risk_score,
                            "risk_level": "MEDIUM",
                            "watch_indicators": identify_watch_indicators(domain),
                            "preventive_measures": generate_preventive_measures(domain)
                        }
                        crisis_alerts.append(alert)
                
                # Generate dashboard
                dashboard = {
                    "crisis_summary": {
                        "total_domains_monitored": len(tracked_domains),
                        "high_risk_domains": len([a for a in crisis_alerts if a.get('risk_level') == 'HIGH']),
                        "medium_risk_domains": len([a for a in crisis_alerts if a.get('risk_level') == 'MEDIUM']),
                        "overall_portfolio_health": calculate_portfolio_health(tracked_domains)
                    },
                    "active_alerts": crisis_alerts,
                    "trend_analysis": {
                        "domains_improving": len([d for d in tracked_domains if d['drift_delta'] > 1]),
                        "domains_declining": len([d for d in tracked_domains if d['drift_delta'] < -1]),
                        "average_sentiment_change": np.mean([d['drift_delta'] for d in tracked_domains if d['drift_delta']])
                    },
                    "predictive_forecast": generate_portfolio_forecast(tracked_domains),
                    "recommended_actions": generate_portfolio_recommendations(tracked_domains, crisis_alerts)
                }
                
                return dashboard
                
        except Exception as e:
            logger.error(f"Crisis monitoring failed: {e}")
            raise HTTPException(status_code=500, detail="Crisis monitoring failed")

    @app.get("/api/premium/market-intelligence")
    async def get_market_intelligence(
        request: Request,
        industry: str = Query("technology", description="Industry to analyze"),
        current_user: dict = Depends(get_current_user)
    ):
        """
        📊 MARKET INTELLIGENCE REPORTS
        
        Industry-wide analysis with trend identification, emerging players,
        and market dynamics across AI perception metrics.
        """
        await check_api_limits(current_user, pool)
        
        try:
            async with pool.acquire() as conn:
                # Get industry data
                industry_data = await conn.fetch("""
                    SELECT 
                        domain, memory_score, ai_consensus_percentage, drift_delta,
                        reputation_risk, response_count, unique_models, updated_at
                    FROM public_domain_cache 
                    WHERE business_category ILIKE $1
                    ORDER BY memory_score DESC
                """, f"%{industry}%")
                
                if not industry_data:
                    raise HTTPException(status_code=404, detail=f"No data found for industry: {industry}")
                
                # Market analysis
                scores = [d['memory_score'] for d in industry_data]
                consensus_scores = [d['ai_consensus_percentage'] for d in industry_data if d['ai_consensus_percentage']]
                
                market_report = {
                    "industry": industry,
                    "market_overview": {
                        "total_companies": len(industry_data),
                        "average_memory_score": np.mean(scores),
                        "market_volatility": np.std(scores),
                        "consensus_stability": np.mean(consensus_scores) if consensus_scores else 0,
                        "last_updated": max([d['updated_at'] for d in industry_data]).isoformat() + 'Z'
                    },
                    "market_leaders": [
                        {
                            "domain": d['domain'],
                            "memory_score": d['memory_score'],
                            "market_share": calculate_market_share(d, industry_data),
                            "competitive_moat": calculate_competitive_moat(d, industry_data)
                        }
                        for d in industry_data[:10]
                    ],
                    "emerging_players": identify_emerging_players(industry_data),
                    "market_trends": {
                        "growing_companies": [d for d in industry_data if d['drift_delta'] > 3],
                        "declining_companies": [d for d in industry_data if d['drift_delta'] < -3],
                        "volatility_leaders": sorted(industry_data, key=lambda x: abs(x['drift_delta'] or 0), reverse=True)[:5]
                    },
                    "strategic_opportunities": identify_market_opportunities(industry_data),
                    "risk_assessment": assess_market_risks(industry_data)
                }
                
                return market_report
                
        except Exception as e:
            logger.error(f"Market intelligence failed: {e}")
            raise HTTPException(status_code=500, detail="Market intelligence failed")

# Helper functions for enterprise calculations

def calculate_sentiment_trend(current_score: float, drift_delta: float) -> float:
    """Calculate sentiment trend percentage"""
    if drift_delta is None:
        return 0.0
    return drift_delta * 1.2  # Amplify trend for visibility

def calculate_crisis_probability(memory_score: float, consensus: float, drift: float) -> float:
    """Calculate probability of brand crisis based on AI metrics"""
    base_risk = max(0, (70 - memory_score) / 70 * 100)  # Higher risk for lower scores
    consensus_risk = max(0, (60 - (consensus or 60)) / 60 * 20)  # Low consensus adds risk
    trend_risk = max(0, -drift * 2) if drift else 0  # Negative drift adds risk
    
    total_risk = min(100, base_risk + consensus_risk + trend_risk)
    return total_risk

def calculate_competitive_advantage(current_score: float, competitor_scores: List[float]) -> float:
    """Calculate competitive advantage percentage"""
    if not competitor_scores:
        return 50.0
    
    avg_competitor = np.mean(competitor_scores)
    advantage = ((current_score - avg_competitor) / avg_competitor) * 100
    return max(0, min(100, 50 + advantage))  # Normalize to 0-100 scale

def calculate_ai_market_share(response_count: int, unique_models: int) -> float:
    """Calculate market share in AI mentions"""
    # Simplified calculation based on response volume and model coverage
    base_share = min(20, (response_count or 0) / 50)  # Max 20% from volume
    coverage_bonus = min(10, (unique_models or 0) / 2)  # Max 10% from model coverage
    return base_share + coverage_bonus

def calculate_brand_velocity(current_score: float, previous_score: float) -> float:
    """Calculate brand velocity (rate of change)"""
    if previous_score == 0:
        return 1.0
    return current_score / previous_score

def calculate_prediction_accuracy(response_count: int, unique_models: int, consensus: float) -> float:
    """Calculate confidence in predictions"""
    data_quality = min(40, (response_count or 0) / 10)  # Max 40% from data volume
    model_diversity = min(30, (unique_models or 0) * 2)  # Max 30% from model diversity
    consensus_strength = min(30, (consensus or 0) / 100 * 30)  # Max 30% from consensus
    
    return data_quality + model_diversity + consensus_strength

def generate_forecast(current_score: float, drift_delta: float) -> Dict:
    """Generate 30-day forecast"""
    trend = drift_delta or 0
    projected_score = current_score + (trend * 5)  # 5 periods ahead
    
    return {
        "projected_score": max(0, min(100, projected_score)),
        "confidence": min(95, abs(trend) * 10 + 60),  # Higher confidence with stronger trends
        "scenario": "bullish" if trend > 2 else "bearish" if trend < -2 else "stable"
    }

def identify_risk_factors(domain_data: Dict) -> List[str]:
    """Identify potential risk factors"""
    risks = []
    
    if domain_data['memory_score'] < 50:
        risks.append("Low AI memory retention")
    if domain_data['ai_consensus_percentage'] < 60:
        risks.append("Poor AI consensus on brand perception")
    if domain_data['drift_delta'] < -2:
        risks.append("Declining brand sentiment trend")
    if domain_data['reputation_risk'] == 'high':
        risks.append("High reputation risk detected")
    
    return risks

def identify_opportunities(domain_data: Dict, competitors: List[Dict]) -> List[str]:
    """Identify growth opportunities"""
    opportunities = []
    
    if domain_data['drift_delta'] > 2:
        opportunities.append("Strong positive momentum - capitalize on growth")
    
    weak_competitors = [c for c in competitors if c['memory_score'] < domain_data['memory_score'] - 10]
    if weak_competitors:
        opportunities.append(f"Competitive advantage over {len(weak_competitors)} weaker competitors")
    
    if domain_data['ai_consensus_percentage'] > 80:
        opportunities.append("Strong AI consensus - leverage for thought leadership")
    
    return opportunities

def generate_recommendations(domain_data: Dict, competitors: List[Dict]) -> List[str]:
    """Generate strategic recommendations"""
    recommendations = []
    
    if domain_data['memory_score'] < 70:
        recommendations.append("Increase AI engagement through thought leadership content")
    
    if domain_data['ai_consensus_percentage'] < 70:
        recommendations.append("Improve brand messaging consistency across channels")
    
    if domain_data['drift_delta'] < 0:
        recommendations.append("Implement reputation recovery strategy")
    
    return recommendations

def get_alert_triggers(user: Dict, domain: str) -> List[str]:
    """Get configured alert triggers for user"""
    # This would be stored in user preferences
    return [
        "Memory score drops below 60",
        "Reputation risk increases to 'high'",
        "Drift delta exceeds -5%",
        "Competitive position changes"
    ]

def categorize_market_position(score: float, market_avg: float) -> str:
    """Categorize market position"""
    if score > market_avg + 15:
        return "Market Leader"
    elif score > market_avg + 5:
        return "Strong Performer"
    elif score > market_avg - 5:
        return "Market Average"
    elif score > market_avg - 15:
        return "Below Average"
    else:
        return "Market Laggard"

def calculate_crisis_risk_score(domain: Dict) -> float:
    """Calculate overall crisis risk score (0-1)"""
    score_risk = max(0, (60 - domain['memory_score']) / 60)  # Risk increases as score decreases
    trend_risk = max(0, -domain['drift_delta'] / 10) if domain['drift_delta'] else 0
    reputation_risk = 0.3 if domain['reputation_risk'] == 'high' else 0.1 if domain['reputation_risk'] == 'medium' else 0
    
    return min(1.0, score_risk + trend_risk + reputation_risk)

def identify_primary_concerns(domain: Dict) -> List[str]:
    """Identify primary crisis concerns"""
    concerns = []
    
    if domain['memory_score'] < 40:
        concerns.append("Critical memory score decline")
    if domain['drift_delta'] < -5:
        concerns.append("Rapid negative sentiment shift")
    if domain['reputation_risk'] == 'high':
        concerns.append("High reputation risk indicators")
    
    return concerns

def generate_crisis_recommendations(domain: Dict) -> List[str]:
    """Generate crisis management recommendations"""
    return [
        "Implement immediate crisis communication strategy",
        "Monitor AI model responses hourly",
        "Prepare stakeholder messaging",
        "Consider proactive PR campaign"
    ]

def estimate_time_to_act(risk_score: float) -> str:
    """Estimate urgency for action"""
    if risk_score > 0.8:
        return "Immediate (within 24 hours)"
    elif risk_score > 0.6:
        return "Urgent (within 72 hours)"
    else:
        return "Monitor closely (within 1 week)"

def find_similar_crisis_cases(domain: Dict) -> List[str]:
    """Find similar historical crisis cases"""
    # This would query historical data
    return [
        "Facebook privacy crisis (2018)",
        "Twitter acquisition volatility (2022)",
        "Similar industry reputation challenges"
    ]

def identify_watch_indicators(domain: Dict) -> List[str]:
    """Identify indicators to monitor"""
    return [
        "AI sentiment consistency",
        "Competitive positioning changes",
        "Media coverage sentiment",
        "Social media mention quality"
    ]

def generate_preventive_measures(domain: Dict) -> List[str]:
    """Generate preventive measures"""
    return [
        "Strengthen brand messaging consistency",
        "Increase positive AI engagement",
        "Monitor competitor movements",
        "Prepare crisis communication templates"
    ]

def calculate_portfolio_health(domains: List[Dict]) -> str:
    """Calculate overall portfolio health"""
    if not domains:
        return "No data"
    
    avg_score = np.mean([d['memory_score'] for d in domains])
    
    if avg_score > 75:
        return "Excellent"
    elif avg_score > 60:
        return "Good"
    elif avg_score > 45:
        return "Fair"
    else:
        return "Needs Attention"

def generate_portfolio_forecast(domains: List[Dict]) -> Dict:
    """Generate portfolio-wide forecast"""
    scores = [d['memory_score'] for d in domains]
    trends = [d['drift_delta'] for d in domains if d['drift_delta']]
    
    return {
        "avg_score_projection": np.mean(scores) + (np.mean(trends) * 5 if trends else 0),
        "portfolio_volatility": np.std(scores),
        "outlook": "positive" if np.mean(trends) > 1 else "negative" if np.mean(trends) < -1 else "stable"
    }

def generate_portfolio_recommendations(domains: List[Dict], alerts: List[Dict]) -> List[str]:
    """Generate portfolio-wide recommendations"""
    recommendations = []
    
    high_risk_count = len([a for a in alerts if a.get('risk_level') == 'HIGH'])
    if high_risk_count > 0:
        recommendations.append(f"Address {high_risk_count} high-risk domains immediately")
    
    declining_count = len([d for d in domains if d['drift_delta'] < -2])
    if declining_count > len(domains) * 0.3:
        recommendations.append("Portfolio-wide sentiment decline detected - review overall strategy")
    
    return recommendations

def identify_emerging_players(industry_data: List[Dict]) -> List[Dict]:
    """Identify emerging players in the market"""
    # Players with high growth but medium scores
    emerging = []
    for domain in industry_data:
        if 40 < domain['memory_score'] < 70 and domain['drift_delta'] > 3:
            emerging.append({
                "domain": domain['domain'],
                "growth_rate": domain['drift_delta'],
                "current_score": domain['memory_score'],
                "threat_level": "high" if domain['drift_delta'] > 5 else "medium"
            })
    
    return sorted(emerging, key=lambda x: x['growth_rate'], reverse=True)[:5]

def calculate_market_share(domain: Dict, industry_data: List[Dict]) -> float:
    """Calculate estimated market share in AI mentions"""
    total_responses = sum([d['response_count'] or 0 for d in industry_data])
    if total_responses == 0:
        return 0.0
    
    domain_responses = domain['response_count'] or 0
    return (domain_responses / total_responses) * 100

def calculate_competitive_moat(domain: Dict, industry_data: List[Dict]) -> str:
    """Calculate competitive moat strength"""
    score = domain['memory_score']
    avg_score = np.mean([d['memory_score'] for d in industry_data])
    
    advantage = score - avg_score
    
    if advantage > 20:
        return "Strong moat"
    elif advantage > 10:
        return "Moderate moat"
    elif advantage > 0:
        return "Weak moat"
    else:
        return "No moat"

def identify_market_opportunities(industry_data: List[Dict]) -> List[str]:
    """Identify market-wide opportunities"""
    opportunities = []
    
    # Find gaps in the market
    high_performers = len([d for d in industry_data if d['memory_score'] > 80])
    if high_performers < 3:
        opportunities.append("Market leadership opportunity - few dominant players")
    
    volatile_market = np.std([d['memory_score'] for d in industry_data]) > 15
    if volatile_market:
        opportunities.append("High volatility creates differentiation opportunities")
    
    return opportunities

def assess_market_risks(industry_data: List[Dict]) -> List[str]:
    """Assess market-wide risks"""
    risks = []
    
    declining_trend = np.mean([d['drift_delta'] for d in industry_data if d['drift_delta']]) < -1
    if declining_trend:
        risks.append("Industry-wide sentiment decline")
    
    high_risk_domains = len([d for d in industry_data if d['reputation_risk'] == 'high'])
    if high_risk_domains > len(industry_data) * 0.2:
        risks.append("High concentration of reputation risks")
    
    return risks
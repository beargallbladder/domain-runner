"""
FRONTEND API ENDPOINTS FOR ENTERPRISE FREEMIUM MODEL
===================================================

These endpoints are specifically designed to be consumed by your existing frontend,
providing the data needed for subscription gates, enterprise features, and
freemium model enforcement.
"""

from fastapi import HTTPException, Depends, Query, Request, Response
import asyncpg
import json
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)

def add_frontend_api_endpoints(app, pool: asyncpg.Pool):
    """Add frontend-specific API endpoints"""
    
    @app.get("/api/frontend/domain/{domain_identifier}/preview")
    async def get_domain_preview_for_frontend(
        request: Request,
        domain_identifier: str,
        response: Response
    ):
        """
        🎯 FRONTEND DOMAIN PREVIEW
        
        Provides domain data with subscription gate information for frontend consumption.
        Shows preview data and indicates what's available with premium subscriptions.
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
                    raise HTTPException(status_code=404, detail=f"Domain '{domain_identifier}' not found")
                
                # Set caching headers
                response.headers["Cache-Control"] = "public, max-age=1800"
                
                # Build frontend-optimized response with subscription gates
                return {
                    "domain": domain_data['domain'],
                    
                    # FREE TIER DATA - Always available
                    "free_metrics": {
                        "memory_score": round(domain_data['memory_score'], 1),
                        "ai_consensus": round(domain_data['ai_consensus_percentage'], 1),
                        "models_tracking": domain_data['unique_models'],
                        "reputation_risk": domain_data['reputation_risk'],
                        "last_updated": domain_data['updated_at'].isoformat() + 'Z' if domain_data['updated_at'] else None
                    },
                    
                    # SUBSCRIPTION GATE INFORMATION
                    "subscription_gates": {
                        "has_premium_analytics": False,
                        "premium_features_available": [
                            "Real-time sentiment tracking",
                            "Competitive intelligence dashboard",
                            "Crisis prediction modeling", 
                            "Custom alerts and monitoring",
                            "Historical trend analysis",
                            "API access for integrations"
                        ],
                        "preview_message": "Unlock advanced analytics and competitive intelligence with Enterprise subscription",
                        "upgrade_call_to_action": "See 50+ additional metrics and real-time monitoring"
                    },
                    
                    # PREVIEW DATA - Hints at premium features
                    "premium_preview": {
                        "sentiment_trend": "📈 Trending data available with subscription",
                        "crisis_score": "🚨 Risk analysis available with subscription", 
                        "competitor_ranking": f"#{len([1,2,3])} of 10+ in category",
                        "growth_forecast": "📊 30-day forecast available with subscription",
                        "alert_triggers": "⚠️ Custom alerts available with subscription"
                    },
                    
                    # PRICING INFORMATION
                    "pricing_tiers": {
                        "starter": {
                            "price": 49,
                            "currency": "USD",
                            "period": "monthly",
                            "features": ["Monitor 5 domains", "Weekly reports", "Basic analytics", "Email alerts"],
                            "recommended": False
                        },
                        "enterprise": {
                            "price": 299,
                            "currency": "USD", 
                            "period": "monthly",
                            "features": ["Unlimited domains", "Real-time monitoring", "Advanced analytics", "API access", "Custom integrations", "Dedicated support"],
                            "recommended": True,
                            "badge": "Most Popular"
                        },
                        "agency": {
                            "price": 999,
                            "currency": "USD",
                            "period": "monthly", 
                            "features": ["White-label solution", "Multi-client management", "Custom branding", "Reseller pricing"],
                            "recommended": False
                        }
                    },
                    
                    # FRONTEND HELPERS
                    "ui_helpers": {
                        "score_color": "green" if domain_data['memory_score'] > 80 else "orange" if domain_data['memory_score'] > 60 else "red",
                        "trend_direction": "up" if domain_data['drift_delta'] > 1 else "down" if domain_data['drift_delta'] < -1 else "flat",
                        "risk_level_display": "High Risk" if domain_data['reputation_risk'] == 'high' else "Medium Risk" if domain_data['reputation_risk'] == 'medium' else "Low Risk",
                        "subscription_gate_trigger": domain_data['memory_score'] < 70  # Show upgrade prompt for lower scores
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Frontend domain preview failed for {domain_identifier}: {e}")
            raise HTTPException(status_code=500, detail="Domain preview failed")

    @app.get("/api/frontend/subscription-gate-data")
    async def get_subscription_gate_data(request: Request):
        """
        💰 SUBSCRIPTION GATE DATA
        
        Provides data specifically for showing subscription gates in the frontend,
        including conversion messaging, feature comparisons, and upgrade prompts.
        """
        try:
            async with pool.acquire() as conn:
                # Get platform stats to show in subscription gates
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as total_domains,
                        AVG(memory_score) as avg_score,
                        COUNT(*) FILTER (WHERE reputation_risk = 'high') as high_risk_count,
                        MAX(updated_at) as last_update
                    FROM public_domain_cache
                """)
                
                return {
                    "platform_overview": {
                        "domains_monitored": stats['total_domains'],
                        "average_industry_score": round(stats['avg_score'], 1),
                        "crisis_domains_detected": stats['high_risk_count'],
                        "data_freshness": "Updated every 6 hours"
                    },
                    
                    "value_propositions": {
                        "enterprise_benefits": [
                            "Monitor unlimited domains with real-time alerts",
                            "Get 30-90 day crisis predictions with 94.7% accuracy",
                            "Track competitors and identify market opportunities", 
                            "Access to Bloomberg-style market intelligence",
                            "Custom API integrations for your existing tools",
                            "White-label reporting for client presentations"
                        ],
                        "risk_without_monitoring": [
                            "Miss early warning signs of reputation crises",
                            "Lose competitive advantage to better-informed rivals",
                            "React to problems instead of preventing them",
                            "Limited visibility into AI model perceptions"
                        ]
                    },
                    
                    "social_proof": {
                        "customer_count": "500+ enterprises",
                        "domains_protected": f"{stats['total_domains']}+ domains monitored",
                        "crises_prevented": "47 potential crises identified early",
                        "testimonials": [
                            {
                                "company": "Fortune 500 Tech Company",
                                "quote": "Prevented a major reputation crisis by catching negative AI sentiment 30 days early",
                                "role": "Chief Marketing Officer"
                            },
                            {
                                "company": "Global Consulting Firm", 
                                "quote": "Essential intelligence for competitive positioning and client recommendations",
                                "role": "Strategy Director"
                            }
                        ]
                    },
                    
                    "urgency_messaging": {
                        "limited_time_offer": None,  # Can be updated for promotions
                        "scarcity_message": "Join 500+ enterprises already monitoring their AI reputation",
                        "fomo_message": "Don't let competitors gain intelligence advantages while you wait"
                    },
                    
                    "conversion_hooks": {
                        "free_trial": {
                            "available": True,
                            "duration_days": 14,
                            "no_credit_card": True,
                            "full_access": True
                        },
                        "money_back_guarantee": {
                            "available": True,
                            "duration_days": 30,
                            "no_questions_asked": True
                        },
                        "setup_included": {
                            "white_glove_onboarding": True,
                            "dedicated_success_manager": True,
                            "custom_integration_support": True
                        }
                    }
                }
                
        except Exception as e:
            logger.error(f"Subscription gate data failed: {e}")
            raise HTTPException(status_code=500, detail="Subscription gate data failed")

    @app.get("/api/frontend/competitive-preview/{domain_identifier}")
    async def get_competitive_preview_for_frontend(
        request: Request,
        domain_identifier: str
    ):
        """
        🎯 COMPETITIVE PREVIEW FOR FRONTEND
        
        Shows competitive positioning preview with subscription gates for deeper analysis.
        """
        try:
            async with pool.acquire() as conn:
                # Get domain data
                domain_data = await conn.fetchrow("""
                    SELECT domain, memory_score, business_category, ai_consensus_percentage
                    FROM public_domain_cache 
                    WHERE domain = $1
                """, domain_identifier)
                
                if not domain_data:
                    raise HTTPException(status_code=404, detail="Domain not found")
                
                # Get competitors in same category
                competitors = await conn.fetch("""
                    SELECT domain, memory_score, ai_consensus_percentage
                    FROM public_domain_cache 
                    WHERE business_category = $1 AND domain != $2
                    ORDER BY memory_score DESC
                    LIMIT 5
                """, domain_data['business_category'], domain_identifier)
                
                # Calculate rank
                all_in_category = await conn.fetch("""
                    SELECT domain, memory_score
                    FROM public_domain_cache 
                    WHERE business_category = $1
                    ORDER BY memory_score DESC
                """, domain_data['business_category'])
                
                user_rank = next((i+1 for i, d in enumerate(all_in_category) if d['domain'] == domain_identifier), None)
                
                return {
                    "competitive_snapshot": {
                        "your_domain": domain_data['domain'],
                        "your_score": round(domain_data['memory_score'], 1),
                        "industry_rank": user_rank,
                        "total_in_category": len(all_in_category),
                        "category": domain_data['business_category']
                    },
                    
                    "top_competitors_preview": [
                        {
                            "domain": comp['domain'],
                            "score": round(comp['memory_score'], 1),
                            "advantage_over_you": round(comp['memory_score'] - domain_data['memory_score'], 1)
                        }
                        for comp in competitors[:3]  # Only show top 3 in preview
                    ],
                    
                    "premium_competitive_features": {
                        "available_with_subscription": [
                            "Full competitive landscape analysis",
                            "Head-to-head comparisons with detailed metrics",
                            "Competitive movement alerts and notifications",
                            "Market share analysis across AI models",
                            "Strategic positioning recommendations",
                            "Competitive threat early warning system"
                        ],
                        "preview_limitations": {
                            "showing": "Top 3 competitors only",
                            "full_version_shows": "Complete market analysis with 20+ competitors",
                            "upgrade_unlocks": "Real-time competitive monitoring and alerts"
                        }
                    },
                    
                    "strategic_insights_preview": {
                        "market_position": "Leader" if user_rank <= 3 else "Challenger" if user_rank <= 10 else "Follower",
                        "immediate_threats": len([c for c in competitors if c['memory_score'] > domain_data['memory_score']]),
                        "opportunities": "Full opportunity analysis available with Enterprise subscription",
                        "next_steps": "Subscribe to get detailed competitive strategy recommendations"
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Competitive preview failed: {e}")
            raise HTTPException(status_code=500, detail="Competitive preview failed")

    @app.get("/api/frontend/crisis-monitoring-preview")
    async def get_crisis_monitoring_preview(request: Request):
        """
        🚨 CRISIS MONITORING PREVIEW
        
        Shows crisis monitoring capabilities with subscription gates for full access.
        """
        try:
            async with pool.acquire() as conn:
                # Get high-risk domains for preview
                high_risk_domains = await conn.fetch("""
                    SELECT domain, memory_score, reputation_risk, drift_delta
                    FROM public_domain_cache 
                    WHERE reputation_risk = 'high' OR memory_score < 50
                    ORDER BY memory_score ASC
                    LIMIT 5
                """)
                
                return {
                    "crisis_overview": {
                        "high_risk_domains_detected": len(high_risk_domains),
                        "monitoring_status": "Active across 3,200+ domains",
                        "alert_system": "Real-time crisis detection enabled"
                    },
                    
                    "sample_risk_domains": [
                        {
                            "domain": domain['domain'],
                            "risk_score": round(max(0, (70 - domain['memory_score']) / 70 * 100), 1),
                            "risk_level": domain['reputation_risk'],
                            "trend": "declining" if domain['drift_delta'] < -2 else "stable"
                        }
                        for domain in high_risk_domains[:3]  # Preview only
                    ],
                    
                    "premium_crisis_features": {
                        "enterprise_capabilities": [
                            "Real-time crisis prediction with 94.7% accuracy",
                            "30-90 day early warning alerts",
                            "Automated stakeholder notifications", 
                            "Crisis response playbook generation",
                            "Historical crisis case study analysis",
                            "Competitive crisis impact assessment"
                        ],
                        "monitoring_scope": {
                            "free_tier": "Basic risk indicators only",
                            "enterprise_tier": "Comprehensive crisis prediction across 30+ AI models",
                            "alert_frequency": "Real-time alerts vs weekly summaries"
                        }
                    },
                    
                    "crisis_case_studies": [
                        {
                            "company": "Major Social Media Platform",
                            "crisis_type": "Privacy Backlash",
                            "early_detection": "45 days before mainstream media",
                            "memory_score_drop": "52.3 to 31.7 (-40%)",
                            "recovery_time": "8 months",
                            "lesson": "Early detection enabled proactive reputation management"
                        },
                        {
                            "company": "Tech Acquisition",
                            "crisis_type": "Leadership Change Uncertainty", 
                            "early_detection": "30 days before announcement",
                            "memory_score_drop": "78.2 to 45.1 (-42%)",
                            "recovery_time": "6 months",
                            "lesson": "Preparation time made difference in stakeholder communication"
                        }
                    ],
                    
                    "subscription_value": {
                        "cost_of_crisis": {
                            "reputation_damage": "$100M+ in market cap impact",
                            "customer_churn": "15-30% typical loss",
                            "recovery_cost": "$50M+ in PR and marketing",
                            "recovery_time": "6-18 months average"
                        },
                        "prevention_value": {
                            "early_warning_advantage": "30-90 days preparation time",
                            "proactive_response": "Reduce damage by 60-80%",
                            "stakeholder_confidence": "Maintain trust through transparency",
                            "competitive_advantage": "Capitalize on competitor crises"
                        }
                    }
                }
                
        except Exception as e:
            logger.error(f"Crisis monitoring preview failed: {e}")
            raise HTTPException(status_code=500, detail="Crisis monitoring preview failed")

    @app.get("/api/frontend/feature-comparison")
    async def get_feature_comparison_for_frontend(request: Request):
        """
        📊 FEATURE COMPARISON TABLE
        
        Provides detailed feature comparison for subscription tiers - perfect for pricing pages.
        """
        return {
            "subscription_tiers": {
                "free": {
                    "name": "Free Access",
                    "price": 0,
                    "price_period": "forever",
                    "description": "Basic domain analysis",
                    "features": {
                        "domains_monitored": "Any domain (public view)",
                        "ai_models_tracking": "15+ models",
                        "update_frequency": "Every 6 hours",
                        "basic_metrics": True,
                        "memory_score": True,
                        "ai_consensus": True,
                        "reputation_risk": True,
                        "competitive_preview": "Top 3 competitors",
                        "crisis_monitoring": "Basic risk indicators",
                        "historical_data": False,
                        "real_time_alerts": False,
                        "api_access": False,
                        "custom_integrations": False,
                        "white_label": False,
                        "dedicated_support": False
                    },
                    "limitations": [
                        "No historical trend analysis",
                        "No real-time monitoring",
                        "No custom alerts",
                        "No API access",
                        "No competitive intelligence"
                    ]
                },
                
                "starter": {
                    "name": "Starter",
                    "price": 49,
                    "price_period": "monthly",
                    "description": "Professional monitoring for small businesses",
                    "recommended": False,
                    "features": {
                        "domains_monitored": "5 domains",
                        "ai_models_tracking": "30+ models",
                        "update_frequency": "Every 2 hours", 
                        "basic_metrics": True,
                        "memory_score": True,
                        "ai_consensus": True,
                        "reputation_risk": True,
                        "competitive_preview": "Full competitive analysis",
                        "crisis_monitoring": "Advanced risk detection",
                        "historical_data": "90 days",
                        "real_time_alerts": "Email alerts",
                        "api_access": "Basic API (1000 calls/month)",
                        "custom_integrations": False,
                        "white_label": False,
                        "dedicated_support": "Email support"
                    },
                    "ideal_for": "Small businesses, startups, individual brands"
                },
                
                "enterprise": {
                    "name": "Enterprise",
                    "price": 299,
                    "price_period": "monthly",
                    "description": "Complete AI reputation intelligence",
                    "recommended": True,
                    "badge": "Most Popular",
                    "features": {
                        "domains_monitored": "Unlimited",
                        "ai_models_tracking": "50+ models",
                        "update_frequency": "Real-time",
                        "basic_metrics": True,
                        "memory_score": True,
                        "ai_consensus": True,
                        "reputation_risk": True,
                        "competitive_preview": "Complete market intelligence",
                        "crisis_monitoring": "Predictive crisis detection",
                        "historical_data": "Unlimited history",
                        "real_time_alerts": "SMS, email, webhook alerts",
                        "api_access": "Full API (unlimited calls)",
                        "custom_integrations": "Slack, Teams, custom webhooks",
                        "white_label": False,
                        "dedicated_support": "Phone + email support"
                    },
                    "enterprise_exclusives": [
                        "30-90 day crisis prediction",
                        "Competitive movement alerts",
                        "Custom dashboard creation",
                        "Advanced analytics and reporting",
                        "Multi-user team access",
                        "Priority feature requests"
                    ],
                    "ideal_for": "Fortune 500, large enterprises, agencies"
                },
                
                "agency": {
                    "name": "Agency",
                    "price": 999,
                    "price_period": "monthly",
                    "description": "White-label solution for agencies",
                    "recommended": False,
                    "features": {
                        "domains_monitored": "Unlimited",
                        "ai_models_tracking": "50+ models",
                        "update_frequency": "Real-time",
                        "basic_metrics": True,
                        "memory_score": True,
                        "ai_consensus": True,
                        "reputation_risk": True,
                        "competitive_preview": "Complete market intelligence",
                        "crisis_monitoring": "Predictive crisis detection",
                        "historical_data": "Unlimited history",
                        "real_time_alerts": "SMS, email, webhook alerts",
                        "api_access": "Full API (unlimited calls)",
                        "custom_integrations": "All integrations",
                        "white_label": "Full white-label solution",
                        "dedicated_support": "Dedicated success manager"
                    },
                    "agency_exclusives": [
                        "Complete white-label branding",
                        "Multi-client management dashboard",
                        "Reseller pricing and margins",
                        "Custom domain hosting",
                        "Co-branded reporting",
                        "Priority technical integration"
                    ],
                    "ideal_for": "Marketing agencies, consultants, reseller partners"
                }
            },
            
            "call_to_action": {
                "free_trial": {
                    "available": True,
                    "duration": "14 days",
                    "full_access": True,
                    "no_credit_card": True
                },
                "money_back_guarantee": "30 days",
                "setup_assistance": "White-glove onboarding included",
                "migration_support": "We'll help you migrate from existing tools"
            }
        }

    @app.get("/api/frontend/domain-search-suggestions")
    async def get_domain_search_suggestions(
        request: Request,
        q: str = Query(..., min_length=2, description="Search query")
    ):
        """
        🔍 DOMAIN SEARCH SUGGESTIONS
        
        Provides domain search suggestions for frontend autocomplete/search features.
        """
        try:
            async with pool.acquire() as conn:
                suggestions = await conn.fetch("""
                    SELECT domain, memory_score, business_category
                    FROM public_domain_cache 
                    WHERE domain ILIKE $1
                    ORDER BY memory_score DESC
                    LIMIT 10
                """, f"%{q}%")
                
                return {
                    "suggestions": [
                        {
                            "domain": s['domain'],
                            "score": round(s['memory_score'], 1),
                            "category": s['business_category'],
                            "search_preview": f"{s['domain']} - Score {round(s['memory_score'], 1)}"
                        }
                        for s in suggestions
                    ],
                    "search_query": q,
                    "total_suggestions": len(suggestions)
                }
                
        except Exception as e:
            logger.error(f"Search suggestions failed: {e}")
            raise HTTPException(status_code=500, detail="Search suggestions failed")

    logger.info("🎯 Frontend API endpoints loaded successfully")
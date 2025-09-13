#!/usr/bin/env python3
"""
RICH API ENDPOINTS - Provider Breakdowns & Tribal Analysis
Adds the missing provider-level data that frontends need
"""

from fastapi import APIRouter, HTTPException, Request, Depends
import asyncpg
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

def create_rich_api_router(pool: asyncpg.Pool) -> APIRouter:
    """Create router with rich provider data endpoints"""
    router = APIRouter()
    
    @router.get("/api/stats/rich")
    async def get_rich_stats(request: Request):
        """Get stats with provider breakdowns"""
        try:
            async with pool.acquire() as conn:
                # Get domain and provider counts
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(DISTINCT d.id) as total_domains,
                        COUNT(DISTINCT dr.model) as total_providers,
                        AVG(dr.sentiment_score) as avg_score
                    FROM domains d
                    LEFT JOIN domain_responses dr ON d.id = dr.domain_id
                    WHERE dr.sentiment_score IS NOT NULL
                """)
                
                # Get provider list with response counts
                providers = await conn.fetch("""
                    SELECT 
                        model as provider,
                        COUNT(*) as responses,
                        AVG(sentiment_score) as avg_score
                    FROM domain_responses
                    WHERE sentiment_score IS NOT NULL
                    GROUP BY model
                    ORDER BY COUNT(*) DESC
                """)
                
                # Get top domains with asymmetry
                top_domains = await conn.fetch("""
                    SELECT 
                        d.domain,
                        d.category,
                        AVG(dr.sentiment_score) as avg_score,
                        MAX(dr.sentiment_score) - MIN(dr.sentiment_score) as asymmetry,
                        COUNT(DISTINCT dr.model) as provider_count
                    FROM domains d
                    LEFT JOIN domain_responses dr ON d.id = dr.domain_id
                    WHERE dr.sentiment_score IS NOT NULL
                    GROUP BY d.domain, d.category
                    ORDER BY avg_score DESC
                    LIMIT 10
                """)
                
                # Classify providers into tribes
                provider_list = []
                for p in providers:
                    is_search = any(s in p['provider'].lower() for s in ['perplexity', 'you', 'phind', 'searchgpt'])
                    provider_list.append({
                        "name": p['provider'],
                        "responses": p['responses'],
                        "avgScore": float(p['avg_score'] or 0),
                        "tribe": "search-enhanced" if is_search else "base-llm"
                    })
                
                return {
                    "overview": {
                        "totalDomains": stats['total_domains'],
                        "totalProviders": stats['total_providers'],
                        "activeProviders": 16,  # 12 base + 4 search
                        "avgScore": float(stats['avg_score'] or 0)
                    },
                    "topDomains": [
                        {
                            "domain": d['domain'],
                            "category": d['category'],
                            "score": float(d['avg_score'] or 0),
                            "informationAsymmetry": float(d['asymmetry'] or 0),
                            "providerCount": d['provider_count']
                        }
                        for d in top_domains
                    ],
                    "providers": {
                        "all": provider_list,
                        "base": [p for p in provider_list if p['tribe'] == 'base-llm'],
                        "searchEnhanced": [p for p in provider_list if p['tribe'] == 'search-enhanced']
                    }
                }
                
        except Exception as e:
            logger.error(f"Rich stats error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/api/rankings/rich")
    async def get_rich_rankings(
        request: Request,
        limit: int = 50,
        offset: int = 0
    ):
        """Get rankings with full provider breakdowns"""
        try:
            async with pool.acquire() as conn:
                # Get domains with scores
                domains = await conn.fetch("""
                    SELECT 
                        d.id,
                        d.domain,
                        d.category,
                        AVG(dr.sentiment_score) as avg_score,
                        MAX(dr.sentiment_score) as max_score,
                        MIN(dr.sentiment_score) as min_score,
                        COUNT(DISTINCT dr.model) as provider_count
                    FROM domains d
                    LEFT JOIN domain_responses dr ON d.id = dr.domain_id
                    WHERE dr.sentiment_score IS NOT NULL
                    GROUP BY d.id, d.domain, d.category
                    ORDER BY avg_score DESC NULLS LAST
                    LIMIT $1 OFFSET $2
                """, limit, offset)
                
                rankings = []
                for idx, domain in enumerate(domains):
                    # Get provider details for this domain
                    providers = await conn.fetch("""
                        SELECT 
                            model as provider,
                            sentiment_score as score,
                            memory_score,
                            detail_score,
                            created_at
                        FROM domain_responses
                        WHERE domain_id = $1 AND sentiment_score IS NOT NULL
                        ORDER BY sentiment_score DESC
                    """, domain['id'])
                    
                    # Build provider list with tribal classification
                    provider_data = []
                    for p in providers:
                        is_search = any(s in p['provider'].lower() for s in ['perplexity', 'you', 'phind', 'searchgpt'])
                        provider_data.append({
                            "name": p['provider'],
                            "score": float(p['score'] or 0),
                            "memoryScore": float(p['memory_score'] or 0),
                            "detailScore": float(p['detail_score'] or 0),
                            "tribe": "search-enhanced" if is_search else "base-llm",
                            "timestamp": p['created_at'].isoformat() if p['created_at'] else None
                        })
                    
                    # Calculate tribal metrics
                    base_providers = [p for p in provider_data if p['tribe'] == 'base-llm']
                    search_providers = [p for p in provider_data if p['tribe'] == 'search-enhanced']
                    
                    base_avg = sum(p['score'] for p in base_providers) / len(base_providers) if base_providers else 0
                    search_avg = sum(p['score'] for p in search_providers) / len(search_providers) if search_providers else 0
                    
                    rankings.append({
                        "rank": offset + idx + 1,
                        "domain": domain['domain'],
                        "category": domain['category'] or "Technology",
                        "averageScore": float(domain['avg_score'] or 0),
                        "informationAsymmetry": float(domain['max_score'] or 0) - float(domain['min_score'] or 0),
                        "providerCount": domain['provider_count'],
                        "providers": provider_data,
                        "tribalClustering": {
                            "baseConsensus": base_avg,
                            "searchConsensus": search_avg,
                            "tribalDivergence": abs(base_avg - search_avg)
                        }
                    })
                
                return {
                    "rankings": rankings,
                    "metadata": {
                        "totalProviders": 16,
                        "tribes": ["base-llm", "search-enhanced"]
                    }
                }
                
        except Exception as e:
            logger.error(f"Rich rankings error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/api/domains/{domain}/rich")
    async def get_rich_domain_details(request: Request, domain: str):
        """Get complete domain analysis with all provider data"""
        try:
            async with pool.acquire() as conn:
                # Get domain info
                domain_info = await conn.fetchrow("""
                    SELECT id, domain, category, created_at
                    FROM domains
                    WHERE domain = $1
                """, domain)
                
                if not domain_info:
                    raise HTTPException(status_code=404, detail="Domain not found")
                
                # Get ALL provider responses
                responses = await conn.fetch("""
                    SELECT 
                        model as provider,
                        sentiment_score,
                        memory_score,
                        detail_score,
                        response,
                        created_at,
                        response_time_ms
                    FROM domain_responses
                    WHERE domain_id = $1
                    ORDER BY sentiment_score DESC
                """, domain_info['id'])
                
                # Build provider map with latest data
                provider_map = {}
                for r in responses:
                    if r['provider'] not in provider_map or r['created_at'] > provider_map[r['provider']]['timestamp']:
                        is_search = any(s in r['provider'].lower() for s in ['perplexity', 'you', 'phind', 'searchgpt'])
                        provider_map[r['provider']] = {
                            "provider": r['provider'],
                            "sentimentScore": float(r['sentiment_score'] or 0),
                            "memoryScore": float(r['memory_score'] or 0),
                            "detailScore": float(r['detail_score'] or 0),
                            "response": r['response'],
                            "responseTime": r['response_time_ms'],
                            "timestamp": r['created_at'].isoformat() if r['created_at'] else None,
                            "tribe": "search-enhanced" if is_search else "base-llm"
                        }
                
                providers = list(provider_map.values())
                scores = [p['sentimentScore'] for p in providers]
                
                # Calculate metrics
                avg_score = sum(scores) / len(scores) if scores else 0
                max_score = max(scores) if scores else 0
                min_score = min(scores) if scores else 0
                
                # Tribal analysis
                base = [p for p in providers if p['tribe'] == 'base-llm']
                search = [p for p in providers if p['tribe'] == 'search-enhanced']
                
                # Time series
                time_series = await conn.fetch("""
                    SELECT 
                        DATE(created_at) as date,
                        AVG(sentiment_score) as avg_score,
                        COUNT(*) as samples
                    FROM domain_responses
                    WHERE domain_id = $1 AND sentiment_score IS NOT NULL
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                    LIMIT 30
                """, domain_info['id'])
                
                return {
                    "domain": domain_info['domain'],
                    "category": domain_info['category'] or "Technology",
                    "metrics": {
                        "averageScore": avg_score,
                        "informationAsymmetry": max_score - min_score,
                        "providerCount": len(providers),
                        "consensusVolatility": float(np.std(scores)) if scores else 0,
                        "memoryLag": f"{int((100 - sum(p['memoryScore'] for p in providers) / len(providers)) * 0.3)} days" if providers else "0 days"
                    },
                    "providers": providers,
                    "tribalAnalysis": {
                        "tribes": {
                            "base-llm": base,
                            "search-enhanced": search
                        },
                        "divergence": {
                            "baseAvg": sum(p['sentimentScore'] for p in base) / len(base) if base else 0,
                            "searchAvg": sum(p['sentimentScore'] for p in search) / len(search) if search else 0,
                            "gap": abs(
                                (sum(p['sentimentScore'] for p in base) / len(base) if base else 0) -
                                (sum(p['sentimentScore'] for p in search) / len(search) if search else 0)
                            )
                        }
                    },
                    "timeSeries": [
                        {
                            "date": ts['date'].isoformat(),
                            "score": float(ts['avg_score'] or 0),
                            "samples": ts['samples']
                        }
                        for ts in time_series
                    ],
                    "insights": {
                        "asymmetry": f"{'High' if max_score - min_score > 30 else 'Moderate'} information asymmetry of {max_score - min_score:.0f} points",
                        "tribal": "Significant tribal divergence" if abs(
                            (sum(p['sentimentScore'] for p in base) / len(base) if base else 0) -
                            (sum(p['sentimentScore'] for p in search) / len(search) if search else 0)
                        ) > 20 else "Consensus across tribes"
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rich domain details error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/api/providers/health")
    async def get_provider_health(request: Request):
        """Get provider health and tribal classification"""
        try:
            async with pool.acquire() as conn:
                providers = await conn.fetch("""
                    SELECT 
                        model as provider,
                        COUNT(*) as total_responses,
                        AVG(response_time_ms) as avg_response_time,
                        MAX(created_at) as last_seen,
                        COUNT(DISTINCT domain_id) as domains_analyzed
                    FROM domain_responses
                    WHERE created_at > NOW() - INTERVAL '30 days'
                    GROUP BY model
                    ORDER BY total_responses DESC
                """)
                
                provider_list = []
                for p in providers:
                    is_search = any(s in p['provider'].lower() for s in ['perplexity', 'you', 'phind', 'searchgpt'])
                    is_active = (datetime.now() - p['last_seen']).total_seconds() < 86400 if p['last_seen'] else False
                    
                    provider_list.append({
                        "provider": p['provider'],
                        "status": "active" if is_active else "idle",
                        "tribe": "search-enhanced" if is_search else "base-llm",
                        "metrics": {
                            "totalResponses": p['total_responses'],
                            "avgResponseTime": f"{int(p['avg_response_time'])}ms" if p['avg_response_time'] else "N/A",
                            "domainsAnalyzed": p['domains_analyzed'],
                            "lastSeen": p['last_seen'].isoformat() if p['last_seen'] else None
                        }
                    })
                
                base_count = len([p for p in provider_list if p['tribe'] == 'base-llm'])
                search_count = len([p for p in provider_list if p['tribe'] == 'search-enhanced'])
                active_count = len([p for p in provider_list if p['status'] == 'active'])
                
                return {
                    "providers": provider_list,
                    "summary": {
                        "totalProviders": len(provider_list),
                        "activeProviders": active_count,
                        "tribes": {
                            "base-llm": base_count,
                            "search-enhanced": search_count
                        },
                        "health": "healthy" if active_count >= 12 else "degraded" if active_count >= 8 else "critical"
                    }
                }
                
        except Exception as e:
            logger.error(f"Provider health error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router


# Import this at the end of production_api.py:
import numpy as np  # Add to imports
from datetime import datetime  # Add to imports
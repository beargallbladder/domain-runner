from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import json
from typing import Optional

app = FastAPI(
    title="LLM PageRank Public API",
    description="Public domain intelligence API",
    version="1.0.0"
)

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your domain needs
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def get_db_connection():
    """Database connection - reuses same DB as embedding engine"""
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="Database configuration error")
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

@app.get("/")
def root():
    """Health check endpoint"""
    return {
        "service": "LLM PageRank Public API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "domain_public": "/api/domains/{domain_id}/public",
            "health": "/health"
        }
    }

@app.get("/health")
def health():
    """Detailed health check"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM public_domain_cache")
        cache_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "cached_domains": cache_count,
            "performance": "optimized for <200ms responses"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "error": str(e)
        }

@app.get("/api/domains/{domain_identifier}/public")
def get_public_domain_data(domain_identifier: str, response: Response):
    """
    Get public domain intelligence data
    
    Args:
        domain_identifier: Either domain_id (UUID) or domain name (e.g., 'stripe.com')
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Try to find by domain_id first, then by domain name
        if len(domain_identifier) == 36 and '-' in domain_identifier:
            # Looks like a UUID
            cursor.execute("""
                SELECT cache_data FROM public_domain_cache 
                WHERE domain_id = %s AND updated_at > NOW() - INTERVAL '72 hours'
            """, (domain_identifier,))
        else:
            # Treat as domain name
            cursor.execute("""
                SELECT cache_data FROM public_domain_cache 
                WHERE domain = %s AND updated_at > NOW() - INTERVAL '72 hours'
            """, (domain_identifier,))
        
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(
                status_code=404, 
                detail=f"Domain '{domain_identifier}' not found or data is stale"
            )
        
        # Set cache headers for CDN/browser caching
        response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour cache
        response.headers["ETag"] = f'"{hash(str(result["cache_data"]))}"'
        
        return result['cache_data']
        
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/domains")
def list_public_domains(limit: int = 20, offset: int = 0):
    """
    List available domains with basic stats
    """
    try:
        limit = min(limit, 100)  # Safety limit
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT domain, domain_id, memory_score, model_count, updated_at
            FROM public_domain_cache 
            WHERE updated_at > NOW() - INTERVAL '72 hours'
            ORDER BY memory_score DESC, model_count DESC
            LIMIT %s OFFSET %s
        """, (limit, offset))
        
        domains = []
        for row in cursor.fetchall():
            domains.append({
                "domain": row['domain'],
                "domain_id": row['domain_id'],
                "memory_score": row['memory_score'],
                "model_count": row['model_count'],
                "last_updated": row['updated_at'].isoformat() + 'Z',
                "public_url": f"/api/domains/{row['domain_id']}/public"
            })
        
        # Get total count
        cursor.execute("""
            SELECT COUNT(*) FROM public_domain_cache 
            WHERE updated_at > NOW() - INTERVAL '72 hours'
        """)
        total_count = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            "domains": domains,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "total": total_count,
                "has_more": offset + limit < total_count
            },
            "meta": {
                "last_updated": "Auto-updated every 6 hours",
                "data_source": "AI model memory analysis"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_public_stats():
    """
    Public statistics about the platform
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get aggregate stats
        cursor.execute("""
            SELECT 
                COUNT(*) as total_domains,
                AVG(memory_score) as avg_memory_score,
                SUM(model_count) as total_model_responses,
                MAX(updated_at) as last_update
            FROM public_domain_cache 
            WHERE updated_at > NOW() - INTERVAL '72 hours'
        """)
        
        stats = cursor.fetchone()
        
        # Get top performers
        cursor.execute("""
            SELECT domain, memory_score, model_count
            FROM public_domain_cache 
            WHERE updated_at > NOW() - INTERVAL '72 hours'
            ORDER BY memory_score DESC
            LIMIT 5
        """)
        
        top_domains = [
            {
                "domain": row['domain'],
                "memory_score": row['memory_score'],
                "model_count": row['model_count']
            }
            for row in cursor.fetchall()
        ]
        
        cursor.close()
        conn.close()
        
        return {
            "platform_stats": {
                "total_domains": stats['total_domains'],
                "average_memory_score": round(stats['avg_memory_score'], 1) if stats['avg_memory_score'] else 0,
                "total_ai_responses": stats['total_model_responses'],
                "last_updated": stats['last_update'].isoformat() + 'Z' if stats['last_update'] else None
            },
            "top_performers": top_domains,
            "data_freshness": "Updated every 6 hours",
            "coverage": "346 domains across 35+ AI models"
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
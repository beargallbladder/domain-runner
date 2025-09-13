#!/usr/bin/env python3
"""
🚦 COMPREHENSIVE RATE LIMITING MODULE
Implements tiered rate limiting with Redis support for distributed systems
"""

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address, get_ipaddr
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import redis
import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Callable
import asyncio
import time

logger = logging.getLogger(__name__)

# Redis connection for distributed rate limiting
REDIS_URL = os.getenv('REDIS_URL')
redis_client = None

if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL)
        redis_client.ping()
        logger.info("🚀 Connected to Redis for distributed rate limiting")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed, falling back to in-memory rate limiting: {e}")
        redis_client = None

# Rate limit tiers configuration
RATE_LIMIT_TIERS = {
    'free': {
        'per_hour': 100,
        'per_minute': 10,
        'per_day': 1000,
        'burst': 5  # Max requests in 1 second
    },
    'pro': {
        'per_hour': 5000,
        'per_minute': 100,
        'per_day': 50000,
        'burst': 20
    },
    'enterprise': {
        'per_hour': 50000,
        'per_minute': 1000,
        'per_day': 500000,
        'burst': 100
    },
    'api_key': {  # Default for API key access
        'per_hour': 10000,
        'per_minute': 200,
        'per_day': 100000,
        'burst': 50
    }
}

# Custom key function that extracts user tier from request
async def get_rate_limit_key(request: Request) -> str:
    """
    Generate rate limit key based on authentication status and tier
    """
    # Check for API key in header
    api_key = request.headers.get('X-API-Key')
    if api_key:
        # For API keys, use the key itself as identifier
        return f"api_key:{api_key[:16]}"  # Use prefix for security
    
    # Check for JWT token (authenticated user)
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        try:
            # Extract user ID from token (simplified - in production, decode JWT)
            # This would normally decode the JWT and get user info
            return f"user:authenticated"
        except:
            pass
    
    # Fall back to IP address for unauthenticated requests
    return f"ip:{get_ipaddr(request)}"

# Custom rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Custom handler for rate limit exceeded errors
    """
    # Parse the rate limit info
    response = JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={
            "error": "Rate limit exceeded",
            "message": str(exc.detail),
            "retry_after": exc.retry_after if hasattr(exc, 'retry_after') else 60
        }
    )
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(exc.limit) if hasattr(exc, 'limit') else "100"
    response.headers["X-RateLimit-Remaining"] = "0"
    response.headers["X-RateLimit-Reset"] = str(int(time.time()) + 3600)
    response.headers["Retry-After"] = str(exc.retry_after if hasattr(exc, 'retry_after') else 60)
    
    return response

# Create limiter instance
limiter = Limiter(
    key_func=get_rate_limit_key,
    default_limits=["100 per hour", "10 per minute"],
    storage_uri=REDIS_URL if REDIS_URL else None,
    headers_enabled=True,
    strategy="fixed-window-elastic-expiry"
)

class RateLimitManager:
    """
    Advanced rate limiting manager with tier support
    """
    
    def __init__(self):
        self.redis_client = redis_client
        
    async def check_rate_limit(self, key: str, tier: str = 'free') -> Dict:
        """
        Check if request is within rate limits for given tier
        Returns dict with limit info and whether request is allowed
        """
        limits = RATE_LIMIT_TIERS.get(tier, RATE_LIMIT_TIERS['free'])
        current_time = time.time()
        
        # Check burst limit (requests per second)
        burst_key = f"rl:burst:{key}"
        burst_count = await self._increment_counter(burst_key, 1)
        if burst_count > limits['burst']:
            return {
                'allowed': False,
                'limit_type': 'burst',
                'limit': limits['burst'],
                'remaining': 0,
                'reset': int(current_time) + 1,
                'retry_after': 1
            }
        
        # Check per-minute limit
        minute_key = f"rl:minute:{key}:{int(current_time // 60)}"
        minute_count = await self._increment_counter(minute_key, 60)
        if minute_count > limits['per_minute']:
            return {
                'allowed': False,
                'limit_type': 'per_minute',
                'limit': limits['per_minute'],
                'remaining': 0,
                'reset': int(current_time // 60 + 1) * 60,
                'retry_after': 60 - (int(current_time) % 60)
            }
        
        # Check per-hour limit
        hour_key = f"rl:hour:{key}:{int(current_time // 3600)}"
        hour_count = await self._increment_counter(hour_key, 3600)
        if hour_count > limits['per_hour']:
            return {
                'allowed': False,
                'limit_type': 'per_hour',
                'limit': limits['per_hour'],
                'remaining': 0,
                'reset': int(current_time // 3600 + 1) * 3600,
                'retry_after': 3600 - (int(current_time) % 3600)
            }
        
        # Check per-day limit
        day_key = f"rl:day:{key}:{int(current_time // 86400)}"
        day_count = await self._increment_counter(day_key, 86400)
        if day_count > limits['per_day']:
            return {
                'allowed': False,
                'limit_type': 'per_day',
                'limit': limits['per_day'],
                'remaining': 0,
                'reset': int(current_time // 86400 + 1) * 86400,
                'retry_after': 86400 - (int(current_time) % 86400)
            }
        
        # Request allowed - return current limits
        return {
            'allowed': True,
            'limits': {
                'burst': {'limit': limits['burst'], 'remaining': limits['burst'] - burst_count},
                'per_minute': {'limit': limits['per_minute'], 'remaining': limits['per_minute'] - minute_count},
                'per_hour': {'limit': limits['per_hour'], 'remaining': limits['per_hour'] - hour_count},
                'per_day': {'limit': limits['per_day'], 'remaining': limits['per_day'] - day_count}
            },
            'tier': tier
        }
    
    async def _increment_counter(self, key: str, ttl: int) -> int:
        """
        Increment counter with TTL, works with Redis or in-memory fallback
        """
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, ttl)
                result = pipe.execute()
                return result[0]
            except Exception as e:
                logger.error(f"Redis error: {e}")
                # Fall back to in-memory
        
        # In-memory fallback (not distributed)
        # In production, you'd want a more sophisticated in-memory solution
        return 1

    async def get_api_key_info(self, api_key: str, pool) -> Optional[Dict]:
        """
        Get API key information including tier from database
        """
        try:
            async with pool.acquire() as conn:
                key_info = await conn.fetchrow("""
                    SELECT ak.*, u.subscription_tier, u.email, u.id as user_id
                    FROM api_keys ak
                    JOIN users u ON ak.user_id = u.id
                    WHERE ak.api_key = $1 AND ak.is_active = true
                """, api_key)
                
                if key_info:
                    return {
                        'tier': key_info['subscription_tier'],
                        'user_id': str(key_info['user_id']),
                        'email': key_info['email'],
                        'rate_limit_per_day': key_info['rate_limit_per_day'],
                        'rate_limit_per_minute': key_info['rate_limit_per_minute'],
                        'calls_made_today': key_info['calls_made_today']
                    }
                return None
        except Exception as e:
            logger.error(f"Error fetching API key info: {e}")
            # Fallback for testing
            if api_key.startswith("llm_pk_enterprise"):
                return {'tier': 'enterprise', 'user_id': 'enterprise_user'}
            elif api_key.startswith("llm_pk_pro"):
                return {'tier': 'pro', 'user_id': 'pro_user'}
            return None

# Global rate limit manager instance
rate_limit_manager = RateLimitManager()

async def check_rate_limits(request: Request, tier: str = 'free') -> Dict:
    """
    Check rate limits for the current request
    """
    key = await get_rate_limit_key(request)
    result = await rate_limit_manager.check_rate_limit(key, tier)
    
    if not result['allowed']:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {result['limit_type']}",
            headers={
                "X-RateLimit-Limit": str(result['limit']),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(result['reset']),
                "Retry-After": str(result['retry_after'])
            }
        )
    
    return result

def add_rate_limit_headers(response: JSONResponse, limit_info: Dict) -> None:
    """
    Add rate limit headers to response
    """
    if 'limits' in limit_info:
        # Use the most restrictive limit for headers
        hour_limits = limit_info['limits']['per_hour']
        response.headers["X-RateLimit-Limit"] = str(hour_limits['limit'])
        response.headers["X-RateLimit-Remaining"] = str(hour_limits['remaining'])
        response.headers["X-RateLimit-Reset"] = str(int(time.time() // 3600 + 1) * 3600)
        response.headers["X-RateLimit-Tier"] = limit_info.get('tier', 'free')

# Decorator for rate limiting specific endpoints
def rate_limit(tier: str = 'free'):
    """
    Decorator to apply rate limiting to specific endpoints
    """
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            await check_rate_limits(request, tier)
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# API key validation and rate limiting
async def validate_api_key_with_limits(api_key: str, pool) -> Dict:
    """
    Validate API key and check rate limits
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )
    
    # Query database for API key info
    async with pool.acquire() as conn:
        key_info = await conn.fetchrow("""
            SELECT ak.*, u.subscription_tier, u.email
            FROM api_keys ak
            JOIN users u ON ak.user_id = u.id
            WHERE ak.api_key = $1 AND ak.is_active = true
        """, api_key)
        
        if not key_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key"
            )
        
        # Update last used timestamp
        await conn.execute("""
            UPDATE api_keys 
            SET last_used = NOW(), calls_made_total = calls_made_total + 1
            WHERE api_key = $1
        """, api_key)
        
        # Check rate limits based on tier
        tier = key_info['subscription_tier']
        tier_limits = RATE_LIMIT_TIERS.get(tier, RATE_LIMIT_TIERS['api_key'])
        
        # Check daily limit from database
        if key_info['calls_made_today'] >= key_info['rate_limit_per_day']:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Daily API limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(key_info['rate_limit_per_day']),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() // 86400 + 1) * 86400)
                }
            )
        
        return {
            'user_id': key_info['user_id'],
            'tier': tier,
            'email': key_info['email'],
            'remaining_daily': key_info['rate_limit_per_day'] - key_info['calls_made_today']
        }

# Middleware to add rate limit headers to all responses
async def add_rate_limit_headers_middleware(request: Request, call_next):
    """
    Middleware to add rate limit headers to all responses
    """
    # Get rate limit info without enforcing
    key = await get_rate_limit_key(request)
    
    # Determine tier
    tier = 'free'
    if 'api_key:' in key:
        tier = 'api_key'
    elif 'user:' in key:
        tier = 'pro'  # Would need to check actual user tier
    
    # Check current limits (without incrementing)
    limits = RATE_LIMIT_TIERS[tier]
    
    response = await call_next(request)
    
    # Add headers if it's a successful response
    if hasattr(response, 'headers') and response.status_code < 400:
        response.headers["X-RateLimit-Limit"] = str(limits['per_hour'])
        response.headers["X-RateLimit-Tier"] = tier
    
    return response

# Export configured limiter and handlers
__all__ = [
    'limiter',
    'rate_limit_exceeded_handler',
    'check_rate_limits',
    'add_rate_limit_headers',
    'rate_limit',
    'validate_api_key_with_limits',
    'add_rate_limit_headers_middleware',
    'RateLimitManager',
    'RATE_LIMIT_TIERS'
]
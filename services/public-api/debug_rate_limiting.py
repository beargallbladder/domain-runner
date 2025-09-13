#!/usr/bin/env python3
"""
Debug script to check if rate limiting middleware is properly configured
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from production_api import app
from slowapi import Limiter
from slowapi.middleware import SlowAPIMiddleware

def check_rate_limiting_setup():
    """Check if rate limiting is properly configured"""
    print("🔍 Checking Rate Limiting Configuration")
    print("=" * 50)
    
    # Check if limiter is attached to app
    if hasattr(app.state, 'limiter'):
        print("✅ Limiter is attached to app.state")
        limiter = app.state.limiter
        print(f"   - Default limits: {limiter._default_limits}")
        print(f"   - Storage: {limiter._storage_uri if hasattr(limiter, '_storage_uri') else 'In-memory'}")
    else:
        print("❌ Limiter is NOT attached to app.state")
    
    # Check if SlowAPIMiddleware is in the middleware stack
    middleware_found = False
    if hasattr(app, 'middleware') and hasattr(app.middleware, 'middleware_stack'):
        for middleware in app.middleware.middleware_stack:
            if isinstance(middleware, SlowAPIMiddleware) or 'SlowAPIMiddleware' in str(type(middleware)):
                middleware_found = True
                break
    
    if middleware_found:
        print("✅ SlowAPIMiddleware is in the middleware stack")
    else:
        print("❌ SlowAPIMiddleware is NOT in the middleware stack")
    
    # Check exception handlers
    if hasattr(app, 'exception_handlers'):
        from slowapi.errors import RateLimitExceeded
        if RateLimitExceeded in app.exception_handlers:
            print("✅ RateLimitExceeded exception handler is registered")
        else:
            print("❌ RateLimitExceeded exception handler is NOT registered")
    
    # Check rate limited endpoints
    print("\n📍 Checking Rate Limited Endpoints:")
    for route in app.routes:
        if hasattr(route, 'endpoint'):
            endpoint = route.endpoint
            if hasattr(endpoint, '__wrapped__'):
                # Check if it has rate limit decorator
                if hasattr(endpoint, '_rate_limit_params'):
                    print(f"   ✅ {route.path} - Rate limited")
                else:
                    print(f"   ⚠️  {route.path} - No rate limit decorator")
    
    print("\n📋 Summary:")
    print("If all checks show ✅, rate limiting should be working.")
    print("If any show ❌, that component needs to be fixed.")

if __name__ == "__main__":
    check_rate_limiting_setup()
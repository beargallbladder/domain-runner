"""
API Request Logging Middleware
Comprehensive request/response logging with performance metrics
"""

import time
import json
import logging
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import asyncpg
from ipaddress import ip_address

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all API requests with comprehensive metrics"""
    
    def __init__(self, app, pool: asyncpg.Pool):
        super().__init__(app)
        self.pool = pool
        
    async def dispatch(self, request: Request, call_next):
        # Skip logging for health checks and root endpoint
        if request.url.path in ["/health", "/", "/favicon.ico"]:
            return await call_next(request)
            
        # Start timing
        start_time = time.time()
        
        # Extract request details
        request_details = await self._extract_request_details(request)
        
        # Process the request
        response = None
        error_message = None
        
        try:
            response = await call_next(request)
            response_time_ms = int((time.time() - start_time) * 1000)
            
            # Log the request
            await self._log_request(
                request=request,
                response=response,
                request_details=request_details,
                response_time_ms=response_time_ms,
                error_message=None
            )
            
            return response
            
        except Exception as e:
            response_time_ms = int((time.time() - start_time) * 1000)
            error_message = str(e)
            
            # Log the failed request
            await self._log_request(
                request=request,
                response=None,
                request_details=request_details,
                response_time_ms=response_time_ms,
                error_message=error_message,
                status_code=500
            )
            
            raise
    
    async def _extract_request_details(self, request: Request) -> Dict[str, Any]:
        """Extract comprehensive request details"""
        # Get client IP (handle proxy headers)
        client_ip = request.client.host
        if "x-forwarded-for" in request.headers:
            client_ip = request.headers["x-forwarded-for"].split(",")[0].strip()
        elif "x-real-ip" in request.headers:
            client_ip = request.headers["x-real-ip"]
            
        # Extract headers (filter sensitive data)
        headers = dict(request.headers)
        sensitive_headers = ["authorization", "x-api-key", "cookie"]
        filtered_headers = {
            k: v if k.lower() not in sensitive_headers else "[REDACTED]"
            for k, v in headers.items()
        }
        
        # Get query parameters
        query_params = dict(request.query_params) if request.query_params else {}
        
        # Calculate request size
        content_length = request.headers.get("content-length", 0)
        request_size = int(content_length) if content_length else 0
        
        return {
            "ip_address": client_ip,
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
            "headers": filtered_headers,
            "query_params": query_params,
            "request_size": request_size
        }
    
    async def _log_request(
        self,
        request: Request,
        response: Optional[Response],
        request_details: Dict[str, Any],
        response_time_ms: int,
        error_message: Optional[str] = None,
        status_code: Optional[int] = None
    ):
        """Log request to database"""
        try:
            # Get API key info from request state if available
            api_key_id = getattr(request.state, "api_key_id", None)
            api_key_prefix = getattr(request.state, "api_key_prefix", None)
            user_id = getattr(request.state, "user_id", None)
            
            # Get response details
            if response:
                status_code = response.status_code
                response_size = int(response.headers.get("content-length", 0))
            else:
                response_size = 0
                
            # Get rate limit info from response headers
            rate_limit_remaining = None
            rate_limit_reset = None
            if response and "x-ratelimit-remaining" in response.headers:
                rate_limit_remaining = int(response.headers["x-ratelimit-remaining"])
            if response and "x-ratelimit-reset" in response.headers:
                rate_limit_reset = datetime.fromtimestamp(
                    int(response.headers["x-ratelimit-reset"])
                )
            
            async with self.pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO api_key_usage_log (
                        api_key_id, api_key_prefix, user_id,
                        endpoint, method, request_path,
                        query_params, request_headers, request_body_size,
                        ip_address, user_agent, referer,
                        status_code, response_time_ms, response_size,
                        error_message, rate_limit_remaining, rate_limit_reset,
                        requested_at, responded_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                        $13, $14, $15, $16, $17, $18, $19, $20
                    )
                """,
                    api_key_id,
                    api_key_prefix,
                    user_id,
                    request.url.path,
                    request.method,
                    str(request.url),
                    json.dumps(request_details["query_params"]),
                    json.dumps(request_details["headers"]),
                    request_details["request_size"],
                    ip_address(request_details["ip_address"]),
                    request_details["user_agent"],
                    request_details["referer"],
                    status_code,
                    response_time_ms,
                    response_size,
                    error_message,
                    rate_limit_remaining,
                    rate_limit_reset,
                    datetime.utcnow(),
                    datetime.utcnow()
                )
                
                # Update usage summary (async task)
                if api_key_id:
                    await self._update_usage_summary(
                        conn, api_key_id, user_id, status_code,
                        response_time_ms, request_details["request_size"],
                        response_size, request.url.path, error_message
                    )
                    
        except Exception as e:
            logger.error(f"Failed to log request: {e}")
            # Don't fail the request if logging fails
    
    async def _update_usage_summary(
        self,
        conn: asyncpg.Connection,
        api_key_id: str,
        user_id: str,
        status_code: int,
        response_time_ms: int,
        request_size: int,
        response_size: int,
        endpoint: str,
        error_message: Optional[str]
    ):
        """Update aggregated usage summary"""
        today = datetime.utcnow().date()
        
        # Insert or update summary
        await conn.execute("""
            INSERT INTO api_usage_summary (
                api_key_id, user_id, summary_date,
                total_requests, successful_requests, failed_requests,
                avg_response_time_ms, total_request_bytes, total_response_bytes,
                endpoint_usage, error_count, error_types
            ) VALUES (
                $1, $2, $3, 1,
                CASE WHEN $4 < 400 THEN 1 ELSE 0 END,
                CASE WHEN $4 >= 400 THEN 1 ELSE 0 END,
                $5, $6, $7,
                jsonb_build_object($8, 1),
                CASE WHEN $9 IS NOT NULL THEN 1 ELSE 0 END,
                CASE WHEN $9 IS NOT NULL THEN jsonb_build_object($9, 1) ELSE '{}'::jsonb END
            )
            ON CONFLICT (api_key_id, summary_date) DO UPDATE SET
                total_requests = api_usage_summary.total_requests + 1,
                successful_requests = api_usage_summary.successful_requests + 
                    CASE WHEN $4 < 400 THEN 1 ELSE 0 END,
                failed_requests = api_usage_summary.failed_requests + 
                    CASE WHEN $4 >= 400 THEN 1 ELSE 0 END,
                avg_response_time_ms = (
                    (api_usage_summary.avg_response_time_ms * api_usage_summary.total_requests + $5) /
                    (api_usage_summary.total_requests + 1)
                )::integer,
                total_request_bytes = api_usage_summary.total_request_bytes + $6,
                total_response_bytes = api_usage_summary.total_response_bytes + $7,
                endpoint_usage = api_usage_summary.endpoint_usage || 
                    jsonb_build_object($8, COALESCE((api_usage_summary.endpoint_usage->>$8)::integer, 0) + 1),
                error_count = api_usage_summary.error_count + 
                    CASE WHEN $9 IS NOT NULL THEN 1 ELSE 0 END,
                error_types = CASE 
                    WHEN $9 IS NOT NULL THEN 
                        api_usage_summary.error_types || 
                        jsonb_build_object($9, COALESCE((api_usage_summary.error_types->>$9)::integer, 0) + 1)
                    ELSE api_usage_summary.error_types 
                END,
                updated_at = NOW()
        """,
            api_key_id, user_id, today, status_code, response_time_ms,
            request_size, response_size, endpoint, error_message
        )


class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    """Middleware to authenticate API keys and attach user info to request"""
    
    def __init__(self, app, pool: asyncpg.Pool):
        super().__init__(app)
        self.pool = pool
        
    async def dispatch(self, request: Request, call_next):
        # Only skip auth for truly public endpoints
        public_paths = ["/", "/health", "/favicon.ico"]
        if request.url.path in public_paths:
            return await call_next(request)
            
        # Extract API key from header
        api_key = request.headers.get("x-api-key")
        if not api_key:
            # Check Authorization header as fallback
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                api_key = auth_header[7:]
        
        # For protected endpoints, API key is REQUIRED
        if not api_key:
            # Return 401 Unauthorized for missing API key
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "Missing API key. Please provide X-API-Key header.",
                    "status_code": 401
                }),
                status_code=401,
                headers={"Content-Type": "application/json", "WWW-Authenticate": "ApiKey"}
            )
        
        # Validate API key and get user info
        key_info = None
        try:
            async with self.pool.acquire() as conn:
                # First try api_keys table (new system)
                key_info = await conn.fetchrow("""
                    SELECT 
                        k.id as api_key_id,
                        k.user_id,
                        k.key_prefix,
                        k.is_active,
                        k.expires_at,
                        k.rate_limit_per_minute,
                        k.rate_limit_per_day,
                        k.calls_made_today,
                        u.email,
                        u.subscription_tier
                    FROM api_keys k
                    JOIN users u ON k.user_id = u.id
                    WHERE k.api_key = $1
                """, api_key)
                
                # If not found, try partner_api_keys table (legacy system)
                if not key_info:
                    # Hash the API key for partner table lookup
                    import hashlib
                    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
                    
                    partner_info = await conn.fetchrow("""
                        SELECT id, partner_email, partner_domain, tier, rate_limit_per_hour,
                               is_active, expires_at, last_used_at, usage_count
                        FROM partner_api_keys 
                        WHERE api_key_hash = $1
                    """, api_key_hash)
                    
                    if partner_info:
                        # Convert partner info to standard format
                        key_info = {
                            "api_key_id": str(partner_info["id"]),
                            "user_id": str(partner_info["id"]),  # Use partner ID as user ID
                            "key_prefix": "partner",
                            "is_active": partner_info["is_active"],
                            "expires_at": partner_info["expires_at"],
                            "rate_limit_per_minute": partner_info["rate_limit_per_hour"] // 60,
                            "rate_limit_per_day": partner_info["rate_limit_per_hour"] * 24,
                            "calls_made_today": 0,  # Not tracked in partner table
                            "email": partner_info["partner_email"],
                            "subscription_tier": partner_info["tier"]
                        }
        except Exception as e:
            logger.error(f"Database error during API key validation: {e}")
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "Authentication service temporarily unavailable",
                    "status_code": 503
                }),
                status_code=503,
                headers={"Content-Type": "application/json"}
            )
        
        # Check if key was found and is valid
        if not key_info:
            logger.warning(f"Invalid API key attempted: {api_key[:8]}...")
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "Invalid API key. Please check your credentials.",
                    "status_code": 401
                }),
                status_code=401,
                headers={"Content-Type": "application/json", "WWW-Authenticate": "ApiKey"}
            )
        
        # Check if key is active
        if not key_info["is_active"]:
            logger.warning(f"Inactive API key attempted: {api_key[:8]}...")
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "API key is inactive. Please contact support.",
                    "status_code": 401
                }),
                status_code=401,
                headers={"Content-Type": "application/json", "WWW-Authenticate": "ApiKey"}
            )
        
        # Check if key is expired
        if key_info["expires_at"] and key_info["expires_at"] < datetime.utcnow():
            logger.warning(f"Expired API key attempted: {api_key[:8]}...")
            from fastapi import Response
            return Response(
                content=json.dumps({
                    "detail": "API key has expired. Please renew your subscription.",
                    "status_code": 401
                }),
                status_code=401,
                headers={"Content-Type": "application/json", "WWW-Authenticate": "ApiKey"}
            )
        
        # Valid key - attach info to request state
        request.state.api_key_id = key_info["api_key_id"]
        request.state.user_id = key_info["user_id"]
        request.state.api_key_prefix = key_info["key_prefix"]
        request.state.user_email = key_info["email"]
        request.state.subscription_tier = key_info["subscription_tier"]
        request.state.rate_limit_per_minute = key_info["rate_limit_per_minute"]
        request.state.rate_limit_per_day = key_info["rate_limit_per_day"]
        request.state.calls_made_today = key_info["calls_made_today"]
        request.state.api_key_info = key_info  # Store full info for verify_api_key
        
        logger.info(f"API key authenticated for {key_info['email']} - {request.url.path}")
        
        return await call_next(request)
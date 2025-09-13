#!/usr/bin/env python3
"""
🔐 AUTHENTICATION & BILLING API EXTENSIONS
Adds monetization endpoints to existing production API
Preserves all analytics functionality while adding user management
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import asyncpg
import bcrypt
import secrets
import stripe
import os
from typing import Optional, Dict, List
import logging
import time

# Temporarily disable email service to isolate issues
# from email_service import email_service

# Security configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

logger = logging.getLogger(__name__)

# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    subscription_tier: str
    subscription_status: str
    domains_tracked: int
    domains_limit: int
    api_calls_used: int
    api_calls_limit: int
    created_at: datetime

class DomainAdd(BaseModel):
    domain: str
    domain_type: str = "primary"  # primary, competitor, watchlist

class APIKeyCreate(BaseModel):
    key_name: str

class APIKeyResponse(BaseModel):
    id: str
    key_name: str
    key_prefix: str
    tier: str
    is_active: bool
    created_at: datetime

class SubscriptionCreate(BaseModel):
    tier: str  # pro, enterprise
    payment_method_id: str

# ============================================
# UTILITY FUNCTIONS
# ============================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def generate_api_key() -> tuple:
    """Generate API key and prefix"""
    api_key = secrets.token_urlsafe(48)  # 64 chars when base64 encoded
    prefix = api_key[:8]
    return api_key, prefix

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), pool_or_getter=None):
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    # Get pool
    async def get_pool():
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    # Get user from database
    pool = await get_pool()
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        return dict(user)

async def check_api_limits(user: dict, pool) -> None:
    """Check and enforce API rate limits for authenticated users"""
    try:
        async with pool.acquire() as conn:
            # Check if user has exceeded their API limit
            if user['api_calls_used'] >= user['api_calls_limit']:
                # Check if we need to reset (new billing cycle)
                if user.get('billing_cycle_end') and datetime.utcnow() > user['billing_cycle_end']:
                    # Reset the counter for new billing cycle
                    await conn.execute("""
                        UPDATE users 
                        SET api_calls_used = 1,
                            billing_cycle_start = NOW(),
                            billing_cycle_end = NOW() + INTERVAL '1 month'
                        WHERE id = $1
                    """, user['id'])
                else:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"API limit exceeded. Limit: {user['api_calls_limit']}/day for {user['subscription_tier']} tier",
                        headers={
                            "X-RateLimit-Limit": str(user['api_calls_limit']),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(int(user['billing_cycle_end'].timestamp())) if user.get('billing_cycle_end') else str(int(time.time() + 86400))
                        }
                    )
            else:
                # Increment API call counter
                await conn.execute("""
                    UPDATE users 
                    SET api_calls_used = api_calls_used + 1
                    WHERE id = $1
                """, user['id'])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking API limits: {e}")
        # Don't block the request if rate limit check fails
        pass

# ============================================
# AUTHENTICATION ENDPOINTS
# ============================================

def add_auth_endpoints(app, pool_or_getter):
    """Add authentication endpoints to existing FastAPI app"""
    
    async def get_pool():
        """Get pool from either direct object or getter function"""
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    @app.get("/api/auth/test")
    async def auth_test():
        """Test if auth endpoints are loading"""
        return {"status": "auth_endpoints_loaded", "message": "Authentication system is working"}
    
    @app.post("/api/auth/register", response_model=UserResponse)
    async def register(user_data: UserRegister):
        """
        🔐 USER REGISTRATION
        Create new user account with free tier access
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Check if user already exists
                existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", user_data.email)
                if existing:
                    raise HTTPException(status_code=400, detail="Email already registered")
                
                # Hash password
                password_hash = hash_password(user_data.password)
                
                # Create user
                user = await conn.fetchrow("""
                    INSERT INTO users (email, password_hash, full_name, subscription_tier, domains_limit, api_calls_limit)
                    VALUES ($1, $2, $3, 'free', 1, 10)
                    RETURNING id, email, full_name, subscription_tier, subscription_status, 
                             domains_tracked, domains_limit, api_calls_used, api_calls_limit, created_at
                """, user_data.email, password_hash, user_data.full_name)
                
                # Temporarily disable email service
                # try:
                #     email_service.send_welcome_email(
                #         user_data.email, 
                #         user_data.full_name or user_data.email.split('@')[0]
                #     )
                #     logger.info(f"Welcome email sent to: {user_data.email}")
                # except Exception as e:
                #     logger.warning(f"Failed to send welcome email to {user_data.email}: {e}")
                
                logger.info(f"New user registered: {user_data.email}")
                return UserResponse(**dict(user), id=str(user['id']))
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Registration failed: {e}")
            raise HTTPException(status_code=500, detail="Registration failed")

    @app.post("/api/auth/login")
    async def login(login_data: UserLogin):
        """
        🔐 USER LOGIN
        Authenticate user and return JWT token
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Get user by email
                user = await conn.fetchrow("""
                    SELECT id, email, password_hash, subscription_tier, subscription_status
                    FROM users WHERE email = $1
                """, login_data.email)
                
                if not user or not verify_password(login_data.password, user['password_hash']):
                    raise HTTPException(status_code=401, detail="Invalid email or password")
                
                # Update last login
                await conn.execute("UPDATE users SET last_login = NOW() WHERE id = $1", user['id'])
                
                # Create access token
                access_token = create_access_token(data={"sub": str(user['id'])})
                
                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": {
                        "id": str(user['id']),
                        "email": user['email'],
                        "subscription_tier": user['subscription_tier'],
                        "subscription_status": user['subscription_status']
                    }
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Login failed: {e}")
            raise HTTPException(status_code=500, detail="Login failed")

    @app.get("/api/auth/me", response_model=UserResponse)
    async def get_current_user_info(current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))):
        """
        👤 GET CURRENT USER
        Get current user profile and subscription info
        """
        return UserResponse(**current_user, id=str(current_user['id']))

    @app.post("/api/auth/request-password-reset")
    async def request_password_reset(email_data: dict):
        """
        🔐 REQUEST PASSWORD RESET
        Send password reset email with secure token
        """
        email = email_data.get('email')
        if not email:
            raise HTTPException(status_code=400, detail="Email required")
        
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Check if user exists
                user = await conn.fetchrow("SELECT id, email FROM users WHERE email = $1", email)
                
                if user:
                    # Generate reset token
                    reset_token = secrets.token_urlsafe(32)
                    
                    # Store reset token (expires in 1 hour)
                    await conn.execute("""
                        INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
                        VALUES ($1, $2, NOW() + INTERVAL '1 hour', NOW())
                        ON CONFLICT (user_id) DO UPDATE SET
                            token = EXCLUDED.token,
                            expires_at = EXCLUDED.expires_at,
                            created_at = EXCLUDED.created_at
                    """, user['id'], reset_token)
                    
                    # Send password reset email
                    try:
                        # email_service.send_password_reset_email(email, reset_token)
                        logger.info(f"Password reset email sent to: {email}")
                    except Exception as e:
                        logger.warning(f"Failed to send password reset email to {email}: {e}")
                
                # Always return success (security: don't reveal if email exists)
                return {"message": "If this email exists, a password reset link has been sent"}
                
        except Exception as e:
            logger.error(f"Password reset request failed: {e}")
            raise HTTPException(status_code=500, detail="Password reset request failed")

    # ============================================
    # USER DOMAIN MANAGEMENT
    # ============================================

    @app.get("/api/user/domains")
    async def get_user_domains(current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))):
        """
        📊 GET USER DOMAINS
        Get all domains tracked by current user with latest memory scores
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Get user domains with memory scores
                domains = await conn.fetch("""
                    SELECT 
                        ud.domain, ud.domain_type, ud.email_alerts, ud.alert_threshold, ud.added_at,
                        pdc.memory_score, pdc.ai_consensus_score, pdc.reputation_risk_score,
                        pdc.memory_score_trend, pdc.trend_percentage, pdc.updated_at as last_updated
                    FROM user_domains ud
                    LEFT JOIN public_domain_cache pdc ON ud.domain = pdc.domain
                    WHERE ud.user_id = $1
                    ORDER BY ud.added_at DESC
                """, current_user['id'])
                
                return {
                    "domains": [dict(domain) for domain in domains],
                    "total_count": len(domains),
                    "limit": current_user['domains_limit']
                }
                
        except Exception as e:
            logger.error(f"Get user domains failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to get domains")

    @app.post("/api/user/domains")
    async def add_user_domain(
        domain_data: DomainAdd,
        current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))
    ):
        """
        ➕ ADD DOMAIN TO TRACK
        Add domain to user's tracking list with tier limit enforcement
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Check domain limit
                if current_user['domains_tracked'] >= current_user['domains_limit']:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Domain limit reached. Upgrade to track more domains."
                    )
                
                # Check if domain exists in our database
                domain_exists = await conn.fetchrow(
                    "SELECT domain FROM public_domain_cache WHERE domain = $1", 
                    domain_data.domain
                )
                
                if not domain_exists:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Domain '{domain_data.domain}' not found in our database. Please contact support to add it."
                    )
                
                # Add domain to user's tracking list
                await conn.execute("""
                    INSERT INTO user_domains (user_id, domain, domain_type)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, domain) DO NOTHING
                """, current_user['id'], domain_data.domain, domain_data.domain_type)
                
                # Update user's domain count
                await conn.execute("""
                    UPDATE users 
                    SET domains_tracked = (
                        SELECT COUNT(*) FROM user_domains WHERE user_id = $1
                    )
                    WHERE id = $1
                """, current_user['id'])
                
                return {"message": f"Domain '{domain_data.domain}' added to tracking list"}
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Add domain failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to add domain")

    @app.delete("/api/user/domains/{domain}")
    async def remove_user_domain(
        domain: str,
        current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))
    ):
        """
        ➖ REMOVE DOMAIN FROM TRACKING
        Remove domain from user's tracking list
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Remove domain
                result = await conn.execute("""
                    DELETE FROM user_domains 
                    WHERE user_id = $1 AND domain = $2
                """, current_user['id'], domain)
                
                if result == "DELETE 0":
                    raise HTTPException(status_code=404, detail="Domain not found in tracking list")
                
                # Update user's domain count
                await conn.execute("""
                    UPDATE users 
                    SET domains_tracked = (
                        SELECT COUNT(*) FROM user_domains WHERE user_id = $1
                    )
                    WHERE id = $1
                """, current_user['id'])
                
                return {"message": f"Domain '{domain}' removed from tracking list"}
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Remove domain failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to remove domain")

    # ============================================
    # API KEY MANAGEMENT
    # ============================================

    @app.get("/api/user/api-keys")
    async def get_api_keys(current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))):
        """
        🔑 GET API KEYS
        Get all API keys for current user
        """
        try:
            pool = await get_pool()
            async with pool.acquire() as conn:
                keys = await conn.fetch("""
                    SELECT id, key_name, key_prefix, tier, is_active, 
                           calls_made_today, calls_made_total, last_used, created_at
                    FROM api_keys 
                    WHERE user_id = $1 
                    ORDER BY created_at DESC
                """, current_user['id'])
                
                return [dict(key) for key in keys]
                
        except Exception as e:
            logger.error(f"Get API keys failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to get API keys")

    @app.post("/api/user/api-keys")
    async def create_api_key(
        key_data: APIKeyCreate,
        current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))
    ):
        """
        🔑 CREATE API KEY
        Generate new API key for current user
        """
        try:
            # Only paid users get API keys
            if current_user['subscription_tier'] == 'free':
                raise HTTPException(
                    status_code=403,
                    detail="API keys are only available for Pro and Enterprise users. Please upgrade your subscription."
                )
            
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Generate API key
                api_key, prefix = generate_api_key()
                
                # Get tier limits
                tier_info = await conn.fetchrow("""
                    SELECT api_calls_per_day, api_calls_per_minute 
                    FROM pricing_tiers 
                    WHERE tier_name = $1
                """, current_user['subscription_tier'])
                
                # Create API key
                new_key = await conn.fetchrow("""
                    INSERT INTO api_keys (
                        user_id, key_name, api_key, key_prefix, tier,
                        rate_limit_per_minute, rate_limit_per_day
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id, key_name, key_prefix, tier, created_at
                """, 
                    current_user['id'], key_data.key_name, api_key, prefix,
                    current_user['subscription_tier'], 
                    tier_info['api_calls_per_minute'],
                    tier_info['api_calls_per_day']
                )
                
                return {
                    "message": "API key created successfully",
                    "api_key": api_key,  # Only shown once!
                    "key_info": dict(new_key)
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create API key failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to create API key")

    # ============================================
    # BILLING & SUBSCRIPTIONS
    # ============================================

    @app.post("/api/billing/create-subscription")
    async def create_subscription(
        subscription_data: SubscriptionCreate,
        current_user: dict = Depends(lambda creds=Depends(security): get_current_user(creds, pool_or_getter))
    ):
        """
        💳 CREATE SUBSCRIPTION
        Create Stripe subscription for user
        """
        try:
            if not stripe.api_key:
                raise HTTPException(status_code=503, detail="Billing not configured")
            
            pool = await get_pool()
            async with pool.acquire() as conn:
                # Get pricing info
                tier_info = await conn.fetchrow("""
                    SELECT price_cents, display_name, domains_limit, api_calls_per_day
                    FROM pricing_tiers 
                    WHERE tier_name = $1 AND is_active = true
                """, subscription_data.tier)
                
                if not tier_info:
                    raise HTTPException(status_code=400, detail="Invalid subscription tier")
                
                # Create or get Stripe customer
                stripe_customer_id = current_user.get('stripe_customer_id')
                if not stripe_customer_id:
                    customer = stripe.Customer.create(
                        email=current_user['email'],
                        metadata={'user_id': str(current_user['id'])}
                    )
                    stripe_customer_id = customer.id
                    
                    # Update user with Stripe customer ID
                    await conn.execute(
                        "UPDATE users SET stripe_customer_id = $1 WHERE id = $2",
                        stripe_customer_id, current_user['id']
                    )
                
                # Create Stripe subscription
                subscription = stripe.Subscription.create(
                    customer=stripe_customer_id,
                    items=[{
                        'price_data': {
                            'currency': 'usd',
                            'product_data': {
                                'name': tier_info['display_name'],
                            },
                            'unit_amount': tier_info['price_cents'],
                            'recurring': {'interval': 'month'},
                        },
                    }],
                    payment_behavior='default_incomplete',
                    expand=['latest_invoice.payment_intent'],
                )
                
                # Update user subscription
                await conn.execute("""
                    UPDATE users SET 
                        subscription_tier = $1,
                        subscription_status = 'active',
                        subscription_id = $2,
                        domains_limit = $3,
                        api_calls_limit = $4,
                        billing_cycle_start = NOW(),
                        billing_cycle_end = NOW() + INTERVAL '1 month'
                    WHERE id = $5
                """, 
                    subscription_data.tier, subscription.id,
                    tier_info['domains_limit'], tier_info['api_calls_per_day'],
                    current_user['id']
                )
                
                return {
                    "subscription_id": subscription.id,
                    "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                    "status": subscription.status
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Create subscription failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to create subscription")

    @app.post("/api/billing/webhook")
    async def stripe_webhook(request):
        """
        🎯 STRIPE WEBHOOK
        Handle Stripe webhook events
        """
        try:
            payload = await request.body()
            sig_header = request.headers.get('stripe-signature')
            
            if not sig_header:
                raise HTTPException(status_code=400, detail="Missing signature")
            
            # Verify webhook signature
            webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
            if webhook_secret:
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            else:
                # For development - just parse the event
                import json
                event = json.loads(payload)
            
            # Handle the event
            if event['type'] == 'customer.subscription.created':
                subscription = event['data']['object']
                await handle_subscription_created(subscription, pool_or_getter)
            elif event['type'] == 'customer.subscription.updated':
                subscription = event['data']['object']
                await handle_subscription_updated(subscription, pool_or_getter)
            elif event['type'] == 'invoice.payment_succeeded':
                invoice = event['data']['object']
                await handle_payment_succeeded(invoice, pool_or_getter)
            elif event['type'] == 'customer.subscription.deleted':
                subscription = event['data']['object']
                await handle_subscription_cancelled(subscription, pool_or_getter)
            else:
                # Log unhandled events for debugging
                logger.info(f"Unhandled webhook event: {event['type']}")
            
            return {"status": "success"}
            
        except Exception as e:
            logger.error(f"Webhook failed: {e}")
            raise HTTPException(status_code=400, detail="Webhook failed")

    return app

# ============================================
# WEBHOOK HANDLERS
# ============================================

async def handle_subscription_created(subscription, pool_or_getter):
    """Handle subscription creation"""
    async def get_pool():
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE users SET
                subscription_status = $1,
                updated_at = NOW()
            WHERE stripe_customer_id = $2
        """, subscription['status'], subscription['customer'])

async def handle_subscription_updated(subscription, pool_or_getter):
    """Handle subscription status changes"""
    async def get_pool():
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE users SET
                subscription_status = $1,
                updated_at = NOW()
            WHERE stripe_customer_id = $2
        """, subscription['status'], subscription['customer'])

async def handle_payment_succeeded(invoice, pool_or_getter):
    """Handle successful payments"""
    async def get_pool():
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        # Reset API usage for new billing cycle
        await conn.execute("""
            UPDATE users SET
                api_calls_used = 0,
                updated_at = NOW()
            WHERE stripe_customer_id = $1
        """, invoice['customer'])

async def handle_subscription_cancelled(subscription, pool_or_getter):
    """Handle subscription cancellations"""
    async def get_pool():
        if callable(pool_or_getter):
            return await pool_or_getter()
        return pool_or_getter
    
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            UPDATE users SET
                subscription_tier = 'free',
                subscription_status = 'cancelled',
                domains_limit = 1,
                api_calls_limit = 10,
                updated_at = NOW()
            WHERE stripe_customer_id = $1
        """, subscription['customer']) 
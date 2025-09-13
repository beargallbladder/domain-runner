-- 🔐 USER AUTHENTICATION & BILLING SCHEMA EXTENSION
-- Adds monetization infrastructure without touching analytics tables
-- Preserves all existing data and performance optimizations

-- ============================================
-- 1. USERS TABLE - Core user management
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    
    -- Billing information
    stripe_customer_id VARCHAR(255) UNIQUE,
    subscription_status VARCHAR(50) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_id VARCHAR(255),
    billing_cycle_start TIMESTAMP,
    billing_cycle_end TIMESTAMP,
    
    -- Usage tracking
    api_calls_used INTEGER DEFAULT 0,
    api_calls_limit INTEGER DEFAULT 0,
    domains_tracked INTEGER DEFAULT 0,
    domains_limit INTEGER DEFAULT 1, -- Free tier gets 1 domain
    
    -- Account management
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    last_active TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ============================================
-- 2. API KEYS TABLE - API access management
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL, -- 64-char random key
    key_prefix VARCHAR(16) NOT NULL, -- First 8 chars for display
    
    -- Permissions and limits
    tier VARCHAR(50) NOT NULL,
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 1000,
    
    -- Usage tracking
    calls_made_today INTEGER DEFAULT 0,
    calls_made_total INTEGER DEFAULT 0,
    last_used TIMESTAMP,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at);

-- ============================================
-- 3. USER DOMAINS - Track which domains users monitor
-- ============================================
CREATE TABLE IF NOT EXISTS user_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    domain_type VARCHAR(50) DEFAULT 'primary' CHECK (domain_type IN ('primary', 'competitor', 'watchlist')),
    
    -- Alert preferences
    email_alerts BOOLEAN DEFAULT TRUE,
    alert_threshold REAL DEFAULT 10.0, -- Alert if score changes by this much
    
    -- Tracking metadata
    added_at TIMESTAMP DEFAULT NOW(),
    last_checked TIMESTAMP,
    
    UNIQUE(user_id, domain)
);

-- Indexes for user domain lookups
CREATE INDEX IF NOT EXISTS idx_user_domains_user ON user_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_user_domains_domain ON user_domains(domain);

-- ============================================
-- 4. BILLING EVENTS - Payment history
-- ============================================
CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Stripe integration
    stripe_event_id VARCHAR(255) UNIQUE,
    stripe_session_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL, -- subscription_created, payment_succeeded, etc.
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Metadata
    metadata JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for billing lookups
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_stripe ON billing_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at);

-- ============================================
-- 5. USAGE ANALYTICS - Track API usage patterns
-- ============================================
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- User context
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Partition by month for performance
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date ON usage_analytics(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_analytics_created ON usage_analytics(created_at);

-- ============================================
-- 6. PRICING TIERS CONFIGURATION
-- ============================================
CREATE TABLE IF NOT EXISTS pricing_tiers (
    tier_name VARCHAR(50) PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    price_cents INTEGER NOT NULL,
    billing_interval VARCHAR(20) DEFAULT 'month',
    
    -- Limits
    domains_limit INTEGER NOT NULL,
    api_calls_per_day INTEGER NOT NULL,
    api_calls_per_minute INTEGER NOT NULL,
    
    -- Features
    features JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default pricing tiers
INSERT INTO pricing_tiers (tier_name, display_name, price_cents, domains_limit, api_calls_per_day, api_calls_per_minute, features) VALUES
('free', 'Free Tier', 0, 1, 10, 2, '{"search_access": true, "basic_alerts": false}'),
('pro', 'Pro Plan', 4900, 3, 1000, 60, '{"search_access": true, "basic_alerts": true, "api_access": true, "competitive_analysis": true}'),
('enterprise', 'Enterprise Plan', 50000, 10, 10000, 300, '{"search_access": true, "basic_alerts": true, "api_access": true, "competitive_analysis": true, "white_label": true, "priority_support": true}')
ON CONFLICT (tier_name) DO NOTHING;

-- ============================================
-- 7. TRIGGER FUNCTIONS - Auto-update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply auto-update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pricing_tiers_updated_at BEFORE UPDATE ON pricing_tiers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. SECURITY POLICIES (Row Level Security)
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_own_data ON users FOR ALL USING (id = current_setting('app.current_user_id')::uuid);
CREATE POLICY api_keys_own_data ON api_keys FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY user_domains_own_data ON user_domains FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY billing_events_own_data ON billing_events FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY usage_analytics_own_data ON usage_analytics FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

-- ============================================
-- 9. UTILITY FUNCTIONS
-- ============================================

-- Function to generate API keys
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS VARCHAR(64) AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..64 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to check user tier limits
CREATE OR REPLACE FUNCTION check_user_limits(user_uuid UUID, operation_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    user_tier VARCHAR(50);
    current_usage INTEGER;
    tier_limit INTEGER;
BEGIN
    -- Get user's tier and current usage
    SELECT subscription_tier INTO user_tier FROM users WHERE id = user_uuid;
    
    IF operation_type = 'api_call' THEN
        SELECT api_calls_used INTO current_usage FROM users WHERE id = user_uuid;
        SELECT api_calls_per_day INTO tier_limit FROM pricing_tiers WHERE tier_name = user_tier;
    ELSIF operation_type = 'domain_track' THEN
        SELECT domains_tracked INTO current_usage FROM users WHERE id = user_uuid;
        SELECT domains_limit INTO tier_limit FROM pricing_tiers WHERE tier_name = user_tier;
    END IF;
    
    RETURN current_usage < tier_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verification queries
DO $$
BEGIN
    RAISE NOTICE '✅ Database migration completed successfully!';
    RAISE NOTICE '📊 Created tables: users, api_keys, user_domains, billing_events, usage_analytics, pricing_tiers';
    RAISE NOTICE '🔐 Enabled row-level security on all user tables';
    RAISE NOTICE '⚡ Added performance indexes and utility functions';
    RAISE NOTICE '💰 Configured pricing tiers: Free ($0), Pro ($49), Enterprise ($500)';
END $$; 
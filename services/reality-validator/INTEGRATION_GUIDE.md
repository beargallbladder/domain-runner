# 🔧 REALITY VALIDATION INTEGRATION GUIDE

## 🎯 QUICK INTEGRATION (30 minutes)

### **Step 1: Add Tier Column to Existing Users Table**
```sql
-- Add to your existing users/subscriptions table
ALTER TABLE users ADD COLUMN reality_tier VARCHAR(20) DEFAULT 'basic';
ALTER TABLE api_keys ADD COLUMN tier VARCHAR(20) DEFAULT 'basic';

-- Update existing users based on current subscription
UPDATE users SET reality_tier = 'pro' WHERE subscription_plan = 'pro';
UPDATE users SET reality_tier = 'enterprise' WHERE subscription_plan = 'enterprise';
```

### **Step 2: Modify Your Existing API Middleware**
```typescript
// In your existing API middleware (probably in services/public-api/)
export const checkRealityAccess = (requiredTier: 'basic' | 'pro' | 'enterprise') => {
  return async (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'];
    
    // Use your existing API key lookup
    const user = await getUserFromApiKey(apiKey);
    const userTier = user?.reality_tier || 'basic';
    
    const tierLevels = { basic: 1, pro: 2, enterprise: 3 };
    
    if (tierLevels[userTier] >= tierLevels[requiredTier]) {
      req.userTier = userTier; // Pass tier to endpoint
      next();
    } else {
      res.status(403).json({ 
        error: 'Premium feature', 
        message: `Reality validation requires ${requiredTier} tier`,
        upgrade_url: 'https://llmrank.io/pricing',
        current_tier: userTier
      });
    }
  };
};
```

### **Step 3: Add Reality Endpoints to Existing API**
```typescript
// Add to your existing services/public-api/app.py or similar
import { checkRealityAccess } from './middleware';

// PRO TIER: Basic reality check
app.get('/api/v1/reality-check/:domain', 
  checkRealityAccess('pro'), 
  async (req, res) => {
    const { domain } = req.params;
    const userTier = req.userTier;
    
    // Call your reality validator service
    const realityData = await fetch(`${REALITY_VALIDATOR_URL}/api/reality-check/${domain}`, {
      headers: { 'x-user-tier': userTier }
    });
    
    res.json(await realityData.json());
  }
);

// ENTERPRISE TIER: Full reality suite
app.get('/api/v1/reality-check/:domain/comprehensive', 
  checkRealityAccess('enterprise'), 
  async (req, res) => {
    // Similar implementation for enterprise features
  }
);
```

## 🎭 FRONTEND INTEGRATION

### **Step 1: Update Your Existing Domain Analysis Page**
```jsx
// In your existing domain analysis component
import { useUserTier } from './hooks/useAuth';

export const DomainAnalysis = ({ domain }) => {
  const { tier } = useUserTier();
  const { aiData } = useAIAnalysis(domain); // Your existing hook
  const { realityData } = useRealityCheck(domain, tier); // New hook

  return (
    <div className="domain-analysis">
      {/* Your existing AI analysis */}
      <AIConsensusSection data={aiData} />
      
      {/* New reality validation section */}
      {tier === 'basic' && (
        <UpgradePrompt 
          feature="reality_validation"
          message="See how AI assessment compares to reality"
        />
      )}
      
      {tier === 'pro' && (
        <RealityValidationBasic data={realityData} />
      )}
      
      {tier === 'enterprise' && (
        <RealityValidationFull data={realityData} />
      )}
    </div>
  );
};
```

### **Step 2: Create Reality Validation Components**
```jsx
// New component for Pro tier
export const RealityValidationBasic = ({ data }) => (
  <div className="reality-check-basic">
    <h3>🔍 Reality Check</h3>
    <div className="divergence-score">
      AI Score: {data.ai_score} | Reality Score: {data.reality_score}
      <span className={`divergence ${data.divergence_level}`}>
        {data.divergence_score} point difference
      </span>
    </div>
    <UpgradePrompt 
      feature="full_reality_suite"
      message="Upgrade for comprehensive reality analysis"
    />
  </div>
);

// New component for Enterprise tier
export const RealityValidationFull = ({ data }) => (
  <div className="reality-check-full">
    <RealityValidationBasic data={data} />
    <ModelAccuracyTracker accuracy={data.model_accuracy} />
    <DivergenceTimeline timeline={data.historical_divergence} />
    <CustomRealityMetrics metrics={data.custom_metrics} />
  </div>
);
```

## 💰 PRICING PAGE UPDATES

### **Update Your Existing Pricing Tiers**
```jsx
// Update your existing pricing component
export const PricingTiers = () => (
  <div className="pricing-tiers">
    <PricingTier 
      name="Basic"
      price="Free"
      features={[
        "AI Brand Intelligence",
        "Consensus Scoring", 
        "Basic Analytics",
        "❌ Reality Validation"
      ]}
    />
    
    <PricingTier 
      name="Pro" 
      price="$99/month"
      features={[
        "Everything in Basic",
        "✅ Basic Reality Checks",
        "✅ Divergence Scoring",
        "✅ 10 domains/month batch",
        "❌ Full reality suite"
      ]}
      highlight="Most Popular"
    />
    
    <PricingTier 
      name="Enterprise"
      price="$999/month" 
      features={[
        "Everything in Pro",
        "✅ Full Reality Validation",
        "✅ Model Accuracy Tracking",
        "✅ Custom Reality Metrics", 
        "✅ Unlimited Processing",
        "✅ Divergence Alerts"
      ]}
      highlight="Complete Solution"
    />
  </div>
);
```

## 🚀 DEPLOYMENT STRATEGY

### **Option A: Gradual Rollout (Recommended)**
```bash
# Week 1: Deploy reality validator as separate service
# - Keep existing system unchanged
# - Add reality endpoints to existing API
# - Enable for Enterprise users only

# Week 2: Enable Pro tier features  
# - Add basic reality checks for Pro users
# - A/B test upgrade prompts

# Week 3: Full launch
# - Update marketing materials
# - Email existing users about new features
```

### **Option B: Feature Flag Rollout**
```typescript
// Use feature flags for gradual rollout
const FEATURE_FLAGS = {
  reality_validation_pro: process.env.ENABLE_REALITY_PRO === 'true',
  reality_validation_enterprise: process.env.ENABLE_REALITY_ENTERPRISE === 'true'
};

// In your API endpoints
if (FEATURE_FLAGS.reality_validation_pro && userTier === 'pro') {
  // Enable reality validation
}
```

## 📊 ANALYTICS TRACKING

### **Track Tier Upgrade Conversions**
```typescript
// Add to your existing analytics
analytics.track('Reality Validation Viewed', {
  user_tier: userTier,
  domain: domain,
  showed_upgrade_prompt: userTier === 'basic'
});

analytics.track('Upgrade Prompt Clicked', {
  from_tier: userTier,
  to_tier: 'pro', // or 'enterprise'
  feature: 'reality_validation'
});
```

## 🔗 API INTEGRATION SUMMARY

Your existing API structure remains the same, just add:

```
GET /api/v1/reality-check/:domain          [PRO+]
GET /api/v1/reality-check/:domain/full     [ENTERPRISE]
GET /api/v1/model-accuracy                 [ENTERPRISE] 
GET /api/v1/divergence-alerts              [ENTERPRISE]
POST /api/v1/reality-check/batch           [PRO+]
```

## ⚡ MINIMAL VIABLE INTEGRATION

If you want to start simple:

1. **Add one endpoint**: `GET /api/v1/reality-check/:domain` for Pro+ users
2. **Add one frontend component**: Show AI vs Reality score comparison  
3. **Add upgrade prompts** for Basic users
4. **Track conversion metrics**

This gives you immediate tier differentiation and upgrade drivers without major system changes.

The beauty of this approach: **Zero risk to existing system**, **immediate revenue impact**, **clear upgrade path**. 🎯 
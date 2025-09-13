# 🔧 TIERED CONSENSUS + REALITY INTEGRATION GUIDE

## 🎯 QUICK VALUE-GATED INTEGRATION (45 minutes)

### **Step 1: Add Tier & Usage Limits to Database**
```sql
-- Add to your existing users/subscriptions table
ALTER TABLE users ADD COLUMN tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE users ADD COLUMN llm_models_allowed INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN competitors_allowed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN daily_analyses_allowed INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN monthly_analyses_allowed INTEGER DEFAULT 1;

-- Update existing users based on current subscription
UPDATE users SET 
  tier = 'pro',
  llm_models_allowed = 12,
  competitors_allowed = 10,
  monthly_analyses_allowed = 50
WHERE subscription_plan = 'pro';

UPDATE users SET 
  tier = 'enterprise',
  llm_models_allowed = 19,
  competitors_allowed = -1,  -- unlimited
  monthly_analyses_allowed = -1  -- unlimited
WHERE subscription_plan = 'enterprise';

-- Track usage for limits
CREATE TABLE user_usage (
  user_id UUID PRIMARY KEY,
  month DATE,
  analyses_used INTEGER DEFAULT 0,
  competitors_tracked INTEGER DEFAULT 0,
  reality_checks_used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Step 2: Implement Tier-Based Model Filtering**
```typescript
// Core service: LLM model filtering by tier
export const getAvailableModels = (userTier: string) => {
  const allModels = [
    // Free tier (3 models)
    { id: 'gpt-4', name: 'OpenAI GPT-4', tier: 'free' },
    { id: 'claude-3', name: 'Anthropic Claude', tier: 'free' },
    { id: 'gemini-pro', name: 'Google Gemini', tier: 'free' },
    
    // Pro tier additional (9 more = 12 total)
    { id: 'gpt-3.5-turbo', name: 'OpenAI GPT-3.5', tier: 'pro' },
    { id: 'claude-instant', name: 'Claude Instant', tier: 'pro' },
    { id: 'palm-2', name: 'Google PaLM', tier: 'pro' },
    { id: 'llama-2', name: 'Meta Llama 2', tier: 'pro' },
    { id: 'cohere-command', name: 'Cohere Command', tier: 'pro' },
    { id: 'jurassic-2', name: 'AI21 Jurassic', tier: 'pro' },
    { id: 'mistral-7b', name: 'Mistral 7B', tier: 'pro' },
    { id: 'flan-t5', name: 'FLAN-T5', tier: 'pro' },
    { id: 'stablelm', name: 'StableLM', tier: 'pro' },
    
    // Enterprise tier additional (7+ more = 19+ total)
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'enterprise' },
    { id: 'claude-2.1', name: 'Claude 2.1', tier: 'enterprise' },
    { id: 'gemini-ultra', name: 'Gemini Ultra', tier: 'enterprise' },
    { id: 'code-llama', name: 'Code Llama', tier: 'enterprise' },
    { id: 'command-r', name: 'Command-R', tier: 'enterprise' },
    { id: 'jurassic-ultra', name: 'Jurassic Ultra', tier: 'enterprise' },
    { id: 'mistral-8x7b', name: 'Mistral 8x7B', tier: 'enterprise' }
  ];

  const tierLevels = { free: 1, pro: 2, enterprise: 3 };
  const userLevel = tierLevels[userTier] || 1;
  
  return allModels.filter(model => 
    tierLevels[model.tier] <= userLevel
  );
};
```

### **Step 3: Update Your Existing API with Proper Gating**
```typescript
// Enhanced middleware for your existing API
export const checkTierLimits = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  const user = await getUserFromApiKey(apiKey);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  // Check usage limits
  const usage = await getUserUsage(user.id);
  const isOverLimit = await checkUsageLimits(user, usage);
  
  if (isOverLimit.exceeded) {
    return res.status(429).json({
      error: 'Usage limit exceeded',
      limit_type: isOverLimit.type,
      current_tier: user.tier,
      upgrade_url: 'https://llmrank.io/pricing'
    });
  }
  
  req.user = user;
  req.availableModels = getAvailableModels(user.tier);
  next();
};

// Updated domain analysis endpoint
app.get('/api/v1/domain/:domain', checkTierLimits, async (req, res) => {
  const { domain } = req.params;
  const { user, availableModels } = req;
  
  // Get AI consensus from allowed models only
  const aiConsensus = await getAIConsensus(domain, availableModels);
  
  // Reality validation based on tier
  let realityData = null;
  if (user.tier === 'pro') {
    realityData = await getBasicRealityCheck(domain);
  } else if (user.tier === 'enterprise') {
    realityData = await getFullRealityCheck(domain);
  }
  
  // Increment usage
  await incrementUsage(user.id, 'analysis');
  
  res.json({
    domain,
    ai_consensus: aiConsensus,
    reality_validation: realityData,
    tier_info: {
      current_tier: user.tier,
      models_used: availableModels.length,
      models_available: getAvailableModels('enterprise').length,
      upgrade_benefits: getUpgradeBenefits(user.tier)
    }
  });
});

// Competitor tracking endpoint
app.get('/api/v1/competitors/:domain', checkTierLimits, async (req, res) => {
  const { domain } = req.params;
  const { user } = req;
  
  if (user.competitors_allowed === 0) {
    return res.status(403).json({
      error: 'Competitor tracking requires Pro tier',
      upgrade_url: 'https://llmrank.io/pricing'
    });
  }
  
  const competitors = await getCompetitors(domain, user.competitors_allowed);
  
  res.json({
    competitors,
    limits: {
      current_count: competitors.length,
      max_allowed: user.competitors_allowed,
      is_unlimited: user.competitors_allowed === -1
    }
  });
});
```

## 🎭 FRONTEND TIER-AWARE COMPONENTS

### **Step 1: Tiered AI Consensus Display**
```jsx
// Enhanced AI consensus component with tier awareness
export const AIConsensusGrid = ({ domain, userTier, availableModels }) => {
  const allModels = getAllModels(); // All 19+ models
  const lockedModels = allModels.filter(m => 
    !availableModels.find(am => am.id === m.id)
  );

  return (
    <div className="ai-consensus-grid">
      <h3>🎭 AI Memory Chorus ({availableModels.length} voices)</h3>
      
      {/* Available models */}
      <div className="available-models">
        {availableModels.map(model => (
          <ModelVoice 
            key={model.id}
            model={model}
            assessment={getModelAssessment(domain, model.id)}
            glowing={true}
          />
        ))}
      </div>
      
      {/* Locked models with upgrade prompt */}
      {lockedModels.length > 0 && (
        <div className="locked-models">
          <div className="blur-overlay">
            <h4>+{lockedModels.length} more AI voices</h4>
            {lockedModels.slice(0, 3).map(model => (
              <ModelVoice 
                key={model.id}
                model={model}
                locked={true}
                opacity={0.3}
              />
            ))}
            <UpgradePrompt 
              currentTier={userTier}
              feature="more_models"
              message={getModelUpgradeMessage(userTier)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Tier-aware competitor tracking
export const CompetitorSection = ({ domain, userTier, competitorLimit }) => {
  const [competitors, setCompetitors] = useState([]);
  const canAddMore = competitorLimit === -1 || competitors.length < competitorLimit;

  return (
    <div className="competitor-section">
      <h3>🏆 Competitive Analysis</h3>
      
      {userTier === 'free' ? (
        <div className="feature-locked">
          <div className="locked-content">
            <h4>Track Your Competitors</h4>
            <p>See how your domain stacks up against competitors</p>
            <UpgradePrompt 
              feature="competitor_tracking"
              message="Upgrade to Pro: Track 10 competitors"
            />
          </div>
        </div>
      ) : (
        <div className="competitor-grid">
          <YourDomainCard domain={domain} />
          
          {competitors.map(competitor => (
            <CompetitorCard key={competitor} domain={competitor} />
          ))}
          
          {canAddMore ? (
            <AddCompetitorCard onAdd={addCompetitor} />
          ) : (
            <UpgradePrompt 
              feature="unlimited_competitors"
              message="Enterprise: Track unlimited competitors"
            />
          )}
          
          <div className="competitor-limits">
            {competitorLimit !== -1 && (
              <span>{competitors.length}/{competitorLimit} competitors tracked</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Reality validation by tier
export const RealityValidationSection = ({ domain, userTier, realityData }) => {
  if (userTier === 'free') {
    return (
      <div className="reality-locked">
        <h3>🔍 Reality Validation</h3>
        <div className="locked-content">
          <p>See how AI assessments compare to real-world data</p>
          <div className="preview-chart">
            <div className="blur-overlay">
              <span>AI Score: 74.5 | Reality Score: ???</span>
            </div>
          </div>
          <UpgradePrompt 
            feature="reality_validation"
            message="Upgrade to Pro: Basic reality checks"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="reality-validation">
      <h3>🔍 Reality Validation</h3>
      
      {userTier === 'pro' ? (
        <div className="reality-basic">
          <DivergenceScore data={realityData} />
          <MarketSentimentCheck data={realityData.market} />
          <UpgradePrompt 
            feature="full_reality_suite"
            message="Enterprise: Complete reality validation"
          />
        </div>
      ) : (
        <div className="reality-full">
          <DivergenceScore data={realityData} />
          <FinancialValidation data={realityData.financial} />
          <RegulatoryCheck data={realityData.regulatory} />
          <MarketSentimentCheck data={realityData.market} />
          <ModelAccuracyTracker data={realityData.accuracy} />
        </div>
      )}
    </div>
  );
};
```

## 💰 PRICING PAGE WITH CLEAR VALUE PROPS

### **Updated Pricing Component**
```jsx
export const PricingTiers = () => (
  <div className="pricing-tiers">
    <PricingTier 
      name="Free"
      price="$0"
      subtitle="Sample the AI chorus"
      features={[
        "3 AI models (GPT-4, Claude, Gemini)",
        "1 domain analysis per day",
        "Self-analysis only",
        "❌ Competitor tracking",
        "❌ Reality validation"
      ]}
      cta="Sign Up Free"
      highlight={false}
    />
    
    <PricingTier 
      name="Pro" 
      price="$99"
      subtitle="Hear more voices + track competitors"
      features={[
        "12 AI models (major + specialized)",
        "50 domain analyses per month",
        "Track 10 competitors",
        "✅ Basic reality validation",
        "✅ Divergence scoring",
        "✅ API access"
      ]}
      cta="Upgrade to Pro"
      highlight="Most Popular"
    />
    
    <PricingTier 
      name="Enterprise"
      price="$999"
      subtitle="Complete AI consensus + full reality"
      features={[
        "19+ AI models (complete suite)",
        "Unlimited analyses & competitors",
        "✅ Full reality validation",
        "✅ Model accuracy tracking",
        "✅ Historical analysis",
        "✅ Custom metrics",
        "✅ Priority support"
      ]}
      cta="Contact Sales"
      highlight="Complete Solution"
    />
  </div>
);
```

## 🚀 CONVERSION OPTIMIZATION

### **Smart Upgrade Prompts**
```jsx
export const UpgradePrompt = ({ feature, currentTier, className }) => {
  const prompts = {
    more_models: {
      free: "Unlock 9 more AI models with Pro ($99/mo)",
      pro: "Get all 19+ AI models with Enterprise ($999/mo)"
    },
    competitor_tracking: {
      free: "Track 10 competitors with Pro ($99/mo)",
      pro: "Track unlimited competitors with Enterprise ($999/mo)"
    },
    reality_validation: {
      free: "See AI vs Reality with Pro ($99/mo)",
      pro: "Get full reality suite with Enterprise ($999/mo)"
    }
  };

  const message = prompts[feature]?.[currentTier];
  if (!message) return null;

  return (
    <div className={`upgrade-prompt ${className}`}>
      <div className="upgrade-content">
        <span className="upgrade-message">{message}</span>
        <button 
          className="upgrade-button"
          onClick={() => trackUpgradeClick(feature, currentTier)}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  );
};
```

## 📊 USAGE TRACKING & LIMITS

### **Usage Monitoring System**
```typescript
// Track and enforce usage limits
export class UsageTracker {
  async checkLimits(userId: string, action: string): Promise<{allowed: boolean, reason?: string}> {
    const user = await getUser(userId);
    const usage = await getCurrentUsage(userId);
    
    switch (action) {
      case 'analysis':
        if (user.tier === 'free' && usage.daily_analyses >= 1) {
          return { allowed: false, reason: 'Daily limit reached' };
        }
        if (user.tier === 'pro' && usage.monthly_analyses >= 50) {
          return { allowed: false, reason: 'Monthly limit reached' };
        }
        break;
        
      case 'competitor_add':
        if (user.competitors_allowed === 0) {
          return { allowed: false, reason: 'Competitor tracking requires Pro' };
        }
        if (user.competitors_allowed !== -1 && usage.competitors >= user.competitors_allowed) {
          return { allowed: false, reason: 'Competitor limit reached' };
        }
        break;
        
      case 'reality_check':
        if (user.tier === 'free') {
          return { allowed: false, reason: 'Reality validation requires Pro' };
        }
        break;
    }
    
    return { allowed: true };
  }
}
```

This approach **properly protects your core AI consensus IP** while creating clear upgrade paths. The LLM model limitations become the primary value driver, with competitor tracking and reality validation as additional premium features that justify the tier pricing! 🎯💰 
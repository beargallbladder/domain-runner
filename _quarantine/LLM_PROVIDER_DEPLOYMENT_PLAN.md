# LLM Provider Testing & Deployment Plan
**Date:** July 28, 2025  
**Mission:** Deploy ALL 11 LLM providers for comprehensive domain processing

## 🎯 CURRENT STATUS

### ✅ WORKING PROVIDERS (5/11)
1. **OpenAI** - 128 responses/day, 2 models (gpt-4o-mini, gpt-3.5-turbo)
2. **DeepSeek** - 89 responses/day, 1 model (deepseek-chat)  
3. **Google** - 50 responses/day, 1 model (gemini-1.5-flash)
4. **Mistral** - 50 responses/day, 1 model (mistral-small-latest)
5. **Together** - 50 responses/day, 1 model (meta-llama/Llama-3-8b-chat-hf)

### ❌ MISSING PROVIDERS (6/11)
6. **Anthropic** - No recent activity (Claude models)
7. **xAI** - No recent activity (Grok models)
8. **Perplexity** - No recent activity (Sonar models)
9. **Cohere** - Not implemented (Command models)
10. **AI21** - Not implemented (J2 models)
11. **Groq** - Not implemented (Mixtral/Llama models)

## 🔍 TESTING RESULTS

### Database Analysis
- **Total responses (24h):** 367
- **Processing rate:** Active (5 domains processed recently)
- **System health:** 5/11 providers operational (45% coverage)

### Endpoint Accessibility
- **✅ Reachable:** OpenAI, DeepSeek, Mistral, Together, Perplexity, Google, Cohere, Groq
- **❌ Issues:** Anthropic (405), xAI (400), AI21 (404)

### API Key Status
- **Current keys are invalid/outdated** in test environment
- **Production keys are working** (evidenced by database activity)
- **Missing keys** for Cohere, AI21, Groq

## 🚀 DEPLOYMENT PLAN

### Phase 1: Fix Existing Providers (PRIORITY 1)
**Target:** Get Anthropic, xAI, Perplexity working again

```bash
# 1. Check current API keys in Render environment
curl -H "x-api-key: [RENDER_API_KEY]" https://sophisticated-runner.onrender.com/providers

# 2. Test Anthropic with production key
curl -X POST https://api.anthropic.com/v1/messages \
  -H "x-api-key: [PROD_ANTHROPIC_KEY]" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-haiku-20240307","messages":[{"role":"user","content":"test"}],"max_tokens":5}'

# 3. Test xAI with production key  
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer [PROD_XAI_KEY]" \
  -H "content-type: application/json" \
  -d '{"model":"grok-beta","messages":[{"role":"user","content":"test"}],"max_tokens":5}'

# 4. Test Perplexity with production key
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer [PROD_PERPLEXITY_KEY]" \
  -H "content-type: application/json" \
  -d '{"model":"mistral-7b-instruct","messages":[{"role":"user","content":"test"}],"max_tokens":5}'
```

### Phase 2: Add Missing Providers (PRIORITY 2)
**Target:** Implement Cohere, AI21, Groq

#### 2.1 Add Provider Implementations
```bash
# Copy new provider files to domain-processor-v2
cp services/domain-processor-v2/src/modules/llm-providers/providers/cohere-provider.ts [DESTINATION]
cp services/domain-processor-v2/src/modules/llm-providers/providers/ai21-provider.ts [DESTINATION]  
cp services/domain-processor-v2/src/modules/llm-providers/providers/groq-provider.ts [DESTINATION]
```

#### 2.2 Update Provider Registry
```typescript
// Add to provider registration in domain-processor-v2
import { CohereProvider } from './providers/cohere-provider';
import { AI21Provider } from './providers/ai21-provider';
import { GroqProvider } from './providers/groq-provider';

// Register in initializeProviders()
registerProvider(new CohereProvider('command', cohereApiKey, ProviderTier.MEDIUM, logger));
registerProvider(new AI21Provider('j2-ultra', ai21ApiKey, ProviderTier.MEDIUM, logger));
registerProvider(new GroqProvider('mixtral-8x7b-32768', groqApiKey, ProviderTier.FAST, logger));
```

#### 2.3 Obtain API Keys
**Required API Keys:**
- **Cohere:** https://dashboard.cohere.ai/api-keys
- **AI21:** https://studio.ai21.com/account/api-key  
- **Groq:** https://console.groq.com/keys

### Phase 3: Production Deployment (PRIORITY 3)
**Target:** Deploy all 11 providers to sophisticated-runner

#### 3.1 Update Sophisticated Runner Configuration
```typescript
// Add to sophisticated-runner/src/index.ts PROVIDERS arrays

const FAST_PROVIDERS = [
  // ... existing providers
  { 
    name: 'cohere', 
    model: 'command', 
    keys: [process.env.COHERE_API_KEY, process.env.COHERE_API_KEY_2].filter(Boolean), 
    endpoint: 'https://api.cohere.ai/v1/generate', 
    tier: 'fast' 
  },
  { 
    name: 'groq', 
    model: 'mixtral-8x7b-32768', 
    keys: [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2].filter(Boolean), 
    endpoint: 'https://api.groq.com/openai/v1/chat/completions', 
    tier: 'fast' 
  }
];

const MEDIUM_PROVIDERS = [
  // ... existing providers  
  { 
    name: 'ai21', 
    model: 'j2-ultra', 
    keys: [process.env.AI21_API_KEY, process.env.AI21_API_KEY_2].filter(Boolean), 
    endpoint: 'https://api.ai21.com/studio/v1/j2-ultra/complete', 
    tier: 'medium' 
  }
];
```

#### 3.2 Update API Call Logic
```typescript
// Add provider-specific logic in callLLMWithKey function
else if (provider.name === 'cohere') {
  headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  requestBody = {
    model: provider.model,
    prompt: promptText,
    max_tokens: 500,
    temperature: 0.7
  };
} else if (provider.name === 'ai21') {
  headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  requestBody = {
    prompt: promptText,
    maxTokens: 500,
    temperature: 0.7
  };
} else if (provider.name === 'groq') {
  headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  requestBody = {
    model: provider.model,
    messages: [{ role: 'user', content: promptText }],
    max_tokens: 500,
    temperature: 0.7
  };
}
```

#### 3.3 Update Response Parsing
```typescript
// Add response parsing in callLLMWithKey function
if (provider.name === 'cohere') {
  return data.generations?.[0]?.text || 'No response';
} else if (provider.name === 'ai21') {
  return data.completions?.[0]?.data?.text || 'No response';
} else if (provider.name === 'groq') {
  return data.choices?.[0]?.message?.content || 'No response';
}
```

### Phase 4: Environment Variables (PRIORITY 4)
**Target:** Add all required API keys to Render environment

```bash
# Add to Render environment variables:
COHERE_API_KEY=[COHERE_KEY_1]
COHERE_API_KEY_2=[COHERE_KEY_2]
AI21_API_KEY=[AI21_KEY_1]  
AI21_API_KEY_2=[AI21_KEY_2]
GROQ_API_KEY=[GROQ_KEY_1]
GROQ_API_KEY_2=[GROQ_KEY_2]

# Verify existing keys are current:
ANTHROPIC_API_KEY=[CURRENT_ANTHROPIC_KEY]
XAI_API_KEY=[CURRENT_XAI_KEY]
PERPLEXITY_API_KEY=[CURRENT_PERPLEXITY_KEY]
```

## 🧪 TESTING PROTOCOL

### Pre-Deployment Testing
```bash
# 1. Test all provider implementations locally
cd services/domain-processor-v2
npm test

# 2. Test API key validity
python3 test_all_11_llm_providers.py

# 3. Build and verify deployment  
npm run build
```

### Post-Deployment Verification
```bash
# 1. Check service health
curl https://sophisticated-runner.onrender.com/health

# 2. Verify all providers processing
python3 check_production_providers.py

# 3. Monitor processing for 1 hour
# Should see all 11 providers in database activity

# 4. Performance verification
# Target: 11 providers × 3 prompts = 33 responses per domain
```

## 📊 SUCCESS METRICS

### Target Performance
- **All 11 providers active** in database within 1 hour
- **3,183 domains processed** with complete coverage
- **33 responses per domain** (11 providers × 3 prompts)
- **Response time < 30 seconds** per domain batch
  
### Monitoring Indicators
```sql
-- Check provider distribution
SELECT 
    CASE 
        WHEN model LIKE '%deepseek%' THEN 'deepseek'
        WHEN model LIKE '%llama%' AND model LIKE '%together%' THEN 'together'
        WHEN model LIKE '%grok%' THEN 'xai'
        WHEN model LIKE '%perplexity%' OR model LIKE '%sonar%' THEN 'perplexity'
        WHEN model LIKE '%gpt%' THEN 'openai'
        WHEN model LIKE '%mistral%' THEN 'mistral'
        WHEN model LIKE '%claude%' THEN 'anthropic'
        WHEN model LIKE '%gemini%' THEN 'google'
        WHEN model LIKE '%cohere%' OR model LIKE '%command%' THEN 'cohere'
        WHEN model LIKE '%ai21%' OR model LIKE '%j2-%' THEN 'ai21'
        WHEN model LIKE '%groq%' OR model LIKE '%mixtral%' THEN 'groq'
        ELSE SPLIT_PART(model, '/', 1)
    END as provider,
    COUNT(*) as responses
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY provider
ORDER BY responses DESC;
```

## ⚠️ CRITICAL SUCCESS FACTORS

1. **API Key Management:** All 11 providers must have valid, funded API keys
2. **Rate Limiting:** Proper rate limiting to avoid API throttling
3. **Error Handling:** Robust error handling for each provider's unique response format
4. **Monitoring:** Real-time monitoring to detect provider failures immediately
5. **Fallback Strategy:** Graceful degradation if providers fail

## 🎯 IMMEDIATE NEXT STEPS

1. **[URGENT]** Obtain API keys for Cohere, AI21, Groq
2. **[URGENT]** Test existing keys for Anthropic, xAI, Perplexity  
3. **[URGENT]** Deploy provider implementations to production
4. **[URGENT]** Add environment variables to Render
5. **[URGENT]** Run comprehensive post-deployment testing

**TARGET:** All 11 providers operational within 24 hours

---

**Status:** 5/11 providers working (45% coverage)  
**Goal:** 11/11 providers working (100% coverage)  
**ETA:** 24 hours with proper API keys
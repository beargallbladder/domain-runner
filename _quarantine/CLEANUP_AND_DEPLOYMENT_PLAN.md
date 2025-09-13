# Domain Runner Cleanup and Deployment Plan

## Current Issues
1. Rust service configured with 10 LLMs but Anthropic is missing in the Rust code
2. Multiple conflicting services (sophisticated-runner vs domain-processor-v2)
3. Confusing service names and duplicated functionality
4. API keys inconsistently configured across services

## The 10 LLMs We Need Working
1. **OpenAI** ✅ (configured)
2. **Anthropic** ❌ (missing in Rust ai_providers.rs)
3. **DeepSeek** ✅ (configured)
4. **Mistral** ✅ (configured) 
5. **XAI (Grok)** ✅ (configured)
6. **Together** ✅ (configured)
7. **Perplexity** ✅ (configured)
8. **Google (Gemini)** ✅ (configured)
9. **Cohere** ✅ (configured)
10. **AI21** ✅ (configured)
11. **Groq** ✅ (configured - bonus 11th provider)

## Immediate Fix Required

### 1. Fix Anthropic in Rust Service
The Rust service has Anthropic enum variant but no actual Anthropic provider in the providers list!

### 2. Clean Service Architecture
```
services/
├── sophisticated-runner-rust/  # MAIN PRODUCTION SERVICE (10 LLMs)
├── public-api/                 # API for llmrank.io
├── seo-metrics-runner/         # SEO data collection
└── [other supporting services]
```

### 3. Deployment Strategy
1. Fix the Anthropic provider in ai_providers.rs
2. Ensure all 10 API keys are set in Render
3. Deploy sophisticated-runner-rust as the main processor
4. Archive/disable conflicting services

## Code Fixes Needed

### Fix 1: Add Anthropic Provider to Rust Service
In `services/sophisticated-runner-rust/src/ai_providers.rs`, add Anthropic between OpenAI and Mistral:

```rust
// 2. OpenAI (WORKING)
AIProvider {
    name: "openai".to_string(),
    api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
    base_url: "https://api.openai.com/v1/chat/completions".to_string(),
    model: "gpt-3.5-turbo".to_string(),
    provider_type: ProviderType::OpenAI,
},
// 2.5 Anthropic (NEEDS TO BE ADDED)
AIProvider {
    name: "anthropic".to_string(),
    api_key: std::env::var("ANTHROPIC_API_KEY").unwrap_or_default(),
    base_url: "https://api.anthropic.com/v1/messages".to_string(),
    model: "claude-3-haiku-20240307".to_string(),
    provider_type: ProviderType::Anthropic,
},
// 3. Mistral (WORKING)
```

### Fix 2: Update Provider Count
Change all references from "10 providers" to "11 providers" since we have:
- 8 original providers (OpenAI, Anthropic, DeepSeek, Mistral, XAI, Together, Perplexity, Google)
- 3 additional providers (Cohere, AI21, Groq)

### Fix 3: Clean Up render.yaml
1. Keep sophisticated-runner-rust as the main service
2. Remove or disable domain-processor-v2 (duplicate functionality)
3. Ensure all 11 API keys are configured

## Deployment Commands
```bash
# 1. Commit the fixes
git add .
git commit -m "Fix: Add Anthropic provider and clean up to 11 LLMs"
git push origin main

# 2. Monitor deployment
# Check https://dashboard.render.com

# 3. Verify all providers are working
curl https://sophisticated-runner.onrender.com/health
```

## Weekly Processing Requirements
- Process all domains with all 11 LLMs
- Store responses in domain_responses table
- Calculate consensus scores
- Run every week automatically

## Success Metrics
- All 11 LLMs responding successfully
- No duplicate or conflicting services
- Clean, maintainable codebase
- Reliable weekly execution
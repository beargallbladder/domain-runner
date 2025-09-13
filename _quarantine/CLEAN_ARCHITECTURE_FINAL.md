# Domain Runner - Clean Architecture (Final)

## Production Services

### 1. sophisticated-runner-rust (MAIN PROCESSOR)
- **Purpose**: Process domains with all 11 LLMs
- **Language**: Rust (fast, memory-efficient)
- **Status**: ACTIVE
- **URL**: https://sophisticated-runner.onrender.com
- **Features**:
  - Processes domains in parallel batches
  - All 11 LLM providers integrated
  - Automatic retry logic
  - Health monitoring endpoint
  - Continuous processing loop

### 2. llm-pagerank-public-api
- **Purpose**: Public API for llmrank.io
- **Language**: Python (FastAPI)
- **Status**: ACTIVE
- **URL**: https://llmrank.io/api
- **Domain**: llmrank.io

### 3. seo-metrics-runner
- **Purpose**: SEO data collection
- **Language**: Node.js
- **Status**: ACTIVE

### Supporting Services (Keep as needed):
- cohort-intelligence
- industry-intelligence
- news-correlation-service
- swarm-intelligence

## The 11 LLM Providers

1. **OpenAI** - gpt-3.5-turbo
2. **Anthropic** - claude-3-haiku-20240307
3. **DeepSeek** - deepseek-chat
4. **Mistral** - mistral-small-latest
5. **XAI** - grok-beta
6. **Together** - meta-llama/Llama-3-70b-chat-hf
7. **Perplexity** - llama-3.1-sonar-large-128k-online
8. **Google** - gemini-1.5-flash
9. **Cohere** - command
10. **AI21** - j2-ultra
11. **Groq** - mixtral-8x7b-32768

## Database Schema

```sql
-- Main tables
domains (id, domain, status, created_at, updated_at)
domain_responses (id, domain_id, model, prompt_type, response, created_at)
```

## Weekly Processing Flow

1. **Rust service runs continuously**
   - Checks for pending domains every 30 seconds
   - Processes in batches of 5 domains
   - Each domain queried with all 11 LLMs in parallel

2. **Data Storage**
   - All responses saved to domain_responses table
   - Consensus scores calculated
   - Domain status updated to 'completed'

3. **Monitoring**
   - Health endpoint: /health
   - Logs show provider status
   - Metrics tracked: domains processed, API calls, failures

## Environment Variables Required

All these must be set in Render dashboard:

```
# Database
DATABASE_URL (auto-configured from Render database)

# LLM API Keys
OPENAI_API_KEY
ANTHROPIC_API_KEY
DEEPSEEK_API_KEY
MISTRAL_API_KEY
XAI_API_KEY
TOGETHER_API_KEY
PERPLEXITY_API_KEY
GOOGLE_API_KEY
COHERE_API_KEY
AI21_API_KEY
GROQ_API_KEY

# Optional secondary keys for rate limit management
OPENAI_API_KEY_2, OPENAI_API_KEY_3, OPENAI_API_KEY_4
ANTHROPIC_API_KEY_2
DEEPSEEK_API_KEY_2, DEEPSEEK_API_KEY_3
MISTRAL_API_KEY_2
XAI_API_KEY_2
TOGETHER_API_KEY_2, TOGETHER_API_KEY_3
PERPLEXITY_API_KEY_2
GOOGLE_API_KEY_2
COHERE_API_KEY_2
AI21_API_KEY_2
GROQ_API_KEY_2
```

## Deployment Process

1. Make code changes
2. Run: `./deploy_clean_rust_service.sh`
3. Monitor at https://dashboard.render.com
4. Verify with: `curl https://sophisticated-runner.onrender.com/health`

## What We Removed/Disabled

- **domain-processor-v2**: Duplicate functionality (disabled in render.yaml)
- **raw-capture-runner**: Old implementation
- **modular-domain-processor**: Not needed
- Various test/experimental services

## Success Criteria

- ✅ All 11 LLMs responding
- ✅ Clean codebase with single source of truth
- ✅ Reliable weekly processing
- ✅ No service conflicts
- ✅ Clear architecture
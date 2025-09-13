# CURRENT DEPLOYMENT STATUS - DOMAIN RUNNER

## What's Actually Running (As of July 23, 2025)

### Service: sophisticated-runner.onrender.com
- **Type**: Rust service
- **Location**: `/services/sophisticated-runner-rust/`
- **Status**: ACTIVE ✅

### LLM Configuration in Rust Code
The Rust service (`/services/sophisticated-runner-rust/src/ai_providers.rs`) has ALL 8 LLMs configured:

1. ✅ OpenAI (gpt-4)
2. ✅ Anthropic (claude-3-sonnet)
3. ✅ DeepSeek (deepseek-chat)
4. ✅ Mistral (mistral-large-latest)
5. ✅ XAI (grok-beta)
6. ✅ Together (llama-2-70b)
7. ✅ Perplexity (llama-3.1-sonar-large)
8. ✅ Google (gemini-pro)

### Current Issue
- Only 3 LLMs active (DeepSeek, Mistral, OpenAI)
- Rust code at line 92: `filter(|p| !p.api_key.is_empty())`
- This means 5 API keys aren't visible to the service

### Database Proof All 8 LLMs Have Worked
```
ANTHROPIC: 4,671 responses
DEEPSEEK: 21,572 responses
OPENAI: 24,169 responses
MISTRAL: 21,055 responses
GOOGLE: 4,052 responses
XAI: 300 responses
TOGETHER: 7,259 responses
PERPLEXITY: 4,184 responses
```

### How the Rust Service Works
1. Runs continuously in a loop
2. Fetches pending domains from database
3. Processes 5 domains at a time in parallel
4. Uses ALL providers that have API keys
5. No REST endpoint needed - it's autonomous

### Fix Required
The Rust service just needs to see all 8 API keys in environment variables.
Since they're all in Render, a service restart should fix it.

### Other Services (NOT ACTIVE)
- `/services/sophisticated-runner/` - TypeScript version with REST endpoints
- Various other services in `/services/` - not related to domain processing
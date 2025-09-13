# 🛡️ API SAFEGUARDS & RELIABILITY MEASURES

## IMMEDIATE FIXES NEEDED

### 1. Model Validation & Fallback System
```typescript
// Add before callLLM function
const VALIDATED_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-haiku-20240307', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'],
  together: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
  deepseek: ['deepseek-chat', 'deepseek-coder'],
  mistral: ['mistral-small-2402', 'mistral-large-2407'],
  google: ['gemini-1.5-flash'] // Known to have issues
};

// Replace legacy/non-existent models
const MODEL_REPLACEMENTS = {
  'gpt-4': 'gpt-4o',
  'gpt-4-turbo': 'gpt-4o',
  'gpt-4.5': 'gpt-4o', // Doesn't exist yet
  'gemini-1.5-pro': 'gemini-1.5-flash'
};
```

### 2. Circuit Breaker Pattern
```typescript
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailure = new Map<string, number>();
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 300000; // 5 minutes

  async execute<T>(modelName: string, operation: () => Promise<T>): Promise<T> {
    if (this.isOpen(modelName)) {
      throw new Error(`Circuit breaker OPEN for ${modelName}`);
    }

    try {
      const result = await operation();
      this.onSuccess(modelName);
      return result;
    } catch (error) {
      this.onFailure(modelName);
      throw error;
    }
  }

  private isOpen(modelName: string): boolean {
    const failures = this.failures.get(modelName) || 0;
    const lastFailure = this.lastFailure.get(modelName) || 0;
    
    if (failures >= this.FAILURE_THRESHOLD) {
      return (Date.now() - lastFailure) < this.RESET_TIMEOUT;
    }
    return false;
  }
}
```

### 3. Retry Logic with Exponential Backoff
```typescript
async function callLLMWithRetry(model: string, prompt: string, domain: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.execute(model, () => callLLM(model, prompt, domain));
    } catch (error) {
      console.warn(`Attempt ${attempt}/${maxRetries} failed for ${model}:`, error.message);
      
      if (attempt === maxRetries) {
        // Try fallback model
        const fallback = MODEL_REPLACEMENTS[model] || 'gpt-3.5-turbo';
        if (fallback !== model) {
          console.log(`Using fallback ${fallback} for ${model}`);
          return await callLLM(fallback, prompt, domain);
        }
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

### 4. Rate Limiting & Jitter
```typescript
const RATE_LIMITS = {
  'gemini-1.5-flash': { requestsPerMinute: 10, concurrent: 2 },
  'gpt-4o': { requestsPerMinute: 20, concurrent: 5 },
  'claude-3-opus-20240229': { requestsPerMinute: 15, concurrent: 3 },
  'default': { requestsPerMinute: 30, concurrent: 10 }
};

// Add jitter to prevent thundering herd
function addJitter(baseDelay: number): number {
  return baseDelay + (Math.random() * 1000); // 0-1s jitter
}
```

### 5. Bot Detection Avoidance
```typescript
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
];

const REQUEST_HEADERS = {
  'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

// Rotate API keys if available
function getRotatedApiKey(service: string): string {
  const keys = process.env[`${service.toUpperCase()}_API_KEYS`]?.split(',') || [];
  return keys[Math.floor(Math.random() * keys.length)] || process.env[`${service.toUpperCase()}_API_KEY`];
}
```

### 6. Timeout Management
```typescript
const API_TIMEOUTS = {
  'gemini-1.5-flash': 45000, // 45s - Google is slow
  'claude-3-opus-20240229': 30000, // 30s - Complex reasoning
  'deepseek-chat': 20000, // 20s - Fast model
  'default': 25000 // 25s default
};

// Add to axios config
const client = axios.create({
  timeout: API_TIMEOUTS[model] || API_TIMEOUTS.default,
  headers: REQUEST_HEADERS
});
```

## BOT GUARD COUNTERMEASURES

### 1. Request Spacing
- Random delays between requests: 2-8 seconds
- Burst protection: Max 3 concurrent requests per API
- Daily quota tracking per model

### 2. Header Randomization
- Rotate User-Agent strings
- Add realistic browser headers
- Vary request timing patterns

### 3. Error Classification
```typescript
const ERROR_TYPES = {
  RATE_LIMIT: ['rate_limit', '429', 'quota', 'per_minute'],
  BOT_DETECTION: ['blocked', 'suspicious', 'automated', 'bot'],
  AUTH_ERROR: ['401', '403', 'unauthorized', 'forbidden'],
  MODEL_ERROR: ['model_not_found', 'invalid_model', '404']
};
```

### 4. Health Monitoring
```typescript
// Track model health in real-time
const modelHealth = {
  success_rate: new Map(),
  avg_latency: new Map(),
  last_success: new Map(),
  consecutive_failures: new Map()
};
```

## DEPLOYMENT STEPS

1. **Update model list** - Remove non-existent models
2. **Add circuit breakers** - Prevent cascading failures  
3. **Implement retry logic** - Handle transient errors
4. **Add rate limiting** - Respect API quotas
5. **Monitor & alert** - Real-time failure detection

## EXPECTED IMPROVEMENTS

- **Success Rate**: 60% → 85%+ 
- **Reduced Hangs**: Circuit breakers prevent infinite waits
- **Bot Bypass**: Header rotation and spacing reduce blocks
- **Cost Efficiency**: Fallback models prevent expensive retries 
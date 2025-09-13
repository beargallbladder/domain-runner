// FLEXIBLE KEY HANDLING - Supports both KEY_2 and KEY2 formats

export function getApiKeys(providerName: string): string[] {
  const upperName = providerName.toUpperCase();
  const keys: string[] = [];
  
  // Try base key
  if (process.env[`${upperName}_API_KEY`]) {
    keys.push(process.env[`${upperName}_API_KEY`]);
  }
  
  // Try numbered keys with both formats
  for (let i = 1; i <= 5; i++) {
    // Try with underscore: KEY_2
    if (process.env[`${upperName}_API_KEY_${i}`]) {
      keys.push(process.env[`${upperName}_API_KEY_${i}`]);
    }
    // Try without underscore: KEY2
    if (process.env[`${upperName}_API_KEY${i}`]) {
      keys.push(process.env[`${upperName}_API_KEY${i}`]);
    }
  }
  
  return keys.filter(Boolean);
}

// Updated provider configurations with flexible key handling
export const UPDATED_PROVIDERS = {
  FAST_PROVIDERS: [
    { 
      name: 'deepseek', 
      model: 'deepseek-chat', 
      keys: getApiKeys('deepseek'),
      endpoint: 'https://api.deepseek.com/v1/chat/completions', 
      tier: 'fast' 
    },
    { 
      name: 'together', 
      model: 'meta-llama/Llama-3-8b-chat-hf', 
      keys: getApiKeys('together'),
      endpoint: 'https://api.together.xyz/v1/chat/completions', 
      tier: 'fast' 
    },
    { 
      name: 'xai', 
      model: 'grok-2', 
      keys: getApiKeys('xai'),
      endpoint: 'https://api.x.ai/v1/chat/completions', 
      tier: 'fast' 
    },
    { 
      name: 'perplexity', 
      model: 'sonar', 
      keys: getApiKeys('perplexity'),
      endpoint: 'https://api.perplexity.ai/chat/completions', 
      tier: 'fast' 
    },
    {
      name: 'groq',
      model: 'mixtral-8x7b-32768',
      keys: getApiKeys('groq'),
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      tier: 'fast'
    }
  ],
  
  MEDIUM_PROVIDERS: [
    { 
      name: 'openai', 
      model: 'gpt-4o-mini', 
      keys: getApiKeys('openai'),
      endpoint: 'https://api.openai.com/v1/chat/completions', 
      tier: 'medium' 
    },
    { 
      name: 'mistral', 
      model: 'mistral-small-latest', 
      keys: getApiKeys('mistral'),
      endpoint: 'https://api.mistral.ai/v1/chat/completions', 
      tier: 'medium' 
    },
    { 
      name: 'ai21', 
      model: 'jamba-mini', 
      keys: getApiKeys('ai21'),
      endpoint: 'https://api.ai21.com/studio/v1/chat/completions', 
      tier: 'medium' 
    },
    {
      name: 'cohere',
      model: 'command-r-plus',
      keys: getApiKeys('cohere'),
      endpoint: 'https://api.cohere.ai/v1/generate',
      tier: 'medium'
    }
  ],
  
  SLOW_PROVIDERS: [
    { 
      name: 'anthropic', 
      model: 'claude-3-haiku-20240307', 
      keys: getApiKeys('anthropic'),
      endpoint: 'https://api.anthropic.com/v1/messages', 
      tier: 'slow' 
    },
    { 
      name: 'google', 
      model: 'gemini-1.5-flash', 
      keys: getApiKeys('google'),
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', 
      tier: 'slow' 
    }
  ]
};
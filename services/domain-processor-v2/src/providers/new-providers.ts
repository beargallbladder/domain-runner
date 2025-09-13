/**
 * New LLM Provider Configurations
 * Adding Meta Llama, OpenRouter, and Amazon Bedrock
 */

export const NEW_PROVIDER_CONFIGS = {
  // Meta Llama via Replicate
  'meta-llama': {
    id: 'meta-llama',
    name: 'Meta Llama 3.1',
    apiKeyEnvVar: 'REPLICATE_API_TOKEN',
    endpoint: 'https://api.replicate.com/v1/predictions',
    model: 'meta/llama-3.1-405b-instruct',
    weight: 1.1,
    tier: 'premium',
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 50000
    },
    headers: {
      'Authorization': 'Token {{apiKey}}',
      'Content-Type': 'application/json'
    },
    requestFormat: {
      version: 'meta/llama-3.1-405b-instruct:latest',
      input: {
        prompt: '{{prompt}}',
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9
      }
    }
  },

  // OpenRouter - Access to multiple models
  'openrouter': {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.1-70b-instruct',
    weight: 1.0,
    tier: 'standard',
    rateLimit: {
      requestsPerMinute: 200,
      tokensPerMinute: 100000
    },
    headers: {
      'Authorization': 'Bearer {{apiKey}}',
      'HTTP-Referer': 'https://llmrank.io',
      'X-Title': 'LLMRank Domain Analysis',
      'Content-Type': 'application/json'
    },
    requestFormat: {
      model: '{{model}}',
      messages: [
        {
          role: 'system',
          content: 'You are analyzing domains for brand sentiment and market presence.'
        },
        {
          role: 'user',
          content: '{{prompt}}'
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }
  },

  // Amazon Bedrock - Claude and other models
  'bedrock': {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    apiKeyEnvVar: 'AWS_ACCESS_KEY_ID',
    secretKeyEnvVar: 'AWS_SECRET_ACCESS_KEY',
    region: 'us-east-1',
    endpoint: 'https://bedrock-runtime.us-east-1.amazonaws.com',
    model: 'anthropic.claude-3-opus-20240229-v1:0',
    weight: 1.2,
    tier: 'enterprise',
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 80000
    },
    // Note: Bedrock requires AWS SigV4 signing
    requiresAWSSigning: true,
    requestFormat: {
      modelId: '{{model}}',
      contentType: 'application/json',
      accept: 'application/json',
      body: {
        prompt: '\\n\\nHuman: {{prompt}}\\n\\nAssistant:',
        max_tokens_to_sample: 1000,
        temperature: 0.7,
        top_p: 0.9,
        stop_sequences: ['\\n\\nHuman:']
      }
    }
  },

  // Bonus: Alibaba Qwen via API
  'qwen': {
    id: 'qwen',
    name: 'Alibaba Qwen',
    apiKeyEnvVar: 'DASHSCOPE_API_KEY',
    endpoint: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    model: 'qwen-max',
    weight: 0.9,
    tier: 'standard',
    rateLimit: {
      requestsPerMinute: 60,
      tokensPerMinute: 30000
    },
    headers: {
      'Authorization': 'Bearer {{apiKey}}',
      'Content-Type': 'application/json'
    },
    requestFormat: {
      model: '{{model}}',
      input: {
        messages: [
          {
            role: 'system',
            content: 'You are analyzing domains for brand sentiment.'
          },
          {
            role: 'user', 
            content: '{{prompt}}'
          }
        ]
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 1000
      }
    }
  },

  // Fireworks AI - Fast inference
  'fireworks': {
    id: 'fireworks',
    name: 'Fireworks AI',
    apiKeyEnvVar: 'FIREWORKS_API_KEY',
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    model: 'accounts/fireworks/models/llama-v3-70b-instruct',
    weight: 0.9,
    tier: 'standard',
    rateLimit: {
      requestsPerMinute: 300,
      tokensPerMinute: 150000
    },
    headers: {
      'Authorization': 'Bearer {{apiKey}}',
      'Content-Type': 'application/json'
    },
    requestFormat: {
      model: '{{model}}',
      messages: [
        {
          role: 'user',
          content: '{{prompt}}'
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.9,
      stream: false
    }
  }
};

/**
 * Provider integration status
 */
export const PROVIDER_STATUS = {
  'meta-llama': {
    implemented: true,
    tested: false,
    production: false,
    notes: 'Requires Replicate API token'
  },
  'openrouter': {
    implemented: true,
    tested: false,
    production: false,
    notes: 'Supports 100+ models through single API'
  },
  'bedrock': {
    implemented: true,
    tested: false,
    production: false,
    notes: 'Requires AWS credentials and SigV4 signing'
  },
  'qwen': {
    implemented: true,
    tested: false,
    production: false,
    notes: 'Chinese market leader, good for Asia-Pacific analysis'
  },
  'fireworks': {
    implemented: true,
    tested: false,
    production: false,
    notes: 'Extremely fast inference, good for real-time'
  }
};
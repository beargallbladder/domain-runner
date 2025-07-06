import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { saveLLMResponse, logProcessingEvent } from './database';

// AI PROVIDER CONFIGURATIONS
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    rateLimit: 3000 // 3 seconds between requests
  },
  anthropic: {
    name: 'Anthropic',
    model: 'claude-3-sonnet-20240229',
    apiKey: process.env.ANTHROPIC_API_KEY,
    rateLimit: 3000
  },
  deepseek: {
    name: 'DeepSeek',
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
    rateLimit: 2000
  },
  mistral: {
    name: 'Mistral',
    model: 'mistral-large-latest',
    apiKey: process.env.MISTRAL_API_KEY,
    rateLimit: 2000
  },
  xai: {
    name: 'XAI',
    model: 'grok-beta',
    apiKey: process.env.XAI_API_KEY,
    rateLimit: 3000
  },
  together: {
    name: 'Together',
    model: 'meta-llama/Llama-2-70b-chat-hf',
    apiKey: process.env.TOGETHER_API_KEY,
    rateLimit: 2000
  },
  perplexity: {
    name: 'Perplexity',
    model: 'llama-3-sonar-large-32k-online',
    apiKey: process.env.PERPLEXITY_API_KEY,
    rateLimit: 3000
  },
  google: {
    name: 'Google',
    model: 'gemini-pro',
    apiKey: process.env.GOOGLE_API_KEY,
    rateLimit: 2000
  }
};

// Rate limiting
const lastRequestTime: Record<string, number> = {};

async function rateLimitedDelay(provider: string): Promise<void> {
  const config = PROVIDERS[provider as keyof typeof PROVIDERS];
  if (!config) return;

  const now = Date.now();
  const lastRequest = lastRequestTime[provider] || 0;
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < config.rateLimit) {
    const delay = config.rateLimit - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime[provider] = Date.now();
}

// Brand perception prompt
const BRAND_PERCEPTION_PROMPT = (domain: string) => `
Analyze the brand perception and memory retention for ${domain}. 

Consider:
1. Brand recognition and recall
2. Market positioning and reputation
3. User sentiment and trust
4. Innovation perception
5. Competitive advantages

Provide a concise analysis of how this brand is perceived in the market and what makes it memorable.
`;

// OpenAI Provider
async function callOpenAI(domain: string): Promise<void> {
  try {
    await rateLimitedDelay('openai');
    
    const openai = new OpenAI({
      apiKey: PROVIDERS.openai.apiKey
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: PROVIDERS.openai.model,
      messages: [
        { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const responseTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content || '';

    await saveLLMResponse({
      domain,
      provider: 'openai',
      model: PROVIDERS.openai.model,
      promptType: 'brand_perception',
      rawResponse: content,
      tokenCount: response.usage?.total_tokens,
      responseTimeMs: responseTime
    });

    await logProcessingEvent({
      eventType: 'llm_request',
      provider: 'openai',
      domain,
      success: true
    });

  } catch (error: any) {
    console.error(`❌ OpenAI error for ${domain}:`, error.message);
    await logProcessingEvent({
      eventType: 'llm_request',
      provider: 'openai',
      domain,
      success: false,
      errorMessage: error.message
    });
  }
}

// Anthropic Provider
async function callAnthropic(domain: string): Promise<void> {
  try {
    await rateLimitedDelay('anthropic');
    
    const anthropic = new Anthropic({
      apiKey: PROVIDERS.anthropic.apiKey
    });

    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: PROVIDERS.anthropic.model,
      max_tokens: 500,
      messages: [
        { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
      ]
    });

    const responseTime = Date.now() - startTime;
    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';

    await saveLLMResponse({
      domain,
      provider: 'anthropic',
      model: PROVIDERS.anthropic.model,
      promptType: 'brand_perception',
      rawResponse: content,
      tokenCount: response.usage?.input_tokens + response.usage?.output_tokens,
      responseTimeMs: responseTime
    });

    await logProcessingEvent({
      eventType: 'llm_request',
      provider: 'anthropic',
      domain,
      success: true
    });

  } catch (error: any) {
    console.error(`❌ Anthropic error for ${domain}:`, error.message);
    await logProcessingEvent({
      eventType: 'llm_request',
      provider: 'anthropic',
      domain,
      success: false,
      errorMessage: error.message
    });
  }
}

// Generic API caller for other providers
async function callGenericAPI(provider: string, domain: string, endpoint: string): Promise<void> {
  try {
    await rateLimitedDelay(provider);
    
    const config = PROVIDERS[provider as keyof typeof PROVIDERS];
    if (!config) throw new Error(`Unknown provider: ${provider}`);

    const startTime = Date.now();
    const response = await axios.post(endpoint, {
      model: config.model,
      messages: [
        { role: 'user', content: BRAND_PERCEPTION_PROMPT(domain) }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const responseTime = Date.now() - startTime;
    const content = response.data.choices?.[0]?.message?.content || response.data.content || '';

    await saveLLMResponse({
      domain,
      provider,
      model: config.model,
      promptType: 'brand_perception',
      rawResponse: content,
      tokenCount: response.data.usage?.total_tokens || 0,
      responseTimeMs: responseTime
    });

    await logProcessingEvent({
      eventType: 'llm_request',
      provider,
      domain,
      success: true
    });

  } catch (error: any) {
    console.error(`❌ ${provider} error for ${domain}:`, error.message);
    await logProcessingEvent({
      eventType: 'llm_request',
      provider,
      domain,
      success: false,
      errorMessage: error.message
    });
  }
}

// All provider functions
export async function callDeepSeek(domain: string): Promise<void> {
  return callGenericAPI('deepseek', domain, 'https://api.deepseek.com/v1/chat/completions');
}

export async function callMistral(domain: string): Promise<void> {
  return callGenericAPI('mistral', domain, 'https://api.mistral.ai/v1/chat/completions');
}

export async function callXAI(domain: string): Promise<void> {
  return callGenericAPI('xai', domain, 'https://api.x.ai/v1/chat/completions');
}

export async function callTogether(domain: string): Promise<void> {
  return callGenericAPI('together', domain, 'https://api.together.xyz/v1/chat/completions');
}

export async function callPerplexity(domain: string): Promise<void> {
  return callGenericAPI('perplexity', domain, 'https://api.perplexity.ai/chat/completions');
}

export async function callGoogle(domain: string): Promise<void> {
  return callGenericAPI('google', domain, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent');
}

// Main processor function
export async function processAllProviders(domain: string): Promise<void> {
  console.log(`🚀 Processing domain: ${domain} with all 8 providers`);

  const providers = [
    () => callOpenAI(domain),
    () => callAnthropic(domain),
    () => callDeepSeek(domain),
    () => callMistral(domain),
    () => callXAI(domain),
    () => callTogether(domain),
    () => callPerplexity(domain),
    () => callGoogle(domain)
  ];

  // Process sequentially to respect rate limits
  for (const providerCall of providers) {
    try {
      await providerCall();
      // Small delay between providers
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Provider call failed:', error);
    }
  }

  console.log(`✅ Completed processing ${domain}`);
}

// Check which providers are configured
export function getConfiguredProviders(): string[] {
  return Object.entries(PROVIDERS)
    .filter(([_, config]) => config.apiKey)
    .map(([name, _]) => name);
} 
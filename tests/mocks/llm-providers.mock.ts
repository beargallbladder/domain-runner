/**
 * Mock implementations for LLM provider APIs
 */

import { mockLLMResponses } from '../fixtures/domains.fixture';

export class MockLLMProvider {
  private callCount = 0;
  private failureRate = 0;
  private responseDelay = 0;
  private rateLimitAfter = Infinity;

  constructor(options: {
    failureRate?: number;
    responseDelay?: number;
    rateLimitAfter?: number;
  } = {}) {
    this.failureRate = options.failureRate || 0;
    this.responseDelay = options.responseDelay || 0;
    this.rateLimitAfter = options.rateLimitAfter || Infinity;
  }

  async makeRequest(provider: string, domain: string, prompt: string): Promise<any> {
    this.callCount++;

    // Simulate response delay
    if (this.responseDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.responseDelay));
    }

    // Simulate rate limiting
    if (this.callCount > this.rateLimitAfter) {
      throw new Error('Rate limit exceeded');
    }

    // Simulate random failures
    if (Math.random() < this.failureRate) {
      throw new Error('Random API failure');
    }

    // Return provider-specific response format
    switch (provider) {
      case 'openai':
      case 'mistral':
      case 'together':
      case 'xai':
      case 'perplexity':
      case 'deepseek':
        return {
          choices: [{
            message: {
              content: this.generateMockAnalysis(domain, provider),
            },
          }],
        };

      case 'anthropic':
        return {
          content: [{
            text: this.generateMockAnalysis(domain, provider),
          }],
        };

      case 'google':
        return {
          candidates: [{
            content: {
              parts: [{
                text: this.generateMockAnalysis(domain, provider),
              }],
            },
          }],
        };

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  private generateMockAnalysis(domain: string, provider: string): string {
    return `
      Mock ${provider} Analysis for ${domain}:
      
      Business Overview:
      - Primary focus: Technology solutions
      - Market segment: B2B SaaS
      - Founded: 2015
      - Employees: 100-500
      
      Competitive Analysis:
      - Market position: Strong challenger
      - Key differentiators: AI-powered features, competitive pricing
      - Main competitors: Established players in the space
      
      Technical Assessment:
      - Technology stack: Modern cloud-native architecture
      - Security: SOC 2 Type II compliant
      - Scalability: Designed for enterprise scale
      
      Growth Metrics:
      - YoY revenue growth: 45%
      - Customer retention: 92%
      - NPS score: 65
      
      Strategic Recommendations:
      - Expand international presence
      - Invest in partnership ecosystem
      - Continue product innovation
      
      Overall Score: ${Math.floor(Math.random() * 30) + 70}/100
    `;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}

export class MockFetch {
  private providers: Map<string, MockLLMProvider> = new Map();
  private defaultProvider: MockLLMProvider;

  constructor() {
    this.defaultProvider = new MockLLMProvider();
  }

  setProvider(url: string, provider: MockLLMProvider): void {
    this.providers.set(url, provider);
  }

  async fetch(url: string, options: any): Promise<Response> {
    // Extract provider from URL
    let provider = 'unknown';
    if (url.includes('openai.com')) provider = 'openai';
    else if (url.includes('anthropic.com')) provider = 'anthropic';
    else if (url.includes('deepseek.com')) provider = 'deepseek';
    else if (url.includes('mistral.ai')) provider = 'mistral';
    else if (url.includes('x.ai')) provider = 'xai';
    else if (url.includes('together.xyz')) provider = 'together';
    else if (url.includes('perplexity.ai')) provider = 'perplexity';
    else if (url.includes('googleapis.com')) provider = 'google';

    // Get mock provider for this URL
    const mockProvider = this.providers.get(url) || this.defaultProvider;

    try {
      // Extract domain from request body
      const body = JSON.parse(options.body);
      let domain = 'unknown.com';
      
      if (body.messages && body.messages[0]) {
        const match = body.messages[0].content.match(/(\w+\.com)/);
        if (match) domain = match[1];
      } else if (body.contents && body.contents[0]) {
        const match = body.contents[0].parts[0].text.match(/(\w+\.com)/);
        if (match) domain = match[1];
      }

      const responseData = await mockProvider.makeRequest(provider, domain, 'comprehensive_analysis');

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => responseData,
        text: async () => JSON.stringify(responseData),
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      } as Response;
    } catch (error: any) {
      if (error.message === 'Rate limit exceeded') {
        return {
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: { message: 'Rate limit exceeded' } }),
          text: async () => 'Rate limit exceeded',
          headers: new Headers({
            'Content-Type': 'application/json',
            'Retry-After': '60',
          }),
        } as Response;
      }

      return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: { message: error.message } }),
        text: async () => error.message,
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      } as Response;
    }
  }
}

export function createMockFetch(options: {
  defaultFailureRate?: number;
  defaultResponseDelay?: number;
  providerConfigs?: Record<string, {
    failureRate?: number;
    responseDelay?: number;
    rateLimitAfter?: number;
  }>;
} = {}): jest.Mock {
  const mockFetch = new MockFetch();

  // Set up default provider
  if (options.defaultFailureRate || options.defaultResponseDelay) {
    const defaultProvider = new MockLLMProvider({
      failureRate: options.defaultFailureRate,
      responseDelay: options.defaultResponseDelay,
    });
    mockFetch.setProvider('default', defaultProvider);
  }

  // Set up specific provider configurations
  if (options.providerConfigs) {
    for (const [provider, config] of Object.entries(options.providerConfigs)) {
      const mockProvider = new MockLLMProvider(config);
      
      // Map provider names to URLs
      const urlMap: Record<string, string> = {
        openai: 'https://api.openai.com/v1/chat/completions',
        anthropic: 'https://api.anthropic.com/v1/messages',
        deepseek: 'https://api.deepseek.com/v1/chat/completions',
        mistral: 'https://api.mistral.ai/v1/chat/completions',
        xai: 'https://api.x.ai/v1/chat/completions',
        together: 'https://api.together.xyz/v1/chat/completions',
        perplexity: 'https://api.perplexity.ai/chat/completions',
        google: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      };

      if (urlMap[provider]) {
        mockFetch.setProvider(urlMap[provider], mockProvider);
      }
    }
  }

  return jest.fn((url: string, options: any) => mockFetch.fetch(url, options));
}
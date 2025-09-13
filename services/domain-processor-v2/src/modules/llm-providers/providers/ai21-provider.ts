import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class AI21Provider extends BaseProvider {
  private baseEndpoint = 'https://api.ai21.com/studio/v1';

  constructor(
    model: string,
    apiKey: string,
    tier: ProviderTier,
    logger: Logger,
    rateLimitConfig?: RateLimitConfig
  ) {
    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: tier === ProviderTier.FAST ? 5 : 2,
      burstSize: tier === ProviderTier.FAST ? 10 : 5,
      retryAfter: 60000
    };

    super(
      'ai21',
      model,
      tier,
      apiKey,
      rateLimitConfig || defaultRateLimit,
      logger
    );
  }

  protected async callAPI(prompt: string): Promise<string> {
    // AI21 now uses chat completions API for jamba models
    const endpoint = `${this.baseEndpoint}/chat/completions`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`AI21 API error: ${response.status} - ${errorData.detail || errorData.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message?.content || 'No response generated';
    }
    
    throw new Error('No completions returned from AI21 API');
  }
}
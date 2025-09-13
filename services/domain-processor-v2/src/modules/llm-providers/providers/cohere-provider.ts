import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class CohereProvider extends BaseProvider {
  private endpoint = 'https://api.cohere.ai/v1/generate';

  constructor(
    model: string,
    apiKey: string,
    tier: ProviderTier,
    logger: Logger,
    rateLimitConfig?: RateLimitConfig
  ) {
    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: tier === ProviderTier.FAST ? 8 : 3,
      burstSize: tier === ProviderTier.FAST ? 15 : 8,
      retryAfter: 60000
    };

    super(
      'cohere',
      model,
      tier,
      apiKey,
      rateLimitConfig || defaultRateLimit,
      logger
    );
  }

  protected async callAPI(prompt: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        max_tokens: 500,
        temperature: 0.7,
        k: 0,
        stop_sequences: [],
        return_likelihoods: 'NONE'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Cohere API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.generations && data.generations.length > 0) {
      return data.generations[0].text || 'No response generated';
    }
    
    throw new Error('No generations returned from Cohere API');
  }
}
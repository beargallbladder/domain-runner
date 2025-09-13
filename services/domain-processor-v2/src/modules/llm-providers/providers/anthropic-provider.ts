import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class AnthropicProvider extends BaseProvider {
  private endpoint = 'https://api.anthropic.com/v1/messages';

  constructor(
    model: string,
    apiKey: string,
    tier: ProviderTier,
    logger: Logger,
    rateLimitConfig?: RateLimitConfig
  ) {
    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: 2,
      burstSize: 5,
      retryAfter: 60000
    };

    super(
      'anthropic',
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
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(data.error.message || 'Anthropic API error');
    }

    return data.content?.[0]?.text || 'No response generated';
  }
}
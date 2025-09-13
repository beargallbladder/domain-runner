import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class DeepSeekProvider extends BaseProvider {
  private endpoint = 'https://api.deepseek.com/v1/chat/completions';

  constructor(
    model: string,
    apiKey: string,
    tier: ProviderTier,
    logger: Logger,
    rateLimitConfig?: RateLimitConfig
  ) {
    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: tier === ProviderTier.FAST ? 15 : 8,
      burstSize: tier === ProviderTier.FAST ? 30 : 15,
      retryAfter: 60000
    };

    super(
      'deepseek',
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
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(data.error.message || 'DeepSeek API error');
    }

    return data.choices?.[0]?.message?.content || 'No response generated';
  }
}
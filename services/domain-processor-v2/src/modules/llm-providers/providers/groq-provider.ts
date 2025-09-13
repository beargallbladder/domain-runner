import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class GroqProvider extends BaseProvider {
  private endpoint = 'https://api.groq.com/openai/v1/chat/completions';

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
      'groq',
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
        temperature: 0.7,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(data.error.message || 'Groq API error');
    }

    return data.choices?.[0]?.message?.content || 'No response generated';
  }
}
import { BaseProvider } from '../base-provider';
import { ProviderTier, RateLimitConfig } from '../../../types';
import { Logger } from '../../../utils/logger';

export class GoogleProvider extends BaseProvider {
  private endpoint: string;

  constructor(
    model: string,
    apiKey: string,
    tier: ProviderTier,
    logger: Logger,
    rateLimitConfig?: RateLimitConfig
  ) {
    const defaultRateLimit: RateLimitConfig = {
      requestsPerSecond: tier === ProviderTier.SLOW ? 4 : 2,
      burstSize: tier === ProviderTier.SLOW ? 8 : 4,
      retryAfter: 60000
    };

    super(
      'google',
      model,
      tier,
      apiKey,
      rateLimitConfig || defaultRateLimit,
      logger
    );

    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  }

  protected async callAPI(prompt: string): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          maxOutputTokens: 500,
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as any;
      throw new Error(`Google API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.error) {
      throw new Error(data.error.message || 'Google API error');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
  }
}
import { ILLMProvider, LLMResponse, ProviderMetrics } from './interfaces';
import { PromptType, ProviderTier, RateLimitConfig } from '../../types';
import { Logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rate-limiter';

export abstract class BaseProvider implements ILLMProvider {
  protected metrics: ProviderMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestAt: undefined,
    lastError: undefined
  };

  protected rateLimiter: RateLimiter;
  protected logger: Logger;

  constructor(
    public name: string,
    public model: string,
    public tier: ProviderTier,
    protected apiKey: string,
    protected rateLimitConfig: RateLimitConfig,
    logger: Logger
  ) {
    this.logger = logger;
    this.rateLimiter = new RateLimiter(rateLimitConfig);
  }

  async generateResponse(prompt: string, domain: string, promptType: PromptType): Promise<LLMResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.lastRequestAt = new Date();

    try {
      // Check rate limit
      await this.rateLimiter.waitForSlot();

      // Generate the full prompt
      const fullPrompt = this.buildPrompt(prompt, domain, promptType);

      // Make the API call
      const response = await this.callAPI(fullPrompt);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.successfulRequests++;
      this.updateAverageResponseTime(processingTime);

      return {
        success: true,
        content: response,
        model: this.model,
        promptType,
        processingTime
      };
    } catch (error: any) {
      this.metrics.failedRequests++;
      this.metrics.lastError = error.message;
      
      this.logger.error(`Provider ${this.name} failed`, {
        error: error.message,
        domain,
        promptType
      });

      return {
        success: false,
        error: error.message,
        model: this.model,
        promptType,
        processingTime: Date.now() - startTime
      };
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && this.rateLimiter.canMakeRequest();
  }

  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  protected buildPrompt(basePrompt: string, domain: string, promptType: PromptType): string {
    const prompts: Record<PromptType, string> = {
      [PromptType.BUSINESS_ANALYSIS]: `Analyze the business model and market position of ${domain}. Include target market, revenue model, competitive advantages, and growth potential.`,
      [PromptType.CONTENT_STRATEGY]: `Analyze the content strategy of ${domain}. Include content types, publishing frequency, SEO approach, and audience engagement tactics.`,
      [PromptType.TECHNICAL_ASSESSMENT]: `Provide a technical assessment of ${domain}. Include technology stack, performance metrics, security measures, and scalability considerations.`,
      [PromptType.COMPREHENSIVE_ANALYSIS]: `Provide a comprehensive analysis of ${domain} covering: business model, competitive position, market strategy, technical capabilities, content approach, and growth potential. Be detailed and specific.`
    };

    return prompts[promptType] || basePrompt;
  }

  protected abstract callAPI(prompt: string): Promise<string>;

  private updateAverageResponseTime(newTime: number): void {
    const totalTime = this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + newTime;
    this.metrics.averageResponseTime = totalTime / this.metrics.successfulRequests;
  }
}
import { RateLimitConfig } from '../types';

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.burstSize;
    this.lastRefill = Date.now();
  }

  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = this.getWaitTime();
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.consumeToken();
  }

  canMakeRequest(): boolean {
    this.refillTokens();
    return this.tokens >= 1;
  }

  private consumeToken(): void {
    if (this.tokens >= 1) {
      this.tokens--;
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = (timePassed / 1000) * this.config.requestsPerSecond;
    
    this.tokens = Math.min(this.config.burstSize, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private getWaitTime(): number {
    if (this.tokens >= 1) return 0;
    
    const tokensNeeded = 1 - this.tokens;
    const secondsToWait = tokensNeeded / this.config.requestsPerSecond;
    
    return Math.ceil(secondsToWait * 1000);
  }

  reset(): void {
    this.tokens = this.config.burstSize;
    this.lastRefill = Date.now();
  }
}
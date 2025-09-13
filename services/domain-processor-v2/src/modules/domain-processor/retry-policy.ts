import { IRetryPolicy } from './interfaces';

export class ExponentialBackoffRetryPolicy implements IRetryPolicy {
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second
  private maxDelay: number = 60000; // 60 seconds

  shouldRetry(error: Error, attemptNumber: number): boolean {
    // Don't retry if we've exceeded max attempts
    if (attemptNumber >= this.maxRetries) {
      return false;
    }

    // Retry on rate limit errors
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return true;
    }

    // Retry on temporary network errors
    if (error.message.includes('ECONNRESET') || 
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.message.includes('500') || 
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')) {
      return true;
    }

    // Don't retry on client errors (4xx except 429)
    if (error.message.includes('400') || 
        error.message.includes('401') ||
        error.message.includes('403') ||
        error.message.includes('404')) {
      return false;
    }

    // Default: retry
    return true;
  }

  getRetryDelay(attemptNumber: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attemptNumber - 1),
      this.maxDelay
    );

    // Add jitter (±25%)
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    
    return Math.floor(exponentialDelay + jitter);
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }
}